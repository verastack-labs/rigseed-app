import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { Textarea } from '@/components/ui/textarea'

describe('Textarea', () => {
  it('uses mono only when asked, since the split is semantic', () => {
    const { rerender } = render(<Textarea aria-label="Notes" />)
    expect(screen.getByLabelText('Notes').className).toContain('font-sans')
    rerender(<Textarea mono aria-label="Magnet links" />)
    expect(screen.getByLabelText('Magnet links').className).toContain('font-mono')
  })

  it('marks itself invalid for assistive tech, not just visually', () => {
    render(<Textarea invalid aria-label="Magnet links" />)
    expect(screen.getByLabelText('Magnet links')).toHaveAttribute('aria-invalid', 'true')
  })

  it('omits aria-invalid when valid', () => {
    render(<Textarea aria-label="Magnet links" />)
    expect(screen.getByLabelText('Magnet links')).not.toHaveAttribute('aria-invalid')
  })

  it('cannot be dragged taller', () => {
    // The magnet box sits inside a fixed-height modal. A user-resizable field
    // there pushes the footer, and its add button, out of reach.
    render(<Textarea aria-label="Magnet links" />)
    expect(screen.getByLabelText('Magnet links').className).toContain('resize-none')
  })

  it('passes rows and value through', () => {
    render(<Textarea aria-label="Magnet links" rows={4} value="magnet:?xt=1" readOnly />)
    const field = screen.getByLabelText('Magnet links')
    expect(field).toHaveAttribute('rows', '4')
    expect(field).toHaveValue('magnet:?xt=1')
  })
})
