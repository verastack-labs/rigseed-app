import { useEffect, useRef, useState } from 'react'

import type { Point } from '@/components/ui/context-menu'

/**
 * A menu that opens from its own button and from a right click.
 *
 * The right-click target is the nearest `[data-context-target]` ancestor,
 * which is the card in the transfer layouts and the whole detail screen when
 * a torrent is open. Reaching up the DOM rather than taking a ref is what
 * keeps one piece of open state here instead of a copy in every layout that
 * renders a menu, and the attribute keeps that reach explicit: this hook
 * never guesses at a parent it was not pointed at.
 *
 * Returns the props the menu needs, so a caller cannot forget to pass `at`
 * and quietly end up with a right click that opens the menu in the corner.
 */
export function usePointerMenu() {
  const anchor = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)
  const [at, setAt] = useState<Point | null>(null)

  useEffect(() => {
    const target = anchor.current?.closest<HTMLElement>('[data-context-target]')
    if (!target) return

    const onContextMenu = (event: MouseEvent) => {
      // Otherwise the webview's own menu opens on top of ours, offering
      // Reload and Inspect on a torrent.
      event.preventDefault()
      setAt({ x: event.clientX, y: event.clientY })
      setOpen(true)
    }

    target.addEventListener('contextmenu', onContextMenu)
    return () => target.removeEventListener('contextmenu', onContextMenu)
  }, [])

  const close = () => {
    setOpen(false)
    setAt(null)
  }

  return {
    anchor,
    open,
    /** For the button: back under it, wherever the last right click happened. */
    toggle: () => {
      setAt(null)
      setOpen((v) => !v)
    },
    close,
    menuProps: { open, onClose: close, ...(at ? { at } : {}) },
  }
}
