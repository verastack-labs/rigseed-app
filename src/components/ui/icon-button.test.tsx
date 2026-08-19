import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { IconButton } from '@/components/ui/icon-button'

describe('IconButton', () => {
  it('uses title as both the tooltip and the accessible name', () => {
    render(<IconButton title="Open settings" />)
    const button = screen.getByRole('button', { name: 'Open settings' })
    expect(button).toHaveAttribute('title', 'Open settings')
  })

  it('claims to be a toggle only when given an active state', () => {
    // A plain action button is not a toggle, so it must not carry aria-pressed
    // at all. Only a control with a real on/off state should.
    const { rerender } = render(<IconButton title="Open settings" />)
    expect(screen.getByRole('button')).not.toHaveAttribute('aria-pressed')

    rerender(<IconButton title="Follow" active={false} />)
    expect(screen.getByRole('button')).toHaveAttribute('aria-pressed', 'false')

    rerender(<IconButton title="Follow" active />)
    expect(screen.getByRole('button')).toHaveAttribute('aria-pressed', 'true')
  })

  it('takes the accent treatment only when active', () => {
    const { rerender } = render(<IconButton title="Follow" />)
    expect(screen.getByRole('button').className).toContain('bg-surface2')
    rerender(<IconButton title="Follow" active />)
    expect(screen.getByRole('button').className).toContain('bg-accent-soft')
  })
})
