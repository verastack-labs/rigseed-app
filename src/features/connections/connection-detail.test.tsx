import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { ConnectionDetail, type TestResult } from '@/features/connections/connection-detail'
import { emptyDraft, type ConnectionDraft } from '@/state/connection-store'

const draft = (over: Partial<ConnectionDraft> = {}): ConnectionDraft => ({
  ...emptyDraft(),
  label: 'Home NAS',
  host: '192.168.1.5',
  ...over,
})

const passed: TestResult = {
  ok: true,
  version: 'v5.2.3',
  webApiVersion: '2.15.1',
  torrents: 4,
  network: 'connected',
  at: 0,
}

const setup = (props: Partial<React.ComponentProps<typeof ConnectionDetail>> = {}) => {
  const handlers = {
    onPasswordChange: vi.fn(),
    onChange: vi.fn(),
    onTest: vi.fn(),
    onMakeActive: vi.fn(),
    onSave: vi.fn(),
    onRemove: vi.fn(),
  }
  render(
    <ConnectionDetail
      draft={draft()}
      locked={false}
      adding={false}
      active={false}
      dirty={false}
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
  it('reports an edit rather than holding its own copy', async () => {
    const { onChange } = setup()
    await userEvent.type(screen.getByLabelText('Host'), '9')
    expect(onChange).toHaveBeenCalledWith({ host: '192.168.1.59' })
  })

  it('sends the port as a number, not as the string the input gives', async () => {
    // `port` is compared and range checked. A string sails through both and
    // then builds an address nothing answers on.
    const { onChange } = setup()
    await userEvent.type(screen.getByLabelText('Port'), '1')
    expect(onChange).toHaveBeenLastCalledWith({ port: 80801 })
    expect(typeof onChange.mock.lastCall?.[0]?.port).toBe('number')
  })

  it('locks the address of the bundled instance, and says why', () => {
    setup({ locked: true })
    expect(screen.getByLabelText('Host')).toBeDisabled()
    expect(screen.getByLabelText('Port')).toBeDisabled()
    expect(screen.getByText(/cannot be moved or removed/)).toBeInTheDocument()
  })

  it('hides authentication entirely for the bundled instance', () => {
    // rigseed generated that login. There is nothing in it to fill in.
    setup({ locked: true })
    expect(screen.queryByText('Authentication')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Username')).not.toBeInTheDocument()
  })

  it('hides the login fields when there is no login to do', () => {
    setup({ draft: draft({ requiresAuth: false }) })
    expect(screen.getByText('Authentication')).toBeInTheDocument()
    expect(screen.queryByLabelText('Username')).not.toBeInTheDocument()
  })

  it('says the password goes to the keychain', () => {
    setup({ keychain: true })
    expect(screen.getByText(/stored in the system keychain/)).toBeInTheDocument()
  })

  it('says so plainly when there is no keychain to write to', () => {
    setup({ keychain: false })
    expect(screen.getByText(/this session only/)).toBeInTheDocument()
  })

  it('keeps the password out of the draft it is editing', async () => {
    const { onPasswordChange, onChange } = setup()
    await userEvent.type(screen.getByLabelText('Password'), 'hunter2')
    expect(onPasswordChange).toHaveBeenCalled()
    expect(onChange).not.toHaveBeenCalled()
  })

  it('will not save when nothing was changed', () => {
    // Save is the only thing that writes, so an always-enabled one gives no
    // signal about whether an edit is still pending.
    setup({ dirty: false })
    expect(screen.getByRole('button', { name: 'Save changes' })).toBeDisabled()
  })

  it('saves once something is different', () => {
    setup({ dirty: true })
    expect(screen.getByRole('button', { name: 'Save changes' })).toBeEnabled()
  })

  it('reads as adding rather than editing when the connection is new', () => {
    setup({ adding: true, draft: emptyDraft() })
    expect(screen.getByText('New connection')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Add connection' })).toBeEnabled()
    expect(screen.queryByRole('button', { name: /Remove/ })).not.toBeInTheDocument()
  })

  it('has no stats to show before anything has been contacted', () => {
    setup({ adding: true, draft: emptyDraft() })
    expect(screen.queryByText('Last contact')).not.toBeInTheDocument()
  })

  it('says a test changes nothing, before anybody has run one', () => {
    setup({ test: null })
    expect(screen.getByText(/changes\s+nothing on either side/)).toBeInTheDocument()
  })

  it('reports what the daemon said when a test worked', () => {
    setup({ test: passed })
    expect(screen.getByText('v5.2.3')).toBeInTheDocument()
    expect(screen.getByText('2.15.1')).toBeInTheDocument()
    expect(screen.getByText('4')).toBeInTheDocument()
    expect(screen.getByText('Connected')).toBeInTheDocument()
  })

  it("reports the daemon's own words, and which step gave up, on failure", () => {
    // The reason separates a wrong password from a closed port; the endpoint
    // separates "not qBittorrent" from "wrong password".
    setup({
      test: {
        ok: false,
        reason: 'The daemon rejected those credentials.',
        endpoint: 'auth/login → 403',
        at: 0,
      },
    })
    expect(screen.getByText('The daemon rejected those credentials.')).toBeInTheDocument()
    expect(screen.getByText('auth/login → 403')).toBeInTheDocument()
    expect(screen.queryByText('Last contact')).not.toBeInTheDocument()
  })

  it('marks the test as running, so nobody presses it twice', async () => {
    const { onTest } = setup({ testing: true })
    const button = screen.getByRole('button', { name: 'Testing…' })
    expect(button).toBeDisabled()
    await userEvent.click(button)
    expect(onTest).not.toHaveBeenCalled()
  })

  it('offers Test again once there is a result to replace', () => {
    setup({ test: passed })
    expect(screen.getByRole('button', { name: 'Test again' })).toBeInTheDocument()
  })

  it('offers to switch to a connection not in use', async () => {
    const { onMakeActive } = setup({ active: false })
    await userEvent.click(screen.getByRole('button', { name: 'Make active' }))
    expect(onMakeActive).toHaveBeenCalled()
  })

  it('drops the switch button for the one already in use', () => {
    setup({ active: true })
    expect(screen.queryByRole('button', { name: 'Make active' })).not.toBeInTheDocument()
  })

  it('can switch to the bundled instance too', async () => {
    // Getting back to the local one has to be possible from here, or a bad
    // remote connection is a dead end.
    const { onMakeActive } = setup({ locked: true, active: false })
    await userEvent.click(screen.getByRole('button', { name: 'Make active' }))
    expect(onMakeActive).toHaveBeenCalled()
  })

  it('will not offer to remove the bundled instance, and says so', () => {
    setup({ locked: true })
    expect(screen.queryByRole('button', { name: /Remove/ })).not.toBeInTheDocument()
    expect(screen.getByText('the bundled instance cannot be removed')).toBeInTheDocument()
  })

  it('says what removing does before it is pressed', () => {
    setup()
    expect(screen.getByText(/nothing on that machine changes/)).toBeInTheDocument()
  })
})
