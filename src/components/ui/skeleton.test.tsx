import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { Skeleton } from '@/components/ui/skeleton'

describe('Skeleton', () => {
  // The rows are the div children of the skeleton root. Querying from the test
  // container would also match the root itself.
  const rowsOf = (container: HTMLElement) =>
    Array.from(container.firstElementChild!.querySelectorAll<HTMLElement>('div'))

  it('renders the requested number of rows', () => {
    const { container } = render(<Skeleton rows={7} />)
    expect(rowsOf(container)).toHaveLength(7)
  })

  it('matches the height of the rows it stands in for', () => {
    const { container } = render(<Skeleton rows={1} rowHeight={64} />)
    expect(rowsOf(container)[0]).toHaveStyle({ height: '64px' })
  })

  it('fades later rows so it does not read as content', () => {
    const { container } = render(<Skeleton rows={3} />)
    const rows = rowsOf(container)
    expect(Number(rows[0]!.style.opacity)).toBeGreaterThan(Number(rows[2]!.style.opacity))
  })

  it('announces itself as loading without exposing the bars', () => {
    const { container } = render(<Skeleton />)
    expect(container.firstElementChild).toHaveAttribute('aria-hidden', 'true')
    expect(screen.getByText('Loading')).toBeInTheDocument()
  })
})
