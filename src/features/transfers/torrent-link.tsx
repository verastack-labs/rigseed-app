import { Link } from 'react-router'

import { cn } from '@/lib/utils'

export interface TorrentLinkProps {
  hash: string
  name: string
  /**
   * Let the link's clickable area cover the whole card.
   *
   * A pseudo-element stretched over the nearest positioned ancestor, which is
   * the card. The alternative was a click handler on the card plus a
   * `stopPropagation` on every checkbox, menu and button inside it, and one
   * missed call there is a card that navigates when you meant to tick it.
   *
   * The card must be `relative`, and anything clickable inside it must be
   * `relative z-10` to sit above the sheet.
   */
  stretch?: boolean
  className?: string
}

/**
 * The torrent's name, as the way into its detail screen.
 *
 * A real link rather than a click handler on a card. The name is the thing a
 * person means when they say "open that one", it can be opened in a new window
 * or copied like any other link, and it keeps the row's checkbox and menu
 * clickable without a stack of stopPropagation calls.
 *
 * With `stretch` the same link covers the whole card, so clicking anywhere but
 * a control opens the torrent. Still one link rather than a card handler plus
 * an invisible second link, which would read the destination twice to anything
 * listening.
 */
export function TorrentLink({ hash, name, stretch, className }: TorrentLinkProps) {
  return (
    <Link
      to={`/torrent/${hash}`}
      title={name}
      className={cn(
        'text-text transition-colors duration-quick hover:text-accent',
        stretch && "after:absolute after:inset-0 after:content-['']",
        className,
      )}
    >
      {name}
    </Link>
  )
}
