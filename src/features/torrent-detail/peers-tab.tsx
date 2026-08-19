import { useState } from 'react'

import { ContextMenu } from '@/components/ui/context-menu'
import { ProgressBar } from '@/components/ui/progress-bar'
import { SectionHeader } from '@/components/ui/section-header'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import type { Peer } from '@/types/qbittorrent'
import { formatPercent, formatSpeed } from '@/utils/format'

export interface PeersTabProps {
  /** Keyed by `ip:port`. Null until the first `sync/torrentPeers` answers. */
  peers: Record<string, Peer> | null
  onBan: (key: string) => void
}

/** Where the right-click menu opened, and for which peer. */
interface MenuAt {
  key: string
  x: number
  y: number
}

export function PeersTab({ peers, onBan }: PeersTabProps) {
  const [menu, setMenu] = useState<MenuAt | null>(null)

  if (!peers) {
    return (
      <div className="p-6">
        <Skeleton rows={5} rowHeight={32} />
      </div>
    )
  }

  const entries = Object.entries(peers)

  return (
    <div className="flex flex-col gap-2.5 p-6">
      <div className="flex items-center gap-2.5">
        <SectionHeader>Peers</SectionHeader>
        <span className="font-mono text-[10.5px] text-text-dimmer">
          {entries.length} connected · from sync/torrentPeers
        </span>
        <span className="flex-1" />
        <span className="font-mono text-[10.5px] text-text-dimmer">right-click a row to ban</span>
      </div>

      <div className="overflow-hidden rounded-[11px] border border-line">
        <div className="grid grid-cols-[190px_1fr_170px_110px_110px] gap-2 border-b border-line bg-surface2 px-3 py-2 text-[10px] font-bold tracking-[0.08em] text-text-dimmer uppercase">
          <span>IP</span>
          <span>Client</span>
          <span>Progress</span>
          <span className="text-right">Down</span>
          <span className="text-right">Up</span>
        </div>

        {entries.map(([key, peer]) => (
          <div
            key={key}
            onContextMenu={(event) => {
              event.preventDefault()
              setMenu({ key, x: event.clientX, y: event.clientY })
            }}
            className="grid grid-cols-[190px_1fr_170px_110px_110px] items-center gap-2 border-t border-line px-3 py-2 transition-colors duration-fast first:border-t-0 hover:bg-surface2"
          >
            <div className="flex min-w-0 items-center gap-2">
              {peer.country_code ? (
                <span
                  title={peer.country ?? peer.country_code}
                  className="shrink-0 rounded bg-surface2 px-1.5 py-0.5 font-mono text-[9px] font-bold text-text-dimmer uppercase"
                >
                  {peer.country_code}
                </span>
              ) : null}
              <span className="truncate font-mono text-[11.5px] text-text">{peer.ip}</span>
            </div>

            <span title={peer.client} className="truncate text-[11.5px] text-text-dim">
              {peer.client || 'unknown'}
            </span>

            <div className="flex items-center gap-2">
              {/* accent2 rather than accent: this is what the peer has, not
                  what we have, and the two bars are next to each other on the
                  same screen. */}
              <ProgressBar
                className="flex-1"
                height={4}
                tone="accent2"
                value={peer.progress * 100}
                label={`${peer.ip} progress`}
              />
              <span className="shrink-0 font-mono text-[10.5px] text-text-dim">
                {formatPercent(peer.progress)}
              </span>
            </div>

            <span
              className={cn(
                'text-right font-mono text-[10.5px]',
                peer.dl_speed > 0 ? 'text-accent' : 'text-text-dimmer',
              )}
            >
              {formatSpeed(peer.dl_speed)}
            </span>
            <span
              className={cn(
                'text-right font-mono text-[10.5px]',
                peer.up_speed > 0 ? 'text-accent2' : 'text-text-dimmer',
              )}
            >
              {formatSpeed(peer.up_speed)}
            </span>
          </div>
        ))}
      </div>

      {menu ? (
        <div className="fixed z-50" style={{ left: menu.x, top: menu.y }}>
          <ContextMenu
            open
            label={menu.key}
            onClose={() => setMenu(null)}
            items={[
              {
                label: `Ban ${menu.key.split(':')[0]}`,
                danger: true,
                onSelect: () => onBan(menu.key),
              },
            ]}
          />
        </div>
      ) : null}
    </div>
  )
}
