import { canReachDesktop, openUrl } from '@/services/shell'
import { cn } from '@/lib/utils'

/**
 * The official plugin list, which qBittorrent maintains and rigseed does not.
 *
 * Short and redirecting rather than the wiki URL it currently points at, so a
 * move on their side does not strand this link.
 */
const PLUGIN_LIST = 'https://plugins.qbittorrent.org'

export interface PluginSourceProps {
  className?: string
}

/**
 * Where to get search plugins.
 *
 * The one thing qBittorrent's own plugins dialog offers that rigseed did not:
 * a way out of an empty list. There is no catalogue in the Web API and none in
 * qBittorrent's interface either, so both clients can only point at a page.
 *
 * rigseed points rather than curating. A bundled list would mean choosing
 * which torrent sites the product puts in front of people and keeping
 * third-party URLs alive as they rot, and qBittorrent's decision to link out
 * instead reads as deliberate.
 *
 * The disclaimer is not boilerplate. These are Python files that the daemon
 * executes, fetched from repositories nobody here controls, so the person
 * installing one should know whose judgement they are relying on.
 */
export function PluginSource({ className }: PluginSourceProps) {
  // Hidden rather than dead outside Tauri, which is the rule the rest of the
  // shell handoffs follow: never offer what cannot happen.
  if (!canReachDesktop()) return null

  return (
    <span className={cn('flex flex-wrap items-center justify-center gap-1.5', className)}>
      <span className="text-[11px] text-text-dim">
        Plugins are written and hosted by the community. rigseed does not review them.
      </span>
      <button
        type="button"
        onClick={() => void openUrl(PLUGIN_LIST)}
        className="rounded text-[11px] font-semibold text-accent underline underline-offset-2 transition-colors duration-quick hover:text-accent2"
      >
        Where to get plugins
      </button>
    </span>
  )
}
