import { useRef, useState } from 'react'

import { Input } from '@/components/ui/input'
import { SectionHeader } from '@/components/ui/section-header'
import { Sparkline } from '@/components/ui/sparkline'
import { Switch } from '@/components/ui/switch'
import { cn } from '@/lib/utils'
import type { Torrent } from '@/types/qbittorrent'
import { LIMIT_UNLIMITED } from '@/types/qbittorrent'
import { formatBytes, formatSpeed } from '@/utils/format'

export interface SpeedTabProps {
  torrent: Torrent
  downHistory: readonly number[]
  upHistory: readonly number[]
  onLimit: (direction: 'down' | 'up', bytesPerSecond: number) => void
  onToggleSequential: () => void
  onToggleFirstLast: () => void
  onAutoManagement: (enable: boolean) => void
}

/**
 * The daemon speaks bytes per second, the field speaks KiB/s.
 *
 * 1024, not 1000. Everything else in rigseed uses base 1000 because that is
 * what the daemon reports sizes in, but this one field is the exception: the
 * qBittorrent UI has always labelled its limits KiB/s and a user copying a
 * number across from it must get the same limit.
 */
const KIB = 1024

interface LimitFieldProps {
  /**
   * The direction, for the accessible names.
   *
   * Separate from the visible "Limit" because both cards show that same word,
   * and two controls called "Limit limit" are indistinguishable to anything
   * that reads names rather than looks at layout.
   */
  name: string
  api: string
  limit: number
  onChange: (bytesPerSecond: number) => void
}

/**
 * Mounted with a `key` of the current limit, so a change from the daemon
 * remounts it and the draft starts from the new value.
 *
 * The daemon is the source of truth and it can be changed from elsewhere: the
 * stock WebUI, another client, a scheduled alternative limit. Syncing that in
 * an effect was the first attempt; remounting says the same thing without a
 * component that has to remember to correct itself. Typing is undisturbed
 * while the limit is unchanged, which is every poll but the one that matters.
 */
function LimitField({ name, api, limit, onChange }: LimitFieldProps) {
  const capped = limit !== LIMIT_UNLIMITED && limit !== 0

  /**
   * Whether the field is open for typing, which is not the same question as
   * whether a limit is currently set.
   *
   * Deriving the disabled state from `limit` alone was the first attempt and
   * it deadlocked: unlimited disabled the box, a disabled box could not be
   * typed into, an empty box committed as unlimited, and the switch snapped
   * back on. There was no path from unlimited to any limit at all. Turning
   * the switch off has to open the field before there is a number in it.
   */
  const [live, setLive] = useState(capped)
  const [draft, setDraft] = useState(capped ? String(Math.round(limit / KIB)) : '')
  const field = useRef<HTMLInputElement>(null)

  /** Back to unlimited, with the switch saying so rather than drifting. */
  const clear = () => {
    setLive(false)
    setDraft('')
    onChange(LIMIT_UNLIMITED)
  }

  const commit = () => {
    const value = Number(draft)
    // An emptied box means unlimited, not zero. A zero limit would stop the
    // torrent dead, which is nobody's reading of clearing a field.
    if (!draft.trim() || !Number.isFinite(value) || value <= 0) {
      clear()
      return
    }
    onChange(Math.round(value * KIB))
  }

  return (
    <div className="flex items-center gap-2.5 border-t border-line bg-surface2 px-4 py-3">
      <SectionHeader>Limit</SectionHeader>
      <Input
        mono
        ref={field}
        size="sm"
        value={draft}
        disabled={!live}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') commit()
        }}
        aria-label={`${name} limit`}
        placeholder={live ? 'e.g. 500' : 'unlimited'}
        className="w-[92px]"
      />
      <span className="font-mono text-[10.5px] text-text-dimmer">KiB/s</span>

      <span className="flex-1" />

      <Switch
        label={`${name} unlimited`}
        checked={!live}
        onChange={(next) => {
          if (next) {
            clear()
            return
          }
          setLive(true)
          // The switch just handed the decision to the field, so put the
          // cursor there. After a frame, because the field is still disabled
          // in the DOM this render and focus on a disabled input does nothing.
          requestAnimationFrame(() => field.current?.focus())
        }}
      />
      <span className="text-[11.5px] text-text-dim">Unlimited</span>
      <span className="font-mono text-[10.5px] text-text-dimmer">{api}</span>
    </div>
  )
}

interface RateCardProps {
  label: string
  tone: 'accent' | 'accent2'
  current: number
  average: number
  session: number
  history: readonly number[]
  children: React.ReactNode
}

function RateCard({ label, tone, current, average, session, history, children }: RateCardProps) {
  return (
    <div className="overflow-hidden rounded-[11px] border border-line">
      <div className="flex flex-col gap-3 p-4">
        <div className="flex items-center gap-2.5">
          <SectionHeader>{label}</SectionHeader>
          <span className="flex-1" />
          <span
            className={cn(
              'font-mono text-[20px] font-semibold',
              tone === 'accent' ? 'text-accent' : 'text-accent2',
            )}
          >
            {formatSpeed(current)}
          </span>
        </div>

        <Sparkline data={history} tone={tone} height={104} gridlines />

        <div className="flex items-center gap-5">
          <div className="flex flex-col gap-0.5">
            <SectionHeader>Average</SectionHeader>
            <span className="font-mono text-[11.5px] text-text-dim">{formatSpeed(average)}</span>
          </div>
          <div className="flex flex-col gap-0.5">
            <SectionHeader>Session</SectionHeader>
            <span className="font-mono text-[11.5px] text-text-dim">{formatBytes(session)}</span>
          </div>
          <span className="flex-1" />
          <span className="font-mono text-[10.5px] text-text-dimmer">last 60s</span>
        </div>
      </div>
      {children}
    </div>
  )
}

/**
 * Rates, their history, and the three behaviour switches.
 *
 * The first screen in rigseed that writes per-torrent settings rather than
 * issuing a command, which is where the API's inconsistency becomes visible:
 * two of the three switches are toggles with no setter and the third is a
 * setter. The difference matters because a toggle sent twice undoes itself.
 */
export function SpeedTab({
  torrent,
  downHistory,
  upHistory,
  onLimit,
  onToggleSequential,
  onToggleFirstLast,
  onAutoManagement,
}: SpeedTabProps) {
  const behaviours = [
    {
      label: 'Automatic Torrent Management',
      hint: 'Save path follows the category rather than being set by hand.',
      api: 'torrents/setAutoManagement',
      checked: torrent.auto_tmm,
      onChange: (next: boolean) => onAutoManagement(next),
    },
    {
      label: 'Sequential download',
      hint: 'Fetch pieces in order. Useful for media, slower overall.',
      api: 'torrents/toggleSequentialDownload',
      checked: torrent.seq_dl,
      onChange: () => onToggleSequential(),
    },
    {
      label: 'Download first and last pieces first',
      hint: 'Lets a player read the container header before the rest arrives.',
      api: 'torrents/toggleFirstLastPiecePrio',
      checked: torrent.f_l_piece_prio,
      onChange: () => onToggleFirstLast(),
    },
  ]

  return (
    <div className="flex flex-col gap-3.5 p-6">
      <div className="grid grid-cols-1 gap-3.5 lg:grid-cols-2">
        <RateCard
          label="Download"
          tone="accent"
          current={torrent.dlspeed}
          average={torrent.downloaded > 0 ? torrent.dlspeed : 0}
          session={torrent.downloaded}
          history={downHistory}
        >
          <LimitField
            key={torrent.dl_limit}
            name="Download"
            api="torrents/setDownloadLimit"
            limit={torrent.dl_limit}
            onChange={(bytes) => onLimit('down', bytes)}
          />
        </RateCard>

        <RateCard
          label="Upload"
          tone="accent2"
          current={torrent.upspeed}
          average={torrent.uploaded > 0 ? torrent.upspeed : 0}
          session={torrent.uploaded}
          history={upHistory}
        >
          <LimitField
            key={torrent.up_limit}
            name="Upload"
            api="torrents/setUploadLimit"
            limit={torrent.up_limit}
            onChange={(bytes) => onLimit('up', bytes)}
          />
        </RateCard>
      </div>

      <div className="flex flex-col rounded-[11px] border border-line">
        {behaviours.map((row, index) => (
          <div
            key={row.label}
            className={cn(
              'flex items-center gap-3 border-line px-4 py-3.5',
              index > 0 && 'border-t',
            )}
          >
            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span className="text-[12.5px] font-semibold text-text">{row.label}</span>
              <span className="text-[11.5px] text-text-dimmer">{row.hint}</span>
            </div>
            <span className="shrink-0 font-mono text-[10.5px] text-text-dimmer">{row.api}</span>
            <Switch label={row.label} checked={row.checked} onChange={row.onChange} />
          </div>
        ))}
      </div>
    </div>
  )
}
