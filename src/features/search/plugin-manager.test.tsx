import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { PluginManager } from '@/features/search/plugin-manager'
import type { SearchPlugin } from '@/types/qbittorrent'

const plugins: SearchPlugin[] = [
  {
    name: 'lt',
    fullName: 'LinuxTracker',
    url: 'https://linuxtracker.org',
    version: '1.02',
    enabled: true,
    supportedCategories: [],
  },
  {
    name: 'ia',
    fullName: 'Internet Archive',
    url: 'https://archive.org',
    version: '2.11',
    enabled: false,
    supportedCategories: [],
  },
]

const setup = (props: Partial<React.ComponentProps<typeof PluginManager>> = {}) =>
  render(
    <PluginManager
      open
      onClose={vi.fn()}
      plugins={plugins}
      onInstall={vi.fn()}
      onToggle={vi.fn()}
      onUninstall={vi.fn()}
      onCheckUpdates={vi.fn()}
      {...props}
    />,
  )

const field = () => screen.getByLabelText('Plugin URL or path')

describe('PluginManager', () => {
  it('lists each plugin with its source and version', () => {
    setup()
    expect(screen.getByText('LinuxTracker')).toBeInTheDocument()
    expect(screen.getByText('https://linuxtracker.org')).toBeInTheDocument()
    expect(screen.getByText('1.02')).toBeInTheDocument()
  })

  it('shows which are on', () => {
    setup()
    expect(screen.getByLabelText('Enable LinuxTracker')).toHaveAttribute('aria-checked', 'true')
    expect(screen.getByLabelText('Enable Internet Archive')).toHaveAttribute(
      'aria-checked',
      'false',
    )
  })

  it('reports a toggle by name', () => {
    const onToggle = vi.fn()
    setup({ onToggle })
    fireEvent.click(screen.getByLabelText('Enable Internet Archive'))
    expect(onToggle).toHaveBeenCalledWith('ia', true)
  })

  it('will not install nothing', () => {
    const onInstall = vi.fn()
    setup({ onInstall })
    expect(screen.getByRole('button', { name: 'Install' })).toBeDisabled()
    fireEvent.change(field(), { target: { value: '   ' } })
    expect(screen.getByRole('button', { name: 'Install' })).toBeDisabled()
    expect(onInstall).not.toHaveBeenCalled()
  })

  it('installs on Enter as well as on the button, and clears the field', () => {
    const onInstall = vi.fn()
    setup({ onInstall })
    fireEvent.change(field(), { target: { value: 'https://example.org/x.py' } })
    fireEvent.keyDown(field(), { key: 'Enter' })

    expect(onInstall).toHaveBeenCalledWith('https://example.org/x.py')
    expect(field()).toHaveValue('')
  })

  it('uninstalls without a confirmation', () => {
    // The plugin is a file the daemon can fetch again from the URL shown
    // next to the button, so a mistaken click costs one paste, not data.
    const onUninstall = vi.fn()
    setup({ onUninstall })
    fireEvent.click(screen.getByTitle('Uninstall LinuxTracker'))
    expect(onUninstall).toHaveBeenCalledWith('lt')
  })

  it('explains what a plugin is when there are none', () => {
    // Not a thing anybody guesses from the word "plugin", and without one
    // the whole screen has nothing to do.
    setup({ plugins: [] })
    expect(screen.getByText('No plugins installed')).toBeInTheDocument()
    expect(screen.getByText(/Python file that teaches the client/)).toBeInTheDocument()
  })

  it('counts installed against enabled', () => {
    setup()
    expect(screen.getByText('2 installed · 1 enabled')).toBeInTheDocument()
  })

  it('locks the write actions while one is in flight', () => {
    setup({ busy: true })
    expect(screen.getByRole('button', { name: 'Check updates' })).toBeDisabled()
  })
})
