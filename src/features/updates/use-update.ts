import { relaunch } from '@tauri-apps/plugin-process'
import { check, type Update } from '@tauri-apps/plugin-updater'
import { useCallback, useRef, useState } from 'react'

import {
  classifyUpdateError,
  downloadProgress,
  type Progress,
  type UpdateFailure,
} from '@/features/updates/update-status'
import { canReachDesktop } from '@/services/shell'

/**
 * The update, as a state the screen can render directly.
 *
 * One discriminated union rather than a handful of booleans, because the
 * states genuinely exclude each other: a build cannot be both downloading and
 * up to date, and a shape that allows it is a shape somebody eventually
 * renders.
 */
export type UpdateState =
  /** Nothing asked yet this session. Checking is never automatic on this screen. */
  | { kind: 'idle' }
  | { kind: 'checking' }
  /** Asked, and this is the newest there is. */
  | { kind: 'current' }
  | { kind: 'available'; version: string; notes: string; date?: string }
  | { kind: 'downloading'; version: string; received: number; progress: Progress }
  /** On disk and applied. Everything after this needs a restart. */
  | { kind: 'ready'; version: string }
  | { kind: 'failed'; failure: UpdateFailure; detail?: string }

/**
 * Checking, downloading and restarting, with nothing automatic in it.
 *
 * The app never checks on its own and never installs on its own. Both are
 * deliberate and both follow the same rule the rest of rigseed does: attention
 * is spent on live things, and an update is not one. A torrent client that
 * interrupts a running transfer to talk about itself has its priorities the
 * wrong way round.
 */
export function useUpdate() {
  const [state, setState] = useState<UpdateState>({ kind: 'idle' })

  /*
   * The Update handle from `check()`, kept so `install` acts on the same one
   * the screen is describing. Held in a ref rather than in state because it is
   * not rendered and carries a live download; putting it in state would make
   * every progress tick a new object identity for something nothing reads.
   */
  const pending = useRef<Update | null>(null)

  const fail = useCallback((error: unknown) => {
    const failure = classifyUpdateError(error)
    const detail = error instanceof Error ? error.message : undefined
    setState(detail ? { kind: 'failed', failure, detail } : { kind: 'failed', failure })
  }, [])

  const checkNow = useCallback(async () => {
    // A browser has no updater behind it, so there is nothing to ask. Reported
    // as a missing channel rather than an error, because that is what it is.
    if (!canReachDesktop()) {
      setState({ kind: 'failed', failure: 'no-channel' })
      return
    }

    setState({ kind: 'checking' })
    try {
      const update = await check()
      if (!update) {
        pending.current = null
        setState({ kind: 'current' })
        return
      }
      pending.current = update
      setState({
        kind: 'available',
        version: update.version,
        notes: update.body ?? '',
        ...(update.date ? { date: update.date } : {}),
      })
    } catch (error) {
      pending.current = null
      fail(error)
    }
  }, [fail])

  const install = useCallback(async () => {
    const update = pending.current
    if (!update) return

    let received = 0
    let total: number | null = null
    setState({
      kind: 'downloading',
      version: update.version,
      received: 0,
      progress: downloadProgress(0, null),
    })

    try {
      await update.downloadAndInstall((event) => {
        // Three events, and only the first carries the length. A server that
        // sends no content length leaves it null, which the progress helper
        // reports as unknown rather than as zero.
        if (event.event === 'Started') {
          total = event.data.contentLength ?? null
        } else if (event.event === 'Progress') {
          received += event.data.chunkLength
          setState({
            kind: 'downloading',
            version: update.version,
            received,
            progress: downloadProgress(received, total),
          })
        }
      })
      setState({ kind: 'ready', version: update.version })
    } catch (error) {
      fail(error)
    }
  }, [fail])

  /*
   * Separate, and never called from `install`.
   *
   * The update is already applied by the time this matters; restarting only
   * decides when the new copy starts running. Leaving it to the person means
   * somebody mid-transfer can finish what they were doing and restart when it
   * suits them, which is the whole reason this is not a modal.
   */
  const restart = useCallback(() => relaunch(), [])

  const dismiss = useCallback(() => {
    pending.current = null
    setState({ kind: 'idle' })
  }, [])

  return { state, checkNow, install, restart, dismiss }
}
