import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { StatusDot } from '@/components/ui/status-dot'

describe('StatusDot', () => {
  it('always renders the word beside the dot', () => {
    render(<StatusDot tone="accent2" label="connected" />)
    expect(screen.getByText('connected')).toBeInTheDocument()
  })

  it('hides the dot from assistive tech, since the word carries the meaning', () => {
    const { container } = render(<StatusDot label="stalled" />)
    expect(container.querySelector('[aria-hidden="true"]')).toBeTruthy()
  })

  it('pulses only when asked', () => {
    const { container, rerender } = render(<StatusDot label="idle" />)
    expect(container.querySelector('.animate-pulse')).toBeNull()
    rerender(<StatusDot label="searching" pulse />)
    expect(container.querySelector('.animate-pulse')).toBeTruthy()
  })
})
