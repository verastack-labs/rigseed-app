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

describe('narrow windows', () => {
  const withIcons = [
    { value: 'easy', label: 'Easy', icon: <svg data-testid="i-easy" /> },
    { value: 'grid', label: 'Grid', icon: <svg data-testid="i-grid" /> },
  ]

  it('keeps the label reachable when it drops the text', () => {
    // The word goes, the meaning must not. Title for a hover, accessible name
    // for anything reading the button list.
    render(
      <SegmentedControl iconsWhenNarrow label="View" options={withIcons} value="easy" />,
    )
    const easy = screen.getByRole('radio', { name: 'Easy' })
    expect(easy).toHaveAttribute('title', 'Easy')
  })

  it('hides the text only below the breakpoint', () => {
    render(
      <SegmentedControl iconsWhenNarrow label="View" options={withIcons} value="easy" />,
    )
    const text = screen.getByText('Easy')
    expect(text.className).toContain('hidden')
    expect(text.className).toContain('xl:inline')
  })

  it('refuses to hide text an option has no icon to replace', () => {
    // A strip where some buttons lose their word and others keep theirs is
    // worse than one that overflows: nothing names the unlabelled ones.
    render(
      <SegmentedControl
        iconsWhenNarrow
        label="View"
        options={[withIcons[0]!, { value: 'list', label: 'List' }]}
        value="easy"
      />,
    )
    expect(screen.getByText('Easy').className).not.toContain('hidden')
  })

  it('leaves the text alone when nothing asked for this', () => {
    render(<SegmentedControl label="View" options={withIcons} value="easy" />)
    expect(screen.getByText('Easy').className ?? '').not.toContain('hidden')
  })
})
