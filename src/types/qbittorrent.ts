/**
 * The qBittorrent Web API v2.x wire model.
 *
 * These names are snake_case because the daemon sends them that way. They are
 * deliberately not renamed on the way in: a field called `num_leechs` in the
 * app is traceable to the endpoint that produced it, and a renaming layer is
 * one more place for a typo to become a silent undefined.
 *
 * Taken verbatim from the data model in the architecture reference.
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
  /**
   * What 5.x calls a paused torrent.
   *
   * The same rename that turned `torrents/pause` into `torrents/stop`, which
   * the client already handles through `capabilitiesFor`. The state strings
   * went with it and were missed: a 5.x daemon reports `stoppedUP` where a
   * 4.x one reports `pausedUP`. Both are listed because rigseed connects to
   * whatever is on the other end, not only to the daemon it bundles.
   */
  | 'stoppedDL'
  | 'stoppedUP'
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
  /**
   * How many trackers the torrent has.
   *
   * Excludes the DHT, PeX and LSD rows that `torrents/trackers` reports
   * alongside real ones, which is what the Trackers tab counts too: measured
   * at 12 against a list of 15 with 3 synthetic. So the badge can be right
   * without fetching the list at all.
   */
  trackers_count: number
  /**
   * Whether the torrent's file list has arrived.
   *
   * False for a magnet that has not resolved yet. A magnet carries an
   * identifier and nothing else: the file list comes from other peers, so
   * until it does there is no size, no files and nothing to choose. The
   * daemon reports `size: 0` and `total_size: -1` in that state, and
   * `torrents/files` answers with an empty array.
   *
   * 5.x only. Absent on older daemons, where it reads as undefined and the
   * screens fall back to what they did before.
   */
  has_metadata?: boolean
  /**
   * Every file, including the ones set to skip.
   *
   * `size` counts selected files only, so the two agree on a torrent with
   * nothing deselected and diverge on one with files skipped. Anything that
   * means "how big is this torrent" wants this one.
   */
  total_size: number
  /** All time, across every session the torrent has ever run in. */
  downloaded: number
  uploaded: number
  /**
   * This run only, reset when the daemon restarts.
   *
   * Not the same number as `downloaded` and not close to it: a long-seeded
   * torrent can show 8 MB here against 2.3 GB all time. Anything labelled
   * "session" has to read these, and the Speed tab used to read the pair
   * above.
   */
  downloaded_session: number
  uploaded_session: number
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

/**
 * The preference keys Settings reads and writes.
 *
 * Not all 223 of them. `app/preferences` returns everything qBittorrent has,
 * and typing the lot would be a second copy of its source to keep in step for
 * no gain: the screen edits these, and `app/setPreferences` takes only the
 * keys that changed, so the rest are never touched.
 *
 * Every name and type here was read off a running qBittorrent 5.2.3 rather
 * than from the docs, which are behind in at least one place: `start_paused_enabled`
 * is `add_stopped_enabled` now.
 */
export interface Preferences {
  // Downloads
  save_path: string
  temp_path_enabled: boolean
  temp_path: string
  incomplete_files_ext: boolean
  preallocate_all: boolean
  auto_tmm_enabled: boolean
  add_stopped_enabled: boolean
  queueing_enabled: boolean
  max_active_downloads: number
  max_active_torrents: number
  max_active_uploads: number

  // Connection
  listen_port: number
  upnp: boolean
  max_connec: number
  max_connec_per_torrent: number
  max_uploads: number
  max_uploads_per_torrent: number
  proxy_type: string
  proxy_ip: string
  proxy_port: number
  proxy_peer_connections: boolean

  // Speed
  dl_limit: number
  up_limit: number
  alt_dl_limit: number
  alt_up_limit: number
  limit_utp_rate: boolean
  limit_tcp_overhead: boolean
  /**
   * One window, not a grid.
   *
   * The design asks for a paintable 7x24 schedule. The API has a single
   * from/to time and `scheduler_days`, an enum of every day, weekdays,
   * weekends or one named day. A grid cannot be represented, so the screen
   * does not draw one it could not save.
   */
  scheduler_enabled: boolean
  scheduler_days: number
  schedule_from_hour: number
  schedule_from_min: number
  schedule_to_hour: number
  schedule_to_min: number

  // BitTorrent
  dht: boolean
  pex: boolean
  lsd: boolean
  /** 0 prefer, 1 require, 2 disable. */
  encryption: number
  anonymous_mode: boolean
  max_ratio_enabled: boolean
  max_ratio: number

  /**
   * RSS.
   *
   * `rss_processing_enabled` is off by default, and while it is off the daemon
   * never refreshes a feed. A feed list that quietly never updates is the
   * worst version of that, so the screen says it.
   */
  rss_processing_enabled: boolean
  rss_auto_downloading_enabled: boolean
  /** Minutes. */
  rss_refresh_interval: number

  // Web UI
  web_ui_port: number
  web_ui_csrf_protection_enabled: boolean
  web_ui_clickjacking_protection_enabled: boolean
  web_ui_host_header_validation_enabled: boolean

  // Search
  /**
   * Which interpreter runs the search engine. Empty means `python3` off PATH,
   * which is the default and is not always the right one: see `checkPython`.
   *
   * Writable and honoured without a daemon restart, verified by pointing it at
   * a path that does not exist, getting the 409, and clearing it again.
   */
  python_executable_path: string
}

/** What can be written back. Every key optional, since only changes are sent. */
export type PreferenceChanges = Partial<Preferences>

/** Four levels, and the bitmask the daemon reports them as. */
export type LogLevel = 'normal' | 'info' | 'warning' | 'critical'

export interface LogEntry {
  id: number
  message: string
  /** Unix seconds, not milliseconds. */
  timestamp: number
  /** 1 normal, 2 info, 4 warning, 8 critical. A bitmask value, not an index. */
  type: number
}

/**
 * One line of `log/peers`.
 *
 * `reason` says what refused the address, and it is not always something this
 * app can undo. Manual bans live in the `banned_IPs` preference; entries the
 * internal IP filter produced have nothing to remove them from.
 */
export interface PeerBan {
  id: number
  ip: string
  timestamp: number
  blocked: boolean
  reason: string
}

/** One hit. Names are qBittorrent's, read off a live 5.2.3 rather than guessed. */
export interface SearchResult {
  fileName: string
  fileSize: number
  fileUrl: string
  /** The page a human would read. Often the same host as `siteUrl`. */
  descrLink: string
  siteUrl: string
  nbSeeders: number
  nbLeechers: number
  /** Not sent by the API. Filled in from the engine that returned the hit. */
  engine?: string
}

/** `search/status`, one entry per job the daemon still holds. */
export interface SearchJobStatus {
  id: number
  status: 'Running' | 'Stopped'
  total: number
}

export interface SearchResults {
  results: SearchResult[]
  status: 'Running' | 'Stopped'
  total: number
}

export interface SearchPlugin {
  name: string
  fullName: string
  url: string
  version: string
  enabled: boolean
  supportedCategories: { id: string; name: string }[]
}

/**
 * One article in a feed.
 *
 * `isRead` is absent rather than false on an unread article in some versions,
 * so nothing here may test it for equality with `false`.
 */
export interface RssArticle {
  id: string
  title: string
  /** The `.torrent` or magnet the item points at. */
  torrentURL: string
  /** The page a human would read. */
  link: string
  description?: string
  /** RFC 2822, as the feed published it. */
  date: string
  isRead?: boolean
  category?: string
  size?: number
  author?: string
}

/**
 * A feed as `rss/items?withData=true` reports it.
 *
 * The response is a tree keyed by name, and a folder is the same shape minus
 * `uid`, so `uid` is what tells the two apart. See `flattenFeeds`.
 */
export interface RssFeed {
  uid: string
  url: string
  title: string
  lastBuildDate: string
  isLoading: boolean
  hasError: boolean
  articles: RssArticle[]
}

/** A feed plus where it sits in the tree, which the API only encodes in keys. */
export interface RssFeedEntry extends RssFeed {
  /** The key path, which is also what `rss/removeItem` and friends take. */
  path: string
  /** The last segment, which is what a person calls the feed. */
  name: string
}

export interface RssRule {
  enabled: boolean
  mustContain: string
  mustNotContain: string
  useRegex: boolean
  episodeFilter: string
  smartFilter: boolean
  previouslyMatchedEpisodes: string[]
  affectedFeeds: string[]
  ignoreDays: number
  lastMatch: string
  addPaused: boolean | null
  assignedCategory: string
  savePath: string
}
