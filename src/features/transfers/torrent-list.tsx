import { Checkbox } from '@/components/ui/checkbox'
import { DataValue } from '@/components/ui/data-value'
import { ProgressBar } from '@/components/ui/progress-bar'
import { icons } from '@/lib/icons'
import { cn } from '@/lib/utils'
import { RowMenu, type LayoutProps } from '@/features/transfers/row-menu'
import { TorrentLink } from '@/features/transfers/torrent-link'
import { formatBytes, formatSpeed, isPaused } from '@/utils/format'

/**
 * List. Dense rows for large libraries.
 *
 * A six column grid rather than a table, because the columns are fixed widths
 * around one flexible name and a table would fight that. Numbers are right
 * aligned and tabular so they read down the column.
 */
export function TorrentList({ torrents, selected, onToggle, ...actions }: LayoutProps) {
  return (
    <div className="flex flex-col px-6 py-3">
      <div
        className="grid items-center gap-3 px-2 pb-2 text-[10.5px] font-bold tracking-[0.07em] text-text-dimmer uppercase"
        style={{ gridTemplateColumns: '1fr 90px 150px 90px 90px 28px' }}
      >
        <span>Name</span>
        <span className="text-right">Size</span>
        <span>Progress</span>
        <span className="text-right">Down</span>
        <span className="text-right">Up</span>
        <span />
      </div>

      {torrents.map((torrent) => {
        const paused = isPaused(torrent.state)
        return (
          <div
            key={torrent.hash}
            data-context-target
            className={cn(
              'relative grid items-center gap-3 rounded-md px-2',
              'transition-colors duration-quick hover:bg-surface2',
              'min-h-10',
            )}
            style={{ gridTemplateColumns: '1fr 90px 150px 90px 90px 28px' }}
          >
            <div className="flex min-w-0 items-center gap-2.5">
              <span className="relative z-10 flex">
                <Checkbox
                  checked={selected.includes(torrent.hash)}
                  onChange={() => onToggle(torrent.hash)}
                  label={`Select ${torrent.name}`}
                />
              </span>
              <icons.folder className="size-[15px] shrink-0 text-text-dim" strokeWidth={2} />
              <TorrentLink
                stretch
                hash={torrent.hash}
                name={torrent.name}
                className="truncate text-[13.5px]"
              />
            </div>

            <DataValue size="md" tone="dim" className="text-right">
              {formatBytes(torrent.size)}
            </DataValue>

            <ProgressBar
              value={torrent.progress * 100}
              paused={paused}
              showValue
              height={4}
              label={torrent.name}
            />

            <DataValue size="md" tone={paused ? 'dimmer' : 'accent'} className="text-right">
              {formatSpeed(torrent.dlspeed)}
            </DataValue>
            <DataValue size="md" tone={paused ? 'dimmer' : 'accent2'} className="text-right">
              {formatSpeed(torrent.upspeed)}
            </DataValue>

            <RowMenu torrent={torrent} actions={actions} />
          </div>
        )
      })}
    </div>
  )
}
