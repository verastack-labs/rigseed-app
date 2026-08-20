import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { LabelEditor, type LabelDraft } from '@/features/labels/label-editor'
import { makeTorrent } from '@/test/torrent'

vi.mock('@/services/shell', () => ({
  canReachDesktop: () => false,
  pickFolder: vi.fn(),
  revealInFolder: vi.fn(),
  openPath: vi.fn(),
}))

const draft: LabelDraft = {
  name: 'Movies',
  color: 'mustard',
  icon: 'disc',
  savePath: '/media/movies',
  managed: false,
}

const setup = (props: Partial<React.ComponentProps<typeof LabelEditor>> = {}) =>
  render(
    <LabelEditor
      kind="category"
      draft={draft}
      onChange={vi.fn()}
      editing="Movies"
      members={[]}
      freeSpace={0}
      dirty={false}
      onSave={vi.fn()}
      onCancel={vi.fn()}
      onDelete={vi.fn()}
      {...props}
    />,
  )

describe('LabelEditor', () => {
  it('locks the name while editing, because the API has no rename', () => {
    // editCategory takes the name as the key of what to change. A rename is
    // create, move every member across, remove the old one, which is a real
    // operation with a real failure mode halfway through, not a text field.
    setup()
    expect(screen.getByLabelText('Category name')).toBeDisabled()
    expect(screen.getByText(/has no rename/)).toBeInTheDocument()
  })

  it('opens the name for a new label', () => {
    setup({ editing: null })
    expect(screen.getByLabelText('Category name')).not.toBeDisabled()
  })

  it('will not create something with no name', () => {
    setup({ editing: null, dirty: true, draft: { ...draft, name: '  ' } })
    expect(screen.getByRole('button', { name: 'Create category' })).toBeDisabled()
  })

  it('keeps Save off until something actually changed', () => {
    setup()
    expect(screen.getByRole('button', { name: 'Save changes' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled()
  })

  it('offers Delete only for something that exists', () => {
    setup()
    expect(screen.getByRole('button', { name: 'Delete category' })).toBeInTheDocument()
    setup({ editing: null })
    expect(screen.queryAllByRole('button', { name: 'Delete category' })).toHaveLength(1)
  })

  it('says what deleting does, since the word suggests worse', () => {
    setup()
    expect(screen.getByText(/Torrents stay/)).toBeInTheDocument()
  })

  it('hides the save location for a tag, which has none', () => {
    setup({ kind: 'tag' })
    expect(screen.queryByLabelText('Category save path')).not.toBeInTheDocument()
    expect(screen.getByLabelText('Tag name')).toBeInTheDocument()
  })

  it('disables Browse where there is no desktop to open a picker in', () => {
    setup()
    expect(screen.getByRole('button', { name: 'Browse' })).toBeDisabled()
  })

  it('reports an edit rather than holding its own copy', () => {
    const onChange = vi.fn()
    setup({ onChange })
    fireEvent.change(screen.getByLabelText('Category save path'), {
      target: { value: '/media/films' },
    })
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ savePath: '/media/films' }))
  })

  it('lists what carries the label', () => {
    setup({ members: [makeTorrent({ name: 'ubuntu.iso' })] })
    expect(screen.getByText('ubuntu.iso')).toBeInTheDocument()
  })

  it('says the list is empty rather than showing an empty table', () => {
    setup()
    expect(screen.getByText('Nothing carries this category yet.')).toBeInTheDocument()
  })

  it('shows a dash for a free space the daemon has not reported', () => {
    setup()
    expect(screen.getByText('Free space').parentElement).toHaveTextContent('—')
  })
})
