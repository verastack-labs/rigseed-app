import { Button } from '@/components/ui/button'
import { icons } from '@/lib/icons'
import { cn } from '@/lib/utils'

export interface TransfersToolbarProps {
  /** How many torrents are selected. Zero means the actions apply to all. */
  selectedCount: number
  /** How many torrents are in view, used for the "all" wording. */
  totalCount: number
  onClearSelection: () => void
  onResume: () => void
  onPause: () => void
  onRemove: () => void
  /**
   * True while the daemon is not answering.
   *
   * Every one of these buttons is a write. Offering them while nothing can
   * reach the daemon means a click that silently does nothing, and the user
   * has no way to tell that from a torrent that refused to pause.
   */
  offline?: boolean
  className?: string
}

/**
 * Labels are fixed. Scope is carried by the selection pill, not by the verbs.
 *
 * An earlier version appended "all" when nothing was selected, so the buttons
 * read "Resume all" until a row was ticked. It made scope explicit but it
 * resized all three buttons on every selection change, and a toolbar that
 * shifts under the pointer costs more than the ambiguity it removed.
 *
 * The audience already reads a torrent toolbar as acting on the selection, or
 * on everything when there is none, so the wording is left to that intuition
 * and the pill states the count when it matters.
 *
 * Remove stays a real button rather than a disabled one. The destructive
 * actions rule puts a confirmation in front of it that names the consequence
 * and carries the delete-files checkbox, so the safety lives there.
 */
export function TransfersToolbar({
  selectedCount,
  totalCount,
  onClearSelection,
  onResume,
  onPause,
  onRemove,
  offline,
  className,
}: TransfersToolbarProps) {
  const hasSelection = selectedCount > 0
  const disabled = offline || (!hasSelection && totalCount === 0)
  const why = offline ? 'The daemon is not answering' : undefined

  return (
    <div
      className={cn(
        'border-line flex h-[52px] shrink-0 items-center gap-2 border-b px-6',
        className,
      )}
    >
      <Button
        size="sm"
        title={why}
        onClick={onResume}
        disabled={disabled}
        icon={<icons.resume className="size-[13px]" strokeWidth={2.2} />}
      >
        Resume
      </Button>
      <Button
        size="sm"
        title={why}
        onClick={onPause}
        disabled={disabled}
        icon={<icons.pause className="size-[13px]" strokeWidth={2.2} />}
      >
        Pause
      </Button>
      <Button
        size="sm"
        variant="danger"
        title={why}
        onClick={onRemove}
        disabled={disabled}
        icon={<icons.remove className="size-[13px]" strokeWidth={2.2} />}
      >
        Remove
      </Button>

      {hasSelection ? (
        <span className="bg-accent-soft text-accent flex items-center gap-1.5 rounded-chip py-1 pr-1 pl-3 text-[11.5px] font-semibold">
          <span className="font-mono tabular-nums">{selectedCount}</span> selected
          <button
            type="button"
            title="Clear selection"
            aria-label="Clear selection"
            onClick={onClearSelection}
            className="hover:bg-accent hover:text-accent-on flex size-[18px] items-center justify-center rounded-full transition-colors duration-fast"
          >
            <icons.clear className="size-3" strokeWidth={2.4} />
          </button>
        </span>
      ) : null}

      <span className="flex-1" />
    </div>
  )
}
