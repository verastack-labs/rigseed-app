import { useEffect } from 'react'

import { useApi } from '@/services/api-context'
import { useTorrentStore } from '@/state/torrent-store'

/**
 * The sync loop. Everything live in the UI comes from here.
 *
 * Polls `sync/maindata` with the last `rid` and merges the diff. Deliberately
 * a self-scheduling timeout rather than an interval: an interval would stack
 * requests if one poll ever took longer than the gap, and a daemon under load
 * is exactly when that happens.
 */
export function useSyncPoll(intervalMs = 1000) {
  const api = useApi()
  const applyMainData = useTorrentStore((s) => s.applyMainData)
  const setReachable = useTorrentStore((s) => s.setReachable)

  useEffect(() => {
    // Local to this run, not a ref. A ref is shared across runs, so when the
    // client changed the new loop set it back to false and the old loop's
    // in-flight response saw a green light. That is how mock torrents ended up
    // merged into a real daemon's store: a diff for a hash the store had never
    // seen, minting a torrent out of two speed fields and no state.
    let stopped = false
    let timer: ReturnType<typeof setTimeout> | undefined

    // Each connection is its own session, so the rid starts fresh and the
    // first response is a full update.
    let rid = 0

    /**
     * Consecutive failures, loop-scoped like the rid and for the same reason.
     *
     * Two rather than one: at a one second interval a single dropped poll is
     * a blip, and greying the toolbar out for it would flicker. Two failures
     * is two seconds of silence, which is a daemon that has gone away.
     */
    let failures = 0

    const tick = async () => {
      try {
        const data = await api.sync.maindata(rid)
        if (stopped) return
        rid = data.rid
        applyMainData(data)
        failures = 0
        setReachable(true)
      } catch {
        // A failed poll is not fatal. The store keeps the last known data on
        // screen rather than blanking it, per the connection-loss rule, and
        // the next tick retries. What does change is that the app stops
        // claiming to be connected and stops offering to write.
        if (stopped) return
        failures += 1
        if (failures >= 2) setReachable(false)
      }
      if (!stopped) timer = setTimeout(() => void tick(), intervalMs)
    }

    void tick()

    return () => {
      stopped = true
      if (timer) clearTimeout(timer)
    }
  }, [api, applyMainData, setReachable, intervalMs])
}
