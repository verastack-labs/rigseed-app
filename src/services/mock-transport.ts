import { PRIORITY, type Priority } from '@/lib/priority'
import { ApiError, type Transport } from '@/services/transport'
import type {
  Category,
  LogEntry,
  PeerBan,
  Preferences,
  RssRule,
  SearchPlugin,
  SearchResult,
  MainData,
  Peer,
  Torrent,
  TorrentFile,
  TorrentProperties,
  TorrentState,
  Tracker,
} from '@/types/qbittorrent'

/**
 * A stand-in daemon.
 *
 * It exists so every screen can be built and reviewed before the sidecar does,
 * and so the diff merging in the torrent store is exercised against controlled
 * data rather than a live daemon that cannot be asked to reproduce a case.
 *
 * It behaves like the real thing in the ways that matter: the first
 * `sync/maindata` is a full update, later ones are diffs carrying only the
 * fields that moved, the `rid` advances, and torrents complete and get removed
 * while the caller is watching.
 */

const NAMES = [
  'ubuntu-24.04.2-desktop-amd64.iso',
  'debian-12.9.0-amd64-netinst.iso',
  'archlinux-2026.08.01-x86_64.iso',
  'fedora-workstation-41-x86_64.iso',
  'NASA-Apollo-17-Onboard-Photography',
  'Blender-Open-Movie-Collection-2160p',
  'The-Internet-Archive-Pulp-Magazines',
  'openSUSE-Leap-15.6-DVD-x86_64.iso',
]

/**
 * Preference defaults, copied from a running qBittorrent 5.2.3.
 *
 * Values rather than invented ones, so a Settings screen driven by the mock
 * shows the same numbers a real daemon would and the shapes cannot drift.
 */
const PREFERENCES: Preferences = {
  save_path: '/downloads',
  temp_path_enabled: false,
  temp_path: '/downloads/temp',
  incomplete_files_ext: false,
  preallocate_all: false,
  auto_tmm_enabled: false,
  add_stopped_enabled: false,
  queueing_enabled: true,
  max_active_downloads: 3,
  max_active_torrents: 5,
  max_active_uploads: 3,

  listen_port: 2791,
  upnp: true,
  max_connec: 500,
  max_connec_per_torrent: 100,
  max_uploads: 20,
  max_uploads_per_torrent: 4,
  proxy_type: 'None',
  proxy_ip: '',
  proxy_port: 8080,
  proxy_peer_connections: false,

  dl_limit: 0,
  up_limit: 0,
  alt_dl_limit: 10_240,
  alt_up_limit: 10_240,
  limit_utp_rate: true,
  limit_tcp_overhead: false,
  scheduler_enabled: false,
  scheduler_days: 0,
  schedule_from_hour: 8,
  schedule_from_min: 0,
  schedule_to_hour: 20,
  schedule_to_min: 0,

  dht: true,
  pex: true,
  lsd: true,
  encryption: 0,
  anonymous_mode: false,
  max_ratio_enabled: false,
  max_ratio: -1,

  rss_processing_enabled: true,
  rss_auto_downloading_enabled: true,
  rss_refresh_interval: 30,

  web_ui_port: 8080,
  web_ui_csrf_protection_enabled: true,
  web_ui_clickjacking_protection_enabled: true,
  web_ui_host_header_validation_enabled: true,

  // Empty, which is qBittorrent's default and means `python3` off PATH.
  python_executable_path: '',
}

/**
 * A daemon's first minute, shaped like a real one.
 *
 * Types are the bitmask the API sends: 1 normal, 2 info, 4 warning, 8
 * critical. Written out rather than generated so the screen has something with
 * every level in it to render against.
 */
const LOG: LogEntry[] = [
  {
    id: 0,
    message: 'qBittorrent v5.2.3 started. Process ID: 4120',
    timestamp: 1_787_249_189,
    type: 1,
  },
  { id: 1, message: 'Using config directory: /config', timestamp: 1_787_249_189, type: 1 },
  { id: 2, message: 'Trying to listen on: 0.0.0.0:2791', timestamp: 1_787_249_190, type: 2 },
  { id: 3, message: 'Peer ID: -qB5230-', timestamp: 1_787_249_190, type: 2 },
  { id: 4, message: 'HTTP User-Agent: qBittorrent/5.2.3', timestamp: 1_787_249_190, type: 2 },
  { id: 5, message: 'DHT support [ON]', timestamp: 1_787_249_191, type: 2 },
  { id: 6, message: 'Local Peer Discovery support [ON]', timestamp: 1_787_249_191, type: 2 },
  { id: 7, message: 'Encryption support [FORCED]', timestamp: 1_787_249_191, type: 2 },
  {
    id: 8,
    message: 'Web UI: Now listening on IP: 127.0.0.1, port: 8080',
    timestamp: 1_787_249_192,
    type: 1,
  },
  {
    id: 9,
    message:
      'UPnP/NAT-PMP port mapping failed. Message: "could not map port using UPnP: no router found"',
    timestamp: 1_787_249_347,
    type: 4,
  },
  { id: 10, message: 'Detected external IP: 203.0.113.9', timestamp: 1_787_249_360, type: 2 },
  {
    id: 11,
    message: 'Could not write to file "/downloads/ubuntu.iso": no space left on device',
    timestamp: 1_787_249_400,
    type: 8,
  },
  {
    id: 12,
    message: 'Torrent "ubuntu-24.04.2-desktop-amd64.iso" resumed',
    timestamp: 1_787_249_420,
    type: 1,
  },
]

const BANS: PeerBan[] = [
  { id: 0, ip: '198.51.100.24', timestamp: 1_787_249_281, blocked: true, reason: 'IP filter' },
  { id: 1, ip: '203.0.113.77', timestamp: 1_787_249_290, blocked: true, reason: 'banned by user' },
  { id: 2, ip: '2001:db8::9f2', timestamp: 1_787_249_301, blocked: true, reason: 'IP filter' },
]

/**
 * Two plugins and a handful of hits.
 *
 * Enough to exercise the engine chips, the per-engine counts and the swarm
 * bar. `siteUrl` matches a plugin `url` on purpose: that match is the only
 * way a result can be attributed to an engine, since the API does not say.
 */
const PLUGINS: SearchPlugin[] = [
  {
    name: 'linuxtracker',
    fullName: 'LinuxTracker',
    url: 'https://linuxtracker.org',
    version: '1.02',
    enabled: true,
    supportedCategories: [
      { id: 'all', name: 'All categories' },
      { id: 'software', name: 'Software' },
    ],
  },
  {
    name: 'archivedotorg',
    fullName: 'Internet Archive',
    url: 'https://archive.org',
    version: '2.11',
    enabled: true,
    supportedCategories: [
      { id: 'all', name: 'All categories' },
      { id: 'books', name: 'Books' },
      { id: 'music', name: 'Music' },
    ],
  },
]

const HITS: SearchResult[] = [
  {
    fileName: 'ubuntu-24.04.2-desktop-amd64.iso',
    fileSize: 5_700_000_000,
    fileUrl: 'magnet:?xt=urn:btih:aaaa1111&dn=ubuntu-24.04.2-desktop-amd64.iso',
    descrLink: 'https://linuxtracker.org/index.php?page=torrent-details&id=aaaa1111',
    siteUrl: 'https://linuxtracker.org',
    nbSeeders: 1842,
    nbLeechers: 96,
  },
  {
    fileName: 'debian-12.9.0-amd64-netinst.iso',
    fileSize: 661_000_000,
    fileUrl: 'magnet:?xt=urn:btih:bbbb2222&dn=debian-12.9.0-amd64-netinst.iso',
    descrLink: 'https://linuxtracker.org/index.php?page=torrent-details&id=bbbb2222',
    siteUrl: 'https://linuxtracker.org',
    nbSeeders: 640,
    nbLeechers: 12,
  },
  {
    fileName: 'The Blue Danube - 1867 recording restoration',
    fileSize: 148_000_000,
    fileUrl: 'magnet:?xt=urn:btih:cccc3333&dn=blue-danube',
    descrLink: 'https://archive.org/details/blue-danube',
    siteUrl: 'https://archive.org',
    nbSeeders: 4,
    nbLeechers: 31,
  },
  {
    fileName: 'Project Gutenberg 2025 complete archive',
    fileSize: 82_000_000_000,
    fileUrl: 'magnet:?xt=urn:btih:dddd4444&dn=gutenberg-2025',
    descrLink: 'https://archive.org/details/gutenberg-2025',
    siteUrl: 'https://archive.org',
    nbSeeders: 0,
    nbLeechers: 0,
  },
]

/**
 * The RSS tree, with one feed inside a folder.
 *
 * The nesting is the point. `rss/items` answers a tree keyed by name and a
 * folder is the same shape minus `uid`, so a mock that was flat would never
 * exercise the only thing that tells the two apart.
 *
 * One article deliberately has no `isRead` at all rather than `isRead: false`,
 * because that is what the daemon sends and code that compares against false
 * gets it backwards.
 */
const RSS_TREE: Record<string, unknown> = {
  'Linux ISOs': {
    uid: '{11111111-1111-1111-1111-111111111111}',
    url: 'https://linuxtracker.org/rss.php',
    title: 'Linux ISOs',
    lastBuildDate: 'Wed, 20 Aug 2026 18:00:00 +0000',
    isLoading: false,
    hasError: false,
    articles: [
      {
        id: 'a1',
        title: 'ubuntu-24.04.2-desktop-amd64.iso',
        torrentURL: 'magnet:?xt=urn:btih:aaaa1111',
        link: 'https://linuxtracker.org/a1',
        date: 'Wed, 20 Aug 2026 17:40:00 +0000',
        size: 5_700_000_000,
        category: 'Software',
      },
      {
        id: 'a2',
        title: 'debian-12.9.0-amd64-netinst.iso',
        torrentURL: 'magnet:?xt=urn:btih:bbbb2222',
        link: 'https://linuxtracker.org/a2',
        date: 'Wed, 20 Aug 2026 12:10:00 +0000',
        isRead: true,
        size: 661_000_000,
      },
    ],
  },
  Archives: {
    'Public Domain': {
      uid: '{22222222-2222-2222-2222-222222222222}',
      url: 'https://archive.org/rss',
      title: 'Public Domain',
      lastBuildDate: 'Wed, 20 Aug 2026 09:00:00 +0000',
      isLoading: false,
      hasError: false,
      articles: [
        {
          id: 'b1',
          title: 'Project Gutenberg 2025 complete archive',
          torrentURL: 'magnet:?xt=urn:btih:dddd4444',
          link: 'https://archive.org/b1',
          date: 'Wed, 20 Aug 2026 08:20:00 +0000',
          size: 82_000_000_000,
        },
      ],
    },
  },
  'Gone Quiet': {
    uid: '{33333333-3333-3333-3333-333333333333}',
    url: 'https://example.org/quiet.xml',
    title: 'Gone Quiet',
    lastBuildDate: '',
    isLoading: false,
    hasError: false,
    articles: [],
  },
}

const RSS_RULES: Record<string, RssRule> = {
  'Linux releases': {
    enabled: true,
    mustContain: 'amd64',
    mustNotContain: 'netinst',
    useRegex: false,
    episodeFilter: '',
    smartFilter: false,
    previouslyMatchedEpisodes: [],
    affectedFeeds: ['https://linuxtracker.org/rss.php'],
    ignoreDays: 0,
    lastMatch: 'Wed, 20 Aug 2026 17:40:00 +0000',
    addPaused: null,
    assignedCategory: 'Software',
    savePath: '',
  },
}

const CATEGORIES: Record<string, Category> = {
  Linux: { name: 'Linux', savePath: '/downloads/linux' },
  Archives: { name: 'Archives', savePath: '/downloads/archives' },
  Film: { name: 'Film', savePath: '/downloads/film' },
}

const TAGS = ['iso', 'verified', 'seed-forever']

/** Roughly 412 GB, the figure the Add Torrent save-path hint was drawn with. */
const FREE_SPACE = 412 * 1000 ** 3

/**
 * The display name out of a magnet link.
 *
 * `dn` is a hint rather than a guarantee: a bare `magnet:?xt=urn:btih:...` is
 * perfectly valid and carries no name at all, which is exactly the case where
 * a real daemon shows the info hash until metadata arrives. Reproducing that
 * here keeps the truncation in the torrent list honest.
 */
function magnetName(link: string): { hash: string; name: string } {
  const hash = /btih:([a-z0-9]+)/i.exec(link)?.[1]?.toLowerCase() ?? ''
  const dn = /[?&]dn=([^&]*)/.exec(link)?.[1]
  return { hash, name: dn ? decodeURIComponent(dn.replace(/\+/g, ' ')) : hash || link }
}

/**
 * Deterministic pseudo-random.
 *
 * Seeded rather than Math.random so a fixture run is reproducible: a screen
 * that looks wrong can be looked at again with the same numbers.
 */
function seeded(seed: number) {
  let value = seed
  return () => {
    value = (value * 1103515245 + 12345) % 2147483648
    return value / 2147483648
  }
}

function makeTorrent(index: number, rand: () => number): Torrent {
  const progress = index === 1 ? 1 : Math.min(0.98, rand())
  const done = progress >= 1
  const paused = index === 2
  // stopped* rather than paused*, because this mock answers 2.11.2 to
  // app/webapiVersion and a daemon on that version reports the new names.
  // Emitting the old ones made the mock agree with code that only understood
  // the old ones, which is how a real 5.x daemon showing stopped torrents as
  // running got past a green suite.
  const state: TorrentState = paused ? 'stoppedDL' : done ? 'uploading' : 'downloading'

  const size = Math.round((1 + rand() * 8) * 1_000_000_000)
  const hash = `hash${index.toString().padStart(2, '0')}`
  const name = NAMES[index % NAMES.length]!
  const numSeeds = Math.round(rand() * 40)
  const numLeechs = Math.round(rand() * 12)

  return {
    hash,
    name,
    size,
    progress,
    dlspeed: paused || done ? 0 : Math.round(rand() * 14_000_000),
    upspeed: paused ? 0 : Math.round(rand() * 2_000_000),
    priority: index + 1,
    num_seeds: numSeeds,
    num_leechs: numLeechs,
    // The swarm, not the connection. Always at least what is connected, since
    // a peer we are talking to is by definition one the swarm has.
    num_complete: numSeeds + Math.round(rand() * 60),
    num_incomplete: numLeechs + Math.round(rand() * 20),
    ratio: Number((rand() * 3).toFixed(2)),
    eta: done || paused ? 8640000 : Math.round(60 + rand() * 4000),
    state,
    category: Object.keys(CATEGORIES)[index % 3]!,
    tags: index % 2 ? 'iso' : 'iso,verified',
    added_on: 1_770_000_000 - index * 86_400,
    completion_on: done ? 1_780_000_000 : 0,
    save_path: '/downloads',
    // Three real trackers in seedTrackers, and the count excludes the three
    // synthetic rows exactly as the daemon's own does. Getting this wrong in
    // the mock would let the badge disagree with the tab and still pass.
    trackers_count: 3,
    // Larger than `size` on every third torrent, so the mock exercises a
    // torrent with files deselected rather than one where the two are always
    // equal and reading the wrong one still looks right.
    total_size: index % 3 === 0 ? Math.round(size * 1.4) : size,
    dl_limit: -1,
    up_limit: -1,
    downloaded: Math.round(progress * 4_000_000_000),
    uploaded: Math.round(rand() * 2_000_000_000),
    // A fraction of the all-time totals, never equal to them. Equal values
    // would let a screen read the wrong field and still look right, which is
    // exactly how the Speed tab showed all-time under the word Session.
    downloaded_session: Math.round(progress * 4_000_000_000 * 0.12),
    uploaded_session: Math.round(rand() * 2_000_000_000 * 0.08),
    seeding_time: done ? 86_400 : 0,
    auto_tmm: false,
    seq_dl: false,
    f_l_piece_prio: false,
    super_seeding: false,
    completed: Math.round(size * progress),
    amount_left: size - Math.round(size * progress),
    // With a display name and a tracker, which is what the daemon hands back
    // and what makes it worth copying rather than rebuilding from the hash.
    magnet_uri: `magnet:?xt=urn:btih:${hash}&dn=${encodeURIComponent(name)}&tr=${encodeURIComponent('https://torrent.ubuntu.com/announce')}`,
    tracker: paused ? '' : 'https://torrent.ubuntu.com/announce',
    content_path: `/downloads/${name}`,

    // One torrent of each kind, so a screen reading share limits meets all
    // three meanings of the field rather than only the common one. A mock
    // where every torrent says -2 would let "follow the global limit" and
    // "no limit" render identically and still look right.
    ...shareLimits(index),

    // -1 while seeding, as the daemon reports, because how many copies the
    // swarm holds is only a question for something still downloading.
    availability: done ? -1 : Number((0.8 + rand() * 1.6).toFixed(3)),
    force_start: false,

    // Deliberately not equal to `seeding_time`: a torrent is active while it
    // downloads too, so anything labelled active that reads the seeding field
    // would be wrong by exactly the download.
    time_active: done ? 86_400 + index * 3_600 : Math.round(1_800 + rand() * 40_000),
    last_activity: 1_780_000_000 - index * 137,
    // 0 means never, which is the state a torrent nobody is seeding is in.
    seen_complete: index % 4 === 3 ? 0 : 1_780_000_000 - index * 900,
    // Unbounded and not a percentage, matching the daemon: real ones measured
    // 40.3, 40.5 and 116.1.
    popularity: Number((rand() * 120).toFixed(3)),

    private: index % 5 === 0,
    comment: index % 2 === 0 ? `Released by the ${name.split(' ')[0]} project` : '',
    infohash_v1: hash,
    // Empty on a v1-only torrent, which is a string the daemon sends rather
    // than a field it omits.
    infohash_v2: '',
  }
}

/**
 * The share limit fields for one mock torrent, cycling through the three modes.
 *
 * `max_*` is the resolved value the daemon would compute, not a copy of the
 * setting. The mock's global limits are off, so "follow the global limit"
 * resolves to no limit, exactly as it did on the real daemon this was checked
 * against.
 */
function shareLimits(index: number) {
  const mode = index % 3
  if (mode === 1) {
    return {
      ratio_limit: -1,
      max_ratio: -1,
      seeding_time_limit: -1,
      max_seeding_time: -1,
      inactive_seeding_time_limit: -1,
      max_inactive_seeding_time: -1,
      share_limit_action: 'Stop' as const,
    }
  }
  if (mode === 2) {
    return {
      ratio_limit: 2.5,
      max_ratio: 2.5,
      // 1440 minutes, which is a day, so anything formatting minutes as a
      // duration has a value where getting the unit wrong is visible.
      seeding_time_limit: 1440,
      max_seeding_time: 1440,
      inactive_seeding_time_limit: -2,
      max_inactive_seeding_time: -1,
      share_limit_action: 'Default' as const,
    }
  }
  return {
    ratio_limit: -2,
    max_ratio: -1,
    seeding_time_limit: -2,
    max_seeding_time: -1,
    inactive_seeding_time_limit: -2,
    max_inactive_seeding_time: -1,
    share_limit_action: 'Default' as const,
  }
}

export interface MockTransportOptions {
  torrentCount?: number
  seed?: number
  /** Latency in ms, so loading states are reachable rather than theoretical. */
  latency?: number
}

/**
 * Walk the RSS tree by its key path.
 *
 * Backslash separated, which is the API's own separator for these and not a
 * file path, so it does not vary by platform.
 */
function nodeAt(tree: Record<string, unknown>, path: string): unknown {
  let node: unknown = tree
  for (const segment of path.split('\\').filter(Boolean)) {
    if (!node || typeof node !== 'object') return undefined
    node = (node as Record<string, unknown>)[segment]
  }
  return node
}

function removeAt(tree: Record<string, unknown>, path: string): void {
  const segments = path.split('\\').filter(Boolean)
  const last = segments.pop()
  if (!last) return
  const parent = nodeAt(tree, segments.join('\\'))
  if (parent && typeof parent === 'object') delete (parent as Record<string, unknown>)[last]
}

export function createMockTransport({
  torrentCount = 6,
  seed = 7,
  latency = 0,
}: MockTransportOptions = {}): Transport {
  const rand = seeded(seed)
  const torrents = new Map<string, Torrent>()
  for (let i = 0; i < torrentCount; i += 1) {
    const t = makeTorrent(i, rand)
    torrents.set(t.hash, t)
  }

  // Copied rather than mutated in place, so two mock transports in the same
  // test file cannot see each other's created categories.
  const categories: Record<string, Category> = { ...CATEGORIES }
  const preferences: Preferences = { ...PREFERENCES }
  const plugins: SearchPlugin[] = PLUGINS.map((p) => ({ ...p }))
  /**
   * Search jobs, keyed by id.
   *
   * `ticks` is how many times the job has been polled. A job that answered in
   * full on the first poll would never exercise the searching state, and that
   * state is half of what this screen has to get right.
   */
  const jobs = new Map<number, { ticks: number; stopped: boolean }>()
  let nextJobId = 1
  const rssTree: Record<string, unknown> = structuredClone(RSS_TREE)
  const rssRules: Record<string, RssRule> = structuredClone(RSS_RULES)
  const tags = [...TAGS]

  let rid = 0
  let peerRid = 0
  let sessionDown = 0
  let sessionUp = 0

  /**
   * Detail fixtures, built once per torrent and then mutated in place.
   *
   * Built lazily rather than up front: the detail screen shows one torrent at
   * a time, and generating peers and file lists for a thousand of them to
   * render six rows would be the mock's own performance bug.
   */
  const details = new Map<
    string,
    { files: TorrentFile[]; peers: Record<string, Peer>; trackers: Tracker[] }
  >()

  function detailFor(t: Torrent) {
    const existing = details.get(t.hash)
    if (existing) return existing

    // A folder torrent, so the Files tab has nesting to render rather than one
    // row. Sizes add up to the torrent's own, since the tab shows both.
    const shares = [0.62, 0.24, 0.11, 0.02, 0.01]
    const names = [
      `${t.name}/${t.name}.iso`,
      `${t.name}/extras/bonus-features.mkv`,
      `${t.name}/extras/artwork.tar.gz`,
      `${t.name}/SHA256SUMS`,
      `${t.name}/SHA256SUMS.gpg`,
    ]
    const files: TorrentFile[] = names.map((name, index) => ({
      index,
      name,
      size: Math.round(t.size * shares[index]!),
      progress: Math.min(1, t.progress * (1 + index * 0.05)),
      priority: index === 2 ? 0 : index === 0 ? 7 : 1,
      piece_range: [index * 200, index * 200 + 199],
    }))

    const peers: Record<string, Peer> = {}
    const clients = ['qBittorrent 5.2.3', 'Transmission 4.0.6', 'libtorrent 2.0.11', 'Deluge 2.1.1']
    const countries = [
      ['Netherlands', 'nl'],
      ['Germany', 'de'],
      ['Sweden', 'se'],
      ['Japan', 'jp'],
      ['Canada', 'ca'],
      ['India', 'in'],
    ]
    const count = 3 + Math.floor(rand() * 4)
    for (let i = 0; i < count; i += 1) {
      const ip = `${10 + Math.floor(rand() * 200)}.${Math.floor(rand() * 255)}.${Math.floor(rand() * 255)}.${1 + Math.floor(rand() * 250)}`
      const port = 6881 + Math.floor(rand() * 2000)
      const place = countries[i % countries.length]!
      peers[`${ip}:${port}`] = {
        ip,
        port,
        client: clients[i % clients.length]!,
        progress: rand(),
        dl_speed: Math.round(rand() * 900_000),
        up_speed: Math.round(rand() * 200_000),
        country: place[0]!,
        country_code: place[1]!,
        connection: i % 3 === 0 ? 'µTP' : 'BT',
        flags: i % 2 ? 'D X' : 'U I',
      }
    }

    const detail = { files, peers, trackers: seedTrackers(t) }
    details.set(t.hash, detail)
    return detail
  }

  const filesFor = (t: Torrent) => detailFor(t).files
  const peersFor = (hash: string) => {
    const t = torrents.get(hash)
    return t ? detailFor(t).peers : {}
  }
  const trackersFor = (t: Torrent) => detailFor(t).trackers

  /**
   * The starting tracker list, kept per torrent from here on.
   *
   * Adding and removing has to survive the next poll or the Trackers tab
   * cannot be reviewed at all: a row that appears and then vanishes two
   * seconds later looks exactly like a bug in the screen.
   */
  function seedTrackers(t: Torrent): Tracker[] {
    return [
      // The three synthetic entries qBittorrent always reports alongside real
      // trackers. Showing them is correct: the stock client does, and a user
      // comparing the two would otherwise think rigseed lost a row.
      { url: '** [DHT] **', status: 2, num_peers: Math.round(rand() * 30), msg: '' },
      { url: '** [PeX] **', status: 2, num_peers: Math.round(rand() * 12), msg: '' },
      { url: '** [LSD] **', status: 2, num_peers: 0, msg: '' },
      {
        url: 'https://torrent.ubuntu.com/announce',
        status: 2,
        num_peers: t.num_seeds + t.num_leechs,
        msg: '',
      },
      { url: 'https://ipv6.torrent.ubuntu.com/announce', status: 3, num_peers: 0, msg: '' },
      {
        url: 'udp://tracker.example.invalid:6969/announce',
        status: 4,
        num_peers: 0,
        msg: 'connection timed out',
      },
    ]
  }

  function propertiesFor(t: Torrent): TorrentProperties {
    return {
      save_path: t.save_path,
      download_path: '',
      creation_date: t.added_on - 86_400 * 30,
      piece_size: 262_144,
      comment: 'Ubuntu CD releases are published under a mix of free licences.',
      created_by: 'mktorrent 1.1',
      addition_date: t.added_on,
      completion_date: t.completion_on,
      total_size: t.size,
      total_wasted: Math.round(t.size * 0.001),
      total_uploaded: t.uploaded,
      total_uploaded_session: Math.round(t.uploaded * 0.4),
      total_downloaded: t.downloaded,
      total_downloaded_session: Math.round(t.downloaded * 0.6),
      up_limit: t.up_limit,
      dl_limit: t.dl_limit,
      time_elapsed: 4_200,
      seeding_time: t.seeding_time,
      nb_connections: 24,
      nb_connections_limit: 100,
      share_ratio: t.ratio,
      dl_speed: t.dlspeed,
      dl_speed_avg: Math.round(t.dlspeed * 0.85),
      up_speed: t.upspeed,
      up_speed_avg: Math.round(t.upspeed * 0.9),
      eta: t.eta,
      last_seen: t.added_on + 3_600,
      peers: t.num_leechs,
      peers_total: t.num_leechs * 3,
      seeds: t.num_seeds,
      seeds_total: t.num_seeds * 2,
      pieces_have: Math.round((t.size / 262_144) * t.progress),
      pieces_num: Math.round(t.size / 262_144),
      reannounce: 900,
      infohash_v1: t.hash,
    }
  }

  // Things created since the last poll. The sync contract sends diffs, and a
  // torrent appearing for the first time has to arrive whole: `tick` reports
  // only the fields that moved, which for a brand new hash would be a torrent
  // with a progress and no name.
  const pendingTorrents = new Set<string>()
  const pendingCategories = new Set<string>()
  const pendingTags = new Set<string>()

  function drain<T>(set: Set<string>, pick: (key: string) => T): Record<string, T> | undefined {
    if (set.size === 0) return undefined
    const out = Object.fromEntries([...set].map((key) => [key, pick(key)]))
    set.clear()
    return out
  }

  const wait = <T>(value: T): Promise<T> =>
    latency > 0 ? new Promise((r) => setTimeout(() => r(value), latency)) : Promise.resolve(value)

  /** Advances the world one tick and returns only what moved. */
  function tick(): Record<string, Partial<Torrent>> {
    const changed: Record<string, Partial<Torrent>> = {}
    for (const t of torrents.values()) {
      if (t.state === 'stoppedDL' || t.state === 'stoppedUP') continue

      if (t.progress < 1) {
        const step = (t.dlspeed || 4_000_000) / t.size
        t.progress = Math.min(1, t.progress + step)
        t.downloaded = Math.round(t.progress * t.size)
        t.dlspeed = Math.round(2_000_000 + rand() * 12_000_000)
        t.eta = t.progress >= 1 ? 8640000 : Math.round(((1 - t.progress) * t.size) / t.dlspeed)

        if (t.progress >= 1) {
          t.state = 'uploading'
          t.dlspeed = 0
          t.completion_on = 1_780_000_000
          changed[t.hash] = {
            progress: 1,
            state: 'uploading',
            dlspeed: 0,
            eta: 8640000,
            completion_on: t.completion_on,
            downloaded: t.downloaded,
          }
          continue
        }
        changed[t.hash] = {
          progress: t.progress,
          dlspeed: t.dlspeed,
          eta: t.eta,
          downloaded: t.downloaded,
        }
      }

      t.upspeed = Math.round(rand() * 2_000_000)
      t.uploaded += t.upspeed
      t.ratio = Number((t.uploaded / Math.max(1, t.downloaded)).toFixed(2))
      changed[t.hash] = {
        ...changed[t.hash],
        upspeed: t.upspeed,
        uploaded: t.uploaded,
        ratio: t.ratio,
      }

      sessionDown += t.dlspeed
      sessionUp += t.upspeed
    }
    return changed
  }

  return {
    get<T>(path: string, params?: Record<string, string | number | boolean>): Promise<T> {
      if (path === 'sync/maindata') {
        const requested = Number(params?.rid ?? 0)
        rid += 1

        // rid 0 means the caller has no state, so send everything.
        if (requested === 0) {
          return wait({
            rid,
            full_update: true,
            torrents: Object.fromEntries(torrents),
            categories,
            tags,
            server_state: {
              dl_info_speed: 0,
              up_info_speed: 0,
              dl_info_data: 0,
              up_info_data: 0,
              dht_nodes: 312,
              connection_status: 'connected',
              use_alt_speed_limits: false,
              free_space_on_disk: FREE_SPACE,
            },
          } as MainData as T)
        }

        const changed = tick()
        for (const hash of pendingTorrents) changed[hash] = torrents.get(hash) ?? {}
        pendingTorrents.clear()

        const newTags = pendingTags.size ? [...pendingTags] : undefined
        pendingTags.clear()

        const totals = [...torrents.values()]
        return wait({
          rid,
          torrents: changed,
          categories: drain(pendingCategories, (name) => categories[name]!),
          tags: newTags,
          server_state: {
            dl_info_speed: totals.reduce((a, t) => a + t.dlspeed, 0),
            up_info_speed: totals.reduce((a, t) => a + t.upspeed, 0),
            dl_info_data: sessionDown,
            up_info_data: sessionUp,
          },
        } as MainData as T)
      }

      if (path === 'sync/torrentPeers') {
        const hash = String(params?.hash ?? '')
        const requested = Number(params?.rid ?? 0)
        peerRid += 1

        const list = peersFor(hash)
        if (requested === 0) {
          const snapshot = Object.fromEntries(
            Object.entries(list).map(([key, peer]) => [key, { ...peer }]),
          )
          return wait({ rid: peerRid, full_update: true, peers: snapshot, show_flags: true } as T)
        }

        // Only what moved, which for a peer is its progress and its rates.
        const changed: Record<string, Partial<Peer>> = {}
        for (const [key, peer] of Object.entries(list)) {
          peer.progress = Math.min(1, peer.progress + rand() * 0.02)
          peer.dl_speed = Math.round(rand() * 900_000)
          peer.up_speed = Math.round(rand() * 200_000)
          changed[key] = {
            progress: peer.progress,
            dl_speed: peer.dl_speed,
            up_speed: peer.up_speed,
          }
        }
        return wait({ rid: peerRid, peers: changed } as T)
      }

      if (path === 'torrents/properties') {
        const t = torrents.get(String(params?.hash ?? ''))
        return wait((t ? propertiesFor(t) : undefined) as T)
      }
      // Copies, because a real transport answers with freshly parsed JSON and
      // shares nothing. Handing back the live arrays let a caller mutate the
      // mock's own state, and made a read taken before a write quietly become
      // a read taken after it.
      if (path === 'torrents/files') {
        const t = torrents.get(String(params?.hash ?? ''))
        return wait((t ? filesFor(t).map((f) => ({ ...f })) : []) as T)
      }
      if (path === 'torrents/trackers') {
        const t = torrents.get(String(params?.hash ?? ''))
        return wait((t ? trackersFor(t).map((tr) => ({ ...tr })) : []) as T)
      }

      if (path === 'torrents/info') return wait([...torrents.values()] as T)
      if (path === 'torrents/categories') return wait(categories as T)
      if (path === 'torrents/tags') return wait(tags as T)
      if (path === 'app/version') return wait('v5.2.3' as T)
      if (path === 'app/preferences') return wait(preferences as T)
      if (path === 'search/plugins') return wait(plugins as T)
      if (path === 'rss/items') return wait(rssTree as T)
      if (path === 'rss/rules') return wait(rssRules as T)
      if (path === 'rss/matchingArticles') {
        // Only the titles, keyed by feed, which is what the endpoint sends.
        return wait({ 'Linux ISOs': ['ubuntu-24.04.2-desktop-amd64.iso'] } as T)
      }
      if (path === 'search/status') {
        return wait(
          [...jobs.entries()].map(([id, job]) => ({
            id,
            status: job.stopped || job.ticks >= 2 ? 'Stopped' : 'Running',
            total: job.stopped || job.ticks >= 2 ? HITS.length : Math.min(job.ticks, HITS.length),
          })) as T,
        )
      }
      if (path === 'search/results') {
        const id = Number(params?.['id'] ?? 0)
        const job = jobs.get(id)
        if (!job) return wait({ results: [], status: 'Stopped', total: 0 } as T)
        job.ticks += 1
        const done = job.stopped || job.ticks >= 2
        const shown = done ? HITS : HITS.slice(0, 2)
        return wait({
          results: shown.map((h) => ({ ...h })),
          status: done ? 'Stopped' : 'Running',
          total: shown.length,
        } as T)
      }
      if (path === 'log/main') {
        // The tail cursor, honoured rather than ignored: a Follow loop that
        // gets the whole log back every tick would prepend duplicates for
        // ever, and it is the kind of thing that looks fine on a log with
        // twelve lines in it.
        const since = Number(params?.['last_known_id'] ?? -1)
        return wait(LOG.filter((e) => e.id > since) as T)
      }
      if (path === 'log/peers') {
        const since = Number(params?.['last_known_id'] ?? -1)
        return wait(BANS.filter((e) => e.id > since) as T)
      }
      if (path === 'app/webapiVersion') return wait('2.11.2' as T)
      if (path === 'app/defaultSavePath') return wait('/downloads' as T)

      return wait(undefined as T)
    },

    post<T>(path: string, body?: Record<string, string | number | boolean>): Promise<T> {
      const hashes = String(body?.hashes ?? '')
        .split('|')
        .filter(Boolean)

      /**
       * Every write below stores its change. That is only half of it: the
       * screens read the live numbers out of the store, and the store is
       * filled by `sync/maindata`, whose diff carries speeds and totals and
       * nothing else. So a stored change stayed invisible until something
       * asked for a full update.
       *
       * The daemon does not behave that way. Marking the torrent pending
       * makes the next diff carry its whole record, which is what qBittorrent
       * does with a field that changed.
       */
      const touched = (...list: string[]) => {
        for (const h of list) if (torrents.has(h)) pendingTorrents.add(h)
      }
      touched(...hashes, String(body?.hash ?? ''))

      // Both spellings, as a 5.x daemon does: 2.11 renamed pause and resume
      // to stop and start and kept the old pair as deprecated aliases.
      if (path === 'torrents/pause' || path === 'torrents/stop') {
        for (const h of hashes) {
          const t = torrents.get(h)
          if (t) t.state = t.progress >= 1 ? 'stoppedUP' : 'stoppedDL'
        }
      }
      if (path === 'torrents/resume' || path === 'torrents/start') {
        for (const h of hashes) {
          const t = torrents.get(h)
          if (t) t.state = t.progress >= 1 ? 'uploading' : 'downloading'
        }
      }
      if (path === 'torrents/delete') {
        for (const h of hashes) torrents.delete(h)
      }

      // The inline creators in Add Torrent create and select in one step, so
      // the created thing has to be usable on the very next render rather than
      // after a refresh.
      if (path === 'torrents/createCategory') {
        const name = String(body?.category ?? '')
        if (name) {
          categories[name] = { name, savePath: String(body?.savePath ?? '') }
          pendingCategories.add(name)
        }
      }
      if (path === 'rss/markAsRead') {
        const itemPath = String(body?.['itemPath'] ?? '')
        const articleId = body?.['articleId'] === undefined ? null : String(body['articleId'])
        const node = nodeAt(rssTree, itemPath) as { articles?: { id: string; isRead?: boolean }[] }
        for (const article of node?.articles ?? []) {
          if (articleId === null || article.id === articleId) article.isRead = true
        }
      }
      if (path === 'rss/removeItem') {
        removeAt(rssTree, String(body?.['path'] ?? ''))
      }
      if (path === 'rss/addFeed') {
        const at = String(body?.['path'] ?? '')
        const name = at.split('\\').pop() ?? at
        rssTree[name] = {
          uid: `{mock-${name}}`,
          url: String(body?.['url'] ?? ''),
          title: name,
          lastBuildDate: '',
          isLoading: false,
          hasError: false,
          articles: [],
        }
      }
      if (path === 'rss/setRule') {
        const name = String(body?.['ruleName'] ?? '')
        if (name) rssRules[name] = JSON.parse(String(body?.['ruleDef'] ?? '{}')) as RssRule
      }
      if (path === 'rss/removeRule') {
        delete rssRules[String(body?.['ruleName'] ?? '')]
      }
      if (path === 'search/start') {
        const id = nextJobId++
        jobs.set(id, { ticks: 0, stopped: false })
        return wait({ id } as T)
      }
      if (path === 'search/stop') {
        const job = jobs.get(Number(body?.['id'] ?? 0))
        if (job) job.stopped = true
      }
      if (path === 'search/delete') {
        // The slot is freed here and nowhere else. A screen that forgets stops
        // being able to search after the fifth query.
        jobs.delete(Number(body?.['id'] ?? 0))
      }
      if (path === 'search/enablePlugin') {
        const wanted = String(body?.['names'] ?? '')
          .split('|')
          .filter(Boolean)
        const enable = String(body?.['enable'] ?? 'false') === 'true'
        for (const p of plugins) if (wanted.includes(p.name)) p.enabled = enable
      }
      if (path === 'search/installPlugin') {
        // The daemon fetches each source and reads the plugin's own name and
        // url out of the Python file. Nothing here can fetch anything, so the
        // entry is built from the file name, which is what the daemon uses
        // for `name` anyway. `.example` is reserved for exactly this, so the
        // fabricated host cannot collide with a real one.
        for (const source of String(body?.['sources'] ?? '')
          .split('\n')
          .filter(Boolean)) {
          // The daemon fetches the source and fails when what comes back is
          // not a plugin. The mock cannot fetch, so the one check it can
          // honestly make is the extension. Worth making: without it the mock
          // has no failing write anywhere, and the dialog's error state could
          // not be reached in sample-data mode at all.
          if (!source.endsWith('.py')) {
            throw new ApiError(400, 'search/installPlugin', `${source} is not a Python plugin file`)
          }
          const stem = (source.split('/').pop() ?? '').replace(/\.py$/, '')
          if (!stem || plugins.some((p) => p.name === stem)) continue
          plugins.push({
            name: stem,
            fullName: stem.charAt(0).toUpperCase() + stem.slice(1),
            url: `https://${stem}.example`,
            version: '1.00',
            enabled: true,
            supportedCategories: [{ id: 'all', name: 'All categories' }],
          })
        }
      }
      if (path === 'search/uninstallPlugin') {
        for (const name of String(body?.['names'] ?? '')
          .split('|')
          .filter(Boolean)) {
          const at = plugins.findIndex((p) => p.name === name)
          if (at !== -1) plugins.splice(at, 1)
        }
      }
      if (path === 'app/setPreferences') {
        // One JSON blob under `json`, not a flat form. Merged rather than
        // replaced: the caller sends only what changed, which is the whole
        // point of the save bar.
        const changed = JSON.parse(String(body?.json ?? '{}')) as Record<string, unknown>
        Object.assign(preferences, changed)
      }
      if (path === 'torrents/editCategory') {
        const name = String(body?.category ?? '')
        const existing = categories[name]
        if (existing) existing.savePath = String(body?.savePath ?? '')
      }
      if (path === 'torrents/removeCategories') {
        // Newline separated, which is the one place the API does not use a
        // comma. A category that goes away leaves its torrents uncategorised
        // rather than taking them with it.
        for (const name of String(body?.categories ?? '')
          .split('\n')
          .filter(Boolean)) {
          delete categories[name]
          for (const t of torrents.values()) if (t.category === name) t.category = ''
        }
      }
      if (path === 'torrents/deleteTags') {
        for (const name of String(body?.tags ?? '')
          .split(',')
          .filter(Boolean)) {
          const at = tags.indexOf(name)
          if (at !== -1) tags.splice(at, 1)
          for (const t of torrents.values()) {
            t.tags = t.tags
              .split(',')
              .map((x) => x.trim())
              .filter((x) => x && x !== name)
              .join(',')
          }
        }
      }
      // The Speed tab writes back, and a control that reports success while
      // the value snaps back on the next poll is worse than one that fails.
      if (path === 'torrents/setDownloadLimit' || path === 'torrents/setUploadLimit') {
        const limit = Number(body?.limit ?? -1)
        const key = path.endsWith('DownloadLimit') ? 'dl_limit' : 'up_limit'
        for (const h of hashes) {
          const t = torrents.get(h)
          if (t) t[key] = limit
        }
      }
      if (path === 'torrents/toggleSequentialDownload') {
        for (const h of hashes) {
          const t = torrents.get(h)
          // A toggle, not a setter. The API has no way to say "on", which is
          // why the caller has to know the current state.
          if (t) t.seq_dl = !t.seq_dl
        }
      }
      if (path === 'torrents/toggleFirstLastPiecePrio') {
        for (const h of hashes) {
          const t = torrents.get(h)
          if (t) t.f_l_piece_prio = !t.f_l_piece_prio
        }
      }
      if (path === 'torrents/setAutoManagement') {
        const enable = String(body?.enable ?? 'false') === 'true'
        for (const h of hashes) {
          const t = torrents.get(h)
          if (t) t.auto_tmm = enable
        }
      }

      /**
       * The detail screen's writes, stored rather than accepted and dropped.
       *
       * These were the last endpoints the mock ignored, and ignoring them is
       * indistinguishable on screen from the write failing: the control moves,
       * the refetch comes back with the old value, the control snaps back. The
       * service layer proves the request is well formed; only the mock can
       * prove the loop closes.
       */
      const one = torrents.get(String(body?.hash ?? ''))

      if (path === 'torrents/filePrio' && one) {
        // The daemon rejects a priority outside its own four with a 400, so
        // the mock declines it too rather than quietly rounding it to normal.
        const asked = Number(body?.priority)
        const priority = (Object.values(PRIORITY) as number[]).includes(asked)
          ? (asked as Priority)
          : null
        const ids = new Set(
          String(body?.id ?? '')
            .split('|')
            .filter(Boolean)
            .map(Number),
        )
        if (priority !== null) {
          for (const file of filesFor(one)) {
            if (ids.has(file.index)) file.priority = priority
          }
        }
      }

      if (path === 'torrents/renameFile' && one) {
        const file = filesFor(one).find((f) => f.index === Number(body?.id ?? -1))
        if (file) file.name = String(body?.newPath ?? file.name)
      }

      if (path === 'torrents/addTrackers' && one) {
        const list = trackersFor(one)
        for (const url of String(body?.urls ?? '')
          .split('\n')
          .map((u) => u.trim())
          .filter(Boolean)) {
          // status 1 is "not contacted yet", which is what a tracker added a
          // moment ago genuinely is. Reporting it as working would be a nicer
          // screenshot and a worse mock.
          if (!list.some((t) => t.url === url)) list.push({ url, status: 1, num_peers: 0, msg: '' })
        }
      }

      if (path === 'torrents/removeTrackers' && one) {
        const gone = new Set(
          String(body?.urls ?? '')
            .split('|')
            .filter(Boolean),
        )
        const list = trackersFor(one)
        for (let i = list.length - 1; i >= 0; i -= 1) {
          if (gone.has(list[i]!.url)) list.splice(i, 1)
        }
      }

      if (path === 'torrents/editTracker' && one) {
        const tracker = trackersFor(one).find((t) => t.url === String(body?.origUrl ?? ''))
        if (tracker) {
          tracker.url = String(body?.newUrl ?? tracker.url)
          tracker.status = 1
        }
      }

      if (path === 'torrents/recheck') {
        for (const h of hashes) {
          const t = torrents.get(h)
          if (t) t.state = t.progress >= 1 ? 'checkingUP' : 'checkingDL'
        }
      }

      if (path === 'transfer/banPeers') {
        // Session-wide, which is the daemon's design: the address goes from
        // every torrent, not just the one the row was clicked in.
        const banned = String(body?.peers ?? '')
          .split('|')
          .filter(Boolean)
        for (const detail of details.values()) {
          for (const key of banned) delete detail.peers[key]
        }
      }

      if (path === 'torrents/createTags') {
        for (const tag of String(body?.tags ?? '')
          .split(',')
          .filter(Boolean)) {
          if (!tags.includes(tag)) tags.push(tag)
          pendingTags.add(tag)
        }
      }

      return wait(undefined as T)
    },

    postForm<T>(path: string, form: FormData): Promise<T> {
      if (path !== 'torrents/add') return wait(undefined as T)

      const text = (key: string) => {
        const value = form.get(key)
        return typeof value === 'string' ? value : ''
      }
      const flag = (key: string) => text(key) === 'true'

      const links = text('urls')
        .split('\n')
        .map((l) => l.trim())
        .filter(Boolean)
      const files = form.getAll('torrents').filter((f): f is File => typeof f !== 'string')

      const sources: { hash: string; name: string }[] = [
        ...links.map(magnetName),
        // A `.torrent` carries its real name inside the bencoded metadata,
        // which is not something worth parsing here. The filename without its
        // extension is what a user recognises anyway.
        ...files.map((file, i) => ({
          hash: `added${(torrents.size + i).toString().padStart(2, '0')}`,
          name: file.name.replace(/\.torrent$/i, ''),
        })),
      ]

      const paused = flag('paused')
      for (const [i, source] of sources.entries()) {
        const hash = source.hash || `added${(torrents.size + i).toString().padStart(2, '0')}`
        if (torrents.has(hash)) continue

        const seed = makeTorrent(torrents.size + i, rand)
        torrents.set(hash, {
          ...seed,
          hash,
          name: source.name,
          progress: 0,
          downloaded: 0,
          uploaded: 0,
          downloaded_session: 0,
          uploaded_session: 0,
          ratio: 0,
          completion_on: 0,
          // Straight from the form, so what the modal collected is what shows
          // up in the list a tick later. That round trip is the whole point of
          // the mock.
          state: paused ? 'stoppedDL' : 'downloading',
          dlspeed: paused ? 0 : seed.dlspeed,
          upspeed: 0,
          category: text('category'),
          tags: text('tags'),
          save_path: text('savepath') || '/downloads',
          auto_tmm: flag('autoTMM'),
          seq_dl: flag('sequentialDownload'),
        })
        pendingTorrents.add(hash)
      }

      return wait(undefined as T)
    },
  }
}
