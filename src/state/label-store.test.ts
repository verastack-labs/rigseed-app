import { beforeEach, describe, expect, it } from 'vitest'

import { swatchFor } from '@/lib/labels'
import { categoryStyle, tagColor, useLabelStore } from '@/state/label-store'

const state = () => useLabelStore.getState()

describe('label store', () => {
  beforeEach(() => {
    state().reset()
    localStorage.clear()
  })

  it('falls back to the derived colour for a category nobody styled', () => {
    // Categories arrive from the daemon, including ones created by the stock
    // WebUI. Those must not render undecorated next to styled ones.
    expect(categoryStyle(state(), 'Linux')).toEqual({ icon: 'folder', color: swatchFor('Linux') })
  })

  it('prefers an explicit choice over the derived one', () => {
    state().setCategoryStyle('Linux', { icon: 'disc', color: 'teal' })
    expect(categoryStyle(state(), 'Linux')).toEqual({ icon: 'disc', color: 'teal' })
  })

  it('stores only what was chosen, never the fallback', () => {
    // Writing the computed colour in would freeze today's palette into the
    // user's saved data, so a later change to the hashing or the swatch list
    // would leave every old category on the old answer.
    categoryStyle(state(), 'Never Styled')
    tagColor(state(), 'never-styled')
    expect(state().categories).toEqual({})
    expect(state().tags).toEqual({})
  })

  it('keeps tags and categories in separate namespaces', () => {
    state().setTagColor('linux', 'rose')
    state().setCategoryStyle('linux', { icon: 'box', color: 'sage' })

    expect(tagColor(state(), 'linux')).toBe('rose')
    expect(categoryStyle(state(), 'linux').color).toBe('sage')
  })

  it('returns to the derived colour after forgetting a choice', () => {
    state().setTagColor('iso', 'clay')
    expect(tagColor(state(), 'iso')).toBe('clay')

    state().forgetTag('iso')
    expect(tagColor(state(), 'iso')).toBe(swatchFor('iso'))
    expect(state().tags).not.toHaveProperty('iso')
  })

  it('persists under its own key, not the appearance one', () => {
    state().setTagColor('verified', 'blue')
    expect(localStorage.getItem('rigseed.labels')).toContain('verified')
    // Nullish-coalesced because the appearance key legitimately does not exist
    // here: nothing in this test touched the theme.
    expect(localStorage.getItem('rigseed.appearance') ?? '').not.toContain('verified')
  })
})
