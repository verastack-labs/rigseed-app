import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'

const footer = (
  <>
    <Button>Cancel</Button>
    <Button variant="primary">Apply</Button>
  </>
)

describe('Dialog', () => {
  it('renders nothing while closed', () => {
    render(<Dialog open={false} onClose={vi.fn()} title="Remove torrent" />)
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('is a modal dialog with an accessible name', () => {
    render(<Dialog open onClose={vi.fn()} title="Remove torrent" />)
    const dialog = screen.getByRole('dialog', { name: 'Remove torrent' })
    expect(dialog).toHaveAttribute('aria-modal', 'true')
  })

  it('focuses the first control on open', () => {
    render(<Dialog open onClose={vi.fn()} title="Remove" footer={footer} />)
    expect(screen.getByRole('button', { name: 'Cancel' })).toHaveFocus()
  })

  it('closes on Escape', async () => {
    const onClose = vi.fn()
    render(<Dialog open onClose={onClose} title="Remove" footer={footer} />)
    await userEvent.keyboard('{Escape}')
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('closes when the scrim is clicked but not the card', async () => {
    const onClose = vi.fn()
    const { container } = render(<Dialog open onClose={onClose} title="Remove" footer={footer} />)
    await userEvent.click(screen.getByRole('dialog'))
    expect(onClose).not.toHaveBeenCalled()
    await userEvent.click(container.firstElementChild!)
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('traps Tab, unlike a menu', async () => {
    render(<Dialog open onClose={vi.fn()} title="Remove" footer={footer} />)
    const cancel = screen.getByRole('button', { name: 'Cancel' })
    const apply = screen.getByRole('button', { name: 'Apply' })

    expect(cancel).toHaveFocus()
    await userEvent.tab()
    expect(apply).toHaveFocus()
    await userEvent.tab()
    expect(cancel).toHaveFocus()
  })

  it('wraps backwards too', async () => {
    render(<Dialog open onClose={vi.fn()} title="Remove" footer={footer} />)
    await userEvent.tab({ shift: true })
    expect(screen.getByRole('button', { name: 'Apply' })).toHaveFocus()
  })

  it('hands focus back to the opener on close', () => {
    function Harness({ open }: { open: boolean }) {
      return (
        <div>
          <button type="button" data-testid="trigger">
            open
          </button>
          <Dialog open={open} onClose={vi.fn()} title="Remove" footer={footer} />
        </div>
      )
    }
    const { rerender } = render(<Harness open={false} />)
    const trigger = screen.getByTestId('trigger')
    trigger.focus()

    rerender(<Harness open />)
    expect(screen.getByRole('button', { name: 'Cancel' })).toHaveFocus()

    rerender(<Harness open={false} />)
    expect(trigger).toHaveFocus()
  })
})
