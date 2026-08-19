import { describe, expect, it } from 'vitest'

import { createClient } from '@/services/client'
import { createMockTransport } from '@/services/mock-transport'

/**
 * The field names, checked against the API rather than against ourselves.
 *
 * Two bugs got through every other test in this repo because the mock was
 * written from our types instead of from qBittorrent's response, so the mock
 * and the code agreed with each other and neither agreed with the daemon:
 *
 * - `sequential_download` is what `torrents/properties` and the add form call
 *   it. `torrents/info` and `sync/maindata` call it `seq_dl`. Reading the long
 *   name off a list entry gets `undefined`, not an error, so the switch simply
 *   sat off forever and nothing failed.
 * - `f_l_piece_prio` is reported and we had a comment asserting it was not, so
 *   the first/last switch displayed the sequential download value instead.
 *
 * A test that renders a component cannot catch either, because the fixture it
 * renders is built from the same wrong type. This one asserts the names
 * literally, so the fixture has no say.
 *
 * Source: qBittorrent WebUI API v2 (5.0), `torrents/info` and `torrents/files`.
 */
const TORRENT_FIELDS = [
  'added_on',
  'amount_left',
  'auto_tmm',
  'category',
  'completed',
  'completion_on',
  'dl_limit',
  'dlspeed',
  'downloaded',
  'eta',
  'f_l_piece_prio',
  'hash',
  'magnet_uri',
  'name',
  'num_complete',
  'num_incomplete',
  'num_leechs',
  'num_seeds',
  'priority',
  'progress',
  'ratio',
  'save_path',
  'seeding_time',
  'seq_dl',
  'size',
  'state',
  'super_seeding',
  'tags',
  'tracker',
  'up_limit',
  'uploaded',
  'upspeed',
] as const

const FILE_FIELDS = ['index', 'name', 'size', 'progress', 'priority', 'piece_range'] as const

const TRACKER_FIELDS = ['url', 'status', 'num_peers', 'msg'] as const

const api = () => createClient(createMockTransport({ torrentCount: 2 }))

describe('the names we read off a torrent', () => {
  it('are the ones torrents/info uses', async () => {
    const [torrent] = await api().torrents.info()
    for (const field of TORRENT_FIELDS) {
      expect(torrent, `torrents/info is missing ${field}`).toHaveProperty(field)
    }
  })

  it('never spells sequential download the properties way', async () => {
    // The two endpoints genuinely disagree, which is the whole trap. A list
    // entry carrying the long name means somebody copied it across.
    const [torrent] = await api().torrents.info()
    expect(torrent).not.toHaveProperty('sequential_download')
  })

  it('reaches sync/maindata with the same names', async () => {
    // The store is filled from here, not from torrents/info, so a name that
    // is right in one and wrong in the other is still a broken screen.
    const data = await api().sync.maindata(0)
    const first = Object.values(data.torrents ?? {})[0]
    expect(first).toBeDefined()
    for (const field of TORRENT_FIELDS) {
      expect(first, `sync/maindata is missing ${field}`).toHaveProperty(field)
    }
  })
})

describe('the names we read off files and trackers', () => {
  it('are the ones torrents/files uses', async () => {
    const [file] = await api().torrents.files('hash00')
    for (const field of FILE_FIELDS) {
      expect(file, `torrents/files is missing ${field}`).toHaveProperty(field)
    }
  })

  it('are the ones torrents/trackers uses', async () => {
    const [tracker] = await api().torrents.trackers('hash00')
    for (const field of TRACKER_FIELDS) {
      expect(tracker, `torrents/trackers is missing ${field}`).toHaveProperty(field)
    }
  })
})
