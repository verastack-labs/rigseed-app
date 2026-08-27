import { useState, type ReactNode } from 'react'

import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { SegmentedControl } from '@/components/ui/segmented-control'
import { Skeleton } from '@/components/ui/skeleton'
import { Switch } from '@/components/ui/switch'
import { NumberField } from '@/features/settings/number-field'
import { SettingRow } from '@/features/settings/setting-row'
import { askForAlerts } from '@/services/desktop-alert'
import { useAlertStore } from '@/state/alert-store'
import { useWindowPrefs } from '@/state/window-prefs'
import { icons } from '@/lib/icons'
import { cn } from '@/lib/utils'
import { canReachDesktop, pickFolder } from '@/services/shell'
import { usePreferences } from '@/state/use-preferences'
import type { Preferences } from '@/types/qbittorrent'

type SectionKey = 'downloads' | 'connection' | 'speed' | 'bittorrent' | 'webui' | 'app'

/**
 * Which keys belong to which section.
 *
 * Declared once so the nav's unsaved-changes dots, the section header and the
 * rows cannot disagree about what a section contains. Adding a row means
 * adding its key here, and forgetting to is visible: the dot stops appearing.
 */
const SECTIONS: {
  key: SectionKey
  label: string
  hint: string
  icon: keyof typeof icons
  /**
   * The daemon preferences this section owns, for the unsaved-changes dot and
   * the save bar.
   *
   * Empty for a section that is not about the daemon at all. `This app` holds
   * choices that live on this machine, take effect the moment they are made,
   * and have nothing to save.
   */
  keys: readonly (keyof Preferences)[]
}[] = [
  {
    key: 'downloads',
    label: 'Downloads',
    hint: 'Where torrents land, and how many run at once.',
    icon: 'folder',
    keys: [
      'save_path',
      'temp_path_enabled',
      'temp_path',
      'incomplete_files_ext',
      'preallocate_all',
      'auto_tmm_enabled',
      'add_stopped_enabled',
      'queueing_enabled',
      'max_active_downloads',
      'max_active_torrents',
      'max_active_uploads',
    ],
  },
  {
    key: 'connection',
    label: 'Connection',
    hint: 'The port peers reach, and how many of them at a time.',
    icon: 'connections',
    keys: [
      'listen_port',
      'upnp',
      'max_connec',
      'max_connec_per_torrent',
      'max_uploads',
      'max_uploads_per_torrent',
      'proxy_type',
      'proxy_ip',
      'proxy_port',
      'proxy_peer_connections',
    ],
  },
  {
    key: 'speed',
    label: 'Speed',
    hint: 'Rate limits, and when the alternative ones take over.',
    icon: 'logs',
    keys: [
      'dl_limit',
      'up_limit',
      'alt_dl_limit',
      'alt_up_limit',
      'limit_utp_rate',
      'limit_tcp_overhead',
      'scheduler_enabled',
      'scheduler_days',
      'schedule_from_hour',
      'schedule_to_hour',
    ],
  },
  {
    key: 'bittorrent',
    label: 'BitTorrent',
    hint: 'How this client finds peers and what it tells them.',
    icon: 'transfers',
    keys: ['dht', 'pex', 'lsd', 'encryption', 'anonymous_mode', 'max_ratio_enabled', 'max_ratio'],
  },
  {
    key: 'webui',
    label: 'Web UI',
    hint: 'The interface rigseed itself talks to.',
    icon: 'settings',
    keys: [
      'web_ui_port',
      'web_ui_csrf_protection_enabled',
      'web_ui_clickjacking_protection_enabled',
      'web_ui_host_header_validation_enabled',
    ],
  },
  {
    key: 'app',
    label: 'This app',
    hint: 'Choices that live on this machine rather than in the daemon.',
    icon: 'desktop',
    keys: [],
  },
]

const DAY_OPTIONS = [
  { value: '0', label: 'Every day' },
  { value: '1', label: 'Weekdays' },
  { value: '2', label: 'Weekends' },
]

/** `HH:00`, since the API's minutes are always left at zero by this screen. */
const HOURS = Array.from({ length: 24 }, (_, h) => String(h))

export function Settings() {
  const { draft, changes, dirtyKeys, saving, error, set, apply, revert } = usePreferences()
  const [section, setSection] = useState<SectionKey>('downloads')

  const alerts = useAlertStore()
  const windowPrefs = useWindowPrefs()
  /**
   * Turning one on is what asks the operating system, never startup.
   *
   * A permission prompt on first launch arrives before there is any reason for
   * it, gets refused on reflex, and on most systems cannot be asked a second
   * time. Asking at the moment somebody says they want notifications spends
   * the one ask on somebody who will say yes.
   *
   * A refusal leaves the switch off rather than on and silent, which is the
   * failure mode worth avoiding: a setting that says it is on while nothing
   * is ever shown.
   */
  const [refused, setRefused] = useState(false)
  const setAlert = async (which: 'onComplete' | 'onError', next: boolean) => {
    if (!next) {
      alerts.set({ [which]: false })
      return
    }
    const allowed = await askForAlerts()
    setRefused(!allowed)
    if (allowed) alerts.set({ [which]: true })
  }

  const dirtyIn = (keys: readonly (keyof Preferences)[]) => keys.some((k) => k in changes)

  const isDirty = (key: keyof Preferences) => key in changes

  if (!draft) {
    return (
      <div className="p-6">
        {error ? (
          <p className="text-[12.5px] text-danger">Could not read preferences: {error}</p>
        ) : (
          <Skeleton rows={8} rowHeight={44} />
        )}
      </div>
    )
  }

  const current = SECTIONS.find((s) => s.key === section) ?? SECTIONS[0]!

  /** A switch row, which is most of this screen. */
  const toggle = (key: keyof Preferences, label: string, hint?: string): ReactNode => (
    <SettingRow label={label} {...(hint ? { hint } : {})} dirty={isDirty(key)}>
      <Switch
        checked={Boolean(draft[key])}
        onChange={(next) => set(key, next as Preferences[typeof key])}
        label={label}
      />
    </SettingRow>
  )

  return (
    <div className="flex h-full min-h-0">
      <nav
        aria-label="Preference sections"
        className="flex w-[232px] shrink-0 flex-col gap-1 border-r border-line bg-sidebar px-3 py-4"
      >
        {SECTIONS.map((s) => {
          const Glyph = icons[s.icon]
          const active = s.key === section
          return (
            <button
              key={s.key}
              type="button"
              aria-current={active ? 'page' : undefined}
              onClick={() => setSection(s.key)}
              className={cn(
                'flex items-center gap-2.5 rounded-[9px] px-[11px] py-[9px] text-left',
                'transition-colors duration-quick',
                active ? 'bg-accent-soft text-accent' : 'text-text-dim hover:bg-surface2',
              )}
            >
              <Glyph className="size-[15px] shrink-0" strokeWidth={2} />
              <span className="min-w-0 flex-1 truncate text-[12.5px] font-semibold">{s.label}</span>
              {dirtyIn(s.keys) ? (
                <span
                  aria-label={`${s.label} has unsaved changes`}
                  className="size-[6px] shrink-0 rounded-full bg-accent"
                />
              ) : null}
            </button>
          )
        })}

        <span className="flex-1" />

        {dirtyKeys.length > 0 ? (
          <p className="rounded-lg bg-surface2 px-3 py-2.5 font-mono text-[10.5px] leading-[1.5] text-text-dim">
            {dirtyKeys.length} unsaved change{dirtyKeys.length === 1 ? '' : 's'}
          </p>
        ) : null}
      </nav>

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="min-h-0 flex-1 overflow-y-auto px-6 pt-5 pb-7">
          <header className="mb-4 flex items-baseline gap-4">
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <h1 className="text-[26px] leading-none font-semibold tracking-[-0.02em] text-text">
                {current.label}
              </h1>
              <p className="text-[12.5px] text-text-dim">{current.hint}</p>
            </div>
            <span className="shrink-0 font-mono text-[10.5px] text-text-dimmer">
              {current.keys.length > 0 ? 'app/setPreferences' : 'this machine'}
            </span>
          </header>

          <div className="flex flex-col gap-4">
            {section === 'downloads' ? (
              <>
                <Card title="Paths" api="save_path" padding="none">
                  <SettingRow
                    label="Default save path"
                    hint="Where a torrent goes when nothing else says otherwise."
                    dirty={isDirty('save_path')}
                  >
                    <Input
                      mono
                      value={draft.save_path}
                      onChange={(e) => set('save_path', e.target.value)}
                      aria-label="Default save path"
                      className="w-[280px]"
                    />
                    <Button
                      variant="secondary"
                      size="sm"
                      disabled={!canReachDesktop()}
                      title={canReachDesktop() ? undefined : 'Available in the desktop app'}
                      onClick={() => {
                        void pickFolder(draft.save_path).then((chosen) => {
                          if (chosen) set('save_path', chosen)
                        })
                      }}
                    >
                      Browse
                    </Button>
                  </SettingRow>
                  {toggle(
                    'temp_path_enabled',
                    'Keep incomplete torrents elsewhere',
                    'Finished files move to the save path when they complete.',
                  )}
                  <SettingRow
                    label="Incomplete path"
                    hint="Only used while the switch above is on."
                    dirty={isDirty('temp_path')}
                    // The whole row recedes, not just the box. A greyed input
                    // under a full-strength label reads as broken rather than
                    // as waiting on the switch above it.
                    inactive={!draft.temp_path_enabled}
                  >
                    <Input
                      mono
                      value={draft.temp_path}
                      disabled={!draft.temp_path_enabled}
                      onChange={(e) => set('temp_path', e.target.value)}
                      aria-label="Incomplete path"
                      className="w-[280px]"
                    />
                  </SettingRow>
                  {toggle(
                    'incomplete_files_ext',
                    'Append .!qB to incomplete files',
                    'Makes a half-finished file obvious to everything else on the machine.',
                  )}
                  {toggle(
                    'preallocate_all',
                    'Pre-allocate disk space',
                    'Reserves the full size up front, so a download cannot fail on a full disk halfway.',
                  )}
                </Card>

                <Card title="Adding" api="auto_tmm_enabled" padding="none">
                  {toggle(
                    'auto_tmm_enabled',
                    'Automatic torrent management',
                    'Save paths follow the category rather than being set per torrent.',
                  )}
                  {toggle(
                    'add_stopped_enabled',
                    'Add torrents paused',
                    'Nothing starts until you say so.',
                  )}
                </Card>

                <Card title="Queue" api="queueing_enabled" padding="none">
                  {toggle(
                    'queueing_enabled',
                    'Limit how many run at once',
                    'The rest wait their turn instead of competing for the line.',
                  )}
                  <SettingRow label="Active downloads" dirty={isDirty('max_active_downloads')}>
                    <NumberField
                      value={draft.max_active_downloads}
                      onChange={(n) => set('max_active_downloads', n)}
                      label="Active downloads"
                      disabled={!draft.queueing_enabled}
                    />
                  </SettingRow>
                  <SettingRow label="Active uploads" dirty={isDirty('max_active_uploads')}>
                    <NumberField
                      value={draft.max_active_uploads}
                      onChange={(n) => set('max_active_uploads', n)}
                      label="Active uploads"
                      disabled={!draft.queueing_enabled}
                    />
                  </SettingRow>
                  <SettingRow
                    label="Active torrents"
                    hint="Downloads and uploads together."
                    dirty={isDirty('max_active_torrents')}
                  >
                    <NumberField
                      value={draft.max_active_torrents}
                      onChange={(n) => set('max_active_torrents', n)}
                      label="Active torrents"
                      disabled={!draft.queueing_enabled}
                    />
                  </SettingRow>
                </Card>
              </>
            ) : null}

            {section === 'connection' ? (
              <>
                <Card title="Listening" api="listen_port" padding="none">
                  <SettingRow
                    label="Listening port"
                    hint="The port peers connect to. Anything above 1024."
                    dirty={isDirty('listen_port')}
                  >
                    <NumberField
                      value={draft.listen_port}
                      onChange={(n) => set('listen_port', n)}
                      label="Listening port"
                      min={1}
                    />
                  </SettingRow>
                  {toggle(
                    'upnp',
                    'Forward the port with UPnP',
                    'Asks the router to open it. Harmless if the router refuses.',
                  )}
                </Card>

                <Card title="Limits" api="max_connec" padding="none">
                  <SettingRow label="Global connections" dirty={isDirty('max_connec')}>
                    <NumberField
                      value={draft.max_connec}
                      onChange={(n) => set('max_connec', n)}
                      label="Global connections"
                    />
                  </SettingRow>
                  <SettingRow label="Per torrent" dirty={isDirty('max_connec_per_torrent')}>
                    <NumberField
                      value={draft.max_connec_per_torrent}
                      onChange={(n) => set('max_connec_per_torrent', n)}
                      label="Connections per torrent"
                    />
                  </SettingRow>
                  <SettingRow label="Upload slots" dirty={isDirty('max_uploads')}>
                    <NumberField
                      value={draft.max_uploads}
                      onChange={(n) => set('max_uploads', n)}
                      label="Upload slots"
                    />
                  </SettingRow>
                  <SettingRow
                    label="Upload slots per torrent"
                    dirty={isDirty('max_uploads_per_torrent')}
                  >
                    <NumberField
                      value={draft.max_uploads_per_torrent}
                      onChange={(n) => set('max_uploads_per_torrent', n)}
                      label="Upload slots per torrent"
                    />
                  </SettingRow>
                </Card>

                <Card title="Proxy" api="proxy_type" padding="none">
                  <SettingRow label="Proxy" dirty={isDirty('proxy_type')}>
                    <SegmentedControl
                      label="Proxy type"
                      value={draft.proxy_type}
                      onChange={(next) => set('proxy_type', next)}
                      options={['None', 'HTTP', 'SOCKS4', 'SOCKS5']}
                      size="sm"
                    />
                  </SettingRow>
                  <SettingRow label="Host" dirty={isDirty('proxy_ip')}>
                    <Input
                      mono
                      value={draft.proxy_ip}
                      disabled={draft.proxy_type === 'None'}
                      onChange={(e) => set('proxy_ip', e.target.value)}
                      aria-label="Proxy host"
                      className="w-[220px]"
                    />
                  </SettingRow>
                  <SettingRow label="Port" dirty={isDirty('proxy_port')}>
                    <NumberField
                      value={draft.proxy_port}
                      onChange={(n) => set('proxy_port', n)}
                      label="Proxy port"
                      disabled={draft.proxy_type === 'None'}
                    />
                  </SettingRow>
                  {toggle(
                    'proxy_peer_connections',
                    'Use the proxy for peers too',
                    'Off means only trackers go through it.',
                  )}
                </Card>
              </>
            ) : null}

            {section === 'speed' ? (
              <>
                <Card title="Global limits" api="dl_limit" padding="none">
                  <SettingRow
                    label="Download limit"
                    hint="Zero is unlimited."
                    dirty={isDirty('dl_limit')}
                  >
                    <NumberField
                      value={draft.dl_limit}
                      onChange={(n) => set('dl_limit', n)}
                      label="Download limit"
                      unit="KiB/s"
                    />
                  </SettingRow>
                  <SettingRow
                    label="Upload limit"
                    hint="Zero is unlimited."
                    dirty={isDirty('up_limit')}
                  >
                    <NumberField
                      value={draft.up_limit}
                      onChange={(n) => set('up_limit', n)}
                      label="Upload limit"
                      unit="KiB/s"
                    />
                  </SettingRow>
                  {toggle(
                    'limit_utp_rate',
                    'Apply limits to µTP',
                    'Off means only TCP transfers are counted.',
                  )}
                  {toggle(
                    'limit_tcp_overhead',
                    'Apply limits to transport overhead',
                    'Counts protocol traffic against the limit, not just payload.',
                  )}
                </Card>

                <Card title="Alternative limits" api="alt_dl_limit" padding="none">
                  <SettingRow label="Download limit" dirty={isDirty('alt_dl_limit')}>
                    <NumberField
                      value={draft.alt_dl_limit}
                      onChange={(n) => set('alt_dl_limit', n)}
                      label="Alternative download limit"
                      unit="KiB/s"
                    />
                  </SettingRow>
                  <SettingRow label="Upload limit" dirty={isDirty('alt_up_limit')}>
                    <NumberField
                      value={draft.alt_up_limit}
                      onChange={(n) => set('alt_up_limit', n)}
                      label="Alternative upload limit"
                      unit="KiB/s"
                    />
                  </SettingRow>
                </Card>

                <Card title="Schedule" api="scheduler_enabled" padding="none">
                  {toggle(
                    'scheduler_enabled',
                    'Switch to alternative limits on a schedule',
                    'One window, repeated on the days you choose.',
                  )}
                  <SettingRow label="Days" dirty={isDirty('scheduler_days')}>
                    <SegmentedControl
                      label="Schedule days"
                      value={String(draft.scheduler_days)}
                      onChange={(next) => set('scheduler_days', Number(next))}
                      options={DAY_OPTIONS}
                      size="sm"
                      {...(draft.scheduler_enabled
                        ? {}
                        : { className: 'pointer-events-none opacity-45' })}
                    />
                  </SettingRow>
                  <SettingRow
                    label="From"
                    hint="On the hour. qBittorrent stores minutes too, and this screen leaves them at zero."
                    dirty={isDirty('schedule_from_hour')}
                  >
                    <SegmentedControl
                      label="From hour"
                      value={String(draft.schedule_from_hour)}
                      onChange={(next) => set('schedule_from_hour', Number(next))}
                      options={HOURS.filter((h) => Number(h) % 6 === 0)}
                      size="sm"
                    />
                  </SettingRow>
                  <SettingRow label="To" dirty={isDirty('schedule_to_hour')}>
                    <SegmentedControl
                      label="To hour"
                      value={String(draft.schedule_to_hour)}
                      onChange={(next) => set('schedule_to_hour', Number(next))}
                      options={HOURS.filter((h) => Number(h) % 6 === 0)}
                      size="sm"
                    />
                  </SettingRow>
                </Card>
              </>
            ) : null}

            {section === 'bittorrent' ? (
              <>
                <Card title="Peer discovery" api="dht" padding="none">
                  {toggle(
                    'dht',
                    'DHT',
                    'Finds peers without a tracker. Ignored on private torrents.',
                  )}
                  {toggle(
                    'pex',
                    'Peer exchange',
                    'Peers introduce each other. Also ignored on private torrents.',
                  )}
                  {toggle('lsd', 'Local peer discovery', 'Looks for peers on the same network.')}
                </Card>

                <Card title="Privacy" api="encryption" padding="none">
                  <SettingRow
                    label="Encryption"
                    hint="Require refuses unencrypted peers, which can mean fewer of them."
                    dirty={isDirty('encryption')}
                  >
                    <SegmentedControl
                      label="Encryption"
                      value={String(draft.encryption)}
                      onChange={(next) => set('encryption', Number(next))}
                      options={[
                        { value: '0', label: 'Prefer' },
                        { value: '1', label: 'Require' },
                        { value: '2', label: 'Disable' },
                      ]}
                      size="sm"
                    />
                  </SettingRow>
                  {toggle(
                    'anonymous_mode',
                    'Anonymous mode',
                    'Stops the client announcing what it is. Not a substitute for a VPN.',
                  )}
                </Card>

                <Card title="Seeding" api="max_ratio" padding="none">
                  {toggle('max_ratio_enabled', 'Stop seeding at a ratio')}
                  <SettingRow label="Ratio" dirty={isDirty('max_ratio')}>
                    <NumberField
                      value={draft.max_ratio}
                      onChange={(n) => set('max_ratio', n)}
                      label="Ratio limit"
                      min={0}
                      disabled={!draft.max_ratio_enabled}
                    />
                  </SettingRow>
                </Card>
              </>
            ) : null}

            {section === 'app' ? (
              <>
                <Card title="Closing the window" api="this machine" padding="none">
                  <SettingRow
                    label="When the close button is pressed"
                    hint="Torrents only transfer while rigseed is running, so closing it is not a free action."
                  >
                    <SegmentedControl
                      label="What closing the window does"
                      value={windowPrefs.onClose}
                      onChange={(next) =>
                        windowPrefs.setOnClose(next as typeof windowPrefs.onClose)
                      }
                      options={[
                        { value: 'ask', label: 'Ask' },
                        { value: 'tray', label: 'Keep running' },
                        { value: 'quit', label: 'Quit' },
                      ]}
                      size="sm"
                    />
                  </SettingRow>
                </Card>

                <Card title="Desktop notifications" api="this machine" padding="none">
                  <SettingRow
                    label="When a download finishes"
                    hint="A notification from the operating system, so it arrives whether or not rigseed is the window in front."
                  >
                    <Switch
                      checked={alerts.onComplete}
                      onChange={(next) => void setAlert('onComplete', next)}
                      label="Notify when a download finishes"
                    />
                  </SettingRow>
                  <SettingRow
                    label="When a torrent stops with an error"
                    hint="A missing file or a disk that filled up stops a torrent silently otherwise."
                  >
                    <Switch
                      checked={alerts.onError}
                      onChange={(next) => void setAlert('onError', next)}
                      label="Notify when a torrent stops with an error"
                    />
                  </SettingRow>
                  {refused ? (
                    <div className="border-t border-line px-4 py-3">
                      <p className="text-[11.5px] leading-[1.6] text-text-dim">
                        The operating system refused. rigseed asks once and cannot ask again, so
                        this has to be turned back on in the system&rsquo;s own notification
                        settings.
                      </p>
                    </div>
                  ) : null}
                </Card>
              </>
            ) : null}

            {section === 'webui' ? (
              <Card title="Web UI" api="web_ui_port" padding="none">
                <SettingRow
                  label="Port"
                  hint="rigseed talks to the daemon here. Changing it means reconnecting."
                  dirty={isDirty('web_ui_port')}
                >
                  <NumberField
                    value={draft.web_ui_port}
                    onChange={(n) => set('web_ui_port', n)}
                    label="Web UI port"
                    min={1}
                  />
                </SettingRow>
                {toggle(
                  'web_ui_csrf_protection_enabled',
                  'CSRF protection',
                  'Refuses requests whose origin does not match. Leave this on.',
                )}
                {toggle(
                  'web_ui_clickjacking_protection_enabled',
                  'Clickjacking protection',
                  'Refuses to be embedded in another page.',
                )}
                {toggle(
                  'web_ui_host_header_validation_enabled',
                  'Host header validation',
                  'Refuses requests addressed to a hostname it does not serve.',
                )}
              </Card>
            ) : null}
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-3 border-t border-line bg-sidebar px-6 py-3.5">
          <span className="font-mono text-[10.5px] text-text-dimmer">
            {error
              ? `Could not save: ${error}`
              : dirtyKeys.length === 0
                ? 'No unsaved changes'
                : `${dirtyKeys.join(', ')}`}
          </span>
          <span className="flex-1" />
          <Button
            variant="secondary"
            size="sm"
            onClick={revert}
            disabled={dirtyKeys.length === 0 || saving}
          >
            Revert
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => void apply()}
            disabled={dirtyKeys.length === 0 || saving}
          >
            {saving ? 'Applying…' : 'Apply'}
          </Button>
        </div>
      </div>
    </div>
  )
}
