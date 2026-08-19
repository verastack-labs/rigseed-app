import { act, fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { Appearance } from '@/components/ui/appearance'

function setup(overrides: Partial<Parameters<typeof Appearance>[0]> = {}) {
  const props = {
    mode: 'dark' as const,
    accent: 'dustblue' as const,
    onModeChange: vi.fn(),
    onAccentChange: vi.fn(),
    ...overrides,
  }
  return { props, ...render(<Appearance {...props} />) }
}

describe('Appearance', () => {
  it('hides the panel until the button is used', () => {
    setup()
    expect(screen.getByRole('button', { name: 'Appearance' })).toHaveAttribute(
      'aria-expanded',
      'false',
    )
  })

  it('offers every accent as a radio', () => {
    setup()
    expect(screen.getByRole('radiogroup', { name: 'Theme colour' })).toBeInTheDocument()
    expect(screen.getAllByRole('radio', { name: /Blue|Amber|Sage|Terracotta|Mustard|Teal|Lavender|Slate/ })).toHaveLength(8)
  })

  it('marks the current accent as checked', () => {
    setup({ accent: 'sage' })
    expect(screen.getByRole('radio', { name: 'Sage' })).toHaveAttribute('aria-checked', 'true')
    expect(screen.getByRole('radio', { name: 'Amber' })).toHaveAttribute('aria-checked', 'false')
  })

  it('emits the chosen accent', async () => {
    const { props } = setup()
    await userEvent.click(screen.getByRole('button', { name: 'Appearance' }))
    await userEvent.click(screen.getByRole('radio', { name: 'Lavender' }))
    expect(props.onAccentChange).toHaveBeenCalledWith('lavender')
  })

  it('renders each swatch in its own accent rather than the active one', () => {
    setup({ accent: 'dustblue' })
    // The swatch carries data-accent so the cascade paints it its own colour.
    // Without this every swatch would render identically.
    expect(screen.getByRole('radio', { name: 'Sage' })).toHaveAttribute('data-accent', 'sage')
  })

  it('keeps the panel out of the tab order while collapsed', () => {
    setup({ accent: 'sage' })
    expect(screen.getByRole('radio', { name: 'Sage' })).toHaveAttribute('tabindex', '-1')
  })
})

describe('Appearance auto-collapse', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  // userEvent awaits real timers internally, which deadlocks against fake ones.
  // fireEvent is synchronous, so the timing under test stays the only timing.
  const tick = (ms: number) => act(() => void vi.advanceTimersByTime(ms))
  const button = () => screen.getByRole('button', { name: 'Appearance' })

  it('collapses 2.4 seconds after opening when the pointer never entered', () => {
    setup()
    fireEvent.click(button())
    expect(button()).toHaveAttribute('aria-expanded', 'true')

    tick(2399)
    expect(button()).toHaveAttribute('aria-expanded', 'true')

    tick(2)
    expect(button()).toHaveAttribute('aria-expanded', 'false')
  })

  it('cancels the countdown for as long as the pointer stays inside', () => {
    const { container } = setup()
    const root = container.firstElementChild as Element
    fireEvent.click(button())
    fireEvent.pointerEnter(root)

    tick(10_000)
    expect(button()).toHaveAttribute('aria-expanded', 'true')
  })

  it('starts the countdown only once the pointer leaves', () => {
    const { container } = setup()
    const root = container.firstElementChild as Element
    fireEvent.click(button())
    fireEvent.pointerEnter(root)

    tick(5000)
    expect(button()).toHaveAttribute('aria-expanded', 'true')

    fireEvent.pointerLeave(root)
    tick(2401)
    expect(button()).toHaveAttribute('aria-expanded', 'false')
  })

  it('closes on Escape', () => {
    const { container } = setup()
    fireEvent.click(button())
    fireEvent.keyDown(container.firstElementChild as Element, { key: 'Escape' })
    expect(button()).toHaveAttribute('aria-expanded', 'false')
  })
})
