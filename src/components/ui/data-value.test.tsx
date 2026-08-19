import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { DataValue } from '@/components/ui/data-value'

describe('DataValue', () => {
  it('is always mono, since that is the rule it exists to enforce', () => {
    render(<DataValue>3.65 GB</DataValue>)
    expect(screen.getByText('3.65 GB').className).toContain('font-mono')
  })

  it('uses tabular figures so live values do not jitter between polls', () => {
    render(<DataValue>12.4 MB/s</DataValue>)
    expect(screen.getByText('12.4 MB/s').className).toContain('tabular-nums')
  })

  it('never wraps', () => {
    render(<DataValue>a1b2c3d4e5</DataValue>)
    expect(screen.getByText('a1b2c3d4e5').className).toContain('whitespace-nowrap')
  })

  it('carries the hero size for the detail percentage', () => {
    render(<DataValue size="hero">64%</DataValue>)
    expect(screen.getByText('64%').className).toContain('text-[40px]')
  })
})
