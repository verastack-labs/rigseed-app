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

describe('cn with the rigseed theme scales', () => {
  it('lets a custom radius displace a stock one', () => {
    expect(cn('rounded-lg', 'rounded-chip')).toBe('rounded-chip')
    expect(cn('rounded-chip', 'rounded-lg')).toBe('rounded-lg')
  })

  it('lets a custom easing displace another', () => {
    expect(cn('ease-spring', 'ease-panel-reveal')).toBe('ease-panel-reveal')
  })

  it('lets a custom duration displace another', () => {
    expect(cn('duration-fast', 'duration-spring')).toBe('duration-spring')
  })
})
