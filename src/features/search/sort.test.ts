import { describe, expect, it } from 'vitest'

import { DEFAULT_SORT, nextSort, sortResults, type Sort } from '@/features/search/sort'
import type { SearchResult } from '@/types/qbittorrent'

function hit(partial: Partial<SearchResult> & { fileName: string }): SearchResult {
  return {
    fileName: partial.fileName,
    fileUrl: partial.fileUrl ?? `magnet:?xt=${partial.fileName}`,
    fileSize: partial.fileSize ?? 0,
    nbSeeders: partial.nbSeeders ?? 0,
    nbLeechers: partial.nbLeechers ?? 0,
    siteUrl: partial.siteUrl ?? 'https://example.test',
    descrLink: partial.descrLink ?? '',
    engine: partial.engine,
  } as SearchResult
}

describe('sortResults', () => {
  // The bug this module exists for. The daemon answers per engine and appends,
  // so the list arrives engine-major with each block ordered on its own.
  it('sorts across every engine rather than within each one', () => {
    const arrived = [
      hit({ fileName: 'a', engine: 'alpha', nbSeeders: 10 }),
      hit({ fileName: 'b', engine: 'alpha', nbSeeders: 2 }),
      hit({ fileName: 'c', engine: 'beta', nbSeeders: 90 }),
      hit({ fileName: 'd', engine: 'beta', nbSeeders: 5 }),
    ]

    const sorted = sortResults(arrived, { key: 'seeds', direction: 'desc' })

    expect(sorted.map((r) => r.nbSeeders)).toEqual([90, 10, 5, 2])
    // The top hit came from the engine that answered second.
    expect(sorted[0]?.engine).toBe('beta')
  })

  it('reverses on direction', () => {
    const list = [
      hit({ fileName: 'a', nbSeeders: 1 }),
      hit({ fileName: 'b', nbSeeders: 3 }),
      hit({ fileName: 'c', nbSeeders: 2 }),
    ]

    expect(sortResults(list, { key: 'seeds', direction: 'asc' }).map((r) => r.nbSeeders)).toEqual([
      1, 2, 3,
    ])
  })

  it('orders names the way a person reads numbers in them', () => {
    // Code-point order puts "Part 10" before "Part 2", which is wrong on
    // exactly the names torrents have.
    const list = [
      hit({ fileName: 'Part 10' }),
      hit({ fileName: 'Part 2' }),
      hit({ fileName: 'Part 1' }),
    ]

    expect(sortResults(list, { key: 'name', direction: 'asc' }).map((r) => r.fileName)).toEqual([
      'Part 1',
      'Part 2',
      'Part 10',
    ])
  })

  it('does not reshuffle rows that tie', () => {
    // Whole pages of results sit at zero seeds. Without a tiebreak they move
    // around on every re-render while a live search is still filling in.
    const list = [
      hit({ fileName: 'zebra', nbSeeders: 0 }),
      hit({ fileName: 'apple', nbSeeders: 0 }),
      hit({ fileName: 'mango', nbSeeders: 0 }),
    ]

    const once = sortResults(list, { key: 'seeds', direction: 'desc' })
    const twice = sortResults([...list].reverse(), { key: 'seeds', direction: 'desc' })

    expect(once.map((r) => r.fileName)).toEqual(twice.map((r) => r.fileName))
  })

  it('leaves the caller list alone', () => {
    const list = [hit({ fileName: 'b', nbSeeders: 1 }), hit({ fileName: 'a', nbSeeders: 9 })]
    const before = list.map((r) => r.fileName)

    sortResults(list, { key: 'seeds', direction: 'desc' })

    expect(list.map((r) => r.fileName)).toEqual(before)
  })

  it('treats a result with no engine as one named unknown', () => {
    const list = [hit({ fileName: 'a', engine: 'zeta' }), hit({ fileName: 'b' })]

    expect(sortResults(list, { key: 'engine', direction: 'asc' }).map((r) => r.fileName)).toEqual([
      'b',
      'a',
    ])
  })
})

describe('nextSort', () => {
  it('opens a new column the way that column should open', () => {
    const from: Sort = { key: 'name', direction: 'asc' }

    // Nobody wants the fewest seeds or the smallest file first.
    expect(nextSort(from, 'seeds')).toEqual({ key: 'seeds', direction: 'desc' })
    expect(nextSort(from, 'size')).toEqual({ key: 'size', direction: 'desc' })
    expect(nextSort(from, 'engine')).toEqual({ key: 'engine', direction: 'asc' })
  })

  it('reverses when the same column is clicked again', () => {
    const first = nextSort({ key: 'name', direction: 'asc' }, 'seeds')
    expect(first.direction).toBe('desc')

    const second = nextSort(first, 'seeds')
    expect(second).toEqual({ key: 'seeds', direction: 'asc' })

    expect(nextSort(second, 'seeds').direction).toBe('desc')
  })
})

describe('DEFAULT_SORT', () => {
  it('opens on the most seeded, which is the useful hit', () => {
    expect(DEFAULT_SORT).toEqual({ key: 'seeds', direction: 'desc' })
  })
})
