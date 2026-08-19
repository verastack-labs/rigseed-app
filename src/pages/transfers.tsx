import { useState } from 'react'

import { TransfersToolbar } from '@/components/shell/transfers-toolbar'
import { Card } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { DataValue } from '@/components/ui/data-value'
import { ProgressBar } from '@/components/ui/progress-bar'
import { SectionHeader } from '@/components/ui/section-header'
import { Sparkline } from '@/components/ui/sparkline'
import { StatusDot } from '@/components/ui/status-dot'
import { icons } from '@/lib/icons'

const DOWN = [2, 5, 3, 8, 12, 9, 14, 11, 18, 22, 19, 24, 21, 26, 30, 28, 33, 31, 29, 34]
const UP = [1, 1, 2, 2, 3, 2, 4, 3, 5, 4, 6, 5, 7, 6, 8, 7, 9, 8, 7, 9]

const TORRENTS = [
  {
    name: 'ubuntu-24.04.2-desktop-amd64.iso',
    pct: 64,
    down: '12.4 MB/s',
    up: '1.8 MB/s',
    state: 'downloading' as const,
  },
  {
    name: 'debian-12.9.0-amd64-netinst.iso',
    pct: 100,
    down: '0 B/s',
    up: '640 KB/s',
    state: 'seeding' as const,
  },
  {
    name: 'archlinux-2026.08.01-x86_64.iso',
    pct: 23,
    down: '0 B/s',
    up: '0 B/s',
    state: 'paused' as const,
  },
]

/**
 * A slice of the real Transfers screen, enough to prove the shell and the
 * component layer render together under every palette. The full screen with
 * its three layouts, filters and toolbar arrives with M3.
 */
export function Transfers() {
  const [selected, setSelected] = useState<readonly string[]>([])

  const toggle = (name: string) =>
    setSelected((prev) => (prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name]))

  return (
    <div className="flex h-full">
      <aside className="flex w-[236px] shrink-0 flex-col gap-4 overflow-auto border-r border-line bg-sidebar px-3 py-3.5">
        <div className="flex flex-col gap-1.5">
          <SectionHeader>Status</SectionHeader>
          {['All torrents', 'Downloading', 'Seeding', 'Paused'].map((s, i) => (
            <button
              key={s}
              type="button"
              className={`flex items-center gap-2.5 rounded-md px-[9px] py-2 text-left text-[12.5px] transition-colors duration-quick ${
                i === 0 ? 'bg-accent-soft font-semibold text-accent' : 'text-text hover:bg-surface2'
              }`}
            >
              <icons.folder className="size-[15px] shrink-0" strokeWidth={2} />
              <span className="flex-1 truncate">{s}</span>
              <DataValue size="xs" tone="dimmer">
                {[12, 3, 8, 1][i]}
              </DataValue>
            </button>
          ))}
        </div>

        <span className="flex-1" />

        <Card padding="row">
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-2">
              <icons.download className="size-[13px] text-accent" strokeWidth={2} />
              <span className="flex-1 text-[11px] text-text-dim">Down</span>
              <DataValue tone="accent">12.4 MB/s</DataValue>
            </div>
            <div className="flex items-center gap-2">
              <icons.download className="size-[13px] rotate-180 text-accent2" strokeWidth={2} />
              <span className="flex-1 text-[11px] text-text-dim">Up</span>
              <DataValue tone="accent2">1.8 MB/s</DataValue>
            </div>
          </div>
          <div className="-mx-3 mt-3 -mb-3 border-t border-line bg-surface2">
            <Sparkline data={DOWN} upload={UP} height={46} />
          </div>
        </Card>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <TransfersToolbar
          selectedCount={selected.length}
          totalCount={TORRENTS.length}
          onClearSelection={() => setSelected([])}
          onResume={() => {}}
          onPause={() => {}}
          onRemove={() => {}}
        />

        <div className="grid grid-cols-2 gap-3.5 overflow-auto p-6 xl:grid-cols-3">
          {TORRENTS.map((t) => (
            <Card key={t.name} hoverable padding="card">
              <div className="flex flex-col gap-2.5">
                <div className="flex items-center gap-2.5">
                  <Checkbox
                    checked={selected.includes(t.name)}
                    onChange={() => toggle(t.name)}
                    label={`Select ${t.name}`}
                  />
                  <span className="min-w-0 flex-1 truncate text-[12.5px] font-semibold text-text">
                    {t.name}
                  </span>
                </div>
                <StatusDot
                  tone={
                    t.state === 'downloading'
                      ? 'accent'
                      : t.state === 'seeding'
                        ? 'accent2'
                        : 'muted'
                  }
                  label={t.state}
                />
                <ProgressBar value={t.pct} paused={t.state === 'paused'} showValue label={t.name} />
                <div className="flex items-center gap-3">
                  <DataValue size="xs" tone="accent">
                    {t.down}
                  </DataValue>
                  <DataValue size="xs" tone="accent2">
                    {t.up}
                  </DataValue>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}
