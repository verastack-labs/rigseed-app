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

  it('applies a named padding rather than letting callers stack their own', () => {
    // The body is the card root's last child. Querying 'div > div' from the
    // test container would match the root itself.
    const body = (c: HTMLElement) => c.firstElementChild!.lastElementChild!

    const { container, rerender } = render(<Card>body</Card>)
    expect(body(container).className).toContain('p-[18px]')

    rerender(<Card padding="card">body</Card>)
    expect(body(container).className).toContain('p-[14px]')

    rerender(<Card padding="none">body</Card>)
    expect(body(container).className).toBe('')
  })

  it('raises its border on hover only when hoverable', () => {
    const { container, rerender } = render(<Card>body</Card>)
    expect(container.firstElementChild?.className).not.toContain('hover:border-accent')
    rerender(<Card hoverable>body</Card>)
    expect(container.firstElementChild?.className).toContain('hover:border-accent')
  })
})
