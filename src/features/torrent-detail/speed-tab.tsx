import { LimitField } from '@/components/ui/limit-field'
import { Switch } from '@/components/ui/switch'
import { SectionHeader } from '@/components/ui/section-header'
import { Sparkline } from '@/components/ui/sparkline'
import { cn } from '@/lib/utils'
import type { Torrent } from '@/types/qbittorrent'
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

interface RateCardProps {
  label: string
  tone: 'accent' | 'accent2'
  current: number
  /**
   * This run only, from `*_session`.
   *
   * Not the all-time total, which is what this used to show under the word
   * Session. The two are not close: a long-seeded torrent reads 8 MB here
   * against 2.3 GB all time.
   */
  session: number
  history: readonly number[]
  children: React.ReactNode
}

/**
 * The mean of the window the card already draws.
 *
 * The Average slot used to show the current speed a second time, which the
 * card prints in 20px directly above it. The sparkline holds sixty samples
 * and the card is already labelled "last 60s", so the honest number was
 * sitting there unread.
 */
function averageOf(history: readonly number[]): number {
  if (history.length === 0) return 0
  return history.reduce((sum, sample) => sum + sample, 0) / history.length
}

function RateCard({ label, tone, current, session, history, children }: RateCardProps) {
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
            <span className="font-mono text-[11.5px] text-text-dim">
              {formatSpeed(averageOf(history))}
            </span>
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
          session={torrent.downloaded_session}
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
          session={torrent.uploaded_session}
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
