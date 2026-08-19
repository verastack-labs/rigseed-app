/**
 * The qBittorrent Web API v2.x wire model.
 *
 * These names are snake_case because the daemon sends them that way. They are
 * deliberately not renamed on the way in: a field called `num_leechs` in the
 * app is traceable to the endpoint that produced it, and a renaming layer is
 * one more place for a typo to become a silent undefined.
 *
 * Taken verbatim from rigseed-internal/docs/architecture.md section 8.
 */

export type TorrentState =
  | 'downloading'
  | 'stalledDL'
  | 'metaDL'
  | 'forcedDL'
  | 'uploading'
  | 'stalledUP'
  | 'forcedUP'
  | 'pausedDL'
  | 'pausedUP'
  | 'queuedDL'
  | 'queuedUP'
  | 'checkingDL'
  | 'checkingUP'
  | 'checkingResumeData'
  | 'error'
  | 'missingFiles'
  | 'moving'
  | 'allocating'
  | 'unknown'

export interface Torrent {
  hash: string
  name: string
  /** Bytes. */
  size: number
  /** 0..1, not a percentage. */
  progress: number
  /** Bytes per second. */
  dlspeed: number
  upspeed: number
  /** -1 when queueing is off. */
  priority: number
  num_seeds: number
  num_leechs: number
  ratio: number
  /** Seconds. 8640000 means infinite. */
  eta: number
  state: TorrentState
  /** Empty string means no category. */
  category: string
  /** Comma separated. */
  tags: string
  added_on: number
  completion_on: number
  save_path: string
  /** -1 is unlimited. */
  dl_limit: number
  up_limit: number
  downloaded: number
  uploaded: number
  seeding_time: number
  auto_tmm: boolean
  sequential_download: boolean
  super_seeding: boolean
}

export interface TorrentFile {
  index: number
  name: string
  size: number
  progress: number
  /** skip / normal / high / max */
  priority: 0 | 1 | 6 | 7
  is_seed?: boolean
  piece_range: [number, number]
}

export interface Tracker {
  url: string
  /** disabled / not contacted / working / updating / error */
  status: 0 | 1 | 2 | 3 | 4
  num_peers: number
  msg: string
}

export interface Peer {
  ip: string
  port: number
  client: string
  progress: number
  dl_speed: number
  up_speed: number
  country?: string
}

export interface Category {
  name: string
  savePath: string
}

export interface GlobalTransferInfo {
  dl_info_speed: number
  up_info_speed: number
  dl_info_data: number
  up_info_data: number
  dht_nodes: number
  connection_status: 'connected' | 'firewalled' | 'disconnected'
  use_alt_speed_limits: boolean
}

/**
 * One `sync/maindata` response.
 *
 * Everything except `rid` is a diff. `full_update` marks the first response of
 * a session, or a response the daemon could not diff, and means the payload
 * replaces rather than merges. Absent keys mean unchanged, and per-torrent
 * objects carry only the fields that moved.
 */
export interface MainData {
  rid: number
  full_update?: boolean
  torrents?: Record<string, Partial<Torrent>>
  torrents_removed?: string[]
  categories?: Record<string, Category>
  categories_removed?: string[]
  tags?: string[]
  tags_removed?: string[]
  server_state?: Partial<GlobalTransferInfo>
}

/** The eight infinity sentinel the daemon uses for "no ETA". */
export const ETA_INFINITE = 8640000

/** -1 means unlimited for both rate limits. */
export const LIMIT_UNLIMITED = -1
