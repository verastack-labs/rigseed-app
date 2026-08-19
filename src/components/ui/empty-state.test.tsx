import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { EmptyState } from '@/components/ui/empty-state'

describe('EmptyState', () => {
  it('renders the title and body', () => {
    render(<EmptyState title="No results" body="All engines answered with nothing." />)
    expect(screen.getByText('No results')).toBeInTheDocument()
    expect(screen.getByText('All engines answered with nothing.')).toBeInTheDocument()
  })

  it('renders a single action when given one', () => {
    render(<EmptyState title="No torrents match these filters" action={<button>Clear filters</button>} />)
    expect(screen.getByRole('button', { name: 'Clear filters' })).toBeInTheDocument()
  })

  it('uses the 46px tile the states doc specifies', () => {
    const { container } = render(<EmptyState title="Nothing logged yet" icon={<i />} />)
    expect(container.querySelector('span')?.className).toContain('size-[46px]')
  })

  it('tones the tile for a warning state', () => {
    const { container } = render(<EmptyState title="Search unavailable" icon={<i />} tone="warn" />)
    expect(container.querySelector('span')?.className).toContain('text-warn')
  })
})
