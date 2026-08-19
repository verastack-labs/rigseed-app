import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { SectionHeader } from '@/components/ui/section-header'

describe('SectionHeader', () => {
  it('renders the uppercase eyebrow treatment', () => {
    render(<SectionHeader>Engines</SectionHeader>)
    const el = screen.getByText('Engines')
    expect(el.className).toContain('uppercase')
    expect(el.className).toContain('text-[10px]')
    expect(el.className).toContain('tracking-[0.08em]')
  })
})
