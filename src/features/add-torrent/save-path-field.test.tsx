import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { SavePathField, type SavePathFieldProps } from '@/features/add-torrent/save-path-field'

const GB = 1000 ** 3

const base: SavePathFieldProps = {
  value: '/downloads',
  onChange: vi.fn(),
  freeSpace: 412 * GB,
  needed: 5.56 * GB,
}

const setup = (props: Partial<SavePathFieldProps> = {}) =>
  render(<SavePathField {...base} {...props} />)

describe('SavePathField', () => {
  it('reports free and needed side by side', () => {
    setup()
    expect(screen.getByText(/412 GB free · 5\.56 GB needed/)).toBeInTheDocument()
  })

  it('warns, loudly, when the torrent does not fit', () => {
    setup({ freeSpace: 2 * GB, needed: 5.56 * GB })

    const hint = screen.getByRole('alert')
    expect(hint).toHaveTextContent('not enough room')
    // The colour is the signal at a glance, the role is the signal for anyone
    // not looking at colours.
    expect(hint.className).toContain('text-warn')
  })

  it('stays quiet when it fits', () => {
    setup()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('does not warn when the size is unknown', () => {
    // A magnet has no size until metadata arrives. Comparing zero against free
    // space would either always warn or always reassure, and both are lies.
    setup({ needed: 0 })
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(screen.getByText(/412 GB free/)).toBeInTheDocument()
    expect(screen.queryByText(/needed/)).not.toBeInTheDocument()
  })

  it('does not warn when free space has not been reported', () => {
    setup({ freeSpace: 0 })
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(screen.queryByText(/free/)).not.toBeInTheDocument()
  })

  it('reports edits to the path', () => {
    const onChange = vi.fn()
    setup({ onChange })
    fireEvent.change(screen.getByLabelText('Save path'), { target: { value: '/mnt/big' } })
    expect(onChange).toHaveBeenCalledWith('/mnt/big')
  })

  it('leaves Browse present but inert without a picker', () => {
    setup()
    const browse = screen.getByRole('button', { name: 'Browse' })
    expect(browse).toBeDisabled()
    expect(browse).toHaveAttribute('title', 'Available in the desktop app')
  })

  it('uses the picker when the shell provides one', () => {
    const onBrowse = vi.fn()
    setup({ onBrowse })
    fireEvent.click(screen.getByRole('button', { name: 'Browse' }))
    expect(onBrowse).toHaveBeenCalledOnce()
  })
})
