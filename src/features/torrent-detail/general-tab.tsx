import { useState } from 'react'
import { ChevronRight } from 'lucide-react'

import { SectionHeader } from '@/components/ui/section-header'
import { StatCard } from '@/components/ui/stat-card'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import type { Torrent, TorrentProperties } from '@/types/qbittorrent'
import {
  STATE_LABEL,
  formatBytes,
  formatEta,
  isComplete,
  formatRatio,
  formatSpeed,
  isPaused,
} from '@/utils/format'

export interface GeneralTabProps {
  torrent: Torrent
  /** Null until `torrents/properties` answers. */
  properties: TorrentProperties | null
}

function formatDateTime(seconds: number): string {
  if (!seconds) return '—'
  return new Date(seconds * 1000).toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}

/**
 * The eight numbers, and the paths behind a disclosure.
 *
 * The split is deliberate. The grid holds what changes while you watch; the
 * collapsed card holds what is true for the life of the torrent. Putting a
 * hash and a creation date in the same grid as a live speed makes the whole
 * block look like it is updating when most of it never will.
 */
export function GeneralTab({ torrent, properties }: GeneralTabProps) {
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
