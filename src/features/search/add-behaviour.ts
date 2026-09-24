import type { Layout } from '@/state/theme-store'

/**
 * Whether adding a search hit stops at the dialog first.
 *
 * This was a plain `false`, so every layout skipped the dialog and somebody on
 * List had to go and find a switch to get back the behaviour their layout
 * already implied. The layout chosen at setup has said how much detail the
 * visitor wants put in front of them, so it is the sensible default here too.
 *
 * Easy asks for fewer decisions, so a hit is added straight away. Grid and List
 * are the denser views and get the dialog, with its save path, category and
 * start-paused.
 *
 * It lives apart from the page because it is a decision rather than a
 * rendering, and because a default nobody can test is a default that drifts.
 */
export const ASK_KEY = 'rigseed:search:ask-before-adding'

/** The layouts that mean "do not put a dialog in my way". */
const SKIPS_THE_DIALOG: readonly Layout[] = ['easy']

/**
 * `stored` is what the switch has been set to, or null when it has never been
 * touched. Null is what lets the layout drive the answer: a stored value, even
 * a false one, is a decision somebody made and outranks the inference.
 */
export function shouldAskBeforeAdding(stored: boolean | null, layout: Layout): boolean {
  if (stored !== null) return stored
  return !SKIPS_THE_DIALOG.includes(layout)
}

/**
 * Read the switch's stored value.
 *
 * Returns null both when it has never been set and when storage is unreadable,
 * because in each case the honest answer is "nobody has told us", and the
 * layout is a better guess than false. A browser with storage blocked throws
 * here rather than returning null.
 */
export function readAskPreference(): boolean | null {
  try {
    const stored = localStorage.getItem(ASK_KEY)
    return stored === null ? null : stored === 'true'
  } catch {
    return null
  }
}

/** Persist a deliberate choice. Only ever called from the switch. */
export function writeAskPreference(next: boolean): void {
  try {
    localStorage.setItem(ASK_KEY, String(next))
  } catch {
    // The choice still holds for this session, which is the part that matters.
  }
}
