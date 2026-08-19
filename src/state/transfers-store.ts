import { create } from 'zustand'

import type { Layout } from '@/state/theme-store'

export type StatusFilter =
  'all' | 'downloading' | 'seeding' | 'completed' | 'paused' | 'active' | 'stalled'

interface TransfersState {
  status: StatusFilter
  category: string | null
  tag: string | null
  query: string
  layout: Layout | null
  selected: readonly string[]

  setStatus: (status: StatusFilter) => void
  setCategory: (category: string | null) => void
  setTag: (tag: string | null) => void
  setQuery: (query: string) => void
  setLayout: (layout: Layout) => void
  toggleSelected: (hash: string) => void
  selectOnly: (hashes: readonly string[]) => void
  clearSelection: () => void
  clearFilters: () => void
}

/**
 * Screen state for Transfers, separate from the torrent data.
 *
 * Kept apart from the torrent store on purpose: this changes when the user
 * clicks, that changes once a second. Merging them would re-render the filter
 * sidebar on every poll.
 *
 * `layout` is null until the user picks one on this screen, at which point the
 * first-run default from the theme store applies.
 */
export const useTransfersStore = create<TransfersState>()((set) => ({
  status: 'all',
  category: null,
  tag: null,
  query: '',
  layout: null,
  selected: [],

  setStatus: (status) => set({ status }),
  setCategory: (category) => set({ category }),
  setTag: (tag) => set({ tag }),
  setQuery: (query) => set({ query }),
  setLayout: (layout) => set({ layout }),

  toggleSelected: (hash) =>
    set((s) => ({
      selected: s.selected.includes(hash)
        ? s.selected.filter((h) => h !== hash)
        : [...s.selected, hash],
    })),
  selectOnly: (hashes) => set({ selected: [...hashes] }),
  clearSelection: () => set({ selected: [] }),
  clearFilters: () => set({ status: 'all', category: null, tag: null, query: '' }),
}))

/** True when anything other than the default status filter is applied. */
export const hasActiveFilters = (s: TransfersState) =>
  s.status !== 'all' || s.category !== null || s.tag !== null || s.query.trim() !== ''
