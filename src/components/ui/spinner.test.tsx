import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { Spinner } from '@/components/ui/spinner'

describe('Spinner', () => {
  it('is hidden from assistive technology, because the label beside it says the same thing', () => {
    const { container } = render(<Spinner />)
    const svg = container.querySelector('svg')
    expect(svg?.getAttribute('aria-hidden')).toBe('true')
    // Not focusable: an SVG in a button is reachable by tab in some engines
    // unless this is set, which puts a stop on the way to the button itself.
    expect(svg?.getAttribute('focusable')).toBe('false')
  })

  /*
   * The turn is decoration. Everything it conveys is also in the label it
   * sits beside, so somebody who asked for less movement loses nothing by
   * it holding still.
   */
  it('only turns when motion is welcome', () => {
    const { container } = render(<Spinner />)
    expect(container.querySelector('svg')?.getAttribute('class')).toContain(
      'motion-safe:animate-spin',
    )
  })

  it('takes its colour from whatever it sits inside', () => {
    const { container } = render(<Spinner />)
    const strokes = [...container.querySelectorAll('[stroke]')].map((n) => n.getAttribute('stroke'))
    expect(strokes.length).toBeGreaterThan(0)
    expect(strokes.every((s) => s === 'currentColor')).toBe(true)
  })

  it('sizes from one number, so a caller cannot set width without height', () => {
    const { container } = render(<Spinner size={20} />)
    const svg = container.querySelector('svg')
    expect(svg?.getAttribute('width')).toBe('20')
    expect(svg?.getAttribute('height')).toBe('20')
  })
})
