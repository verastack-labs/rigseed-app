import { create } from 'zustand'

import type { Category, GlobalTransferInfo, MainData, Torrent } from '@/types/qbittorrent'

export interface TorrentState {
  /** Normalised by hash. Never replaced wholesale except on a full update. */
  torrents: Record<string, Torrent>
  categories: Record<string, Category>
  tags: string[]
  serverState: Partial<GlobalTransferInfo>
  /**
   * Global speed history, appended once per poll.
   *
   * Lives here rather than in the screen because it is derived from poll data
   * and accumulating it during render would mean mutating state while
   * rendering, which breaks under concurrent rendering.
   */
  speedHistory: { down: readonly number[]; up: readonly number[] }
  /** The daemon's response id. Send it back to get the next diff. */
  rid: number
  /** True once any response has been merged. Drives the skeleton state. */
  loaded: boolean

  applyMainData: (data: MainData) => void
  reset: () => void
}

/** The sparkline's window. */
const SPEED_SAMPLES = 60

const EMPTY = {
  torrents: {} as Record<string, Torrent>,
  categories: {} as Record<string, Category>,
  tags: [] as string[],
  serverState: {} as Partial<GlobalTransferInfo>,
  speedHistory: { down: [] as number[], up: [] as number[] },
  rid: 0,
  loaded: false,
}

/**
 * The single normalised torrent store.
 *
 * `sync/maindata` sends diffs, not snapshots. Three rules follow from that and
 * every one of them is a bug if broken:
 *
 * 1. A per-torrent object contains only the fields that changed, so it must be
 *    merged into the existing record rather than assigned over it. Assigning
 *    would blank every field the daemon did not resend.
 * 2. An absent key means unchanged, not empty. `torrents` missing from a
 *    response does not mean there are no torrents.
 * 3. `full_update` means replace. The daemon sets it on the first response of
 *    a session and whenever it cannot produce a diff, so a caller that always
 *    merges will accumulate torrents that no longer exist.
 *
 * Removals arrive separately in `torrents_removed`, because a diff has no way
 * to express absence.
 */
export const useTorrentStore = create<TorrentState>()((set) => ({
  ...EMPTY,

  applyMainData: (data) =>
    set((prev) => {
      const full = data.full_update === true

      const torrents: Record<string, Torrent> = full ? {} : { ...prev.torrents }
      for (const [hash, patch] of Object.entries(data.torrents ?? {})) {
        const existing = torrents[hash]
        torrents[hash] = existing
          ? { ...existing, ...patch }
          : // A torrent seen for the first time arrives complete, so the cast
            // is safe here and nowhere else in this function.
            ({ ...patch, hash } as Torrent)
      }
      for (const hash of data.torrents_removed ?? []) delete torrents[hash]

      const categories: Record<string, Category> = full ? {} : { ...prev.categories }
      for (const [name, category] of Object.entries(data.categories ?? {})) {
        categories[name] = { ...categories[name], ...category }
      }
      for (const name of data.categories_removed ?? []) delete categories[name]

      let tags = full ? [] : prev.tags
      if (data.tags?.length) tags = [...new Set([...tags, ...data.tags])]
      if (data.tags_removed?.length) {
        const gone = new Set(data.tags_removed)
        tags = tags.filter((t) => !gone.has(t))
      }

      const serverState = full
        ? (data.server_state ?? {})
        : { ...prev.serverState, ...data.server_state }

      // 60 samples, one per poll, matching the sparkline window. A full update
      // means a new session, so the history starts over with it.
      const previous = full ? { down: [], up: [] } : prev.speedHistory
      const speedHistory = {
        down: [...previous.down, serverState.dl_info_speed ?? 0].slice(-SPEED_SAMPLES),
        up: [...previous.up, serverState.up_info_speed ?? 0].slice(-SPEED_SAMPLES),
      }

      return {
        torrents,
        categories,
        tags,
        speedHistory,
        serverState,
        rid: data.rid,
        loaded: true,
      }
    }),

  reset: () => set({ ...EMPTY }),
}))

/** Stable empty array so selectors do not return a new reference each call. */
const NO_TORRENTS: readonly Torrent[] = []

/**
 * Selectors live beside the store rather than in components.
 *
 * A component subscribing to the whole store re-renders on every poll, which
 * with a thousand rows at one poll per second is the one real performance
 * risk in this app.
 */
export const selectTorrentList = (s: TorrentState): readonly Torrent[] => {
  const values = Object.values(s.torrents)
  return values.length ? values : NO_TORRENTS
}

export const selectTorrent = (hash: string) => (s: TorrentState) => s.torrents[hash]

export const selectCounts = (s: TorrentState) => {
  let downloading = 0
  let seeding = 0
  let paused = 0
  for (const t of Object.values(s.torrents)) {
    if (t.state.startsWith('paused')) paused += 1
    else if (t.state === 'uploading' || t.state === 'stalledUP' || t.state === 'forcedUP')
      seeding += 1
    else downloading += 1
  }
  return { all: Object.keys(s.torrents).length, downloading, seeding, paused }
}
