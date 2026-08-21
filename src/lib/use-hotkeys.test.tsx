import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { nextIndex, useHotkeys, type Hotkey } from '@/lib/use-hotkeys'

function Harness({ bindings, enabled }: { bindings: readonly Hotkey[]; enabled?: boolean }) {
  useHotkeys(bindings, enabled)
  return (
    <div>
      <input aria-label="Filter" />
      <button type="button">Somewhere to focus</button>
    </div>
  )
}

describe('useHotkeys', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  it('runs a plain key', async () => {
    const run = vi.fn()
    render(<Harness bindings={[{ key: 'Delete', run }]} />)
    await userEvent.keyboard('{Delete}')
    expect(run).toHaveBeenCalledOnce()
  })

  it('matches the key whatever case it arrives in', async () => {
    const run = vi.fn()
    render(<Harness bindings={[{ key: 'a', mod: true, run }]} />)
    // Shift is not required, but a keyboard with caps lock on still sends "A".
    await userEvent.keyboard('{Control>}A{/Control}')
    expect(run).toHaveBeenCalledOnce()
  })

  it('will not fire a modifier binding without the modifier', async () => {
    const run = vi.fn()
    render(<Harness bindings={[{ key: 'a', mod: true, run }]} />)
    await userEvent.keyboard('a')
    expect(run).not.toHaveBeenCalled()
  })

  it('will not fire a plain binding when a modifier is held', async () => {
    // Otherwise Ctrl+A, a select-all, would also trigger the bare "a" binding.
    const run = vi.fn()
    render(<Harness bindings={[{ key: 'a', run }]} />)
    await userEvent.keyboard('{Control>}a{/Control}')
    expect(run).not.toHaveBeenCalled()
  })

  it('accepts Cmd as well as Ctrl', async () => {
    const run = vi.fn()
    render(<Harness bindings={[{ key: 'a', mod: true, run }]} />)
    await userEvent.keyboard('{Meta>}a{/Meta}')
    expect(run).toHaveBeenCalledOnce()
  })

  it('stays out of the way while somebody is typing', async () => {
    // The whole reason this guard exists: Space would pause every download
    // mid-word, and "/" could not be typed into a path at all.
    const run = vi.fn()
    render(<Harness bindings={[{ key: ' ', run }]} />)
    await userEvent.click(screen.getByLabelText('Filter'))
    await userEvent.keyboard(' ')
    expect(run).not.toHaveBeenCalled()
  })

  it('fires in a field when the binding asks to', async () => {
    const run = vi.fn()
    render(<Harness bindings={[{ key: 'Escape', inFields: true, run }]} />)
    await userEvent.click(screen.getByLabelText('Filter'))
    await userEvent.keyboard('{Escape}')
    expect(run).toHaveBeenCalledOnce()
  })

  it('goes quiet while a dialog is open', async () => {
    // A dialog makes the rest of the app inert. Delete behind one would stack
    // a second confirmation on the first.
    const run = vi.fn()
    render(<Harness bindings={[{ key: 'Delete', run }]} />)
    const dialog = document.createElement('div')
    dialog.setAttribute('role', 'dialog')
    document.body.appendChild(dialog)
    await userEvent.keyboard('{Delete}')
    expect(run).not.toHaveBeenCalled()
  })

  it('does nothing at all when disabled', async () => {
    const run = vi.fn()
    render(<Harness bindings={[{ key: 'Delete', run }]} enabled={false} />)
    await userEvent.keyboard('{Delete}')
    expect(run).not.toHaveBeenCalled()
  })

  it('leaves unbound keys to the browser', async () => {
    // preventDefault runs only after a match. Calling it up front would break
    // text editing everywhere.
    const run = vi.fn()
    render(<Harness bindings={[{ key: 'Delete', run }]} />)
    await userEvent.click(screen.getByLabelText('Filter'))
    await userEvent.keyboard('hello')
    expect(screen.getByLabelText('Filter')).toHaveValue('hello')
  })

  it('runs only the first match, not every one', async () => {
    const first = vi.fn()
    const second = vi.fn()
    render(
      <Harness
        bindings={[
          { key: 'Delete', run: first },
          { key: 'Delete', run: second },
        ]}
      />,
    )
    await userEvent.keyboard('{Delete}')
    expect(first).toHaveBeenCalledOnce()
    expect(second).not.toHaveBeenCalled()
  })

  it('uses the newest binding without rebinding the listener', async () => {
    // Bindings close over the current selection, so a caller passes a fresh
    // array every render. A stale closure here acts on last render's rows.
    const stale = vi.fn()
    const fresh = vi.fn()
    const { rerender } = render(<Harness bindings={[{ key: 'Delete', run: stale }]} />)
    rerender(<Harness bindings={[{ key: 'Delete', run: fresh }]} />)
    await userEvent.keyboard('{Delete}')
    expect(stale).not.toHaveBeenCalled()
    expect(fresh).toHaveBeenCalledOnce()
  })
})

describe('nextIndex', () => {
  it('moves by one', () => {
    expect(nextIndex(1, 1, 5)).toBe(2)
    expect(nextIndex(1, -1, 5)).toBe(0)
  })

  it('clamps rather than wrapping', () => {
    // The list changes under the user between polls, so a wrap from last to
    // first reads as the selection jumping on its own.
    expect(nextIndex(4, 1, 5)).toBe(4)
    expect(nextIndex(0, -1, 5)).toBe(0)
  })

  it('starts at an end when the cursor is not in the list', () => {
    // The selected torrent was removed while the list was open.
    expect(nextIndex(-1, 1, 5)).toBe(0)
    expect(nextIndex(-1, -1, 5)).toBe(4)
  })

  it('has nowhere to go in an empty list', () => {
    expect(nextIndex(-1, 1, 0)).toBe(-1)
    expect(nextIndex(2, 1, 0)).toBe(-1)
  })
})
