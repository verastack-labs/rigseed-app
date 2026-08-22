import { useState } from 'react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { IconButton } from '@/components/ui/icon-button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { PluginSource } from '@/features/search/plugin-source'
import { StarterPlugins } from '@/features/search/starter-plugins'
import { icons } from '@/lib/icons'
import { cn } from '@/lib/utils'
import type { SearchPlugin } from '@/types/qbittorrent'

export interface PluginManagerProps {
  open: boolean
  onClose: () => void
  plugins: readonly SearchPlugin[]
  /** Given raw `.py` URLs. `installPlugin` takes any number in one call. */
  onInstall: (sources: readonly string[]) => void
  onToggle: (name: string, enable: boolean) => void
  onUninstall: (name: string) => void
  onCheckUpdates: () => void
  busy?: boolean
  /** Why the last write did not happen, if it did not. */
  failure?: string | null
  onDismissFailure?: () => void
}

/**
 * Install, enable and remove search plugins.
 *
 * The explanation is not decoration. A search plugin is a Python file that
 * teaches the daemon how to query one site, which is not a thing anybody
 * guesses from the word "plugin", and without at least one the search screen
 * has nothing to do. It appears here and in the empty state for that reason.
 *
 * Uninstall does not confirm. The plugin is a file the daemon can fetch again
 * from the same URL, which is on screen next to the button, so a mistaken
 * click costs one paste rather than any data.
 */
export function PluginManager({
  open,
  onClose,
  plugins,
  onInstall,
  onToggle,
  onUninstall,
  onCheckUpdates,
  busy,
  failure,
  onDismissFailure,
}: PluginManagerProps) {
  const [source, setSource] = useState('')

  const install = () => {
    const trimmed = source.trim()
    if (!trimmed) return
    onInstall([trimmed])
    setSource('')
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Search plugins"
      description={<span className="font-mono text-[10.5px] text-text-dimmer">search/plugins</span>}
      width={780}
      icon={<icons.search className="size-[15px]" strokeWidth={2} />}
    >
      <div className="flex flex-col">
        <div className="flex items-center gap-2 border-b border-line bg-surface2 px-[18px] py-3">
          <Input
            mono
            value={source}
            onChange={(e) => setSource(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') install()
            }}
            aria-label="Plugin URL or path"
            placeholder="https://example.org/plugin.py or /path/to/plugin.py"
            className="min-w-0 flex-1"
          />
          <Button variant="primary" size="sm" onClick={install} disabled={!source.trim() || busy}>
            Install
          </Button>
          <Button variant="secondary" size="sm" onClick={onCheckUpdates} disabled={busy}>
            Check updates
          </Button>
        </div>

        {/* An alert rather than a quiet line. Nothing else on screen changes
            when a write fails, so if this is not announced it is not noticed:
            the list looks exactly as it did before the click. */}
        {failure ? (
          <div
            role="alert"
            className="flex items-start gap-2.5 border-b border-warn bg-warn-soft px-[18px] py-2.5"
          >
            <span className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span className="text-[11.5px] font-semibold text-text">That did not go through</span>
              <span className="font-mono text-[10.5px] break-words text-text-dim">{failure}</span>
            </span>
            {onDismissFailure ? (
              <IconButton title="Dismiss" onClick={onDismissFailure}>
                <icons.clear className="size-[14px]" strokeWidth={2} />
              </IconButton>
            ) : null}
          </div>
        ) : null}

        <div className="max-h-[420px] min-h-0 overflow-y-auto">
          {plugins.length === 0 ? (
            <div className="flex flex-col items-center gap-1.5 px-[18px] py-6 text-center">
              <p className="text-[13px] font-semibold text-text">No plugins installed</p>
              <p className="mx-auto max-w-[440px] text-[11.5px] leading-[1.6] text-text-dim">
                Searching needs at least one plugin. Each plugin is a Python file that teaches the
                client how to query one site. qBittorrent ships none, so this list starts empty
                everywhere, not only here.
              </p>
            </div>
          ) : (
            plugins.map((plugin) => (
              <div
                key={plugin.name}
                className="flex items-center gap-3 border-t border-line px-[18px] py-3 first:border-t-0"
              >
                <Switch
                  checked={plugin.enabled}
                  onChange={(next) => onToggle(plugin.name, next)}
                  label={`Enable ${plugin.fullName}`}
                />
                <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="truncate text-[12.5px] font-semibold text-text">
                    {plugin.fullName}
                  </span>
                  <span className="truncate font-mono text-[10.5px] text-text-dimmer">
                    {plugin.url}
                  </span>
                </span>
                <span className="shrink-0 font-mono text-[11px] text-text-dim tabular-nums">
                  {plugin.version}
                </span>
                <Badge tone={plugin.enabled ? 'accent' : 'neutral'}>
                  {plugin.enabled ? 'Enabled' : 'Disabled'}
                </Badge>
                <IconButton
                  title={`Uninstall ${plugin.fullName}`}
                  onClick={() => onUninstall(plugin.name)}
                >
                  <icons.remove className="size-[15px]" strokeWidth={2} />
                </IconButton>
              </div>
            ))
          )}

          {/* Under the installed list rather than above it. Once anything is
              installed this is a suggestion, and a suggestion does not belong
              in front of what somebody came here to manage. On an empty list
              it is the first thing under the explanation, which is where it
              is actually needed. */}
          <StarterPlugins
            installed={plugins.map((plugin) => plugin.name)}
            onInstall={onInstall}
            busy={busy ?? false}
            className="border-t border-line bg-surface2"
          />

          <div className="flex items-center justify-center border-t border-line px-[18px] py-2.5">
            <PluginSource />
          </div>
        </div>

        <div className={cn('flex items-center gap-2 border-t border-line px-[18px] py-3')}>
          <span className="font-mono text-[10.5px] text-text-dimmer tabular-nums">
            {plugins.length} installed · {plugins.filter((p) => p.enabled).length} enabled
          </span>
          <span className="flex-1" />
          <Button variant="primary" size="sm" onClick={onClose}>
            Done
          </Button>
        </div>
      </div>
    </Dialog>
  )
}
