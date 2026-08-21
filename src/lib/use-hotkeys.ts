import { useEffect, useRef } from 'react'

export interface Hotkey {
  /** Matched against `event.key`, case insensitive. */
  key: string
  /**
   * Requires the platform's command modifier.
   *
   * Ctrl on Windows and Linux, Cmd on macOS. Matched as "either one", because
   * a webview cannot be told which keyboard the user actually has and a
   * Windows user pressing Cmd is not a thing that happens.
   */
  mod?: boolean
  /**
   * Fires even while a text field has focus.
   *
   * Off for everything except Escape. A shortcut that steals a keystroke from
   * somebody typing a torrent name is worse than no shortcut: `Space` would
   * pause their downloads mid-word, and `/` would be unable to type a path.
   */
  inFields?: boolean
  run: (event: KeyboardEvent) => void
}

/** Whether the event came from somewhere a person is typing. */
function inTextField(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  if (target.isContentEditable) return true
  const tag = target.tagName
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT'
}

/**
 * Window-level shortcuts.
 *
 * One listener rather than a handler per row, because the keys act on the
 * screen's selection rather than on whatever happens to have focus, and rows
 * are recreated on every poll.
 *
 * Nothing fires while a dialog is open. A dialog makes the rest of the app
 * inert, so `Delete` behind one would open a second confirmation over the
 * first, and `Space` would pause torrents the user cannot see. The dialog's
 * own Escape still works: it handles that itself, on its own element.
 *
 * The bindings are held in a ref so a caller can pass a fresh array every
 * render, which is the natural thing to write, without rebinding the listener
 * or dropping a keypress in the gap.
 */
export function useHotkeys(bindings: readonly Hotkey[], enabled = true): void {
  const current = useRef(bindings)
  // Written in an effect rather than during render, which is a read of a ref
  // React will not allow. An effect with no dependency list runs after every
  // render, so the ref is current before any keypress can arrive: keyboard
  // events are dispatched to a painted document, not to one mid-render.
  useEffect(() => {
    current.current = bindings
  })

  useEffect(() => {
    if (!enabled) return

    const onKeyDown = (event: KeyboardEvent) => {
      if (document.querySelector('[role="dialog"]')) return

      const typing = inTextField(event.target)
      const mod = event.ctrlKey || event.metaKey

      for (const binding of current.current) {
        if (binding.key.toLowerCase() !== event.key.toLowerCase()) continue
        if (Boolean(binding.mod) !== mod) continue
        if (typing && !binding.inFields) continue
        // Only once a binding has matched. Calling it up front would swallow
        // every key the app does not bind, including the ones the browser
        // needs for text editing.
        event.preventDefault()
        binding.run(event)
        return
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [enabled])
}

/**
 * The next index for an arrow key, clamped rather than wrapping.
 *
 * Wrapping from the last row to the first is disorienting in a list that
 * changes under the user: `sync/maindata` adds and removes rows between
 * polls, so a wrap can look like the selection jumped for no reason.
 *
 * A cursor that is not in the list any more, because the torrent it pointed
 * at was removed, starts from the top going down and the bottom going up.
 */
export function nextIndex(current: number, delta: number, length: number): number {
  if (length === 0) return -1
  if (current < 0) return delta > 0 ? 0 : length - 1
  return Math.min(length - 1, Math.max(0, current + delta))
}
