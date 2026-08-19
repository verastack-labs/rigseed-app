import type { GlobalTransferInfo } from '@/types/qbittorrent'
import type { Transport } from '@/services/transport'

/** Global speeds, session totals, limits and the alternative-limits switch. */
export function createTransferApi(transport: Transport) {
  return {
    info: () => transport.get<GlobalTransferInfo>('transfer/info'),
    speedLimitsMode: () => transport.get<'0' | '1'>('transfer/speedLimitsMode'),
    toggleSpeedLimitsMode: () => transport.post<void>('transfer/toggleSpeedLimitsMode'),
    setDownloadLimit: (limit: number) =>
      transport.post<void>('transfer/setDownloadLimit', { limit }),
    setUploadLimit: (limit: number) => transport.post<void>('transfer/setUploadLimit', { limit }),

    /**
     * Bans peer addresses for the whole session.
     *
     * Under `transfer`, which is not where it reads like it belongs: it was
     * written as `app/banPeers` on that reasoning and the daemon answered 404.
     * The scope reasoning was right and the controller was not. A banned
     * address is refused everywhere, not for the torrent whose row was
     * clicked, which is worth knowing before offering it from one.
     */
    banPeers: (peers: readonly string[]) =>
      transport.post<void>('transfer/banPeers', { peers: peers.join('|') }),
  }
}

export type TransferApi = ReturnType<typeof createTransferApi>
