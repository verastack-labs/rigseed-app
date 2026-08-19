import { describe, expect, it } from 'vitest'

import { createClient } from '@/services/client'
import { createMockTransport } from '@/services/mock-transport'

/** The first torrent's hash, which the fixture names deterministically. */
const FIRST = 'hash00'

const api = () => createClient(createMockTransport({ torrentCount: 4 }))

describe('torrents/properties', () => {
  it('agrees with the list entry about the same torrent', async () => {
    const client = api()
    const [torrent] = await client.torrents.info()
    const props = await client.torrents.properties(torrent!.hash)

    // The two endpoints name the same concepts differently: dlspeed here,
    // dl_speed there. Both names are kept as the daemon sends them, so this is
    // the test that they still describe one torrent and not two.
    expect(props.total_size).toBe(torrent!.size)
    expect(props.dl_speed).toBe(torrent!.dlspeed)
    expect(props.share_ratio).toBe(torrent!.ratio)
    expect(props.save_path).toBe(torrent!.save_path)
  })

  it('reports piece counts consistent with progress', async () => {
    const props = await api().torrents.properties(FIRST)
    expect(props.pieces_num).toBeGreaterThan(0)
    expect(props.pieces_have).toBeLessThanOrEqual(props.pieces_num)
  })
})

describe('torrents/files', () => {
  it('returns entries whose sizes account for the torrent', async () => {
    const client = api()
    const [torrent] = await client.torrents.info()
    const files = await client.torrents.files(torrent!.hash)

    expect(files.length).toBeGreaterThan(1)
    const total = files.reduce((sum, f) => sum + f.size, 0)
    // Rounded shares, so within a few bytes rather than exact.
    expect(Math.abs(total - torrent!.size)).toBeLessThan(10)
  })

  it('includes a skipped file, so the dimmed row has something to render', async () => {
    const files = await api().torrents.files(FIRST)
    expect(files.some((f) => f.priority === 0)).toBe(true)
    expect(files.some((f) => f.priority === 7)).toBe(true)
  })

  it('indexes match position, which is what filePrio takes', async () => {
    const files = await api().torrents.files(FIRST)
    expect(files.map((f) => f.index)).toEqual(files.map((_, i) => i))
  })
})

describe('torrents/trackers', () => {
  it('includes the synthetic DHT, PeX and LSD rows', async () => {
    // qBittorrent always reports these alongside real trackers, and the stock
    // client shows them. Hiding them would make a user comparing the two think
    // rigseed had lost a row.
    const trackers = await api().torrents.trackers(FIRST)
    const urls = trackers.map((t) => t.url)
    expect(urls).toContain('** [DHT] **')
    expect(urls).toContain('** [PeX] **')
    expect(urls).toContain('** [LSD] **')
  })

  it('includes a working, an updating and an errored tracker', async () => {
    const trackers = await api().torrents.trackers(FIRST)
    const statuses = new Set(trackers.map((t) => t.status))
    expect(statuses.has(2)).toBe(true)
    expect(statuses.has(3)).toBe(true)
    expect(statuses.has(4)).toBe(true)
    expect(trackers.find((t) => t.status === 4)?.msg).toBeTruthy()
  })
})

describe('sync/torrentPeers', () => {
  it('answers rid 0 with a full update and later requests with a diff', async () => {
    const client = api()
    const first = await client.sync.torrentPeers(FIRST, 0)

    expect(first.full_update).toBe(true)
    expect(Object.keys(first.peers ?? {}).length).toBeGreaterThan(0)

    const second = await client.sync.torrentPeers(FIRST, first.rid)
    expect(second.full_update).toBeUndefined()
    expect(second.rid).toBeGreaterThan(first.rid)

    // A diff carries what moved, never the whole peer.
    const patch = Object.values(second.peers ?? {})[0]!
    expect(patch).not.toHaveProperty('client')
    expect(patch).toHaveProperty('progress')
  })

  it('keys peers by address and port, not by address', async () => {
    // One address can hold several connections. Merging by ip would make the
    // count in the tab header disagree with the rows under it.
    const first = await api().sync.torrentPeers(FIRST, 0)
    for (const key of Object.keys(first.peers ?? {})) {
      expect(key).toMatch(/^[\d.]+:\d+$/)
    }
  })

  it('answers an unknown hash with no peers rather than throwing', async () => {
    const result = await api().sync.torrentPeers('nope', 0)
    expect(result.peers).toEqual({})
  })
})

describe('the write-backs the Speed tab makes', () => {
  it('remembers a rate limit rather than reporting success and reverting', async () => {
    const client = api()
    await client.torrents.setDownloadLimit([FIRST], 500_000)
    await client.torrents.setUploadLimit([FIRST], 250_000)

    const props = await client.torrents.properties(FIRST)
    expect(props.dl_limit).toBe(500_000)
    expect(props.up_limit).toBe(250_000)
  })

  it('takes -1 back as unlimited', async () => {
    const client = api()
    await client.torrents.setDownloadLimit([FIRST], 500_000)
    await client.torrents.setDownloadLimit([FIRST], -1)
    expect((await client.torrents.properties(FIRST)).dl_limit).toBe(-1)
  })

  it('flips sequential download, since the API offers no way to set it', async () => {
    const client = api()
    const before = (await client.torrents.info()).find((t) => t.hash === FIRST)!.sequential_download

    await client.torrents.toggleSequentialDownload([FIRST])
    const after = (await client.torrents.info()).find((t) => t.hash === FIRST)!.sequential_download
    expect(after).toBe(!before)

    await client.torrents.toggleSequentialDownload([FIRST])
    expect((await client.torrents.info()).find((t) => t.hash === FIRST)!.sequential_download).toBe(
      before,
    )
  })

  it('sets automatic management rather than toggling it', async () => {
    // The API is not uniform about this, and the difference matters: a setter
    // is idempotent where a toggle is not.
    const client = api()
    await client.torrents.setAutoManagement([FIRST], true)
    await client.torrents.setAutoManagement([FIRST], true)
    expect((await client.torrents.info()).find((t) => t.hash === FIRST)!.auto_tmm).toBe(true)
  })
})
