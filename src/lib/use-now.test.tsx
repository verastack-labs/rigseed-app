import { act, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { useNow } from '@/lib/use-now'

function Clock({ everyMs }: { everyMs?: number }) {
  const now = useNow(everyMs)
  return <output data-testid="now">{now}</output>
}

const shown = () => Number(screen.getByTestId('now').textContent)

describe('useNow', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(1_770_000_000_000)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('starts at the current time', () => {
    render(<Clock />)
    expect(shown()).toBe(1_770_000_000_000)
  })

  it('moves on without anything else re-rendering', () => {
    // The whole point. A timestamp read once during render freezes, so a
    // relative time would still say "10m ago" an hour later on a screen with
    // nothing else to redraw.
    render(<Clock everyMs={1_000} />)
    const before = shown()

    act(() => {
      vi.advanceTimersByTime(5_000)
    })

    expect(shown()).toBeGreaterThan(before)
    expect(shown()).toBe(1_770_000_005_000)
  })

  it('does not tick faster than it was asked to', () => {
    render(<Clock everyMs={30_000} />)

    act(() => {
      vi.advanceTimersByTime(29_000)
    })
    expect(shown()).toBe(1_770_000_000_000)

    act(() => {
      vi.advanceTimersByTime(1_000)
    })
    expect(shown()).toBe(1_770_000_030_000)
  })

  it('stops ticking when it goes away', () => {
    // An interval left running after unmount sets state on a dead component
    // and keeps the screen awake for a clock nobody is reading.
    const { unmount } = render(<Clock everyMs={1_000} />)
    unmount()

    // Nothing to assert on the DOM once it is gone; the check is that
    // advancing the clock raises no update-after-unmount warning.
    expect(() =>
      act(() => {
        vi.advanceTimersByTime(10_000)
      }),
    ).not.toThrow()
  })
})
