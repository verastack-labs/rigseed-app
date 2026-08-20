import { useEffect } from 'react'

import { useThemeStore } from '@/state/theme-store'

/**
 * Repaints the taskbar icon to match the chosen accent.
 *
 * A sibling to `useThemeAttributes`: that one reskins everything inside the
 * window through the cascade, this one reaches the one piece of chrome the
 * cascade cannot touch.
 *
 * Only the window's icon changes. The icon compiled into the executable is a
 * resource rather than a setting, so Explorer and the Start menu shortcut keep
 * the default, and that split is normal for any app with a dynamic icon.
 *
 * Silent outside Tauri, and silent on failure. An icon is not worth an error
 * message, and the app is entirely usable wearing the wrong colour.
 */
export function useWindowIcon() {
  const mode = useThemeStore((s) => s.mode)
  const accent = useThemeStore((s) => s.accent)

  useEffect(() => {
    if (!(globalThis as { __TAURI_INTERNALS__?: unknown }).__TAURI_INTERNALS__) return

    let live = true
    void (async () => {
      try {
        const { invoke } = await import('@tauri-apps/api/core')
        if (!live) return
        await invoke('set_window_icon', { accent, dark: mode === 'dark' })
      } catch {
        // Cosmetic. The window keeps the icon it already had.
      }
    })()

    return () => {
      live = false
    }
  }, [mode, accent])
}
