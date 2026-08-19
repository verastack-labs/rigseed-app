import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { Sparkline } from '@/components/ui/sparkline'

const paths = (c: HTMLElement) => Array.from(c.querySelectorAll('path'))

describe('Sparkline', () => {
  it('is decorative, so it is hidden from assistive tech', () => {
    const { container } = render(<Sparkline data={[1, 2, 3]} />)
    expect(container.querySelector('svg')).toHaveAttribute('aria-hidden', 'true')
  })

  it('keeps the stroke width constant despite the non uniform stretch', () => {
    const { container } = render(<Sparkline data={[1, 5, 2]} gridlines />)
    const stroked = [
      ...paths(container).filter((p) => p.getAttribute('stroke')),
      ...Array.from(container.querySelectorAll('line')),
    ]
    expect(stroked.length).toBeGreaterThan(0)
    for (const el of stroked) {
      expect(el.getAttribute('vector-effect')).toBe('non-scaling-stroke')
    }
  })

  it('scales download and upload against one shared maximum', () => {
    // Upload is tiny next to download. If the series were scaled separately
    // the two lines would look comparable, which would misreport the swarm.
    const { container } = render(<Sparkline data={[0, 100]} upload={[0, 1]} fill={false} />)
    const [download, up] = paths(container)
    const yOf = (d: string) => Number(d.split('L')[1]?.split(' ')[1])
    expect(yOf(download!.getAttribute('d')!)).toBeLessThan(yOf(up!.getAttribute('d')!))
  })

  it('survives an empty series rather than dividing by zero', () => {
    const { container } = render(<Sparkline data={[]} />)
    const d = paths(container).at(-1)?.getAttribute('d') ?? ''
    expect(d).not.toContain('NaN')
  })

  it('draws the area fill only when asked', () => {
    const { container, rerender } = render(<Sparkline data={[1, 2]} fill={false} />)
    expect(paths(container)).toHaveLength(1)
    rerender(<Sparkline data={[1, 2]} fill />)
    expect(paths(container)).toHaveLength(2)
  })
})
