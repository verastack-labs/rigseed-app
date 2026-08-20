import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { IconTile } from '@/components/ui/icon-tile'
import { ProgressBar } from '@/components/ui/progress-bar'
import { icons } from '@/lib/icons'
import { type LayoutProps } from '@/features/transfers/row-menu'
import { TorrentLink } from '@/features/transfers/torrent-link'
import {
  STATE_PLAIN,
  formatEtaPlain,
  formatPercent,
  isComplete,
  isPaused,
  stateTone,
} from '@/utils/format'

/**
 * Easy. Big cards, plain language, few numbers.
 *
 * This is the layout the first-run ribbon recommends to newcomers, so the
 * rules are different rather than merely looser: no speeds, no sizes, no
 * ratio, one action, and every state described rather than named. The only
 * number on the card is the percentage, because that is the one a person
 * actually asked for.
 *
 * Targets are 44px rather than the 32px used elsewhere.
 */
export function TorrentEasy({ torrents, selected, onToggle, onResume, onPause }: LayoutProps) {
  return (
    <div className="grid grid-cols-1 gap-4 p-6 lg:grid-cols-2">
      {torrents.map((torrent) => {
        const paused = isPaused(torrent.state)
        const done = isComplete(torrent.progress)

        return (
          <Card key={torrent.hash} padding="section" className="relative">
            <div className="flex items-start gap-4">
              <span className="relative z-10 pt-1">
                <Checkbox
                  checked={selected.includes(torrent.hash)}
                  onChange={() => onToggle(torrent.hash)}
                  label={`Select ${torrent.name}`}
                  className="size-5"
                />
              </span>

              <IconTile size={46} tone={done ? 'accent2' : 'accent'}>
                <icons.folder className="size-6" strokeWidth={1.7} />
              </IconTile>

              <div className="flex min-w-0 flex-1 flex-col gap-2.5">
                <TorrentLink
                  stretch
                  hash={torrent.hash}
                  name={torrent.name}
                  className="truncate text-[15px] font-semibold"
                />

                <span
                  className={
                    stateTone(torrent.state) === 'muted'
                      ? 'text-[12.5px] text-text-dim'
                      : 'text-[12.5px] text-text'
                  }
                >
                  {done
                    ? 'Finished. Sharing with others.'
                    : paused
                      ? 'Paused'
                      : `${STATE_PLAIN[torrent.state]}, ${formatEtaPlain(torrent.eta)}`}
                </span>

                <ProgressBar
                  value={torrent.progress * 100}
                  paused={paused}
                  height={10}
                  label={torrent.name}
                />

                <div className="flex items-center gap-3">
                  <span className="text-[12.5px] text-text-dim">
                    {formatPercent(torrent.progress)} done
                  </span>
                  <span className="flex-1" />
                  <Button
                    size="md"
                    className="relative z-10 min-h-11"
                    onClick={() => (paused ? onResume([torrent.hash]) : onPause([torrent.hash]))}
                  >
                    {paused ? 'Resume' : 'Pause'}
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        )
      })}
    </div>
  )
}
