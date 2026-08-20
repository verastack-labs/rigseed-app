import { useCallback, useEffect, useRef, useState } from 'react'

import { useApi } from '@/services/api-context'
import type { LogEntry, PeerBan } from '@/types/qbittorrent'

/** How much of the log is kept in memory. Older entries are dropped. */
const BUFFER = 2000

export interface LogTailState {
  entries: readonly LogEntry[]
  bans: readonly PeerBan[]
  following: boolean
  setFollowing: (next: boolean) => void
  /** New entries fetched while paused, waiting to be let in. */
  heldBack: number
  loaded: boolean
  error: string | null
  clear: () => void
}

/**
 * The daemon's log, tailed.
 *
 * Polling continues while Follow is off. Stopping the poll would mean the
 * daemon's own ring buffer scrolls past whatever happened during the pause and
 * those lines are gone for good: `log/main` only answers forward from an id it
 * still holds. So the tail keeps running and the *view* freezes, which is what
 * "paused" honestly means here, and `heldBack` is how many lines are waiting.
 *
 * Newest first, because a log is read from the top and the interesting line is
 * almost always the last thing that happened.
 */
export function useLogTail(intervalMs = 2000): LogTailState {
  const api = useApi()

  const [entries, setEntries] = useState<readonly LogEntry[]>([])
  const [bans, setBans] = useState<readonly PeerBan[]>([])
  const [following, setFollowing] = useState(true)
  const [heldBack, setHeldBack] = useState(0)
  const [loaded, setLoaded] = useState(false)
  const [error, setError] = useState<string | null>(null)

  /**
   * What has been fetched, whether or not it is being shown.
   *
   * Held in a ref rather than state because the poll reads it every tick and
   * putting it in the dependency list would rebuild the loop on every answer.
   */
  const held = useRef<LogEntry[]>([])
  const lastId = useRef(-1)
  const lastBanId = useRef(-1)
  const stopped = useRef(false)

  useEffect(() => {
    stopped.current = false
    let timer: ReturnType<typeof setTimeout> | undefined

    const tick = async () => {
      try {
        const [fresh, freshBans] = await Promise.all([
          api.log.main(lastId.current),
          api.log.peers(lastBanId.current),
        ])

        if (fresh.length > 0) {
          lastId.current = fresh[fresh.length - 1]!.id
          // Newest first, and capped. A daemon left running for a week has a
          // log longer than any screen can usefully hold.
          held.current = [...fresh].reverse().concat(held.current).slice(0, BUFFER)
          if (following) setEntries(held.current)
          else setHeldBack((n) => n + fresh.length)
        }

        if (freshBans.length > 0) {
          lastBanId.current = freshBans[freshBans.length - 1]!.id
          setBans((prev) => [...freshBans].reverse().concat(prev).slice(0, BUFFER))
        }

        if (!stopped.current) {
          setLoaded(true)
          setError(null)
        }
      } catch (cause) {
        if (!stopped.current) setError(cause instanceof Error ? cause.message : String(cause))
      }

      if (!stopped.current) timer = setTimeout(() => void tick(), intervalMs)
    }

    void tick()

    return () => {
      stopped.current = true
      if (timer) clearTimeout(timer)
    }
    // `following` is a dependency rather than a ref read during render. The
    // loop restarts when it changes, which costs one extra fetch and buys a
    // closure that cannot be looking at last render's answer.
  }, [api, intervalMs, following])

  const follow = useCallback((next: boolean) => {
    setFollowing(next)
    if (next) {
      // Everything gathered while paused arrives at once.
      setEntries(held.current)
      setHeldBack(0)
    }
  }, [])

  const clear = useCallback(() => {
    // The view only. The daemon's log is its own, and this button has never
    // been able to delete anything from it.
    held.current = []
    setEntries([])
    setHeldBack(0)
  }, [])

  return { entries, bans, following, setFollowing: follow, heldBack, loaded, error, clear }
}
