import { create } from 'zustand'
import { persist } from 'zustand/middleware'

import {
  DEFAULT_CATEGORY_ICON,
  swatchFor,
  type CategoryIconKey,
  type SwatchKey,
} from '@/lib/labels'

export interface CategoryStyle {
  icon: CategoryIconKey
  color: SwatchKey
}

interface LabelState {
  /** Explicit choices only. A name absent here falls back to hashing. */
  categories: Record<string, CategoryStyle>
  tags: Record<string, SwatchKey>
  setCategoryStyle: (name: string, style: CategoryStyle) => void
  setTagColor: (name: string, color: SwatchKey) => void
  forgetCategory: (name: string) => void
  forgetTag: (name: string) => void
  reset: () => void
}

/**
 * Where a chosen category icon and a chosen tag colour live.
 *
 * They cannot live in the daemon: the Web API has no field for either, and a
 * remote instance shared with another client has no business being told what
 * colour this one paints things. So the same reasoning as the theme store, and
 * the same storage.
 *
 * Only explicit choices are kept. A category the user never styled is absent
 * rather than stored with its computed colour, which is what lets the hashing
 * fallback in `@/lib/labels` stay the single source of that answer. Writing
 * the fallback in would freeze today's palette into the user's saved data.
 */
export const useLabelStore = create<LabelState>()(
  persist(
    (set) => ({
      categories: {},
      tags: {},

      setCategoryStyle: (name, style) =>
        set((prev) => ({ categories: { ...prev.categories, [name]: style } })),

      setTagColor: (name, color) => set((prev) => ({ tags: { ...prev.tags, [name]: color } })),

      forgetCategory: (name) =>
        set((prev) => {
          const { [name]: _removed, ...rest } = prev.categories
          return { categories: rest }
        }),

      forgetTag: (name) =>
        set((prev) => {
          const { [name]: _removed, ...rest } = prev.tags
          return { tags: rest }
        }),

      reset: () => set({ categories: {}, tags: {} }),
    }),
    { name: 'rigseed.labels' },
  ),
)

/**
 * The styling for a category, chosen or derived.
 *
 * Every caller goes through this rather than reading the record, so the
 * fallback cannot be forgotten at one call site and produce a category that
 * renders grey next to seven coloured ones.
 */
export function categoryStyle(state: LabelState, name: string): CategoryStyle {
  return state.categories[name] ?? { icon: DEFAULT_CATEGORY_ICON, color: swatchFor(name) }
}

export function tagColor(state: LabelState, name: string): SwatchKey {
  return state.tags[name] ?? swatchFor(name)
}
