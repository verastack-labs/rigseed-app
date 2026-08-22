import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'

import { ClientContext, ConnectionContext } from '@/services/api-context'
import {
  connect,
  mockConnection,
  type ConnectionState,
  type DaemonTarget,
} from '@/services/connect'
import { read } from '@/services/secrets'
import { addressOf, baseUrlOf, useConnectionStore } from '@/state/connection-store'
import { useTorrentStore } from '@/state/torrent-store'

export interface ApiProviderProps {
  /**
   * Where to connect, or omitted to work it out.
   *
   * Passed explicitly by tests and by anything that already knows. Left off,
   * the provider follows the connection the user chose on the Connections
   * screen, and falls back to asking the environment when that is the
   * built-in daemon.
   */
  target?: DaemonTarget
  children: ReactNode
}

/**
 * Where the daemon is, if anywhere.
 *
 * Two ways in, and neither is a fallback for the other. Inside Tauri the
 * bundled instance's credentials come from Rust, which holds them in the OS
 * keychain and never puts them in a file the frontend can read. In a browser
 * the dev proxy is the only route, since the page cannot hold a session cookie
 * for another origin without the daemon relaxing its own CSRF checks.
 */
/** Best effort. Outside Tauri there is a console and nobody to tell. */
async function report(status: string, detail: string): Promise<void> {
  if (!(globalThis as { __TAURI_INTERNALS__?: unknown }).__TAURI_INTERNALS__) return
  try {
    const { invoke } = await import('@tauri-apps/api/core')
    await invoke('report_connection', { status, detail })
  } catch {
    // Reporting a failure must never become a second failure.
  }
}

async function findTarget(): Promise<DaemonTarget | null> {
  const tauri = (globalThis as { __TAURI_INTERNALS__?: unknown }).__TAURI_INTERNALS__
  if (tauri) {
    try {
      const { invoke } = await import('@tauri-apps/api/core')
      const target = await invoke<DaemonTarget>('bundled_connection')
      return { ...target, spawned: true }
    } catch {
      // The sidecar may not have started, or may not be bundled yet. The mock
      // covers it, and the reason is reported rather than swallowed.
      return null
    }
  }

  // `import.meta.env` rather than a `define`, which was the first attempt and
  // silently did nothing: an ambient `declare const` for the injected name is
  // enough for esbuild to treat it as declared and skip the substitution, so
  // the identifier survived into the served module and read as undefined.
  const { VITE_QBT_URL, VITE_QBT_USER, VITE_QBT_PASS } = import.meta.env
  if (VITE_QBT_URL) {
    // The label comes from the env rather than from baseUrl, which is empty
    // here on purpose. Only this side of the proxy knows where it points.
    const label = VITE_QBT_URL.replace(/^https?:\/\//, '').replace(/\/$/, '')
    // baseUrl is empty on purpose: the dev server proxies `/api`, so the
    // request is same-origin and the SID cookie is ours to keep.
    return {
      baseUrl: '',
      username: VITE_QBT_USER ?? 'admin',
      password: VITE_QBT_PASS ?? '',
      label,
    }
  }

  return null
}

/**
 * Supplies the API client.
 *
 * Starts on the mock rather than on nothing, so no screen has to render a
 * null client and every one of them works before a daemon exists. If a real
 * daemon answers, the client is swapped and the screens do not notice: both
 * sides implement the same transport.
 *
 * Which daemon is the store's answer, not this component's. Switching is
 * therefore a state change like any other, and every hook that polls already
 * treats a new client as a new session: the sync loop starts a fresh rid and
 * the first response carries `full_update`, which replaces the store rather
 * than merging one daemon's torrents into another's.
 */
export function ApiProvider({ target, children }: ApiProviderProps) {
  const activeId = useConnectionStore((state) => state.activeId)

  /**
   * Which daemon this provider is meant to be on.
   *
   * An explicit `target` wins and pins the provider, which is what tests and
   * any caller that already knows the answer expect. Otherwise the store
   * decides, and null means the built-in one.
   */
  const key = target ? 'explicit' : (activeId ?? 'built-in')

  const [state, setState] = useState<ConnectionState>(() => mockConnection('Looking for a daemon.'))

  /**
   * The connection attempt itself, not a "have we started" flag.
   *
   * A boolean was the first attempt and it lost the result entirely under
   * StrictMode, which mounts, runs the effect, tears it down, and runs it
   * again. The first run started the login and its cleanup marked the answer
   * stale; the second run saw the flag already set and returned. The
   * connection completed and was thrown away, so the app sat on the mock with
   * a healthy daemon on the other end and nothing in the console to say so.
   *
   * Holding the promise means the second run awaits the same work rather than
   * skipping it or logging in twice. It is stored with the key it belongs to,
   * so a genuine switch starts a new attempt instead of handing back the
   * previous daemon's answer.
   */
  const attempt = useRef<{ key: string; promise: Promise<ConnectionState> } | null>(null)

  /**
   * Shows "connecting" the moment the choice changes.
   *
   * Adjusted during render rather than in an effect: an effect would paint a
   * frame still claiming a healthy connection to the daemon just switched
   * away from.
   */
  const [owner, setOwner] = useState(key)
  if (owner !== key) {
    setOwner(key)
    setState({ status: 'connecting' })
  }

  /**
   * How many times this connection has been rebuilt since it went quiet.
   *
   * Doubles as the backoff clock. Reset the moment the daemon answers, so a
   * long outage followed by a short one does not start the second one at
   * thirty second intervals.
   */
  const reachable = useTorrentStore((s) => s.reachable)
  const [retry, setRetry] = useState(0)
  if (reachable && retry !== 0) setRetry(0)

  /**
   * Schedules the next attempt to log in again.
   *
   * Only while the app believes it is connected and nothing is answering. The
   * other statuses have their own story: `mock` and `failed` were decided at
   * startup and a screen already says so, and retrying those would swap sample
   * data for real data underneath somebody without being asked.
   *
   * Backoff because qBittorrent bans an address after a handful of failed
   * logins. The credentials are right in the case this exists for, a daemon
   * that restarted, but a loop that hammers a daemon it cannot satisfy would
   * eventually lock rigseed out of a daemon that was merely misconfigured.
   */
  useEffect(() => {
    if (reachable || state.status !== 'connected') return
    const delay = Math.min(30_000, 3_000 * 2 ** Math.min(retry, 4))
    const timer = setTimeout(() => setRetry((n) => n + 1), delay)
    return () => clearTimeout(timer)
  }, [reachable, state.status, retry])

  /**
   * Logs in again, keeping what is on screen if it does not work.
   *
   * Separate from the first attempt above, and deliberately not sharing its
   * failure path. That one falls back to the mock, which is right at startup
   * and catastrophic here: it would replace a running app's real torrents
   * with sample data because a daemon was restarting.
   *
   * A dead session is the case this exists for. The cookie dies with the
   * daemon process, every request after that is a 403, and nothing else in
   * the app ever logs in again: the first attempt runs on mount and only on
   * mount. `connect` performs a fresh login, so the client it returns carries
   * a session the new daemon knows about.
   */
  useEffect(() => {
    if (retry === 0) return
    let live = true

    void (async () => {
      const found = target ?? (await targetFor(activeId))
      if (!found || !live) return

      const result = await connect(found, { waitMs: 0 })
      if (!live || result.status !== 'connected') return

      // The poll loop marks the daemon reachable again on its next success,
      // which is a second away. Setting it here as well would claim the
      // connection works before anything has used it.
      setState(result)
    })()

    return () => {
      live = false
    }
  }, [retry, target, activeId])

  useEffect(() => {
    let live = true

    if (attempt.current?.key !== key) {
      attempt.current = {
        key,
        promise: (async () => {
          const found = target ?? (await targetFor(activeId))
          if (!found) return mockConnection('No daemon configured. Showing sample data.')

          // Only our own daemon is worth waiting for. It is spawned as the
          // window opens and has not bound its port yet; anything else is
          // already running or it is not.
          const result = await connect(found, { waitMs: found.spawned ? 10_000 : 0 })

          // Told to Rust, which is the only place it can be read afterwards. A
          // packaged app has no console, so a silent fall back to sample data
          // otherwise leaves nothing behind to explain itself.
          void report(
            result.status,
            result.status === 'connected'
              ? `${result.label}, qBittorrent ${result.version}`
              : result.status === 'failed'
                ? result.reason
                : '',
          )

          return result.status === 'failed'
            ? mockConnection(`${result.reason} Showing sample data.`)
            : result
        })(),
      }
    }

    void attempt.current.promise.then((result) => {
      if (live) setState(result)
    })

    return () => {
      live = false
    }
    // activeId is redundant with key and listed for the linter's benefit. The
    // connection list is deliberately not a trigger: it is read from the store
    // when the attempt runs, so editing the address of the connection already
    // in use does not reconnect on every keystroke. Switching away and back
    // applies an edit, and is also how to retry one that failed.
  }, [key, target, activeId])

  return (
    <ConnectionContext.Provider value={state}>
      <ClientContext.Provider value={'client' in state ? state.client : null}>
        {children}
      </ClientContext.Provider>
    </ConnectionContext.Provider>
  )
}

/**
 * The chosen connection as something `connect` can use.
 *
 * The password is fetched here rather than held anywhere: it lives in the OS
 * keychain and this is the one moment it is needed. A connection that says it
 * needs no login sends neither a username nor a password, rather than sending
 * empty ones.
 */
async function targetFor(activeId: string | null): Promise<DaemonTarget | null> {
  if (activeId === null) return findTarget()

  // Read when the attempt runs rather than captured, so a connection edited
  // between the click and the login is used as it stands now.
  const connection = useConnectionStore.getState().connections.find((one) => one.id === activeId)
  if (!connection) return null

  const password = connection.requiresAuth ? ((await read(activeId)) ?? '') : ''

  return {
    baseUrl: baseUrlOf(connection),
    username: connection.requiresAuth ? connection.username : '',
    password,
    label: addressOf(connection),
  }
}
