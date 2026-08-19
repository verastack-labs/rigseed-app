import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { IconTile } from '@/components/ui/icon-tile'

describe('IconTile', () => {
  it('derives its radius from its size', () => {
    render(<IconTile size={50}>x</IconTile>)
    expect(screen.getByText('x')).toHaveStyle({ borderRadius: '14px' })
  })

  it('tints with an explicit colour when given one', () => {
    render(<IconTile color="#C97B63">x</IconTile>)
    expect(screen.getByText('x')).toHaveStyle({ color: '#C97B63' })
  })
})
