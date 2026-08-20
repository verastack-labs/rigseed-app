import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { Disclosure } from '@/components/ui/disclosure'

const at = (props: Partial<React.ComponentProps<typeof Disclosure>> = {}) =>
  render(
    <Disclosure title="Categories" {...props}>
      <span>Movies</span>
    </Disclosure>,
  )

describe('Disclosure', () => {
  it('starts open, because a filter list is worth reading', () => {
    at()
    expect(screen.getByText('Movies')).toBeInTheDocument()
    expect(screen.getByRole('button')).toHaveAttribute('aria-expanded', 'true')
  })

  it('folds away and comes back', () => {
    at()
    fireEvent.click(screen.getByRole('button'))
    expect(screen.queryByText('Movies')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button'))
    expect(screen.getByText('Movies')).toBeInTheDocument()
  })

  it('can start closed when asked', () => {
    at({ defaultOpen: false })
    expect(screen.queryByText('Movies')).not.toBeInTheDocument()
  })

  it('makes the whole header the control, not the chevron', () => {
    // A 12px glyph is a target people miss, and the title is what they are
    // aiming at anyway.
    at()
    expect(screen.getByRole('button')).toHaveTextContent('Categories')
  })

  it('shows how many rows are inside', () => {
    at({ count: 7 })
    expect(screen.getByText('7')).toBeInTheDocument()
  })
})
