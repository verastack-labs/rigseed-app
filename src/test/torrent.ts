import type { Torrent } from '@/types/qbittorrent'

/**
 * One torrent, overridable per test.
 *
 * Four test files each carried their own full `Torrent` literal, which meant
 * every field the API turned out to have was a four-file change and an
 * invitation to give the same field a different value in each. Adding
 * `seq_dl`, `f_l_piece_prio` and the four derived fields is what made that
 * cost visible.
 *
 * Values are deliberately unround, so a test asserting on a formatted string
 * cannot pass by accident against a placeholder like `0` or `100`.
 */
export function makeTorrent(overrides: Partial<Torrent> = {}): Torrent {
  const size = 5_700_000_000
  const progress = 0.64

  return {
    hash: 'a1b2c3',
    name: 'ubuntu.iso',
    size,
    // Equal by default: the ordinary torrent has nothing deselected, and a
    // test that wants the other case overrides it.
    total_size: size,
    trackers_count: 3,
    progress,
    dlspeed: 13_000_000,
    upspeed: 1_800_000,
    priority: 1,
    num_seeds: 34,
    num_leechs: 7,
    num_complete: 91,
    num_incomplete: 23,
    ratio: 1.42,
    eta: 252,
    state: 'downloading',
    category: 'Linux',
    tags: 'iso',
    added_on: 1_770_000_000,
    completion_on: 0,
    save_path: '/downloads',
    dl_limit: -1,
    up_limit: -1,
    downloaded: 3_648_000_000,
    // Deliberately not a round fraction of the all-time figures, so a test
    // reading the wrong field fails on the number rather than passing.
    downloaded_session: 402_000_000,
    uploaded_session: 91_000_000,
    uploaded: 1_000_000_000,
    seeding_time: 0,
    auto_tmm: false,
    seq_dl: false,
    f_l_piece_prio: false,
    super_seeding: false,
    completed: Math.round(size * progress),
    amount_left: size - Math.round(size * progress),
    magnet_uri: 'magnet:?xt=urn:btih:a1b2c3&dn=ubuntu.iso',
    tracker: 'https://torrent.ubuntu.com/announce',
    content_path: '/downloads/ubuntu.iso',
    ...overrides,
  }
}
