import { createContext, useContext, useMemo } from 'react'
import type { ReactNode } from 'react'

import { createClient, type Client } from '@/services/client'
import { createMockTransport } from '@/services/mock-transport'
import { createHttpTransport } from '@/services/transport'

const ClientContext = createContext<Client | null>(null)

export interface ApiProviderProps {
  /** Omit to use the mock daemon. */
  baseUrl?: string
  children: ReactNode
}

/**
 * Supplies the API client.
 *
 * With no base URL it wires the mock, which is what lets every screen be built
 * and reviewed before a real daemon is reachable. Swapping to the real one is
 * a prop, not a rewrite, because both sides implement the same transport.
 */
export function ApiProvider({ baseUrl, children }: ApiProviderProps) {
  const client = useMemo(
    () => createClient(baseUrl ? createHttpTransport({ baseUrl }) : createMockTransport()),
    [baseUrl],
  )
  return <ClientContext.Provider value={client}>{children}</ClientContext.Provider>
}

export function useApi(): Client {
  const client = useContext(ClientContext)
  if (!client) throw new Error('useApi must be used inside an ApiProvider')
  return client
}
