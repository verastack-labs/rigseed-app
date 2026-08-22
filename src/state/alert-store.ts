import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface AlertState {
  /** A torrent reaching 100%. */
  onComplete: boolean
  /** A torrent stopping because something went wrong with it. */
  onError: boolean
  set: (changed: Partial<Pick<AlertState, 'onComplete' | 'onError'>>) => void
}

/**
 * Which desktop notifications rigseed is allowed to raise.
 *
 * App-local and persisted, because it is a preference about this installation
 * rather than about the daemon. The Web API has no field for it, and it would
 * be wrong if it did: two clients pointed at one daemon should not be arguing
 * over whose desktop gets interrupted.
 *
 * **Both default to off.** The OS permission prompt is a real cost and it is
 * asked once, so it should be spent on somebody who has said they want this
 * rather than on everybody who opens the app. Turning either on is what
 * triggers the ask.
 */
export const useAlertStore = create<AlertState>()(
  persist(
    (set) => ({
      onComplete: false,
      onError: false,
      set: (changed) => set(changed),
    }),
    { name: 'rigseed-alerts' },
  ),
)
