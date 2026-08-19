import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { FilterRow } from '@/components/ui/filter-row'

describe('FilterRow', () => {
  it('reports whether the filter is applied', () => {
    render(<FilterRow label="Downloading" active />)
    expect(screen.getByRole('button')).toHaveAttribute('aria-pressed', 'true')
  })

  it('truncates rather than wrapping, since the sidebar is fixed width', () => {
    render(<FilterRow label="A very long category name indeed" />)
    expect(screen.getByText('A very long category name indeed').className).toContain('truncate')
  })

  it('renders the count in mono with tabular figures', () => {
    render(<FilterRow label="Seeding" count={128} />)
    const count = screen.getByText('128')
    expect(count.className).toContain('font-mono')
    expect(count.className).toContain('tabular-nums')
  })

  it('shows a colour dot instead of an icon when given one', () => {
    const { container } = render(<FilterRow label="linux" dot="#8FB08F" icon={<i />} />)
    expect(container.querySelector('i')).toBeNull()
    expect(container.querySelector('[aria-hidden="true"]')).toHaveStyle({ background: '#8FB08F' })
  })

  it('fires onClick', async () => {
    const onClick = vi.fn()
    render(<FilterRow label="Paused" onClick={onClick} />)
    await userEvent.click(screen.getByRole('button'))
    expect(onClick).toHaveBeenCalledOnce()
  })
})
