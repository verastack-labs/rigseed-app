import { useEffect, useMemo, useRef, useState } from 'react'

import { Checkbox } from '@/components/ui/checkbox'
import { ProgressBar } from '@/components/ui/progress-bar'
import { SectionHeader } from '@/components/ui/section-header'
import { EmptyState } from '@/components/ui/empty-state'
import { Skeleton } from '@/components/ui/skeleton'
import {
  buildFileTree,
  defaultExpanded,
  flattenTree,
  type TreeNode,
} from '@/features/torrent-detail/file-tree'
import { icons } from '@/lib/icons'
import { PRIORITY_CHOICES, type Priority } from '@/lib/priority'
import { cn } from '@/lib/utils'
import { canReachDesktop, openPath } from '@/services/shell'
import type { TorrentFile } from '@/types/qbittorrent'
import { formatBytes, formatPercent } from '@/utils/format'

export interface FilesTabProps {
  /** Null until `torrents/files` answers. */
  files: readonly TorrentFile[] | null
  /**
   * True while a magnet has not resolved yet.
   *
   * Distinct from a slow request, which is what null files means. Here the
   * daemon has answered and the honest answer is an empty list, because the
   * file list comes from other peers and none have sent it. Without this the
   * tab renders an empty table under a Set priority row that can act on
   * nothing, and never says why.
   */
  awaitingMetadata?: boolean
  selected: readonly number[]
  onToggle: (index: number) => void
  /**
   * Tick or untick a whole folder at once.
   *
   * Separate from `onToggle` rather than a loop over it. Calling a toggle
   * repeatedly only lands every call if the owner happens to use a functional
   * update, which is an implementation detail of a component in another file
   * and not something this one should depend on to avoid losing selections.
   */
  onSelect: (indices: readonly number[], selected: boolean) => void
  onPriority: (indices: readonly number[], priority: Priority) => void
  /**
   * Where the torrent's content lives, for opening a file on double click.
   *
   * Omitted when there is no desktop to hand a path to, which is what turns
   * the behaviour off rather than a separate flag.
   */
  savePath?: string
}

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

/** Every file index a row stands for: one for a file, all of them for a folder. */
const indicesOf = (node: TreeNode): number[] =>
  node.kind === 'folder' ? node.files.map((f) => f.index) : [node.file.index]

/** The priority a row reports, or null when its contents disagree. */
function commonPriority(node: TreeNode): Priority | null {
  if (node.kind === 'file') return node.file.priority
  const [first, ...rest] = node.files
  if (!first) return null
  return rest.every((f) => f.priority === first.priority) ? first.priority : null
}

export function FilesTab({
  files,
  awaitingMetadata,
  selected,
  onToggle,
  onSelect,
  onPriority,
  savePath,
}: FilesTabProps) {
  const openable = Boolean(savePath) && canReachDesktop()
  const tree = useMemo(() => buildFileTree(files ?? []), [files])

  const [expanded, setExpanded] = useState<ReadonlySet<string>>(() => new Set<string>())

  /*
   * Seed the open folders once per torrent, not once per poll.
   *
   * `files` is a fresh array every few seconds while the detail view polls, so
   * anything keyed on its identity would slam every folder shut again mid
   * scroll. The top-level paths are what actually identify this torrent's
   * shape, and they do not change between polls.
   */
  const signature = tree.map((node) => node.path).join(' ')
  const seeded = useRef<string | null>(null)
  useEffect(() => {
    if (!files?.length || seeded.current === signature) return
    seeded.current = signature
    setExpanded(defaultExpanded(tree))
  }, [files, signature, tree])

  const rows = useMemo(() => flattenTree(tree, expanded), [tree, expanded])

  const toggleFolder = (path: string) =>
    setExpanded((prev) => {
      const next = new Set(prev)
      if (!next.delete(path)) next.add(path)
      return next
    })

  if (!files) {
    return (
      <div className="p-6">
        <Skeleton rows={5} rowHeight={38} />
      </div>
    )
  }

  if (files.length === 0 && awaitingMetadata) {
    return (
      <EmptyState
        icon={<icons.download className="size-6" strokeWidth={1.7} />}
        title="Waiting for the file list"
        body="A magnet link carries an identifier and nothing else. The list of files comes from other peers, and until one answers there is nothing here to choose."
      />
    )
  }

  const wanted = files.filter((f) => f.priority !== 0)
  const total = wanted.reduce((sum, f) => sum + f.size, 0)
  /**
   * Every file, skipped ones included.
   *
   * Shown only when it differs, and it is the number a torrent is described by
   * everywhere else: the tracker's size, the size in the add dialog, the size
   * a friend quotes. Printing only the selected total next to a file count
   * invites reading one as the other, and there was no way to see the real
   * size of a torrent with anything deselected.
   */
  const everything = files.reduce((sum, f) => sum + f.size, 0)

  return (
    <div className="flex flex-col gap-2.5 p-6">
      <div className="flex items-center gap-2.5">
        <SectionHeader>Contents</SectionHeader>
        <span className="font-mono text-[10.5px] text-text-dimmer">
          {files.length} files &middot; {wanted.length} selected &middot; {formatBytes(total)}
          {everything !== total ? ` of ${formatBytes(everything)}` : ''}
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

        {rows.map(({ node, depth }) => {
          const folder = node.kind === 'folder'
          const indices = indicesOf(node)
          const size = folder ? node.size : node.file.size
          const progress = folder ? node.progress : node.file.progress
          const priority = commonPriority(node)
          // A folder counts as skipped only when everything inside it is, so a
          // folder holding one wanted file does not print itself as skipped.
          const skipped = priority === 0
          const isOpen = folder && expanded.has(node.path)

          const ticked = indices.filter((i) => selected.includes(i)).length
          const allTicked = indices.length > 0 && ticked === indices.length
          const someTicked = ticked > 0 && !allTicked

          return (
            <div
              key={node.path}
              onClick={(event) => {
                // The row carries a checkbox, a chevron and a priority select,
                // and a click on any of those is not a click on the row.
                // Checking the target beats stopPropagation in each control,
                // which is a call somebody has to remember again every time
                // the row grows another one.
                const target = event.target as HTMLElement
                if (target.closest('button, [role="button"], input, select, a')) return
                // A folder's row opens the folder. A file's row opens the file,
                // which is the only thing either of them could sensibly mean.
                if (folder) toggleFolder(node.path)
                else if (openable && savePath) void openPath(join(savePath, node.path))
              }}
              title={
                folder
                  ? `${isOpen ? 'Collapse' : 'Expand'} ${node.name}`
                  : openable
                    ? `Open ${node.name}`
                    : undefined
              }
              className={cn(
                'grid grid-cols-[1fr_100px_150px_132px] items-center gap-2 border-t border-line px-3 py-2.5',
                'transition-colors duration-fast first:border-t-0 hover:bg-surface2',
                (folder || (openable && !skipped)) && 'cursor-pointer',
              )}
            >
              <div className="flex min-w-0 items-center gap-2" style={{ paddingLeft: depth * 16 }}>
                <Checkbox
                  checked={allTicked}
                  indeterminate={someTicked}
                  label={`Select ${node.name}`}
                  onChange={() => {
                    if (folder) onSelect(indices, !allTicked)
                    else onToggle(indices[0]!)
                  }}
                />

                {folder ? (
                  <button
                    type="button"
                    // The chevron is the disclosure control, so it carries the
                    // expanded state for a screen reader rather than the row,
                    // which is also a way to open a file.
                    aria-expanded={isOpen}
                    aria-label={`${isOpen ? 'Collapse' : 'Expand'} ${node.name}`}
                    onClick={() => toggleFolder(node.path)}
                    className="-m-1 shrink-0 rounded p-1 text-text-dimmer transition-colors duration-fast hover:text-accent"
                  >
                    <icons.chevronRight
                      className={cn(
                        'size-[13px] transition-transform duration-fast',
                        isOpen && 'rotate-90',
                      )}
                      strokeWidth={2.4}
                    />
                  </button>
                ) : (
                  // The width of the chevron button, so names line up in a
                  // column whether or not their row has one.
                  <span className="w-[13px] shrink-0" aria-hidden="true" />
                )}

                {folder ? (
                  isOpen ? (
                    <icons.folderOpen
                      className={cn(
                        'size-[13px] shrink-0',
                        skipped ? 'text-text-dimmer' : 'text-accent',
                      )}
                      strokeWidth={2}
                    />
                  ) : (
                    <icons.folder
                      className={cn(
                        'size-[13px] shrink-0',
                        skipped ? 'text-text-dimmer' : 'text-accent',
                      )}
                      strokeWidth={2}
                    />
                  )
                ) : (
                  // Every row used to wear a folder icon, files included, which
                  // said the one thing this column exists to distinguish was
                  // not worth distinguishing.
                  <icons.logs
                    className={cn(
                      'size-[13px] shrink-0',
                      skipped ? 'text-text-dimmer' : 'text-text-dim',
                    )}
                    strokeWidth={2}
                  />
                )}

                <span
                  title={node.path}
                  className={cn(
                    'truncate text-[12.5px]',
                    skipped ? 'text-text-dimmer' : 'font-semibold text-text',
                  )}
                >
                  {node.name}
                </span>

                {/* What a closed folder is hiding, so it can be judged shut. */}
                {folder ? (
                  <span className="shrink-0 font-mono text-[10px] text-text-dimmer">
                    {node.files.length}
                  </span>
                ) : null}
              </div>

              <span
                className={cn(
                  'text-right font-mono text-[10.5px]',
                  skipped ? 'text-text-dimmer' : 'text-text-dim',
                )}
              >
                {formatBytes(size)}
              </span>

              <div className="flex items-center gap-2">
                <ProgressBar
                  className="flex-1"
                  height={4}
                  value={progress * 100}
                  paused={skipped}
                  label={node.name}
                />
                <span className="shrink-0 font-mono text-[10.5px] text-text-dim">
                  {formatPercent(progress)}
                </span>
              </div>

              <div className="flex justify-end">
                <select
                  aria-label={`Priority for ${node.name}`}
                  // Empty when a folder's contents disagree. Showing one of the
                  // values would claim the others are that too, and the first
                  // change would silently flatten them.
                  value={priority ?? ''}
                  onChange={(e) => onPriority(indices, Number(e.target.value) as Priority)}
                  className={cn(
                    'rounded-md px-2 py-1 text-[11px] font-semibold',
                    // Keeps the default focus ring: this control is rounded, so
                    // the ring follows its corners. The `outline-none` that used
                    // to be here never applied, a layered utility against the
                    // unlayered rule in tokens/base.css.
                    'border border-line bg-surface2',
                    skipped ? 'text-text-dimmer' : 'text-text-dim',
                  )}
                >
                  {priority === null ? (
                    <option value="" disabled>
                      Mixed
                    </option>
                  ) : null}
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
