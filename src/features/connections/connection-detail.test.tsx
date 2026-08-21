import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { ConnectionDetail } from '@/features/connections/connection-detail'
import type { Connection } from '@/state/connection-store'

const connection = (over: Partial<Connection> = {}): Connection => ({
  id: 'one',
  label: 'Home server',
  host: '192.168.1.5',
  port: 8080,
  https: false,
  path: '',
  username: 'admin',
  requiresAuth: true,
  ...over,
})

const setup = (props: Partial<React.ComponentProps<typeof ConnectionDetail>> = {}) => {
  const handlers = {
    onPasswordChange: vi.fn(),
    onChange: vi.fn(),
    onTest: vi.fn(),
    onMakeActive: vi.fn(),
    onRemove: vi.fn(),
  }
  render(
    <ConnectionDetail
      connection={connection()}
      builtIn={{ label: 'Built into rigseed', address: '127.0.0.1:43119' }}
      active={false}
      health="connected"
      test={null}
      testing={false}
      password=""
      keychain
      {...handlers}
      {...props}
    />,
  )
  return handlers
}

describe('ConnectionDetail', () => {
  it('shows the full base URL, which is what requests are built on', () => {
    setup({ connection: connection({ https: true, port: 8443, path: '/qbt' }) })
    expect(screen.getByText('https://192.168.1.5:8443/qbt')).toBeInTheDocument()
  })

  it('answers whether this is the one running the app before anything else', () => {
    setup({ active: false })
    expect(screen.getByText('Saved, not in use')).toBeInTheDocument()
    setup({ active: true, health: 'connected' })
    expect(screen.getByText('In use, connected')).toBeInTheDocument()
  })

  it('does not claim health for a connection nobody is using', () => {
    // health is only meaningful for the active one, and painting a saved row
    // green because the active one is fine would be a lie.
    setup({ active: false, health: 'connected' })
    expect(screen.queryByText(/In use/)).not.toBeInTheDocument()
  })

  it('reports an edit rather than holding its own copy', async () => {
    const { onChange } = setup()
    await userEvent.type(screen.getByLabelText('Host'), '9')
    expect(onChange).toHaveBeenCalledWith({ host: '192.168.1.59' })
  })

  it('sends the port as a number, not as the string the input gives', async () => {
    // `port` is compared and range checked. A string sails through both and
    // then builds `http://host:8080undefined`.
    const { onChange } = setup()
    await userEvent.type(screen.getByLabelText('Port'), '1')
    expect(onChange).toHaveBeenLastCalledWith({ port: 80801 })
    expect(typeof onChange.mock.lastCall?.[0]?.port).toBe('number')
  })

  it('hides the login fields when there is no login to do', () => {
    // Asking for a credential that is never sent implies it matters.
    setup({ connection: connection({ requiresAuth: false }) })
    expect(screen.queryByLabelText('Username')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Password')).not.toBeInTheDocument()
  })

  it('says where the password goes, and says so differently when nowhere', () => {
    setup({ keychain: true })
    expect(screen.getByText(/system keychain/)).toBeInTheDocument()
    setup({ keychain: false })
    expect(screen.getByText(/this session only/)).toBeInTheDocument()
  })

  it('keeps the password out of the connection it is editing', async () => {
    const { onPasswordChange, onChange } = setup()
    await userEvent.type(screen.getByLabelText('Password'), 'hunter2')
    expect(onPasswordChange).toHaveBeenCalled()
    expect(onChange).not.toHaveBeenCalled()
  })

  it('offers no fields for the built-in daemon, and says why', () => {
    setup({ connection: null })
    expect(screen.queryByLabelText('Host')).not.toBeInTheDocument()
    expect(screen.getByText(/picks a free port at every launch/)).toBeInTheDocument()
  })

  it('will not offer to remove the built-in daemon', () => {
    // A button that could only ever be greyed out is worse than no button.
    setup({ connection: null })
    expect(screen.queryByRole('button', { name: /Remove/ })).not.toBeInTheDocument()
    setup({ connection: connection() })
    expect(screen.getByRole('button', { name: /Remove/ })).toBeInTheDocument()
  })

  it('says a test changes nothing, before anybody has run one', () => {
    setup({ test: null })
    expect(screen.getByText(/changes\s+nothing on either side/)).toBeInTheDocument()
  })

  it('reports what the daemon said when a test worked', () => {
    setup({ test: { ok: true, version: 'v5.2.3', webApiVersion: '2.11.4', at: 0 } })
    expect(screen.getByText(/qBittorrent v5\.2\.3 · Web API 2\.11\.4/)).toBeInTheDocument()
  })

  it("reports the daemon's own words when a test failed", () => {
    // The reason is the only thing that tells a wrong password apart from a
    // closed port, and it comes from the far end.
    setup({ test: { ok: false, reason: 'The daemon rejected those credentials.', at: 0 } })
    expect(screen.getByText('The daemon rejected those credentials.')).toBeInTheDocument()
  })

  it('marks the test as running, so nobody presses it twice', async () => {
    const { onTest } = setup({ testing: true })
    const button = screen.getByRole('button', { name: 'Testing…' })
    expect(button).toBeDisabled()
    await userEvent.click(button)
    expect(onTest).not.toHaveBeenCalled()
  })

  it('cannot make the active connection active again', () => {
    setup({ active: true })
    expect(screen.getByRole('button', { name: 'In use' })).toBeDisabled()
  })

  it('offers to switch to one that is not in use', async () => {
    const { onMakeActive } = setup({ active: false })
    await userEvent.click(screen.getByRole('button', { name: 'Make active' }))
    expect(onMakeActive).toHaveBeenCalled()
  })

  it('can switch to the built-in daemon too', async () => {
    // Getting back to the local one has to be possible from here, or a bad
    // remote connection is a dead end.
    const { onMakeActive } = setup({ connection: null, active: false })
    await userEvent.click(screen.getByRole('button', { name: 'Make active' }))
    expect(onMakeActive).toHaveBeenCalled()
  })
})
