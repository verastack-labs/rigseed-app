import type { Transport } from '@/services/transport'
import type {
  Category,
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
  const state: TorrentState = paused ? 'pausedDL' : done ? 'uploading' : 'downloading'

  return {
    hash: `hash${index.toString().padStart(2, '0')}`,
    name: NAMES[index % NAMES.length]!,
    size: Math.round((1 + rand() * 8) * 1_000_000_000),
    progress,
    dlspeed: paused || done ? 0 : Math.round(rand() * 14_000_000),
    upspeed: paused ? 0 : Math.round(rand() * 2_000_000),
    priority: index + 1,
    num_seeds: Math.round(rand() * 40),
    num_leechs: Math.round(rand() * 12),
    ratio: Number((rand() * 3).toFixed(2)),
    eta: done || paused ? 8640000 : Math.round(60 + rand() * 4000),
    state,
    category: Object.keys(CATEGORIES)[index % 3]!,
    tags: index % 2 ? 'iso' : 'iso,verified',
    added_on: 1_770_000_000 - index * 86_400,
    completion_on: done ? 1_780_000_000 : 0,
    save_path: '/downloads',
    dl_limit: -1,
    up_limit: -1,
    downloaded: Math.round(progress * 4_000_000_000),
    uploaded: Math.round(rand() * 2_000_000_000),
    seeding_time: done ? 86_400 : 0,
    auto_tmm: false,
    sequential_download: false,
    super_seeding: false,
  }
}

export interface MockTransportOptions {
  torrentCount?: number
  seed?: number
  /** Latency in ms, so loading states are reachable rather than theoretical. */
  latency?: number
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
  const details = new Map<string, { files: TorrentFile[]; peers: Record<string, Peer> }>()

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

    const detail = { files, peers }
    details.set(t.hash, detail)
    return detail
  }

  const filesFor = (t: Torrent) => detailFor(t).files
  const peersFor = (hash: string) => {
    const t = torrents.get(hash)
    return t ? detailFor(t).peers : {}
  }

  function trackersFor(t: Torrent): Tracker[] {
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
      if (t.state === 'pausedDL' || t.state === 'pausedUP') continue

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
          return wait({ rid: peerRid, full_update: true, peers: list, show_flags: true } as T)
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
      if (path === 'torrents/files') {
        const t = torrents.get(String(params?.hash ?? ''))
        return wait((t ? filesFor(t) : []) as T)
      }
      if (path === 'torrents/trackers') {
        const t = torrents.get(String(params?.hash ?? ''))
        return wait((t ? trackersFor(t) : []) as T)
      }

      if (path === 'torrents/info') return wait([...torrents.values()] as T)
      if (path === 'torrents/categories') return wait(categories as T)
      if (path === 'torrents/tags') return wait(tags as T)
      if (path === 'app/version') return wait('v5.2.3' as T)
      if (path === 'app/webapiVersion') return wait('2.11.2' as T)
      if (path === 'app/defaultSavePath') return wait('/downloads' as T)

      return wait(undefined as T)
    },

    post<T>(path: string, body?: Record<string, string | number | boolean>): Promise<T> {
      const hashes = String(body?.hashes ?? '')
        .split('|')
        .filter(Boolean)

      if (path === 'torrents/pause') {
        for (const h of hashes) {
          const t = torrents.get(h)
          if (t) t.state = t.progress >= 1 ? 'pausedUP' : 'pausedDL'
        }
      }
      if (path === 'torrents/resume') {
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
          if (t) t.sequential_download = !t.sequential_download
        }
      }
      if (path === 'torrents/setAutoManagement') {
        const enable = String(body?.enable ?? 'false') === 'true'
        for (const h of hashes) {
          const t = torrents.get(h)
          if (t) t.auto_tmm = enable
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
          ratio: 0,
          completion_on: 0,
          // Straight from the form, so what the modal collected is what shows
          // up in the list a tick later. That round trip is the whole point of
          // the mock.
          state: paused ? 'pausedDL' : 'downloading',
          dlspeed: paused ? 0 : seed.dlspeed,
          upspeed: 0,
          category: text('category'),
          tags: text('tags'),
          save_path: text('savepath') || '/downloads',
          auto_tmm: flag('autoTMM'),
          sequential_download: flag('sequentialDownload'),
        })
        pendingTorrents.add(hash)
      }

      return wait(undefined as T)
    },
  }
}
