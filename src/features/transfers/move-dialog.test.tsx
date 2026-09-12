import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { MoveDialog } from '@/features/transfers/move-dialog'
import { moveFailureDetail } from '@/features/transfers/move-failure'
import { ApiError } from '@/services/transport'

const pickFolder = vi.fn<(from?: string) => Promise<string | null>>(() => Promise.resolve(null))
vi.mock('@/services/shell', () => ({
  canReachDesktop: () => true,
  pickFolder: (from?: string) => pickFolder(from),
}))

const setup = (props: Partial<React.ComponentProps<typeof MoveDialog>> = {}) => {
  const onConfirm = vi.fn()
  render(
    <MoveDialog
      open
      count={1}
      currentPath="C:/Users/someone/Downloads"
      onCancel={vi.fn()}
      onConfirm={onConfirm}
      {...props}
    />,
  )
  return { onConfirm }
}

const field = () => screen.getByLabelText('New folder')
const moveButton = () => screen.getByRole('button', { name: /^Move/ })

describe('MoveDialog', () => {
  it('opens on where the files already are, so the path is there to edit', () => {
    setup()
    expect(field()).toHaveValue('C:/Users/someone/Downloads')
  })

  // Submitting this would be a no-op that still asks the daemon to move a
  // hundred gigabytes onto itself.
  it('will not move a torrent to where it already is', () => {
    setup()
    expect(moveButton()).toBeDisabled()
    expect(screen.getByText(/That is where the files already are/)).toBeInTheDocument()
  })

  it('will not submit an empty folder', () => {
    setup()
    fireEvent.change(field(), { target: { value: '   ' } })
    expect(moveButton()).toBeDisabled()
  })

  it('hands back the trimmed destination', () => {
    const { onConfirm } = setup()
    fireEvent.change(field(), { target: { value: '  D:/media/films  ' } })
    fireEvent.click(moveButton())
    expect(onConfirm).toHaveBeenCalledWith('D:/media/films')
  })

  it('fills the field from the folder picker', async () => {
    pickFolder.mockResolvedValueOnce('E:/archive')
    setup()

    fireEvent.click(screen.getByRole('button', { name: 'Browse' }))
    expect(await screen.findByDisplayValue('E:/archive')).toBeInTheDocument()
  })

  it('leaves the field alone when the picker is dismissed', async () => {
    pickFolder.mockResolvedValueOnce(null)
    setup()

    fireEvent.click(screen.getByRole('button', { name: 'Browse' }))
    expect(await screen.findByDisplayValue('C:/Users/someone/Downloads')).toBeInTheDocument()
  })

  it('says it is working rather than looking stuck', () => {
    setup({ busy: true, currentPath: 'C:/old' })
    expect(screen.getByRole('button', { name: 'Moving…' })).toBeDisabled()
  })
})

describe('moveFailureDetail', () => {
  // The daemon answers with a status and no body. Without this the notice
  // reads "torrents/setLocation responded 403", which names our endpoint and
  // the user's problem in the wrong order.
  it('explains a folder it cannot write to', () => {
    expect(moveFailureDetail(new ApiError(403, 'torrents/setLocation', 'nope'))).toMatch(
      /cannot write to it/,
    )
  })

  it('explains a folder it could not create', () => {
    expect(moveFailureDetail(new ApiError(409, 'torrents/setLocation', 'nope'))).toMatch(
      /could not be created/,
    )
  })

  it('explains an empty folder', () => {
    expect(moveFailureDetail(new ApiError(400, 'torrents/setLocation', 'nope'))).toMatch(
      /No folder was given/,
    )
  })

  // Anything else is reported as itself rather than guessed at.
  it('has nothing to add to a status it does not know', () => {
    expect(moveFailureDetail(new ApiError(500, 'torrents/setLocation', 'nope'))).toBeUndefined()
    expect(moveFailureDetail(new Error('network down'))).toBeUndefined()
  })
})
