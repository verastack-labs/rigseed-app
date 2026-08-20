import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'

import { ClientContext, ConnectionContext } from '@/services/api-context'
import {
  connect,
  mockConnection,
  type ConnectionState,
  type DaemonTarget,
} from '@/services/connect'

export interface ApiProviderProps {
  /**
   * Where to connect, or omitted to work it out.
   *
   * Passed explicitly by tests and by anything that already knows. Left off,
   * the provider asks the environment: the Tauri side for the bundled
   * instance's credentials, or the dev proxy if one was configured.
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
 */
export function ApiProvider({ target, children }: ApiProviderProps) {
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
   * skipping it or logging in twice.
   */
  const attempt = useRef<Promise<ConnectionState> | null>(null)

  useEffect(() => {
    let live = true

    attempt.current ??= (async () => {
      const found = target ?? (await findTarget())
      if (!found) return mockConnection('No daemon configured. Showing sample data.')

      // Only our own daemon is worth waiting for. It is spawned as the window
      // opens and has not bound its port yet; anything else is already running
      // or it is not.
      const result = await connect(found, { waitMs: found.spawned ? 10_000 : 0 })

      // Told to Rust, which is the only place it can be read afterwards. A
      // packaged app has no console, so a silent fall back to sample data
      // otherwise leaves nothing behind to explain itself.
      // Which fetch went out is the difference between talking to the daemon
      // and talking to the webview's own origin, and it is invisible from
      // outside, so it is reported alongside the outcome.
      const internals = typeof (globalThis as { __TAURI_INTERNALS__?: unknown }).__TAURI_INTERNALS__
      void report(
        `${result.status} (tauri internals: ${internals})`,
        result.status === 'connected'
          ? `${result.label}, qBittorrent ${result.version}`
          : result.status === 'failed'
            ? result.reason
            : '',
      )

      return result.status === 'failed'
        ? mockConnection(`${result.reason} Showing sample data.`)
        : result
    })()

    void attempt.current.then((result) => {
      if (live) setState(result)
    })

    return () => {
      live = false
    }
  }, [target])

  return (
    <ConnectionContext.Provider value={state}>
      <ClientContext.Provider value={'client' in state ? state.client : null}>
        {children}
      </ClientContext.Provider>
    </ConnectionContext.Provider>
  )
}
