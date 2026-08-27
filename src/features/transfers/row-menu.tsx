import { MoreVertical } from 'lucide-react'

import { ContextMenu, type ContextMenuAction } from '@/components/ui/context-menu'
import { copy } from '@/lib/clipboard'
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
  /** Opens the per-torrent ratio and seeding time limits. */
  onShareLimits: (torrent: Torrent) => void
  /** Force start, which ignores the queue rather than resuming. */
  onForceStart: (hashes: readonly string[], value: boolean) => void
  /** Saves the torrent's own .torrent file, via a dialog and a Rust write. */
  onSaveTorrentFile: (torrent: Torrent) => void
}

/**
 * The four things worth copying off a torrent.
 *
 * qBittorrent offers seven, and this had all seven briefly. Parity with
 * qBittorrent is not the goal: rigseed is meant to be usable by somebody who
 * has never run a torrent client, and a seven-item submenu asking them to
 * choose between two nearly identical hashes and two nearly identical paths
 * fails that badly. Matching a power-user client is a reason to look at a
 * menu, not a reason to copy it.
 *
 * **One `Info hash`, not v1 and v2.** `hash` is whichever one identifies the
 * torrent to this daemon, which is the v1 wherever there is one. Splitting
 * them serves the small number of people who already know what a v2 hash is,
 * and confuses everybody else. Anyone who needs them separately can read both
 * on the detail screen.
 *
 * **No Content path.** `save_path` answers "where is this on my disk", and
 * `content_path` differs only in pointing at the file rather than its folder.
 * Open containing folder is two rows down and is what people actually want.
 *
 * **No Comment.** Empty on nearly every torrent, and already on the detail
 * screen where there is room to read it.
 *
 * **No Torrent ID.** It is the hash under a second name.
 */
function copyItems(torrent: Torrent) {
  // Lower case, because it lands mid-sentence in "Copied magnet link". The
  // menu row keeps its own capitalisation; these name the content instead.
  const put = (what: string, value: string) => () => void copy(what, value)
  /** A row that greys out rather than vanishing when there is nothing to copy. */
  const entry = (label: string, what: string, value: string | undefined): ContextMenuAction =>
    value ? { label, onSelect: put(what, value) } : { label, disabled: true }

  return [
    entry('Name', 'name', torrent.name),
    entry('Magnet link', 'magnet link', torrent.magnet_uri),
    entry('Info hash', 'info hash', torrent.infohash_v1 ?? torrent.hash),
    entry('Save path', 'save path', torrent.save_path),
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
    /**
     * Force start, worded as what choosing it will do rather than as a state.
     *
     * The menu has no checkable row, and adding one for a single item would be
     * a control whose ticked and unticked states are told apart only by a mark
     * somebody has to already know to look for. A label that names the next
     * action cannot be misread in either direction.
     *
     * Not a louder Resume. A resumed torrent still waits its turn against the
     * queue's active-downloads limit; a force-started one ignores the queue
     * entirely, which is the whole reason it exists.
     */
    {
      label: torrent.force_start ? 'Stop forcing' : 'Force start',
      icon: torrent.force_start ? (
        <icons.check className="size-[13px]" strokeWidth={2} />
      ) : undefined,
      onSelect: () => actions.onForceStart([torrent.hash], !torrent.force_start),
    },
    { separator: true as const },
    {
      // The ellipsis is the convention for an item that opens something rather
      // than acting immediately, and it matters more than usual here: every
      // other item on this menu takes effect the moment it is chosen.
      label: 'Speed limits…',
      onSelect: () => actions.onSpeedLimits(torrent),
    },
    // How fast it goes, then when it is finished. Adjacent because they are
    // the two halves of the same question and qBittorrent separates them by
    // the width of a whole menu.
    {
      label: 'Share limits…',
      icon: <icons.scale className="size-[13px]" strokeWidth={2} />,
      onSelect: () => actions.onShareLimits(torrent),
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
