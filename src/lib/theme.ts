/**
 * The theme vocabulary, shared rather than owned by one component.
 *
 * The appearance control, the first-run setup modal and the Settings screen
 * all present the same choices, so the list lives here and none of them is the
 * source of truth for the other two.
 *
 * These keys are what `[data-mode]` and `[data-accent]` are set to on the app
 * root. The values they resolve to live in tokens/colors.css.
 */

export type Mode = 'dark' | 'light'

export type AccentKey =
  'dustblue' | 'amber' | 'sage' | 'terracotta' | 'mustard' | 'slateteal' | 'lavender' | 'slate'

export interface Accent {
  key: AccentKey
  label: string
}

export const ACCENTS: readonly Accent[] = [
  { key: 'dustblue', label: 'Dusty Blue' },
  { key: 'amber', label: 'Amber' },
  { key: 'sage', label: 'Sage' },
  { key: 'terracotta', label: 'Terracotta' },
  { key: 'mustard', label: 'Mustard' },
  { key: 'slateteal', label: 'Slate Teal' },
  { key: 'lavender', label: 'Lavender' },
  { key: 'slate', label: 'Slate' },
]

export const DEFAULT_MODE: Mode = 'dark'
export const DEFAULT_ACCENT: AccentKey = 'dustblue'
