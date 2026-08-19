import { createAppApi } from '@/services/app'
import { createAuthApi } from '@/services/auth'
import { createSyncApi } from '@/services/sync'
import { createTorrentsApi, DEFAULT_CAPABILITIES, type Capabilities } from '@/services/torrents'
import { createTransferApi } from '@/services/transfer'
import type { Transport } from '@/services/transport'

/**
 * One client per connection, assembled from the namespace modules.
 *
 * The namespaces mirror the API's own, so a screen printing
 * `torrents/add / app/preferences` in its footer can be checked against the
 * calls it actually makes.
 */
export function createClient(transport: Transport, caps: Capabilities = DEFAULT_CAPABILITIES) {
  return {
    app: createAppApi(transport),
    auth: createAuthApi(transport),
    sync: createSyncApi(transport),
    torrents: createTorrentsApi(transport, caps),
    transfer: createTransferApi(transport),
  }
}

export type Client = ReturnType<typeof createClient>
