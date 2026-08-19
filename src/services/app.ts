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

    /**
     * Bans peers for the whole session, not for one torrent.
     *
     * Under `app` rather than `torrents` because that is where it lives and
     * what it means: a banned address is refused everywhere, which is worth
     * knowing before offering it from a per-torrent row.
     */
    banPeers: (peers: readonly string[]) =>
      transport.post<void>('app/banPeers', { peers: peers.join('|') }),
  }
}

export type AppApi = ReturnType<typeof createAppApi>
