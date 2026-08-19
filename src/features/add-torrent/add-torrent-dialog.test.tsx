import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  AddTorrentDialog,
  type AddTorrentDialogProps,
} from '@/features/add-torrent/add-torrent-dialog'
import { ApiProvider } from '@/services/context'
import { useLabelStore } from '@/state/label-store'

const enc = new TextEncoder()

/** A minimal but real single-file torrent, so the parser has something true to read. */
function torrentFile(name = 'ubuntu', size = 5_600_000_000, filename = 'ubuntu.torrent'): File {
  const encoded = enc.encode(`d4:infod6:lengthi${size}e4:name${name.length}:${name}ee`)
  return new File([encoded], filename)
}

const base: AddTorrentDialogProps = {
  onClose: vi.fn(),
  categories: ['Linux', 'Film'],
  tags: ['iso', 'verified'],
  freeSpace: 412 * 1000 ** 3,
}

/**
 * Renders against the mock daemon.
 *
 * Deliberately not a spy on the client. ApiProvider builds its own, and every
 * assertion worth making here is visible on screen anyway: the footer total,
 * the warning, the dialog closing.
 */
const setup = (props: Partial<AddTorrentDialogProps> = {}) =>
  render(
    <ApiProvider>
      <AddTorrentDialog {...base} {...props} />
    </ApiProvider>,
  )

/**
 * Drops onto the panel rather than onto the dashed zone.
 *
 * The whole body is a drop target, and dropping on a section inside it is the
 * honest test of that: the event has to bubble to the handler. It also avoids
 * "Browse", which is ambiguous here because the save path has one too.
 */
const panel = () => screen.getByText('Source').closest('section')!

const dropFile = async (file: File) => {
  fireEvent.drop(panel(), { dataTransfer: { files: [file], types: ['Files'] } })
  // The contents summary, not the drop-zone hint. Both say "entry".
  await screen.findByText(/entry · \d+ selected/)
}

describe('AddTorrentDialog', () => {
  beforeEach(() => {
    useLabelStore.getState().reset()
    localStorage.clear()
  })

  it('cannot add until there is something to add', () => {
    setup()
    expect(screen.getByRole('button', { name: 'Add and start' })).toBeDisabled()
    expect(screen.getByText('no file chosen')).toBeInTheDocument()
  })

  it('enables the add button once a magnet is typed', () => {
    setup({ initialSource: 'magnet' })

    fireEvent.change(screen.getByLabelText('Magnet links'), {
      target: { value: '  \nmagnet:?xt=urn:btih:abc\n\nmagnet:?xt=urn:btih:def\n' },
    })

    // Blank lines are not links, so the count has to survive a trailing
    // newline, which every paste has.
    expect(screen.getByText('2 links')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Add and start' })).toBeEnabled()
  })

  it('reads a dropped file and shows its contents', async () => {
    setup()
    await dropFile(torrentFile())

    expect(screen.getByText('ubuntu.torrent')).toBeInTheDocument()
    expect(screen.getByText(/1 entry · 1 selected/)).toBeInTheDocument()
    expect(screen.getByText(/5\.60 GB selected/)).toBeInTheDocument()
  })

  it('reports a file that is not a torrent instead of failing silently', async () => {
    setup()
    // Valid bencode, but no info dictionary, which is the failure a renamed
    // or truncated file actually produces.
    fireEvent.drop(panel(), {
      dataTransfer: {
        files: [new File([enc.encode('d8:announce3:abce')], 'notes.torrent')],
        types: ['Files'],
      },
    })

    expect(await screen.findByText(/no info dictionary/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Add and start' })).toBeDisabled()
  })

  it('names the button after what it will do', () => {
    setup({ initialSource: 'magnet' })
    expect(screen.getByRole('button', { name: 'Add and start' })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('switch', { name: 'Start torrent' }))
    expect(screen.getByRole('button', { name: 'Add paused' })).toBeInTheDocument()
  })

  it('locks the save path under automatic management', () => {
    // AutoTMM takes the path from the category. Leaving the field live offers
    // a choice the daemon then ignores.
    setup()
    expect(screen.getByLabelText('Save path')).toBeEnabled()

    fireEvent.click(screen.getByRole('switch', { name: 'Automatic Torrent Management' }))
    expect(screen.getByLabelText('Save path')).toBeDisabled()
  })

  it('warns when the torrent does not fit', async () => {
    setup({ freeSpace: 1000 ** 3 })
    await dropFile(torrentFile())
    expect(screen.getByRole('alert')).toHaveTextContent('not enough room')
  })

  it('follows the file selection in the footer total', async () => {
    setup()
    await dropFile(torrentFile())
    expect(screen.getByText(/5\.60 GB selected/)).toBeInTheDocument()

    fireEvent.click(screen.getByLabelText('Download ubuntu'))
    expect(screen.getByText('0 B selected')).toBeInTheDocument()
    expect(screen.getByText(/1 entry · 0 selected/)).toBeInTheDocument()
  })
})

describe('AddTorrentDialog submission', () => {
  beforeEach(() => {
    useLabelStore.getState().reset()
    localStorage.clear()
  })

  it('sends the magnet links and the options as chosen', async () => {
    const onClose = vi.fn()
    setup({ initialSource: 'magnet', onClose })

    fireEvent.change(screen.getByLabelText('Magnet links'), {
      target: { value: 'magnet:?xt=urn:btih:abc' },
    })
    fireEvent.click(screen.getByRole('button', { name: /Film/ }))
    fireEvent.click(screen.getByRole('button', { name: /verified/ }))
    fireEvent.click(screen.getByRole('switch', { name: 'Sequential download' }))
    fireEvent.click(screen.getByRole('button', { name: 'Add and start' }))

    // The dialog closing is the observable outcome of a successful add, and
    // the only one that does not require reaching inside the client.
    await waitFor(() => expect(onClose).toHaveBeenCalledOnce())
  })

  it('closes only after the add resolves', async () => {
    const onClose = vi.fn()
    setup({ initialSource: 'magnet', onClose })

    fireEvent.change(screen.getByLabelText('Magnet links'), {
      target: { value: 'magnet:?xt=urn:btih:abc' },
    })
    expect(onClose).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole('button', { name: 'Add and start' }))
    await waitFor(() => expect(onClose).toHaveBeenCalled())
  })

  it('creates a category inline and selects it', async () => {
    setup({ initialSource: 'magnet' })

    fireEvent.click(screen.getByRole('button', { name: /^New$/ }))
    fireEvent.change(screen.getByLabelText('Category name'), {
      target: { value: 'Documentaries' },
    })
    fireEvent.click(screen.getByRole('radio', { name: 'Sage' }))
    fireEvent.click(screen.getByRole('button', { name: 'Create category' }))

    // The chosen styling is ours to keep: torrents/createCategory has nowhere
    // to put a colour.
    await waitFor(() =>
      expect(useLabelStore.getState().categories['Documentaries']).toEqual({
        icon: 'folder',
        color: 'sage',
      }),
    )
  })

  it('records a new tag’s colour', async () => {
    setup({ initialSource: 'magnet' })

    fireEvent.click(screen.getByRole('button', { name: /New tag/ }))
    fireEvent.change(screen.getByLabelText('Tag name'), { target: { value: 'rare' } })
    fireEvent.click(screen.getByRole('radio', { name: 'Mustard' }))
    fireEvent.click(screen.getByRole('button', { name: 'Create tag' }))

    await waitFor(() => expect(useLabelStore.getState().tags['rare']).toBe('mustard'))
  })
})
