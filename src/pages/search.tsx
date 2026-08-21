import { useCallback, useEffect, useMemo, useState } from 'react'

import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { Input } from '@/components/ui/input'
import { SectionHeader } from '@/components/ui/section-header'
import { SegmentedControl } from '@/components/ui/segmented-control'
import { PluginManager } from '@/features/search/plugin-manager'
import { RESULT_COLUMNS, ResultRow } from '@/features/search/result-row'
import { icons } from '@/lib/icons'
import { swatchColor, swatchFor } from '@/lib/labels'
import { cn } from '@/lib/utils'
import { useApi } from '@/services/api-context'
import { useSearchJob } from '@/state/use-search-job'
import type { SearchPlugin } from '@/types/qbittorrent'

const CATEGORIES = [
  { value: 'all', label: 'All' },
  { value: 'movies', label: 'Movies' },
  { value: 'tv', label: 'TV' },
  { value: 'music', label: 'Music' },
  { value: 'software', label: 'Software' },
  { value: 'books', label: 'Books' },
]

/**
 * Search.
 *
 * Five states, and only two of them are about results. The other three say
 * why there are none: no plugins installed, no Python on the host, or a query
 * that genuinely matched nothing. Those are different problems with different
 * answers, and a single "no results" would send someone looking in the wrong
 * place for all three.
 */
export function Search() {
  const api = useApi()
  const { results, phase, error, run, stop } = useSearchJob()

  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('all')
  const [plugins, setPlugins] = useState<readonly SearchPlugin[] | null>(null)
  const [muted, setMuted] = useState<readonly string[]>([])
  const [expanded, setExpanded] = useState<string | null>(null)
  const [managing, setManaging] = useState(false)
  const [busy, setBusy] = useState(false)

  const refreshPlugins = useCallback(async () => {
    try {
      setPlugins(await api.search.plugins())
    } catch {
      // Leave it null. The screen shows the loading shape rather than
      // claiming there are no plugins when it simply could not ask.
    }
  }, [api])

  // Inline rather than calling `refreshPlugins`, so the setState is plainly
  // inside a promise callback. The lint rule reads a direct call in an effect
  // as a synchronous update, and it is right to: the two are hard to tell
  // apart from the outside.
  useEffect(() => {
    let live = true
    void (async () => {
      try {
        const list = await api.search.plugins()
        if (live) setPlugins(list)
      } catch {
        // Left null, so the screen shows the loading shape rather than
        // claiming there are no plugins when it simply could not ask.
      }
    })()
    return () => {
      live = false
    }
  }, [api])

  /** How many hits each engine returned, for the chips. */
  const perEngine = useMemo(() => {
    const tally = new Map<string, number>()
    for (const r of results) {
      const engine = r.engine ?? 'unknown'
      tally.set(engine, (tally.get(engine) ?? 0) + 1)
    }
    return tally
  }, [results])

  const engines = useMemo(() => {
    const names = new Set<string>(perEngine.keys())
    for (const p of plugins ?? []) if (p.enabled) names.add(p.fullName)
    return [...names].sort()
  }, [perEngine, plugins])

  const shown = useMemo(
    () => results.filter((r) => !muted.includes(r.engine ?? 'unknown')),
    [results, muted],
  )

  const enabledCount = (plugins ?? []).filter((p) => p.enabled).length
  const noPlugins = plugins !== null && plugins.length === 0
  // 409 is what the daemon answers when Python is missing. Anything else that
  // blocks a search is reported as itself rather than guessed at.
  const noPython = phase === 'blocked' && (error?.includes('409') ?? false)

  const write = async (job: () => Promise<unknown>) => {
    setBusy(true)
    try {
      await job()
      await refreshPlugins()
    } finally {
      setBusy(false)
    }
  }

  const submit = () => {
    if (phase === 'searching') void stop()
    else {
      setExpanded(null)
      void run(query, category)
    }
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="flex shrink-0 items-start gap-6 border-b border-line px-6 py-5">
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <h1 className="text-[30px] leading-none font-semibold tracking-[-0.02em] text-text">
            Search
          </h1>
          <p className="text-[12.5px] text-text-dim">
            Queries run through installed search plugins. Results come back per engine as each one
            answers.
          </p>
        </div>
        <Button variant="secondary" size="sm" onClick={() => setManaging(true)}>
          Plugins {plugins ? plugins.length : ''}
        </Button>
      </header>

      {noPython || noPlugins ? (
        <div className="shrink-0 px-6 pt-5">
          <div className="flex items-start gap-3 rounded-xl border border-warn bg-warn-soft px-4 py-3.5">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-warn/15 text-warn">
              <icons.logs className="size-4" strokeWidth={2} />
            </span>
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <p className="text-[12.5px] font-semibold text-text">
                {noPython
                  ? 'Search is unavailable, Python was not found'
                  : 'No search plugins installed'}
              </p>
              <p className="text-[11.5px] leading-[1.6] text-text-dim">
                {noPython
                  ? 'The search engine runs on Python 3. Install it on the host, then restart qbittorrent-nox and this panel will enable itself.'
                  : 'Searching needs at least one plugin. Each plugin is a Python file that teaches the client how to query one site.'}
              </p>
              <span className="font-mono text-[10.5px] text-text-dimmer">
                {noPython ? 'search/start → 409' : 'search/plugins → []'}
              </span>
            </div>
            {noPython ? null : (
              <Button variant="secondary" size="sm" onClick={() => setManaging(true)}>
                Install a plugin
              </Button>
            )}
          </div>
        </div>
      ) : null}

      <div className="flex shrink-0 flex-col gap-3 px-6 py-4">
        <div className="flex items-center gap-2">
          <Input
            size="lg"
            value={query}
            disabled={noPython || noPlugins}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') submit()
            }}
            aria-label="Search query"
            placeholder="What are you looking for?"
            icon={<icons.search className="size-[15px]" strokeWidth={2} />}
            className="min-w-0 flex-1"
          />
          {/* Not the Input's `unit`, which reserves 44px and put this label
              under the button. The endpoint belongs near the control that
              calls it, at a width that fits what it says. */}
          <span className="shrink-0 font-mono text-[10.5px] text-text-dimmer">search/start</span>
          <Button
            variant="primary"
            size="lg"
            disabled={noPython || noPlugins || (phase !== 'searching' && !query.trim())}
            onClick={submit}
          >
            {phase === 'searching' ? 'Stop' : 'Search'}
          </Button>
        </div>

        {engines.length > 0 ? (
          <div className="flex flex-wrap items-center gap-2">
            <SectionHeader className="shrink-0">Engines</SectionHeader>
            {engines.map((engine) => {
              const off = muted.includes(engine)
              return (
                <button
                  key={engine}
                  type="button"
                  aria-pressed={!off}
                  onClick={() =>
                    setMuted((prev) =>
                      prev.includes(engine) ? prev.filter((e) => e !== engine) : [...prev, engine],
                    )
                  }
                  className={cn(
                    'flex items-center gap-1.5 rounded-chip border px-2.5 py-1 text-[11px] font-semibold',
                    'transition-colors duration-quick',
                    off
                      ? 'border-line bg-surface2 text-text-dim'
                      : 'border-accent bg-surface text-text',
                  )}
                >
                  <span
                    aria-hidden="true"
                    className="size-[7px] rounded-full"
                    style={{
                      background: off ? 'var(--text-dimmer)' : swatchColor(swatchFor(engine)),
                    }}
                  />
                  {engine}
                  <span className="font-mono text-text-dimmer tabular-nums">
                    {perEngine.get(engine) ?? 0}
                  </span>
                </button>
              )
            })}
          </div>
        ) : null}

        <div className="flex flex-wrap items-center gap-2">
          <SectionHeader className="shrink-0">Category</SectionHeader>
          <SegmentedControl
            label="Search category"
            value={category}
            onChange={setCategory}
            options={CATEGORIES}
            size="sm"
          />
          <span className="flex-1" />
          <span className="font-mono text-[10.5px] text-text-dimmer">sorted by seeds</span>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-6 pb-5">
        <Card title="Results" api="search/results" padding="none">
          <div
            className={cn(
              'grid gap-2 border-b border-line bg-surface2 px-4 py-2',
              'text-[9.5px] font-bold tracking-[0.08em] text-text-dimmer uppercase',
              RESULT_COLUMNS,
            )}
          >
            <span>Name</span>
            <span className="text-right">Size</span>
            <span className="text-right">Seeds</span>
            <span className="text-right">Peers</span>
            <span>Engine</span>
          </div>

          {shown.length === 0 ? (
            <div className="px-4 py-8">
              {phase === 'idle' ? (
                <EmptyState
                  icon={<icons.search className="size-6" strokeWidth={1.7} />}
                  title="Nothing searched yet"
                  body="Type what you are looking for. Every enabled plugin is asked at once, and results appear as each one answers."
                />
              ) : phase === 'searching' ? (
                <EmptyState
                  icon={<icons.search className="size-6" strokeWidth={1.7} />}
                  title="Asking the engines"
                  body="Nothing has come back yet. Results appear here as each plugin answers."
                />
              ) : (
                <EmptyState
                  icon={<icons.search className="size-6" strokeWidth={1.7} />}
                  title="No results"
                  body={
                    results.length > 0
                      ? 'Every hit is from an engine you have muted. Turn one back on above.'
                      : 'Every engine answered and none of them had anything for that query.'
                  }
                />
              )}
            </div>
          ) : (
            shown.map((result) => (
              <ResultRow
                key={result.fileUrl}
                result={result}
                expanded={expanded === result.fileUrl}
                onToggle={() =>
                  setExpanded((prev) => (prev === result.fileUrl ? null : result.fileUrl))
                }
                onAdd={() => void api.torrents.add({ urls: [result.fileUrl] })}
                onCopyMagnet={() => void navigator.clipboard?.writeText(result.fileUrl)}
              />
            ))
          )}

          <div className="flex items-center gap-2 border-t border-line px-4 py-2.5">
            <span className="font-mono text-[10.5px] text-text-dimmer tabular-nums">
              {shown.length === results.length
                ? `${results.length} results`
                : `${shown.length} of ${results.length}`}
            </span>
            <span className="flex-1" />
            <span className="flex items-center gap-1.5 text-[10.5px] font-semibold">
              <span
                aria-hidden="true"
                className={cn(
                  'size-[7px] rounded-full',
                  phase === 'searching' && 'bg-accent motion-safe:animate-pulse',
                  phase === 'complete' && 'bg-accent2',
                  phase === 'blocked' && 'bg-warn',
                  phase === 'idle' && 'bg-text-dimmer',
                )}
              />
              <span className="font-mono text-text-dimmer">
                {phase === 'searching'
                  ? `querying ${enabledCount} engines`
                  : phase === 'complete'
                    ? `complete · ${enabledCount} engines answered`
                    : phase === 'blocked'
                      ? `blocked · ${error ?? 'unknown'}`
                      : 'idle'}
              </span>
            </span>
          </div>
        </Card>
      </div>

      <PluginManager
        open={managing}
        onClose={() => setManaging(false)}
        plugins={plugins ?? []}
        busy={busy}
        onInstall={(source) => void write(() => api.search.installPlugin([source]))}
        onToggle={(name, enable) => void write(() => api.search.enablePlugin([name], enable))}
        onUninstall={(name) => void write(() => api.search.uninstallPlugin([name]))}
        onCheckUpdates={() => void write(() => api.search.updatePlugins())}
      />
    </div>
  )
}
