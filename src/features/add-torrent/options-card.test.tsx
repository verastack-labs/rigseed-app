import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { OptionsCard, type AddOptions } from '@/features/add-torrent/options-card'

const value: AddOptions = { start: true, skipChecking: false, sequential: false, autoTMM: false }

describe('OptionsCard', () => {
  it('offers every option the modal sends', () => {
    render(<OptionsCard value={value} onChange={vi.fn()} />)

    for (const label of [
      'Start torrent',
      'Skip hash check',
      'Sequential download',
      'Automatic Torrent Management',
    ]) {
      expect(screen.getByRole('switch', { name: label })).toBeInTheDocument()
    }
  })

  it('names the parameter each row sends, including the inverted one', () => {
    render(<OptionsCard value={value} onChange={vi.fn()} />)

    // The label reads "Start torrent" but the wire carries paused=false. The
    // mono line has to stay honest about that, or it is worse than absent.
    expect(screen.getByText('paused=false')).toBeInTheDocument()
    expect(screen.getByText('skip_checking')).toBeInTheDocument()
    expect(screen.getByText('sequentialDownload')).toBeInTheDocument()
    expect(screen.getByText('autoTMM')).toBeInTheDocument()
  })

  it('reflects the current state', () => {
    render(<OptionsCard value={value} onChange={vi.fn()} />)
    expect(screen.getByRole('switch', { name: 'Start torrent' })).toBeChecked()
    expect(screen.getByRole('switch', { name: 'Skip hash check' })).not.toBeChecked()
  })

  it('changes one option without disturbing the rest', () => {
    const onChange = vi.fn()
    render(<OptionsCard value={value} onChange={onChange} />)

    fireEvent.click(screen.getByRole('switch', { name: 'Sequential download' }))
    expect(onChange).toHaveBeenCalledWith({ ...value, sequential: true })
  })

  it('turns an option off again', () => {
    const onChange = vi.fn()
    render(<OptionsCard value={value} onChange={onChange} />)

    fireEvent.click(screen.getByRole('switch', { name: 'Start torrent' }))
    expect(onChange).toHaveBeenCalledWith({ ...value, start: false })
  })
})
