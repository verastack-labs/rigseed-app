import type {
  AddTorrentOptions,
  Category,
  ShareLimitAction,
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
/**
 * What the daemon on the other end can do.
 *
 * Derived once at connect from `app/webapiVersion` rather than sniffed per
 * call, so a screen never pays for the question and a version check lives in
 * one place.
 */
export interface Capabilities {
  /** 2.11+ (qBittorrent 5.0): `torrents/stop` and `torrents/start`. */
  stopStart: boolean
}

export const DEFAULT_CAPABILITIES: Capabilities = { stopStart: true }

/** `"2.11.2"` to `{ stopStart: true }`. Unparseable input assumes modern. */
export function capabilitiesFor(webApiVersion: string): Capabilities {
  const [major, minor] = webApiVersion.split('.').map(Number)
  if (!Number.isFinite(major) || !Number.isFinite(minor)) return DEFAULT_CAPABILITIES
  return { stopStart: major! > 2 || (major === 2 && minor! >= 11) }
}

export function createTorrentsApi(transport: Transport, caps: Capabilities = DEFAULT_CAPABILITIES) {
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

    /**
     * Pause and Resume stay the names rigseed uses, in the UI and here.
     *
     * The endpoint underneath is not stable across versions. Web API 2.11
     * (qBittorrent 5.0) renamed `torrents/pause` and `torrents/resume` to
     * `torrents/stop` and `torrents/start`, keeping the old pair as
     * deprecated aliases. A daemon older than that answers 404 for the new
     * names, and a future one may drop the old ones, so the call picks by what
     * the daemon reports rather than betting on either.
     *
     * The user-facing verbs do not follow the API. Somebody pausing a torrent
     * has not stopped it, and the copy rules say Pause/Resume.
     */
    pause: (list: readonly string[]) =>
      transport.post<void>(caps.stopStart ? 'torrents/stop' : 'torrents/pause', hashes(list)),
    resume: (list: readonly string[]) =>
      transport.post<void>(caps.stopStart ? 'torrents/start' : 'torrents/resume', hashes(list)),

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
    /**
     * Changes a category's save path. It cannot rename one.
     *
     * The API has no rename: `editCategory` takes the name as the key of what
     * to change. Renaming means create, move every member across, and remove
     * the old one, which the screen does explicitly rather than pretending
     * one call did it.
     */
    editCategory: (category: string, savePath: string) =>
      transport.post<void>('torrents/editCategory', { category, savePath }),
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

    /**
     * Ratio and seeding time limits for a torrent, in one call.
     *
     * All four parameters go every time, because the endpoint is
     * all-or-nothing: it overwrites every limit it is given and there is no
     * way to change one and leave the others alone. Sending three of them
     * would silently reset the fourth, so the caller passes the full set and
     * the dialog reads the current values to fill it.
     *
     * `shareLimitAction` is not optional, whatever the API docs suggest. A
     * 5.2.3 daemon answers `400 Missing required parameters: shareLimitAction`
     * to the three-parameter call that every older client sends. It is safe on
     * an older daemon too, which ignores parameters it does not know, so it
     * always goes rather than being gated on a version check.
     *
     * The daemon does not validate the action. A misspelt one answers 200 and
     * applies `Default`, which is why `ShareLimitAction` is a union.
     *
     * Limits use the wire's own sentinels: `-2` follows the global setting and
     * `-1` means no limit. Times are minutes.
     */
    setShareLimits: (
      list: readonly string[],
      limits: {
        ratioLimit: number
        seedingTimeLimit: number
        inactiveSeedingTimeLimit: number
        shareLimitAction: ShareLimitAction
      },
    ) => transport.post<void>('torrents/setShareLimits', { ...hashes(list), ...limits }),

    /**
     * Force start, which ignores the queue rather than resuming.
     *
     * Not the same as `resume`: a queued torrent that is resumed still waits
     * its turn against the active-downloads limit, and a force-started one
     * does not. A setter rather than a toggle, unlike the two below.
     */
    setForceStart: (list: readonly string[], value: boolean) =>
      transport.post<void>('torrents/setForceStart', { ...hashes(list), value }),

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
