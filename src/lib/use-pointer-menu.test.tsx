import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { usePointerMenu } from '@/lib/use-pointer-menu'

/**
 * The point semantics, tested where they live.
 *
 * They used to be asserted through the menu's CSS classes: the pointer case
 * rendered `fixed` and the anchored case `absolute`, so a test could tell them
 * apart by className. Positioning moved to a positioner that writes inline
 * styles from real element rects, and jsdom reports every rect as zero, so
 * that reading is gone and asserting pixels would only assert a mock.
 *
 * The behaviour is not gone, and it is this hook's, not the menu's: a right
 * click carries a point and pressing the button clears it. Testing it here
 * needs no layout at all.
 */
function Harness() {
  const { anchor, open, toggle, menuProps } = usePointerMenu()
  const at = 'at' in menuProps ? menuProps.at : undefined

  return (
    <div data-context-target data-testid="card">
      <div ref={anchor}>
        <button type="button" onClick={toggle}>
          Actions
        </button>
      </div>
      <output data-testid="state">{`${open ? 'open' : 'shut'} ${at ? `${at.x},${at.y}` : 'no point'}`}</output>
    </div>
  )
}

const state = () => screen.getByTestId('state').textContent

describe('usePointerMenu', () => {
  it('starts shut and with no point', () => {
    render(<Harness />)
    expect(state()).toBe('shut no point')
  })

  it('carries the pointer position from a right click', () => {
    // Without this the menu opens in the corner of the card, which is not
    // where anybody who just right-clicked is looking.
    render(<Harness />)
    fireEvent.contextMenu(screen.getByTestId('card'), { clientX: 120, clientY: 90 })
    expect(state()).toBe('open 120,90')
  })

  it('clears the point when the button opens it instead', () => {
    // The button wants the menu under itself, so a point left over from an
    // earlier right click would strand it wherever the mouse last was.
    render(<Harness />)
    fireEvent.contextMenu(screen.getByTestId('card'), { clientX: 120, clientY: 90 })
    fireEvent.click(screen.getByRole('button', { name: 'Actions' }))
    fireEvent.click(screen.getByRole('button', { name: 'Actions' }))
    expect(state()).toBe('open no point')
  })

  it('takes a second right click as a new position', () => {
    render(<Harness />)
    fireEvent.contextMenu(screen.getByTestId('card'), { clientX: 120, clientY: 90 })
    fireEvent.contextMenu(screen.getByTestId('card'), { clientX: 40, clientY: 300 })
    expect(state()).toBe('open 40,300')
  })

  it('drops the point on close, so the next open is not haunted by it', () => {
    render(<Harness />)
    fireEvent.contextMenu(screen.getByTestId('card'), { clientX: 120, clientY: 90 })
    // The button toggles shut from open, which is the close path a caller
    // reaches without going through onClose.
    fireEvent.click(screen.getByRole('button', { name: 'Actions' }))
    expect(state()).toBe('shut no point')
  })
})
