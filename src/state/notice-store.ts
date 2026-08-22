import { create } from 'zustand'

export type NoticeTone = 'warn' | 'ok'

export interface Notice {
  id: number
  tone: NoticeTone
  /** What was being attempted, in the user's terms. "Pause torrent". */
  what: string
  /** The daemon's own words, when there are any worth showing. */
  detail?: string
}

interface NoticeState {
  notices: readonly Notice[]
  push: (notice: Omit<Notice, 'id'>) => number
  dismiss: (id: number) => void
  clear: () => void
}

/**
 * How many stay on screen at once.
 *
 * A stack that grows without limit covers the thing it is reporting on. Six
 * failures in a row is one problem, not six, and the oldest is the least
 * useful of them.
 */
const MOST = 4

let nextId = 0

/**
 * Where a passing message lives between something failing and somebody
 * noticing.
 *
 * A store rather than context, for the reason every other store here is one:
 * the things that raise a notice are scattered across pages and the thing that
 * renders them is in the shell, and threading a callback between them would
 * mean every intervening component knowing about notices.
 *
 * Deliberately not persisted. A failure from the last session is not news, and
 * a stale one is worse than none: it describes a daemon that may not even be
 * the one now connected.
 */
export const useNoticeStore = create<NoticeState>()((set) => ({
  notices: [],

  push: (notice) => {
    const id = (nextId += 1)
    set((prev) => ({ notices: [...prev.notices, { ...notice, id }].slice(-MOST) }))
    return id
  },

  dismiss: (id) => set((prev) => ({ notices: prev.notices.filter((one) => one.id !== id) })),

  clear: () => set({ notices: [] }),
}))

/**
 * Raises a notice from outside React.
 *
 * `write` needs this: it is called from event handlers and effects that have no
 * business taking a hook dependency on the store.
 */
export const notify = (notice: Omit<Notice, 'id'>): number => useNoticeStore.getState().push(notice)

/**
 * The daemon's words, reduced to something worth putting on screen.
 *
 * `ApiError` messages already carry the endpoint and status. Anything else is
 * whatever was thrown, which is usually a network failure and usually reads
 * well enough. An empty result is dropped rather than shown as "undefined".
 */
export function detailOf(cause: unknown): string | undefined {
  const text = cause instanceof Error ? cause.message : String(cause ?? '')
  const trimmed = text.trim()
  return trimmed === '' ? undefined : trimmed
}
