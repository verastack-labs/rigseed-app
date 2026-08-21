import type { Transport } from '@/services/transport'
import type { RssArticle, RssFeed, RssFeedEntry, RssRule } from '@/types/qbittorrent'

/**
 * RSS.
 *
 * `rss/items` answers a tree rather than a list, keyed by name, with folders
 * nested inside it. Every write takes the key path of the thing it acts on,
 * not an id, which is why `RssFeedEntry` carries the path it was found at:
 * lose that and a feed can be displayed but not deleted.
 */
export function createRssApi(transport: Transport) {
  return {
    /** The tree. `withData` is what fills in `articles`. */
    items: () => transport.get<Record<string, unknown>>('rss/items', { withData: 'true' }),

    rules: () => transport.get<Record<string, RssRule>>('rss/rules'),

    /** `path` is the display path, folders included: `Anime\\Subsplease`. */
    addFeed: (url: string, path: string) => transport.post<void>('rss/addFeed', { url, path }),

    removeItem: (path: string) => transport.post<void>('rss/removeItem', { path }),

    /** Refreshes everything under `path`. The empty string is the whole tree. */
    refreshItem: (path = '') => transport.post<void>('rss/refreshItem', { itemPath: path }),

    markAsRead: (path: string, articleId?: string) =>
      transport.post<void>('rss/markAsRead', {
        itemPath: path,
        ...(articleId ? { articleId } : {}),
      }),

    setRule: (name: string, rule: RssRule) =>
      transport.post<void>('rss/setRule', { ruleName: name, ruleDef: JSON.stringify(rule) }),

    removeRule: (name: string) => transport.post<void>('rss/removeRule', { ruleName: name }),

    /** Which articles a rule would catch, keyed by feed name. */
    matchingArticles: (ruleName: string) =>
      transport.get<Record<string, string[]>>('rss/matchingArticles', { ruleName }),
  }
}

export type RssApi = ReturnType<typeof createRssApi>

/**
 * Turn the tree into a list, keeping the path each feed was found at.
 *
 * A node is a feed when it has a `uid`; anything else with children is a
 * folder. That is the only thing distinguishing them, since both are plain
 * objects keyed by name, and a folder called the same thing as a feed is
 * indistinguishable by name alone.
 *
 * Paths use a backslash, which is what the API's own write endpoints expect,
 * regardless of the platform. It is a key separator, not a file path.
 */
export function flattenFeeds(tree: Record<string, unknown>, prefix = ''): RssFeedEntry[] {
  const found: RssFeedEntry[] = []

  for (const [name, node] of Object.entries(tree)) {
    if (!node || typeof node !== 'object') continue
    const path = prefix ? `${prefix}\\${name}` : name

    if ('uid' in node) {
      const feed = node as RssFeed
      found.push({
        ...feed,
        articles: Array.isArray(feed.articles) ? feed.articles : [],
        path,
        name,
      })
    } else {
      found.push(...flattenFeeds(node as Record<string, unknown>, path))
    }
  }

  return found.sort((a, b) => a.name.localeCompare(b.name))
}

/**
 * Unread, from the article itself.
 *
 * `isRead` is absent rather than false on an unread article in some versions,
 * so this asks whether it is read rather than comparing against false.
 */
export const isUnread = (article: RssArticle): boolean => article.isRead !== true

export const unreadCount = (feed: RssFeedEntry): number => feed.articles.filter(isUnread).length

/**
 * A feed that answered but has published nothing lately.
 *
 * The daemon drops articles older than thirty days, so a feed with no
 * articles and no error is not broken: it is quiet. Those are different
 * things to tell somebody, and the dot colour is the only place the
 * difference shows.
 */
export function feedHealth(feed: RssFeedEntry): 'ok' | 'quiet' | 'error' {
  if (feed.hasError) return 'error'
  return feed.articles.length === 0 ? 'quiet' : 'ok'
}
