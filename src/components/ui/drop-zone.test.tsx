import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { DropZone } from '@/components/ui/drop-zone'

const torrent = (name = 'sintel.torrent') => new File(['d8:announce'], name)

/** A drop event carrying files, which fireEvent does not build on its own. */
function drop(node: Element, files: File[]) {
  fireEvent.drop(node, { dataTransfer: { files, types: ['Files'] } })
}

function zone() {
  // The drop target is the outermost element, above the icon and the text.
  return screen.getByText('Browse').closest('div')!
}

describe('DropZone', () => {
  it('hands dropped files to the caller', () => {
    const onFiles = vi.fn()
    render(<DropZone icon={null} title="Drop a torrent" hint="or browse" onFiles={onFiles} />)

    drop(zone(), [torrent()])
    expect(onFiles).toHaveBeenCalledWith([expect.objectContaining({ name: 'sintel.torrent' })])
  })

  it('filters a drop by accept, which the browser does not', () => {
    const onFiles = vi.fn()
    render(
      <DropZone
        icon={null}
        title="Drop a torrent"
        hint="or browse"
        accept=".torrent"
        onFiles={onFiles}
      />,
    )

    // accept applies to the picker only. Without this filter a dragged
    // screenshot is handed over as if it were a torrent.
    drop(zone(), [new File([''], 'screenshot.png', { type: 'image/png' })])
    expect(onFiles).not.toHaveBeenCalled()

    drop(zone(), [torrent(), new File([''], 'notes.txt')])
    expect(onFiles).toHaveBeenCalledWith([expect.objectContaining({ name: 'sintel.torrent' })])
  })

  it('takes only the first file unless multiple is set', () => {
    const onFiles = vi.fn()
    const { rerender } = render(
      <DropZone icon={null} title="t" hint="h" onFiles={onFiles} accept=".torrent" />,
    )

    drop(zone(), [torrent('a.torrent'), torrent('b.torrent')])
    expect(onFiles.mock.calls[0]![0]).toHaveLength(1)

    rerender(<DropZone icon={null} title="t" hint="h" onFiles={onFiles} accept=".torrent" multiple />)
    drop(zone(), [torrent('a.torrent'), torrent('b.torrent')])
    expect(onFiles.mock.calls[1]![0]).toHaveLength(2)
  })

  it('keeps the highlight on while the pointer crosses child elements', () => {
    render(<DropZone icon={null} title="Drop a torrent" hint="or browse" onFiles={vi.fn()} />)
    const target = zone()

    fireEvent.dragEnter(target)
    expect(target.className).toContain('border-accent')

    // Entering a child fires dragenter again and leaving the parent's own box
    // fires dragleave. A boolean flag would flicker here; a depth count does
    // not.
    fireEvent.dragEnter(target)
    fireEvent.dragLeave(target)
    expect(target.className).toContain('border-accent')

    fireEvent.dragLeave(target)
    expect(target.className).not.toContain('border-accent')
  })

  it('drops the highlight once the file lands', () => {
    render(<DropZone icon={null} title="t" hint="h" onFiles={vi.fn()} />)
    const target = zone()

    fireEvent.dragEnter(target)
    drop(target, [torrent()])
    expect(target.className).not.toContain('border-accent')
  })

  it('offers a keyboard-reachable control, since a drop target is not one', () => {
    render(<DropZone icon={null} title="t" hint="h" onFiles={vi.fn()} actionLabel="Choose file" />)
    expect(screen.getByRole('button', { name: 'Choose file' })).toBeInTheDocument()
  })
})
