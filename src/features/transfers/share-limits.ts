import { LIMIT_UNLIMITED, SHARE_LIMIT_GLOBAL } from '@/types/qbittorrent'
import type { ShareLimitMode, Torrent } from '@/types/qbittorrent'

/**
 * The wire's sentinels, read and written as a choice a person made.
 *
 * `-2`, `-1` and a number are one field on the wire and three different
 * sentences in the UI: follow the daemon's setting, never stop, or stop at
 * this. Collapsing them, which any "is it -1?" check does, loses the one
 * distinction that matters most: a torrent following a global limit will
 * change behaviour when somebody edits Settings, and one set to unlimited
 * will not.
 */

/** Which of the three choices a wire value represents. */
export function modeOf(value: number): ShareLimitMode {
  if (value === SHARE_LIMIT_GLOBAL) return 'global'
  if (value === LIMIT_UNLIMITED) return 'unlimited'
  return 'custom'
}

/**
 * The wire value for a chosen mode.
 *
 * A custom mode with nothing usable typed into it falls back to following the
 * global limit rather than to unlimited. Both are defensible; this one is the
 * conservative reading, because "no limit" is a decision to seed forever and
 * an empty box is not a decision at all.
 */
export function wireValue(mode: ShareLimitMode, custom: number): number {
  if (mode === 'global') return SHARE_LIMIT_GLOBAL
  if (mode === 'unlimited') return LIMIT_UNLIMITED
  return Number.isFinite(custom) && custom > 0 ? custom : SHARE_LIMIT_GLOBAL
}

/**
 * What the daemon will actually enforce, in words.
 *
 * Reads the resolved `max_*` field rather than the setting, which is the whole
 * reason both exist. A torrent set to follow a global limit that is switched
 * off is not limited at all, and saying "global limit" and stopping there
 * would leave somebody believing a cap is in place that is not.
 */
export function describeEffective(resolved: number | undefined, unit: 'ratio' | 'minutes'): string {
  if (resolved === undefined || resolved === LIMIT_UNLIMITED || resolved === SHARE_LIMIT_GLOBAL) {
    return 'nothing will stop it'
  }
  return unit === 'ratio' ? `stops at ratio ${resolved}` : `stops after ${humanMinutes(resolved)}`
}

/**
 * Minutes as something readable, because the wire's unit is not the reader's.
 *
 * qBittorrent's own dialog says minutes and this keeps that as the input unit
 * for the same reason `LimitField` keeps KiB/s: a number copied across from it
 * has to mean the same thing. Only the summary translates.
 */
export function humanMinutes(minutes: number): string {
  if (minutes < 60) return `${minutes} min`
  const hours = minutes / 60
  if (hours < 24) return `${trim(hours)} h`
  return `${trim(hours / 24)} d`
}

/** One decimal at most, and no trailing `.0`. */
function trim(value: number): string {
  return String(Math.round(value * 10) / 10)
}

/** Everything `torrents/setShareLimits` needs, as the dialog holds it. */
export interface ShareLimitDraft {
  ratioMode: ShareLimitMode
  ratio: string
  seedingMode: ShareLimitMode
  seedingMinutes: string
  inactiveMode: ShareLimitMode
  inactiveMinutes: string
  action: NonNullable<Torrent['share_limit_action']>
}

/**
 * A torrent's current limits, as a draft the dialog can edit.
 *
 * Reads the settings, never the resolved values. Filling the inputs from
 * `max_ratio` would quietly rewrite a torrent that follows the global limit
 * into one that is explicitly unlimited the moment anything was saved, which
 * is a change nobody asked for and one the UI would not have shown.
 */
export function draftFrom(torrent: Torrent): ShareLimitDraft {
  const inactive = torrent.inactive_seeding_time_limit ?? SHARE_LIMIT_GLOBAL
  return {
    ratioMode: modeOf(torrent.ratio_limit),
    ratio: modeOf(torrent.ratio_limit) === 'custom' ? String(torrent.ratio_limit) : '',
    seedingMode: modeOf(torrent.seeding_time_limit),
    seedingMinutes:
      modeOf(torrent.seeding_time_limit) === 'custom' ? String(torrent.seeding_time_limit) : '',
    inactiveMode: modeOf(inactive),
    inactiveMinutes: modeOf(inactive) === 'custom' ? String(inactive) : '',
    action: torrent.share_limit_action ?? 'Default',
  }
}

/**
 * The draft as the four parameters the endpoint demands.
 *
 * All four go every time. `torrents/setShareLimits` overwrites every limit it
 * is given with no way to change one and leave the others, so a call built
 * from a partial draft would silently reset the fields it left out.
 */
export function toWire(draft: ShareLimitDraft) {
  return {
    ratioLimit: wireValue(draft.ratioMode, Number(draft.ratio)),
    seedingTimeLimit: wireValue(draft.seedingMode, Number(draft.seedingMinutes)),
    inactiveSeedingTimeLimit: wireValue(draft.inactiveMode, Number(draft.inactiveMinutes)),
    shareLimitAction: draft.action,
  }
}

/**
 * Whether a draft differs from what the torrent already has.
 *
 * The dialog writes on every change, and a write that changes nothing is still
 * a write: it reaches the daemon, it can fail, and it would report a failure
 * for something the user did not do. Comparing the wire forms rather than the
 * drafts means an empty custom box and an explicit global read as equal,
 * because they are.
 */
export function changed(draft: ShareLimitDraft, torrent: Torrent): boolean {
  const next = toWire(draft)
  const now = toWire(draftFrom(torrent))
  return (
    next.ratioLimit !== now.ratioLimit ||
    next.seedingTimeLimit !== now.seedingTimeLimit ||
    next.inactiveSeedingTimeLimit !== now.inactiveSeedingTimeLimit ||
    next.shareLimitAction !== now.shareLimitAction
  )
}
