import { relaunch } from '@tauri-apps/plugin-process'
import { check, type Update } from '@tauri-apps/plugin-updater'
import { create } from 'zustand'

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
  /** Nothing asked yet. */
  | { kind: 'idle' }
  | { kind: 'checking' }
  /** Asked, and this is the newest there is. */
  | { kind: 'current' }
  | { kind: 'available'; version: string; notes: string; date?: string }
  | { kind: 'downloading'; version: string; received: number; progress: Progress }
  /** On disk and applied. Everything after this needs a restart. */
  | { kind: 'ready'; version: string }
  | { kind: 'failed'; failure: UpdateFailure; detail?: string }

interface UpdateStore {
  state: UpdateState
  /** True once a check has run this launch, so the quiet one runs only once. */
  checked: boolean
  checkNow: () => Promise<void>
  checkQuietly: () => Promise<void>
  install: () => Promise<void>
  restart: () => Promise<void>
  dismiss: () => void
}

/**
 * The Update handle from `check()`, kept outside the store.
 *
 * It carries a live download and nothing renders it, so putting it in state
 * would make every progress tick a new object identity for something no
 * component reads.
 */
let pending: Update | null = null

/**
 * A store rather than a hook, because two places show this at once.
 *
 * The card in Settings and the marker on the rail have to agree. With a hook,
 * each caller would own a separate copy, and checking in Settings would leave
 * the marker describing a check that never happened.
 *
 * Nothing here installs on its own. Checking at launch is quiet by design and
 * the result is a dot; everything after that is a button somebody presses.
 */
export const useUpdateStore = create<UpdateStore>()((set, get) => {
  const fail = (error: unknown) => {
    const failure = classifyUpdateError(error)
    const detail = error instanceof Error ? error.message : undefined
    pending = null
    set({
      state: detail ? { kind: 'failed', failure, detail } : { kind: 'failed', failure },
      checked: true,
    })
  }

  const run = async () => {
    // A browser has no updater behind it, so there is nothing to ask. Reported
    // as a missing channel rather than an error, because that is what it is.
    if (!canReachDesktop()) {
      set({ state: { kind: 'failed', failure: 'no-channel' }, checked: true })
      return
    }

    set({ state: { kind: 'checking' } })
    try {
      const update = await check()
      if (!update) {
        pending = null
        set({ state: { kind: 'current' }, checked: true })
        return
      }
      pending = update
      set({
        state: {
          kind: 'available',
          version: update.version,
          notes: update.body ?? '',
          ...(update.date ? { date: update.date } : {}),
        },
        checked: true,
      })
    } catch (error) {
      fail(error)
    }
  }

  return {
    state: { kind: 'idle' },
    checked: false,

    checkNow: run,

    /**
     * The launch check.
     *
     * Runs once per launch and only from `idle`, so it can never interrupt a
     * download already in progress or overwrite a result somebody is reading.
     * It sets the same state the button does; the difference is entirely in
     * what the UI does with it, which is draw a dot rather than open anything.
     */
    checkQuietly: async () => {
      if (get().checked || get().state.kind !== 'idle') return
      await run()
    },

    install: async () => {
      const update = pending
      if (!update) return

      let received = 0
      let total: number | null = null
      set({
        state: {
          kind: 'downloading',
          version: update.version,
          received: 0,
          progress: downloadProgress(0, null),
        },
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
            set({
              state: {
                kind: 'downloading',
                version: update.version,
                received,
                progress: downloadProgress(received, total),
              },
            })
          }
        })
        set({ state: { kind: 'ready', version: update.version } })
      } catch (error) {
        fail(error)
      }
    },

    /*
     * Separate, and never called from `install`.
     *
     * The update is already applied by the time this matters; restarting only
     * decides when the new copy starts running. Leaving it to the person means
     * somebody mid-transfer can finish what they were doing and restart when
     * it suits them, which is the whole reason this is not a modal.
     */
    restart: () => relaunch(),

    dismiss: () => {
      pending = null
      set({ state: { kind: 'idle' } })
    },
  }
})

/**
 * Whether the rail should carry a dot.
 *
 * Only the two states that are waiting on a person. A failed check is not one
 * of them: it is not actionable, it is frequently just a missing channel, and
 * a permanent dot for something nobody can fix is how people learn to ignore
 * dots.
 */
export const updateNeedsAttention = (state: UpdateState): boolean =>
  state.kind === 'available' || state.kind === 'ready'
