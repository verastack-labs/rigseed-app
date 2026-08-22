import { Button } from '@/components/ui/button'
import { STARTER_PLUGINS, sourceFor } from '@/features/search/starter-plugin-list'
import { icons } from '@/lib/icons'
import { cn } from '@/lib/utils'

export interface StarterPluginsProps {
  /** `name` of every plugin the daemon already has, from `search/plugins`. */
  installed: readonly string[]
  /** Given raw `.py` URLs. `installPlugin` takes any number in one call. */
  onInstall: (sources: readonly string[]) => void
  busy?: boolean
  className?: string
}

/**
 * A way out of an empty plugin list.
 *
 * The screen used to offer only a URL field and a link to a wiki, which asks
 * somebody who has just learned that plugins exist to go and find one, work
 * out which of the links on that page is a raw file, and paste it back. That
 * is a fair amount to ask before the Search screen does anything at all.
 *
 * Installed entries are dropped rather than shown greyed out, and the whole
 * component returns null once all of them are in. This is scaffolding for an
 * empty list, so it should get out of the way as the list fills rather than
 * becoming a permanent panel of disabled buttons.
 *
 * The warning stays even though these come from qBittorrent. A plugin is a
 * Python file the daemon executes, and that is true of these too. What changes
 * is whose judgement is being relied on, so the line names them rather than
 * repeating the community disclaimer that `PluginSource` carries.
 */
export function StarterPlugins({ installed, onInstall, busy, className }: StarterPluginsProps) {
  const missing = STARTER_PLUGINS.filter((plugin) => !installed.includes(plugin.name))
  if (missing.length === 0) return null

  return (
    <div className={cn('flex flex-col', className)}>
      <div className="flex items-center gap-2 px-[18px] py-2.5">
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="text-[11.5px] font-semibold text-text">
            Maintained by the qBittorrent project
          </span>
          <span className="text-[11px] leading-[1.5] text-text-dim">
            These are the plugins in qBittorrent&rsquo;s own repository. rigseed does not choose
            them and does not review them. Each one is a Python file the daemon runs.
          </span>
        </span>
        <Button
          variant="secondary"
          size="sm"
          disabled={busy}
          onClick={() => onInstall(missing.map((plugin) => sourceFor(plugin.name)))}
        >
          Install all {missing.length}
        </Button>
      </div>

      <ul className="flex flex-col">
        {missing.map((plugin) => (
          <li
            key={plugin.name}
            className="flex items-center gap-3 border-t border-line px-[18px] py-2"
          >
            <span className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span className="truncate text-[12px] font-semibold text-text">{plugin.label}</span>
              <span className="truncate font-mono text-[10.5px] text-text-dimmer">
                {plugin.site}
              </span>
            </span>
            <Button
              variant="secondary"
              size="sm"
              disabled={busy}
              // Named rather than left as "Install", which is also the
              // toolbar button's label. Seven identical names in one dialog
              // is ambiguous to a screen reader reading the button list, and
              // was ambiguous to the tests too.
              aria-label={`Install ${plugin.label}`}
              onClick={() => onInstall([sourceFor(plugin.name)])}
            >
              <icons.add className="size-[13px]" strokeWidth={2.2} />
              Install
            </Button>
          </li>
        ))}
      </ul>
    </div>
  )
}
