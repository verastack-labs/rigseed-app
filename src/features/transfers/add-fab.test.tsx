import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { AddFab } from '@/features/transfers/add-fab'

const button = () => screen.getByRole('button', { name: 'Add torrent' })
const glyph = () => button().querySelector('svg')!

describe('AddFab', () => {
  it('shows a plus when closed and a cross when open', () => {
    // These were the wrong way round. A 45 degree rotation turns a plus into a
    // cross, so the closed button offered to close something that was not
    // open; and 135 degrees is 45 plus a quarter turn, which put it back to a
    // plus exactly when it should have been a cross.
    render(<AddFab onSelect={vi.fn()} />)

    expect(glyph().getAttribute('class')).toContain('rotate-0')
    expect(glyph().getAttribute('class')).not.toContain('rotate-45')

    fireEvent.click(button())
    expect(glyph().getAttribute('class')).toContain('rotate-45')
  })

  it('reports whether it is open, for anything not looking at the glyph', () => {
    render(<AddFab onSelect={vi.fn()} />)
    expect(button()).toHaveAttribute('aria-expanded', 'false')

    fireEvent.click(button())
    expect(button()).toHaveAttribute('aria-expanded', 'true')
  })

  it('dims the rest of the app while it is open', () => {
    // A menu that leaves the page fully lit does not look like it is waiting
    // for an answer. Same treatment the nav rail uses when it expands.
    const { container } = render(<AddFab onSelect={vi.fn()} />)
    const scrim = () => container.querySelector('[role="presentation"]')

    expect(scrim()).toBeNull()
    fireEvent.click(button())
    expect(scrim()).not.toBeNull()
  })

  it('closes when the dimmed area is clicked', () => {
    const { container } = render(<AddFab onSelect={vi.fn()} />)
    fireEvent.click(button())

    fireEvent.click(container.querySelector('[role="presentation"]')!)
    expect(button()).toHaveAttribute('aria-expanded', 'false')
  })

  it('closes on Escape, per the keyboard map', () => {
    render(<AddFab onSelect={vi.fn()} />)
    fireEvent.click(button())

    fireEvent.keyDown(button(), { key: 'Escape' })
    expect(button()).toHaveAttribute('aria-expanded', 'false')
  })

  it('offers the four ways in', () => {
    render(<AddFab onSelect={vi.fn()} />)
    fireEvent.click(button())

    for (const label of ['Create torrent', 'From URL', 'Add magnet link', 'Add torrent file']) {
      expect(screen.getByRole('button', { name: label })).toBeInTheDocument()
    }
  })

  it('passes the chosen source up', () => {
    const onSelect = vi.fn()
    render(<AddFab onSelect={onSelect} />)
    fireEvent.click(button())
    fireEvent.click(screen.getByRole('button', { name: 'Add magnet link' }))

    expect(onSelect).toHaveBeenCalledWith('magnet')
  })
})
