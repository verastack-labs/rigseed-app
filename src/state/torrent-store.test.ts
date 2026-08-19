import { beforeEach, describe, expect, it } from 'vitest'

import { selectCounts, useTorrentStore } from '@/state/torrent-store'
import type { MainData, Torrent } from '@/types/qbittorrent'

const apply = (data: MainData) => useTorrentStore.getState().applyMainData(data)
const torrents = () => useTorrentStore.getState().torrents

function fullTorrent(overrides: Partial<Torrent> & { hash: string }): Partial<Torrent> {
  return {
    name: 'ubuntu.iso',
    size: 5_700_000_000,
    progress: 0.5,
    dlspeed: 1_000_000,
    upspeed: 100_000,
    state: 'downloading',
    category: '',
    tags: '',
    ratio: 0.4,
    ...overrides,
  }
}

beforeEach(() => useTorrentStore.getState().reset())

describe('applyMainData', () => {
  it('starts empty and unloaded', () => {
    expect(torrents()).toEqual({})
    expect(useTorrentStore.getState().loaded).toBe(false)
  })

  it('takes the first full update as a snapshot', () => {
    apply({
      rid: 1,
      full_update: true,
      torrents: { a: fullTorrent({ hash: 'a' }) },
    })
    expect(Object.keys(torrents())).toEqual(['a'])
    expect(useTorrentStore.getState().rid).toBe(1)
    expect(useTorrentStore.getState().loaded).toBe(true)
  })

  it('merges a partial torrent instead of replacing it', () => {
    apply({ rid: 1, full_update: true, torrents: { a: fullTorrent({ hash: 'a' }) } })
    // The daemon sends only what moved. Assigning this over the record would
    // blank the name, size and everything else.
    apply({ rid: 2, torrents: { a: { dlspeed: 2_000_000, progress: 0.75 } } })

    const a = torrents().a!
    expect(a.dlspeed).toBe(2_000_000)
    expect(a.progress).toBe(0.75)
    expect(a.name).toBe('ubuntu.iso')
    expect(a.size).toBe(5_700_000_000)
  })

  it('treats an absent torrents key as unchanged, not as empty', () => {
    apply({ rid: 1, full_update: true, torrents: { a: fullTorrent({ hash: 'a' }) } })
    apply({ rid: 2, server_state: { dl_info_speed: 42 } })

    expect(Object.keys(torrents())).toEqual(['a'])
    expect(useTorrentStore.getState().serverState.dl_info_speed).toBe(42)
  })

  it('adds a torrent that appears mid session', () => {
    apply({ rid: 1, full_update: true, torrents: { a: fullTorrent({ hash: 'a' }) } })
    apply({ rid: 2, torrents: { b: fullTorrent({ hash: 'b', name: 'debian.iso' }) } })

    expect(Object.keys(torrents()).sort()).toEqual(['a', 'b'])
    expect(torrents().b!.name).toBe('debian.iso')
  })

  it('removes torrents listed in torrents_removed', () => {
    apply({
      rid: 1,
      full_update: true,
      torrents: { a: fullTorrent({ hash: 'a' }), b: fullTorrent({ hash: 'b' }) },
    })
    apply({ rid: 2, torrents_removed: ['a'] })

    expect(Object.keys(torrents())).toEqual(['b'])
  })

  it('replaces rather than merges when full_update arrives mid session', () => {
    apply({
      rid: 1,
      full_update: true,
      torrents: { a: fullTorrent({ hash: 'a' }), b: fullTorrent({ hash: 'b' }) },
    })
    // The daemon could not diff, so it resent everything. Merging here would
    // keep 'a' forever even though it is gone.
    apply({ rid: 9, full_update: true, torrents: { c: fullTorrent({ hash: 'c' }) } })

    expect(Object.keys(torrents())).toEqual(['c'])
    expect(useTorrentStore.getState().rid).toBe(9)
  })

  it('never mutates the previous state object', () => {
    apply({ rid: 1, full_update: true, torrents: { a: fullTorrent({ hash: 'a' }) } })
    const before = torrents()
    const beforeA = before.a

    apply({ rid: 2, torrents: { a: { dlspeed: 5 } } })

    expect(torrents()).not.toBe(before)
    expect(torrents().a).not.toBe(beforeA)
    expect(beforeA!.dlspeed).toBe(1_000_000)
  })

  it('accumulates and removes tags', () => {
    apply({ rid: 1, full_update: true, tags: ['linux', 'iso'] })
    apply({ rid: 2, tags: ['archive'] })
    expect(useTorrentStore.getState().tags.sort()).toEqual(['archive', 'iso', 'linux'])

    apply({ rid: 3, tags_removed: ['iso'] })
    expect(useTorrentStore.getState().tags.sort()).toEqual(['archive', 'linux'])
  })

  it('does not duplicate a tag the daemon resends', () => {
    apply({ rid: 1, full_update: true, tags: ['linux'] })
    apply({ rid: 2, tags: ['linux'] })
    expect(useTorrentStore.getState().tags).toEqual(['linux'])
  })

  it('merges and removes categories', () => {
    apply({
      rid: 1,
      full_update: true,
      categories: { Films: { name: 'Films', savePath: '/films' } },
    })
    apply({ rid: 2, categories: { Music: { name: 'Music', savePath: '/music' } } })
    expect(Object.keys(useTorrentStore.getState().categories).sort()).toEqual(['Films', 'Music'])

    apply({ rid: 3, categories_removed: ['Films'] })
    expect(Object.keys(useTorrentStore.getState().categories)).toEqual(['Music'])
  })

  it('merges server state field by field', () => {
    apply({ rid: 1, full_update: true, server_state: { dl_info_speed: 10, dht_nodes: 300 } })
    apply({ rid: 2, server_state: { dl_info_speed: 20 } })

    const s = useTorrentStore.getState().serverState
    expect(s.dl_info_speed).toBe(20)
    expect(s.dht_nodes).toBe(300)
  })
})

describe('selectCounts', () => {
  it('buckets by state', () => {
    apply({
      rid: 1,
      full_update: true,
      torrents: {
        a: fullTorrent({ hash: 'a', state: 'downloading' }),
        b: fullTorrent({ hash: 'b', state: 'uploading' }),
        c: fullTorrent({ hash: 'c', state: 'pausedDL' }),
        d: fullTorrent({ hash: 'd', state: 'pausedUP' }),
        e: fullTorrent({ hash: 'e', state: 'stalledUP' }),
      },
    })
    expect(selectCounts(useTorrentStore.getState())).toEqual({
      all: 5,
      downloading: 1,
      seeding: 2,
      paused: 2,
    })
  })
})
