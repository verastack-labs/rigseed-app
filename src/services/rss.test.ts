import { describe, expect, it } from 'vitest'

import { createMockTransport } from '@/services/mock-transport'
import { createRssApi, feedHealth, flattenFeeds, isUnread, unreadCount } from '@/services/rss'
import type { RssArticle, RssFeedEntry } from '@/types/qbittorrent'

const api = () => createRssApi(createMockTransport())

const entry = (over: Partial<RssFeedEntry> = {}): RssFeedEntry => ({
  uid: '{x}',
  url: 'https://example.org/f.xml',
  title: 'F',
  lastBuildDate: '',
  isLoading: false,
  hasError: false,
  articles: [],
  path: 'F',
  name: 'F',
  ...over,
})

describe('flattenFeeds', () => {
  it('finds a feed nested inside a folder, and keeps its path', async () => {
    // Every RSS write takes the key path of the thing it acts on, not an id.
    // Lose the path and a feed can be displayed but not deleted.
    const feeds = flattenFeeds(await api().items())
    const nested = feeds.find((f) => f.name === 'Public Domain')
    expect(nested?.path).toBe('Archives\\Public Domain')
  })

  it('tells a folder from a feed by uid, which is the only thing that does', async () => {
    const feeds = flattenFeeds(await api().items())
    expect(feeds.map((f) => f.name)).not.toContain('Archives')
    expect(feeds.map((f) => f.name)).toContain('Linux ISOs')
  })

  it('survives a node that is not an object', () => {
    expect(flattenFeeds({ broken: null, alsoBroken: 7 })).toEqual([])
  })

  it('survives a feed whose articles are missing', () => {
    const feeds = flattenFeeds({ F: { uid: '{x}', url: 'u' } })
    expect(feeds[0]?.articles).toEqual([])
  })
})

describe('isUnread', () => {
  it('treats a missing isRead as unread', () => {
    // The daemon omits the field rather than sending false, so anything
    // comparing against false gets every unread article backwards.
    expect(isUnread({ id: '1' } as RssArticle)).toBe(true)
    expect(isUnread({ id: '1', isRead: false } as RssArticle)).toBe(true)
    expect(isUnread({ id: '1', isRead: true } as RssArticle)).toBe(false)
  })

  it('counts the unread ones in a feed', async () => {
    const feeds = flattenFeeds(await api().items())
    const linux = feeds.find((f) => f.name === 'Linux ISOs')!
    expect(linux.articles).toHaveLength(2)
    expect(unreadCount(linux)).toBe(1)
  })
})

describe('feedHealth', () => {
  it('separates quiet from broken', () => {
    // The daemon drops articles older than thirty days, so an empty feed with
    // no error is not broken. Those are different things to tell somebody.
    expect(feedHealth(entry({ articles: [] }))).toBe('quiet')
    expect(feedHealth(entry({ hasError: true }))).toBe('error')
    expect(feedHealth(entry({ articles: [{ id: '1' } as RssArticle] }))).toBe('ok')
  })

  it('calls a broken feed broken even when it is also empty', () => {
    expect(feedHealth(entry({ hasError: true, articles: [] }))).toBe('error')
  })
})

describe('rss through the mock', () => {
  it('marks one article read without touching the rest', async () => {
    const rss = api()
    await rss.markAsRead('Linux ISOs', 'a1')

    const linux = flattenFeeds(await rss.items()).find((f) => f.name === 'Linux ISOs')!
    expect(linux.articles.find((a) => a.id === 'a1')?.isRead).toBe(true)
    expect(unreadCount(linux)).toBe(0)
  })

  it('marks a whole feed read when given no article', async () => {
    const rss = api()
    await rss.markAsRead('Archives\\Public Domain')
    const feed = flattenFeeds(await rss.items()).find((f) => f.name === 'Public Domain')!
    expect(unreadCount(feed)).toBe(0)
  })

  it('removes a feed by its path, folder included', async () => {
    const rss = api()
    await rss.removeItem('Archives\\Public Domain')
    expect(flattenFeeds(await rss.items()).map((f) => f.name)).not.toContain('Public Domain')
  })

  it('adds a feed', async () => {
    const rss = api()
    await rss.addFeed('https://example.org/new.xml', 'Newly Added')
    const added = flattenFeeds(await rss.items()).find((f) => f.name === 'Newly Added')
    expect(added?.url).toBe('https://example.org/new.xml')
  })

  it('round-trips a rule', async () => {
    const rss = api()
    const rules = await rss.rules()
    const rule = rules['Linux releases']!

    await rss.setRule('Linux releases', { ...rule, enabled: false })
    expect((await rss.rules())['Linux releases']?.enabled).toBe(false)

    await rss.removeRule('Linux releases')
    expect(Object.keys(await rss.rules())).not.toContain('Linux releases')
  })
})
