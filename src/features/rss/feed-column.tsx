import { IconButton } from '@/components/ui/icon-button'
import { SectionHeader } from '@/components/ui/section-header'
import { icons } from '@/lib/icons'
import { cn } from '@/lib/utils'
import { feedHealth, unreadCount } from '@/services/rss'
import type { RssFeedEntry, RssRule } from '@/types/qbittorrent'

export type Selection = { kind: 'feed'; path: string } | { kind: 'rule'; name: string } | null

export interface FeedColumnProps {
  feeds: readonly RssFeedEntry[]
  rules: Readonly<Record<string, RssRule>>
  selected: Selection
  onSelect: (next: Selection) => void
  onRefreshAll: () => void
  onAddFeed: () => void
  /** From `rss_refresh_interval`, in minutes. */
  refreshMinutes: number
  /**
   * `rss_processing_enabled`. While it is off the daemon never refreshes a
   * feed, and a list that quietly never updates is the worst version of that.
   */
  processing: boolean
  className?: string
}

const DOT = {
  ok: 'bg-ok',
  quiet: 'bg-text-dimmer',
  error: 'bg-danger',
} as const

/** The host, which is what identifies a feed at a glance. Never the full URL. */
function hostOf(url: string): string {
  try {
    return new URL(url).host.replace(/^www\./, '')
  } catch {
    return url
  }
}

/**
 * Feeds and rules, one column.
 *
 * They share a column because a rule is only ever read next to the feeds it
 * filters, and selecting either one swaps the right-hand pane while leaving
 * this list exactly as it was, so somebody keeps their place.
 *
 * Unread counts are derived from the articles every time rather than stored.
 * The badge, the pane subtitle and the footer all read the same source, so
 * they cannot drift apart and show three different numbers.
 */
export function FeedColumn({
  feeds,
  rules,
  selected,
  onSelect,
  onRefreshAll,
  onAddFeed,
  refreshMinutes,
  processing,
  className,
}: FeedColumnProps) {
  const totalUnread = feeds.reduce((sum, feed) => sum + unreadCount(feed), 0)
  const ruleNames = Object.keys(rules).sort((a, b) => a.localeCompare(b))

  return (
    <div
      className={cn(
        'flex w-[300px] shrink-0 flex-col gap-4 overflow-y-auto border-r border-line bg-sidebar px-3 py-3.5',
        className,
      )}
    >
      <div className="flex items-center gap-1.5 px-[9px]">
        <h1 className="flex-1 text-[22px] leading-none font-semibold text-text">RSS</h1>
        <IconButton title="Refresh every feed" onClick={onRefreshAll}>
          <icons.rss className="size-[15px]" strokeWidth={2} />
        </IconButton>
        <IconButton title="Add a feed" onClick={onAddFeed}>
          <icons.download className="size-[15px] rotate-180" strokeWidth={2} />
        </IconButton>
      </div>

      <div className="flex flex-col gap-1">
        <SectionHeader className="px-[9px] pb-1">Feeds</SectionHeader>
        {feeds.length === 0 ? (
          <p className="px-[9px] py-2 text-[11.5px] leading-[1.5] text-text-dim">
            No feeds yet. A feed is a URL the daemon checks on a timer.
          </p>
        ) : (
          feeds.map((feed) => {
            const unread = unreadCount(feed)
            const active = selected?.kind === 'feed' && selected.path === feed.path
            return (
              <button
                key={feed.path}
                type="button"
                aria-pressed={active}
                onClick={() => onSelect({ kind: 'feed', path: feed.path })}
                className={cn(
                  'flex items-center gap-2.5 rounded-lg px-[9px] py-2 text-left',
                  'transition-colors duration-quick',
                  active ? 'bg-accent-soft' : 'hover:bg-surface2',
                )}
              >
                <span
                  aria-label={feedHealth(feed)}
                  className={cn('size-[7px] shrink-0 rounded-full', DOT[feedHealth(feed)])}
                />
                <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span
                    className={cn(
                      'truncate text-[12.5px]',
                      unread > 0 ? 'font-semibold text-text' : 'text-text-dim',
                    )}
                  >
                    {feed.name}
                  </span>
                  <span className="truncate font-mono text-[10px] text-text-dimmer">
                    {hostOf(feed.url)}
                  </span>
                </span>
                {unread > 0 ? (
                  <span className="shrink-0 rounded-chip bg-accent-soft px-1.5 py-0.5 font-mono text-[10px] text-accent tabular-nums">
                    {unread}
                  </span>
                ) : null}
              </button>
            )
          })
        )}
      </div>

      {ruleNames.length > 0 ? (
        <div className="flex flex-col gap-1">
          <SectionHeader className="px-[9px] pb-1">Auto-download rules</SectionHeader>
          {ruleNames.map((name) => {
            const rule = rules[name]!
            const active = selected?.kind === 'rule' && selected.name === name
            const feedCount = rule.affectedFeeds.length
            return (
              <button
                key={name}
                type="button"
                aria-pressed={active}
                onClick={() => onSelect({ kind: 'rule', name })}
                className={cn(
                  'flex items-center gap-2.5 rounded-lg px-[9px] py-2 text-left',
                  'transition-colors duration-quick',
                  active ? 'bg-accent-soft' : 'hover:bg-surface2',
                )}
              >
                <icons.filter
                  className={cn(
                    'size-[15px] shrink-0',
                    rule.enabled ? 'text-text-dim' : 'text-text-dimmer',
                  )}
                  strokeWidth={2}
                />
                <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="truncate text-[12.5px] font-semibold text-text">{name}</span>
                  <span className="truncate font-mono text-[10px] text-text-dimmer">
                    {feedCount} feed{feedCount === 1 ? '' : 's'} · {rule.enabled ? 'on' : 'paused'}
                  </span>
                </span>
              </button>
            )
          })}
        </div>
      ) : null}

      <span className="flex-1" />

      <div className="flex items-center gap-2 px-[9px]">
        <span className="font-mono text-[10.5px] text-text-dimmer tabular-nums">
          {feeds.length} feed{feeds.length === 1 ? '' : 's'} · {totalUnread} unread
        </span>
        <span className="flex-1" />
        <span
          className={cn('font-mono text-[10.5px]', processing ? 'text-text-dimmer' : 'text-warn')}
          title={
            processing
              ? undefined
              : 'RSS processing is off in Settings, so nothing refreshes on its own.'
          }
        >
          {processing ? `every ${refreshMinutes} min` : 'refresh is off'}
        </span>
      </div>
    </div>
  )
}
