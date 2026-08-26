import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { ReactNode, RefObject } from 'react'

import { icons } from '@/lib/icons'
import { cn } from '@/lib/utils'

export interface ContextMenuAction {
  label: string
  icon?: ReactNode
  onSelect?: () => void
  /** Danger colour. Remove, Delete, Ban. Never the accent. */
  danger?: boolean
  disabled?: boolean
  separator?: never
  items?: never
}

export interface ContextMenuSeparator {
  separator: true
  label?: never
  items?: never
}

/**
 * A row that opens a second list rather than doing something.
 *
 * **One level, and that is a rule rather than a gap.** qBittorrent's own menu
 * is the reference and its deepest branch is one: Copy, Category, Tags, Queue
 * all open a flat list. A menu that can nest arbitrarily needs focus handling
 * per depth and a way out of the middle of a chain, which is a lot of
 * machinery for a shape nothing in this app has asked for. Nesting is
 * expressible only by the type not allowing it.
 */
export interface ContextMenuSubmenu {
  label: string
  icon?: ReactNode
  items: readonly ContextMenuAction[]
  disabled?: boolean
  separator?: never
  onSelect?: never
}

export type ContextMenuItem = ContextMenuAction | ContextMenuSeparator | ContextMenuSubmenu

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
  /**
   * The element that owns the menu, trigger included.
   *
   * A press inside it is not an outside press. Without this the outside
   * handler fires on the trigger, closes the menu, and the trigger's own
   * toggle then reopens it, so the button appears to do nothing.
   */
  anchorRef?: RefObject<HTMLElement | null>
  /** Accessible name, usually the torrent the menu acts on. */
  label?: string
  className?: string
}

const isSeparator = (i: ContextMenuItem): i is ContextMenuSeparator =>
  'separator' in i && i.separator === true

const isSubmenu = (i: ContextMenuItem): i is ContextMenuSubmenu =>
  'items' in i && Array.isArray(i.items)

/** Whether this row can take focus, which a separator and a disabled row cannot. */
const isFocusable = (i: ContextMenuItem): boolean => !isSeparator(i) && !i.disabled

const ROW = cn(
  'flex w-full items-center gap-2.5 rounded-md border-none bg-transparent',
  'px-[9px] py-[7px] text-left font-sans text-[12px] font-medium',
  'transition-colors duration-fast hover:bg-surface2 focus-visible:bg-surface2',
  'disabled:pointer-events-none disabled:opacity-45',
)

/**
 * One branch of the menu.
 *
 * Owns whether it is open, because nothing above it needs to know and a parent
 * tracking which of its children is expanded is state that can disagree with
 * the DOM.
 *
 * Opens on hover as well as on click, which is what a desktop menu does, and
 * on ArrowRight, which is what a keyboard expects. Closing on ArrowLeft hands
 * focus back to this row rather than to the top of the list, so a wrong turn
 * costs one keystroke.
 */
function Submenu({
  item,
  rootFirst,
  onCloseAll,
}: {
  item: ContextMenuSubmenu
  rootFirst: boolean
  onCloseAll: () => void
}) {
  const [open, setOpen] = useState(false)
  const [flipped, setFlipped] = useState(false)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)

  // Measured before paint, like the parent's own flip. A branch that opens off
  // the right edge of the window is worse than one that opens leftwards, and
  // the caller cannot know which rows are near an edge.
  useLayoutEffect(() => {
    if (!open) return
    const el = panelRef.current
    if (!el) return
    setFlipped(el.getBoundingClientRect().right > window.innerWidth - 8)
  }, [open])

  useEffect(() => {
    if (!open) return
    // Focus the first child once it exists, so ArrowRight lands somewhere.
    panelRef.current?.querySelector<HTMLButtonElement>('[role="menuitem"]')?.focus()
  }, [open])

  const close = (refocus: boolean) => {
    setOpen(false)
    if (refocus) triggerRef.current?.focus()
  }

  return (
    <div className="relative" onMouseLeave={() => setOpen(false)}>
      <button
        ref={triggerRef}
        type="button"
        role="menuitem"
        data-menu-root
        aria-haspopup="menu"
        aria-expanded={open}
        disabled={item.disabled}
        tabIndex={rootFirst ? 0 : -1}
        onMouseEnter={() => setOpen(true)}
        onClick={() => setOpen((was) => !was)}
        onKeyDown={(event) => {
          if (event.key === 'ArrowRight' || event.key === 'Enter' || event.key === ' ') {
            event.preventDefault()
            event.stopPropagation()
            setOpen(true)
          }
        }}
        className={cn(ROW, 'text-text')}
      >
        {item.icon ? <span className="text-text-dim flex">{item.icon}</span> : null}
        {item.label}
        <span className="flex-1" />
        <icons.chevronRight className="text-text-dimmer size-3.5" strokeWidth={2.2} />
      </button>

      {open ? (
        <div
          ref={panelRef}
          role="menu"
          aria-label={item.label}
          onKeyDown={(event) => {
            const buttons = Array.from(
              panelRef.current?.querySelectorAll<HTMLButtonElement>('[role="menuitem"]') ?? [],
            )
            const at = buttons.indexOf(document.activeElement as HTMLButtonElement)
            switch (event.key) {
              case 'ArrowLeft':
              case 'Escape':
                event.preventDefault()
                // Stopped, so the root does not also read this as a dismissal.
                // Escape inside a branch closes the branch, not the menu.
                event.stopPropagation()
                close(true)
                break
              case 'ArrowDown':
                event.preventDefault()
                event.stopPropagation()
                buttons[(at + 1) % buttons.length]?.focus()
                break
              case 'ArrowUp':
                event.preventDefault()
                event.stopPropagation()
                buttons[(at - 1 + buttons.length) % buttons.length]?.focus()
                break
            }
          }}
          className={cn(
            'bg-surface border-line absolute top-0 z-40 w-[196px] rounded-3xl border p-1.5',
            'shadow-[var(--shadow-card)]',
            flipped ? 'right-[calc(100%+4px)]' : 'left-[calc(100%+4px)]',
          )}
        >
          {item.items.map((child) => (
            <button
              key={child.label}
              type="button"
              role="menuitem"
              disabled={child.disabled}
              tabIndex={-1}
              onClick={() => {
                child.onSelect?.()
                onCloseAll()
              }}
              className={cn(ROW, child.danger ? 'text-danger' : 'text-text')}
            >
              {child.icon ? (
                <span className={cn('flex', child.danger ? 'text-danger' : 'text-text-dim')}>
                  {child.icon}
                </span>
              ) : null}
              {child.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  )
}

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
  anchorRef,
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

  // `pointerdown`, not `click`, and the reason is the whole bug.
  //
  // React flushes this effect while the click that opened the menu is still
  // bubbling towards the window, so a `click` listener registered here
  // received that very click and closed the menu it had just opened. The
  // button looked dead. A scripted `.click()` did not reproduce it, which is
  // how it survived being checked in a browser: only real pointer input
  // orders the phases that way.
  //
  // A pointerdown for the opening press has already happened by the time this
  // runs, so the listener cannot hear it. Outside presses still close the
  // menu, one event earlier than before, which is the behaviour people expect
  // from a menu anyway.
  useEffect(() => {
    if (!open) return
    const onOutside = (event: Event) => {
      const target = event.target as Node
      if (menuRef.current?.contains(target)) return
      // The trigger toggles the menu itself. Closing here as well would make
      // the two cancel out.
      if (anchorRef?.current?.contains(target)) return
      onClose()
    }
    window.addEventListener('pointerdown', onOutside)
    return () => window.removeEventListener('pointerdown', onOutside)
  }, [open, onClose, anchorRef])

  const firstFocusable = items.findIndex(isFocusable)

  /**
   * Root rows only, found by attribute rather than by position.
   *
   * An open branch puts its own `role="menuitem"` buttons inside this same
   * subtree, so a plain query would sweep them into the parent's up and down
   * navigation and the arrow keys would walk out of the list they belong to.
   * `:scope >` does not help either: a branch row is wrapped in a positioned
   * div, so it is a grandchild rather than a child.
   */
  const rootRows = useCallback(
    () => Array.from(menuRef.current?.querySelectorAll<HTMLButtonElement>('[data-menu-root]') ?? []),
    [],
  )

  const focusAt = useCallback(
    (position: number) => {
      rootRows()[position]?.focus()
    },
    [rootRows],
  )

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
    const buttons = rootRows()
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
      {items.map((item, i) => {
        if (isSeparator(item)) {
          return <div key={`sep-${i}`} role="separator" className="bg-line mx-1 my-[5px] h-px" />
        }
        if (isSubmenu(item)) {
          return (
            <Submenu
              key={item.label}
              item={item}
              rootFirst={firstFocusable === i}
              onCloseAll={onClose}
            />
          )
        }
        return (
          <button
            key={item.label}
            type="button"
            role="menuitem"
            data-menu-root
            disabled={item.disabled}
            tabIndex={firstFocusable === i ? 0 : -1}
            onClick={() => {
              item.onSelect?.()
              onClose()
            }}
            className={cn(ROW, item.danger ? 'text-danger' : 'text-text')}
          >
            {item.icon ? (
              <span className={cn('flex', item.danger ? 'text-danger' : 'text-text-dim')}>
                {item.icon}
              </span>
            ) : null}
            {item.label}
          </button>
        )
      })}
    </div>
  )
}
