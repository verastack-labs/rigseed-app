import { Link } from 'react-router'

import { cn } from '@/lib/utils'

export interface TorrentLinkProps {
  hash: string
  name: string
  className?: string
}

/**
 * The torrent's name, as the way into its detail screen.
 *
 * A real link rather than a click handler on a card. The name is the thing a
 * person means when they say "open that one", it can be opened in a new window
 * or copied like any other link, and it keeps the row's checkbox and menu
 * clickable without a stack of stopPropagation calls.
 */
export function TorrentLink({ hash, name, className }: TorrentLinkProps) {
  return (
    <Link
      to={`/torrent/${hash}`}
      title={name}
      className={cn('text-text transition-colors duration-quick hover:text-accent', className)}
    >
      {name}
    </Link>
  )
}
