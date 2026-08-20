import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { useApi } from '@/services/api-context'
import type { PreferenceChanges, Preferences } from '@/types/qbittorrent'

export interface PreferencesState {
  /** Null until the first read answers. */
  saved: Preferences | null
  /** What the screen is showing, saved plus every unapplied edit. */
  draft: Preferences | null
  /** Just the keys that differ, which is exactly what Apply sends. */
  changes: PreferenceChanges
  dirtyKeys: readonly (keyof Preferences)[]
  saving: boolean
  error: string | null
  set: <K extends keyof Preferences>(key: K, value: Preferences[K]) => void
  apply: () => Promise<void>
  revert: () => void
}

/**
 * Preferences, edited locally and written on Apply.
 *
 * Nothing reaches the daemon until Apply. A settings screen that writes on
 * every keystroke cannot be reverted, and half of these are numbers people
 * type through invalid intermediate states: clearing 500 to type 800 goes
 * through empty, and an empty connection limit applied for one keystroke is a
 * real change to a running daemon.
 *
 * Apply sends only the keys that differ. `app/setPreferences` accepts a
 * partial object, and sending the whole thing back would write 223 values a
 * user did not touch, including any the daemon added in a version this app
 * has never seen.
 *
 * There is no polling. Preferences change when somebody changes them, and a
 * poll behind an open editor is a poll that overwrites what is being typed.
 */
export function usePreferences(): PreferencesState {
  const api = useApi()

  const [saved, setSaved] = useState<Preferences | null>(null)
  const [draft, setDraft] = useState<Preferences | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  /** Guards a response that arrives after the screen has gone. */
  const live = useRef(true)

  /**
   * Which connection the values in state came from.
   *
   * The provider hands out a mock client while it looks for a daemon, so this
   * screen can be showing the sample preferences when the real connection
   * arrives. Leaving them on screen would be bad enough; the dangerous part is
   * that an edit made in that window diffs against the sample values, and
   * Apply would then write them to a real daemon.
   *
   * Adjusted during render, so the stale frame is never committed.
   */
  const [owner, setOwner] = useState(api)
  if (owner !== api) {
    setOwner(api)
    setSaved(null)
    setDraft(null)
    setError(null)
  }

  useEffect(() => {
    live.current = true
    void (async () => {
      try {
        const prefs = await api.app.preferences()
        if (!live.current) return
        setSaved(prefs)
        setDraft(prefs)
      } catch (cause) {
        if (live.current) setError(cause instanceof Error ? cause.message : String(cause))
      }
    })()
    return () => {
      live.current = false
    }
  }, [api])

  const changes = useMemo((): PreferenceChanges => {
    if (!saved || !draft) return {}
    const diff: Record<string, unknown> = {}
    for (const key of Object.keys(draft) as (keyof Preferences)[]) {
      if (draft[key] !== saved[key]) diff[key] = draft[key]
    }
    return diff as PreferenceChanges
  }, [saved, draft])

  const dirtyKeys = useMemo(() => Object.keys(changes) as (keyof Preferences)[], [changes])

  const set = useCallback(
    <K extends keyof Preferences>(key: K, value: Preferences[K]) =>
      setDraft((prev) => (prev ? { ...prev, [key]: value } : prev)),
    [],
  )

  const apply = useCallback(async () => {
    if (!draft || dirtyKeys.length === 0) return
    setSaving(true)
    setError(null)
    try {
      await api.app.setPreferences(changes)
      // The draft becomes the new baseline rather than re-reading. A read
      // straight after a write can answer from before it landed, and the
      // screen would flash back to the old values for one poll.
      setSaved(draft)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause))
    } finally {
      setSaving(false)
    }
  }, [api, changes, draft, dirtyKeys.length])

  const revert = useCallback(() => setDraft(saved), [saved])

  return { saved, draft, changes, dirtyKeys, saving, error, set, apply, revert }
}
