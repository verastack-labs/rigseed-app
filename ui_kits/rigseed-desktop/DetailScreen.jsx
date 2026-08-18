import React from 'react';
import { Icon } from './icons.jsx';
import { speedSeries } from './data.js';

const NS = window.__RS_NS;
const { Button, IconButton, Input, Switch, Checkbox, Card, SectionHeader, StatusDot,
        IconTile, Badge, ProgressBar, DataValue, Sparkline, StatCard, TabBar, ContextMenu } = NS;

const FILES = [
  { name: 'ubuntu-24.04.1-desktop-amd64.iso', size: '5.63 GB', progress: 64, prio: 'Normal' },
  { name: 'SHA256SUMS', size: '212 B', progress: 100, prio: 'High' },
  { name: 'SHA256SUMS.gpg', size: '833 B', progress: 100, prio: 'High' },
  { name: 'README.diskdefines', size: '1.4 KB', progress: 100, prio: 'Normal' },
  { name: 'extras/', size: '48.2 MB', progress: 0, prio: 'Skip' },
];

const TRACKERS = [
  { url: 'https://torrent.ubuntu.com/announce', status: ['accent2', 'working'], peers: 24, msg: '' },
  { url: 'udp://tracker.opentrackr.org:1337', status: ['accent2', 'working'], peers: 11, msg: '' },
  { url: 'udp://tracker.example.org:6969', status: ['danger', 'error'], peers: 0, msg: 'connection timed out' },
  { url: 'dht://', status: ['accent', 'updating'], peers: 6, msg: '' },
];

const PEERS = [
  { ip: '91.203.44.18', cc: 'NL', client: 'qBittorrent 5.0.3', pct: 100, dl: '1.2 MiB/s', up: '210 KiB/s' },
  { ip: '188.40.12.7', cc: 'DE', client: 'Transmission 4.0.6', pct: 82, dl: '840 KiB/s', up: '96 KiB/s' },
  { ip: '203.0.113.44', cc: 'AU', client: 'libtorrent 2.0.9', pct: 47, dl: '412 KiB/s', up: '0 B/s' },
  { ip: '78.46.201.3', cc: 'FI', client: 'Deluge 2.1.1', pct: 100, dl: '1.9 MiB/s', up: '340 KiB/s' },
];

function TableHead({ cols }) {
  return (
    <div style={{
      display: 'grid', gridTemplateColumns: cols.map((c) => c[1]).join(' '), gap: '14px',
      padding: '10px 18px', background: 'var(--surface2)',
      borderBottom: '1px solid var(--line)',
    }}>
      {cols.map((c) => (
        <span key={c[0]} style={{
          fontSize: '9.5px', fontWeight: 700, letterSpacing: 'var(--tracking-table)',
          textTransform: 'uppercase', color: 'var(--text-dimmer)',
        }}>{c[0]}</span>
      ))}
    </div>
  );
}

function Row({ cols, children, last }) {
  const [hover, setHover] = React.useState(false);
  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: 'grid', gridTemplateColumns: cols, gap: '14px', alignItems: 'center',
        padding: '9px 18px', borderBottom: last ? 'none' : '1px solid var(--line)',
        background: hover ? 'var(--surface2)' : 'transparent',
      }}
    >{children}</div>
  );
}

export function DetailScreen({ torrent }) {
  const [tab, setTab] = React.useState('general');
  const [paused, setPaused] = React.useState(torrent.state === 'paused');
  const [menu, setMenu] = React.useState(false);
  const [notes, setNotes] = React.useState(true);
  const [atm, setAtm] = React.useState(true);
  const [seq, setSeq] = React.useState(false);
  const [fl, setFl] = React.useState(false);
  const [dlUnlimited, setDlUnlimited] = React.useState(true);
  const [upUnlimited, setUpUnlimited] = React.useState(false);

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: '10px',
        padding: '0 var(--pad-card-lg)', background: 'var(--sidebar-bg)',
        borderBottom: '1px solid var(--line)', flexShrink: 0,
      }}>
        <TabBar value={tab} onChange={setTab} tabs={[
          { value: 'general', label: 'General', icon: <Icon name="list" size={14} /> },
          { value: 'files', label: 'Files', icon: <Icon name="file" size={14} />, count: FILES.length },
          { value: 'trackers', label: 'Trackers', icon: <Icon name="wifi" size={14} />, count: TRACKERS.length },
          { value: 'peers', label: 'Peers', icon: <Icon name="seed" size={14} />, count: PEERS.length },
          { value: 'speed', label: 'Speed', icon: <Icon name="down" size={14} /> },
        ]} />
        <span style={{ flex: 1 }} />
        <Button variant="primary" size="sm" onClick={() => setPaused((p) => !p)}
                icon={<Icon name={paused ? 'play' : 'pause'} size={13} />}>
          {paused ? 'Resume' : 'Pause'}
        </Button>
        <Button size="sm" icon={<Icon name="check" size={13} />}>Recheck</Button>
        <div style={{ position: 'relative', zIndex: menu ? 30 : 1 }}>
          <IconButton size="sm" title="More" active={menu}
                      onClick={(e) => { e.stopPropagation(); setMenu((v) => !v); }}>
            <Icon name="more" size={15} />
          </IconButton>
          <ContextMenu open={menu} onClose={() => setMenu(false)} items={[
            { label: 'Force recheck', icon: <Icon name="check" size={14} /> },
            { label: 'Copy magnet link', icon: <Icon name="magnet" size={14} /> },
            { label: 'Open folder', icon: <Icon name="folder" size={14} /> },
            { separator: true },
            { label: 'Remove', icon: <Icon name="trash" size={14} />, danger: true },
          ]} />
        </div>
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: 'var(--pad-screen-x)',
                    display: 'flex', flexDirection: 'column', gap: '18px' }}>
        {/* title block */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', flexShrink: 0 }}>
          <span style={{
            alignSelf: 'flex-start', display: 'inline-flex', alignItems: 'center', gap: '7px',
            padding: '5px 11px', borderRadius: 'var(--radius-pill)',
            background: 'var(--accent-soft)', color: 'var(--accent)',
            fontSize: '10.5px', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase',
          }}>
            <Icon name={paused ? 'pause' : 'down'} size={12} />
            {paused ? 'Paused' : 'Downloading'}
          </span>

          <div style={{ display: 'flex', alignItems: 'flex-end', gap: '24px' }}>
            <h1 style={{
              margin: 0, flex: 1, fontSize: 'var(--text-h1-detail)', fontWeight: 600,
              letterSpacing: 'var(--tracking-title)', lineHeight: 1.2, textWrap: 'pretty',
            }}>{torrent.name}</h1>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '3px' }}>
              <DataValue size="hero" tone="accent">{torrent.progress}%</DataValue>
              <DataValue tone="dim">{torrent.eta} left</DataValue>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <ProgressBar value={torrent.progress} height={8} paused={paused} style={{ flex: 1 }} />
            <DataValue tone="dim">3.65 GB of {torrent.size}</DataValue>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '18px', paddingTop: '4px' }}>
            {[['Category', torrent.category], ['Save path', '/mnt/media/iso'], ['Added', torrent.added],
              ['Ratio', torrent.ratio], ['Hash', torrent.hash]].map(([l, v]) => (
              <div key={l} style={{ display: 'flex', flexDirection: 'column', gap: '5px', minWidth: 0 }}>
                <SectionHeader>{l}</SectionHeader>
                <DataValue size="md" style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{v}</DataValue>
              </div>
            ))}
          </div>
        </div>

        {tab === 'general' ? (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', flexShrink: 0 }}>
              <StatCard label="Status" value={paused ? 'Paused' : 'Downloading'} sub="from 3 trackers" icon={<Icon name="down" size={13} />} />
              <StatCard label="Size" value={torrent.size} sub="7 entries" icon={<Icon name="box" size={13} />} />
              <StatCard label="Down speed" value={torrent.dl} sub="from 24 seeds" tone="accent" icon={<Icon name="down" size={13} />} />
              <StatCard label="Up speed" value={torrent.up} sub="to 9 peers" tone="accent2" icon={<Icon name="up" size={13} />} />
              <StatCard label="ETA" value={torrent.eta} sub="at current speed" icon={<Icon name="clock" size={13} />} />
              <StatCard label="Ratio" value={torrent.ratio} sub="target 2.00" icon={<Icon name="seed" size={13} />} />
              <StatCard label="Seeds / peers" value={`${torrent.seeds} / ${torrent.peers}`} sub="connected now" icon={<Icon name="wifi" size={13} />} />
              <StatCard label="Added on" value={torrent.added} sub="19:33 local" icon={<Icon name="clock" size={13} />} />
            </div>

            <Card padded={false}>
              <button type="button" onClick={() => setNotes((v) => !v)}
                style={{
                  width: '100%', boxSizing: 'border-box', display: 'flex', alignItems: 'center', gap: '10px',
                  padding: '13px 18px', background: 'var(--surface2)', border: 'none',
                  borderBottom: notes ? '1px solid var(--line)' : 'none', cursor: 'pointer',
                }}>
                <span style={{
                  display: 'flex', color: 'var(--text-dim)',
                  transform: notes ? 'rotate(90deg)' : 'rotate(0deg)',
                  transition: 'transform var(--dur-quick) var(--ease-overshoot)',
                }}><Icon name="chevron" size={14} /></span>
                <span style={{ fontSize: '12.5px', fontWeight: 600 }}>Paths, hash and comment</span>
                <span style={{ flex: 1 }} />
                <DataValue size="xs" tone="dimmer">torrents/properties</DataValue>
              </button>
              {notes ? (
                <div style={{ padding: '14px 18px', display: 'flex', flexDirection: 'column', gap: '9px' }}>
                  {[['Save path', '/mnt/media/iso'], ['Incomplete path', '/mnt/media/.incomplete'],
                    ['Hash', torrent.hash], ['Comment', 'Ubuntu CD releases.ubuntu.com'],
                    ['Created by', 'mktorrent 1.1'], ['Creation date', '11 Aug 2026 04:12']].map(([l, v]) => (
                    <div key={l} style={{ display: 'flex', gap: '14px' }}>
                      <span style={{ width: 132, flexShrink: 0, fontSize: '11.5px', color: 'var(--text-dim)' }}>{l}</span>
                      <DataValue>{v}</DataValue>
                    </div>
                  ))}
                </div>
              ) : null}
            </Card>
          </>
        ) : null}

        {tab === 'files' ? (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <DataValue tone="dim">{FILES.length} entries · 4 selected · 5.56 GB</DataValue>
              <span style={{ flex: 1 }} />
              <Button size="sm">Set priority</Button>
            </div>
            <Card padded={false}>
              <TableHead cols={[['Name', '1fr'], ['Size', '100px'], ['Progress', '150px'], ['Priority', '132px']]} />
              {FILES.map((fl2, i) => (
                <Row key={fl2.name} cols="1fr 100px 150px 132px" last={i === FILES.length - 1}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0,
                                opacity: fl2.prio === 'Skip' ? 0.5 : 1 }}>
                    <Checkbox checked={fl2.prio !== 'Skip'} />
                    <span style={{ color: 'var(--text-dim)', display: 'flex' }}><Icon name="file" size={14} /></span>
                    <span style={{ fontSize: '12.5px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{fl2.name}</span>
                  </div>
                  <DataValue tone="dim">{fl2.size}</DataValue>
                  <ProgressBar value={fl2.progress} height={4} showValue />
                  <span style={{
                    justifySelf: 'start', padding: '4px 10px', borderRadius: 'var(--radius-md)',
                    background: 'var(--surface2)', border: '1px solid var(--line)',
                    fontSize: '11.5px', fontWeight: 600, color: 'var(--text-dim)',
                  }}>{fl2.prio}</span>
                </Row>
              ))}
            </Card>
          </>
        ) : null}

        {tab === 'trackers' ? (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <DataValue tone="dim">4 trackers · 1 error</DataValue>
              <span style={{ flex: 1 }} />
              <Button variant="primary" size="sm" icon={<Icon name="plus" size={13} />}>Add tracker</Button>
            </div>
            <Card padded={false}>
              <TableHead cols={[['URL', '1fr'], ['Status', '140px'], ['Peers', '90px'], ['Message', '220px']]} />
              {TRACKERS.map((tr, i) => (
                <Row key={tr.url} cols="1fr 140px 90px 220px" last={i === TRACKERS.length - 1}>
                  <DataValue style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{tr.url}</DataValue>
                  <StatusDot tone={tr.status[0]} label={tr.status[1]} />
                  <DataValue tone="dim">{tr.peers}</DataValue>
                  <span style={{ fontSize: '11.5px', color: 'var(--text-dim)' }}>{tr.msg || '—'}</span>
                </Row>
              ))}
            </Card>
          </>
        ) : null}

        {tab === 'peers' ? (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <DataValue tone="dim">{PEERS.length} connected · from sync/torrentPeers</DataValue>
              <span style={{ flex: 1 }} />
              <DataValue size="xs" tone="dimmer">right-click a row to ban</DataValue>
            </div>
            <Card padded={false}>
              <TableHead cols={[['IP', '190px'], ['Client', '1fr'], ['Progress', '170px'], ['Down', '110px'], ['Up', '110px']]} />
              {PEERS.map((p, i) => (
                <Row key={p.ip} cols="190px 1fr 170px 110px 110px" last={i === PEERS.length - 1}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Badge>{p.cc}</Badge><DataValue>{p.ip}</DataValue>
                  </span>
                  <span style={{ fontSize: '12px', color: 'var(--text-dim)' }}>{p.client}</span>
                  <ProgressBar value={p.pct} tone="accent2" height={4} showValue />
                  <DataValue tone="accent">{p.dl}</DataValue>
                  <DataValue tone="accent2">{p.up}</DataValue>
                </Row>
              ))}
            </Card>
          </>
        ) : null}

        {tab === 'speed' ? (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', flexShrink: 0 }}>
              {[['Download', 'accent', torrent.dl, dlUnlimited, setDlUnlimited, 'torrents/setDownloadLimit', 'down'],
                ['Upload', 'accent2', torrent.up, upUnlimited, setUpUnlimited, 'torrents/setUploadLimit', 'up']].map(
                ([label, tone, value, unl, setUnl, api, icon]) => (
                <Card key={label} padded={false}>
                  <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '9px' }}>
                      <span style={{ color: `var(--${tone})`, display: 'flex' }}><Icon name={icon} size={15} /></span>
                      <SectionHeader>{label}</SectionHeader>
                      <span style={{ flex: 1 }} />
                      <DataValue size="xl" tone={tone}>{value}</DataValue>
                    </div>
                    <Sparkline data={speedSeries(60, label === 'Download' ? 1 : 4, label === 'Download' ? 1 : 0.4)}
                               tone={tone} height={104} gridlines />
                    <div style={{ display: 'flex', gap: '18px' }}>
                      {[['peak', '12.4 MiB/s'], ['average', '6.1 MiB/s'], ['session', '3.65 GB']].map(([l, v]) => (
                        <span key={l} style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                          <SectionHeader>{l}</SectionHeader><DataValue>{v}</DataValue>
                        </span>
                      ))}
                      <span style={{ flex: 1 }} />
                      <DataValue size="xs" tone="dimmer" style={{ alignSelf: 'flex-end' }}>last 60s</DataValue>
                    </div>
                  </div>
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: '10px',
                    padding: '11px 16px', background: 'var(--surface2)', borderTop: '1px solid var(--line)',
                  }}>
                    <span style={{ fontSize: '11.5px', fontWeight: 600 }}>Limit</span>
                    <Input mono width={92} size="sm" defaultValue={unl ? '' : '2048'} placeholder="—" />
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10.5px', color: 'var(--text-dimmer)' }}>KiB/s</span>
                    <span style={{ flex: 1 }} />
                    <span style={{ fontSize: '11.5px', color: 'var(--text-dim)' }}>Unlimited</span>
                    <Switch checked={unl} onChange={setUnl} label={label + ' unlimited'} />
                  </div>
                </Card>
              ))}
            </div>

            <Card padded={false}>
              {[['Automatic Torrent Management', 'Move this torrent when its category path changes.', 'torrents/setAutoManagement', atm, setAtm],
                ['Sequential download', 'Fetch pieces in order. Useful for media previews.', 'torrents/toggleSequentialDownload', seq, setSeq],
                ['Download first and last pieces first', 'Lets a player read the header before the rest arrives.', 'torrents/toggleFirstLastPiecePrio', fl, setFl]].map(
                ([label, hint, api, val, set], i, arr) => (
                <div key={label} style={{
                  display: 'flex', alignItems: 'center', gap: '14px', padding: '14px 18px',
                  borderBottom: i === arr.length - 1 ? 'none' : '1px solid var(--line)',
                }}>
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '3px' }}>
                    <span style={{ fontSize: '12.5px', fontWeight: 600 }}>{label}</span>
                    <span style={{ fontSize: '11.5px', color: 'var(--text-dim)' }}>{hint}</span>
                  </div>
                  <DataValue size="xs" tone="dimmer">{api}</DataValue>
                  <Switch checked={val} onChange={set} label={label} />
                </div>
              ))}
            </Card>
          </>
        ) : null}
      </div>
    </div>
  );
}
