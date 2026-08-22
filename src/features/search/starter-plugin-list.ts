/**
 * Where the qBittorrent project keeps the plugins it maintains itself.
 *
 * `master` rather than a pinned commit, deliberately. These files exist to
 * track sites that move, and the addresses they currently carry show it:
 * `eztvx.to`, `limetorrents.lol` and `torrentproject.com.se` are all the
 * displaced form of a plainer domain. Whatever upstream has today is closer to
 * working than whatever was true on the day this list was written, and pinning
 * would hand somebody a plugin that resolves nothing. `search/updatePlugins`
 * re-fetches from the same URL afterwards, so the version installed here is a
 * starting point rather than a fixed one.
 */
const ENGINES = 'https://raw.githubusercontent.com/qbittorrent/search-plugins/master/nova3/engines'

export interface StarterPlugin {
  /**
   * The daemon's own name for it, which is the file stem and what
   * `search/plugins` reports back in `name`. That equality is what lets an
   * already installed plugin be recognised here.
   */
  name: string
  /** The plugin's own `name` attribute, which is what it calls itself. */
  label: string
  /** The plugin's own `url` attribute, shown so the site is never a surprise. */
  site: string
}

/**
 * The plugins qBittorrent maintains, and nothing else.
 *
 * rigseed does not curate this. It is the contents of `nova3/engines/` in
 * qBittorrent's own repository, which is a list the qBittorrent project
 * chooses and keeps working. Copying it is deferring to upstream rather than
 * picking torrent sites to put in front of people, which is the distinction
 * that makes offering it at all defensible.
 *
 * Jackett is in that directory and is not here. It is the one entry that does
 * not work on its own: it is a bridge to a separate Jackett server that has to
 * be installed, running, and written into the plugin's own config before it
 * returns anything. A one-click install of it produces an engine that answers
 * every query with nothing, which reads as rigseed being broken. It is still
 * installable by URL through the field above, like any other plugin.
 */
export const STARTER_PLUGINS: readonly StarterPlugin[] = [
  { name: 'eztv', label: 'EZTV', site: 'eztvx.to' },
  { name: 'limetorrents', label: 'LimeTorrents', site: 'limetorrents.lol' },
  { name: 'piratebay', label: 'The Pirate Bay', site: 'thepiratebay.org' },
  { name: 'solidtorrents', label: 'Solid Torrents', site: 'solidtorrents.to' },
  { name: 'torlock', label: 'TorLock', site: 'torlock.com' },
  { name: 'torrentproject', label: 'TorrentProject', site: 'torrentproject.com.se' },
  { name: 'torrentscsv', label: 'torrents-csv', site: 'torrents-csv.com' },
]

/** The URL `search/installPlugin` is given for one of them. */
export const sourceFor = (name: string): string => `${ENGINES}/${name}.py`
