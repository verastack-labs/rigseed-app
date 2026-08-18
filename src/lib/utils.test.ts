import { describe, expect, it } from 'vitest'

import { cn } from '@/lib/utils'

describe('cn', () => {
  it('joins class names', () => {
    expect(cn('a', 'b')).toBe('a b')
  })

  it('drops falsy values', () => {
    const isActive = false as boolean
    expect(cn('a', isActive && 'b', undefined, 'c')).toBe('a c')
  })

  it('lets a later tailwind utility win over an earlier conflicting one', () => {
    expect(cn('p-2', 'p-4')).toBe('p-4')
  })

  it('recognises the rigseed colour names from the theme inline block', () => {
    // If tailwind-merge did not know these are the same utility group, it would
    // return both classes. This is what proves the custom palette is wired up.
    expect(cn('bg-surface', 'bg-surface2')).toBe('bg-surface2')
    expect(cn('text-text-dim', 'text-accent')).toBe('text-accent')
  })
})
