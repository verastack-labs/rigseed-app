import { useId, useRef, useState } from 'react'
import type { ReactNode } from 'react'

import { Button } from '@/components/ui/button'
import { IconTile } from '@/components/ui/icon-tile'
import { cn } from '@/lib/utils'

export interface DropZoneProps {
  icon: ReactNode
  /** The filename once something is held, the invitation before that. */
  title: string
  /** Mono line under the title: size, entry count, how to replace. */
  hint: string
  actionLabel?: string
  /** Extension or MIME list, as the file input takes it. */
  accept?: string
  multiple?: boolean
  onFiles: (files: File[]) => void
  className?: string
}

/**
 * Matches a file against an `accept` list.
 *
 * The browser applies `accept` to the picker but not to a drop, so a dragged
 * screenshot would otherwise be handed to the caller as if it were a torrent.
 */
function matches(file: File, accept?: string): boolean {
  if (!accept) return true
  return accept.split(',').some((pattern) => {
    const p = pattern.trim().toLowerCase()
    if (!p) return false
    if (p.startsWith('.')) return file.name.toLowerCase().endsWith(p)
    if (p.endsWith('/*')) return file.type.startsWith(p.slice(0, -1))
    return file.type.toLowerCase() === p
  })
}

/**
 * Dashed drop target with a browse fallback.
 *
 * Drag and drop alone is not an affordance: it is invisible until attempted
 * and unreachable from the keyboard, so the button is the real control and the
 * drop target is the shortcut.
 */
export function DropZone({
  icon,
  title,
  hint,
  actionLabel = 'Browse',
  accept,
  multiple,
  onFiles,
  className,
}: DropZoneProps) {
  const inputId = useId()
  const inputRef = useRef<HTMLInputElement>(null)
  const [over, setOver] = useState(false)

  // dragenter and dragleave fire again for every child element the pointer
  // crosses, so tracking a boolean makes the border flicker as the cursor
  // moves across the icon and the text. Counting entries and exits does not.
  const depth = useRef(0)

  const take = (list: FileList | null) => {
    const files = Array.from(list ?? []).filter((f) => matches(f, accept))
    if (files.length) onFiles(multiple ? files : files.slice(0, 1))
  }

  return (
    <div
      onDragEnter={(e) => {
        e.preventDefault()
        depth.current += 1
        setOver(true)
      }}
      onDragOver={(e) => e.preventDefault()}
      onDragLeave={() => {
        depth.current -= 1
        if (depth.current <= 0) setOver(false)
      }}
      onDrop={(e) => {
        e.preventDefault()
        depth.current = 0
        setOver(false)
        take(e.dataTransfer.files)
      }}
      className={cn(
        'bg-surface2 flex items-center gap-3 rounded-[11px] border border-dashed px-4 py-3.5',
        'transition-colors duration-quick',
        over ? 'border-accent bg-accent-soft' : 'border-line',
        className,
      )}
    >
      <IconTile size={34}>{icon}</IconTile>

      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="text-text truncate text-[12.5px] font-semibold" title={title}>
          {title}
        </span>
        <span className="text-text-dimmer font-mono text-[10.5px]">{hint}</span>
      </div>

      <input
        ref={inputRef}
        id={inputId}
        type="file"
        accept={accept}
        multiple={multiple}
        className="hidden"
        onChange={(e) => {
          take(e.target.files)
          // Cleared so picking the same file twice in a row still fires a
          // change event, which is the "drop another file to replace" case.
          e.target.value = ''
        }}
      />
      <Button variant="secondary" size="sm" onClick={() => inputRef.current?.click()}>
        {actionLabel}
      </Button>
    </div>
  )
}
