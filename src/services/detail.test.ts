import { describe, expect, it } from 'vitest'

import { createClient } from '@/services/client'
import { PRIORITY } from '@/lib/priority'
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
    const before = (await client.torrents.info()).find((t) => t.hash === FIRST)!.seq_dl

    await client.torrents.toggleSequentialDownload([FIRST])
    const after = (await client.torrents.info()).find((t) => t.hash === FIRST)!.seq_dl
    expect(after).toBe(!before)

    await client.torrents.toggleSequentialDownload([FIRST])
    expect((await client.torrents.info()).find((t) => t.hash === FIRST)!.seq_dl).toBe(before)
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

describe('the write-backs the Files, Trackers and Peers tabs make', () => {
  // These four were accepted and dropped until the screen was driven by hand
  // against the mock. Every unit test passed the whole time, because each one
  // checked that the request was well formed and none of them checked that
  // anything happened. What follows is the loop, not the request.

  it('remembers a file priority', async () => {
    const client = api()
    await client.torrents.filePrio(FIRST, [2, 3], PRIORITY.max)

    const files = await client.torrents.files(FIRST)
    expect(files.map((f) => f.priority)).toEqual([7, 1, 7, 7, 1])
  })

  it('declines a priority the daemon would reject', async () => {
    // qBittorrent answers 400 for anything outside its four. Rounding to
    // normal here would make the mock more forgiving than the thing it stands
    // in for, which is the one way a mock is allowed to be wrong.
    const client = api()
    const before = (await client.torrents.files(FIRST)).map((f) => f.priority)
    await client.torrents.filePrio(FIRST, [0], 4)
    expect((await client.torrents.files(FIRST)).map((f) => f.priority)).toEqual(before)
  })

  it('adds a tracker as not-yet-contacted rather than as working', async () => {
    const client = api()
    await client.torrents.addTrackers(FIRST, ['https://tracker.example.test/announce'])

    const added = (await client.torrents.trackers(FIRST)).find(
      (t) => t.url === 'https://tracker.example.test/announce',
    )
    expect(added).toBeDefined()
    expect(added!.status).toBe(1)
  })

  it('removes a tracker and leaves the rest alone', async () => {
    const client = api()
    const before = await client.torrents.trackers(FIRST)
    await client.torrents.removeTrackers(FIRST, ['https://torrent.ubuntu.com/announce'])

    const after = await client.torrents.trackers(FIRST)
    expect(after).toHaveLength(before.length - 1)
    expect(after.some((t) => t.url === 'https://torrent.ubuntu.com/announce')).toBe(false)
  })

  it('keeps one torrent’s trackers out of another’s', async () => {
    // They were a shared literal before, so a removal appeared to work and
    // then reappeared, or worse, took a row off a torrent nobody touched.
    const client = api()
    await client.torrents.removeTrackers(FIRST, ['https://torrent.ubuntu.com/announce'])

    const other = await client.torrents.trackers('hash01')
    expect(other.some((t) => t.url === 'https://torrent.ubuntu.com/announce')).toBe(true)
  })

  it('answers reads with copies, so a caller cannot edit the daemon', async () => {
    // Found by a test that read the tracker list, removed a tracker, and then
    // compared the two lengths: both readings were the same array, so the
    // "before" had already shrunk. A real transport parses fresh JSON and
    // shares nothing, and the mock has to be wrong in the same direction.
    const client = api()
    const first = await client.torrents.trackers(FIRST)
    const before = first.length

    await client.torrents.removeTrackers(FIRST, ['https://torrent.ubuntu.com/announce'])
    expect(first).toHaveLength(before)
    expect(await client.torrents.trackers(FIRST)).toHaveLength(before - 1)
  })

  it('bans a peer everywhere, not just where the row was clicked', async () => {
    // app/banPeers is session-wide. A mock that scoped it per torrent would
    // teach the wrong thing about what the button does.
    const client = api()
    await client.sync.torrentPeers(FIRST, 0)
    await client.sync.torrentPeers('hash01', 0)

    const victim = Object.keys((await client.sync.torrentPeers(FIRST, 0)).peers ?? {})[0]!
    await client.app.banPeers([victim])

    expect((await client.sync.torrentPeers(FIRST, 0)).peers).not.toHaveProperty(victim)
  })
})

describe('what the sync loop is told about a write', () => {
  // Every screen reads its live numbers out of the store, and the store is
  // filled by sync/maindata rather than by the endpoint that did the writing.
  // A mock that stores a change without putting it in the next diff makes a
  // control look dead: the write lands, the daemon has the new value, and the
  // switch on screen never moves.
  //
  // This is how the earlier verification of the rate limit was fooled. The
  // field showed the new number across a poll because it was holding its own
  // draft, not because the store had heard anything.

  const drain = async (client: ReturnType<typeof api>) => {
    await client.sync.maindata(0)
    return client.sync.maindata(1)
  }

  it('puts a toggled sequential download in the next diff', async () => {
    const client = api()
    await drain(client)

    await client.torrents.toggleSequentialDownload([FIRST])
    const next = await client.sync.maindata(2)
    expect(next.torrents?.[FIRST]?.seq_dl).toBe(true)
  })

  it('puts a first and last piece toggle in the next diff', async () => {
    const client = api()
    await drain(client)

    await client.torrents.toggleFirstLastPiecePrio([FIRST])
    expect((await client.sync.maindata(2)).torrents?.[FIRST]?.f_l_piece_prio).toBe(true)
  })

  it('puts a new rate limit in the next diff', async () => {
    const client = api()
    await drain(client)

    await client.torrents.setDownloadLimit([FIRST], 512_000)
    expect((await client.sync.maindata(2)).torrents?.[FIRST]?.dl_limit).toBe(512_000)
  })

  it('leaves torrents nobody wrote to out of it', async () => {
    // The diff carries speeds for everything, so the check is that the other
    // torrent did not get a full record dumped into it.
    const client = api()
    await drain(client)

    await client.torrents.setDownloadLimit([FIRST], 512_000)
    const next = await client.sync.maindata(2)
    expect(next.torrents?.['hash01']).not.toHaveProperty('dl_limit')
  })
})
