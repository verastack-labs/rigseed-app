import { create } from 'zustand'
import { persist } from 'zustand/middleware'

/**
 * What the window's close button does.
 *
 * `ask` until somebody has been told what the choice is. There is no safe
 * default to pick silently: hiding an app somebody meant to quit loses it, and
 * quitting an app somebody meant to minimise stops their transfers. Both are
 * bad in a way they only find out about later, so the first close asks.
 */
export type CloseAction = 'ask' | 'tray' | 'quit'

interface WindowState {
  onClose: CloseAction
  setOnClose: (action: CloseAction) => void
}

/**
 * How rigseed behaves as a window, kept on this machine.
 *
 * Separate from the alerts store rather than folded in with it. They are both
 * app-local preferences and that is all they have in common: one is about
 * interrupting somebody, the other about whether the process keeps running.
 * A single store for everything local is a junk drawer by the third entry.
 */
export const useWindowPrefs = create<WindowState>()(
  persist(
    (set) => ({
      onClose: 'ask',
      setOnClose: (onClose) => set({ onClose }),
    }),
    { name: 'rigseed-window' },
  ),
)
