import { MoreVertical } from 'lucide-react'
import { useState } from 'react'

import { Button } from '@/components/ui/button'
import { ContextMenu } from '@/components/ui/context-menu'
import { TabBar, type Tab } from '@/components/ui/tab-bar'
import { icons } from '@/lib/icons'
import { cn } from '@/lib/utils'
import type { Torrent } from '@/types/qbittorrent'
import { isPaused } from '@/utils/format'

export const DETAIL_TABS = ['general', 'files', 'trackers', 'peers', 'speed'] as const
export type DetailTab = (typeof DETAIL_TABS)[number]

export interface DetailHeaderProps {
  torrent: Torrent
  tab: DetailTab
  onTab: (next: DetailTab) => void
  /** Counts for the tab badges. Absent while the tab's data is still loading. */
  counts?: Partial<Record<DetailTab, number>>
  onPauseResume: () => void
  onRecheck: () => void
  onReannounce: () => void
  onCopyMagnet: () => void
  onRemove: () => void
  className?: string
}

/**
 * Tabs and the torrent's own actions, sharing one row.
 *
 * The actions sit here rather than in the title block because they act on the
 * torrent regardless of which tab is showing, and a control that moves as you
 * navigate is a control you have to look for each time.
 */
export function DetailHeader({
  torrent,
  tab,
  onTab,
  counts,
  onPauseResume,
  onRecheck,
  onReannounce,
  onCopyMagnet,
  onRemove,
  className,
}: DetailHeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false)
  const paused = isPaused(torrent.state)

  // The key is omitting `count` rather than passing undefined. Not loaded yet
  // and genuinely zero are different claims, and a Peers badge reading 0
  // before its first poll is one the app has not earned.
  const withCount = (value: DetailTab, label: string, count?: number): Tab<DetailTab> =>
    count === undefined ? { value, label } : { value, label, count }

  const tabs: Tab<DetailTab>[] = [
    withCount('general', 'General'),
    withCount('files', 'Files', counts?.files),
    withCount('trackers', 'Trackers', counts?.trackers),
    withCount('peers', 'Peers', counts?.peers),
    withCount('speed', 'Speed'),
  ]

  return (
    <div
      className={cn('flex items-center gap-4 border-b border-line bg-sidebar px-[18px]', className)}
    >
      <TabBar
        label="Torrent detail"
        tabs={tabs}
        value={tab}
        onChange={(next) => onTab(next as DetailTab)}
      />

      <span className="flex-1" />

      <div className="flex shrink-0 items-center gap-2">
        <Button variant="primary" size="sm" onClick={onPauseResume}>
          {paused ? (
            <icons.resume className="size-[13px]" strokeWidth={2.2} />
          ) : (
            <icons.pause className="size-[13px]" strokeWidth={2.2} />
          )}
          {paused ? 'Resume' : 'Pause'}
        </Button>

        <Button variant="secondary" size="sm" onClick={onRecheck}>
          Recheck
        </Button>

        <div className={cn('relative shrink-0', menuOpen && 'z-30')}>
          <button
            type="button"
            title={`Actions for ${torrent.name}`}
            aria-label={`Actions for ${torrent.name}`}
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((v) => !v)}
            className="flex size-[30px] items-center justify-center rounded-lg border border-line bg-surface2 text-text-dim transition-colors duration-quick hover:text-accent"
          >
            <MoreVertical className="size-4" strokeWidth={2} />
          </button>
          <ContextMenu
            open={menuOpen}
            onClose={() => setMenuOpen(false)}
            label={torrent.name}
            items={[
              { label: 'Force recheck', onSelect: onRecheck },
              { label: 'Reannounce to trackers', onSelect: onReannounce },
              { separator: true as const },
              { label: 'Copy magnet link', onSelect: onCopyMagnet },
              { separator: true as const },
              { label: 'Remove torrent', danger: true, onSelect: onRemove },
            ]}
          />
        </div>
      </div>
    </div>
  )
}
