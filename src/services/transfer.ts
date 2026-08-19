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
  }
}

export type TransferApi = ReturnType<typeof createTransferApi>
