import type { StatusFilter } from '@/state/transfers-store'
import type { Torrent } from '@/types/qbittorrent'
import { isActive, isComplete, isPaused, isSeeding, isStalled } from '@/utils/format'

export interface Filters {
  status: StatusFilter
  category: string | null
  tag: string | null
  query: string
}

/**
 * A torrent's tags, as a list.
 *
 * The API sends them as one comma-separated string, and an empty string splits
 * to `['']` rather than `[]`, which would make every torrent look tagged.
 */
export function tagsOf(torrent: Pick<Torrent, 'tags'>): string[] {
  return torrent.tags
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean)
}

function matchesStatus(torrent: Torrent, status: StatusFilter): boolean {
  switch (status) {
    case 'all':
      return true
    case 'downloading':
      // Complete torrents are never downloading, whatever the daemon calls
      // their state during a recheck.
      return !isComplete(torrent.progress) && !isPaused(torrent.state)
    case 'seeding':
      return isSeeding(torrent.state)
    case 'completed':
      return isComplete(torrent.progress)
    case 'paused':
      return isPaused(torrent.state)
    case 'active':
      // Active means moving bytes right now, not merely unpaused.
      return isActive(torrent)
    case 'stalled':
      return isStalled(torrent.state)
  }
}

/**
 * Applies the sidebar filters and the search box.
 *
 * Filters combine with AND: picking a category and typing a query narrows to
 * torrents matching both. That is what the Clear filters affordance exists
 * for, since two filters can easily produce nothing.
 */
export function filterTorrents(torrents: readonly Torrent[], filters: Filters): Torrent[] {
  const query = filters.query.trim().toLowerCase()

  return torrents.filter((torrent) => {
    if (!matchesStatus(torrent, filters.status)) return false
    if (filters.category !== null && torrent.category !== filters.category) return false
    if (filters.tag !== null && !tagsOf(torrent).includes(filters.tag)) return false
    if (query && !torrent.name.toLowerCase().includes(query)) return false
    return true
  })
}

/**
 * Counts per status, for the sidebar.
 *
 * Computed in one pass over the list rather than by running the filter seven
 * times, because this runs on every poll.
 */
export function statusCounts(torrents: readonly Torrent[]): Record<StatusFilter, number> {
  const counts: Record<StatusFilter, number> = {
    all: torrents.length,
    downloading: 0,
    seeding: 0,
    completed: 0,
    paused: 0,
    active: 0,
    stalled: 0,
  }

  for (const t of torrents) {
    const complete = isComplete(t.progress)
    const paused = isPaused(t.state)
    if (!complete && !paused) counts.downloading += 1
    if (isSeeding(t.state)) counts.seeding += 1
    if (complete) counts.completed += 1
    if (paused) counts.paused += 1
    if (isActive(t)) counts.active += 1
    if (isStalled(t.state)) counts.stalled += 1
  }

  return counts
}

/** Category names with a count, including only categories in use. */
export function categoryCounts(torrents: readonly Torrent[]): Map<string, number> {
  const counts = new Map<string, number>()
  for (const t of torrents) {
    if (!t.category) continue
    counts.set(t.category, (counts.get(t.category) ?? 0) + 1)
  }
  return counts
}

export function tagCounts(torrents: readonly Torrent[]): Map<string, number> {
  const counts = new Map<string, number>()
  for (const t of torrents) {
    for (const tag of tagsOf(t)) counts.set(tag, (counts.get(tag) ?? 0) + 1)
  }
  return counts
}
