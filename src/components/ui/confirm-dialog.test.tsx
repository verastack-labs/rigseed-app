import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { ConfirmDialog } from '@/components/ui/confirm-dialog'

const base = {
  open: true,
  onCancel: vi.fn(),
  onConfirm: vi.fn(),
  title: 'Remove torrent',
  body: 'The torrent is removed from the list.',
}

describe('ConfirmDialog', () => {
  it('names the consequence in the body', () => {
    render(<ConfirmDialog {...base} onCancel={vi.fn()} onConfirm={vi.fn()} />)
    expect(screen.getByText('The torrent is removed from the list.')).toBeInTheDocument()
  })

  it('shows the target in mono', () => {
    render(
      <ConfirmDialog {...base} onCancel={vi.fn()} onConfirm={vi.fn()} target="ubuntu-24.04.iso" />,
    )
    expect(screen.getByText('ubuntu-24.04.iso').className).toContain('font-mono')
  })

  it('uses the danger button rather than the accent', () => {
    render(
      <ConfirmDialog {...base} onCancel={vi.fn()} onConfirm={vi.fn()} confirmLabel="Remove" />,
    )
    expect(screen.getByRole('button', { name: 'Remove' }).className).toContain('text-danger')
  })

  it('uses a primary button when the ask is not destructive', () => {
    render(
      <ConfirmDialog
        {...base}
        onCancel={vi.fn()}
        onConfirm={vi.fn()}
        tone="neutral"
        confirmLabel="Recheck"
      />,
    )
    expect(screen.getByRole('button', { name: 'Recheck' }).className).toContain('bg-accent')
  })

  it('defaults the option checkbox to off', () => {
    render(
      <ConfirmDialog
        {...base}
        onCancel={vi.fn()}
        onConfirm={vi.fn()}
        optionLabel="Also delete the files on disk"
      />,
    )
    expect(screen.getByRole('checkbox')).toHaveAttribute('aria-checked', 'false')
  })

  it('reports the option state to onConfirm', async () => {
    const onConfirm = vi.fn()
    render(
      <ConfirmDialog
        {...base}
        onCancel={vi.fn()}
        onConfirm={onConfirm}
        confirmLabel="Remove"
        optionLabel="Also delete the files on disk"
      />,
    )
    await userEvent.click(screen.getByRole('checkbox'))
    await userEvent.click(screen.getByRole('button', { name: 'Remove' }))
    expect(onConfirm).toHaveBeenCalledWith(true)
  })

  it('forgets the option between openings, since a remembered yes is data loss', async () => {
    const onConfirm = vi.fn()
    function Harness({ open }: { open: boolean }) {
      return (
        <ConfirmDialog
          {...base}
          open={open}
          onCancel={vi.fn()}
          onConfirm={onConfirm}
          confirmLabel="Remove"
          optionLabel="Also delete the files on disk"
        />
      )
    }
    const { rerender } = render(<Harness open />)
    await userEvent.click(screen.getByRole('checkbox'))
    await userEvent.click(screen.getByRole('button', { name: 'Remove' }))
    expect(onConfirm).toHaveBeenLastCalledWith(true)

    rerender(<Harness open={false} />)
    rerender(<Harness open />)
    expect(screen.getByRole('checkbox')).toHaveAttribute('aria-checked', 'false')

    await userEvent.click(screen.getByRole('button', { name: 'Remove' }))
    expect(onConfirm).toHaveBeenLastCalledWith(false)
  })

  it('omits the checkbox when there is no option', () => {
    render(<ConfirmDialog {...base} onCancel={vi.fn()} onConfirm={vi.fn()} />)
    expect(screen.queryByRole('checkbox')).toBeNull()
  })
})
