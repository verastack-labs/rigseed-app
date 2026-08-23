import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { CloseChoice } from '@/features/shell/close-choice'

const setup = () => {
  const onKeepRunning = vi.fn<(remember: boolean) => void>()
  const onQuit = vi.fn<(remember: boolean) => void>()
  render(<CloseChoice open onKeepRunning={onKeepRunning} onQuit={onQuit} />)
  return { onKeepRunning, onQuit }
}

describe('CloseChoice', () => {
  it('names both consequences instead of implying them', () => {
    // "Keep running" without saying where it went loses the app for anybody
    // who has not met the convention, and "Quit" without saying transfers stop
    // is the more expensive mistake to make silently.
    setup()
    expect(screen.getByText(/system tray/)).toBeInTheDocument()
    expect(screen.getByText(/Downloads and seeding carry on/)).toBeInTheDocument()
    expect(screen.getByText(/Nothing downloads or seeds/)).toBeInTheDocument()
  })

  it('offers both actions rather than an action and an abort', async () => {
    const { onKeepRunning, onQuit } = setup()
    await userEvent.click(screen.getByRole('button', { name: 'Quit' }))
    expect(onQuit).toHaveBeenCalledOnce()
    expect(onKeepRunning).not.toHaveBeenCalled()
  })

  it('hides to the tray on the primary action', async () => {
    const { onKeepRunning } = setup()
    await userEvent.click(screen.getByRole('button', { name: 'Keep running' }))
    expect(onKeepRunning).toHaveBeenCalledOnce()
  })

  it('passes the remembered answer along with whichever was chosen', async () => {
    const { onQuit } = setup()
    await userEvent.click(screen.getByRole('button', { name: 'Quit' }))
    expect(onQuit).toHaveBeenCalledWith(true)
  })

  it('lets the answer be a one-off', async () => {
    // The checkbox is a choice about future behaviour. Stapling it to whichever
    // button somebody happened to press is how an app ends up doing something
    // nobody asked for.
    const { onKeepRunning } = setup()
    await userEvent.click(screen.getByRole('checkbox', { name: /Remember this/ }))
    await userEvent.click(screen.getByRole('button', { name: 'Keep running' }))
    expect(onKeepRunning).toHaveBeenCalledWith(false)
  })

  it('treats dismissing it as keeping rigseed running', async () => {
    // Escape must not be the destructive path. Somebody who pressed the close
    // button and then backed out of the question has not asked for transfers
    // to stop, and the window coming back is recoverable where a stopped
    // daemon is a thing they find out about later.
    const { onKeepRunning, onQuit } = setup()
    await userEvent.keyboard('{Escape}')
    expect(onKeepRunning).toHaveBeenCalledOnce()
    expect(onQuit).not.toHaveBeenCalled()
  })
})

describe('the remember option', () => {
  it('has text beside it, not only an accessible name', () => {
    // `Checkbox` is the bare 16px box from the torrent rows and carries its
    // label for a screen reader only. Dropped into a footer on its own it is a
    // ticked box with nothing next to it, which is how this first shipped and
    // what a screenshot caught.
    setup()
    const box = screen.getByRole('checkbox', { name: /Remember this/ })
    expect(box.closest('label')).toHaveTextContent('Remember this and stop asking')
  })
})
