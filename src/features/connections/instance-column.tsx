import { IconButton } from '@/components/ui/icon-button'
import { SectionHeader } from '@/components/ui/section-header'
import { icons } from '@/lib/icons'
import { cn } from '@/lib/utils'
import { addressOf, type Connection } from '@/state/connection-store'

/**
 * How the connection rigseed is currently using is doing.
 *
 * Only the active one has a health, because only it has been contacted.
 * Showing a green dot beside a saved connection nobody has spoken to since
 * last week would be a guess dressed up as a fact.
 */
export type InstanceHealth = 'connected' | 'connecting' | 'failed' | 'mock'

export interface BuiltInInstance {
  label: string
  /** Host and port once it is known, or a word about why it is not. */
  address: string
}

export interface InstanceColumnProps {
  /**
   * rigseed's own daemon.
   *
   * Not a stored connection and never becomes one: its port is chosen at run
   * time and its password is generated, so there is nothing here for a user
   * to edit and nothing worth writing to disk.
   */
  builtIn: BuiltInInstance
  connections: readonly Connection[]
  /** Which row the pane on the right is showing. Null is the built-in one. */
  selectedId: string | null
  /** Which one the app is connected through. Null is the built-in one. */
  activeId: string | null
  health: InstanceHealth
  onSelect: (id: string | null) => void
  onAdd: () => void
  className?: string
}

const DOT: Record<InstanceHealth, string> = {
  connected: 'bg-ok',
  connecting: 'bg-warn',
  failed: 'bg-danger',
  mock: 'bg-text-dimmer',
}

const HEALTH_LABEL: Record<InstanceHealth, string> = {
  connected: 'connected',
  connecting: 'connecting',
  failed: 'not reachable',
  mock: 'sample data',
}

interface RowProps {
  label: string
  address: string
  selected: boolean
  active: boolean
  health: InstanceHealth
  onSelect: () => void
}

function Row({ label, address, selected, active, health, onSelect }: RowProps) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onSelect}
      className={cn(
        'flex items-center gap-2.5 rounded-lg px-[9px] py-2 text-left',
        'transition-colors duration-quick',
        selected ? 'bg-accent-soft' : 'hover:bg-surface2',
      )}
    >
      <span
        aria-label={active ? HEALTH_LABEL[health] : 'not in use'}
        className={cn(
          'size-[7px] shrink-0 rounded-full',
          // A saved connection nobody is talking to has no colour to earn.
          active ? DOT[health] : 'bg-line',
        )}
      />
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span
          className={cn(
            'truncate text-[12.5px]',
            active ? 'font-semibold text-text' : 'text-text-dim',
          )}
        >
          {label}
        </span>
        <span className="truncate font-mono text-[10px] text-text-dimmer">{address}</span>
      </span>
      {active ? (
        <span className="shrink-0 rounded-chip bg-accent-soft px-1.5 py-0.5 text-[10px] font-semibold text-accent">
          In use
        </span>
      ) : null}
    </button>
  )
}

/**
 * The instances rigseed knows about, one column.
 *
 * Two things are marked and they are not the same thing: which row the pane
 * is showing, and which connection the app is running on. Reading a
 * connection is not switching to it, and a list that only marked one of the
 * two would make every click look like it had reconnected the app.
 */
export function InstanceColumn({
  builtIn,
  connections,
  selectedId,
  activeId,
  health,
  onSelect,
  onAdd,
  className,
}: InstanceColumnProps) {
  return (
    <div
      className={cn(
        'flex w-[300px] shrink-0 flex-col gap-4 overflow-y-auto border-r border-line bg-sidebar px-3 py-3.5',
        className,
      )}
    >
      <div className="flex items-center gap-1.5 px-[9px]">
        <h1 className="flex-1 text-[22px] leading-none font-semibold text-text">Connections</h1>
        <IconButton title="Add a connection" onClick={onAdd}>
          <icons.download className="size-[15px] rotate-180" strokeWidth={2} />
        </IconButton>
      </div>

      <div className="flex flex-col gap-1">
        <SectionHeader className="px-[9px] pb-1">This computer</SectionHeader>
        <Row
          label={builtIn.label}
          address={builtIn.address}
          selected={selectedId === null}
          active={activeId === null}
          health={health}
          onSelect={() => onSelect(null)}
        />
      </div>

      <div className="flex flex-col gap-1">
        <SectionHeader className="px-[9px] pb-1">Elsewhere</SectionHeader>
        {connections.length === 0 ? (
          <p className="px-[9px] py-2 text-[11.5px] leading-[1.5] text-text-dim">
            No other instances yet. Add one to drive a qBittorrent running on another machine.
          </p>
        ) : (
          connections.map((connection) => (
            <Row
              key={connection.id}
              label={connection.label}
              address={addressOf(connection)}
              selected={selectedId === connection.id}
              active={activeId === connection.id}
              health={health}
              onSelect={() => onSelect(connection.id)}
            />
          ))
        )}
      </div>

      <span className="flex-1" />

      <div className="px-[9px]">
        <span className="font-mono text-[10.5px] text-text-dimmer tabular-nums">
          {connections.length + 1} instance{connections.length === 0 ? '' : 's'}
        </span>
      </div>
    </div>
  )
}
