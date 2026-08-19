import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { Card } from '@/components/ui/card'

describe('Card', () => {
  it('omits the header strip when there is no title', () => {
    render(<Card>body</Card>)
    expect(screen.queryByText('Trackers')).toBeNull()
    expect(screen.getByText('body')).toBeInTheDocument()
  })

  it('shows the api endpoint in the header when given one', () => {
    render(
      <Card title="Trackers" api="torrents/trackers">
        body
      </Card>,
    )
    expect(screen.getByText('torrents/trackers').className).toContain('font-mono')
  })

  it('raises its border on hover only when hoverable', () => {
    const { container, rerender } = render(<Card>body</Card>)
    expect(container.firstElementChild?.className).not.toContain('hover:border-accent')
    rerender(<Card hoverable>body</Card>)
    expect(container.firstElementChild?.className).toContain('hover:border-accent')
  })
})
