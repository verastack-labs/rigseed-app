import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { Input } from '@/components/ui/input'

describe('Input', () => {
  it('uses mono only when asked, since the split is semantic', () => {
    const { rerender } = render(<Input aria-label="Name" />)
    expect(screen.getByLabelText('Name').className).toContain('font-sans')
    rerender(<Input mono aria-label="Save path" />)
    expect(screen.getByLabelText('Save path').className).toContain('font-mono')
  })

  it('marks itself invalid for assistive tech, not just visually', () => {
    render(<Input invalid aria-label="Port" />)
    expect(screen.getByLabelText('Port')).toHaveAttribute('aria-invalid', 'true')
  })

  it('omits aria-invalid when valid', () => {
    render(<Input aria-label="Port" />)
    expect(screen.getByLabelText('Port')).not.toHaveAttribute('aria-invalid')
  })

  it('renders the unit label beside the field', () => {
    render(<Input unit="KiB/s" aria-label="Limit" />)
    expect(screen.getByText('KiB/s')).toBeInTheDocument()
  })
})
