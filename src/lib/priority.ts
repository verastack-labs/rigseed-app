import type { TorrentEntry } from '@/utils/torrent-file'

/**
 * The daemon's own per-file priority numbers.
 *
 * `torrents/filePrio` takes these literally, and inventing a parallel
 * vocabulary would mean a mapping table whose only job is to undo itself.
 *
 * Shared by Add Torrent and the detail screen's Files tab. They agree on the
 * numbers and differ on what they offer: adding a torrent nobody has started
 * has no ordering to influence, so that dialog leaves out High.
 */
export const PRIORITY = { skip: 0, normal: 1, high: 6, max: 7 } as const

export type Priority = (typeof PRIORITY)[keyof typeof PRIORITY]

export const PRIORITY_LABEL: Record<Priority, string> = {
  [PRIORITY.skip]: 'Skip',
  [PRIORITY.normal]: 'Normal',
  [PRIORITY.high]: 'High',
  [PRIORITY.max]: 'Max',
}

/** Every priority, in order, for a picker that offers all of them. */
export const PRIORITY_CHOICES: readonly { value: Priority; label: string }[] = [
  { value: PRIORITY.skip, label: PRIORITY_LABEL[PRIORITY.skip] },
  { value: PRIORITY.normal, label: PRIORITY_LABEL[PRIORITY.normal] },
  { value: PRIORITY.high, label: PRIORITY_LABEL[PRIORITY.high] },
  { value: PRIORITY.max, label: PRIORITY_LABEL[PRIORITY.max] },
]

/** Total of everything not skipped. What the save-path hint compares. */
export function selectedSize(
  entries: readonly TorrentEntry[],
  priorities: readonly Priority[],
): number {
  return entries.reduce(
    (sum, entry, i) => (priorities[i] === PRIORITY.skip ? sum : sum + entry.size),
    0,
  )
}
