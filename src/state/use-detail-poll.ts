import { useCallback, useEffect, useRef, useState } from 'react'

import { useApi } from '@/services/context'
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

  const stopped = useRef(false)

  const fetchFor = useCallback(
    async (which: DetailTabKey) => {
      if (!hash) return
      if (which === 'general') {
        const data = await api.torrents.properties(hash)
        if (!stopped.current) setProperties(data)
      }
      if (which === 'files') {
        const data = await api.torrents.files(hash)
        if (!stopped.current) setFiles(data)
      }
      if (which === 'trackers') {
        const data = await api.torrents.trackers(hash)
        if (!stopped.current) setTrackers(data)
      }
      if (which === 'peers') {
        // rid 0 every time, so the answer is a full snapshot rather than a
        // diff of partials. A per-screen diff cursor would be a second sync
        // protocol to keep correct, for one torrent's worth of peers.
        const data = await api.sync.torrentPeers(hash, 0)
        if (!stopped.current) setPeers((data.peers ?? {}) as Record<string, Peer>)
      }
    },
    [api, hash],
  )

  useEffect(() => {
    stopped.current = false
    let timer: ReturnType<typeof setTimeout> | undefined

    const tick = async () => {
      try {
        await fetchFor(tab)
      } catch {
        // A failed poll is not fatal. What is on screen stays rather than
        // blanking, and the next tick retries.
      }
      if (!stopped.current) timer = setTimeout(() => void tick(), intervalMs)
    }

    void tick()

    return () => {
      stopped.current = true
      if (timer) clearTimeout(timer)
    }
  }, [fetchFor, tab, intervalMs])

  const refresh = useCallback(() => fetchFor(tab), [fetchFor, tab])

  return { properties, files, trackers, peers, refresh }
}
