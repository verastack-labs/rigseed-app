/**
 * DHT, PeX and LSD are reported as trackers but are not ones.
 *
 * qBittorrent sends them in the same list and the stock client shows them, so
 * they stay visible. They are excluded from the tracker count and offer no
 * Remove, because neither is true of them.
 *
 * In its own module rather than beside the table, because a file exporting
 * both components and plain functions cannot be hot-reloaded: React Refresh
 * can preserve state across a swap only when it is sure nothing else in the
 * file was re-evaluated.
 */
export const isSynthetic = (url: string) => url.startsWith('** [')
