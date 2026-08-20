import { useCallback, useEffect, useMemo, useState } from 'react'

import { useApi } from '@/services/api-context'
import type { LogEntry, PeerBan } from '@/types/qbittorrent'

/** How much of the log is kept in memory. Older entries are dropped. */
const BUFFER = 2000

export interface LogTailState {
  entries: readonly LogEntry[]
  bans: readonly PeerBan[]
  following: boolean
  setFollowing: (next: boolean) => void
  /** Fetched while paused and waiting to be let in. */
  heldBack: number
  loaded: boolean
  error: string | null
  clear: () => void
}

/**
 * The daemon's log, tailed.
 *
 * **Polling continues while Follow is off.** Stopping it would let the daemon's
 * own ring buffer scroll past whatever happened during the pause, and
 * `log/main` only answers forward from an id it still holds, so those lines
 * would be gone for good. The tail keeps running and the *view* freezes, which
 * is what "paused" honestly means here.
 *
 * **Everything resets when the connection changes.** The provider hands out a
 * mock client while it looks for a daemon and swaps in the real one when it
 * finds it, so a screen mounted during that window starts tailing the mock.
 * Without this the sample entries stayed in the buffer and, worse, the cursor
 * stayed with them: the real daemon was then asked for everything after id 12
 * and its first thirteen lines were skipped without a trace. State that
 * belongs to one connection must not survive into the next.
 */
export function useLogTail(intervalMs = 2000): LogTailState {
  const api = useApi()

  const [buffer, setBuffer] = useState<readonly LogEntry[]>([])
  const [bans, setBans] = useState<readonly PeerBan[]>([])
  /** A snapshot taken when Follow went off. Null means following. */
  const [frozen, setFrozen] = useState<readonly LogEntry[] | null>(null)
  const [loaded, setLoaded] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Adjusted during render, which is React's own answer to "this state
  // belongs to that prop". An effect would paint one frame of the previous
  // connection's log first.
  const [owner, setOwner] = useState(api)
  if (owner !== api) {
    setOwner(api)
    setBuffer([])
    setBans([])
    setFrozen(null)
    setLoaded(false)
    setError(null)
  }

  useEffect(() => {
    // Loop-scoped rather than refs: a new connection starts a new loop, and
    // the cursor starts at -1 with it. Nothing about the last one carries
    // over, which is the whole point.
    let lastId = -1
    let lastBanId = -1
    let stopped = false
    let timer: ReturnType<typeof setTimeout> | undefined

    const tick = async () => {
      try {
        const [fresh, freshBans] = await Promise.all([
          api.log.main(lastId),
          api.log.peers(lastBanId),
        ])

        if (!stopped && fresh.length > 0) {
          lastId = fresh[fresh.length - 1]!.id
          // Newest first, and capped. A daemon left running for a week has a
          // log longer than any screen can usefully hold.
          setBuffer((prev) => [...fresh].reverse().concat(prev).slice(0, BUFFER))
        }

        if (!stopped && freshBans.length > 0) {
          lastBanId = freshBans[freshBans.length - 1]!.id
          setBans((prev) => [...freshBans].reverse().concat(prev).slice(0, BUFFER))
        }

        if (!stopped) {
          setLoaded(true)
          setError(null)
        }
      } catch (cause) {
        if (!stopped) setError(cause instanceof Error ? cause.message : String(cause))
      }

      if (!stopped) timer = setTimeout(() => void tick(), intervalMs)
    }

    void tick()

    return () => {
      stopped = true
      if (timer) clearTimeout(timer)
    }
    // Deliberately not `following`. The loop does not read it: the freeze is a
    // snapshot taken at render, so pausing never restarts the poll or resets
    // the cursor.
  }, [api, intervalMs])

  const entries = frozen ?? buffer
  const heldBack = frozen ? Math.max(0, buffer.length - frozen.length) : 0

  // Pausing freezes what is on screen right now, so `buffer` is a dependency.
  // The functional form would hand back the previous frozen snapshot, which is
  // null at that moment, and the view would empty instead of holding still.
  const setFollowing = useCallback((next: boolean) => setFrozen(next ? null : buffer), [buffer])

  const clear = useCallback(() => {
    // The view only. The daemon's log is its own, and this button has never
    // been able to delete anything from it. The cursor does not rewind, so
    // cleared lines do not come back on the next tick.
    setBuffer([])
    setFrozen(null)
  }, [])

  return useMemo(
    () => ({
      entries,
      bans,
      following: frozen === null,
      setFollowing,
      heldBack,
      loaded,
      error,
      clear,
    }),
    [entries, bans, frozen, setFollowing, heldBack, loaded, error, clear],
  )
}
