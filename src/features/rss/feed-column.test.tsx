import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { FeedColumn } from '@/features/rss/feed-column'
import type { RssArticle, RssFeedEntry, RssRule } from '@/types/qbittorrent'

const article = (id: string, read?: boolean): RssArticle => ({
  id,
  title: id,
  torrentURL: 'magnet:?xt=urn:btih:1',
  link: 'https://example.org/x',
  date: 'Wed, 20 Aug 2026 17:40:00 +0000',
  ...(read === undefined ? {} : { isRead: read }),
})

const feeds: RssFeedEntry[] = [
  {
    uid: '{1}',
    url: 'https://www.linuxtracker.org/rss.php',
    title: 'Linux ISOs',
    lastBuildDate: '',
    isLoading: false,
    hasError: false,
    articles: [article('a1'), article('a2', true)],
    path: 'Linux ISOs',
    name: 'Linux ISOs',
  },
  {
    uid: '{2}',
    url: 'https://example.org/quiet.xml',
    title: 'Gone Quiet',
    lastBuildDate: '',
    isLoading: false,
    hasError: false,
    articles: [],
    path: 'Gone Quiet',
    name: 'Gone Quiet',
  },
]

const rules: Record<string, RssRule> = {
  'Linux releases': {
    enabled: true,
    mustContain: 'amd64',
    mustNotContain: '',
    useRegex: false,
    episodeFilter: '',
    smartFilter: false,
    previouslyMatchedEpisodes: [],
    affectedFeeds: ['https://linuxtracker.org/rss.php'],
    ignoreDays: 0,
    lastMatch: '',
    addPaused: null,
    assignedCategory: '',
    savePath: '',
  },
  Paused: {
    enabled: false,
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
  },
}

const setup = (props: Partial<React.ComponentProps<typeof FeedColumn>> = {}) =>
  render(
    <FeedColumn
      feeds={feeds}
      rules={rules}
      selected={null}
      onSelect={vi.fn()}
      onRefreshAll={vi.fn()}
      onAddFeed={vi.fn()}
      refreshMinutes={30}
      {...props}
    />,
  )

describe('FeedColumn', () => {
  it('shows the host, not the whole URL, and drops www', () => {
    setup()
    expect(screen.getByText('linuxtracker.org')).toBeInTheDocument()
  })

  it('badges only the feeds with something unread', () => {
    // One of the two articles has no isRead field at all, which is how the
    // daemon says unread.
    setup()
    expect(screen.getByText('1')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Gone Quiet/ })).not.toHaveTextContent('0')
  })

  it('separates a quiet feed from a healthy one by its dot', () => {
    setup()
    expect(screen.getByLabelText('ok')).toBeInTheDocument()
    expect(screen.getByLabelText('quiet')).toBeInTheDocument()
  })

  it('reports which feed was picked, by path', () => {
    // The path is what every RSS write takes, so it is what travels.
    const onSelect = vi.fn()
    setup({ onSelect })
    fireEvent.click(screen.getByRole('button', { name: /Linux ISOs/ }))
    expect(onSelect).toHaveBeenCalledWith({ kind: 'feed', path: 'Linux ISOs' })
  })

  it('reports which rule was picked', () => {
    const onSelect = vi.fn()
    setup({ onSelect })
    fireEvent.click(screen.getByRole('button', { name: /Linux releases/ }))
    expect(onSelect).toHaveBeenCalledWith({ kind: 'rule', name: 'Linux releases' })
  })

  it('says whether a rule is running and how many feeds it covers', () => {
    setup()
    expect(screen.getByText('1 feed · on')).toBeInTheDocument()
    expect(screen.getByText('0 feeds · paused')).toBeInTheDocument()
  })

  it('totals unread across every feed, from the same source as the badges', () => {
    setup()
    expect(screen.getByText('2 feeds · 1 unread')).toBeInTheDocument()
  })

  it('states the refresh interval rather than leaving it a mystery', () => {
    setup()
    expect(screen.getByText('every 30 min')).toBeInTheDocument()
  })

  it('explains what a feed is when there are none', () => {
    setup({ feeds: [] })
    expect(screen.getByText(/a URL the daemon checks on a timer/)).toBeInTheDocument()
  })

  it('leaves the rules section out entirely when there are none', () => {
    setup({ rules: {} })
    expect(screen.queryByText('Auto-download rules')).not.toBeInTheDocument()
  })
})
