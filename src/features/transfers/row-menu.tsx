import { MoreVertical } from 'lucide-react'

import { ContextMenu } from '@/components/ui/context-menu'
import { icons } from '@/lib/icons'
import { usePointerMenu } from '@/lib/use-pointer-menu'
import { cn } from '@/lib/utils'
import { canReachDesktop, revealInFolder } from '@/services/shell'
import type { Torrent } from '@/types/qbittorrent'

export interface TorrentActions {
  onResume: (hashes: readonly string[]) => void
  onPause: (hashes: readonly string[]) => void
  onRemove: (hashes: readonly string[]) => void
  onRecheck: (hashes: readonly string[]) => void
  /** Opens the per-torrent limits, which the page owns and this only asks for. */
  onSpeedLimits: (torrent: Torrent) => void
  /** Saves the torrent's own .torrent file, via a dialog and a Rust write. */
  onSaveTorrentFile: (torrent: Torrent) => void
}

/**
 * Everything worth copying off a torrent, and where each value comes from.
 *
 * Matched against qBittorrent's own Copy submenu rather than invented, and
 * three of its seven entries are deliberately not here.
 *
 * **Torrent ID** is the row's id, which is the hash, so it would duplicate
 * Info hash under a second name.
 *
 * **Info hash v1 and v2** separately, and **Comment**, are left for a
 * follow-up rather than ruled out. All three do arrive on the row: a 5.2.3
 * daemon sends `infohash_v1`, `infohash_v2` and `comment` in every
 * `torrents/info` reply, checked against a real one rather than assumed. What
 * is missing is only that rigseed's `Torrent` type does not declare them, so
 * adding the entries is a change to the wire model and belongs with the rest
 * of that work, not smuggled into a menu.
 *
 * Until then one `Info hash` covers the common case, since `hash` is the v1
 * hash wherever there is one, and `infohash_v2` is empty on every non-v2
 * torrent anyway.
 */
function copyItems(torrent: Torrent) {
  const put = (value: string) => () => void navigator.clipboard?.writeText(value)
  return [
    { label: 'Name', onSelect: put(torrent.name) },
    { label: 'Magnet link', onSelect: put(torrent.magnet_uri) },
    { label: 'Info hash', onSelect: put(torrent.hash) },
    // Two different paths, and the difference bites. `save_path` is the folder
    // the torrent was told to go in; `content_path` is the file or folder it
    // actually made, which for a single-file torrent is not the two joined.
    { label: 'Content path', onSelect: put(torrent.content_path) },
    { label: 'Save path', onSelect: put(torrent.save_path) },
  ]
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
    // Wired rather than decorative. It shipped with no handler at all, so it
    // was a menu item that looked available, highlighted on hover, and did
    // nothing whatsoever when chosen.
    { label: 'Force recheck', onSelect: () => actions.onRecheck([torrent.hash]) },
    { separator: true as const },
    {
      // The ellipsis is the convention for an item that opens something rather
      // than acting immediately, and it matters more than usual here: every
      // other item on this menu takes effect the moment it is chosen.
      label: 'Speed limits…',
      onSelect: () => actions.onSpeedLimits(torrent),
    },
    { separator: true as const },
    {
      label: 'Copy',
      icon: <icons.copy className="size-[13px]" strokeWidth={2} />,
      items: copyItems(torrent),
    },
    // Both need somewhere outside the webview to land: one writes a file, the
    // other opens a file manager. In a browser they would be menu items that
    // do nothing, which is worse than items that are not there.
    ...(canReachDesktop()
      ? [
          {
            label: 'Save .torrent file…',
            icon: <icons.fileDown className="size-[13px]" strokeWidth={2} />,
            onSelect: () => actions.onSaveTorrentFile(torrent),
          },
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
