import { describe, expect, it } from 'vitest'

import { SWATCHES, SWATCH_KEYS, swatchColor, swatchFor } from '@/lib/labels'

describe('label colours', () => {
  it('gives the same name the same colour every time', () => {
    // The point of hashing rather than assigning by index: a category keeps
    // its colour across reloads, and across machines, with nothing persisted.
    expect(swatchFor('Linux')).toBe(swatchFor('Linux'))
    expect(swatchFor('Film')).toBe(swatchFor('Film'))
  })

  it('spreads a realistic set of names across the palette', () => {
    const names = ['Linux', 'Film', 'Archives', 'Books', 'Music', 'Software', 'Games', 'Docs']
    const used = new Set(names.map(swatchFor))
    // Not a guarantee of no collisions, which a hash cannot make. A guarantee
    // that it is not degenerate: everything landing on one colour would make
    // the whole affordance pointless and would still pass a stability test.
    expect(used.size).toBeGreaterThanOrEqual(4)
  })

  it('only ever returns a key that exists', () => {
    for (const name of ['', 'a', 'zzzzzzzzzzzzzzzzzzzzzzzzz', '日本語', '/downloads/x']) {
      expect(SWATCH_KEYS).toContain(swatchFor(name))
    }
  })

  it('resolves a key to a token, not a hex', () => {
    // A stored hex would be a dark-mode hex sitting on a light-mode surface.
    // The token is defined per mode, so the stored key survives the switch.
    expect(swatchColor('sage')).toBe('var(--swatch-sage)')
  })

  it('labels every key exactly once', () => {
    expect(SWATCHES.map((s) => s.key)).toEqual([...SWATCH_KEYS])
    expect(new Set(SWATCHES.map((s) => s.label)).size).toBe(SWATCHES.length)
  })
})
