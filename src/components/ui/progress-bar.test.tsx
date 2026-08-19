import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { ProgressBar } from '@/components/ui/progress-bar'

describe('ProgressBar', () => {
  it('exposes its value to assistive tech', () => {
    render(<ProgressBar value={42} label="Ubuntu ISO" />)
    const bar = screen.getByRole('progressbar', { name: 'Ubuntu ISO' })
    expect(bar).toHaveAttribute('aria-valuenow', '42')
    expect(bar).toHaveAttribute('aria-valuemax', '100')
  })

  it('clamps out of range values', () => {
    const { rerender } = render(<ProgressBar value={140} />)
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '100')
    rerender(<ProgressBar value={-20} />)
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '0')
  })

  it('survives a non finite value rather than rendering NaN', () => {
    render(<ProgressBar value={Number.NaN} showValue />)
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '0')
    expect(screen.getByText('0%')).toBeInTheDocument()
  })

  it('never uses the accent when paused', () => {
    const { container } = render(<ProgressBar value={50} paused />)
    const fill = container.querySelector('[role="progressbar"] > div')
    expect(fill?.className).toContain('bg-text-dimmer')
    expect(fill?.className).not.toContain('bg-accent')
  })

  it('animates width so progress reads as continuous between polls', () => {
    const { container } = render(<ProgressBar value={50} />)
    const fill = container.querySelector('[role="progressbar"] > div')
    expect(fill?.className).toContain('duration-base')
  })

  it('shows a rounded percentage only when asked', () => {
    const { rerender } = render(<ProgressBar value={42.7} />)
    expect(screen.queryByText('43%')).toBeNull()
    rerender(<ProgressBar value={42.7} showValue />)
    expect(screen.getByText('43%')).toBeInTheDocument()
  })
})
