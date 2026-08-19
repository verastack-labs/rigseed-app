import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { SegmentedControl } from '@/components/ui/segmented-control'

describe('SegmentedControl', () => {
  it('exposes a radiogroup with one radio per option', () => {
    render(<SegmentedControl label="View" options={['easy', 'grid', 'list']} value="grid" />)
    expect(screen.getByRole('radiogroup', { name: 'View' })).toBeInTheDocument()
    expect(screen.getAllByRole('radio')).toHaveLength(3)
  })

  it('marks only the selected option as checked', () => {
    render(<SegmentedControl label="View" options={['easy', 'grid', 'list']} value="grid" />)
    expect(screen.getByRole('radio', { name: 'grid' })).toHaveAttribute('aria-checked', 'true')
    expect(screen.getByRole('radio', { name: 'easy' })).toHaveAttribute('aria-checked', 'false')
  })

  it('emits the chosen value', async () => {
    const onChange = vi.fn()
    render(
      <SegmentedControl label="View" options={['easy', 'grid']} value="grid" onChange={onChange} />,
    )
    await userEvent.click(screen.getByRole('radio', { name: 'easy' }))
    expect(onChange).toHaveBeenCalledWith('easy')
  })

  it('accepts object options carrying a count', () => {
    render(
      <SegmentedControl
        label="Kind"
        options={[{ value: 'tags', label: 'Tags', count: 7 }]}
        value="tags"
      />,
    )
    expect(screen.getByText('7')).toBeInTheDocument()
  })
})
