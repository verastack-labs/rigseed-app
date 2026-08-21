import { Button } from '@/components/ui/button'
import { icons, instanceKind } from '@/lib/icons'
import { cn } from '@/lib/utils'

/**
 * What a connection is known to be doing.
 *
 * `unknown` is its own answer rather than a shade of offline. A saved
 * connection nobody has contacted is not down, and saying so would send
 * somebody looking for a fault that is not there. It takes the same neutral
 * colour offline does, so the list still reads at a glance, and differs only
 * in the word.
 */
export type InstanceStatus = 'online' | 'offline' | 'refused' | 'connecting' | 'unknown'

export interface Instance {
  /** Null for the built-in daemon, which is not a stored connection. */
  id: string | null
  label: string
  /** Host and port, or a word about why it is not known. */
  host: string
  status: InstanceStatus
  /** `active now`, `2m ago`, `not tested`. */
  meta: string
  bundled: boolean
}

export interface InstanceColumnProps {
  instances: readonly Instance[]
  /** Which row the pane on the right is showing. */
  selectedId: string | null
  /** Which one the app is connected through. Null is the built-in one. */
  activeId: string | null
  /** True while the pane is showing a connection that does not exist yet. */
  adding: boolean
  onSelect: (id: string | null) => void
  onAdd: () => void
  className?: string
}

const STATUS: Record<InstanceStatus, { tone: string; label: string }> = {
  online: { tone: 'text-ok', label: 'Online' },
  connecting: { tone: 'text-warn', label: 'Connecting' },
  refused: { tone: 'text-danger', label: 'Refused' },
  offline: { tone: 'text-text-dimmer', label: 'Offline' },
  unknown: { tone: 'text-text-dimmer', label: 'Not tested' },
}

/**
 * Every instance rigseed can drive.
 *
 * Two things are marked and they are not the same thing: which row the pane
 * is showing, and which connection the app is running on. Reading a
 * connection is not switching to it, so selection moves the border and being
 * active fills the icon tile with the accent. A list that marked only one of
 * the two would make every click look like it had reconnected the app.
 */
export function InstanceColumn({
  instances,
  selectedId,
  activeId,
  adding,
  onSelect,
  onAdd,
  className,
}: InstanceColumnProps) {
  const bundledCount = instances.filter((one) => one.bundled).length

  return (
    <div
      className={cn('flex w-[420px] shrink-0 flex-col border-r border-line bg-sidebar', className)}
    >
      <div className="flex shrink-0 flex-col gap-[7px] px-5 pt-5 pb-3.5">
        <h1 className="text-[26px] leading-none font-semibold tracking-[-0.018em] text-text">
          Connections
        </h1>
        <span className="text-[12.5px] leading-[1.5] text-pretty text-text-dim">
          Every instance this app can drive. The bundled one runs on this machine; the rest are
          qBittorrent instances you reach over the network.
        </span>
      </div>

      <div className="shrink-0 px-5 pb-3.5">
        <Button
          variant="primary"
          fullWidth
          onClick={onAdd}
          icon={<icons.add className="size-[14px]" strokeWidth={2.4} />}
        >
          Add a connection
        </Button>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-1.5 overflow-y-auto px-3 pb-3">
        {instances.map((instance) => {
          const selected = !adding && selectedId === instance.id
          const active = activeId === instance.id
          const status = STATUS[instance.status]
          const Icon = icons[instanceKind(instance.host, instance.bundled)]

          return (
            <button
              key={instance.id ?? 'built-in'}
              type="button"
              aria-pressed={selected}
              onClick={() => onSelect(instance.id)}
              className={cn(
                'flex items-center gap-3 rounded-[11px] border px-[13px] py-3 text-left',
                'transition-colors duration-quick',
                selected
                  ? 'border-accent bg-accent-soft'
                  : 'border-line bg-surface hover:border-accent',
              )}
            >
              <span
                className={cn(
                  'flex size-[34px] shrink-0 items-center justify-center rounded-[9px]',
                  // Filled for the connection in use, so active and merely
                  // selected stay distinguishable.
                  active ? 'bg-accent-soft text-accent' : 'bg-surface2 text-text-dim',
                )}
              >
                <Icon className="size-4" strokeWidth={2} />
              </span>

              <span className="flex min-w-0 flex-1 flex-col gap-1">
                <span className="flex items-center gap-2">
                  <span className="truncate text-[13px] font-semibold text-text">
                    {instance.label}
                  </span>
                  {instance.bundled ? (
                    <span className="shrink-0 rounded border border-line bg-surface2 px-1.5 py-0.5 text-[9px] font-bold tracking-[0.07em] text-text-dimmer uppercase">
                      Bundled
                    </span>
                  ) : null}
                </span>
                <span className="truncate font-mono text-[11px] text-text-dimmer">
                  {instance.host}
                </span>
              </span>

              <span className="flex shrink-0 flex-col items-end gap-[5px]">
                <span
                  className={cn(
                    'inline-flex items-center gap-1.5 text-[10.5px] font-semibold',
                    status.tone,
                  )}
                >
                  <span className="size-[7px] rounded-full bg-current" />
                  {status.label}
                </span>
                <span className="font-mono text-[10.5px] text-text-dimmer">{instance.meta}</span>
              </span>
            </button>
          )
        })}
      </div>

      <div className="flex shrink-0 items-center gap-3.5 border-t border-line px-5 py-[11px] font-mono text-[10.5px] text-text-dimmer">
        <span className="tabular-nums">
          {instances.length} connection{instances.length === 1 ? '' : 's'} · {bundledCount} bundled
        </span>
        <span className="flex-1" />
        <span>app-local · keychain</span>
      </div>
    </div>
  )
}
