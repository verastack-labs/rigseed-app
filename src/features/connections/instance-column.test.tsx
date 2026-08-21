import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { InstanceColumn } from '@/features/connections/instance-column'
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

const setup = (props: Partial<React.ComponentProps<typeof InstanceColumn>> = {}) => {
  const onSelect = vi.fn()
  const onAdd = vi.fn()
  render(
    <InstanceColumn
      builtIn={{ label: 'Built into rigseed', address: '127.0.0.1:43119' }}
      connections={[connection()]}
      selectedId={null}
      activeId={null}
      health="connected"
      onSelect={onSelect}
      onAdd={onAdd}
      {...props}
    />,
  )
  return { onSelect, onAdd }
}

describe('InstanceColumn', () => {
  it('always lists the built-in daemon, saved connections or not', () => {
    setup({ connections: [] })
    expect(screen.getByText('Built into rigseed')).toBeInTheDocument()
  })

  it('says what to do with an empty remote list rather than showing a blank', () => {
    setup({ connections: [] })
    expect(screen.getByText(/drive a qBittorrent running on another machine/)).toBeInTheDocument()
  })

  it('shows host and port under the name, since two can share a label', () => {
    setup()
    expect(screen.getByText('192.168.1.5:8080')).toBeInTheDocument()
  })

  it('marks the one in use, which is not the one being read', () => {
    // The distinction the whole screen turns on: clicking a row shows it, it
    // does not connect to it.
    setup({ selectedId: 'one', activeId: null })
    // Read: the remote one. In use: the built-in one.
    expect(screen.getByRole('button', { pressed: true })).toHaveTextContent('Home server')
    expect(screen.getByRole('button', { pressed: false })).toHaveTextContent('In use')
  })

  it('colours only the active row, since only it has been contacted', () => {
    // A green dot beside a connection nobody has spoken to would be a guess
    // presented as a fact.
    setup({ activeId: null, health: 'connected' })
    expect(screen.getByLabelText('connected')).toBeInTheDocument()
    expect(screen.getByLabelText('not in use')).toBeInTheDocument()
  })

  it('names the health rather than relying on the colour alone', () => {
    setup({ activeId: 'one', health: 'failed' })
    expect(screen.getByLabelText('not reachable')).toBeInTheDocument()
  })

  it('reports a selection by id, and the built-in one as null', async () => {
    const { onSelect } = setup()
    await userEvent.click(screen.getByText('Home server'))
    expect(onSelect).toHaveBeenCalledWith('one')
    await userEvent.click(screen.getByText('Built into rigseed'))
    expect(onSelect).toHaveBeenCalledWith(null)
  })

  it('asks for a new connection', async () => {
    const { onAdd } = setup()
    await userEvent.click(screen.getByTitle('Add a connection'))
    expect(onAdd).toHaveBeenCalled()
  })

  it('counts the built-in daemon in the total, because it is one', () => {
    setup({ connections: [] })
    expect(screen.getByText('1 instance')).toBeInTheDocument()
  })

  it('pluralises the count', () => {
    setup({ connections: [connection(), connection({ id: 'two', label: 'Seedbox' })] })
    expect(screen.getByText('3 instances')).toBeInTheDocument()
  })
})
