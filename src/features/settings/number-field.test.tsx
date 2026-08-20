import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { NumberField } from '@/features/settings/number-field'

const field = () => screen.getByLabelText('Connection limit')

describe('NumberField', () => {
  it('shows the value it was given', () => {
    render(<NumberField value={500} onChange={vi.fn()} label="Connection limit" />)
    expect(field()).toHaveValue(500)
  })

  it('lets the box be cleared without reporting zero', () => {
    // Clearing 500 to type 800 goes through the empty string. Number('') is
    // 0, and writing 0 into the draft is a real change to a running daemon.
    const onChange = vi.fn()
    render(<NumberField value={500} onChange={onChange} label="Connection limit" />)
    fireEvent.change(field(), { target: { value: '' } })
    expect(onChange).not.toHaveBeenCalled()
    expect(field()).toHaveValue(null)
  })

  it('reports the number once it parses', () => {
    const onChange = vi.fn()
    render(<NumberField value={500} onChange={onChange} label="Connection limit" />)
    fireEvent.change(field(), { target: { value: '800' } })
    expect(onChange).toHaveBeenCalledWith(800)
  })

  it('puts the last good value back when it is left empty', () => {
    render(<NumberField value={500} onChange={vi.fn()} label="Connection limit" />)
    fireEvent.change(field(), { target: { value: '' } })
    fireEvent.blur(field())
    expect(field()).toHaveValue(500)
  })

  it('follows the value when it changes from outside, which is Revert', () => {
    // The real sequence: type 800, the parent takes it, then Revert puts 500
    // back. The field has to follow rather than keep showing what was typed.
    const { rerender } = render(
      <NumberField value={500} onChange={vi.fn()} label="Connection limit" />,
    )
    fireEvent.change(field(), { target: { value: '800' } })
    rerender(<NumberField value={800} onChange={vi.fn()} label="Connection limit" />)
    expect(field()).toHaveValue(800)

    rerender(<NumberField value={500} onChange={vi.fn()} label="Connection limit" />)
    expect(field()).toHaveValue(500)
  })

  it('carries its unit', () => {
    render(<NumberField value={0} onChange={vi.fn()} label="Connection limit" unit="KiB/s" />)
    expect(screen.getByText('KiB/s')).toBeInTheDocument()
  })
})
