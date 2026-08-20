import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'

import { cn } from '@/lib/utils'

export interface ContextMenuAction {
  label: string
  icon?: ReactNode
  onSelect?: () => void
  /** Danger colour. Remove, Delete, Ban. Never the accent. */
  danger?: boolean
  disabled?: boolean
  separator?: never
}

export interface ContextMenuSeparator {
  separator: true
  label?: never
}

export type ContextMenuItem = ContextMenuAction | ContextMenuSeparator

/** A point in viewport coordinates, as a `contextmenu` event reports it. */
export interface Point {
  x: number
  y: number
}

export interface ContextMenuProps {
  items: readonly ContextMenuItem[]
  open: boolean
  /** Called on selection, on Escape, and on any outside click. */
  onClose: () => void
  /**
   * Open at this point instead of under the trigger.
   *
   * A right click has its own idea of where the menu belongs, and it is not
   * the top right corner of the card. With a point the menu is positioned
   * `fixed` against the viewport and clamped into it; without one it keeps
   * its anchored behaviour, which is what the three-dot button wants.
   */
  at?: Point
  /**
   * Force the flip direction. Left undefined the menu measures itself and
   * flips above when it would otherwise run off the bottom of the viewport.
   */
  above?: boolean
  width?: number
  /** Accessible name, usually the torrent the menu acts on. */
  label?: string
  className?: string
}

const isAction = (i: ContextMenuItem): i is ContextMenuAction => !('separator' in i && i.separator)

/**
 * The three-dot menu.
 *
 * Anchors to its trigger with right edges aligned, 8px below. The trigger's
 * wrapper needs `position: relative`, and the owning card must lift to
 * `z-index: 30` while the menu is open or neighbouring cards clip it.
 *
 * Unlike the prototype, the flip is measured rather than passed in. A caller
 * cannot reasonably know whether a given row is near the viewport edge, and
 * getting it wrong means the menu opens off screen.
 */
export function ContextMenu({
  items,
  open,
  onClose,
  at,
  above,
  width = 224,
  label,
  className,
}: ContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null)
  const [measuredFlip, setMeasuredFlip] = useState(false)
  const flipped = above ?? measuredFlip

  // Measure before paint so the menu never renders in the wrong place first.
  useLayoutEffect(() => {
    if (!open || at || above !== undefined) return
    const el = menuRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    setMeasuredFlip(rect.height > 0 && rect.bottom > window.innerHeight - 8)
  }, [open, at, above, items])

  // The pointer-anchored case, which needs both axes rather than a flip.
  // Clamping rather than flipping on x, because a menu that jumps to the left
  // of the cursor near the edge of a window reads as a misclick.
  //
  // Written straight onto the node rather than into state. The correction
  // depends on the height the browser just laid out, so a state round trip
  // would be a second render to reach a value this pass already knows, and
  // setting state from a layout effect is the pattern the lint rule exists to
  // stop. A layout effect runs before paint, so nothing is ever visible at the
  // uncorrected position.
  useLayoutEffect(() => {
    const el = menuRef.current
    if (!open || !at || !el) return
    const height = el.getBoundingClientRect().height
    const edge = 8
    const room = window.innerHeight - edge
    el.style.left = `${Math.max(edge, Math.min(at.x, window.innerWidth - width - edge))}px`
    el.style.top = `${at.y + height > room ? Math.max(edge, at.y - height) : at.y}px`
  }, [open, at, width, items])

  // Added after the opening click has finished propagating, so it does not
  // immediately close the menu it just opened.
  useEffect(() => {
    if (!open) return
    const onDocumentClick = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) onClose()
    }
    window.addEventListener('click', onDocumentClick)
    return () => window.removeEventListener('click', onDocumentClick)
  }, [open, onClose])

  const actionIndexes = items.reduce<number[]>((acc, item, i) => {
    if (isAction(item) && !item.disabled) acc.push(i)
    return acc
  }, [])

  const focusAt = useCallback((position: number) => {
    const buttons = menuRef.current?.querySelectorAll<HTMLButtonElement>('[role="menuitem"]')
    buttons?.[position]?.focus()
  }, [])

  // Focus the first item on open, and hand focus back to the trigger on close.
  // Without the second half, closing the menu drops the user at the top of the
  // document, which is the classic way a keyboard user loses their place.
  const triggerRef = useRef<HTMLElement | null>(null)
  useEffect(() => {
    if (!open) return
    triggerRef.current = document.activeElement as HTMLElement | null
    focusAt(0)
    return () => triggerRef.current?.focus?.()
  }, [open, focusAt])

  const onKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const buttons = Array.from(
      menuRef.current?.querySelectorAll<HTMLButtonElement>('[role="menuitem"]') ?? [],
    )
    const current = buttons.indexOf(document.activeElement as HTMLButtonElement)

    switch (event.key) {
      case 'Escape':
        event.preventDefault()
        onClose()
        break
      case 'ArrowDown':
        event.preventDefault()
        focusAt((current + 1) % buttons.length)
        break
      case 'ArrowUp':
        event.preventDefault()
        focusAt((current - 1 + buttons.length) % buttons.length)
        break
      case 'Home':
        event.preventDefault()
        focusAt(0)
        break
      case 'End':
        event.preventDefault()
        focusAt(buttons.length - 1)
        break
      case 'Tab':
        // A menu is not a dialog. Tab dismisses it rather than cycling inside,
        // so focus continues through the page from the trigger.
        onClose()
        break
    }
  }

  if (!open) return null

  return (
    <div
      ref={menuRef}
      role="menu"
      aria-label={label}
      onKeyDown={onKeyDown}
      className={cn(
        'bg-surface border-line z-30 rounded-3xl border p-1.5',
        at ? 'fixed' : 'absolute right-0',
        // Token names live in Tailwind's --shadow-* namespace, so mapping them
        // into @theme would be a self-referential cycle. Shadows appear in four
        // places in the whole app, so an arbitrary value is clearer than
        // inventing a parallel name.
        'shadow-[var(--shadow-card)]',
        !at && (flipped ? 'bottom-[calc(100%+8px)]' : 'top-[calc(100%+8px)]'),
        className,
      )}
      style={at ? { width, left: at.x, top: at.y } : { width }}
    >
      {items.map((item, i) =>
        isAction(item) ? (
          <button
            key={item.label}
            type="button"
            role="menuitem"
            disabled={item.disabled}
            tabIndex={actionIndexes[0] === i ? 0 : -1}
            onClick={() => {
              item.onSelect?.()
              onClose()
            }}
            className={cn(
              'flex w-full items-center gap-2.5 rounded-md border-none bg-transparent',
              'px-[9px] py-[7px] text-left font-sans text-[12px] font-medium',
              'transition-colors duration-fast hover:bg-surface2 focus-visible:bg-surface2',
              'disabled:pointer-events-none disabled:opacity-45',
              item.danger ? 'text-danger' : 'text-text',
            )}
          >
            {item.icon ? (
              <span className={cn('flex', item.danger ? 'text-danger' : 'text-text-dim')}>
                {item.icon}
              </span>
            ) : null}
            {item.label}
          </button>
        ) : (
          <div key={`sep-${i}`} role="separator" className="bg-line mx-1 my-[5px] h-px" />
        ),
      )}
    </div>
  )
}
