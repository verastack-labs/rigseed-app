import { useCallback, useEffect, useMemo, useState } from 'react'
import { useShallow } from 'zustand/react/shallow'

import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { EmptyState } from '@/components/ui/empty-state'
import { FormDialog } from '@/components/ui/form-dialog'
import { IconButton } from '@/components/ui/icon-button'
import { Input } from '@/components/ui/input'
import { SectionHeader } from '@/components/ui/section-header'
import { Skeleton } from '@/components/ui/skeleton'
import { FeedColumn, type Selection } from '@/features/rss/feed-column'
import { ItemTable } from '@/features/rss/item-table'
import { RuleEditor } from '@/features/rss/rule-editor'
import { icons } from '@/lib/icons'
import { useApi } from '@/services/api-context'
import { flattenFeeds, unreadCount } from '@/services/rss'
import { selectTorrentList, useTorrentStore } from '@/state/torrent-store'
import { useSyncPoll } from '@/state/use-sync-poll'
import type { RssFeedEntry, RssRule } from '@/types/qbittorrent'

const BLANK_RULE: RssRule = {
  enabled: true,
  mustContain: '',
  mustNotContain: '',
  useRegex: false,
  episodeFilter: '',
  smartFilter: false,
  previouslyMatchedEpisodes: [],
  affectedFeeds: [],
  ignoreDays: 0,
  lastMatch: '',
  addPaused: null,
  assignedCategory: '',
  savePath: '',
}

/**
 * RSS.
 *
 * Feeds and rules on the left, one of two panes on the right. The list never
 * changes when the selection does, so somebody keeps their place while moving
 * between a rule and the feeds it filters.
 *
 * The rule draft is local until Save. A rule is a pair of text fields whose
 * effect is invisible until something downloads hours later, so writing on
 * every keystroke would mean a half-typed pattern was live for as long as it
 * took to finish typing it.
 */
export function Rss() {
  useSyncPoll()
  const api = useApi()

  const torrents = useTorrentStore(useShallow(selectTorrentList))
  const categories = useTorrentStore(useShallow((s) => Object.keys(s.categories)))

  const [feeds, setFeeds] = useState<readonly RssFeedEntry[] | null>(null)
  const [rules, setRules] = useState<Record<string, RssRule>>({})
  const [selected, setSelected] = useState<Selection>(null)
  const [draft, setDraft] = useState<RssRule | null>(null)
  const [adding, setAdding] = useState(false)
  const [feedUrl, setFeedUrl] = useState('')
  const [feedName, setFeedName] = useState('')
  const [confirmRemove, setConfirmRemove] = useState(false)
  const [busy, setBusy] = useState(false)
  /** `rss_processing_enabled` and `rss_refresh_interval`, read once. */
  const [rssPrefs, setRssPrefs] = useState<{ processing: boolean; minutes: number } | null>(null)

  const load = useCallback(async () => {
    const [tree, ruleSet, prefs] = await Promise.all([
      api.rss.items(),
      api.rss.rules(),
      // The interval and whether anything refreshes at all. Read rather than
      // assumed: the footer used to claim "every 30 min" from a constant,
      // which is right only until somebody changes it, and says nothing about
      // processing being off entirely.
      api.app.preferences(),
    ])
    return {
      feeds: flattenFeeds(tree),
      rules: ruleSet,
      rss: {
        processing: prefs.rss_processing_enabled,
        minutes: prefs.rss_refresh_interval,
      },
    }
  }, [api])

  const [owner, setOwner] = useState(api)
  if (owner !== api) {
    // Feeds belong to the daemon that reported them, and so do the paths every
    // write is addressed to.
    setOwner(api)
    setFeeds(null)
    setRules({})
    setSelected(null)
    setDraft(null)
    setRssPrefs(null)
  }

  useEffect(() => {
    let live = true
    void (async () => {
      try {
        const next = await load()
        if (!live) return
        setFeeds(next.feeds)
        setRules(next.rules)
        setRssPrefs(next.rss)
      } catch {
        // Left null, so the screen shows a skeleton rather than claiming
        // there are no feeds when it could not ask.
      }
    })()
    return () => {
      live = false
    }
  }, [load])

  const refresh = useCallback(async () => {
    try {
      const next = await load()
      setFeeds(next.feeds)
      setRules(next.rules)
      setRssPrefs(next.rss)
    } catch {
      // Keep what is on screen. The next refresh tries again.
    }
  }, [load])

  const write = async (job: () => Promise<unknown>) => {
    setBusy(true)
    try {
      await job()
      await refresh()
    } finally {
      setBusy(false)
    }
  }

  const feed = useMemo(
    () => (selected?.kind === 'feed' ? (feeds ?? []).find((f) => f.path === selected.path) : null),
    [selected, feeds],
  )

  const rule = selected?.kind === 'rule' ? rules[selected.name] : undefined

  // The draft follows the selection rather than an effect, so switching rules
  // never shows the previous rule's fields for a frame.
  const [draftFor, setDraftFor] = useState<string | null>(null)
  const ruleName = selected?.kind === 'rule' ? selected.name : null
  if (draftFor !== ruleName) {
    setDraftFor(ruleName)
    setDraft(ruleName ? (rules[ruleName] ?? BLANK_RULE) : null)
  }

  /** Titles already in the transfer list, for the item table's In app state. */
  const addedTitles = useMemo(() => new Set(torrents.map((t) => t.name)), [torrents])

  /** Which rule claims which article title, for the chips. */
  const claimedBy = useMemo(() => {
    const claims: Record<string, string> = {}
    for (const [name, r] of Object.entries(rules)) {
      if (!r.enabled) continue
      for (const f of feeds ?? []) {
        if (!r.affectedFeeds.includes(f.url)) continue
        for (const article of f.articles) claims[article.title] ??= name
      }
    }
    return claims
  }, [rules, feeds])

  /** Recent items from the feeds a rule covers, for its preview. */
  const candidates = useMemo(() => {
    if (!rule && !draft) return []
    const covered = (feeds ?? []).filter((f) => (draft ?? rule)?.affectedFeeds.includes(f.url))
    const pool = covered.length > 0 ? covered : (feeds ?? [])
    return pool.flatMap((f) => f.articles).slice(0, 4)
  }, [feeds, rule, draft])

  const urlLooksRight = /^https?:\/\//.test(feedUrl.trim())

  return (
    <div className="flex h-full min-h-0">
      <FeedColumn
        feeds={feeds ?? []}
        rules={rules}
        selected={selected}
        onSelect={setSelected}
        onRefreshAll={() => void write(() => api.rss.refreshItem(''))}
        onAddFeed={() => setAdding(true)}
        refreshMinutes={rssPrefs?.minutes ?? 30}
        processing={rssPrefs?.processing ?? true}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex shrink-0 items-center gap-3 border-b border-line px-6 py-4">
          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            <h2 className="truncate text-[17px] font-semibold text-text">
              {feed ? feed.name : selected?.kind === 'rule' ? selected.name : 'RSS'}
            </h2>
            <p className="truncate font-mono text-[10.5px] text-text-dimmer">
              {feed
                ? `${feed.articles.length} items · ${unreadCount(feed)} unread`
                : selected?.kind === 'rule'
                  ? 'rss/setRule'
                  : 'rss/items'}
            </p>
          </div>

          {feed ? (
            <>
              <Button
                variant="secondary"
                size="sm"
                disabled={busy || unreadCount(feed) === 0}
                onClick={() => void write(() => api.rss.markAsRead(feed.path))}
              >
                Mark all read
              </Button>
              <IconButton title={`Remove ${feed.name}`} onClick={() => setConfirmRemove(true)}>
                <icons.remove className="size-[15px]" strokeWidth={2} />
              </IconButton>
            </>
          ) : null}

          {selected?.kind === 'rule' ? (
            <>
              <Button
                variant="primary"
                size="sm"
                disabled={busy || !draft}
                onClick={() => {
                  if (draft && selected.kind === 'rule')
                    void write(() => api.rss.setRule(selected.name, draft))
                }}
              >
                Save rule
              </Button>
              <IconButton title={`Remove ${selected.name}`} onClick={() => setConfirmRemove(true)}>
                <icons.remove className="size-[15px]" strokeWidth={2} />
              </IconButton>
            </>
          ) : null}
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto">
          {feeds === null ? (
            <div className="p-6">
              <Skeleton rows={7} rowHeight={38} />
            </div>
          ) : feed ? (
            <ItemTable
              feed={feed}
              alreadyAdded={addedTitles}
              claimedBy={claimedBy}
              onRefresh={() => void write(() => api.rss.refreshItem(feed.path))}
              onDownload={(article) =>
                void write(() => api.torrents.add({ urls: [article.torrentURL] }))
              }
            />
          ) : draft && selected?.kind === 'rule' ? (
            <RuleEditor
              name={selected.name}
              rule={draft}
              onChange={setDraft}
              candidates={candidates}
              categories={categories}
            />
          ) : (
            <div className="px-6 py-10">
              <EmptyState
                icon={<icons.rss className="size-6" strokeWidth={1.7} />}
                title={feeds.length === 0 ? 'No feeds yet' : 'Pick a feed'}
                body={
                  feeds.length === 0
                    ? 'A feed is a URL the daemon checks on a timer. Add one and its items appear here.'
                    : 'Choose a feed to read its items, or a rule to see what it would catch.'
                }
                action={
                  feeds.length === 0 ? (
                    <Button variant="primary" size="sm" onClick={() => setAdding(true)}>
                      Add a feed
                    </Button>
                  ) : null
                }
              />
            </div>
          )}
        </div>
      </div>

      <FormDialog
        open={adding}
        title="Add a feed"
        api="rss/addFeed"
        submitLabel="Add feed"
        submitDisabled={!urlLooksRight}
        onCancel={() => {
          setAdding(false)
          setFeedUrl('')
          setFeedName('')
        }}
        onSubmit={() => {
          const name = feedName.trim() || feedUrl.trim()
          void write(() => api.rss.addFeed(feedUrl.trim(), name))
          setAdding(false)
          setFeedUrl('')
          setFeedName('')
        }}
      >
        <div className="flex flex-col gap-3">
          <label className="flex flex-col gap-1.5">
            <SectionHeader>Feed URL</SectionHeader>
            <Input
              mono
              value={feedUrl}
              invalid={feedUrl.trim().length > 0 && !urlLooksRight}
              onChange={(e) => setFeedUrl(e.target.value)}
              aria-label="Feed URL"
              placeholder="https://example.org/rss.xml"
            />
            {feedUrl.trim().length > 0 && !urlLooksRight ? (
              <span className="text-[11.5px] text-danger">
                Needs to start with http:// or https://
              </span>
            ) : null}
          </label>

          <label className="flex flex-col gap-1.5">
            <SectionHeader>Display name</SectionHeader>
            <Input
              value={feedName}
              onChange={(e) => setFeedName(e.target.value)}
              aria-label="Display name"
              placeholder="Optional. The URL is used if left blank."
            />
          </label>
        </div>
      </FormDialog>

      <ConfirmDialog
        open={confirmRemove}
        title={
          feed
            ? `Remove ${feed.name}?`
            : `Remove ${selected?.kind === 'rule' ? selected.name : ''}?`
        }
        body={
          feed
            ? 'Its items disappear from this screen. Torrents it already added stay in your list.'
            : 'Matching stops immediately. Torrents it already added stay in your list.'
        }
        {...(feed ? { target: feed.url } : {})}
        confirmLabel="Remove"
        onCancel={() => setConfirmRemove(false)}
        onConfirm={() => {
          if (feed) void write(() => api.rss.removeItem(feed.path))
          else if (selected?.kind === 'rule') void write(() => api.rss.removeRule(selected.name))
          setConfirmRemove(false)
          setSelected(null)
        }}
      />
    </div>
  )
}
