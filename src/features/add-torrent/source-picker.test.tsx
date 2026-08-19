import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { SourcePicker, type SourcePickerProps } from '@/features/add-torrent/source-picker'

const base: SourcePickerProps = {
  source: 'file',
  onSource: vi.fn(),
  file: null,
  meta: null,
  fileError: null,
  onFiles: vi.fn(),
  magnet: '',
  onMagnet: vi.fn(),
}

const setup = (props: Partial<SourcePickerProps> = {}) =>
  render(<SourcePicker {...base} {...props} />)

describe('SourcePicker', () => {
  it('invites a file before one is chosen', () => {
    setup()
    expect(screen.getByText('Choose a .torrent file')).toBeInTheDocument()
    expect(screen.getByText('or drop one anywhere on this panel')).toBeInTheDocument()
  })

  it('reports size and entry count once the file is read', () => {
    setup({
      file: new File([''], 'ubuntu.torrent'),
      meta: {
        name: 'ubuntu',
        totalSize: 5_700_000_000,
        entries: [
          { path: 'a', size: 1 },
          { path: 'b', size: 2 },
        ],
        infoBytes: new Uint8Array(),
      },
    })

    expect(screen.getByText('ubuntu.torrent')).toBeInTheDocument()
    expect(
      screen.getByText(/5\.7 GB · 2 entries · drop another file to replace/),
    ).toBeInTheDocument()
  })

  it('says entry, not entries, for a single-file torrent', () => {
    setup({
      file: new File([''], 'debian.torrent'),
      meta: {
        name: 'debian',
        totalSize: 660_000_000,
        entries: [{ path: 'debian', size: 1 }],
        infoBytes: new Uint8Array(),
      },
    })
    expect(screen.getByText(/· 1 entry ·/)).toBeInTheDocument()
  })

  it('shows the parse failure in place of the summary', () => {
    // The alternative is a silent no-op after picking a file, which reads as
    // the app having ignored the click.
    setup({ file: new File([''], 'notes.txt'), fileError: 'not a torrent: no info dictionary' })
    expect(screen.getByText('not a torrent: no info dictionary')).toBeInTheDocument()
  })

  it('swaps the drop zone for the magnet box', () => {
    const { rerender } = setup()
    expect(screen.queryByLabelText('Magnet links')).not.toBeInTheDocument()

    rerender(<SourcePicker {...base} source="magnet" />)
    expect(screen.getByLabelText('Magnet links')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Browse' })).not.toBeInTheDocument()
  })

  it('reports magnet edits', () => {
    const onMagnet = vi.fn()
    setup({ source: 'magnet', onMagnet })

    fireEvent.change(screen.getByLabelText('Magnet links'), {
      target: { value: 'magnet:?xt=urn:btih:abc' },
    })
    expect(onMagnet).toHaveBeenCalledWith('magnet:?xt=urn:btih:abc')
  })
})
