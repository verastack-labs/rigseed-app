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

/** Whether the daemon can run a search at all. */
export type PythonState = 'ok' | 'missing' | 'unknown'

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
