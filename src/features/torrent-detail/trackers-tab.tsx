import { useState } from 'react'

import { Button } from '@/components/ui/button'
import { FormDialog } from '@/components/ui/form-dialog'
import { SectionHeader } from '@/components/ui/section-header'
import { Skeleton } from '@/components/ui/skeleton'
import { StatusDot } from '@/components/ui/status-dot'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import type { Tracker } from '@/types/qbittorrent'

/**
 * The daemon's tracker status codes.
 *
 * Not contacted and updating are not failures, which is why only 4 takes the
 * danger tone. A fresh torrent shows several 1s for a few seconds and colouring
 * those red would make every add look broken.
 */
const STATUS: Record<number, { label: string; tone: 'accent' | 'accent2' | 'muted' | 'danger' }> = {
  0: { label: 'disabled', tone: 'muted' },
  1: { label: 'not contacted', tone: 'muted' },
  2: { label: 'working', tone: 'accent2' },
  3: { label: 'updating', tone: 'accent' },
  4: { label: 'error', tone: 'danger' },
}

/**
 * DHT, PeX and LSD are reported as trackers but are not ones.
 *
 * qBittorrent sends them in the same list and the stock client shows them, so
 * they stay. They are excluded from the tracker count and cannot be removed,
 * because neither is true of them.
 */
export const isSynthetic = (url: string) => url.startsWith('** [')

export interface TrackersTabProps {
  /** Null until `torrents/trackers` answers. */
  trackers: readonly Tracker[] | null
  onAdd: (urls: readonly string[]) => void
  onRemove: (url: string) => void
}

export function TrackersTab({ trackers, onAdd, onRemove }: TrackersTabProps) {
  const [adding, setAdding] = useState(false)
  const [draft, setDraft] = useState('')

  if (!trackers) {
    return (
      <div className="p-6">
        <Skeleton rows={5} rowHeight={34} />
      </div>
    )
  }

  const real = trackers.filter((t) => !isSynthetic(t.url))
  const errors = real.filter((t) => t.status === 4).length

  const submit = () => {
    const urls = draft
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
    if (urls.length) onAdd(urls)
    setDraft('')
    setAdding(false)
  }

  return (
    <div className="flex flex-col gap-2.5 p-6">
      <div className="flex items-center gap-2.5">
        <SectionHeader>Trackers</SectionHeader>
        <span className="font-mono text-[10.5px] text-text-dimmer">
          {real.length} {real.length === 1 ? 'tracker' : 'trackers'}
          {errors > 0 ? ` · ${errors} error${errors === 1 ? '' : 's'}` : ''}
        </span>
        <span className="flex-1" />
        <Button variant="primary" size="sm" onClick={() => setAdding(true)}>
          Add tracker
        </Button>
      </div>

      <div className="overflow-hidden rounded-[11px] border border-line">
        <div className="grid grid-cols-[1fr_140px_90px_220px] gap-2 border-b border-line bg-surface2 px-3 py-2 text-[10px] font-bold tracking-[0.08em] text-text-dimmer uppercase">
          <span>URL</span>
          <span>Status</span>
          <span className="text-right">Peers</span>
          <span>Message</span>
        </div>

        {trackers.map((tracker) => {
          const status = STATUS[tracker.status] ?? STATUS[1]!
          const synthetic = isSynthetic(tracker.url)

          return (
            <div
              key={tracker.url}
              className="group grid grid-cols-[1fr_140px_90px_220px] items-center gap-2 border-t border-line px-3 py-2.5 transition-colors duration-fast first:border-t-0 hover:bg-surface2"
            >
              <span
                title={tracker.url}
                className={cn(
                  'truncate font-mono text-[11.5px]',
                  synthetic ? 'text-text-dimmer' : 'text-text',
                )}
              >
                {tracker.url}
              </span>

              <StatusDot tone={status.tone} label={status.label} />

              <span className="text-right font-mono text-[10.5px] text-text-dim">
                {tracker.num_peers > 0 ? tracker.num_peers : '—'}
              </span>

              <div className="flex min-w-0 items-center gap-2">
                <span
                  title={tracker.msg}
                  className={cn(
                    'min-w-0 flex-1 truncate text-[11.5px]',
                    tracker.status === 4 ? 'text-danger' : 'text-text-dimmer',
                  )}
                >
                  {tracker.msg || '—'}
                </span>
                {/* Revealed on hover, and absent entirely for DHT, PeX and
                    LSD, which are not removable however they are reported. */}
                {synthetic ? null : (
                  <button
                    type="button"
                    aria-label={`Remove ${tracker.url}`}
                    onClick={() => onRemove(tracker.url)}
                    className="shrink-0 text-[11px] font-semibold text-text-dimmer opacity-0 transition-opacity duration-quick group-hover:opacity-100 hover:text-danger focus-visible:opacity-100"
                  >
                    Remove
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {adding ? (
        <FormDialog
          open
          title="Add trackers"
          description="One URL per line. Announce URLs only, not scrape."
          api="torrents/addTrackers"
          submitLabel="Add"
          submitDisabled={draft.trim().length === 0}
          onCancel={() => {
            setDraft('')
            setAdding(false)
          }}
          onSubmit={submit}
        >
          <Textarea
            mono
            rows={4}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="https://tracker.example/announce"
            aria-label="Tracker URLs"
          />
        </FormDialog>
      ) : null}
    </div>
  )
}
