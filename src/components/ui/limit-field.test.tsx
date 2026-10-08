import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { LimitField } from '@/components/ui/limit-field'
import { LIMIT_UNLIMITED } from '@/types/qbittorrent'

const ENDPOINT = 'torrents/setDownloadLimit'

const show = () =>
  render(
    <LimitField name="Download" api={ENDPOINT} limit={LIMIT_UNLIMITED} onChange={vi.fn()} />,
  )

/*
 * Reported from Linux: the endpoint name sat outside the dialog.
 *
 * Measured on Windows before the fix, the name ended exactly at the row's
 * padding with nothing in the row able to yield, so any mono face rendering
 * even slightly wider pushed it out. A flex child will not shrink below its
 * own content without min-width: 0, and the row does not clip, so the overflow
 * left the dialog rather than being cut off inside it.
 */
describe('LimitField, the endpoint name', () => {
  it('can shrink, which is what stops it leaving the row', () => {
    show()
    const api = screen.getByText(ENDPOINT)
    expect(api.className).toContain('min-w-0')
    expect(api.className).toContain('truncate')
  })

  it('is still readable in full once it has been shortened', () => {
    show()
    expect(screen.getByText(ENDPOINT).getAttribute('title')).toBe(ENDPOINT)
  })

  /*
   * The other half. Shrinking only helps if everything else refuses to, or the
   * row squashes the input and the switch instead and the name never gives.
   */
  it('is the only thing in the row that gives', () => {
    const { container } = show()
    const row = screen.getByText(ENDPOINT).parentElement
    expect(row).not.toBeNull()
    const fixed = [...row!.children].filter((child) => child !== screen.getByText(ENDPOINT))
    const flexible = fixed.filter(
      (child) => !child.className.includes('shrink-0') && !child.className.includes('flex-1'),
    )
    expect(flexible.map((c) => c.className)).toEqual([])
    expect(container).toBeTruthy()
  })
})
