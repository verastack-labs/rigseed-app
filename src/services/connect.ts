import { fetch as tauriFetch } from '@tauri-apps/plugin-http'

import { createClient, type Client } from '@/services/client'
import { createMockTransport } from '@/services/mock-transport'
import { capabilitiesFor } from '@/services/torrents'
import { ApiError, createHttpTransport } from '@/services/transport'

export interface DaemonTarget {
  /** For example `http://127.0.0.1:8080`, or `''` for a same-origin proxy. */
  baseUrl: string
  username: string
  password: string
  /**
   * What to call this daemon on screen.
   *
   * Needed because `baseUrl` is empty when the dev server proxies, and
   * "connected to nothing" is a worse label than no label at all.
   */
  label?: string
  /**
   * True when rigseed started this daemon itself.
   *
   * Only then is waiting right. Our own daemon is spawned as the window opens
   * and has not bound its port yet; one that was already running is either up
   * or it is not, and ten seconds of "Connecting…" to tell somebody it is not
   * helps nobody.
   */
  spawned?: boolean
}

export type ConnectionState =
  | { status: 'connecting' }
  | { status: 'mock'; client: Client; reason: string }
  | {
      status: 'connected'
      client: Client
      version: string
      webApiVersion: string
      /** Host and port, for the top bar. */
      label: string
    }
  | { status: 'failed'; reason: string }

/**
 * Brings up a client against a real daemon, or says why it could not.
 *
 * Four things happen in order and each can fail differently, which is the
 * reason this is not one `fetch`. The daemon has to be reachable at all; it
 * has to accept the credentials; it has to say which API version it speaks, so
 * the client knows whether to call `torrents/stop` or `torrents/pause`; and
 * only then is the client worth handing to the screens.
 *
 * A failed login is not an error status. qBittorrent answers `Fails.` with
 * HTTP 200, so a transport that only checks status codes reports a healthy
 * connection that 403s on the next call.
 */
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

/** `http://127.0.0.1:8080/` to `127.0.0.1:8080`. Falls back to the input. */
function hostOf(baseUrl: string): string {
  if (!baseUrl) return 'this origin'
  try {
    return new URL(baseUrl).host
  } catch {
    return baseUrl
  }
}

export interface ConnectOptions {
  /**
   * How long to keep trying while nothing answers at all.
   *
   * The bundled daemon is spawned by Rust and takes a moment to bind its port,
   * so the app is ready to ask before there is anything to ask. Only refusals
   * to connect are retried. A daemon that answers and rejects the credentials
   * has given a final answer, and asking again would just be a slow way to
   * lock the account out.
   */
  waitMs?: number
}

/**
 * The fetch to reach the daemon with.
 *
 * Inside Tauri this is the HTTP plugin, which performs the request in Rust.
 * That is not an optimisation: qBittorrent's CSRF protection compares the
 * request origin against its own host, and a webview sends
 * `http://tauri.localhost`, which it answers with 401. Measured against a real
 * daemon, a correct password with that Origin is rejected and the same
 * password with no Origin at all is accepted.
 *
 * The alternative was turning the daemon's CSRF protection off, which would
 * leave it open to any page in the user's browser that learned the password.
 */
function daemonFetch(baseUrl: string): typeof fetch | undefined {
  // Statically imported, not loaded on demand. A dynamic import races Vite's
  // dependency pre-bundling: on a cold start the module is not ready, the
  // await resolves late or the page reloads under it, and the request goes out
  // through the webview's own fetch instead. That carries an origin the daemon
  // answers 401 to, so a correct password is reported as rejected. It behaved
  // differently on consecutive runs of the same build, which is what gave it
  // away.
  //
  // Importing it in a browser is harmless. The module only fails when called
  // without Tauri underneath, and the guard below is what decides that.
  if (!(globalThis as { __TAURI_INTERNALS__?: unknown }).__TAURI_INTERNALS__) return undefined
  if (!baseUrl) return tauriFetch as typeof fetch

  // The plugin forwards the page's own origin, which in dev is the Vite server
  // and in production is the Tauri protocol. Either way it is not the daemon's
  // own host, and qBittorrent answers a mismatched Origin with 401, which the
  // app then reports as a rejected password.
  //
  // A browser refuses to let anything set Origin. This is not a browser: the
  // request is made in Rust, so the header can say what is true, which is that
  // the request originates with the daemon's own WebUI as far as it is
  // concerned. That keeps the daemon's CSRF protection switched on rather than
  // turning it off to accommodate us.
  return ((input, init) =>
    tauriFetch(input as string, {
      ...init,
      headers: { ...((init?.headers as Record<string, string>) ?? {}), Origin: baseUrl },
    })) as typeof fetch
}

/**
 * Is the thing on the other end actually qBittorrent?
 *
 * Asked before any credential is sent. An unauthenticated `app/version` gets
 * 403 from qBittorrent and something else from anything else, which is enough
 * to tell a daemon from a Jenkins.
 *
 * This exists because of what a taken port does on Windows. A wildcard bind
 * coexists with a specific one and the specific one wins, so a daemon told to
 * use a port somebody else already had bound 0.0.0.0, logged "Now listening",
 * and served nothing: every request went to the other process. rigseed would
 * have posted its generated password to whatever that was.
 *
 * Choosing a free port removed the likelihood. This removes the consequence,
 * which is the part worth keeping, since the gap between checking a port and
 * binding it cannot be closed entirely.
 *
 * Returns null when it looks right, or what was wrong when it does not.
 */
async function looksLikeQbittorrent(probe: Client): Promise<string | null> {
  try {
    await probe.app.version()
    // Answered without a session. Not impossible if something restored one,
    // so this is not treated as a failure, but it is not qBittorrent's
    // documented behaviour either.
    return null
  } catch (error) {
    if (error instanceof ApiError) {
      // 401 as well as 403. qBittorrent answers 403 for an unauthenticated
      // API call, but a daemon that has banned this address for failed logins
      // answers 401, and that is still very much qBittorrent.
      if (error.status === 403 || error.status === 401) return null
      return `it answered ${error.status}, where qBittorrent answers 403`
    }
    // Never reached the far end, which the login below reports properly.
    return null
  }
}

export async function connect(
  target: DaemonTarget,
  { waitMs = 0 }: ConnectOptions = {},
): Promise<ConnectionState> {
  const fetchImpl = daemonFetch(target.baseUrl)
  const transport = createHttpTransport({
    baseUrl: target.baseUrl,
    ...(fetchImpl ? { fetchImpl } : {}),
  })
  const probe = createClient(transport)

  const deadline = Date.now() + waitMs

  for (;;) {
    try {
      const wrong = await looksLikeQbittorrent(probe)
      if (wrong) {
        return {
          status: 'failed',
          reason: `Something is listening at ${target.baseUrl || 'this origin'} but it is not qBittorrent: ${wrong}. No credentials were sent to it.`,
        }
      }

      const accepted = await probe.auth.login(target.username, target.password)
      if (!accepted) {
        return { status: 'failed', reason: 'The daemon rejected those credentials.' }
      }
      break
    } catch (error) {
      if (Date.now() >= deadline) {
        return {
          status: 'failed',
          reason: `Could not reach the daemon at ${target.baseUrl || 'this origin'}: ${String(error)}`,
        }
      }
      await sleep(250)
    }
  }

  try {
    const [version, webApiVersion] = await Promise.all([
      probe.app.version(),
      probe.app.webapiVersion(),
    ])
    return {
      status: 'connected',
      client: createClient(transport, capabilitiesFor(webApiVersion)),
      version,
      webApiVersion,
      label: target.label ?? hostOf(target.baseUrl),
    }
  } catch (error) {
    // Logged in but cannot be asked what it is, which is stranger than being
    // unreachable and worth reporting as its own thing rather than as a
    // credentials problem.
    return {
      status: 'failed',
      reason: `The daemon accepted the login but did not answer: ${String(error)}`,
    }
  }
}

/** The mock, wrapped in the same shape so the caller has one thing to hold. */
export function mockConnection(reason: string): ConnectionState {
  return { status: 'mock', client: createClient(createMockTransport()), reason }
}
