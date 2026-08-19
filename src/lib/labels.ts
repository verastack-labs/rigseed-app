/**
 * Colours and icons for categories and tags.
 *
 * The Web API has no field for either. `torrents/createCategory` takes a name
 * and a save path and nothing else, so the styling is rigseed's, not the
 * daemon's, and it has to survive a category that was created somewhere else
 * entirely: by the stock WebUI, by a config file, by a previous client.
 *
 * Hence two layers. A name always resolves to a colour by hashing, so anything
 * the daemon reports looks distinct and stays the same colour between sessions
 * without anyone choosing anything. An explicit choice, when there is one,
 * overrides it. See `@/state/label-store`.
 *
 * Keys are stored, never hex. The swatch tokens are defined per mode in
 * tokens/colors.css, so a stored key stays legible when the user switches to
 * light and a stored hex would not.
 */

export const SWATCH_KEYS = [
  'blue',
  'terracota',
  'sage',
  'mustard',
  'lavender',
  'teal',
  'clay',
  'rose',
] as const

export type SwatchKey = (typeof SWATCH_KEYS)[number]

export interface Swatch {
  key: SwatchKey
  label: string
}

export const SWATCHES: readonly Swatch[] = [
  { key: 'blue', label: 'Dusty Blue' },
  { key: 'terracota', label: 'Terracotta' },
  { key: 'sage', label: 'Sage' },
  { key: 'mustard', label: 'Mustard' },
  { key: 'lavender', label: 'Lavender' },
  { key: 'teal', label: 'Slate Teal' },
  { key: 'clay', label: 'Clay' },
  { key: 'rose', label: 'Rose' },
]

/** The CSS reference for a swatch key. Resolves per mode. */
export function swatchColor(key: SwatchKey): string {
  return `var(--swatch-${key})`
}

/**
 * The fallback colour for a name that has no stored choice.
 *
 * Deterministic rather than random, so a category keeps its colour across
 * reloads and across machines without anything being persisted.
 */
export function swatchFor(name: string): SwatchKey {
  let hash = 0
  for (let i = 0; i < name.length; i += 1) hash = (hash * 31 + name.charCodeAt(i)) >>> 0
  return SWATCH_KEYS[hash % SWATCH_KEYS.length]!
}

/**
 * Icon choices offered when creating a category.
 *
 * A short list on purpose. This is a colour-and-shape memory aid in a chip
 * row, not an icon library, and a picker with forty options is slower to use
 * than one with six.
 */
export const CATEGORY_ICON_KEYS = ['disc', 'brush', 'box', 'book', 'folder', 'file'] as const

export type CategoryIconKey = (typeof CATEGORY_ICON_KEYS)[number]

export const DEFAULT_CATEGORY_ICON: CategoryIconKey = 'folder'
