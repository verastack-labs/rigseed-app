import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode, RefObject } from 'react'
import { FloatingPortal, autoUpdate, flip, offset, shift, useFloating } from '@floating-ui/react'

import { icons } from '@/lib/icons'
import { cn } from '@/lib/utils'

/**
 * Marks every surface this menu renders through a portal.
 *
 * Portalled nodes are not inside the trigger's subtree, so the outside-press
 * handler cannot recognise them by containment and would close the menu on a
 * click aimed at its own submenu. This attribute is how a press is traced back
 * to a menu it belongs to.
 */
const SURFACE = 'data-menu-surface'

/**
 * Both menus render into a portal at the document root.
 *
 * Not for z-index. `<main>` carries `overflow-x: hidden`, added to kill the
 * horizontal scrollbar, which makes it a clipping ancestor for anything
 * positioned inside it. A submenu on a right-hand card is then cut off no
 * matter how correctly it is positioned, and in the worst case widens the
 * document and brings the very scrollbar back. Only leaving the subtree fixes
 * that; better arithmetic cannot.
 */
const EDGE = 8

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
  const triggerRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)

  /**
   * Position computed from the trigger, not from where the panel currently is.
   *
   * This replaced a hand-rolled flip that was correct on the first open and
   * wrong on every one after it. It measured the panel's own rect and compared
   * it against the window, but the flipped flag survived between opens: on
   * reopen the panel was already on the left, measured as having plenty of
   * room, and flipped back to the right where it was clipped. Measured on a
   * 1100px window, a right-hand card put the branch at x 1058 to 1254 against
   * a viewport edge of 1100.
   *
   * The lesson is not that the arithmetic was subtly off. It is that a
   * position derived from the current position cannot be idempotent, and a
   * one-shot effect over stateful geometry will always drift. Floating UI
   * recomputes from the reference element every time, so reopening cannot
   * reach a different answer than opening did.
   */
  const { refs, floatingStyles } = useFloating({
    open,
    onOpenChange: setOpen,
    placement: 'right-start',
    // The row this hangs off can move under it: the parent menu flips, the
    // window resizes, the list behind it scrolls. Without this the branch
    // keeps the coordinates it opened with.
    whileElementsMounted: autoUpdate,
    middleware: [
      offset(4),
      // Leftwards before anything else, which is what a desktop menu does at
      // the edge of a screen.
      flip({ fallbackPlacements: ['left-start'], padding: EDGE }),
      // Nudges along the cross axis so a branch near the bottom stays whole
      // rather than half off the viewport.
      shift({ padding: EDGE }),
    ],
  })

  const close = (refocus: boolean) => {
    setOpen(false)
    if (refocus) triggerRef.current?.focus()
  }

  const setTrigger = (node: HTMLButtonElement | null) => {
    triggerRef.current = node
    refs.setReference(node)
  }

  /**
   * State as well as a ref, because the portal mounts a render late.
   *
   * `FloatingPortal` creates its container in an effect, so the panel is not
   * in the document on the pass that sets `open`. An effect keyed on `open`
   * alone therefore ran while there was nothing to focus, and ArrowRight
   * opened a branch that never took focus. Keying on the node instead means
   * the effect runs when the panel actually exists, whenever that is.
   */
  const [panelNode, setPanelNode] = useState<HTMLDivElement | null>(null)

  useEffect(() => {
    // Focus the first child once it exists, so ArrowRight lands somewhere.
    panelNode?.querySelector<HTMLButtonElement>('[role="menuitem"]')?.focus()
  }, [panelNode])

  const setPanel = (node: HTMLDivElement | null) => {
    panelRef.current = node
    setPanelNode(node)
    refs.setFloating(node)
  }

  return (
    <div onMouseLeave={() => setOpen(false)}>
      <button
        ref={setTrigger}
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
        <FloatingPortal>
        <div
          ref={setPanel}
          role="menu"
          aria-label={item.label}
          {...{ [SURFACE]: '' }}
          style={floatingStyles}
          onMouseEnter={() => setOpen(true)}
          onMouseLeave={() => setOpen(false)}
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
            // One above its own menu, for the same reason that one clears the
            // add button. See the root menu's note.
            'bg-surface border-line z-[46] w-[196px] rounded-3xl border p-1.5',
            'shadow-[var(--shadow-card)]',
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
        </FloatingPortal>
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

  /**
   * One positioner for both ways this menu opens.
   *
   * The anchored case references the trigger's own wrapper and hangs the menu
   * below it with right edges aligned. The pointer case references a zero-size
   * virtual element at the click, which is how Floating UI models a cursor.
   * Both then get the same flip and shift treatment, where the old code had
   * two hand-rolled correction paths that behaved differently: one flipped on
   * y only, the other clamped on x and flipped on y by hand.
   *
   * `above` still wins when a caller passes it, since a few screens know
   * something about their layout that measurement cannot.
   */
  /**
   * The cursor as a reference element, memoised so it is one object per point.
   *
   * Floating UI accepts anything that can report a rect, so a click position
   * needs no separate path through the positioning code. Rebuilding it every
   * render would make the positioner see a new reference each time and
   * recompute forever.
   */
  const pointer = useMemo(
    () =>
      at
        ? {
            getBoundingClientRect: () =>
              ({
                x: at.x,
                y: at.y,
                top: at.y,
                left: at.x,
                right: at.x,
                bottom: at.y,
                width: 0,
                height: 0,
              }) as DOMRect,
          }
        : null,
    [at],
  )

  const { refs, floatingStyles } = useFloating({
    open,
    placement: at ? 'bottom-start' : above ? 'top-end' : 'bottom-end',
    /*
     * Without this the position is computed once and never again. Floating UI
     * does not watch for movement on its own, so a menu survives a resize,
     * a scroll or a layout change holding coordinates from the layout it
     * opened in. Maximising the window was exactly that: a menu whose trigger
     * had moved to x 840 stayed at x 396, 244px adrift.
     */
    whileElementsMounted: autoUpdate,
    middleware: [
      offset(at ? 0 : 8),
      /*
       * Both cases flip, and an earlier version of this excluded the pointer
       * one on the grounds that a menu jumping above the cursor reads as a
       * misclick. That conflated two axes. The placement here is `bottom-*`,
       * so flipping means going above, which is exactly what the hand-rolled
       * code it replaced already did and what every desktop menu does at the
       * bottom of a screen. Sideways movement is `shift`'s job, not this one's.
       *
       * Leaving it out cost a real regression: a right click low in a card put
       * the menu at bottom 757 in a 700px window, with the last items off
       * screen. jsdom cannot see that, since every rect there is zero. Only
       * driving the actual window caught it.
       */
      ...(above !== undefined ? [] : [flip({ padding: EDGE })]),
      shift({ padding: EDGE }),
    ],
  })

  /*
   * What the menu is positioned against: the cursor, or the trigger's wrapper.
   *
   * A layout effect, not a plain one. The earlier version used `useEffect`,
   * which runs after the browser has painted, and paired it with a positioner
   * that never recomputed. An anchored menu therefore took whatever position
   * the first referenceless pass produced and kept it: maximising the window
   * put a menu at x 396 whose trigger was at x 840, 244px adrift, and it
   * stayed there. Running before paint means nothing is visible at the
   * uncorrected spot, and `autoUpdate` above means it cannot go stale after.
   *
   * A setter rather than the `elements` prop because that prop is typed for a
   * DOM element, and a click position is a virtual reference rather than one.
   * Reading `anchorRef.current` here is also the only correct place for it:
   * during render it would be a ref read React explicitly forbids.
   */
  useLayoutEffect(() => {
    const reference = pointer ?? anchorRef?.current ?? null
    if (reference) refs.setPositionReference(reference)
  }, [pointer, anchorRef, refs, open])

  /** See the submenu's own note: the portal mounts a render after `open`. */
  const [menuNode, setMenuNode] = useState<HTMLDivElement | null>(null)

  const setMenu = (node: HTMLDivElement | null) => {
    menuRef.current = node
    setMenuNode(node)
    refs.setFloating(node)
  }

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
      // A portalled submenu is not inside the menu's subtree, so containment
      // cannot recognise it and a click on Copy's own children would close the
      // menu underneath them. The attribute is what traces a press back to a
      // surface this menu put on screen.
      if (target instanceof Element && target.closest(`[${SURFACE}]`)) return
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
    if (!menuNode) return
    triggerRef.current = document.activeElement as HTMLElement | null
    focusAt(0)
    return () => triggerRef.current?.focus?.()
  }, [menuNode, focusAt])

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
    <FloatingPortal>
    <div
      ref={setMenu}
      role="menu"
      aria-label={label}
      {...{ [SURFACE]: '' }}
      onKeyDown={onKeyDown}
      className={cn(
        // Above the add button, below a modal. Portalling moved both menus
        // to the document root, where they stack against app chrome rather
        // than against the card they came from. The add button's column is
        // `z-40` and 164x268 of live pointer target in the bottom-right
        // corner, so at `z-30` it sat on top of any menu reaching that far
        // and swallowed both clicks and the hover that opens a branch.
        // Dialogs stay above at `z-50`, which is correct: they are modal and
        // a menu must not float over one.
        'bg-surface border-line z-[45] rounded-3xl border p-1.5',
        // Token names live in Tailwind's --shadow-* namespace, so mapping them
        // into @theme would be a self-referential cycle. Shadows appear in four
        // places in the whole app, so an arbitrary value is clearer than
        // inventing a parallel name.
        'shadow-[var(--shadow-card)]',
        className,
      )}
      style={{ ...floatingStyles, width }}
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
    </FloatingPortal>
  )
}
