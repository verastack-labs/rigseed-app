import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { InstanceColumn, type Instance } from '@/features/connections/instance-column'

const builtIn = (over: Partial<Instance> = {}): Instance => ({
  id: null,
  label: 'Built into rigseed',
  host: '127.0.0.1:43880',
  status: 'online',
  meta: 'active now',
  bundled: true,
  ...over,
})

const remote = (over: Partial<Instance> = {}): Instance => ({
  id: 'one',
  label: 'Home NAS',
  host: '192.168.1.5:8080',
  status: 'unknown',
  meta: 'not tested',
  bundled: false,
  ...over,
})

const setup = (props: Partial<React.ComponentProps<typeof InstanceColumn>> = {}) => {
  const onSelect = vi.fn()
  const onAdd = vi.fn()
  render(
    <InstanceColumn
      instances={[builtIn(), remote()]}
      selectedId={null}
      activeId={null}
      adding={false}
      onSelect={onSelect}
      onAdd={onAdd}
      {...props}
    />,
  )
  return { onSelect, onAdd }
}

describe('InstanceColumn', () => {
  it('says what the screen is for, not just what it is called', () => {
    setup()
    expect(screen.getByText(/Every instance this app can drive/)).toBeInTheDocument()
  })

  it('marks the bundled instance, which cannot be moved or removed', () => {
    setup()
    expect(screen.getByText('Bundled')).toBeInTheDocument()
  })

  it('shows host and port under the name, since two can share a label', () => {
    setup()
    expect(screen.getByText('192.168.1.5:8080')).toBeInTheDocument()
  })

  it('separates the row being read from the one in use', () => {
    // The distinction the whole screen turns on: clicking a row shows it, it
    // does not connect to it.
    setup({ selectedId: 'one', activeId: null })
    expect(screen.getByRole('button', { pressed: true })).toHaveTextContent('Home NAS')
    expect(screen.getByRole('button', { pressed: false })).toHaveTextContent('Built into rigseed')
  })

  it('drops the selection marker while a new connection is being written', () => {
    setup({ selectedId: null, adding: true })
    expect(screen.queryByRole('button', { pressed: true })).not.toBeInTheDocument()
  })

  it('calls an untested connection untested rather than offline', () => {
    // Offline is a claim about the far end. Nobody has asked it anything.
    setup({ instances: [remote({ status: 'unknown' })] })
    expect(screen.getByText('Not tested')).toBeInTheDocument()
  })

  it('names a refused connection in words, not only in colour', () => {
    setup({ instances: [remote({ status: 'refused' })] })
    expect(screen.getByText('Refused')).toBeInTheDocument()
  })

  it('names an offline connection the same way', () => {
    setup({ instances: [remote({ status: 'offline' })] })
    expect(screen.getByText('Offline')).toBeInTheDocument()
  })

  it('shows when each was last heard from', () => {
    setup({ instances: [builtIn({ meta: 'active now' }), remote({ meta: '2m ago' })] })
    expect(screen.getByText('active now')).toBeInTheDocument()
    expect(screen.getByText('2m ago')).toBeInTheDocument()
  })

  it('reports a selection by id, and the bundled one as null', async () => {
    const { onSelect } = setup()
    await userEvent.click(screen.getByText('Home NAS'))
    expect(onSelect).toHaveBeenCalledWith('one')
    await userEvent.click(screen.getByText('Built into rigseed'))
    expect(onSelect).toHaveBeenCalledWith(null)
  })

  it('asks for a new connection', async () => {
    const { onAdd } = setup()
    await userEvent.click(screen.getByRole('button', { name: 'Add a connection' }))
    expect(onAdd).toHaveBeenCalled()
  })

  it('counts the connections and says how many are bundled', () => {
    setup()
    expect(screen.getByText('2 connections · 1 bundled')).toBeInTheDocument()
  })

  it('pluralises the count', () => {
    setup({ instances: [builtIn()] })
    expect(screen.getByText('1 connection · 1 bundled')).toBeInTheDocument()
  })

  it('says where the list and the passwords live', () => {
    setup()
    expect(screen.getByText('app-local · keychain')).toBeInTheDocument()
  })
})
