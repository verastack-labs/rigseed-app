import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { STARTER_PLUGINS } from '@/features/search/starter-plugin-list'
import { StarterPlugins } from '@/features/search/starter-plugins'

const setup = (installed: readonly string[] = []) => {
  const onInstall = vi.fn<(sources: readonly string[]) => void>()
  const view = render(<StarterPlugins installed={installed} onInstall={onInstall} />)
  return { onInstall, view }
}

describe('StarterPlugins', () => {
  it('offers every plugin the daemon does not already have', () => {
    setup()
    for (const plugin of STARTER_PLUGINS) {
      expect(screen.getByText(plugin.label)).toBeInTheDocument()
    }
  })

  it('names the site each one searches', () => {
    // The label is the plugin's name for itself and does not always give the
    // domain away: "EZTV" is eztvx.to, and the two are worth telling apart
    // before a request leaves the machine.
    setup()
    expect(screen.getByText('eztvx.to')).toBeInTheDocument()
  })

  it('drops the ones already installed rather than greying them out', () => {
    // This is scaffolding for an empty list. A permanent panel of disabled
    // buttons is the opposite of getting out of the way.
    setup(['piratebay'])
    expect(screen.queryByText('The Pirate Bay')).not.toBeInTheDocument()
    expect(screen.getByText('EZTV')).toBeInTheDocument()
  })

  it('disappears once all of them are in', () => {
    const { view } = setup(STARTER_PLUGINS.map((plugin) => plugin.name))
    expect(view.container).toBeEmptyDOMElement()
  })

  it('installs one by its raw file URL', async () => {
    // `installPlugin` fetches whatever it is handed, so a GitHub page URL
    // would install an HTML document as a plugin.
    const { onInstall } = setup()
    await userEvent.click(screen.getByRole('button', { name: 'Install The Pirate Bay' }))
    expect(onInstall).toHaveBeenCalledWith([
      'https://raw.githubusercontent.com/qbittorrent/search-plugins/master/nova3/engines/piratebay.py',
    ])
  })

  it('installs the rest in one call rather than one per plugin', async () => {
    // `sources` is newline separated and takes any number, so seven installs
    // are one request and one refresh rather than seven of each.
    const { onInstall } = setup(['piratebay'])
    await userEvent.click(screen.getByRole('button', { name: /Install all/ }))
    const [sources] = onInstall.mock.calls[0]!
    expect(sources).toHaveLength(STARTER_PLUGINS.length - 1)
    expect(sources.some((one) => one.includes('piratebay'))).toBe(false)
  })

  it('counts what installing all of them would do', () => {
    setup(['piratebay', 'eztv'])
    expect(
      screen.getByRole('button', { name: `Install all ${STARTER_PLUGINS.length - 2}` }),
    ).toBeInTheDocument()
  })

  it('says whose plugins these are before offering to run them', () => {
    // They are still Python files the daemon executes. What changes against
    // an arbitrary community plugin is whose judgement is being relied on,
    // and that is the part worth naming.
    setup()
    expect(screen.getByText(/qBittorrent’s own repository/)).toBeInTheDocument()
    expect(screen.getByText(/does not review them/)).toBeInTheDocument()
  })

  it('does not offer Jackett', () => {
    // It is in the same upstream directory and is the one entry that does
    // nothing on its own: it bridges to a separate Jackett server that has to
    // be installed, running, and written into the plugin's config first. A
    // one-click install of it looks like rigseed returning no results.
    setup()
    expect(screen.queryByText(/Jackett/i)).not.toBeInTheDocument()
    expect(STARTER_PLUGINS.map((plugin) => plugin.name)).not.toContain('jackett')
  })

  it('goes quiet while a write is in flight', async () => {
    // Two installs of the same plugin race on the daemon's own file, and the
    // list is re-read after each write, so a second click during the first
    // acts on a list that is about to change underneath it.
    const onInstall = vi.fn<(sources: readonly string[]) => void>()
    render(<StarterPlugins installed={[]} onInstall={onInstall} busy />)
    await userEvent.click(screen.getByRole('button', { name: /Install all/ }))
    expect(onInstall).not.toHaveBeenCalled()
  })
})
