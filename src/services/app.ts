import type { PreferenceChanges, Preferences } from '@/types/qbittorrent'
import type { Transport } from '@/services/transport'

/** Version, build info and the full preferences get/set. */
export function createAppApi(transport: Transport) {
  return {
    version: () => transport.get<string>('app/version'),
    webapiVersion: () => transport.get<string>('app/webapiVersion'),
    defaultSavePath: () => transport.get<string>('app/defaultSavePath'),
    preferences: () => transport.get<Preferences>('app/preferences'),
    /** Sends only the changed keys, which is what the save bar collects. */
    setPreferences: (changed: PreferenceChanges) =>
      transport.post<void>('app/setPreferences', { json: JSON.stringify(changed) }),
  }
}

export type AppApi = ReturnType<typeof createAppApi>
