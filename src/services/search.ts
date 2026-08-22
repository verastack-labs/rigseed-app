import { canReachDesktop } from '@/services/shell'
import { ApiError, type Transport } from '@/services/transport'
import type { SearchJobStatus, SearchPlugin, SearchResults } from '@/types/qbittorrent'

/**
 * Search, which is the only part of the API that owns a resource.
 *
 * Every other namespace answers a question. `search/start` creates a job that
 * lives on the daemon until it is deleted, and qBittorrent allows five at a
 * time. A screen that starts jobs and never deletes them stops being able to
 * search after the fifth query, having given no sign of why, so `remove` is
 * not an optional tidy-up: see `useSearchJob`, which calls it on every path
 * out including unmount.
 */
export function createSearchApi(transport: Transport) {
  return {
    /** Answers `{ id }`. `plugins` is "enabled", "all", or a `|` separated list. */
    start: (pattern: string, plugins = 'enabled', category = 'all') =>
      transport.post<{ id: number }>('search/start', { pattern, plugins, category }),

    stop: (id: number) => transport.post<void>('search/stop', { id }),

    /** Deletes the job on the daemon. Nothing else frees the slot. */
    remove: (id: number) => transport.post<void>('search/delete', { id }),

    /** Every job the daemon still holds, ours included. */
    status: () => transport.get<SearchJobStatus[]>('search/status'),

    results: (id: number, limit = 500, offset = 0) =>
      transport.get<SearchResults>('search/results', {
        id: String(id),
        limit: String(limit),
        offset: String(offset),
      }),

    plugins: () => transport.get<SearchPlugin[]>('search/plugins'),

    /** `sources` is newline separated: a URL or a path per line. */
    installPlugin: (sources: readonly string[]) =>
      transport.post<void>('search/installPlugin', { sources: sources.join('\n') }),

    uninstallPlugin: (names: readonly string[]) =>
      transport.post<void>('search/uninstallPlugin', { names: names.join('|') }),

    enablePlugin: (names: readonly string[], enable: boolean) =>
      transport.post<void>('search/enablePlugin', { names: names.join('|'), enable }),

    updatePlugins: () => transport.post<void>('search/updatePlugins'),
  }
}

export type SearchApi = ReturnType<typeof createSearchApi>

/**
 * Whether the daemon can run a search at all.
 *
 * `unusable` is not `missing`. Python is installed and the daemon finds it,
 * and it still cannot run the search engine. See `checkPython`.
 */
export type PythonState = 'ok' | 'missing' | 'unusable' | 'unknown'

/** What one of rigseed's own interpreters turned out to be able to do. */
interface PythonReport {
  interpreter: string | null
  default_works: boolean
  runtime_missing: boolean
  tried: string[]
}

export interface PythonCheck {
  state: PythonState
  /**
   * An interpreter that works and that the daemon would not have found on its
   * own, ready for `python_executable_path`. Only ever set for the daemon
   * rigseed started.
   */
  fix?: string
  /** One line per interpreter tried, for a screen that has to explain itself. */
  tried?: readonly string[]
}

/**
 * Ask whether Python is there, before anybody tries to search.
 *
 * The search engine runs on Python 3 and the daemon answers 409 "Python must
 * be installed to use the Search Engine" when it cannot find one. There is no
 * endpoint that reports this: the only component that knows is the search
 * engine, and the only way to ask it is to start something.
 *
 * So this starts a search against a plugin name that cannot exist. The daemon
 * checks for Python before it resolves plugins, so the answer arrives without
 * a single request leaving the machine, which a real query would not manage.
 * The job is deleted either way; five is the concurrent limit and leaking one
 * per visit would reach it.
 *
 * `unknown` rather than a guess when the call fails for some other reason. A
 * screen that announces a missing Python because the daemon was briefly busy
 * sends somebody to install something they already have.
 */
export async function probePython(api: SearchApi): Promise<PythonState> {
  // A name no plugin can carry: the daemon matches on plugin names, and none
  // of them look like this.
  const nothing = '__rigseed_probe__'

  try {
    const { id } = await api.start('rigseed', nothing)
    void api.remove(id).catch(() => {
      // Nothing to do about a probe job that will not delete. It expires with
      // the session and the screen has its answer either way.
    })
    return 'ok'
  } catch (error) {
    if (error instanceof ApiError && error.status === 409) return 'missing'
    return 'unknown'
  }
}

/**
 * Which engine a hit came from.
 *
 * The API does not say. Each result carries `siteUrl`, and each plugin carries
 * a `url`, so the engine is recovered by matching hosts. Falling back to the
 * host itself is better than "unknown": it is still the thing the user would
 * call the engine.
 */
export function engineFor(siteUrl: string, plugins: readonly SearchPlugin[]): string {
  const host = hostOf(siteUrl)
  if (!host) return 'unknown'
  const match = plugins.find((p) => hostOf(p.url) === host)
  return match?.fullName ?? match?.name ?? host
}

function hostOf(url: string): string {
  try {
    return new URL(url).host.replace(/^www\./, '')
  } catch {
    return ''
  }
}

/**
 * Asks Rust which interpreter can actually run this daemon's search engine.
 *
 * Null outside Tauri, where there is nothing to ask and no local profile the
 * answer would describe.
 */
async function localPython(): Promise<PythonReport | null> {
  if (!canReachDesktop()) return null
  try {
    const { invoke } = await import('@tauri-apps/api/core')
    return await invoke<PythonReport>('search_python')
  } catch {
    // A probe that cannot run is not evidence of anything. Falling through to
    // the daemon's own answer is better than inventing a verdict.
    return null
  }
}

/**
 * Whether search can work, and what to do about it if not.
 *
 * `probePython` alone is too weak, and the way it fails is instructive.
 * qBittorrent decides Python is present by running `python3 --version`, and on
 * Windows `python3` usually resolves to the Microsoft Store App Execution
 * Alias, which answers that question perfectly well. The alias then runs
 * Python inside an AppContainer with a virtualised `AppData\Roaming`, so it
 * cannot open `nova2.py` in rigseed's own profile, and every plugin install is
 * rejected for being "not supported".
 *
 * From the API that is invisible. `search/start` succeeds, so the 409 never
 * comes, and `search/installPlugin` returns 200 before it has downloaded
 * anything. The only evidence is in the daemon's log.
 *
 * So for the daemon rigseed started, the question goes to Rust, which can run
 * a candidate against the real `nova2.py` and watch it fail. For anything else
 * the 409 probe is all there is: a remote daemon's interpreters are on a
 * machine this process cannot see.
 */
export async function checkPython(
  api: SearchApi,
  options: { spawned: boolean } = { spawned: false },
): Promise<PythonCheck> {
  const daemonSays = await probePython(api)

  // No Python at all outranks anything the local probe could add, and it is
  // the one case with a single clear instruction.
  if (daemonSays === 'missing') return { state: 'missing' }
  if (!options.spawned) return { state: daemonSays }

  const local = await localPython()
  // `runtime_missing` means the profile has not been through a daemon startup
  // yet, so there is nothing to test against and nothing worth claiming.
  if (!local || local.runtime_missing) return { state: daemonSays }

  if (local.interpreter) {
    return local.default_works
      ? { state: 'ok' }
      : { state: 'unusable', fix: local.interpreter, tried: local.tried }
  }
  return { state: 'unusable', tried: local.tried }
}

/**
 * The daemon's name for a plugin, from the source it was installed from.
 *
 * qBittorrent names a plugin after its file, so `.../piratebay.py` installs as
 * `piratebay`. That equality is the only way to tell whether an install landed.
 */
export function pluginNameFor(source: string): string {
  const file = source.split(/[\\/]/).pop() ?? ''
  return file.replace(/\.py$/i, '')
}

/**
 * Waits for an install to actually appear, and reports what never did.
 *
 * `search/installPlugin` answers 200 before it has fetched anything. The
 * download, the Python capability check and the rejection all happen after the
 * response, and the only place a failure is written down is the daemon's own
 * log. So a caller that treats the 200 as success reports an install that did
 * not happen, which is exactly what rigseed did until a plugin that could
 * never work was reported as installed seven times in a row.
 *
 * Polling rather than a fixed wait: a plugin that lands in 400ms should not
 * cost the same as one that takes six seconds, and one that is never coming
 * has to be given long enough that a slow network is not called a failure.
 */
export async function awaitInstalled(
  api: SearchApi,
  wanted: readonly string[],
  options: { attempts?: number; everyMs?: number } = {},
): Promise<{ installed: string[]; missing: string[] }> {
  const attempts = options.attempts ?? 12
  const everyMs = options.everyMs ?? 700

  let present = new Set<string>()
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      present = new Set((await api.plugins()).map((one) => one.name))
    } catch {
      // A list that cannot be read this time is not an install that failed.
      // The next attempt decides.
    }
    if (wanted.every((name) => present.has(name))) break
    if (attempt < attempts - 1) await new Promise((done) => setTimeout(done, everyMs))
  }

  return {
    installed: wanted.filter((name) => present.has(name)),
    missing: wanted.filter((name) => !present.has(name)),
  }
}
