import { icons } from '@/lib/icons'
import { cn } from '@/lib/utils'
import type { ConnectionState } from '@/services/connect'

export interface ConnectionChipProps {
  state: ConnectionState
  onClick?: () => void
  className?: string
}

/**
 * What the app is talking to, or that it is not talking to anything.
 *
 * This slot used to print `127.0.0.1:8080` unconditionally, next to a green
 * icon, whether or not a daemon had ever answered. Every number on screen came
 * from the mock and the one thing claiming to describe the connection asserted
 * a healthy one. Falling back to sample data is a reasonable thing for the app
 * to do; saying so is the part that was missing.
 *
 * The tone carries the meaning for anyone not reading the label: accent2 for a
 * real connection, warn for sample data, dim while still trying.
 */
export function ConnectionChip({ state, onClick, className }: ConnectionChipProps) {
  const { label, tone, title } =
    state.status === 'connected'
      ? {
          label: state.label,
          tone: 'text-accent2',
          title: `qBittorrent ${state.version}, Web API ${state.webApiVersion}`,
        }
      : state.status === 'connecting'
        ? { label: 'Connecting…', tone: 'text-text-dimmer', title: 'Looking for a daemon' }
        : { label: 'Sample data', tone: 'text-warn', title: state.reason }

  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={cn(
        'bg-surface2 hover:bg-accent-soft flex items-center gap-2 rounded-lg px-2.5 py-1.5',
        'transition-colors duration-quick',
        className,
      )}
    >
      <icons.connections className={cn('size-[15px]', tone)} strokeWidth={2} />
      <span className="text-text font-mono text-[11.5px]">{label}</span>
    </button>
  )
}
