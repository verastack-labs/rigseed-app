import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import userEvent from '@testing-library/user-event'

import { Button } from '@/components/ui/button'

describe('Button', () => {
  it('defaults to the secondary variant at medium size', () => {
    render(<Button>Cancel</Button>)
    const button = screen.getByRole('button', { name: 'Cancel' })
    expect(button.className).toContain('bg-surface2')
    expect(button.className).toContain('text-[12.5px]')
  })

  it('defaults to type=button so it never submits a form by accident', () => {
    render(<Button>Cancel</Button>)
    expect(screen.getByRole('button')).toHaveAttribute('type', 'button')
  })

  it('uses the accent fill only for the primary variant', () => {
    const { rerender } = render(<Button variant="primary">Add and start</Button>)
    expect(screen.getByRole('button').className).toContain('bg-accent')

    rerender(<Button variant="danger">Remove</Button>)
    const danger = screen.getByRole('button')
    expect(danger.className).toContain('text-danger')
    expect(danger.className).not.toContain('bg-accent ')
  })

  it('renders leading and trailing icons around the label', () => {
    render(
      <Button icon={<span data-testid="lead" />} iconRight={<span data-testid="trail" />}>
        Label
      </Button>,
    )
    const button = screen.getByRole('button')
    const nodes = Array.from(button.childNodes)
    expect((nodes[0] as HTMLElement).dataset.testid).toBe('lead')
    expect((nodes[nodes.length - 1] as HTMLElement).dataset.testid).toBe('trail')
  })

  it('does not fire onClick while disabled', async () => {
    const onClick = vi.fn()
    render(
      <Button disabled onClick={onClick}>
        Apply
      </Button>,
    )
    await userEvent.click(screen.getByRole('button'), { pointerEventsCheck: 0 })
    expect(onClick).not.toHaveBeenCalled()
  })

  it('lets a caller override a conflicting utility through className', () => {
    render(<Button className="rounded-chip">Chip shaped</Button>)
    const cls = screen.getByRole('button').className
    expect(cls).toContain('rounded-chip')
    expect(cls).not.toContain('rounded-lg')
  })
})
