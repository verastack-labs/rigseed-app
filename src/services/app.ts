import type { Transport } from '@/services/transport'

/** Version, build info and the full preferences get/set. */
export function createAppApi(transport: Transport) {
  return {
    version: () => transport.get<string>('app/version'),
    webapiVersion: () => transport.get<string>('app/webapiVersion'),
    defaultSavePath: () => transport.get<string>('app/defaultSavePath'),
    preferences: () => transport.get<Record<string, unknown>>('app/preferences'),
    /** Sends only the changed keys, which is what the save bar collects. */
    setPreferences: (changed: Record<string, unknown>) =>
      transport.post<void>('app/setPreferences', { json: JSON.stringify(changed) }),
  }
}

export type AppApi = ReturnType<typeof createAppApi>
