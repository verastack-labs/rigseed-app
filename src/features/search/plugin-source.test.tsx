import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { PluginSource } from '@/features/search/plugin-source'

const openUrl = vi.fn<(url: string) => Promise<void>>(() => Promise.resolve())
const canReachDesktop = vi.fn(() => true)

vi.mock('@/services/shell', () => ({
  openUrl: (url: string) => openUrl(url),
  canReachDesktop: () => canReachDesktop(),
}))

afterEach(() => {
  openUrl.mockClear()
  canReachDesktop.mockReturnValue(true)
})

describe('PluginSource', () => {
  it('says whose plugins these are before offering the link', () => {
    // They are Python files the daemon executes, fetched from repositories
    // nobody here controls. Whose judgement is being relied on is the part
    // worth saying out loud.
    render(<PluginSource />)
    expect(screen.getByText(/hosted by the community/)).toBeInTheDocument()
    expect(screen.getByText(/does not review them/)).toBeInTheDocument()
  })

  it('opens the list in the system browser, not in the app', async () => {
    // rigseed's window has no address bar and no back button, so navigating
    // it to a third-party page strands the user in something that looks like
    // the app and is not.
    render(<PluginSource />)
    await userEvent.click(screen.getByRole('button', { name: 'Where to get plugins' }))
    expect(openUrl).toHaveBeenCalledWith('https://plugins.qbittorrent.org')
  })

  it('offers nothing when there is no desktop to ask', () => {
    // The rule every shell handoff follows: never offer what cannot happen.
    canReachDesktop.mockReturnValue(false)
    render(<PluginSource />)
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })
})
