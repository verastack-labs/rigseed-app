import { createClient, type Client } from '@/services/client'
import { createMockTransport } from '@/services/mock-transport'
import { capabilitiesFor } from '@/services/torrents'
import { createHttpTransport } from '@/services/transport'

export interface DaemonTarget {
  /** For example `http://127.0.0.1:8080`, or `''` for a same-origin proxy. */
  baseUrl: string
  username: string
  password: string
}

export type ConnectionState =
  | { status: 'connecting' }
  | { status: 'mock'; client: Client; reason: string }
  | { status: 'connected'; client: Client; version: string; webApiVersion: string }
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

export async function connect(
  target: DaemonTarget,
  { waitMs = 0 }: ConnectOptions = {},
): Promise<ConnectionState> {
  const transport = createHttpTransport({ baseUrl: target.baseUrl })
  const probe = createClient(transport)

  const deadline = Date.now() + waitMs

  for (;;) {
    try {
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
