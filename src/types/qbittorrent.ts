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
  /**
   * Sequential download.
   *
   * `seq_dl`, not `sequential_download`. The long name is what
   * `torrents/properties` and the add form use; `torrents/info` and
   * `sync/maindata` use this one, and reading the wrong one gets `undefined`
   * rather than an error.
   */
  seq_dl: boolean
  /** First and last piece priority. */
  f_l_piece_prio: boolean
  super_seeding: boolean
  /** Bytes done. Exact, where `size * progress` is a reconstruction. */
  completed: number
  /** Bytes still to fetch. */
  amount_left: number
  /**
   * The daemon's own magnet, with trackers and display name.
   *
   * Worth taking rather than rebuilding from the hash: `magnet:?xt=urn:btih:`
   * plus an info hash is a valid magnet that has lost everything a client
   * needs to find peers quickly.
   */
  magnet_uri: string
  /** Seeds and leechers in the whole swarm, not just the connected ones. */
  num_complete: number
  num_incomplete: number
  /** The first working tracker's URL, empty while none is working. */
  tracker: string
  /**
   * What to reveal in the file manager.
   *
   * The file itself for a single-file torrent, the folder for a multi-file
   * one, which is why this is not just `save_path` joined to `name`. Revealing
   * handles both: the file manager opens the parent either way and highlights
   * what was named.
   */
  content_path: string
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
  /** Two-letter code. `country` is the full name, this is what the badge shows. */
  country_code?: string
  connection?: string
  flags?: string
  relevance?: number
}

/**
 * One `sync/torrentPeers` response.
 *
 * The same diff contract as `sync/maindata`, scoped to one torrent: `rid`
 * advances, `full_update` means replace, and absent keys mean unchanged.
 */
export interface TorrentPeers {
  rid: number
  full_update?: boolean
  peers?: Record<string, Partial<Peer>>
  peers_removed?: string[]
  show_flags?: boolean
}

/**
 * `torrents/properties`, the per-torrent detail the list does not carry.
 *
 * Overlaps `Torrent` in places and disagrees with it in naming: the same
 * concept is `dlspeed` in the list and `dl_speed` here. Both names are kept as
 * the daemon sends them rather than reconciled, for the same reason the rest
 * of the wire model is: a renaming layer is a place for a typo to become a
 * silent undefined.
 */
export interface TorrentProperties {
  save_path: string
  download_path?: string
  creation_date: number
  piece_size: number
  comment: string
  created_by: string
  addition_date: number
  completion_date: number
  total_size: number
  total_wasted: number
  total_uploaded: number
  total_uploaded_session: number
  total_downloaded: number
  total_downloaded_session: number
  /** -1 is unlimited. */
  up_limit: number
  dl_limit: number
  time_elapsed: number
  seeding_time: number
  nb_connections: number
  nb_connections_limit: number
  share_ratio: number
  dl_speed: number
  dl_speed_avg: number
  up_speed: number
  up_speed_avg: number
  eta: number
  last_seen: number
  peers: number
  peers_total: number
  seeds: number
  seeds_total: number
  pieces_have: number
  pieces_num: number
  reannounce: number
  infohash_v1?: string
  infohash_v2?: string
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
  /**
   * Bytes free where torrents are saved.
   *
   * There is no free-space endpoint in the Web API; this ride-along on the
   * sync payload is the only source, which is why the Add Torrent save-path
   * hint reads it from the torrent store rather than fetching it.
   */
  free_space_on_disk: number
}

/**
 * One `torrents/add` submission.
 *
 * Files and links go in the same request: a user can drop a `.torrent` and
 * paste a magnet before hitting add, and the daemon accepts both together.
 */
export interface AddTorrentOptions {
  /** Magnet links or http(s) URLs. Sent newline separated. */
  urls?: readonly string[]
  /** `.torrent` files, as picked or dropped. */
  files?: readonly File[]
  savepath?: string
  category?: string
  tags?: readonly string[]
  /**
   * The API's own polarity, kept rather than flipped to `start`. The UI shows
   * a "Start torrent" switch and inverts it at the call site, so the parameter
   * shown in mono next to that switch is the one actually sent.
   */
  paused?: boolean
  skip_checking?: boolean
  sequentialDownload?: boolean
  autoTMM?: boolean
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
