import React from 'react';
import { Icon } from './icons.jsx';

const NS = window.__RS_NS;
const { Button, Input, Switch, SegmentedControl, Card, SectionHeader, DataValue, FilterRow } = NS;

const SECTIONS = [
  { key: 'downloads', label: 'Downloads', icon: 'down' },
  { key: 'connection', label: 'Connection', icon: 'wifi' },
  { key: 'speed', label: 'Speed', icon: 'rabbit' },
  { key: 'bittorrent', label: 'BitTorrent', icon: 'seed' },
  { key: 'webui', label: 'Web UI', icon: 'link' },
];

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function SettingRow({ label, hint, api, children, last }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '16px', padding: '14px 18px',
      borderBottom: last ? 'none' : '1px solid var(--line)',
    }}>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '3px', minWidth: 0 }}>
        <span style={{ fontSize: '12.5px', fontWeight: 600 }}>{label}</span>
        {hint ? <span style={{ fontSize: '11.5px', color: 'var(--text-dim)' }}>{hint}</span> : null}
      </div>
      {api ? <DataValue size="xs" tone="dimmer">{api}</DataValue> : null}
      {children}
    </div>
  );
}

export function SettingsScreen({ mode, setMode, accent, setAccent, layout, setLayout }) {
  const [section, setSection] = React.useState('downloads');
  const [dirty, setDirty] = React.useState(0);
  const [sw, setSw] = React.useState({
    incomplete: true, prealloc: false, atm: true, paused: false, queue: true,
    upnp: true, proxyPeers: false, altLimits: true, overhead: true,
    dht: true, pex: true, lsd: true, anon: false,
    csrf: true, clickjack: true, hostHeader: true, scheduler: true,
  });
  const [schedule, setSchedule] = React.useState(() =>
    DAYS.map((_, d) => Array.from({ length: 24 }, (_, h) => h >= 8 && h < 18 && d < 5)));

  const flip = (k) => { setSw((s) => ({ ...s, [k]: !s[k] })); setDirty((n) => n + 1); };
  const paint = (d, h) => {
    setSchedule((s) => s.map((row, i) => i !== d ? row : row.map((c, j) => j === h ? !c : c)));
    setDirty((n) => n + 1);
  };

  return (
    <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>
      <aside style={{
        width: 'var(--settings-nav-width)', flexShrink: 0, boxSizing: 'border-box',
        background: 'var(--sidebar-bg)', borderRight: '1px solid var(--line)',
        padding: '16px 12px', display: 'flex', flexDirection: 'column', gap: '5px',
      }}>
        <SectionHeader style={{ padding: '0 9px 6px' }}>Preferences</SectionHeader>
        {SECTIONS.map((s) => (
          <FilterRow key={s.key} label={s.label} active={section === s.key}
                     icon={<Icon name={s.icon} size={14} />}
                     onClick={() => setSection(s.key)} />
        ))}
        <FilterRow label="Appearance" active={section === 'appearance'}
                   icon={<Icon name="palette" size={14} />}
                   onClick={() => setSection('appearance')} />
        <span style={{ flex: 1 }} />
        {dirty ? (
          <div style={{
            padding: '11px 13px', borderRadius: 'var(--radius-2xl)',
            background: 'var(--accent-soft)', border: '1px solid var(--accent)',
            display: 'flex', flexDirection: 'column', gap: '4px',
          }}>
            <span style={{ fontSize: '11.5px', fontWeight: 600, color: 'var(--accent)' }}>Unsaved changes</span>
            <DataValue size="xs" tone="dim">{dirty} preference{dirty === 1 ? '' : 's'} edited</DataValue>
          </div>
        ) : null}
      </aside>

      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
        <div style={{ flex: 1, overflow: 'auto', padding: '20px 24px 28px',
                      display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: '14px', flexShrink: 0 }}>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '5px' }}>
              <h1 style={{ margin: 0, fontSize: 'var(--text-h1-settings)', fontWeight: 600,
                           letterSpacing: 'var(--tracking-title)' }}>
                {section === 'appearance' ? 'Appearance' : SECTIONS.find((s) => s.key === section).label}
              </h1>
              <span style={{ fontSize: '12.5px', color: 'var(--text-dim)' }}>
                {section === 'downloads' && 'Where files land and how new torrents start.'}
                {section === 'connection' && 'Ports, limits and proxying.'}
                {section === 'speed' && 'Global limits and when the alternative set applies.'}
                {section === 'bittorrent' && 'Peer discovery, encryption and seeding rules.'}
                {section === 'webui' && 'The remote interface this app also talks to.'}
                {section === 'appearance' && 'Mode, theme colour and the view new windows open in.'}
              </span>
            </div>
            <DataValue size="xs" tone="dimmer">app/setPreferences</DataValue>
          </div>

          {section === 'downloads' ? (
            <>
              <Card title="Save locations" api="save_path · temp_path" padded={false}>
                <SettingRow label="Default save path" hint="Where completed torrents are written.">
                  <Input mono width={280} defaultValue="/mnt/media" />
                </SettingRow>
                <SettingRow label="Keep incomplete torrents elsewhere" hint="Appends .!qB while downloading." api="temp_path_enabled">
                  <Switch checked={sw.incomplete} onChange={() => flip('incomplete')} />
                </SettingRow>
                <SettingRow label="Pre-allocate disk space" hint="Reserves the full size before downloading." api="preallocate_all" last>
                  <Switch checked={sw.prealloc} onChange={() => flip('prealloc')} />
                </SettingRow>
              </Card>
              <Card title="New torrents" api="auto_tmm · start_paused_enabled" padded={false}>
                <SettingRow label="Automatic torrent management" hint="Save path follows the category." api="auto_tmm_enabled">
                  <Switch checked={sw.atm} onChange={() => flip('atm')} />
                </SettingRow>
                <SettingRow label="Add torrents paused" hint="Review contents before anything downloads." api="start_paused_enabled">
                  <Switch checked={sw.paused} onChange={() => flip('paused')} />
                </SettingRow>
                <SettingRow label="Queueing" hint="Limit how many torrents run at once." api="queueing_enabled" last>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <Input mono width={70} size="sm" unit="active" defaultValue="5" />
                    <Switch checked={sw.queue} onChange={() => flip('queue')} />
                  </div>
                </SettingRow>
              </Card>
            </>
          ) : null}

          {section === 'connection' ? (
            <>
              <Card title="Listening port" api="listen_port · upnp" padded={false}>
                <SettingRow label="Port used for incoming connections">
                  <Input mono width={110} defaultValue="51413" />
                </SettingRow>
                <SettingRow label="Use UPnP / NAT-PMP" hint="Ask the router to forward the port." api="upnp" last>
                  <Switch checked={sw.upnp} onChange={() => flip('upnp')} />
                </SettingRow>
              </Card>
              <Card title="Connection limits" api="max_connec · max_uploads" padded={false}>
                <SettingRow label="Global maximum connections"><Input mono width={90} defaultValue="500" /></SettingRow>
                <SettingRow label="Maximum connections per torrent"><Input mono width={90} defaultValue="100" /></SettingRow>
                <SettingRow label="Global maximum upload slots" last><Input mono width={90} defaultValue="20" /></SettingRow>
              </Card>
              <Card title="Proxy" api="proxy_type" padded={false}>
                <SettingRow label="Proxy type">
                  <SegmentedControl size="sm" value="none" options={[
                    { value: 'none', label: 'None' }, { value: 'http', label: 'HTTP' },
                    { value: 's4', label: 'SOCKS4' }, { value: 's5', label: 'SOCKS5' }]} />
                </SettingRow>
                <SettingRow label="Use proxy for peer connections" api="proxy_peer_connections" last>
                  <Switch checked={sw.proxyPeers} onChange={() => flip('proxyPeers')} />
                </SettingRow>
              </Card>
            </>
          ) : null}

          {section === 'speed' ? (
            <>
              <Card title="Global limits" api="dl_limit · up_limit" padded={false}>
                <SettingRow label="Download limit"><Input mono width={92} size="sm" unit="KiB/s" defaultValue="0" /></SettingRow>
                <SettingRow label="Upload limit"><Input mono width={92} size="sm" unit="KiB/s" defaultValue="2048" /></SettingRow>
                <SettingRow label="Apply to transport overhead" api="limit_utp_rate" last>
                  <Switch checked={sw.overhead} onChange={() => flip('overhead')} />
                </SettingRow>
              </Card>

              <Card padded={false} title="Alternative rate schedule" api="scheduler_enabled"
                    action={<Switch checked={sw.scheduler} onChange={() => flip('scheduler')} />}>
                <div style={{ padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '46px 1fr', gap: '8px', alignItems: 'center' }}>
                    <span />
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(24, 1fr)', gap: '3px' }}>
                      {Array.from({ length: 24 }, (_, h) => (
                        <span key={h} style={{
                          fontFamily: 'var(--font-mono)', fontSize: '9px',
                          color: 'var(--text-dimmer)', textAlign: 'center',
                        }}>{h % 3 === 0 ? h : ''}</span>
                      ))}
                    </div>
                  </div>
                  {DAYS.map((d, di) => (
                    <div key={d} style={{ display: 'grid', gridTemplateColumns: '46px 1fr', gap: '8px', alignItems: 'center' }}>
                      <span style={{ fontSize: '11px', color: 'var(--text-dim)' }}>{d}</span>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(24, 1fr)', gap: '3px' }}>
                        {schedule[di].map((on, hi) => (
                          <button key={hi} type="button" onClick={() => paint(di, hi)}
                            title={`${d} ${hi}:00`}
                            style={{
                              height: 20, border: 'none', borderRadius: 'var(--radius-sm)',
                              background: on ? 'var(--accent2-soft)' : 'var(--surface2)',
                              cursor: 'pointer', padding: 0,
                              transition: 'background var(--dur-fast) var(--ease-plain)',
                            }} />
                        ))}
                      </div>
                    </div>
                  ))}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px', paddingTop: '4px' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                      <span style={{ width: 14, height: 14, borderRadius: 4, background: 'var(--accent2-soft)' }} />
                      <span style={{ fontSize: '11px', color: 'var(--text-dim)' }}>Alternative limits active</span>
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                      <span style={{ width: 14, height: 14, borderRadius: 4, background: 'var(--surface2)' }} />
                      <span style={{ fontSize: '11px', color: 'var(--text-dim)' }}>Global limits</span>
                    </span>
                    <span style={{ flex: 1 }} />
                    <DataValue size="xs" tone="dimmer">click cells to paint · alt_dl_limit / alt_up_limit</DataValue>
                  </div>
                </div>
              </Card>
            </>
          ) : null}

          {section === 'bittorrent' ? (
            <Card title="Peer discovery and privacy" api="dht · pex · encryption" padded={false}>
              <SettingRow label="Distributed hash table (DHT)" hint="Find peers without a tracker." api="dht">
                <Switch checked={sw.dht} onChange={() => flip('dht')} />
              </SettingRow>
              <SettingRow label="Peer exchange (PeX)" api="pex"><Switch checked={sw.pex} onChange={() => flip('pex')} /></SettingRow>
              <SettingRow label="Local peer discovery" api="lsd"><Switch checked={sw.lsd} onChange={() => flip('lsd')} /></SettingRow>
              <SettingRow label="Encryption" api="encryption">
                <SegmentedControl size="sm" value="prefer" options={[
                  { value: 'prefer', label: 'Prefer' }, { value: 'require', label: 'Require' },
                  { value: 'disable', label: 'Disable' }]} />
              </SettingRow>
              <SettingRow label="Anonymous mode" hint="Hides the client name from peers and trackers." api="anonymous_mode" last>
                <Switch checked={sw.anon} onChange={() => flip('anon')} />
              </SettingRow>
            </Card>
          ) : null}

          {section === 'webui' ? (
            <Card title="Web UI" api="web_ui_port · web_ui_csrf_protection_enabled" padded={false}>
              <SettingRow label="Port"><Input mono width={110} defaultValue="8080" /></SettingRow>
              <SettingRow label="CSRF protection" api="web_ui_csrf_protection_enabled">
                <Switch checked={sw.csrf} onChange={() => flip('csrf')} />
              </SettingRow>
              <SettingRow label="Clickjacking protection" api="web_ui_clickjacking_protection_enabled">
                <Switch checked={sw.clickjack} onChange={() => flip('clickjack')} />
              </SettingRow>
              <SettingRow label="Host header validation" api="web_ui_host_header_validation_enabled" last>
                <Switch checked={sw.hostHeader} onChange={() => flip('hostHeader')} />
              </SettingRow>
            </Card>
          ) : null}

          {section === 'appearance' ? (
            <Card title="Appearance" api="app-local preference" padded={false}>
              <SettingRow label="Mode" hint="Dark is the default.">
                <SegmentedControl size="sm" value={mode} onChange={setMode}
                  options={[{ value: 'dark', label: 'Dark' }, { value: 'light', label: 'Light' }]} />
              </SettingRow>
              <SettingRow label="Theme colour" hint="Tints every surface, not just the highlights.">
                <div style={{ display: 'flex', gap: '8px' }}>
                  {['dustblue','amber','sage','terracotta','mustard','slateteal','lavender'].map((k) => (
                    <button key={k} type="button" onClick={() => setAccent(k)}
                      title={k}
                      data-mode={mode} data-accent={k}
                      style={{
                        width: 22, height: 22, borderRadius: '50%', padding: 0, cursor: 'pointer',
                        background: 'var(--accent)',
                        border: accent === k ? '2px solid var(--text)' : '1px solid var(--line)',
                      }} />
                  ))}
                </div>
              </SettingRow>
              <SettingRow label="Default view" hint="What new windows open in." last>
                <SegmentedControl size="sm" value={layout} onChange={setLayout}
                  options={[{ value: 'easy', label: 'Easy' }, { value: 'grid', label: 'Grid' }, { value: 'list', label: 'List' }]} />
              </SettingRow>
            </Card>
          ) : null}
        </div>

        <div style={{
          flexShrink: 0, display: 'flex', alignItems: 'center', gap: '12px',
          padding: '13px 24px', background: 'var(--sidebar-bg)', borderTop: '1px solid var(--line)',
        }}>
          <DataValue size="xs" tone="dimmer">
            {dirty ? `${dirty} change${dirty === 1 ? '' : 's'} pending` : 'no pending changes'}
          </DataValue>
          <span style={{ flex: 1 }} />
          <Button size="sm" onClick={() => setDirty(0)}>Revert</Button>
          <Button variant="primary" size="sm" icon={<Icon name="check" size={13} />}
                  onClick={() => setDirty(0)}>Apply</Button>
        </div>
      </div>
    </div>
  );
}
