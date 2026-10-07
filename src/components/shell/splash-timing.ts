/**
 * The splash's timings, apart from the component.
 *
 * Split for the same reason `api-context.ts` is: a module exporting both a
 * component and other things loses fast refresh for the whole file, so
 * editing the splash would remount everything under it.
 */

/**
 * Long enough that a fast start does not flash.
 *
 * The built-in daemon usually answers in well under this, and a cover that
 * appears and vanishes inside two frames is a flicker rather than a splash.
 * Holding it for a beat is the difference between the app looking like it
 * started and looking like it glitched.
 */
export const MIN_VISIBLE_MS = 450

/**
 * And short enough that a daemon which never answers is not a locked door.
 *
 * Past this the cover goes regardless. The app underneath says what is wrong
 * in its own surfaces, the footer and the connection chip both describing a
 * connection that failed; a splash cannot, and somebody left looking at a logo
 * has no idea anything is the matter.
 */
export const MAX_VISIBLE_MS = 4000

/** Matches `duration-base`, so the class and the unmount agree. */
export const FADE_MS = 250
