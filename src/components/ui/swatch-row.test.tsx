import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { SwatchRow } from '@/components/ui/swatch-row'
import { SWATCHES } from '@/lib/labels'

describe('SwatchRow', () => {
  it('is a radiogroup with one checked option', () => {
    render(<SwatchRow value="sage" onChange={vi.fn()} label="Category colour" />)

    const group = screen.getByRole('radiogroup', { name: 'Category colour' })
    expect(group).toBeInTheDocument()
    expect(screen.getAllByRole('radio')).toHaveLength(SWATCHES.length)
    expect(screen.getByRole('radio', { name: 'Sage' })).toBeChecked()
  })

  it('names each swatch by its colour, not by its position', () => {
    // A swatch carries no text. "Colour 3" is an inventory; "Sage" is a list.
    render(<SwatchRow value="blue" onChange={vi.fn()} label="Tag colour" />)
    for (const swatch of SWATCHES) {
      expect(screen.getByRole('radio', { name: swatch.label })).toBeInTheDocument()
    }
  })

  it('reports the key, never a hex', () => {
    const onChange = vi.fn()
    render(<SwatchRow value="blue" onChange={onChange} label="Tag colour" />)

    fireEvent.click(screen.getByRole('radio', { name: 'Mustard' }))
    expect(onChange).toHaveBeenCalledWith('mustard')
  })

  it('puts only the chosen swatch in the tab order', () => {
    // Otherwise a colour picker is eight tab stops on the way to the next
    // field. Tab reaches the group, arrows move within it.
    render(<SwatchRow value="teal" onChange={vi.fn()} label="Tag colour" />)

    expect(screen.getByRole('radio', { name: 'Slate Teal' })).toHaveAttribute('tabindex', '0')
    expect(screen.getByRole('radio', { name: 'Sage' })).toHaveAttribute('tabindex', '-1')
  })

  it('moves with the arrow keys and wraps at both ends', () => {
    const onChange = vi.fn()
    const first = SWATCHES[0]!
    const last = SWATCHES[SWATCHES.length - 1]!

    const { rerender } = render(
      <SwatchRow value={first.key} onChange={onChange} label="Tag colour" />,
    )

    fireEvent.keyDown(screen.getByRole('radio', { name: first.label }), { key: 'ArrowLeft' })
    expect(onChange).toHaveBeenLastCalledWith(last.key)

    rerender(<SwatchRow value={last.key} onChange={onChange} label="Tag colour" />)
    fireEvent.keyDown(screen.getByRole('radio', { name: last.label }), { key: 'ArrowRight' })
    expect(onChange).toHaveBeenLastCalledWith(first.key)
  })

  it('ignores keys that are not arrows', () => {
    const onChange = vi.fn()
    render(<SwatchRow value="sage" onChange={onChange} label="Tag colour" />)

    fireEvent.keyDown(screen.getByRole('radio', { name: 'Sage' }), { key: 'a' })
    expect(onChange).not.toHaveBeenCalled()
  })
})
