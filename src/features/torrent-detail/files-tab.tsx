import { Checkbox } from '@/components/ui/checkbox'
import { ProgressBar } from '@/components/ui/progress-bar'
import { SectionHeader } from '@/components/ui/section-header'
import { Skeleton } from '@/components/ui/skeleton'
import { icons } from '@/lib/icons'
import { PRIORITY_CHOICES, type Priority } from '@/lib/priority'
import { cn } from '@/lib/utils'
import { canReachDesktop, openPath } from '@/services/shell'
import type { TorrentFile } from '@/types/qbittorrent'
import { formatBytes, formatPercent } from '@/utils/format'

export interface FilesTabProps {
  /** Null until `torrents/files` answers. */
  files: readonly TorrentFile[] | null
  selected: readonly number[]
  onToggle: (index: number) => void
  onPriority: (indices: readonly number[], priority: Priority) => void
  /**
   * Where the torrent's content lives, for opening a file on double click.
   *
   * Omitted when there is no desktop to hand a path to, which is what turns
   * the behaviour off rather than a separate flag.
   */
  savePath?: string
}

/** The last path segment, which is what the row shows. */
const basename = (path: string) => path.split('/').pop() ?? path

/** How deep the file sits, so nesting reads without a tree component. */
const depth = (path: string) => path.split('/').length - 1

/**
 * Join a save path to a torrent-relative file path.
 *
 * The daemon reports both in its own separator, and Windows accepts forward
 * slashes everywhere, so this does not try to normalise anything: it only
 * avoids doubling or dropping the one character between them.
 */
function join(base: string, relative: string): string {
  return `${base.replace(/[\\/]+$/, '')}/${relative.replace(/^[\\/]+/, '')}`
}

export function FilesTab({ files, selected, onToggle, onPriority, savePath }: FilesTabProps) {
  const openable = Boolean(savePath) && canReachDesktop()
  if (!files) {
    return (
      <div className="p-6">
        <Skeleton rows={5} rowHeight={38} />
      </div>
    )
  }

  const wanted = files.filter((f) => f.priority !== 0)
  const total = wanted.reduce((sum, f) => sum + f.size, 0)

  return (
    <div className="flex flex-col gap-2.5 p-6">
      <div className="flex items-center gap-2.5">
        <SectionHeader>Contents</SectionHeader>
        <span className="font-mono text-[10.5px] text-text-dimmer">
          {files.length} files · {wanted.length} selected · {formatBytes(total)}
        </span>
        <span className="flex-1" />
        <div className="flex items-center gap-1.5">
          <SectionHeader>Set priority</SectionHeader>
          {PRIORITY_CHOICES.map((option) => (
            <button
              key={option.value}
              type="button"
              // Acts on the ticked rows, so it is off until there are some.
              // A priority button that silently applies to everything is a
              // way to skip an entire torrent by accident.
              disabled={selected.length === 0}
              onClick={() => onPriority(selected, option.value)}
              className={cn(
                'rounded-md px-2.5 py-1 text-[11px] font-semibold',
                'bg-surface2 text-text-dim transition-colors duration-quick',
                'hover:text-accent disabled:pointer-events-none disabled:opacity-45',
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-hidden rounded-[11px] border border-line">
        <div className="grid grid-cols-[1fr_100px_150px_132px] gap-2 border-b border-line bg-surface2 px-3 py-2 text-[10px] font-bold tracking-[0.08em] text-text-dimmer uppercase">
          <span>Name</span>
          <span className="text-right">Size</span>
          <span>Progress</span>
          <span className="text-right">Priority</span>
        </div>

        {files.map((file) => {
          const skipped = file.priority === 0
          return (
            <div
              key={file.index}
              // Double click rather than single: a single click here already
              // means "toggle the checkbox I am next to", and a row that both
              // selects and launches on one click is a row that launches a
              // video every time somebody meant to deselect it.
              onDoubleClick={
                openable && savePath ? () => void openPath(join(savePath, file.name)) : undefined
              }
              title={openable ? `Double click to open ${basename(file.name)}` : undefined}
              className={cn(
                'grid grid-cols-[1fr_100px_150px_132px] items-center gap-2 border-t border-line px-3 py-2.5',
                'transition-colors duration-fast first:border-t-0 hover:bg-surface2',
                openable && !skipped && 'cursor-pointer',
              )}
            >
              <div
                className="flex min-w-0 items-center gap-2"
                style={{ paddingLeft: depth(file.name) * 14 }}
              >
                <Checkbox
                  checked={selected.includes(file.index)}
                  label={`Select ${basename(file.name)}`}
                  onChange={() => onToggle(file.index)}
                />
                <icons.folder
                  className={cn(
                    'size-[13px] shrink-0',
                    skipped ? 'text-text-dimmer' : 'text-accent',
                  )}
                  strokeWidth={2}
                />
                <span
                  title={file.name}
                  className={cn(
                    'truncate text-[12.5px]',
                    skipped ? 'text-text-dimmer' : 'font-semibold text-text',
                  )}
                >
                  {basename(file.name)}
                </span>
              </div>

              <span
                className={cn(
                  'text-right font-mono text-[10.5px]',
                  skipped ? 'text-text-dimmer' : 'text-text-dim',
                )}
              >
                {formatBytes(file.size)}
              </span>

              <div className="flex items-center gap-2">
                <ProgressBar
                  className="flex-1"
                  height={4}
                  value={file.progress * 100}
                  paused={skipped}
                  label={basename(file.name)}
                />
                <span className="shrink-0 font-mono text-[10.5px] text-text-dim">
                  {formatPercent(file.progress)}
                </span>
              </div>

              <div className="flex justify-end">
                <select
                  aria-label={`Priority for ${basename(file.name)}`}
                  value={file.priority}
                  onChange={(e) => onPriority([file.index], Number(e.target.value) as Priority)}
                  className={cn(
                    'rounded-md px-2 py-1 text-[11px] font-semibold',
                    'border border-line bg-surface2 outline-none',
                    skipped ? 'text-text-dimmer' : 'text-text-dim',
                  )}
                >
                  {PRIORITY_CHOICES.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
