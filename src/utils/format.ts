import { ETA_INFINITE, type TorrentState } from '@/types/qbittorrent'

/**
 * Formatting for the mono column.
 *
 * Two registers, deliberately. The dense layouts print exact values, because
 * the audience reads them as data. The Easy layout prints plain language,
 * because "ETA 4m12s" asks a newcomer to learn a notation before they can know
 * how long to wait.
 */

const UNITS = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'] as const

/** Sizes, in the base-1000 units the daemon and the design both use. */
export function formatBytes(bytes: number, decimals = 2): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B'
  const i = Math.min(UNITS.length - 1, Math.floor(Math.log(bytes) / Math.log(1000)))
  const value = bytes / 1000 ** i
  // Bytes are never fractional, and a large number needs fewer decimals to
  // stay readable in a column. `decimals` is a ceiling rather than a target,
  // so asking for none gets none: free space is a rough figure and "412.0 GB"
  // implies a precision the number does not have.
  const places = Math.min(decimals, i === 0 ? 0 : value >= 100 ? 1 : decimals)
  return `${value.toFixed(places)} ${UNITS[i]}`
}

export function formatSpeed(bytesPerSecond: number): string {
  if (!Number.isFinite(bytesPerSecond) || bytesPerSecond <= 0) return '0 B/s'
  return `${formatBytes(bytesPerSecond, 1)}/s`
}

/** Exact ETA, for the dense layouts. */
export function formatEta(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds <= 0 || seconds >= ETA_INFINITE) return '∞'
  const d = Math.floor(seconds / 86400)
  const h = Math.floor((seconds % 86400) / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = Math.floor(seconds % 60)
  if (d) return `${d}d ${h}h`
  if (h) return `${h}h ${m}m`
  if (m) return `${m}m ${s}s`
  return `${s}s`
}

/**
 * Plain-language ETA for the Easy layout.
 *
 * Rounded, spelled out, and never a notation. A newcomer wants to know whether
 * to wait or come back later, not the exact second.
 */
export function formatEtaPlain(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds <= 0 || seconds >= ETA_INFINITE) return 'no estimate'
  if (seconds < 60) return 'less than a minute left'
  const minutes = Math.round(seconds / 60)
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? '' : 's'} left`
  const hours = Math.round(seconds / 3600)
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} left`
  const days = Math.round(seconds / 86400)
  return `${days} day${days === 1 ? '' : 's'} left`
}

export function formatRatio(ratio: number): string {
  if (!Number.isFinite(ratio) || ratio < 0) return '0.00'
  return ratio >= 100 ? '∞' : ratio.toFixed(2)
}

export function formatPercent(progress: number): string {
  const pct = Math.max(0, Math.min(1, Number.isFinite(progress) ? progress : 0)) * 100
  return `${pct.toFixed(pct >= 100 || pct === 0 ? 0 : 1)}%`
}

/** The word beside a status dot. Never the raw API state. */
export const STATE_LABEL: Record<TorrentState, string> = {
  downloading: 'downloading',
  stalledDL: 'stalled',
  metaDL: 'fetching metadata',
  forcedDL: 'downloading',
  uploading: 'seeding',
  stalledUP: 'seeding',
  forcedUP: 'seeding',
  pausedDL: 'paused',
  pausedUP: 'paused',
  stoppedDL: 'paused',
  stoppedUP: 'paused',
  queuedDL: 'queued',
  queuedUP: 'queued',
  checkingDL: 'checking',
  checkingUP: 'checking',
  checkingResumeData: 'checking',
  error: 'error',
  missingFiles: 'missing files',
  moving: 'moving',
  allocating: 'allocating',
  unknown: 'unknown',
}

/**
 * Plain-language state for the Easy layout.
 *
 * "Stalled" is jargon: it means connected but nothing is arriving. Saying
 * "waiting for people to share" describes the situation instead of naming it.
 */
export const STATE_PLAIN: Record<TorrentState, string> = {
  downloading: 'downloading',
  stalledDL: 'waiting for people to share',
  metaDL: 'looking up details',
  forcedDL: 'downloading',
  uploading: 'sharing with others',
  stalledUP: 'sharing with others',
  forcedUP: 'sharing with others',
  pausedDL: 'paused',
  pausedUP: 'paused',
  stoppedDL: 'paused',
  stoppedUP: 'paused',
  queuedDL: 'waiting its turn',
  queuedUP: 'waiting its turn',
  checkingDL: 'checking the files',
  checkingUP: 'checking the files',
  checkingResumeData: 'checking the files',
  error: 'something went wrong',
  missingFiles: 'files are missing',
  moving: 'moving the files',
  allocating: 'making room',
  unknown: 'unknown',
}

/**
 * Paused, by either name.
 *
 * 5.x renamed the state to `stopped*` alongside the endpoint rename this
 * client already handles. Matching only `paused*` made every stopped torrent
 * on a modern daemon read as running: no word beside its status dot, since
 * the label maps had no entry; no muted tone; excluded from the Paused
 * filter; and the pause control offering to pause something already stopped.
 *
 * Both prefixes rather than a version check, because the state arrives on the
 * torrent and does not need one, and a user can point rigseed at a 4.x daemon
 * from the Connections screen at any time.
 */
export const isPaused = (state: TorrentState) =>
  state.startsWith('paused') || state.startsWith('stopped')
export const isSeeding = (state: TorrentState) =>
  state === 'uploading' || state === 'stalledUP' || state === 'forcedUP'
export const isComplete = (progress: number) => progress >= 1
export const isStalled = (state: TorrentState) => state === 'stalledDL' || state === 'stalledUP'
export const isActive = (t: { dlspeed: number; upspeed: number }) => t.dlspeed > 0 || t.upspeed > 0

/** The tone a status dot takes. Paused and stalled are never accent coloured. */
export function stateTone(state: TorrentState): 'accent' | 'accent2' | 'warn' | 'danger' | 'muted' {
  if (state === 'error' || state === 'missingFiles') return 'danger'
  if (isPaused(state)) return 'muted'
  if (isStalled(state)) return 'muted'
  if (isSeeding(state)) return 'accent2'
  if (state === 'moving' || state === 'allocating') return 'warn'
  return 'accent'
}
