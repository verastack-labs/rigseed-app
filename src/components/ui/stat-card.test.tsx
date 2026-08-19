import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { StatCard } from '@/components/ui/stat-card'

describe('StatCard', () => {
  it('renders the label as an uppercase eyebrow', () => {
    render(<StatCard label="Ratio" value="1.42" />)
    expect(screen.getByText('Ratio').className).toContain('uppercase')
  })

  it('renders the value in mono with tabular figures', () => {
    render(<StatCard label="Ratio" value="1.42" />)
    const el = screen.getByText('1.42')
    expect(el.className).toContain('font-mono')
    expect(el.className).toContain('tabular-nums')
  })

  it('omits the sub line when there is none', () => {
    const { container, rerender } = render(<StatCard label="Ratio" value="1.42" />)
    expect(container.querySelectorAll('span')).toHaveLength(2)
    rerender(<StatCard label="Ratio" value="1.42" sub="target 2.00" />)
    expect(screen.getByText('target 2.00')).toBeInTheDocument()
  })

  it('tones the value without touching the label', () => {
    render(<StatCard label="Down" value="12.4 MB/s" tone="accent" />)
    expect(screen.getByText('12.4 MB/s').className).toContain('text-accent')
  })
})
