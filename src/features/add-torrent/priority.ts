import type { TorrentEntry } from '@/utils/torrent-file'

/**
 * The daemon's own priority numbers, not an enum of our own.
 *
 * `torrents/filePrio` takes these values literally, and inventing a parallel
 * vocabulary here would mean a mapping table whose only job is to undo itself.
 *
 * In its own module rather than beside the table that renders it, because a
 * file exporting both components and constants cannot be hot-reloaded: React
 * Refresh can swap a component while preserving state only when it can be sure
 * nothing else in the file was re-evaluated too.
 */
export const PRIORITY = { skip: 0, normal: 1, max: 7 } as const

export type Priority = (typeof PRIORITY)[keyof typeof PRIORITY]

export const PRIORITY_LABEL: Record<Priority, string> = {
  [PRIORITY.skip]: 'Skip',
  [PRIORITY.normal]: 'Normal',
  [PRIORITY.max]: 'Max',
}

/** Total of everything not skipped. This is what the save-path hint compares. */
export function selectedSize(
  entries: readonly TorrentEntry[],
  priorities: readonly Priority[],
): number {
  return entries.reduce(
    (sum, entry, i) => (priorities[i] === PRIORITY.skip ? sum : sum + entry.size),
    0,
  )
}
