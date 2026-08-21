import type { Transport } from '@/services/transport'
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
