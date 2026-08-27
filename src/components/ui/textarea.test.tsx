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
    render(<Textarea aria-label="Magnet links" />)
    const field = screen.getByLabelText('Magnet links')
    expect(field.className).toContain('rs-inner-field')
    expect(field.className).not.toContain('outline-none')

    const shell = field.closest('div')!
    expect(shell.className).toContain('focus-within:outline-accent')
  })

  it('fades the ring in rather than snapping it on', () => {
    // outline-style is not animatable, so a ring that only exists on focus
    // pops. This one is always present and transparent, and only its colour
    // changes, which is a property that can transition.
    render(<Textarea aria-label="Magnet links" />)
    const shell = screen.getByLabelText('Magnet links').closest('div')!
    expect(shell.className).toContain('outline-transparent')
    expect(shell.className).toContain('transition-colors')
  })
})
