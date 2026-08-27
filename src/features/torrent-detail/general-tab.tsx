import { useState } from 'react'
import { ChevronRight } from 'lucide-react'

import { SectionHeader } from '@/components/ui/section-header'
import { StatCard } from '@/components/ui/stat-card'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import type { Torrent, TorrentProperties } from '@/types/qbittorrent'
import {
  STATE_LABEL,
  formatAvailability,
  formatBytes,
  formatDuration,
  formatEta,
  formatRatio,
  formatSince,
  formatSpeed,
  isComplete,
  isPaused,
} from '@/utils/format'

export interface GeneralTabProps {
  torrent: Torrent
  /** Null until `torrents/properties` answers. */
  properties: TorrentProperties | null
  /**
   * Now, in epoch milliseconds, for the two cards that report how long ago
   * something happened.
   *
   * A parameter rather than a `Date.now()` buried in the render, so a test can
   * say what "3m ago" means without freezing the clock, and so both cards
   * measure against the same instant rather than drifting apart. Defaulted,
   * because the screen has no reason to care.
   */
  now?: number
}

function formatDateTime(seconds: number): string {
  if (!seconds) return '—'
  return new Date(seconds * 1000).toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}

/**
 * The twelve numbers, and the paths behind a disclosure.
 *
 * The split is deliberate. The grid holds what changes while you watch; the
 * collapsed card holds what is true for the life of the torrent. Putting a
 * hash and a creation date in the same grid as a live speed makes the whole
 * block look like it is updating when most of it never will.
 *
 * Twelve rather than eleven, and the count is not arbitrary: the grid is four
 * across, so eleven leaves a ragged last row. Connections is the twelfth and
 * earns its place on its own, being live and already fetched.
 *
 * **`popularity` is deliberately not here.** It arrives on every row and reads
 * as an obvious thirteenth, but nothing establishes what it measures. Sampled
 * against three real torrents, swarm totals of 12, 191 and 2521 gave 34.3,
 * 42.0 and 112.5, which is not linear, logarithmic or square-root in any of
 * them, so it is a time-decayed figure over history the client cannot see. A
 * number on screen that nobody can explain is worse than a gap.
 */
export function GeneralTab({ torrent, properties, now = Date.now() }: GeneralTabProps) {
  // Open by default. Somebody who has opened a torrent's details has already
  // asked for its details, and hash, comment and incomplete path are the
  // answers to questions this screen exists to answer. The folder button that
  // briefly lived down here has moved to the header row, which is where the
  // save path is actually read.
  const [open, setOpen] = useState(true)
  const done = isComplete(torrent.progress)

  const cards = [
    {
      label: 'Status',
      value: STATE_LABEL[torrent.state],
      sub: isPaused(torrent.state) ? 'not connected' : `${torrent.num_seeds} seeds connected`,
    },
    {
      // `size` counts selected files only. On a torrent with nothing skipped
      // it is the whole thing and the distinction never surfaces; on one with
      // files deselected it is smaller than the size the torrent is known by
      // everywhere else, and the label alone gave no hint of that.
      label: 'Size',
      value: formatBytes(torrent.size),
      sub:
        torrent.total_size > torrent.size
          ? `of ${formatBytes(torrent.total_size)} selected`
          : `${formatBytes(torrent.downloaded)} downloaded`,
    },
    {
      label: 'Down speed',
      value: formatSpeed(torrent.dlspeed),
      sub: properties ? `${formatSpeed(properties.dl_speed_avg)} average` : '—',
      tone: 'accent' as const,
    },
    {
      label: 'Up speed',
      value: formatSpeed(torrent.upspeed),
      sub: properties ? `${formatSpeed(properties.up_speed_avg)} average` : '—',
      tone: 'accent2' as const,
    },
    {
      label: 'ETA',
      // Nothing to estimate once it is done, and an infinity sign there reads
      // as "never finishes" rather than "already finished".
      value: done ? '—' : isPaused(torrent.state) ? '—' : formatEta(torrent.eta),
      sub: done ? 'complete' : isPaused(torrent.state) ? 'paused' : 'at the current rate',
    },
    {
      label: 'Ratio',
      value: formatRatio(torrent.ratio),
      sub: `${formatBytes(torrent.uploaded)} uploaded`,
    },
    {
      label: 'Seeds / peers',
      value: `${torrent.num_seeds} / ${torrent.num_leechs}`,
      // Connected out of known. The second number is the swarm the tracker
      // reported, not another count of connections, and without the wording
      // the two look like they disagree.
      sub: properties ? `of ${properties.seeds_total} / ${properties.peers_total} known` : '—',
    },
    { label: 'Added on', value: formatDateTime(torrent.added_on), sub: 'local time' },

    /**
     * How many whole copies the connected peers add up to.
     *
     * `-1` once complete, which the daemon sends rather than `0`, and the two
     * would read as opposites: nobody has any of it, against nobody is looking
     * for it. So the card says the question does not apply instead of printing
     * either number.
     *
     * The sub-line carries `seen_complete`, which is the other half of the same
     * question. Availability below `1.00` says some piece is not on offer right
     * now; never having seen a whole copy says it may not be on offer at all,
     * and that is the difference between slow and hopeless.
     */
    {
      label: 'Availability',
      value: done ? '—' : formatAvailability(torrent.availability),
      sub: done
        ? 'not tracked once complete'
        : torrent.seen_complete
          ? `whole copy seen ${formatSince(torrent.seen_complete, now)}`
          : 'no whole copy seen yet',
    },
    {
      // Active is not seeding. A torrent is active while it downloads too, so
      // the two differ by exactly the download, and the sub-line shows the
      // split rather than leaving them to look interchangeable.
      label: 'Active for',
      value: formatDuration(torrent.time_active),
      sub: `${formatDuration(torrent.seeding_time)} of it seeding`,
    },
    {
      label: 'Last activity',
      value: formatSince(torrent.last_activity, now),
      sub: 'data last moved',
    },
    {
      // From properties rather than the row, which carries no connection
      // count. `-1` is the daemon's unlimited.
      label: 'Connections',
      value: properties ? String(properties.nb_connections) : '—',
      sub:
        properties === null
          ? '—'
          : properties.nb_connections_limit < 0
            ? 'no limit'
            : `of ${properties.nb_connections_limit} allowed`,
    },
  ]

  const rows: { label: string; value: string }[] = properties
    ? [
        { label: 'Save path', value: properties.save_path },
        { label: 'Incomplete path', value: properties.download_path || 'same as save path' },
        { label: 'Hash', value: properties.infohash_v1 ?? torrent.hash },
        { label: 'Comment', value: properties.comment || 'none' },
        { label: 'Created by', value: properties.created_by || 'unknown' },
        { label: 'Created on', value: formatDateTime(properties.creation_date) },
        {
          label: 'Pieces',
          value: `${properties.pieces_have} of ${properties.pieces_num} · ${formatBytes(properties.piece_size)} each`,
        },
      ]
    : []

  return (
    <div className="flex flex-col gap-[18px] p-6">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {cards.map((card) => (
          <StatCard
            key={card.label}
            label={card.label}
            value={card.value}
            sub={card.sub}
            {...(card.tone ? { tone: card.tone } : {})}
          />
        ))}
      </div>

      <div className="overflow-hidden rounded-[11px] border border-line">
        <button
          type="button"
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
          className="flex w-full items-center gap-2.5 bg-surface2 px-4 py-3 text-left"
        >
          <ChevronRight
            aria-hidden="true"
            className={cn(
              'size-4 shrink-0 text-text-dim transition-transform duration-quick',
              open && 'rotate-90',
            )}
            strokeWidth={2.2}
          />
          <span className="text-[12.5px] font-semibold text-text">Paths, hash and comment</span>
          <span className="flex-1" />
          <span className="font-mono text-[10.5px] text-text-dimmer">torrents/properties</span>
        </button>

        {open ? (
          <div className="flex flex-col gap-2.5 px-4 py-3.5">
            {properties ? (
              rows.map((row) => (
                <div key={row.label} className="flex items-start gap-3">
                  <span className="w-[132px] shrink-0 text-[11.5px] text-text-dim">
                    {row.label}
                  </span>
                  <span className="min-w-0 flex-1 font-mono text-[11.5px] break-all text-text">
                    {row.value}
                  </span>
                </div>
              ))
            ) : (
              <Skeleton rows={4} rowHeight={18} />
            )}
          </div>
        ) : null}
      </div>

      {!properties ? <SectionHeader>Loading properties…</SectionHeader> : null}
    </div>
  )
}
