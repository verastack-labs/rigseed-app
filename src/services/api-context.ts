import { createContext, useContext } from 'react'

import type { Client } from '@/services/client'
import type { ConnectionState } from '@/services/connect'

/**
 * The contexts and the hooks that read them, apart from the provider.
 *
 * Split because a module exporting both a component and other things loses
 * fast refresh for the whole file: editing the provider would remount every
 * screen under it, which for a provider that logs in on mount means logging in
 * again on every save.
 */
export const ClientContext = createContext<Client | null>(null)
export const ConnectionContext = createContext<ConnectionState>({ status: 'connecting' })

export function useApi(): Client {
  const client = useContext(ClientContext)
  if (!client) throw new Error('useApi must be used inside an ApiProvider')
  return client
}

/** Whether the data on screen is real, and what to say if it is not. */
export function useConnection(): ConnectionState {
  return useContext(ConnectionContext)
}
