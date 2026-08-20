import { Card } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { DataValue } from '@/components/ui/data-value'
import { IconTile } from '@/components/ui/icon-tile'
import { ProgressBar } from '@/components/ui/progress-bar'
import { StatusDot } from '@/components/ui/status-dot'
import { RowMenu, type LayoutProps } from '@/features/transfers/row-menu'
import { TorrentLink } from '@/features/transfers/torrent-link'
import { icons } from '@/lib/icons'
import { STATE_LABEL, formatPercent, formatSpeed, isPaused, stateTone } from '@/utils/format'

/** Grid, the default layout. Balanced cards with progress and speeds. */
export function TorrentGrid({ torrents, selected, onToggle, ...actions }: LayoutProps) {
  return (
    <div className="grid grid-cols-1 gap-3.5 p-6 md:grid-cols-2 xl:grid-cols-3">
      {torrents.map((torrent) => (
        <Card
          data-context-target
          key={torrent.hash}
          hoverable
          padding="card"
          className="relative overflow-visible"
        >
          <div className="flex flex-col gap-2.5">
            {/* Centred, not top-aligned. The four things on this row are a
                checkbox, a 26px tile, one line of text and a 24px button, and
                nudging each one down by a different amount to fake alignment
                is what the pt-0.5 and pt-1 here used to be doing. */}
            <div className="flex items-center gap-2.5">
              <span className="relative z-10 flex">
                <Checkbox
                  checked={selected.includes(torrent.hash)}
                  onChange={() => onToggle(torrent.hash)}
                  label={`Select ${torrent.name}`}
                />
              </span>
              <IconTile size={26}>
                <icons.folder className="size-[13px]" strokeWidth={2} />
              </IconTile>
              <TorrentLink
                stretch
                hash={torrent.hash}
                name={torrent.name}
                className="min-w-0 flex-1 truncate text-[14px] font-semibold"
              />
              <RowMenu torrent={torrent} actions={actions} />
            </div>

            <StatusDot tone={stateTone(torrent.state)} label={STATE_LABEL[torrent.state]} />

            <ProgressBar
              value={torrent.progress * 100}
              paused={isPaused(torrent.state)}
              label={torrent.name}
            />

            <div className="flex items-center gap-3">
              <DataValue size="md" tone={isPaused(torrent.state) ? 'dimmer' : 'accent'}>
                {formatSpeed(torrent.dlspeed)}
              </DataValue>
              <DataValue size="md" tone={isPaused(torrent.state) ? 'dimmer' : 'accent2'}>
                {formatSpeed(torrent.upspeed)}
              </DataValue>
              <span className="flex-1" />
              <DataValue size="md" tone="dim">
                {formatPercent(torrent.progress)}
              </DataValue>
            </div>
          </div>
        </Card>
      ))}
    </div>
  )
}
