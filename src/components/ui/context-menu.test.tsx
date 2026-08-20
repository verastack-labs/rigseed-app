import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { ContextMenu, type ContextMenuItem } from '@/components/ui/context-menu'

const items: ContextMenuItem[] = [
  { label: 'Resume' },
  { label: 'Pause' },
  { separator: true },
  { label: 'Remove', danger: true },
]

afterEach(() => vi.restoreAllMocks())

describe('ContextMenu', () => {
  it('renders nothing while closed', () => {
    render(<ContextMenu items={items} open={false} onClose={vi.fn()} />)
    expect(screen.queryByRole('menu')).toBeNull()
  })

  it('exposes a menu with one menuitem per action', () => {
    render(<ContextMenu items={items} open onClose={vi.fn()} label="Ubuntu ISO" />)
    expect(screen.getByRole('menu', { name: 'Ubuntu ISO' })).toBeInTheDocument()
    expect(screen.getAllByRole('menuitem')).toHaveLength(3)
    expect(screen.getByRole('separator')).toBeInTheDocument()
  })

  it('runs the action and then closes', async () => {
    const onSelect = vi.fn()
    const onClose = vi.fn()
    render(
      <ContextMenu items={[{ label: 'Pause', onSelect }]} open onClose={onClose} />,
    )
    await userEvent.click(screen.getByRole('menuitem', { name: 'Pause' }))
    expect(onSelect).toHaveBeenCalledOnce()
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('closes on an outside click', async () => {
    const onClose = vi.fn()
    render(
      <div>
        <button type="button">elsewhere</button>
        <ContextMenu items={items} open onClose={onClose} />
      </div>,
    )
    await userEvent.click(screen.getByRole('button', { name: 'elsewhere' }))
    expect(onClose).toHaveBeenCalled()
  })

  it('survives the press that opened it', async () => {
    // The bug this exists for. React flushed the effect that registers the
    // outside listener while the opening click was still bubbling, so a
    // `click` listener heard that click and closed the menu immediately. The
    // three-dot button looked dead in the real app while a scripted .click()
    // in a browser worked, because only real pointer input orders the phases
    // that way. Listening for `pointerdown` means the opening press is
    // already over by the time anything is listening.
    const onClose = vi.fn()
    const anchor = { current: document.createElement('div') }
    document.body.appendChild(anchor.current)
    render(<ContextMenu items={items} open onClose={onClose} anchorRef={anchor} />)

    // The press that a trigger inside the anchor would have produced.
    fireEvent.pointerDown(anchor.current)
    expect(onClose).not.toHaveBeenCalled()
  })

  it('closes on a press outside the anchor', () => {
    const onClose = vi.fn()
    const anchor = { current: document.createElement('div') }
    document.body.appendChild(anchor.current)
    render(<ContextMenu items={items} open onClose={onClose} anchorRef={anchor} />)

    fireEvent.pointerDown(document.body)
    expect(onClose).toHaveBeenCalled()
  })

  it('does not close on a click inside itself', async () => {
    const onClose = vi.fn()
    render(<ContextMenu items={items} open onClose={onClose} />)
    await userEvent.click(screen.getByRole('menu'))
    expect(onClose).not.toHaveBeenCalled()
  })

  describe('keyboard', () => {
    it('focuses the first item on open', () => {
      render(<ContextMenu items={items} open onClose={vi.fn()} />)
      expect(screen.getByRole('menuitem', { name: 'Resume' })).toHaveFocus()
    })

    it('closes on Escape', async () => {
      const onClose = vi.fn()
      render(<ContextMenu items={items} open onClose={onClose} />)
      await userEvent.keyboard('{Escape}')
      expect(onClose).toHaveBeenCalledOnce()
    })

    it('moves down and wraps to the top', async () => {
      render(<ContextMenu items={items} open onClose={vi.fn()} />)
      await userEvent.keyboard('{ArrowDown}')
      expect(screen.getByRole('menuitem', { name: 'Pause' })).toHaveFocus()
      await userEvent.keyboard('{ArrowDown}{ArrowDown}')
      expect(screen.getByRole('menuitem', { name: 'Resume' })).toHaveFocus()
    })

    it('moves up and wraps to the bottom', async () => {
      render(<ContextMenu items={items} open onClose={vi.fn()} />)
      await userEvent.keyboard('{ArrowUp}')
      expect(screen.getByRole('menuitem', { name: 'Remove' })).toHaveFocus()
    })

    it('skips separators when moving', async () => {
      render(<ContextMenu items={items} open onClose={vi.fn()} />)
      await userEvent.keyboard('{ArrowDown}{ArrowDown}')
      // Pause then Remove. The separator between them is not focusable.
      expect(screen.getByRole('menuitem', { name: 'Remove' })).toHaveFocus()
    })

    it('jumps to the ends with Home and End', async () => {
      render(<ContextMenu items={items} open onClose={vi.fn()} />)
      await userEvent.keyboard('{End}')
      expect(screen.getByRole('menuitem', { name: 'Remove' })).toHaveFocus()
      await userEvent.keyboard('{Home}')
      expect(screen.getByRole('menuitem', { name: 'Resume' })).toHaveFocus()
    })

    it('dismisses on Tab rather than cycling inside itself', async () => {
      const onClose = vi.fn()
      render(<ContextMenu items={items} open onClose={onClose} />)
      await userEvent.keyboard('{Tab}')
      expect(onClose).toHaveBeenCalled()
    })

    it('hands focus back to the trigger on close', () => {
      // The tree has to stay stable across the rerender. Swapping the root
      // element type would remount the trigger, and the restored focus would
      // land on a detached node.
      function Harness({ open }: { open: boolean }) {
        return (
          <div>
            <button type="button" data-testid="trigger">
              open
            </button>
            <ContextMenu items={items} open={open} onClose={() => {}} />
          </div>
        )
      }

      const { rerender } = render(<Harness open={false} />)
      const trigger = screen.getByTestId('trigger')
      trigger.focus()
      expect(trigger).toHaveFocus()

      rerender(<Harness open />)
      expect(screen.getByRole('menuitem', { name: 'Resume' })).toHaveFocus()

      rerender(<Harness open={false} />)
      expect(trigger).toHaveFocus()
    })
  })

  describe('flip', () => {
    it('opens below when there is room', () => {
      render(<ContextMenu items={items} open onClose={vi.fn()} />)
      expect(screen.getByRole('menu').className).toContain('top-[calc(100%+8px)]')
    })

    it('flips above when it would run off the bottom', () => {
      vi.spyOn(Element.prototype, 'getBoundingClientRect').mockReturnValue({
        bottom: window.innerHeight + 40,
        height: 160,
      } as DOMRect)
      render(<ContextMenu items={items} open onClose={vi.fn()} />)
      expect(screen.getByRole('menu').className).toContain('bottom-[calc(100%+8px)]')
    })

    it('lets an explicit above win over the measurement', () => {
      vi.spyOn(Element.prototype, 'getBoundingClientRect').mockReturnValue({
        bottom: window.innerHeight + 40,
        height: 160,
      } as DOMRect)
      render(<ContextMenu items={items} open onClose={vi.fn()} above={false} />)
      expect(screen.getByRole('menu').className).toContain('top-[calc(100%+8px)]')
    })
  })

  describe('opened at a point', () => {
    it('positions itself at the pointer instead of under a trigger', () => {
      vi.spyOn(Element.prototype, 'getBoundingClientRect').mockReturnValue({ height: 160 } as DOMRect)
      render(<ContextMenu items={items} open onClose={vi.fn()} at={{ x: 120, y: 90 }} />)
      const menu = screen.getByRole('menu')
      expect(menu.className).toContain('fixed')
      expect(menu.className).not.toContain('absolute')
      expect(menu.style.left).toBe('120px')
      expect(menu.style.top).toBe('90px')
    })

    it('clamps to the right edge rather than opening off screen', () => {
      vi.spyOn(Element.prototype, 'getBoundingClientRect').mockReturnValue({ height: 100 } as DOMRect)
      render(<ContextMenu items={items} open onClose={vi.fn()} at={{ x: window.innerWidth - 4, y: 20 }} />)
      // 224 wide, 8px from the edge. A menu that opens past the window is a
      // menu with items nobody can reach.
      expect(screen.getByRole('menu').style.left).toBe(`${window.innerWidth - 224 - 8}px`)
    })

    it('opens upward when there is no room below the pointer', () => {
      vi.spyOn(Element.prototype, 'getBoundingClientRect').mockReturnValue({ height: 160 } as DOMRect)
      const y = window.innerHeight - 20
      render(<ContextMenu items={items} open onClose={vi.fn()} at={{ x: 10, y }} />)
      expect(screen.getByRole('menu').style.top).toBe(`${y - 160}px`)
    })

    it('keeps the anchored classes off when it is placed at a point', () => {
      vi.spyOn(Element.prototype, 'getBoundingClientRect').mockReturnValue({ height: 20 } as DOMRect)
      render(<ContextMenu items={items} open onClose={vi.fn()} at={{ x: 10, y: 10 }} />)
      const menu = screen.getByRole('menu')
      expect(menu.className).not.toContain('top-[calc(100%+8px)]')
      expect(menu.className).not.toContain('bottom-[calc(100%+8px)]')
    })
  })

  it('uses the danger colour rather than the accent for destructive items', () => {
    render(<ContextMenu items={items} open onClose={vi.fn()} />)
    const remove = screen.getByRole('menuitem', { name: 'Remove' })
    expect(remove.className).toContain('text-danger')
    expect(remove.className).not.toContain('text-accent')
  })

  it('lifts above neighbouring cards', () => {
    render(<ContextMenu items={items} open onClose={vi.fn()} />)
    expect(screen.getByRole('menu').className).toContain('z-30')
  })
})
