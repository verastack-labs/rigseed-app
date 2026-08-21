import { useCallback, useEffect, useRef, useState } from 'react'

import { useApi } from '@/services/api-context'
import { engineFor } from '@/services/search'
import type { SearchPlugin, SearchResult } from '@/types/qbittorrent'

export type SearchPhase = 'idle' | 'searching' | 'complete' | 'blocked'

export interface SearchJobState {
  results: readonly SearchResult[]
  phase: SearchPhase
  /** Why it is blocked. Null unless `phase` is `blocked`. */
  error: string | null
  run: (pattern: string, category?: string) => Promise<void>
  stop: () => Promise<void>
  reset: () => void
}

/**
 * One search job at a time, and it is always cleaned up.
 *
 * `search/start` creates a job on the daemon and qBittorrent allows five
 * concurrent. Nothing frees a slot except `search/delete`, so this hook owns
 * the whole lifecycle: it deletes the previous job before starting the next,
 * and deletes the current one on unmount. Get that wrong and a user gets four
 * more searches before the screen silently stops working.
 *
 * Results replace rather than accumulate. `search/results` answers with the
 * whole set each time, not a delta, so appending would multiply every hit by
 * the number of polls.
 *
 * The job belongs to the connection that created it. When the client changes
 * the id is meaningless to the new one, so the old job is deleted through the
 * client that made it and everything here resets.
 */
export function useSearchJob(intervalMs = 1000): SearchJobState {
  const api = useApi()

  const [results, setResults] = useState<readonly SearchResult[]>([])
  const [phase, setPhase] = useState<SearchPhase>('idle')
  const [error, setError] = useState<string | null>(null)

  /**
   * The job on the daemon, in a ref rather than state.
   *
   * Cleanup has to see the current id, and an effect that depended on it
   * would tear down and delete the job every time the id changed, which is
   * every time a search starts.
   */
  const jobId = useRef<number | null>(null)
  const plugins = useRef<readonly SearchPlugin[]>([])

  const [owner, setOwner] = useState(api)
  if (owner !== api) {
    // A job id from the previous daemon means nothing to this one. State is
    // adjusted here; the refs are cleared in the effect below, since writing
    // one during render is a side effect like any other.
    setOwner(api)
    setResults([])
    setPhase('idle')
    setError(null)
  }

  const drop = useCallback(
    async (id: number | null) => {
      if (id === null) return
      try {
        await api.search.remove(id)
      } catch {
        // The job outlives us either way. A failed delete is worth nothing to
        // report to somebody who has already moved on.
      }
    },
    [api],
  )

  // Delete the job when the screen goes, and when the client changes. The
  // cleanup closes over the `drop` that made the job, so the request goes to
  // the daemon that is actually holding it. Registered against `drop` rather
  // than the id, or it would tear down and delete on every search.
  useEffect(() => () => void drop(jobId.current), [drop])

  // Cleared after that cleanup has run, so it still had an id to delete.
  useEffect(() => {
    jobId.current = null
    plugins.current = []
  }, [api])

  const run = useCallback(
    async (pattern: string, category = 'all') => {
      const query = pattern.trim()
      if (!query) return

      await drop(jobId.current)
      jobId.current = null
      setResults([])
      setError(null)
      setPhase('searching')

      try {
        plugins.current = await api.search.plugins()
        const { id } = await api.search.start(query, 'enabled', category)
        jobId.current = id
      } catch (cause) {
        setPhase('blocked')
        setError(cause instanceof Error ? cause.message : String(cause))
      }
    },
    [api, drop],
  )

  const stop = useCallback(async () => {
    const id = jobId.current
    if (id === null) return
    try {
      await api.search.stop(id)
    } catch {
      // Already finished or already gone. Either way it is not running.
    }
    setPhase('complete')
  }, [api])

  const reset = useCallback(() => {
    void drop(jobId.current)
    jobId.current = null
    setResults([])
    setPhase('idle')
    setError(null)
  }, [drop])

  useEffect(() => {
    if (phase !== 'searching') return
    let stopped = false
    let timer: ReturnType<typeof setTimeout> | undefined

    const tick = async () => {
      const id = jobId.current
      if (id === null) {
        if (!stopped) timer = setTimeout(() => void tick(), intervalMs)
        return
      }

      try {
        const answer = await api.search.results(id)
        if (stopped) return

        // Whole set every time, so replace. Appending would multiply every
        // hit by the number of polls.
        setResults(
          answer.results.map((r) => ({ ...r, engine: engineFor(r.siteUrl, plugins.current) })),
        )
        if (answer.status === 'Stopped') {
          setPhase('complete')
          return
        }
      } catch (cause) {
        if (!stopped) {
          setPhase('blocked')
          setError(cause instanceof Error ? cause.message : String(cause))
        }
        return
      }

      if (!stopped) timer = setTimeout(() => void tick(), intervalMs)
    }

    void tick()

    return () => {
      stopped = true
      if (timer) clearTimeout(timer)
    }
  }, [api, phase, intervalMs])

  return { results, phase, error, run, stop, reset }
}
