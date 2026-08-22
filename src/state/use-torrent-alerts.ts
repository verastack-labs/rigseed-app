import { useEffect, useRef } from 'react'

import { alert } from '@/services/desktop-alert'
import { useAlertStore } from '@/state/alert-store'
import { useTorrentStore } from '@/state/torrent-store'
import type { Torrent, TorrentState } from '@/types/qbittorrent'

/** The two states that mean a torrent stopped because something is wrong. */
const BROKEN: ReadonlySet<TorrentState> = new Set<TorrentState>(['error', 'missingFiles'])

/** What is worth remembering about a torrent between polls. */
interface Seen {
  done: boolean
  broken: boolean
}

const snapshot = (torrent: Torrent): Seen => ({
  done: torrent.progress >= 1,
  broken: BROKEN.has(torrent.state),
})

/**
 * Raises a desktop notification when a torrent finishes or breaks.
 *
 * Edges, not levels. The store is replaced on every poll and most of what is
 * in it has not changed, so the question is never "is this torrent done" but
 * "was it not done last time". Everything here exists to answer that without
 * either missing the moment or announcing it once a second.
 *
 * **The first snapshot is recorded and never announced.** A store that starts
 * empty makes every already-finished torrent look like it finished just now,
 * so opening the app with forty completed torrents would fire forty
 * notifications about downloads from last week. The baseline is taken from the
 * first poll that carries anything, and only what happens after it counts.
 *
 * The same applies to a torrent seen for the first time mid-session, which is
 * what adding an already-complete torrent from a file looks like. It is
 * recorded at whatever it arrived as: something that was complete before
 * rigseed knew about it did not complete while rigseed was watching.
 *
 * Reads the settings through a ref rather than a dependency. Turning an alert
 * on should change what happens next, not re-run the effect and rebuild the
 * baseline, and rebuilding the baseline is invisible right up until the moment
 * it swallows the notification somebody just turned on.
 */
export function useTorrentAlerts(): void {
  const settings = useRef(useAlertStore.getState())
  useEffect(() => useAlertStore.subscribe((next) => (settings.current = next)), [])

  const seen = useRef<Map<string, Seen> | null>(null)

  useEffect(
    () =>
      useTorrentStore.subscribe((state) => {
        const torrents = Object.values(state.torrents)

        // Nothing to compare against, and an empty store is not evidence that
        // every torrent vanished: it is what the store looks like before the
        // first poll lands and again while a reconnection is in flight.
        if (torrents.length === 0) return

        const before = seen.current
        const now = new Map(torrents.map((torrent) => [torrent.hash, snapshot(torrent)]))

        if (before === null) {
          seen.current = now
          return
        }

        const { onComplete, onError } = settings.current
        for (const torrent of torrents) {
          const was = before.get(torrent.hash)
          if (!was) continue

          const is = now.get(torrent.hash)!
          if (onComplete && is.done && !was.done) {
            void alert('Download finished', torrent.name)
          }
          if (onError && is.broken && !was.broken) {
            void alert('Torrent stopped', `${torrent.name} needs attention.`)
          }
        }

        seen.current = now
      }),
    [],
  )
}
