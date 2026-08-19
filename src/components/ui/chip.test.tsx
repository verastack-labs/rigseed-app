import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { Chip } from '@/components/ui/chip'

describe('Chip', () => {
  it('reports its selected state', () => {
    render(<Chip label="1337x" selected />)
    expect(screen.getByRole('button')).toHaveAttribute('aria-pressed', 'true')
  })

  it('tints with the item colour rather than the accent when selected', () => {
    render(<Chip label="Movies" color="#C97B63" selected />)
    expect(screen.getByRole('button')).toHaveStyle({ borderColor: '#C97B63' })
  })

  it('does not apply the item colour when unselected', () => {
    render(<Chip label="Movies" color="#C97B63" />)
    expect(screen.getByRole('button').getAttribute('style')).toBeNull()
  })

  it('fires onClick', async () => {
    const onClick = vi.fn()
    render(<Chip label="Music" onClick={onClick} />)
    await userEvent.click(screen.getByRole('button'))
    expect(onClick).toHaveBeenCalledOnce()
  })
})
