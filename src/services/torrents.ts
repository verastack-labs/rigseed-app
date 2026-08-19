import type {
  AddTorrentOptions,
  Category,
  Torrent,
  TorrentFile,
  Tracker,
} from '@/types/qbittorrent'
import type { Transport } from '@/services/transport'

/**
 * The bulk of the app.
 *
 * Hashes go over the wire as a `|` separated list, which is why every mutating
 * call takes an array and joins it here rather than at the call site.
 */
export function createTorrentsApi(transport: Transport) {
  const hashes = (list: readonly string[]) => ({ hashes: list.join('|') })

  return {
    info: (params: { filter?: string; category?: string; tag?: string; sort?: string } = {}) =>
      transport.get<Torrent[]>('torrents/info', params),

    /**
     * Adds magnet links, URLs and `.torrent` files in one request.
     *
     * Empty strings are dropped rather than sent. An empty `savepath` is not
     * "use the default", it is an explicit override of it, and sending one
     * with `autoTMM` on puts the daemon in a state the UI never asked for.
     * Booleans always go, since `false` is meaningful for every one of them.
     */
    add: (options: AddTorrentOptions) => {
      const form = new FormData()

      if (options.urls?.length) form.append('urls', options.urls.join('\n'))
      for (const file of options.files ?? []) form.append('torrents', file, file.name)

      if (options.savepath) form.append('savepath', options.savepath)
      if (options.category) form.append('category', options.category)
      if (options.tags?.length) form.append('tags', options.tags.join(','))

      for (const key of ['paused', 'skip_checking', 'sequentialDownload', 'autoTMM'] as const) {
        const value = options[key]
        if (value !== undefined) form.append(key, String(value))
      }

      return transport.postForm<void>('torrents/add', form)
    },

    properties: (hash: string) => transport.get<unknown>('torrents/properties', { hash }),
    files: (hash: string) => transport.get<TorrentFile[]>('torrents/files', { hash }),
    trackers: (hash: string) => transport.get<Tracker[]>('torrents/trackers', { hash }),

    // Pause and Resume are the verbs for a running or paused torrent. Start and
    // Stop are reserved for 0% and 100% in the UI, and are not API names.
    pause: (list: readonly string[]) => transport.post<void>('torrents/pause', hashes(list)),
    resume: (list: readonly string[]) => transport.post<void>('torrents/resume', hashes(list)),

    delete: (list: readonly string[], deleteFiles: boolean) =>
      transport.post<void>('torrents/delete', { ...hashes(list), deleteFiles }),

    recheck: (list: readonly string[]) => transport.post<void>('torrents/recheck', hashes(list)),
    reannounce: (list: readonly string[]) =>
      transport.post<void>('torrents/reannounce', hashes(list)),

    setCategory: (list: readonly string[], category: string) =>
      transport.post<void>('torrents/setCategory', { ...hashes(list), category }),
    addTags: (list: readonly string[], tags: readonly string[]) =>
      transport.post<void>('torrents/addTags', { ...hashes(list), tags: tags.join(',') }),
    removeTags: (list: readonly string[], tags: readonly string[]) =>
      transport.post<void>('torrents/removeTags', { ...hashes(list), tags: tags.join(',') }),

    categories: () => transport.get<Record<string, Category>>('torrents/categories'),
    createCategory: (category: string, savePath: string) =>
      transport.post<void>('torrents/createCategory', { category, savePath }),
    removeCategories: (list: readonly string[]) =>
      transport.post<void>('torrents/removeCategories', { categories: list.join('\n') }),

    tags: () => transport.get<string[]>('torrents/tags'),
    createTags: (list: readonly string[]) =>
      transport.post<void>('torrents/createTags', { tags: list.join(',') }),
    deleteTags: (list: readonly string[]) =>
      transport.post<void>('torrents/deleteTags', { tags: list.join(',') }),
  }
}

export type TorrentsApi = ReturnType<typeof createTorrentsApi>
