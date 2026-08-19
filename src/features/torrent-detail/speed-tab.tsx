import { useState } from 'react'

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
  const unlimited = limit === LIMIT_UNLIMITED || limit === 0
  const [draft, setDraft] = useState(unlimited ? '' : String(Math.round(limit / KIB)))

  const commit = () => {
    const value = Number(draft)
    if (!draft.trim() || !Number.isFinite(value) || value <= 0) {
      onChange(LIMIT_UNLIMITED)
      return
    }
    onChange(Math.round(value * KIB))
  }

  return (
    <div className="flex items-center gap-2.5 border-t border-line bg-surface2 px-4 py-3">
      <SectionHeader>Limit</SectionHeader>
      <Input
        mono
        size="sm"
        value={draft}
        disabled={unlimited}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') commit()
        }}
        aria-label={`${name} limit`}
        placeholder="unlimited"
        className="w-[92px]"
      />
      <span className="font-mono text-[10.5px] text-text-dimmer">KiB/s</span>

      <span className="flex-1" />

      <Switch
        label={`${name} unlimited`}
        checked={unlimited}
        // Off means "apply what is in the box", and an empty box is still
        // unlimited, so this cannot leave the torrent in a state the field
        // does not describe.
        onChange={(next) => (next ? onChange(LIMIT_UNLIMITED) : commit())}
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
      checked: torrent.sequential_download,
      onChange: () => onToggleSequential(),
    },
    {
      label: 'Download first and last pieces first',
      hint: 'Lets a player read the container header before the rest arrives.',
      api: 'torrents/toggleFirstLastPiecePrio',
      // The list endpoint does not report this one, so the switch reflects
      // what was asked for rather than what is set. Shown rather than hidden
      // because it pairs with sequential download and its absence would be
      // more confusing than its imprecision.
      checked: torrent.sequential_download,
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
