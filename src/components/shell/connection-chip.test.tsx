import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { ConnectionChip } from '@/components/shell/connection-chip'
import { createClient } from '@/services/client'
import type { ConnectionState } from '@/services/connect'
import { createMockTransport } from '@/services/mock-transport'

const client = createClient(createMockTransport({ torrentCount: 1 }))

const connected: ConnectionState = {
  status: 'connected',
  client,
  version: 'v5.2.3',
  webApiVersion: '2.11.2',
  label: '127.0.0.1:8080',
}

describe('ConnectionChip', () => {
  it('names the daemon it is talking to', () => {
    render(<ConnectionChip state={connected} />)
    expect(screen.getByText('127.0.0.1:8080')).toBeInTheDocument()
  })

  it('says so when the data is not real', () => {
    // This slot printed 127.0.0.1:8080 unconditionally, beside a green icon,
    // whether or not a daemon had ever answered. Falling back to sample data
    // is reasonable; claiming a connection while doing it is not.
    render(<ConnectionChip state={{ status: 'mock', client, reason: 'No daemon configured.' }} />)

    expect(screen.getByText('Sample data')).toBeInTheDocument()
    expect(screen.queryByText('127.0.0.1:8080')).not.toBeInTheDocument()
  })

  it('carries the reason where a pointer can find it', () => {
    render(
      <ConnectionChip state={{ status: 'mock', client, reason: 'The daemon rejected those.' }} />,
    )
    expect(screen.getByRole('button')).toHaveAttribute('title', 'The daemon rejected those.')
  })

  it('reports the versions for a real connection', () => {
    render(<ConnectionChip state={connected} />)
    expect(screen.getByRole('button')).toHaveAttribute(
      'title',
      'qBittorrent v5.2.3, Web API 2.11.2',
    )
  })

  it('distinguishes still trying from given up', () => {
    // Different things, and only one of them means the numbers on screen are
    // invented.
    render(<ConnectionChip state={{ status: 'connecting' }} />)
    expect(screen.getByText('Connecting…')).toBeInTheDocument()
  })
})
