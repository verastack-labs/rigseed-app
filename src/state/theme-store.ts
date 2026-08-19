import { create } from 'zustand'
import { persist } from 'zustand/middleware'

import { DEFAULT_ACCENT, DEFAULT_MODE, type AccentKey, type Mode } from '@/lib/theme'

export type Layout = 'easy' | 'grid' | 'list'

interface ThemeState {
  mode: Mode
  accent: AccentKey
  defaultLayout: Layout
  onboardingCompleted: boolean
  setMode: (mode: Mode) => void
  setAccent: (accent: AccentKey) => void
  setDefaultLayout: (layout: Layout) => void
  completeOnboarding: () => void
  reopenSetup: () => void
}

/**
 * Appearance is app-local and deliberately persisted outside qBittorrent's own
 * preferences, so a remote instance never dictates how this client looks.
 *
 * localStorage for now. This moves to the Tauri store plugin once the shell is
 * running natively, which is why the persistence name is already namespaced.
 */
export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      mode: DEFAULT_MODE,
      accent: DEFAULT_ACCENT,
      defaultLayout: 'grid',
      onboardingCompleted: false,
      setMode: (mode) => set({ mode }),
      setAccent: (accent) => set({ accent }),
      setDefaultLayout: (defaultLayout) => set({ defaultLayout }),
      completeOnboarding: () => set({ onboardingCompleted: true }),
      reopenSetup: () => set({ onboardingCompleted: false }),
    }),
    { name: 'rigseed.appearance' },
  ),
)
