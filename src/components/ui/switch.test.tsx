import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { Switch } from '@/components/ui/switch'

describe('Switch', () => {
  it('exposes the switch role and its state', () => {
    render(<Switch checked label="Sequential download" />)
    expect(screen.getByRole('switch', { name: 'Sequential download' })).toHaveAttribute(
      'aria-checked',
      'true',
    )
  })

  it('emits the next value', async () => {
    const onChange = vi.fn()
    render(<Switch onChange={onChange} label="Sequential download" />)
    await userEvent.click(screen.getByRole('switch'))
    expect(onChange).toHaveBeenCalledWith(true)
  })

  it('moves the knob only when on', () => {
    const { container, rerender } = render(<Switch label="Alt limits" />)
    expect(container.querySelector('span')?.className).toContain('translate-x-0')
    rerender(<Switch checked label="Alt limits" />)
    expect(container.querySelector('span')?.className).toContain('translate-x-4')
  })
})
