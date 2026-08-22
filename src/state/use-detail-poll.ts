import { useCallback, useEffect, useState } from 'react'

import { useApi } from '@/services/api-context'
import type { Peer, TorrentFile, TorrentProperties, Tracker } from '@/types/qbittorrent'

export type DetailTabKey = 'general' | 'files' | 'trackers' | 'peers' | 'speed'

export interface DetailData {
  properties: TorrentProperties | null
  files: readonly TorrentFile[] | null
  trackers: readonly Tracker[] | null
  peers: Record<string, Peer> | null
  /** Refetch now, for after a write that changes what is on screen. */
  refresh: () => Promise<void>
}

/**
 * The four endpoints the torrent list does not carry.
 *
 * Only the visible tab is fetched. A Peers poll running while somebody reads
 * Trackers is bandwidth nobody asked for, and on a busy swarm it is not a
 * small amount.
 *
 * Same shape as `useSyncPoll`: a self-scheduling timeout rather than an
 * interval, because an interval stacks requests if one call ever takes longer
 * than the gap, and a daemon under load is exactly when that happens. The
 * `stopped` ref means a response that arrives after unmount, or after the tab
 * changed, is dropped instead of writing into a screen that moved on.
 */
export function useDetailPoll(hash: string, tab: DetailTabKey, intervalMs = 2000): DetailData {
  const api = useApi()

  const [properties, setProperties] = useState<TorrentProperties | null>(null)
  const [files, setFiles] = useState<readonly TorrentFile[] | null>(null)
  const [trackers, setTrackers] = useState<readonly Tracker[] | null>(null)
  const [peers, setPeers] = useState<Record<string, Peer> | null>(null)


  /**
   * Which torrent the data in state belongs to.
   *
   * Without this, opening a second torrent showed the first one's save path,
   * hash and file list until each request came back. Stale values that look
   * plausible are worse than a skeleton, because nothing about them says they
   * are the wrong torrent's.
   *
   * Adjusted during render rather than from an effect. React re-runs this
   * component immediately with the new state and never commits the stale
   * frame, which an effect cannot promise and which the
   * set-state-in-effect rule exists to keep people away from.
   */
  const [loadedFor, setLoadedFor] = useState({ hash, api })
  if (loadedFor.hash !== hash || loadedFor.api !== api) {
    // The api as well as the hash. The provider hands out a mock client while
    // it looks for a daemon and swaps in the real one when it finds it, so
    // this screen can be showing the sample torrent's properties when the
    // connection underneath it changes. Same rule as the hash: state that
    // belongs to one of them must not survive into another.
    setLoadedFor({ hash, api })
    setProperties(null)
    setFiles(null)
    setTrackers(null)
    setPeers(null)
  }

  /**
   * Fetch one tab's data.
   *
   * `alive` belongs to the loop that called this, not to the hook. A ref
   * shared across runs is how the old version broke: when the provider swapped
   * the mock client for the real one, the new run set the shared flag back to
   * false and un-stopped the previous run's loop. Both then polled forever,
   * and the mock one answers `undefined` for a hash it has never heard of, so
   * the General tab dropped to its skeleton every other poll.
   *
   * An empty body becomes null rather than undefined. `undefined` is not a
   * state this hook has: it reads as loaded-but-empty at every call site while
   * being neither, which is what made that flicker so hard to place.
   */
  const fetchFor = useCallback(
    async (which: DetailTabKey, alive: () => boolean = () => true) => {
      if (!hash) return
      if (which === 'general') {
        const data = await api.torrents.properties(hash)
        if (alive()) setProperties(data ?? null)
      }
      if (which === 'files') {
        const data = await api.torrents.files(hash)
        if (alive()) setFiles(data ?? null)
      }
      if (which === 'trackers') {
        const data = await api.torrents.trackers(hash)
        if (alive()) setTrackers(data ?? null)
      }
      if (which === 'peers') {
        // rid 0 every time, so the answer is a full snapshot rather than a
        // diff of partials. A per-screen diff cursor would be a second sync
        // protocol to keep correct, for one torrent's worth of peers.
        const data = await api.sync.torrentPeers(hash, 0)
        if (alive()) setPeers((data?.peers ?? {}) as Record<string, Peer>)
      }
    },
    [api, hash],
  )

  /**
   * The counts the tab bar shows, fetched once on mount.
   *
   * A badge that appears only after its tab has been visited reads as still
   * loading on a screen that has finished loading, and a count in a tab
   * exists precisely to answer the question without going there.
   *
   * Files and Peers only. Trackers is covered by `trackers_count` on the
   * torrent itself, which costs nothing; there is no equivalent for these two,
   * since `num_seeds + num_leechs` counts something slightly different from
   * what the Peers tab lists.
   *
   * One request each rather than a second poller. The tab's own poll keeps it
   * current once open, and polling a peer list nobody is looking at is the
   * bandwidth this hook exists to avoid.
   */
  useEffect(() => {
    if (!hash) return
    let cancelled = false

    void (async () => {
      try {
        const data = await api.torrents.files(hash)
        if (!cancelled) setFiles(data)
      } catch {
        // The tab fetches it again when it opens.
      }
    })()

    void (async () => {
      try {
        const data = await api.sync.torrentPeers(hash, 0)
        if (!cancelled) setPeers((data.peers ?? {}) as Record<string, Peer>)
      } catch {
        // Same: the tab fetches it again when it opens.
      }
    })()

    return () => {
      cancelled = true
    }
  }, [api, hash])

  useEffect(() => {
    // Local to this run. Every superseded loop keeps its own false and stops
    // for good, which a shared ref cannot promise.
    let stopped = false
    let timer: ReturnType<typeof setTimeout> | undefined

    const tick = async () => {
      try {
        await fetchFor(tab, () => !stopped)
      } catch {
        // A failed poll is not fatal. What is on screen stays rather than
        // blanking, and the next tick retries.
      }
      if (!stopped) timer = setTimeout(() => void tick(), intervalMs)
    }

    void tick()

    return () => {
      stopped = true
      if (timer) clearTimeout(timer)
    }
  }, [fetchFor, tab, intervalMs])

  const refresh = useCallback(() => fetchFor(tab), [fetchFor, tab])

  return { properties, files, trackers, peers, refresh }
}
