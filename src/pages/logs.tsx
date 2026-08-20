import { useMemo, useState } from 'react'

import { Card } from '@/components/ui/card'
import { IconButton } from '@/components/ui/icon-button'
import { Input } from '@/components/ui/input'
import { SectionHeader } from '@/components/ui/section-header'
import { SegmentedControl } from '@/components/ui/segmented-control'
import { Skeleton } from '@/components/ui/skeleton'
import { StatusDot } from '@/components/ui/status-dot'
import { icons } from '@/lib/icons'
import { cn } from '@/lib/utils'
import { levelOf } from '@/services/log'
import { useLogTail } from '@/state/use-log-tail'
import type { LogLevel } from '@/types/qbittorrent'

type Tab = 'messages' | 'bans'

const LEVELS: { key: LogLevel; label: string; tone: 'dimmer' | 'accent' | 'warn' | 'danger' }[] = [
  { key: 'normal', label: 'Normal', tone: 'dimmer' },
  { key: 'info', label: 'Info', tone: 'accent' },
  { key: 'warning', label: 'Warning', tone: 'warn' },
  { key: 'critical', label: 'Critical', tone: 'danger' },
]

const TONE_TEXT = {
  dimmer: 'text-text-dim',
  accent: 'text-accent',
  warn: 'text-warn',
  danger: 'text-danger',
} as const

/** `HH:MM:SS` local, from the API's unix seconds. */
function formatTime(seconds: number): string {
  return new Date(seconds * 1000).toLocaleTimeString(undefined, { hour12: false })
}

/**
 * The daemon's log.
 *
 * Muting a level hides it here rather than asking the daemon for less. See
 * `services/log.ts`: filtering server-side would move the tail cursor past
 * entries that unmuting could then never bring back.
 */
export function Logs() {
  const { entries, bans, following, setFollowing, heldBack, loaded, error, clear } = useLogTail()

  const [tab, setTab] = useState<Tab>('messages')
  const [muted, setMuted] = useState<readonly LogLevel[]>([])
  const [query, setQuery] = useState('')

  const counts = useMemo(() => {
    const tally: Record<LogLevel, number> = { normal: 0, info: 0, warning: 0, critical: 0 }
    for (const e of entries) tally[levelOf(e.type)] += 1
    return tally
  }, [entries])

  const shown = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return entries.filter((e) => {
      if (muted.includes(levelOf(e.type))) return false
      return needle === '' || e.message.toLowerCase().includes(needle)
    })
  }, [entries, muted, query])

  const toggleLevel = (level: LogLevel) =>
    setMuted((prev) => (prev.includes(level) ? prev.filter((l) => l !== level) : [...prev, level]))

  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="flex shrink-0 items-start gap-6 border-b border-line px-6 py-5">
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <h1 className="text-[30px] leading-none font-semibold tracking-[-0.02em] text-text">
            Logs
          </h1>
          <p className="text-[12.5px] text-text-dim">
            Everything the daemon has reported since it started. Newest first.
          </p>
        </div>
        <div className="flex shrink-0 gap-6">
          {LEVELS.map((l) => (
            <span key={l.key} className="flex flex-col items-end gap-1">
              <span
                className={cn(
                  'font-mono text-[19px] leading-none font-semibold',
                  TONE_TEXT[l.tone],
                )}
              >
                {counts[l.key]}
              </span>
              <SectionHeader>{l.label}</SectionHeader>
            </span>
          ))}
        </div>
      </header>

      <div className="flex shrink-0 flex-wrap items-center gap-3 border-b border-line px-6 py-3">
        <SegmentedControl<Tab>
          label="Log tab"
          value={tab}
          onChange={setTab}
          size="sm"
          options={[
            { value: 'messages', label: 'Messages' },
            { value: 'bans', label: `Bans ${bans.length}` },
          ]}
        />

        {tab === 'messages' ? (
          <div className="flex flex-wrap items-center gap-1.5">
            {LEVELS.map((l) => (
              <button
                key={l.key}
                type="button"
                aria-pressed={!muted.includes(l.key)}
                onClick={() => toggleLevel(l.key)}
                title={muted.includes(l.key) ? `Show ${l.label}` : `Hide ${l.label}`}
                className={cn(
                  'flex items-center gap-1.5 rounded-chip border px-2.5 py-1 text-[11px] font-semibold',
                  'transition-colors duration-quick',
                  muted.includes(l.key)
                    ? 'border-line bg-surface2 text-text-dimmer'
                    : 'border-line bg-surface text-text',
                )}
              >
                <span
                  aria-hidden="true"
                  className={cn(
                    'size-[7px] rounded-full',
                    muted.includes(l.key) ? 'bg-text-dimmer' : `bg-current ${TONE_TEXT[l.tone]}`,
                  )}
                />
                {l.label}
                <span className="font-mono text-text-dimmer tabular-nums">{counts[l.key]}</span>
              </button>
            ))}
          </div>
        ) : null}

        <span className="flex-1" />

        {tab === 'messages' ? (
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Search messages"
            placeholder="Search messages"
            icon={<icons.search className="size-[13px]" strokeWidth={2} />}
            className="w-[250px]"
          />
        ) : null}

        <button
          type="button"
          aria-pressed={following}
          onClick={() => setFollowing(!following)}
          className={cn(
            'flex items-center gap-2 rounded-lg border px-3 py-[7px] text-[11.5px] font-semibold',
            'transition-colors duration-quick',
            following ? 'border-accent bg-accent-soft text-accent' : 'border-line text-text-dim',
          )}
        >
          <span
            aria-hidden="true"
            className={cn(
              'size-[7px] rounded-full',
              following ? 'bg-accent motion-safe:animate-pulse' : 'bg-text-dimmer',
            )}
          />
          {following ? 'Following' : heldBack > 0 ? `Paused · ${heldBack} waiting` : 'Paused'}
        </button>

        <IconButton title="Clear this view" onClick={clear}>
          <icons.clear className="size-[15px]" strokeWidth={2} />
        </IconButton>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
        {!loaded ? (
          <Skeleton rows={10} rowHeight={30} />
        ) : error && entries.length === 0 ? (
          <p className="text-[12.5px] text-danger">Could not read the log: {error}</p>
        ) : tab === 'messages' ? (
          <Card title="Messages" api="log/main" padding="none">
            <div className="grid grid-cols-[116px_92px_1fr] gap-2 border-b border-line bg-surface2 px-4 py-2 text-[9.5px] font-bold tracking-[0.08em] text-text-dimmer uppercase">
              <span>Time</span>
              <span>Level</span>
              <span>Message</span>
            </div>
            {shown.length === 0 ? (
              <p className="px-4 py-6 text-[12.5px] text-text-dim">
                {entries.length === 0
                  ? 'The daemon has not said anything yet.'
                  : 'Nothing matches the current filters.'}
              </p>
            ) : (
              shown.map((e, i) => {
                const level = levelOf(e.type)
                const tone = LEVELS.find((l) => l.key === level)!.tone
                return (
                  <div
                    key={e.id}
                    className={cn(
                      'grid grid-cols-[116px_92px_1fr] items-baseline gap-2 px-4 py-2',
                      // A faint stripe, so a wall of similar lines still reads
                      // as rows. Warning and critical carry their own tint
                      // instead, which is the point of noticing them.
                      i % 2 === 1 && 'bg-surface2/40',
                      level === 'warning' && 'bg-warn-soft',
                      level === 'critical' && 'bg-danger-soft',
                    )}
                  >
                    <span className="font-mono text-[11px] text-text-dimmer tabular-nums">
                      {formatTime(e.timestamp)}
                    </span>
                    <StatusDot
                      tone={tone === 'dimmer' ? 'muted' : tone}
                      label={level}
                      className="text-[10.5px]"
                    />
                    <span className="text-[11.5px] leading-[1.5] break-words text-text">
                      {e.message}
                    </span>
                  </div>
                )
              })
            )}
            <div className="flex items-center gap-2 border-t border-line px-4 py-2.5">
              <span className="font-mono text-[10.5px] text-text-dimmer tabular-nums">
                {shown.length === entries.length
                  ? `${entries.length} entries`
                  : `${shown.length} of ${entries.length}`}
              </span>
              <span className="flex-1" />
              <span className="font-mono text-[10.5px] text-text-dimmer">
                {following ? 'following' : 'paused'}
              </span>
            </div>
          </Card>
        ) : (
          <Card title="Blocked addresses" api="log/peers" padding="none">
            <div className="grid grid-cols-[116px_190px_1fr] gap-2 border-b border-line bg-surface2 px-4 py-2 text-[9.5px] font-bold tracking-[0.08em] text-text-dimmer uppercase">
              <span>Time</span>
              <span>Address</span>
              <span>Reason</span>
            </div>
            {bans.length === 0 ? (
              <p className="px-4 py-6 text-[12.5px] text-text-dim">
                Nothing has been blocked since the daemon started.
              </p>
            ) : (
              bans.map((b, i) => (
                <div
                  key={b.id}
                  className={cn(
                    'grid grid-cols-[116px_190px_1fr] items-baseline gap-2 px-4 py-2',
                    i % 2 === 1 && 'bg-surface2/40',
                  )}
                >
                  <span className="font-mono text-[11px] text-text-dimmer tabular-nums">
                    {formatTime(b.timestamp)}
                  </span>
                  <span className="font-mono text-[11px] break-all text-text">{b.ip}</span>
                  <span className="text-[11.5px] text-text-dim">{b.reason}</span>
                </div>
              ))
            )}
            <div className="flex items-center gap-2 border-t border-line px-4 py-2.5">
              <span className="font-mono text-[10.5px] text-text-dimmer tabular-nums">
                {bans.length} blocked
              </span>
              <span className="flex-1" />
              <span className="font-mono text-[10.5px] text-text-dimmer">
                unblocking is a Settings change
              </span>
            </div>
          </Card>
        )}
      </div>
    </div>
  )
}
