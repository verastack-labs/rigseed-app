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

  it('leaves the focus ring to the shell around it', () => {
    /*
     * One ring, and it belongs on the rounded box. The bare field has no
     * radius of its own, so when it drew the ring the result was a square
     * outline sitting inside a rounded border: two outlines around one
     * control, the inner one flush against the text.
     *
     * Asserted as a class because the mechanism is a class. `rs-inner-field`
     * is the hook the unlayered rule in tokens/base.css matches to stand
     * aside, and it looks removable to anyone tidying utilities, which is
     * exactly the edit this test exists to fail on. `outline-none` is what
     * used to be here and could never work: it is a layered utility against
     * an unlayered rule, so it lost whatever its specificity.
     */
    render(<Input aria-label="Save path" />)
    const field = screen.getByLabelText('Save path')
    expect(field.className).toContain('rs-inner-field')
    expect(field.className).not.toContain('outline-none')

    const shell = field.closest('div')!
    expect(shell.className).toContain('focus-within:outline-accent')
  })

  it('fades the ring in rather than snapping it on', () => {
    // outline-style is not animatable, so a ring that only exists on focus
    // pops. This one is always present and transparent, and only its colour
    // changes, which is a property that can transition.
    render(<Input aria-label="Save path" />)
    const shell = screen.getByLabelText('Save path').closest('div')!
    expect(shell.className).toContain('outline-transparent')
    expect(shell.className).toContain('transition-colors')
  })
})
