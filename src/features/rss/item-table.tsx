import { Button } from '@/components/ui/button'
import { Chip } from '@/components/ui/chip'
import { DataValue } from '@/components/ui/data-value'
import { EmptyState } from '@/components/ui/empty-state'
import { icons } from '@/lib/icons'
import { cn } from '@/lib/utils'
import { isUnread } from '@/services/rss'
import type { RssArticle, RssFeedEntry } from '@/types/qbittorrent'
import { formatBytes } from '@/utils/format'

export interface ItemTableProps {
  feed: RssFeedEntry
  /** Titles already in the transfer list, for the "In app" state. */
  alreadyAdded: ReadonlySet<string>
  /** Article titles a rule claims, keyed by rule name. */
  claimedBy: Readonly<Record<string, string>>
  onDownload: (article: RssArticle) => void
  onRefresh: () => void
  className?: string
}

const COLUMNS = 'grid-cols-[1fr_92px_108px_92px]'

/**
 * When the feed published it, in the reader's own terms.
 *
 * Feeds send RFC 2822, which nobody reads, and an absolute timestamp answers
 * the wrong question anyway: what matters about a feed item is how new it is.
 */
function published(date: string): string {
  const when = new Date(date)
  if (Number.isNaN(when.getTime())) return 'unknown'

  const minutes = Math.round((Date.now() - when.getTime()) / 60_000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.round(hours / 24)}d ago`
}

/**
 * The items in one feed.
 *
 * The action column reflects what an item already is rather than offering
 * Download four times over. Two states, not the four the design drew: the API
 * says whether an article was read and the transfer list says whether its
 * torrent is here, and nothing anywhere reports "queued" or "skipped" for an
 * RSS article. Inventing those two would mean inventing the state behind them.
 *
 * Read and added are independent. Marking something read is a note to
 * yourself; adding it is an act. An item can be either, both or neither, so
 * the unread dot and the action button never speak for each other.
 */
export function ItemTable({
  feed,
  alreadyAdded,
  claimedBy,
  onDownload,
  onRefresh,
  className,
}: ItemTableProps) {
  if (feed.articles.length === 0) {
    return (
      <div className={cn('px-6 py-10', className)}>
        <EmptyState
          icon={<icons.rss className="size-6" strokeWidth={1.7} />}
          title={feed.hasError ? 'This feed could not be read' : 'This feed has gone quiet'}
          body={
            feed.hasError
              ? 'The daemon could not fetch it. Check the URL, then refresh.'
              : 'It answered, but nothing has been published in the last 30 days. Older items are dropped automatically.'
          }
          action={
            <Button variant="secondary" size="sm" onClick={onRefresh}>
              Refresh now
            </Button>
          }
        />
      </div>
    )
  }

  return (
    <div className={cn('flex flex-col', className)}>
      <div
        className={cn(
          'grid gap-3 border-b border-line bg-sidebar px-4 py-2',
          'text-[9.5px] font-bold tracking-[0.08em] text-text-dimmer uppercase',
          COLUMNS,
        )}
      >
        <span>Title</span>
        <span className="text-right">Size</span>
        <span className="text-right">Published</span>
        <span className="text-right">Action</span>
      </div>

      {feed.articles.map((article) => {
        const unread = isUnread(article)
        const added = alreadyAdded.has(article.title)
        const rule = claimedBy[article.title]

        return (
          <div
            key={article.id}
            className={cn(
              'grid items-center gap-3 border-b border-line px-4 py-2.5 last:border-b-0',
              COLUMNS,
              unread && 'bg-accent/[0.04]',
            )}
          >
            <span className="flex min-w-0 items-start gap-2">
              <span
                aria-label={unread ? 'unread' : 'read'}
                className={cn(
                  'mt-1.5 size-[6px] shrink-0 rounded-full',
                  unread ? 'bg-accent' : 'bg-transparent',
                )}
              />
              <span className="flex min-w-0 flex-col gap-1">
                <span
                  title={article.title}
                  className={cn(
                    'truncate text-[12.5px]',
                    unread ? 'font-semibold text-text' : 'font-medium text-text-dim',
                  )}
                >
                  {article.title}
                </span>
                {rule ? (
                  <span className="flex">
                    {/* Says why the item is here, which is not obvious in a
                        feed somebody subscribed to for other reasons. */}
                    <Chip label={`rule: ${rule}`} color="var(--accent2)" selected />
                  </span>
                ) : null}
              </span>
            </span>

            <DataValue size="xs" tone="dim" className="text-right">
              {article.size ? formatBytes(article.size) : '—'}
            </DataValue>
            <DataValue size="xs" tone="dimmer" className="text-right">
              {published(article.date)}
            </DataValue>

            <span className="flex justify-end">
              {added ? (
                <span className="flex items-center gap-1.5 rounded-lg border border-line px-2.5 py-1 text-[11px] font-semibold text-ok">
                  <icons.complete className="size-[13px]" strokeWidth={2} />
                  In app
                </span>
              ) : (
                <Button variant="primary" size="sm" onClick={() => onDownload(article)}>
                  Download
                </Button>
              )}
            </span>
          </div>
        )
      })}
    </div>
  )
}
