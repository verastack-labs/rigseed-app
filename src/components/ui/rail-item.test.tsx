import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { RailItem } from '@/components/ui/rail-item'

describe('RailItem', () => {
  it('always carries a title, which is what makes the collapsed rail usable', () => {
    render(<RailItem icon={<i />} label="Transfers" />)
    expect(screen.getByRole('button', { name: 'Transfers' })).toHaveAttribute(
      'title',
      'Transfers',
    )
  })

  it('marks the active destination as the current page', () => {
    const { rerender } = render(<RailItem icon={<i />} label="Logs" />)
    expect(screen.getByRole('button')).not.toHaveAttribute('aria-current')
    rerender(<RailItem icon={<i />} label="Logs" active />)
    expect(screen.getByRole('button')).toHaveAttribute('aria-current', 'page')
  })

  it('fades the label rather than unmounting it, so the icon never shifts', () => {
    const { rerender } = render(<RailItem icon={<i />} label="Search" />)
    expect(screen.getByText('Search').className).toContain('opacity-0')
    rerender(<RailItem icon={<i />} label="Search" expanded />)
    expect(screen.getByText('Search').className).toContain('opacity-100')
  })
})
