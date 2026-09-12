import type { SearchResult } from '@/types/qbittorrent'

/**
 * Ordering for search results.
 *
 * Results arrive from `search/results` grouped by the engine that answered,
 * because each plugin replies separately and the daemon appends. Nothing ever
 * reordered them, so the list was engine-major and only incidentally sorted
 * inside each block, while the header claimed "sorted by seeds". The fix is to
 * sort the whole list rather than to sort within a group.
 */

export type SortKey = 'name' | 'size' | 'seeds' | 'peers' | 'engine'
export type SortDirection = 'asc' | 'desc'

export interface Sort {
  key: SortKey
  direction: SortDirection
}

/**
 * Which way a column should go the first time it is clicked.
 *
 * Nobody wants the fewest seeds or the smallest file, and nobody wants names
 * from Z. A column that opens the wrong way costs two clicks every time and
 * teaches people the control is stupid.
 */
export const DEFAULT_DIRECTION: Record<SortKey, SortDirection> = {
  name: 'asc',
  size: 'desc',
  seeds: 'desc',
  peers: 'desc',
  engine: 'asc',
}

/** What rigseed opens with: the most seeded first, which is the useful hit. */
export const DEFAULT_SORT: Sort = { key: 'seeds', direction: 'desc' }

/**
 * Clicking a heading.
 *
 * A different column starts at that column's own sensible direction. The same
 * column reverses. This is the behaviour every table in every file manager
 * has, and matching it means nobody has to learn it.
 */
export function nextSort(current: Sort, key: SortKey): Sort {
  if (current.key !== key) return { key, direction: DEFAULT_DIRECTION[key] }
  return { key, direction: current.direction === 'asc' ? 'desc' : 'asc' }
}

const engineOf = (r: SearchResult) => r.engine ?? 'unknown'

/**
 * Compare on one key only.
 *
 * Text compares with `localeCompare` and numeric collation, so `Part 2` sorts
 * before `Part 10` rather than after it, which plain code-point order gets
 * wrong on exactly the names torrents have.
 */
function compareBy(key: SortKey, a: SearchResult, b: SearchResult): number {
  switch (key) {
    case 'name':
      return a.fileName.localeCompare(b.fileName, undefined, {
        numeric: true,
        sensitivity: 'base',
      })
    case 'size':
      return a.fileSize - b.fileSize
    case 'seeds':
      return a.nbSeeders - b.nbSeeders
    case 'peers':
      return a.nbLeechers - b.nbLeechers
    case 'engine':
      return engineOf(a).localeCompare(engineOf(b), undefined, { sensitivity: 'base' })
  }
}

/**
 * Sorted, and stable when the chosen key ties.
 *
 * Ties are common: whole pages of results sit at zero seeds, and engine names
 * repeat by definition. Without a tiebreak those rows reshuffle every time the
 * list re-renders during a live search, which is unreadable while results are
 * still arriving. Seeds then name settles it, and neither depends on arrival
 * order, so the same input always produces the same output.
 */
export function sortResults(
  results: readonly SearchResult[],
  { key, direction }: Sort,
): SearchResult[] {
  const sign = direction === 'asc' ? 1 : -1

  return [...results].sort((a, b) => {
    const primary = compareBy(key, a, b)
    if (primary !== 0) return primary * sign

    if (key !== 'seeds') {
      const bySeeds = b.nbSeeders - a.nbSeeders
      if (bySeeds !== 0) return bySeeds
    }

    return a.fileName.localeCompare(b.fileName, undefined, {
      numeric: true,
      sensitivity: 'base',
    })
  })
}

/** For the heading's title and for screen readers. */
export function sortLabel({ key, direction }: Sort): string {
  const which: Record<SortKey, string> = {
    name: 'name',
    size: 'size',
    seeds: 'seeds',
    peers: 'peers',
    engine: 'engine',
  }
  const way =
    key === 'name' || key === 'engine'
      ? direction === 'asc'
        ? 'A to Z'
        : 'Z to A'
      : direction === 'asc'
        ? 'lowest first'
        : 'highest first'
  return `${which[key]}, ${way}`
}
