import { StatusDot, type StatusTone } from '@/components/ui/status-dot'
import { cn } from '@/lib/utils'
import type { ConnectionState } from '@/services/connect'

export interface FooterProps {
  /** Counts for the current screen, already formatted. */
  counts?: string
  /** The endpoints this screen exercises. Keep accurate: it is documentation. */
  api?: string
  /**
   * The app's connection.
   *
   * Not a boolean, because there are four answers and two of them are not
   * "connected or reconnecting": sitting on sample data is a different thing
   * from a dropped connection, and the footer used to call both of them
   * connected.
   */
  status?: ConnectionState['status'] | 'reconnecting'
  /** From app/version and app/webapiVersion at runtime. Omitted when unknown. */
  daemon?: string
  className?: string
}

const STATUS: Record<
  ConnectionState['status'] | 'reconnecting',
  { tone: StatusTone; label: string }
> = {
  connected: { tone: 'accent2', label: 'connected' },
  /**
   * Connected once, not answering now.
   *
   * The connection state is decided at startup and never revisited, so a
   * daemon that dies mid-session leaves it saying "connected" forever. This
   * comes from the poll loop instead, which is the only thing that finds out.
   */
  reconnecting: { tone: 'warn', label: 'reconnecting…' },
  connecting: { tone: 'muted', label: 'connecting' },
  mock: { tone: 'warn', label: 'sample data' },
  failed: { tone: 'warn', label: 'not connected' },
}

/**
 * The status footer.
 *
 * Both slots used to be fabricated: the tick read "connected" from a default
 * argument and the version read `qbittorrent-nox 5.2.3 / api 2.11.2` from a
 * string in this file, on every screen, whether or not a daemon had ever
 * answered. Measured against a real daemon the hardcoded version was wrong as
 * well as invented. Neither has a default now, so a caller that says nothing
 * gets "connecting" and an empty version rather than a confident lie.
 */
export function Footer({ counts, api, status = 'connecting', daemon, className }: FooterProps) {
  const { tone, label } = STATUS[status]

  return (
    <footer
      className={cn(
        'bg-sidebar border-line text-text-dimmer flex h-[34px] shrink-0 items-center gap-4',
        'border-t px-[18px] font-mono text-[10.5px]',
        className,
      )}
    >
      <StatusDot
        tone={tone}
        label={label}
        pulse={status === 'connecting' || status === 'reconnecting'}
        mono
      />
      {counts ? <span>{counts}</span> : null}
      {api ? <span className="truncate">{api}</span> : null}
      <span className="flex-1" />
      {daemon ? <span className="shrink-0">{daemon}</span> : null}
    </footer>
  )
}
