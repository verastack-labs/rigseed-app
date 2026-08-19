import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { Checkbox } from '@/components/ui/checkbox'

describe('Checkbox', () => {
  it('reports mixed rather than checked when indeterminate', () => {
    render(<Checkbox indeterminate label="Select all" />)
    expect(screen.getByRole('checkbox')).toHaveAttribute('aria-checked', 'mixed')
  })

  it('reports the checked state', () => {
    render(<Checkbox checked label="Select all" />)
    expect(screen.getByRole('checkbox')).toHaveAttribute('aria-checked', 'true')
  })

  it('emits the next value rather than the current one', async () => {
    const onChange = vi.fn()
    render(<Checkbox checked onChange={onChange} label="Select all" />)
    await userEvent.click(screen.getByRole('checkbox'))
    expect(onChange).toHaveBeenCalledWith(false)
  })

  it('does not emit while disabled', async () => {
    const onChange = vi.fn()
    render(<Checkbox disabled onChange={onChange} label="Select all" />)
    await userEvent.click(screen.getByRole('checkbox'), { pointerEventsCheck: 0 })
    expect(onChange).not.toHaveBeenCalled()
  })
})
