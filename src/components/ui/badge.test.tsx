import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { Badge } from '@/components/ui/badge'

describe('Badge', () => {
  it('is mono by default, because it usually carries a count', () => {
    render(<Badge>12</Badge>)
    expect(screen.getByText('12').className).toContain('font-mono')
  })

  it('switches to Inter when it carries a word', () => {
    render(<Badge mono={false}>Enabled</Badge>)
    expect(screen.getByText('Enabled').className).toContain('font-sans')
  })

  it('uses the danger tone rather than the accent for danger', () => {
    render(<Badge tone="danger">Error</Badge>)
    const cls = screen.getByText('Error').className
    expect(cls).toContain('text-danger')
    expect(cls).not.toContain('text-accent')
  })
})
