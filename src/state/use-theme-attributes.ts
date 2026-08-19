import { useEffect } from 'react'

import { useThemeStore } from '@/state/theme-store'

/**
 * Writes the theme onto the document root.
 *
 * This is the whole mechanism. Every colour in the app is a Tailwind utility
 * resolving to a var(), and those vars are declared under
 * [data-mode][data-accent] in tokens/colors.css. Changing either attribute
 * reskins the entire app through the cascade, with no re-render and no flash.
 */
export function useThemeAttributes() {
  const mode = useThemeStore((s) => s.mode)
  const accent = useThemeStore((s) => s.accent)

  useEffect(() => {
    const root = document.documentElement
    root.dataset.mode = mode
    root.dataset.accent = accent
  }, [mode, accent])
}
