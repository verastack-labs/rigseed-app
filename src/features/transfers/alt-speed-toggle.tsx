import { icons } from '@/lib/icons'
import { cn } from '@/lib/utils'

export interface AltSpeedToggleProps {
  /** From `server_state.use_alt_speed_limits` on the sync payload. */
  active: boolean
  onToggle: () => void
  /** True while the daemon is not answering. Switching mode is a write. */
  offline?: boolean
  className?: string
}

/**
 * The alternative speed limits switch.
 *
 * qBittorrent's second set of global limits, which most clients call the
 * turtle. It is not a pause and not a per-torrent limit: it swaps the whole
 * daemon between `dl_limit` / `up_limit` and `alt_dl_limit` / `alt_up_limit`
 * in one call, which is why it belongs beside the view controls rather than
 * in the toolbar's row of actions on selected torrents.
 *
 * The state comes from the sync payload rather than from
 * `transfer/speedLimitsMode`, so the button follows a change made anywhere
 * else without a poll of its own: the daemon's own scheduler flips this on a
 * timetable, and another client can flip it too.
 *
 * The icon carries the meaning and the word carries it again. A turtle at 15px
 * is not self-evident to somebody who has not met the convention, and the
 * status rules do not allow a control whose only signal is its colour.
 */
export function AltSpeedToggle({ active, onToggle, offline, className }: AltSpeedToggleProps) {
  const Icon = active ? icons.turtle : icons.rabbit

  return (
    <button
      type="button"
      role="switch"
      aria-checked={active}
      aria-label="Alternative speed limits"
      disabled={offline}
      onClick={onToggle}
      title={
        offline
          ? 'The daemon is not answering'
          : active
            ? 'Alternative limits are on. Switch back to the normal ones.'
            : 'Switch to the alternative speed limits.'
      }
      className={cn(
        'flex shrink-0 items-center gap-1.5 rounded-lg border px-2.5 py-1.5',
        'text-[11.5px] font-semibold transition-colors duration-quick',
        'disabled:pointer-events-none disabled:opacity-45',
        active
          ? 'border-accent bg-accent-soft text-accent'
          : 'border-line bg-surface2 text-text-dim hover:bg-accent-soft hover:text-accent',
        className,
      )}
    >
      <Icon className="size-[15px]" strokeWidth={2} />
      {/* The word goes when the window cannot carry it, never the icon. The
          accessible name and the title both stay, so the only thing lost is
          the glance, and only at a width where the alternative is a toolbar
          that overflows. */}
      <span className="hidden xl:inline">{active ? 'Limited' : 'Full speed'}</span>
    </button>
  )
}
