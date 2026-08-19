import type { MainData } from '@/types/qbittorrent'
import type { Transport } from '@/services/transport'

/**
 * sync/maindata is the backbone of every live number in the UI.
 *
 * Pass the `rid` from the previous response to get a diff. Pass 0, or nothing,
 * to get a full snapshot. The daemon may answer any request with
 * `full_update: true` if it cannot produce a diff, so a caller must always
 * handle a replace even when it asked for a delta.
 */
export function createSyncApi(transport: Transport) {
  return {
    maindata: (rid = 0) => transport.get<MainData>('sync/maindata', { rid }),
    torrentPeers: (hash: string, rid = 0) =>
      transport.get<unknown>('sync/torrentPeers', { hash, rid }),
  }
}

export type SyncApi = ReturnType<typeof createSyncApi>
