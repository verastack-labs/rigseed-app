import { useEffect, useState } from 'react'

import { canReachDesktop } from '@/services/shell'
import { useWindowPrefs, type CloseAction } from '@/state/window-prefs'

/** Matches `tray::CLOSE_REQUESTED` on the Rust side. */
const CLOSE_REQUESTED = 'rigseed://close-requested'

async function tell(command: 'hide_to_tray' | 'quit_app'): Promise<void> {
  try {
    const { invoke } = await import('@tauri-apps/api/core')
    await invoke(command)
  } catch (error) {
    // Nothing useful to do about it and nowhere sensible to say it: the window
    // is mid-close. The tray's own Quit does not come through here, so there
    // is still a way out.
    console.error(`rigseed: could not ${command}`, error)
  }
}

/**
 * Answers the close button.
 *
 * Rust always prevents the close and emits, because the preference lives here
 * and a dialog can only be drawn here. This decides what actually happens.
 *
 * That gives the frontend a veto over closing the window, which is only
 * acceptable because the tray menu's Quit does not go through it. A wedged
 * webview leaves the app closable.
 *
 * Returns whether the dialog should be showing, and the two answers to it.
 */
export function useCloseRequest() {
  const onClose = useWindowPrefs((s) => s.onClose)
  const setOnClose = useWindowPrefs((s) => s.setOnClose)
  const [asking, setAsking] = useState(false)

  useEffect(() => {
    if (!canReachDesktop()) return

    let stop: (() => void) | undefined
    let live = true

    void (async () => {
      const { listen } = await import('@tauri-apps/api/event')
      const unlisten = await listen(CLOSE_REQUESTED, () => {
        // Read at the moment it fires rather than closed over. The listener
        // outlives any particular value of the preference, and a stale one
        // here means the app does the opposite of what Settings says.
        const wanted = useWindowPrefs.getState().onClose
        if (wanted === 'tray') void tell('hide_to_tray')
        else if (wanted === 'quit') void tell('quit_app')
        else setAsking(true)
      })
      if (live) stop = unlisten
      else unlisten()
    })()

    return () => {
      live = false
      stop?.()
    }
  }, [])

  const answer = (action: Exclude<CloseAction, 'ask'>, remember: boolean) => {
    setAsking(false)
    if (remember) setOnClose(action)
    void tell(action === 'tray' ? 'hide_to_tray' : 'quit_app')
  }

  return {
    asking,
    keepRunning: (remember: boolean) => answer('tray', remember),
    quit: (remember: boolean) => answer('quit', remember),
    onClose,
  }
}
