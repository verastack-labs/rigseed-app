import { useCallback, useEffect, useMemo, useState } from 'react'
import { useShallow } from 'zustand/react/shallow'

import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { Input } from '@/components/ui/input'
import { SectionHeader } from '@/components/ui/section-header'
import { SegmentedControl } from '@/components/ui/segmented-control'
import { Switch } from '@/components/ui/switch'
import { AddTorrentDialog } from '@/features/add-torrent/add-torrent-dialog'
import { PluginManager } from '@/features/search/plugin-manager'
import { PluginSource } from '@/features/search/plugin-source'
import { PythonSource } from '@/features/search/python-source'
import { ResultHeader } from '@/features/search/result-header'
import { ResultRow } from '@/features/search/result-row'
import { DEFAULT_SORT, sortResults, type Sort } from '@/features/search/sort'
import { copy } from '@/lib/clipboard'
import { icons } from '@/lib/icons'
import { swatchColor, swatchFor } from '@/lib/labels'
import { cn } from '@/lib/utils'
import { write } from '@/lib/write'
import { useApi, useConnection } from '@/services/api-context'
import {
  awaitInstalled,
  awaitUpdated,
  checkPython,
  pluginNameFor,
  versionsOf,
  type PythonCheck,
} from '@/services/search'
import { notify } from '@/state/notice-store'
import { useSearchJob } from '@/state/use-search-job'
import {
  readAskPreference,
  shouldAskBeforeAdding,
  writeAskPreference,
} from '@/features/search/add-behaviour'
import { useThemeStore } from '@/state/theme-store'
import { useTorrentStore } from '@/state/torrent-store'
import type { SearchPlugin } from '@/types/qbittorrent'

/** Where the "set options before adding" preference is remembered. */

const CATEGORIES = [
  { value: 'all', label: 'All' },
  { value: 'movies', label: 'Movies' },
  { value: 'tv', label: 'TV' },
  { value: 'music', label: 'Music' },
  { value: 'software', label: 'Software' },
  { value: 'books', label: 'Books' },
]

/**
 * The three ways search can be blocked before a query is even typed.
 *
 * Separate entries rather than one "search unavailable", because they have
 * three different answers: install Python, point the daemon at a different
 * Python, or install a plugin. A single message would send everyone to check
 * the same wrong thing.
 */
const BLOCKED = {
  'python-missing': {
    title: 'Search is unavailable, Python was not found',
    body: 'The search engine runs on Python 3, which rigseed does not bundle. Install it, then reopen rigseed so the daemon it starts can find it.',
    api: 'search/start → 409',
  },
  'python-unusable': {
    title: 'Search is unavailable, the Python it found cannot read rigseed’s files',
    body: 'Python is installed, and the copy the daemon found runs in a sandbox that cannot open rigseed’s data folder. On Windows that is usually the Microsoft Store build. Installing Python from python.org fixes it, and rigseed will use it automatically.',
    api: 'nova2.py → could not be opened',
  },
  'no-plugins': {
    title: 'No search plugins installed',
    body: 'Searching needs at least one plugin. Each plugin is a Python file that teaches the client how to query one site. qBittorrent ships none, so this starts empty everywhere, not only here.',
    api: 'search/plugins → []',
  },
} as const

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
  const connection = useConnection()
  const { results, phase, error, run, stop } = useSearchJob()

  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('all')
  const [plugins, setPlugins] = useState<readonly SearchPlugin[] | null>(null)
  const [muted, setMuted] = useState<readonly string[]>([])
  const [expanded, setExpanded] = useState<string | null>(null)
  const [managing, setManaging] = useState(false)
  const [busy, setBusy] = useState(false)
  const [sort, setSort] = useState<Sort>(DEFAULT_SORT)

  /*
   * Which hit is waiting on the dialog, held as its URL rather than a boolean.
   * The dialog is mounted only while something is pending, which is what makes
   * every field start fresh for the next one.
   */
  const [pending, setPending] = useState<string | null>(null)

  /*
   * Whether adding a hit stops at the dialog first.
   *
   * The default follows the layout the visitor chose at setup, because that
   * choice already said how much detail they want put in front of them. Easy
   * is the one that asks for fewer decisions, so it adds straight away; Grid
   * and List are the denser views and get the dialog, with its save path,
   * category and start-paused.
   *
   * It defaulted to plain `false` before, so every layout skipped the dialog
   * and somebody on List had to find a switch to get back the behaviour their
   * layout already implied.
   *
   * The switch below still wins, and only once it has actually been used.
   * Storage holding null means untouched, which is what lets the layout drive
   * it; the old version wrote the default into storage on mount, so the answer
   * froze on first visit and changing layout afterwards did nothing. Reads and
   * writes are wrapped because a browser with storage blocked throws here
   * rather than returning null, and losing the page to a preference would be a
   * poor trade.
   */
  const defaultLayout = useThemeStore((st) => st.defaultLayout)

  const [askOverride, setAskOverride] = useState<boolean | null>(readAskPreference)
  const askBeforeAdding = shouldAskBeforeAdding(askOverride, defaultLayout)

  const setAskBeforeAdding = (next: boolean) => {
    setAskOverride(next)
    writeAskPreference(next)
  }
  const [failure, setFailure] = useState<string | null>(null)

  const categories = useTorrentStore(useShallow((st) => Object.keys(st.categories)))
  const tags = useTorrentStore(useShallow((st) => st.tags))
  const freeSpace = useTorrentStore((st) => st.serverState.free_space_on_disk ?? 0)

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

  /**
   * Whether search can run at all, asked before anybody tries.
   *
   * The screen used to find out only from a failed search, which on a fresh
   * install is a message nobody ever sees: with no plugins installed there is
   * nothing worth searching for, so the attempt that would have reported it
   * never happens.
   *
   * It also used to accept the daemon's own answer, which on Windows is
   * routinely wrong in the one direction that matters. See `checkPython`.
   */
  const [python, setPython] = useState<PythonCheck>({ state: 'unknown' })
  useEffect(() => {
    let live = true
    void (async () => {
      const spawned = connection.status === 'connected' && connection.spawned
      const first = await checkPython(api.search, { spawned })

      // Repointing the daemon at an interpreter that works is rigseed's own
      // housekeeping, not a decision to put to somebody. It is a daemon we
      // started, the value was verified by running it, and the alternative is
      // a screen that explains at length why a feature it could have fixed
      // does not work. Never for a daemon we merely connected to: `spawned`
      // is what keeps this off somebody else's machine.
      if (live && first.state === 'unusable' && first.fix) {
        try {
          await api.app.setPreferences({ python_executable_path: first.fix })
          if (live) setPython({ state: 'ok' })
          return
        } catch {
          // Fall through and report it. A daemon that will not take the
          // preference is exactly the case the banner exists for.
        }
      }
      if (live) setPython(first)
    })()
    return () => {
      live = false
    }
  }, [api, connection])

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

  /*
   * Filtered, then sorted across everything.
   *
   * Sorting has to happen here rather than inside a per-engine group, which is
   * what the list effectively was: `search/results` answers per plugin and the
   * daemon appends, so the array arrives engine-major and nothing had ever
   * reordered it, while the header claimed it was sorted by seeds.
   */
  const shown = useMemo(
    () =>
      sortResults(
        results.filter((r) => !muted.includes(r.engine ?? 'unknown')),
        sort,
      ),
    [results, muted, sort],
  )

  const enabledCount = (plugins ?? []).filter((p) => p.enabled).length
  const noPlugins = plugins !== null && plugins.length === 0
  // 409 is what the daemon answers when Python is missing. Anything else that
  // blocks a search is reported as itself rather than guessed at. The probe
  // gets the same answer without waiting for somebody to try.
  const noPython =
    python.state === 'missing' || (phase === 'blocked' && (error?.includes('409') ?? false))

  /**
   * Which of the three is in the way, most fundamental first.
   *
   * Ordered rather than combined: with no Python at all, having no plugins is
   * true and is not the thing to fix.
   */
  const problem: keyof typeof BLOCKED | null = noPython
    ? 'python-missing'
    : python.state === 'unusable'
      ? 'python-unusable'
      : noPlugins
        ? 'no-plugins'
        : null

  /**
   * Every write the plugin dialog makes, and the one place they can fail.
   *
   * These used to run uncaught behind `void`, so a rejected install cleared
   * the busy flag, left the list exactly as it was, and said nothing. That was
   * survivable while the only way in was pasting a URL, because somebody who
   * has just pasted something knows what they were trying. It is not
   * survivable now: installing from the starter list is a fetch the daemon
   * makes over the network, and a plugin that quietly does not appear reads as
   * rigseed ignoring the click.
   *
   * Reported inside the dialog rather than through a global notice, which does
   * not exist here yet. The failure belongs next to the list it failed to
   * change either way.
   */
  const pluginWrite = async (job: () => Promise<unknown>) => {
    setBusy(true)
    setFailure(null)
    try {
      await job()
      await refreshPlugins()
    } catch (cause) {
      setFailure(cause instanceof Error ? cause.message : String(cause))
    } finally {
      setBusy(false)
    }
  }

  /**
   * Installing, which is the one write that cannot be believed.
   *
   * Every other call in this dialog has done what it says by the time it
   * answers. `installPlugin` answers first and fetches afterwards, so success
   * here means the plugin appeared in a later `search/plugins`, not that a
   * request returned 200.
   */
  const install = async (sources: readonly string[]) => {
    const wanted = sources.map(pluginNameFor).filter(Boolean)
    setBusy(true)
    setFailure(null)
    try {
      await api.search.installPlugin(sources)
      const { missing } = await awaitInstalled(api.search, wanted)
      await refreshPlugins()
      if (missing.length > 0) {
        setFailure(
          `${missing.join(', ')} did not install. The daemon accepted the request and then rejected the plugin; its log says why.`,
        )
      }
    } catch (cause) {
      setFailure(cause instanceof Error ? cause.message : String(cause))
    } finally {
      setBusy(false)
    }
  }

  /**
   * Checking for plugin updates, which used to say nothing at all.
   *
   * The button called `updatePlugins` and refreshed the list, so updating three
   * plugins and updating none looked identical: no message, and versions that
   * most people have never read. The endpoint answers before it has fetched
   * anything, so the outcome is only visible by comparing versions afterwards.
   *
   * Announced rather than left silent even when nothing changed. "Everything is
   * current" is the answer somebody pressing this wants most of the time, and
   * it is the one a silent button never gives.
   */
  const checkUpdates = async () => {
    setBusy(true)
    setFailure(null)
    try {
      const before = versionsOf(plugins ?? [])
      await api.search.updatePlugins()
      const { updated } = await awaitUpdated(api.search, before)
      await refreshPlugins()
      notify({
        tone: 'ok',
        what:
          updated.length === 0
            ? 'Plugins are up to date'
            : `Updated ${updated.length} plugin${updated.length === 1 ? '' : 's'}`,
        ...(updated.length > 0 ? { detail: updated.join(', ') } : {}),
      })
    } catch (cause) {
      setFailure(cause instanceof Error ? cause.message : String(cause))
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

      {problem ? (
        <div className="shrink-0 px-6 pt-5">
          <div className="flex items-start gap-3 rounded-xl border border-warn bg-warn-soft px-4 py-3.5">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-warn/15 text-warn">
              <icons.logs className="size-4" strokeWidth={2} />
            </span>
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <p className="text-[12.5px] font-semibold text-text">{BLOCKED[problem].title}</p>
              <p className="text-[11.5px] leading-[1.6] text-text-dim">{BLOCKED[problem].body}</p>
              {problem === 'no-plugins' ? (
                <PluginSource className="justify-start pt-0.5" />
              ) : (
                <PythonSource className="justify-start pt-0.5" />
              )}
              {/* What was tried, when the answer is "your Python cannot read
                  our files". Without it the message is unfalsifiable: the one
                  thing somebody will check is whether Python is installed,
                  and it is. */}
              {problem === 'python-unusable' && python.tried?.length ? (
                <ul className="flex flex-col gap-0.5 pt-0.5">
                  {python.tried.map((line) => (
                    <li key={line} className="font-mono text-[10.5px] break-all text-text-dimmer">
                      {line}
                    </li>
                  ))}
                </ul>
              ) : (
                <span className="font-mono text-[10.5px] text-text-dimmer">
                  {BLOCKED[problem].api}
                </span>
              )}
            </div>
            {problem === 'no-plugins' ? (
              <Button variant="secondary" size="sm" onClick={() => setManaging(true)}>
                Install a plugin
              </Button>
            ) : null}
          </div>
        </div>
      ) : null}

      <div className="flex shrink-0 flex-col gap-3 px-6 py-4">
        <div className="flex items-center gap-2">
          <Input
            size="lg"
            value={query}
            disabled={problem !== null}
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
            disabled={problem !== null || (phase !== 'searching' && !query.trim())}
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
          {/*
            Off is the quick path: the hit starts downloading where the daemon
            already puts things. On opens the same dialog the toolbar's Add
            button opens, for a save path, a category, or starting it paused.

            It starts wherever the chosen layout implies and stays where it is
            put after that, so this is an override rather than the only way to
            get a sensible answer.

            Named for what turning it on does, rather than for a mode. "Easy"
            would describe the person rather than the behaviour, and a control
            has to say what it changes.
          */}
          <Switch
            checked={askBeforeAdding}
            onChange={setAskBeforeAdding}
            label="Set options before adding"
          />
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-6 pb-5">
        <Card title="Results" api="search/results" padding="none">
          <ResultHeader sort={sort} onSort={setSort} />

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
                onAdd={() => {
                  if (askBeforeAdding) {
                    setPending(result.fileUrl)
                    return
                  }
                  void write('Add torrent', () => api.torrents.add({ urls: [result.fileUrl] }), {
                    announce: 'Torrent added',
                  })
                }}
                onCopyMagnet={() => void copy('magnet link', result.fileUrl)}
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
        failure={failure}
        onDismissFailure={() => setFailure(null)}
        onInstall={(sources) => void install(sources)}
        onToggle={(name, enable) => void pluginWrite(() => api.search.enablePlugin([name], enable))}
        onUninstall={(name) => void pluginWrite(() => api.search.uninstallPlugin([name]))}
        onCheckUpdates={() => void checkUpdates()}
      />

      {/*
        Mounted only while a hit is waiting, which is what makes the next one
        open with empty fields rather than inheriting the last one's category.
        The link is handed over as the magnet source, because the user has
        already chosen which torrent; the dialog is for everything else.
      */}
      {pending !== null ? (
        <AddTorrentDialog
          initialSource="magnet"
          initialMagnet={pending}
          onClose={() => setPending(null)}
          categories={categories}
          tags={tags}
          freeSpace={freeSpace}
        />
      ) : null}
    </div>
  )
}
