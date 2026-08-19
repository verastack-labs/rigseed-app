import type {
  AddTorrentOptions,
  Category,
  Torrent,
  TorrentFile,
  TorrentProperties,
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

    properties: (hash: string) => transport.get<TorrentProperties>('torrents/properties', { hash }),
    files: (hash: string) => transport.get<TorrentFile[]>('torrents/files', { hash }),
    trackers: (hash: string) => transport.get<Tracker[]>('torrents/trackers', { hash }),

    // Pause and Resume are the verbs for a running or paused torrent. Start and
    // Stop are reserved for 0% and 100% in the UI, and are not API names.
    pause: (list: readonly string[]) => transport.post<void>('torrents/pause', hashes(list)),
    resume: (list: readonly string[]) => transport.post<void>('torrents/resume', hashes(list)),

    delete: (list: readonly string[], deleteFiles: boolean) =>
      transport.post<void>('torrents/delete', { ...hashes(list), deleteFiles }),

    /**
     * Per-file priority, including 0 to skip a file entirely.
     *
     * A follow-up to `add` rather than part of it: `torrents/add` has no
     * per-file parameter at all, so a torrent added with files deselected is
     * added whole and then narrowed. Ids are indices into the torrent's own
     * file list, which is the order `torrents/files` and a parsed `.torrent`
     * both report.
     */
    filePrio: (hash: string, ids: readonly number[], priority: number) =>
      transport.post<void>('torrents/filePrio', {
        hash,
        id: ids.join('|'),
        priority,
      }),

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

    /**
     * Per-torrent rate limits, in bytes per second. -1 is unlimited.
     *
     * The setters are plural and the getters are not, which is the API's own
     * inconsistency rather than ours: `setDownloadLimit` takes a hash list,
     * `downloadLimit` takes one too but the Speed tab only ever asks about the
     * torrent it is showing.
     */
    setDownloadLimit: (list: readonly string[], limit: number) =>
      transport.post<void>('torrents/setDownloadLimit', { ...hashes(list), limit }),
    setUploadLimit: (list: readonly string[], limit: number) =>
      transport.post<void>('torrents/setUploadLimit', { ...hashes(list), limit }),

    // Toggles, not setters. The API has no way to say "sequential on"; it
    // only flips, which means the caller has to know the current state and a
    // double click is a no-op rather than an error.
    toggleSequentialDownload: (list: readonly string[]) =>
      transport.post<void>('torrents/toggleSequentialDownload', hashes(list)),
    toggleFirstLastPiecePrio: (list: readonly string[]) =>
      transport.post<void>('torrents/toggleFirstLastPiecePrio', hashes(list)),

    /** This one is a setter, unlike the two above. The API is not uniform. */
    setAutoManagement: (list: readonly string[], enable: boolean) =>
      transport.post<void>('torrents/setAutoManagement', { ...hashes(list), enable }),

    addTrackers: (hash: string, urls: readonly string[]) =>
      transport.post<void>('torrents/addTrackers', { hash, urls: urls.join('\n') }),
    editTracker: (hash: string, origUrl: string, newUrl: string) =>
      transport.post<void>('torrents/editTracker', { hash, origUrl, newUrl }),
    removeTrackers: (hash: string, urls: readonly string[]) =>
      transport.post<void>('torrents/removeTrackers', { hash, urls: urls.join('|') }),

    /**
     * Renaming is per file, and the id is the index into `torrents/files`.
     *
     * `newPath` is the full path inside the torrent, not just a name, which is
     * how a file gets moved between folders as well as renamed.
     */
    renameFile: (hash: string, id: number, newPath: string) =>
      transport.post<void>('torrents/renameFile', { hash, id, newPath }),

    tags: () => transport.get<string[]>('torrents/tags'),
    createTags: (list: readonly string[]) =>
      transport.post<void>('torrents/createTags', { tags: list.join(',') }),
    deleteTags: (list: readonly string[]) =>
      transport.post<void>('torrents/deleteTags', { tags: list.join(',') }),
  }
}

export type TorrentsApi = ReturnType<typeof createTorrentsApi>
