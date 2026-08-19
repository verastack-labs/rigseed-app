import { describe, expect, it } from 'vitest'

import { createClient } from '@/services/client'
import { createMockTransport } from '@/services/mock-transport'
import { useTorrentStore } from '@/state/torrent-store'
import type { MainData } from '@/types/qbittorrent'

describe('mock transport', () => {
  it('answers rid 0 with a full update', async () => {
    const api = createClient(createMockTransport({ torrentCount: 4 }))
    const first = await api.sync.maindata(0)
    expect(first.full_update).toBe(true)
    expect(Object.keys(first.torrents ?? {})).toHaveLength(4)
    expect(first.rid).toBeGreaterThan(0)
  })

  it('answers later requests with a diff, not a snapshot', async () => {
    const api = createClient(createMockTransport({ torrentCount: 4 }))
    const first = await api.sync.maindata(0)
    const second = await api.sync.maindata(first.rid)

    expect(second.full_update).toBeUndefined()
    expect(second.rid).toBeGreaterThan(first.rid)
    // A diff carries changed fields only, never the whole torrent.
    const patch = Object.values(second.torrents ?? {})[0]!
    expect(patch).not.toHaveProperty('name')
    expect(patch).not.toHaveProperty('size')
  })

  it('drives the store to a consistent state across many polls', async () => {
    useTorrentStore.getState().reset()
    const api = createClient(createMockTransport({ torrentCount: 6, seed: 3 }))

    let rid = 0
    for (let i = 0; i < 30; i += 1) {
      const data: MainData = await api.sync.maindata(rid)
      useTorrentStore.getState().applyMainData(data)
      rid = data.rid
    }

    const torrents = Object.values(useTorrentStore.getState().torrents)
    expect(torrents).toHaveLength(6)
    for (const t of torrents) {
      // If the merge ever assigned instead of merging, these would be undefined.
      expect(t.name).toBeTruthy()
      expect(t.size).toBeGreaterThan(0)
      expect(t.progress).toBeGreaterThanOrEqual(0)
      expect(t.progress).toBeLessThanOrEqual(1)
    }
  })

  it('completes torrents over time rather than leaving them static', async () => {
    useTorrentStore.getState().reset()
    const api = createClient(createMockTransport({ torrentCount: 6, seed: 5 }))
    let rid = 0
    const first: MainData = await api.sync.maindata(rid)
    useTorrentStore.getState().applyMainData(first)
    const startProgress = Object.values(useTorrentStore.getState().torrents).reduce(
      (a, t) => a + t.progress,
      0,
    )

    for (let i = 0; i < 60; i += 1) {
      const data: MainData = await api.sync.maindata(rid)
      useTorrentStore.getState().applyMainData(data)
      rid = data.rid
    }
    const endProgress = Object.values(useTorrentStore.getState().torrents).reduce(
      (a, t) => a + t.progress,
      0,
    )

    expect(endProgress).toBeGreaterThan(startProgress)
  })

  it('pausing a torrent is reflected in the next snapshot', async () => {
    const transport = createMockTransport({ torrentCount: 3 })
    const api = createClient(transport)
    const first = await api.sync.maindata(0)
    const hash = Object.keys(first.torrents ?? {})[0]!

    await api.torrents.pause([hash])
    const info = await api.torrents.info()
    expect(info.find((t) => t.hash === hash)!.state).toMatch(/^paused/)
  })

  it('deleting removes the torrent', async () => {
    const api = createClient(createMockTransport({ torrentCount: 3 }))
    const first = await api.sync.maindata(0)
    const hash = Object.keys(first.torrents ?? {})[0]!

    await api.torrents.delete([hash], false)
    const info = await api.torrents.info()
    expect(info.map((t) => t.hash)).not.toContain(hash)
  })

  it('reports the daemon version the footer renders', async () => {
    const api = createClient(createMockTransport())
    expect(await api.app.version()).toBe('v5.2.3')
    expect(await api.app.webapiVersion()).toBe('2.11.2')
  })
})
