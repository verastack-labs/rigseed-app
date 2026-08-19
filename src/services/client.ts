import { createAppApi } from '@/services/app'
import { createSyncApi } from '@/services/sync'
import { createTorrentsApi } from '@/services/torrents'
import { createTransferApi } from '@/services/transfer'
import type { Transport } from '@/services/transport'

/**
 * One client per connection, assembled from the namespace modules.
 *
 * The namespaces mirror the API's own, so a screen printing
 * `torrents/add / app/preferences` in its footer can be checked against the
 * calls it actually makes.
 */
export function createClient(transport: Transport) {
  return {
    app: createAppApi(transport),
    sync: createSyncApi(transport),
    torrents: createTorrentsApi(transport),
    transfer: createTransferApi(transport),
  }
}

export type Client = ReturnType<typeof createClient>
