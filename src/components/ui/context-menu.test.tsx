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

  describe('where it renders', () => {
    /**
     * These used to assert Tailwind position classes and exact pixel offsets.
     * Both are gone: the positioner writes inline styles, and it derives them
     * from real element rects, which jsdom reports as all-zero. Asserting
     * pixels here would have meant asserting the mock rather than the layout.
     *
     * What is worth pinning in jsdom is the structural half of the fix, which
     * is the half that was actually broken. The pixel behaviour is checked by
     * driving the real window instead, and the numbers from that run are in
     * the component's own comments.
     */
    it('renders outside the trigger subtree, not inside it', () => {
      // The whole point. `<main>` carries `overflow-x: hidden`, so anything
      // positioned inside it is clipped no matter how well it is placed, and a
      // submenu on a right-hand card was cut off and widened the document.
      // Leaving the subtree is the only fix; better arithmetic is not one.
      const { container } = render(<ContextMenu items={items} open onClose={vi.fn()} />)
      const menu = screen.getByRole('menu')
      expect(container.contains(menu)).toBe(false)
      expect(document.body.contains(menu)).toBe(true)
    })

    it('places a submenu outside the menu it belongs to', () => {
      const withBranch: ContextMenuItem[] = [
        { label: 'Resume' },
        { label: 'Copy', items: [{ label: 'Name' }] },
      ]
      render(<ContextMenu items={withBranch} open onClose={vi.fn()} />)
      fireEvent.mouseEnter(screen.getByRole('menuitem', { name: /Copy/ }))
      const [root, branch] = screen.getAllByRole('menu')
      expect(root!.contains(branch!)).toBe(false)
    })

    it('takes its position from inline styles rather than anchored classes', () => {
      render(<ContextMenu items={items} open onClose={vi.fn()} />)
      const menu = screen.getByRole('menu')
      expect(menu.style.position).not.toBe('')
      expect(menu.className).not.toContain('top-[calc(100%+8px)]')
      expect(menu.className).not.toContain('bottom-[calc(100%+8px)]')
    })

    it('still applies the caller width', () => {
      render(<ContextMenu items={items} open onClose={vi.fn()} width={300} />)
      expect(screen.getByRole('menu').style.width).toBe('300px')
    })
  })

  it('uses the danger colour rather than the accent for destructive items', () => {
    render(<ContextMenu items={items} open onClose={vi.fn()} />)
    const remove = screen.getByRole('menuitem', { name: 'Remove' })
    expect(remove.className).toContain('text-danger')
    expect(remove.className).not.toContain('text-accent')
  })

  it('sits above the page chrome and below a modal', () => {
    /*
     * This asserted `z-30` before, which is the value that caused the bug it
     * now guards. Once both menus render through a portal they stack against
     * the whole app rather than against the card they came from, and the add
     * button's column is `z-40` with 164x268 of live pointer target in the
     * bottom-right corner. At `z-30` the menu lost to it: items over that
     * corner took no clicks and no hover, so a branch could not be opened.
     *
     * The upper bound matters just as much. Dialogs are `z-50` and modal, and
     * a context menu floating over one would be a menu the focus trap has
     * already excluded.
     */
    render(<ContextMenu items={items} open onClose={vi.fn()} />)
    // Read off the class, because jsdom loads no stylesheet and every computed
    // z-index there is empty. The number is the contract either way.
    const z = layerOf(screen.getByRole('menu').className)
    expect(z).toBeGreaterThan(40)
    expect(z).toBeLessThan(50)
  })
})

/** The z-index out of a Tailwind class, whether `z-30` or `z-[45]`. */
function layerOf(className: string): number {
  const match = /(?:^|\s)z-\[?(\d+)\]?(?:\s|$)/.exec(className)
  return match ? Number(match[1]) : NaN
}

describe('submenus', () => {
  const copy = vi.fn()
  const branch = (): ContextMenuItem[] => [
    { label: 'Resume' },
    {
      label: 'Copy',
      items: [
        { label: 'Name', onSelect: copy },
        { label: 'Magnet link' },
      ],
    },
    { label: 'Remove', danger: true },
  ]

  const openMenu = () => render(<ContextMenu items={branch()} open onClose={vi.fn()} />)

  it('keeps a branch shut until it is asked for', () => {
    openMenu()
    expect(screen.getByRole('menuitem', { name: /Copy/ })).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByRole('menuitem', { name: 'Name' })).not.toBeInTheDocument()
  })

  it('announces itself as opening something rather than doing something', () => {
    openMenu()
    expect(screen.getByRole('menuitem', { name: /Copy/ })).toHaveAttribute('aria-haspopup', 'menu')
  })

  it('opens on hover, which is what a desktop menu does', async () => {
    openMenu()
    await userEvent.hover(screen.getByRole('menuitem', { name: /Copy/ }))
    expect(screen.getByRole('menuitem', { name: 'Name' })).toBeInTheDocument()
  })

  it('opens on ArrowRight, which is what a keyboard expects', () => {
    openMenu()
    const trigger = screen.getByRole('menuitem', { name: /Copy/ })
    trigger.focus()
    fireEvent.keyDown(trigger, { key: 'ArrowRight' })
    expect(screen.getByRole('menuitem', { name: 'Name' })).toBeInTheDocument()
  })

  it('runs a child and closes the whole menu, not just the branch', async () => {
    const onClose = vi.fn()
    render(<ContextMenu items={branch()} open onClose={onClose} />)
    await userEvent.hover(screen.getByRole('menuitem', { name: /Copy/ }))
    await userEvent.click(screen.getByRole('menuitem', { name: 'Name' }))
    expect(copy).toHaveBeenCalledOnce()
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('ArrowLeft closes the branch and hands focus back to its row', () => {
    openMenu()
    const trigger = screen.getByRole('menuitem', { name: /Copy/ })
    trigger.focus()
    fireEvent.keyDown(trigger, { key: 'ArrowRight' })
    fireEvent.keyDown(screen.getByRole('menuitem', { name: 'Name' }), { key: 'ArrowLeft' })
    expect(screen.queryByRole('menuitem', { name: 'Name' })).not.toBeInTheDocument()
    expect(document.activeElement).toBe(trigger)
  })

  it('Escape inside a branch closes the branch, not the menu', () => {
    const onClose = vi.fn()
    render(<ContextMenu items={branch()} open onClose={onClose} />)
    const trigger = screen.getByRole('menuitem', { name: /Copy/ })
    trigger.focus()
    fireEvent.keyDown(trigger, { key: 'ArrowRight' })
    fireEvent.keyDown(screen.getByRole('menuitem', { name: 'Name' }), { key: 'Escape' })
    expect(screen.queryByRole('menuitem', { name: 'Name' })).not.toBeInTheDocument()
    expect(onClose).not.toHaveBeenCalled()
  })

  it('root arrows walk the root, not into an open branch', () => {
    // The regression this is really for. An open branch puts its own
    // menuitems inside the same subtree, so a plain query sweeps them into the
    // parent's navigation and the arrow keys walk out of the list they belong
    // to. Root rows are found by attribute for exactly this reason.
    openMenu()
    const trigger = screen.getByRole('menuitem', { name: /Copy/ })
    trigger.focus()
    fireEvent.keyDown(trigger, { key: 'ArrowRight' })
    expect(screen.getByRole('menuitem', { name: 'Name' })).toBeInTheDocument()

    const menu = screen.getAllByRole('menu')[0]!
    trigger.focus()
    fireEvent.keyDown(menu, { key: 'ArrowDown' })
    expect(document.activeElement).toBe(screen.getByRole('menuitem', { name: /Remove/ }))
  })
})
