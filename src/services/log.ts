import type { LogEntry, LogLevel, PeerBan } from '@/types/qbittorrent'
import type { Transport } from '@/services/transport'

/** Which levels to ask for, as the four booleans the endpoint wants. */
export interface LevelFilter {
  normal: boolean
  info: boolean
  warning: boolean
  critical: boolean
}

const ALL: LevelFilter = { normal: true, info: true, warning: true, critical: true }

/**
 * The daemon's own log.
 *
 * `last_known_id` is the tail cursor: pass the highest id already held and the
 * answer contains only what arrived since. Pass -1 for everything the daemon
 * still has, which is what a cold load wants.
 *
 * The level flags are a server-side filter, and this app does not use them as
 * one. Asking for all four and filtering in the browser means muting a level
 * is instant and reversible without a round trip, and it keeps the tail cursor
 * honest: filtering server-side would advance `last_known_id` past entries the
 * user could then never see by unmuting.
 */
export function createLogApi(transport: Transport) {
  return {
    main: (lastKnownId = -1, levels: LevelFilter = ALL) =>
      transport.get<LogEntry[]>('log/main', {
        last_known_id: String(lastKnownId),
        normal: String(levels.normal),
        info: String(levels.info),
        warning: String(levels.warning),
        critical: String(levels.critical),
      }),

    peers: (lastKnownId = -1) =>
      transport.get<PeerBan[]>('log/peers', { last_known_id: String(lastKnownId) }),
  }
}

export type LogApi = ReturnType<typeof createLogApi>

/**
 * The log's `type` is a bitmask value, not an index.
 *
 * 1, 2, 4, 8 rather than 0, 1, 2, 3. Reading it as an index puts every warning
 * in the wrong bucket and silently loses critical entirely.
 */
export function levelOf(type: number): LogLevel {
  if (type === 8) return 'critical'
  if (type === 4) return 'warning'
  if (type === 2) return 'info'
  return 'normal'
}
