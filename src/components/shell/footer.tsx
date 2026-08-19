import { StatusDot } from '@/components/ui/status-dot'
import { cn } from '@/lib/utils'

export interface FooterProps {
  /** Counts for the current screen, already formatted. */
  counts?: string
  /** The endpoints this screen exercises. Keep accurate: it is documentation. */
  api?: string
  connected?: boolean
  /** From app/version and app/webapiVersion at runtime. */
  daemon?: string
  className?: string
}

/**
 * The status footer.
 *
 * On connection loss the tick turns warn and reads "reconnecting", and the app
 * keeps the last known data on screen rather than blanking it.
 */
export function Footer({
  counts,
  api,
  connected = true,
  daemon = 'qbittorrent-nox 5.2.3 / api 2.11.2',
  className,
}: FooterProps) {
  return (
    <footer
      className={cn(
        'bg-sidebar border-line text-text-dimmer flex h-[34px] shrink-0 items-center gap-4',
        'border-t px-[18px] font-mono text-[10.5px]',
        className,
      )}
    >
      <StatusDot
        tone={connected ? 'accent2' : 'warn'}
        label={connected ? 'connected' : 'reconnecting'}
        pulse={!connected}
        mono
      />
      {counts ? <span>{counts}</span> : null}
      {api ? <span className="truncate">{api}</span> : null}
      <span className="flex-1" />
      <span className="shrink-0">{daemon}</span>
    </footer>
  )
}
