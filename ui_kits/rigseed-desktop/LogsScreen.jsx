import React from 'react';
import { Icon } from './icons.jsx';
import { LOGS } from './data.js';

const NS = window.__RS_NS;
const { Button, IconButton, Input, Chip, Card, DataValue, SegmentedControl, StatusDot } = NS;

const LEVELS = [
  { key: 'normal',   label: 'Normal',   color: 'var(--text-dim)', count: 3 },
  { key: 'info',     label: 'Info',     color: 'var(--accent)',   count: 3 },
  { key: 'warning',  label: 'Warning',  color: 'var(--warn)',     count: 1 },
  { key: 'critical', label: 'Critical', color: 'var(--danger)',   count: 1 },
];

const BANS = [
  { t: '19:22:41', ip: '45.155.204.9',  reason: 'too many failed hash checks' },
  { t: '18:04:12', ip: '193.32.126.77', reason: 'manual ban from peers tab' },
];

export function LogsScreen() {
  const [tab, setTab] = React.useState('messages');
  const [off, setOff] = React.useState([]);
  const [query, setQuery] = React.useState('');
  const [follow, setFollow] = React.useState(true);

  const rows = LOGS.filter((l) =>
    !off.includes(l.level) && (!query || l.msg.toLowerCase().includes(query.toLowerCase())));

  const toggle = (k) => setOff((s) => s.includes(k) ? s.filter((x) => x !== k) : s.concat(k));

  return (
    <div style={{ flex: 1, overflow: 'auto', padding: 'var(--pad-screen-x)',
                  display: 'flex', flexDirection: 'column', gap: '18px' }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: '24px', flexShrink: 0 }}>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '5px' }}>
          <h1 style={{ margin: 0, fontSize: 'var(--text-h1)', fontWeight: 600,
                       letterSpacing: 'var(--tracking-title)' }}>Logs</h1>
          <span style={{ fontSize: '12.5px', color: 'var(--text-dim)' }}>
            Everything the daemon has reported since it started. Newest first.
          </span>
        </div>
        {LEVELS.map((l) => (
          <div key={l.key} style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '3px' }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '19px', fontWeight: 600, color: l.color }}>
              {l.count}
            </span>
            <span style={{
              fontSize: '9.5px', fontWeight: 700, letterSpacing: 'var(--tracking-table)',
              textTransform: 'uppercase', color: 'var(--text-dimmer)',
            }}>{l.label}</span>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', flexShrink: 0 }}>
        <SegmentedControl size="sm" value={tab} onChange={setTab}
          options={[{ value: 'messages', label: 'Messages' }, { value: 'bans', label: 'Bans' }]} />
        {tab === 'messages' ? LEVELS.map((l) => (
          <Chip key={l.key} label={l.label} dot count={l.count} color={l.color}
                selected={!off.includes(l.key)} onClick={() => toggle(l.key)} />
        )) : null}
        <span style={{ flex: 1 }} />
        <Input size="sm" width={250} value={query} onChange={(e) => setQuery(e.target.value)}
               icon={<Icon name="search" size={13} />} placeholder="Search messages" />
        <Button size="sm" onClick={() => setFollow((v) => !v)}
                icon={<span style={{
                  width: 7, height: 7, borderRadius: '50%',
                  background: follow ? 'var(--accent2)' : 'var(--text-dimmer)',
                }} />}>
          {follow ? 'Follow' : 'Paused'}
        </Button>
        <IconButton size="sm" title="Download log"><Icon name="download" size={14} /></IconButton>
        <IconButton size="sm" title="Clear view"><Icon name="trash" size={14} /></IconButton>
      </div>

      <Card padded={false}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: tab === 'messages' ? '116px 92px 1fr' : '116px 190px 1fr 110px',
          gap: '14px', padding: '10px 18px', background: 'var(--surface2)',
          borderBottom: '1px solid var(--line)',
        }}>
          {(tab === 'messages' ? ['Time', 'Level', 'Message'] : ['Time', 'Address', 'Reason', '']).map((h) => (
            <span key={h} style={{
              fontSize: '9.5px', fontWeight: 700, letterSpacing: 'var(--tracking-table)',
              textTransform: 'uppercase', color: 'var(--text-dimmer)',
            }}>{h}</span>
          ))}
        </div>

        {tab === 'messages' ? rows.map((l, i) => {
          const lv = LEVELS.find((x) => x.key === l.level);
          const tint = l.level === 'critical' ? 'var(--danger-soft)'
            : l.level === 'warning' ? 'var(--warn-soft)'
            : i % 2 ? 'var(--surface2)' : 'transparent';
          return (
            <div key={l.t} style={{
              display: 'grid', gridTemplateColumns: '116px 92px 1fr', gap: '14px',
              alignItems: 'center', padding: '9px 18px', background: tint,
            }}>
              <DataValue tone="dim">{l.t}</DataValue>
              <span style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                <span style={{ width: 7, height: 7, borderRadius: '50%', background: lv.color }} />
                <span style={{ fontSize: '10.5px', fontWeight: 600, color: lv.color }}>{lv.label}</span>
              </span>
              <span style={{ fontSize: '11.5px', color: 'var(--text)' }}>{l.msg}</span>
            </div>
          );
        }) : BANS.map((b, i) => (
          <div key={b.ip} style={{
            display: 'grid', gridTemplateColumns: '116px 190px 1fr 110px', gap: '14px',
            alignItems: 'center', padding: '9px 18px',
            background: i % 2 ? 'var(--surface2)' : 'transparent',
          }}>
            <DataValue tone="dim">{b.t}</DataValue>
            <DataValue>{b.ip}</DataValue>
            <span style={{ fontSize: '11.5px', color: 'var(--text-dim)' }}>{b.reason}</span>
            <Button size="sm">Unban</Button>
          </div>
        ))}

        {tab === 'messages' && !rows.length ? (
          <div style={{ padding: '54px 0', display: 'flex', flexDirection: 'column',
                        alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '15px', fontWeight: 600 }}>Nothing to show</span>
            <span style={{ fontSize: '12.5px', color: 'var(--text-dim)' }}>
              Every level is muted, or nothing matches your search.
            </span>
          </div>
        ) : null}

        <div style={{
          display: 'flex', alignItems: 'center', gap: '14px', padding: '10px 18px',
          background: 'var(--surface2)', borderTop: '1px solid var(--line)',
        }}>
          <DataValue size="xs" tone="dimmer">
            {tab === 'messages' ? `${rows.length} rows · log/main` : `${BANS.length} bans · log/peers`}
          </DataValue>
          <span style={{ flex: 1 }} />
          <StatusDot tone={follow ? 'accent2' : 'muted'} label={follow ? 'following' : 'paused'} />
        </div>
      </Card>
    </div>
  );
}
