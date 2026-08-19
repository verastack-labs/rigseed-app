import { describe, expect, it } from 'vitest'

import {
  categoryCounts,
  filterTorrents,
  statusCounts,
  tagCounts,
  tagsOf,
} from '@/features/transfers/filter'
import type { Torrent, TorrentState } from '@/types/qbittorrent'

function t(over: Partial<Torrent> & { hash: string }): Torrent {
  return {
    name: 'ubuntu.iso',
    size: 1000,
    progress: 0.5,
    dlspeed: 0,
    upspeed: 0,
    priority: 1,
    num_seeds: 1,
    num_leechs: 1,
    ratio: 1,
    eta: 100,
    state: 'downloading' as TorrentState,
    category: '',
    tags: '',
    added_on: 0,
    completion_on: 0,
    save_path: '/d',
    dl_limit: -1,
    up_limit: -1,
    downloaded: 0,
    uploaded: 0,
    seeding_time: 0,
    auto_tmm: false,
    sequential_download: false,
    super_seeding: false,
    ...over,
  }
}

const base = { status: 'all' as const, category: null, tag: null, query: '' }

describe('tagsOf', () => {
  it('returns nothing for an untagged torrent', () => {
    // "".split(",") is [""], which would make every torrent look tagged.
    expect(tagsOf({ tags: '' })).toEqual([])
  })

  it('splits and trims', () => {
    expect(tagsOf({ tags: 'iso, verified ,linux' })).toEqual(['iso', 'verified', 'linux'])
  })
})

describe('filterTorrents', () => {
  const list = [
    t({
      hash: 'a',
      name: 'ubuntu.iso',
      state: 'downloading',
      progress: 0.4,
      dlspeed: 100,
      category: 'Linux',
      tags: 'iso',
    }),
    t({
      hash: 'b',
      name: 'debian.iso',
      state: 'uploading',
      progress: 1,
      upspeed: 50,
      category: 'Linux',
      tags: 'iso,verified',
    }),
    t({ hash: 'c', name: 'archive.zip', state: 'pausedDL', progress: 0.2, category: 'Archives' }),
    t({ hash: 'd', name: 'movie.mkv', state: 'stalledDL', progress: 0.7 }),
  ]
  const hashes = (f: Parameters<typeof filterTorrents>[1]) =>
    filterTorrents(list, f).map((x) => x.hash)

  it('returns everything by default', () => {
    expect(hashes(base)).toEqual(['a', 'b', 'c', 'd'])
  })

  it('excludes complete and paused from downloading', () => {
    expect(hashes({ ...base, status: 'downloading' })).toEqual(['a', 'd'])
  })

  it('treats active as moving bytes, not merely unpaused', () => {
    // 'd' is stalled: unpaused but transferring nothing.
    expect(hashes({ ...base, status: 'active' })).toEqual(['a', 'b'])
  })

  it('filters by completion rather than by state', () => {
    expect(hashes({ ...base, status: 'completed' })).toEqual(['b'])
  })

  it('filters by category and by tag', () => {
    expect(hashes({ ...base, category: 'Linux' })).toEqual(['a', 'b'])
    expect(hashes({ ...base, tag: 'verified' })).toEqual(['b'])
  })

  it('matches the query case insensitively', () => {
    expect(hashes({ ...base, query: 'UBUNTU' })).toEqual(['a'])
  })

  it('combines filters with AND', () => {
    expect(hashes({ ...base, category: 'Linux', query: 'debian' })).toEqual(['b'])
    expect(hashes({ ...base, category: 'Archives', tag: 'iso' })).toEqual([])
  })

  it('ignores a whitespace-only query', () => {
    expect(hashes({ ...base, query: '   ' })).toHaveLength(4)
  })
})

describe('counts', () => {
  const list = [
    t({
      hash: 'a',
      state: 'downloading',
      progress: 0.4,
      dlspeed: 10,
      category: 'Linux',
      tags: 'iso',
    }),
    t({
      hash: 'b',
      state: 'uploading',
      progress: 1,
      upspeed: 5,
      category: 'Linux',
      tags: 'iso,verified',
    }),
    t({ hash: 'c', state: 'pausedUP', progress: 1, category: 'Archives' }),
    t({ hash: 'd', state: 'stalledDL', progress: 0.7 }),
  ]

  it('counts every status in one pass', () => {
    expect(statusCounts(list)).toEqual({
      all: 4,
      downloading: 2,
      seeding: 1,
      completed: 2,
      paused: 1,
      active: 2,
      stalled: 1,
    })
  })

  it('counts only categories in use', () => {
    expect([...categoryCounts(list)]).toEqual([
      ['Linux', 2],
      ['Archives', 1],
    ])
  })

  it('counts tags across torrents', () => {
    expect([...tagCounts(list)].sort()).toEqual([
      ['iso', 2],
      ['verified', 1],
    ])
  })
})
