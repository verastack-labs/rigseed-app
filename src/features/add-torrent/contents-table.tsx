import { Checkbox } from '@/components/ui/checkbox'
import { SectionHeader } from '@/components/ui/section-header'
import { icons } from '@/lib/icons'
import { cn } from '@/lib/utils'
import { PRIORITY, PRIORITY_LABEL, selectedSize, type Priority } from '@/lib/priority'
import { formatBytes } from '@/utils/format'
import type { TorrentEntry } from '@/utils/torrent-file'

export interface ContentsTableProps {
  entries: readonly TorrentEntry[]
  /** Priority per entry, by index into `entries`. */
  priorities: readonly Priority[]
  onChange: (next: Priority[]) => void
}

/**
 * What is inside the torrent, and what of it to fetch.
 *
 * Selection here is not cosmetic: it is the difference between the "needed"
 * figure in the save-path hint and the torrent's full size, and it is applied
 * after the add via `torrents/filePrio`, which is the only way to express it.
 */
export function ContentsTable({ entries, priorities, onChange }: ContentsTableProps) {
  const kept = priorities.filter((p) => p !== PRIORITY.skip).length
  const total = selectedSize(entries, priorities)

  const set = (index: number, priority: Priority) => {
    const next = [...priorities]
    next[index] = priority
    onChange(next)
  }

  return (
    <section className="flex min-w-0 flex-col gap-2">
      <div className="flex items-center gap-2.5">
        <SectionHeader>Contents</SectionHeader>
        <span className="font-mono text-[10.5px] text-text-dimmer">
          {entries.length === 1 ? '1 entry' : `${entries.length} entries`} · {kept} selected ·{' '}
          {formatBytes(total)}
        </span>
      </div>

      <div className="max-h-[220px] overflow-y-auto rounded-[11px] border border-line">
        {entries.map((entry, index) => {
          const priority = priorities[index] ?? PRIORITY.normal
          const skipped = priority === PRIORITY.skip

          return (
            <div
              key={entry.path}
              className={cn(
                'grid grid-cols-[1fr_96px_116px] items-center gap-2 border-line px-3 py-2',
                index > 0 && 'border-t',
              )}
            >
              <div className="flex min-w-0 items-center gap-2">
                <Checkbox
                  checked={!skipped}
                  label={`Download ${entry.path}`}
                  // Unticking is a skip; ticking returns to normal rather than
                  // to whatever it was, since Max is a deliberate choice and
                  // should not come back by accident.
                  onChange={() => set(index, skipped ? PRIORITY.normal : PRIORITY.skip)}
                />
                <icons.folder
                  className={cn(
                    'size-[13px] shrink-0',
                    skipped ? 'text-text-dimmer' : 'text-accent',
                  )}
                  strokeWidth={2}
                />
                <span
                  title={entry.path}
                  className={cn(
                    'truncate text-[12.5px]',
                    skipped ? 'text-text-dimmer' : 'font-semibold text-text',
                  )}
                >
                  {entry.path}
                </span>
              </div>

              <span
                className={cn(
                  'text-right font-mono text-[10.5px]',
                  skipped ? 'text-text-dimmer' : 'text-text-dim',
                )}
              >
                {formatBytes(entry.size)}
              </span>

              <div className="flex justify-end">
                <button
                  type="button"
                  disabled={skipped}
                  aria-label={`Priority for ${entry.path}`}
                  onClick={() =>
                    set(index, priority === PRIORITY.max ? PRIORITY.normal : PRIORITY.max)
                  }
                  className={cn(
                    'rounded-md px-2.5 py-1 text-[11px] font-semibold',
                    'transition-colors duration-quick disabled:pointer-events-none',
                    priority === PRIORITY.max
                      ? 'bg-accent-soft text-accent'
                      : 'bg-surface2 text-text-dim hover:text-accent',
                  )}
                >
                  {PRIORITY_LABEL[priority]}
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}
