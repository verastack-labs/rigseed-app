import { useEffect, useState } from 'react'

import { BrandMark } from '@/components/brand-mark'
import { FADE_MS, MAX_VISIBLE_MS, MIN_VISIBLE_MS } from '@/components/shell/splash-timing'
import { useConnection } from '@/services/api-context'

/**
 * The cover over a cold start.
 *
 * Mounted once, by `App`, and that is the whole of how it meets the "first
 * start only" requirement. Closing the window runs `hide_to_tray`, which calls
 * `window.hide()` and leaves the webview alive, so coming back from the tray
 * or the taskbar shows the same document with React still mounted. Nothing
 * remounts, so there is nothing to suppress and no "have we started before"
 * flag to keep. A second launch is the same story from the other side:
 * `reveal` shows the existing window rather than starting a process.
 *
 * It covers until the connection settles rather than for a fixed time.
 * `connecting` is the only unsettled status; connected, mock and failed all
 * mean the app behind this knows what it is showing, which is the moment a
 * cover stops helping.
 */
export function Splash() {
  const connection = useConnection()
  const settled = connection.status !== 'connecting'

  // Three facts, each set by a timer rather than during a render, so none of
  // this is a setState in an effect body.
  const [held, setHeld] = useState(false)
  const [expired, setExpired] = useState(false)
  const [gone, setGone] = useState(false)

  /*
   * Fading is derived, not stored.
   *
   * It was state at first, set from an effect watching `settled` and `held`,
   * which is a synchronous setState inside an effect and a cascading render.
   * There is nothing to store: it is a reading of the other three.
   */
  const fading = !gone && (expired || (settled && held))

  useEffect(() => {
    const floor = setTimeout(() => setHeld(true), MIN_VISIBLE_MS)
    const ceiling = setTimeout(() => setExpired(true), MAX_VISIBLE_MS)
    return () => {
      clearTimeout(floor)
      clearTimeout(ceiling)
    }
  }, [])

  useEffect(() => {
    if (!fading) return
    const done = setTimeout(() => setGone(true), FADE_MS)
    return () => clearTimeout(done)
  }, [fading])

  if (gone) return null

  return (
    <div
      // Above the setup modal at z-50, because on a genuine first run both
      // want the screen and the cover is the one that should come off first.
      className={[
        'bg-bg fixed inset-0 z-[60] flex flex-col items-center justify-center gap-4',
        'transition-opacity duration-base ease-plain',
        fading ? 'pointer-events-none opacity-0' : 'opacity-100',
      ].join(' ')}
      // A cover, not content. The status is announced rather than the layout
      // described, so a screen reader says the app is starting and not that
      // there is a region with a logo in it.
      role="status"
      aria-live="polite"
    >
      <div className="text-accent">
        <BrandMark size={56} />
      </div>
      <p className="text-text-dim text-sm">Starting rigseed</p>
    </div>
  )
}
