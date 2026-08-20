import { MoreVertical } from 'lucide-react'

import { ContextMenu } from '@/components/ui/context-menu'
import { usePointerMenu } from '@/lib/use-pointer-menu'
import { cn } from '@/lib/utils'
import { canReachDesktop, revealInFolder } from '@/services/shell'
import type { Torrent } from '@/types/qbittorrent'

export interface TorrentActions {
  onResume: (hashes: readonly string[]) => void
  onPause: (hashes: readonly string[]) => void
  onRemove: (hashes: readonly string[]) => void
}

/** Every layout renders the same torrents and the same actions. */
export interface LayoutProps extends TorrentActions {
  torrents: readonly Torrent[]
  selected: readonly string[]
  onToggle: (hash: string) => void
}

function menuItems(torrent: Torrent, actions: TorrentActions) {
  return [
    { label: 'Resume', onSelect: () => actions.onResume([torrent.hash]) },
    { label: 'Pause', onSelect: () => actions.onPause([torrent.hash]) },
    { label: 'Force recheck' },
    { separator: true as const },
    {
      label: 'Copy magnet link',
      // The daemon's own magnet, which carries the display name and trackers.
      onSelect: () => void navigator.clipboard?.writeText(torrent.magnet_uri),
    },
    // Only where there is a desktop to ask. In a browser this would be a menu
    // item that does nothing, which is worse than one that is not there.
    ...(canReachDesktop()
      ? [
          {
            label: 'Open containing folder',
            onSelect: () => void revealInFolder(torrent.content_path),
          },
        ]
      : []),
    { separator: true as const },
    { label: 'Remove', danger: true, onSelect: () => actions.onRemove([torrent.hash]) },
  ]
}

/**
 * The three-dot button and its menu, shared by all three layouts.
 *
 * The wrapper is `relative` because the menu anchors to it, and it lifts to
 * `z-index: 30` while open so a neighbouring card cannot clip it. Both are
 * requirements the prototypes record having learned the hard way.
 *
 * Right-clicking anywhere on the card opens the same menu at the pointer.
 * That is not a second menu with a second copy of the actions: a person who
 * right-clicks a row expects the actions for that row, and finding a shorter
 * list than the button offers is worse than finding no menu at all. It is
 * also how the actions become findable, since a three-dot button in the
 * corner of a card is not where anybody looks first.
 *
 * The right-click target is the card, found through `[data-context-target]`.
 * See `usePointerMenu`, which the detail screen's own menu shares.
 */
export function RowMenu({ torrent, actions }: { torrent: Torrent; actions: TorrentActions }) {
  const { anchor, open, toggle, menuProps } = usePointerMenu()

  return (
    <div ref={anchor} className={cn('relative z-10 shrink-0', open && 'z-30')}>
      <button
        type="button"
        title={`Actions for ${torrent.name}`}
        aria-label={`Actions for ${torrent.name}`}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={toggle}
        className="flex size-6 items-center justify-center rounded-md text-text-dim transition-colors duration-quick hover:bg-surface2 hover:text-accent"
      >
        <MoreVertical className="size-4" strokeWidth={2} />
      </button>
      <ContextMenu items={menuItems(torrent, actions)} label={torrent.name} {...menuProps} />
    </div>
  )
}
