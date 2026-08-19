import { useEffect, useRef } from 'react'

import { useApi } from '@/services/context'
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
  const stopped = useRef(false)

  useEffect(() => {
    stopped.current = false
    let timer: ReturnType<typeof setTimeout> | undefined

    // Each connection is its own session, so the rid starts fresh and the
    // first response is a full update.
    let rid = 0

    const tick = async () => {
      try {
        const data = await api.sync.maindata(rid)
        if (stopped.current) return
        rid = data.rid
        applyMainData(data)
      } catch {
        // A failed poll is not fatal. The store keeps the last known data on
        // screen rather than blanking it, per the connection-loss rule, and
        // the next tick retries.
      }
      if (!stopped.current) timer = setTimeout(() => void tick(), intervalMs)
    }

    void tick()

    return () => {
      stopped.current = true
      if (timer) clearTimeout(timer)
    }
  }, [api, applyMainData, intervalMs])
}
