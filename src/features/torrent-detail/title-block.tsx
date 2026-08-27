import { Badge } from '@/components/ui/badge'
import { ProgressBar } from '@/components/ui/progress-bar'
import { SectionHeader } from '@/components/ui/section-header'
import { StatusDot } from '@/components/ui/status-dot'
import { IconButton } from '@/components/ui/icon-button'
import { icons } from '@/lib/icons'
import { cn } from '@/lib/utils'
import { canReachDesktop, revealInFolder } from '@/services/shell'
import type { Torrent } from '@/types/qbittorrent'
import {
  STATE_LABEL,
  formatBytes,
  formatEta,
  isComplete,
  formatPercent,
  formatRatio,
  isPaused,
  stateTone,
} from '@/utils/format'

export interface TitleBlockProps {
  torrent: Torrent
  className?: string
}

/** Seconds since the epoch as a date. Zero means never, not 1970. */
function formatDate(seconds: number): string {
  if (!seconds) return '—'
  return new Date(seconds * 1000).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

/**
 * Name, progress and the five facts worth having on screen at all times.
 *
 * Above the tab content rather than inside it, because these are the answers
 * to "which torrent am I looking at" and "how is it doing", and a user who
 * switches to Peers has not stopped needing either.
 */
export function TitleBlock({ torrent, className }: TitleBlockProps) {
  // `completed` from the daemon, not `progress * size`. The reconstruction is
  // close enough to look right and wrong at the edges: progress is rounded for
  // transport, and it counts selected files only, so a torrent with files
  // skipped reported a figure that never quite reached its own total.
  const done = torrent.completed

  const meta: { label: string; value: string; mono?: boolean; reveal?: string }[] = [
    { label: 'Category', value: torrent.category || 'none' },
    // The header row is where the save path is read, so it is where the
    // button to open it belongs. The same action also sits beside the save
    // path in the General tab's card and in both menus: this is the one
    // people go looking for, and one route to it was not enough.
    { label: 'Save path', value: torrent.save_path, mono: true, reveal: torrent.content_path },
    { label: 'Added', value: formatDate(torrent.added_on) },
    { label: 'Ratio', value: formatRatio(torrent.ratio), mono: true },
    { label: 'Hash', value: torrent.hash, mono: true },
  ]

  return (
    <div className={cn('flex flex-col gap-3.5 px-6 pt-5 pb-4', className)}>
      <div className="flex items-center gap-2.5">
        <StatusDot tone={stateTone(torrent.state)} label={STATE_LABEL[torrent.state]} />
        {/*
          Private torrents, badged because the flag explains behaviour that
          otherwise looks like a fault.

          A private `.torrent` forbids DHT, peer exchange and local discovery,
          so every peer has to come from the listed trackers. Without the badge
          the Trackers tab shows three rows sitting there disabled and the peer
          count stays low, and both read as something broken rather than as the
          torrent working exactly as it was made to.

          Neutral rather than a warning colour. It is a property of the file,
          not a problem with it, and the one place a louder tone would be
          justified is advice this app does not give.

          `=== true` because the field is 5.0 and newer. On an older daemon it
          is absent, and a badge saying nothing about a torrent nobody can
          classify is worse than no badge.
        */}
        {torrent.private === true ? (
          <Badge
            tone="neutral"
            title="Peers come only from the trackers. DHT, peer exchange and local discovery are not used."
          >
            PRIVATE
          </Badge>
        ) : null}
      </div>

      <div className="flex items-start gap-6">
        {/* Wrapping is allowed here and nowhere else in the app. A torrent
            name is the one string long enough that truncating it can leave
            two releases looking identical. */}
        <h1 className="min-w-0 flex-1 text-[34px] leading-[1.15] font-semibold tracking-[-0.02em] text-text">
          {torrent.name}
        </h1>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <span className="font-mono text-[40px] leading-none font-bold text-accent">
            {formatPercent(torrent.progress)}
          </span>
          <span className="font-mono text-[11px] text-text-dim">
            {/* A finished torrent has no time left. It used to say "infinity
                left", because the daemon reports 0 or its infinite sentinel
                once there is nothing to fetch and the formatter renders both
                as an infinity sign. Correct for a stalled download, nonsense
                for a completed one. */}
            {isComplete(torrent.progress)
              ? 'complete'
              : isPaused(torrent.state)
                ? 'paused'
                : `${formatEta(torrent.eta)} left`}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <ProgressBar
          className="flex-1"
          value={torrent.progress * 100}
          paused={isPaused(torrent.state)}
          label={torrent.name}
        />
        <span className="shrink-0 font-mono text-[11px] text-text-dim">
          {formatBytes(done)} of {formatBytes(torrent.size)}
        </span>
      </div>

      <div className="grid grid-cols-5 gap-4">
        {meta.map((item) => (
          <div key={item.label} className="flex min-w-0 flex-col gap-1">
            <SectionHeader>{item.label}</SectionHeader>
            <div className="flex min-w-0 items-center gap-1.5">
              <span
                title={item.value}
                className={cn(
                  'min-w-0 truncate text-[12.5px] text-text-dim',
                  item.mono ? 'font-mono' : 'font-sans',
                )}
              >
                {item.value}
              </span>
              {item.reveal && canReachDesktop() ? (
                <IconButton
                  title="Open containing folder"
                  onClick={() => void revealInFolder(item.reveal ?? '')}
                >
                  <icons.folderOpen className="size-[14px]" strokeWidth={2} />
                </IconButton>
              ) : null}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
