/**
 * The detail screen's five sections.
 *
 * In its own module because the screen, the header and the polling hook all
 * need the vocabulary, and a file exporting both components and constants
 * cannot be hot-reloaded with its state intact.
 */
export const DETAIL_TABS = ['general', 'files', 'trackers', 'peers', 'speed'] as const

export type DetailTab = (typeof DETAIL_TABS)[number]
