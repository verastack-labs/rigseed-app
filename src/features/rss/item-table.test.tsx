import { fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { ItemTable } from '@/features/rss/item-table'
import type { RssArticle, RssFeedEntry } from '@/types/qbittorrent'

const NOW = new Date('2026-08-20T18:00:00Z')

const article = (over: Partial<RssArticle> = {}): RssArticle => ({
  id: 'a1',
  title: 'ubuntu-24.04.2-desktop-amd64.iso',
  torrentURL: 'magnet:?xt=urn:btih:1',
  link: 'https://example.org/a1',
  date: 'Wed, 20 Aug 2026 17:40:00 +0000',
  size: 5_700_000_000,
  ...over,
})

const feed = (articles: RssArticle[], over: Partial<RssFeedEntry> = {}): RssFeedEntry => ({
  uid: '{1}',
  url: 'https://example.org/f.xml',
  title: 'Feed',
  lastBuildDate: '',
  isLoading: false,
  hasError: false,
  articles,
  path: 'Feed',
  name: 'Feed',
  ...over,
})

const setup = (props: Partial<React.ComponentProps<typeof ItemTable>> = {}) =>
  render(
    <ItemTable
      feed={feed([article()])}
      alreadyAdded={new Set()}
      claimedBy={{}}
      onDownload={vi.fn()}
      onRefresh={vi.fn()}
      {...props}
    />,
  )

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(NOW)
})

afterEach(() => {
  vi.useRealTimers()
})

describe('ItemTable', () => {
  it('says how new an item is, not when it was published', () => {
    // Feeds send RFC 2822, which nobody reads, and the question about a feed
    // item is how new it is rather than what the clock said.
    setup()
    expect(screen.getByText('20m ago')).toBeInTheDocument()
  })

  it('survives a date it cannot parse', () => {
    setup({ feed: feed([article({ date: 'not a date' })]) })
    expect(screen.getByText('unknown')).toBeInTheDocument()
  })

  it('marks unread from the article, where a missing field means unread', () => {
    setup({ feed: feed([article(), article({ id: 'a2', title: 'read one', isRead: true })]) })
    expect(screen.getAllByLabelText('unread')).toHaveLength(1)
    expect(screen.getAllByLabelText('read')).toHaveLength(1)
  })

  it('offers Download for something not in the app yet', () => {
    const onDownload = vi.fn()
    setup({ onDownload })
    fireEvent.click(screen.getByRole('button', { name: 'Download' }))
    expect(onDownload).toHaveBeenCalledWith(expect.objectContaining({ id: 'a1' }))
  })

  it('says In app instead, once the torrent is here', () => {
    setup({ alreadyAdded: new Set(['ubuntu-24.04.2-desktop-amd64.iso']) })
    expect(screen.getByText('In app')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Download' })).not.toBeInTheDocument()
  })

  it('keeps read and added independent of each other', () => {
    // Marking something read is a note to yourself; adding it is an act. An
    // item can be either, both or neither.
    setup({
      feed: feed([article({ isRead: true })]),
      alreadyAdded: new Set(),
    })
    expect(screen.getByLabelText('read')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Download' })).toBeInTheDocument()
  })

  it('says which rule claimed an item', () => {
    setup({ claimedBy: { 'ubuntu-24.04.2-desktop-amd64.iso': 'Linux releases' } })
    expect(screen.getByText('rule: Linux releases')).toBeInTheDocument()
  })

  it('shows a dash rather than 0 B when the feed gave no size', () => {
    // Built by omission rather than by passing undefined, because
    // exactOptionalPropertyTypes is right that those are different things.
    const { size: _size, ...noSize } = article()
    setup({ feed: feed([noSize]) })
    expect(screen.getByText('—')).toBeInTheDocument()
  })

  it('separates a quiet feed from a broken one', () => {
    setup({ feed: feed([]) })
    expect(screen.getByText('This feed has gone quiet')).toBeInTheDocument()

    setup({ feed: feed([], { hasError: true }) })
    expect(screen.getByText('This feed could not be read')).toBeInTheDocument()
  })

  it('offers a refresh from the empty state', () => {
    const onRefresh = vi.fn()
    setup({ feed: feed([]), onRefresh })
    fireEvent.click(screen.getByRole('button', { name: 'Refresh now' }))
    expect(onRefresh).toHaveBeenCalledOnce()
  })
})
