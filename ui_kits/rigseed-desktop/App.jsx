import React from 'react';
import NS from './registry.jsx';
import { Icon, Mark } from './icons.jsx';
import { ACCENTS } from './data.js';
import { TransfersScreen } from './TransfersScreen.jsx';
import { DetailScreen } from './DetailScreen.jsx';
import { SettingsScreen } from './SettingsScreen.jsx';
import { LogsScreen } from './LogsScreen.jsx';

const { Button, IconButton, NavRail, SegmentedControl, DataValue, StatusDot, IconTile } = NS;

const CONNECTIONS = [
  { id: 'local', label: 'This computer', host: '127.0.0.1:8080' },
  { id: 'nas', label: 'Home NAS', host: '192.168.1.24:8080' },
  { id: 'seedbox', label: 'Seedbox', host: 'eu3.seedhost.eu' },
];

const LAYOUTS = [
  { key: 'easy', label: 'Easy', icon: 'easy', desc: 'Big cards, plain language, few numbers.' },
  { key: 'grid', label: 'Grid', icon: 'grid', desc: 'Balanced cards with progress and speeds.' },
  { key: 'list', label: 'List', icon: 'rows', desc: 'Dense rows for large libraries.' },
];

function AppearanceControl({ mode, setMode, accent, setAccent, onSetup }) {
  const [open, setOpen] = React.useState(false);
  const hover = React.useRef(false);
  const timer = React.useRef(null);

  const arm = () => {
    hover.current = false;
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setOpen(false), 2400);
  };
  const hold = () => { hover.current = true; clearTimeout(timer.current); };
  React.useEffect(() => () => clearTimeout(timer.current), []);

  return (
    <div onMouseEnter={hold} onMouseLeave={arm}
         style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden',
        maxWidth: open ? 340 : 0, opacity: open ? 1 : 0,
        transition: 'max-width var(--dur-panel) var(--ease-panel), opacity var(--dur-quick) var(--ease-plain)',
      }}>
        <Button size="sm" variant="ghost" onClick={onSetup} style={{ whiteSpace: 'nowrap' }}>Setup…</Button>
        <div style={{
          display: 'flex', gap: '6px', padding: '0 11px',
          borderLeft: '1px solid var(--line)', borderRight: '1px solid var(--line)',
        }}>
          {ACCENTS.map((a) => (
            <button key={a.key} type="button" title={a.label} onClick={() => setAccent(a.key)}
              data-mode={mode} data-accent={a.key}
              style={{
                width: 18, height: 18, flexShrink: 0, borderRadius: '50%', padding: 0, border: 'none',
                background: 'var(--accent)', cursor: 'pointer',
                boxShadow: accent === a.key
                  ? '0 0 0 2px var(--sidebar-bg), 0 0 0 4px var(--accent)' : 'none',
                transition: 'box-shadow var(--dur-quick) var(--ease-plain)',
              }} />
          ))}
        </div>
        <SegmentedControl size="sm" value={mode} onChange={setMode}
          options={[
            { value: 'dark', label: '', icon: <Icon name="moon" size={14} /> },
            { value: 'light', label: '', icon: <Icon name="sun" size={14} /> },
          ]} />
      </div>
      <IconButton title="Appearance" active={open}
                  onClick={() => { setOpen((v) => !v); if (!hover.current) arm(); }}>
        <Icon name="palette" size={16} strokeWidth={1.9} />
      </IconButton>
    </div>
  );
}

function ConnectionPicker() {
  const [open, setOpen] = React.useState(false);
  const [conn, setConn] = React.useState('local');
  const active = CONNECTIONS.find((c) => c.id === conn);

  return (
    <div style={{ position: 'relative' }}>
      <button type="button" onClick={(e) => { e.stopPropagation(); setOpen((v) => !v); }}
        style={{
          display: 'flex', alignItems: 'center', gap: '8px', padding: '7px 11px',
          borderRadius: 'var(--radius-lg)', background: 'var(--surface2)',
          border: '1px solid var(--line)', cursor: 'pointer', color: 'var(--text)',
        }}>
        <span style={{ color: 'var(--accent2)', display: 'flex' }}><Icon name="wifi" size={14} /></span>
        <DataValue size="sm">{active.host}</DataValue>
        <span style={{
          display: 'flex', color: 'var(--text-dim)',
          transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
          transition: 'transform var(--dur-base) var(--ease-overshoot)',
        }}><Icon name="chevronDown" size={13} /></span>
      </button>
      {open ? (
        <div onClick={(e) => e.stopPropagation()} style={{
          position: 'absolute', top: 40, left: 0, width: 218, zIndex: 50, padding: '6px',
          borderRadius: 'var(--radius-3xl)', background: 'var(--surface)',
          border: '1px solid var(--line)', boxShadow: 'var(--shadow-card)',
        }}>
          {CONNECTIONS.map((c) => (
            <button key={c.id} type="button"
              onClick={() => { setConn(c.id); setOpen(false); }}
              style={{
                display: 'flex', alignItems: 'center', gap: '10px', width: '100%',
                boxSizing: 'border-box', padding: '8px 9px', border: 'none',
                borderRadius: 'var(--radius-md)', cursor: 'pointer', textAlign: 'left',
                background: c.id === conn ? 'var(--accent-soft)' : 'transparent',
              }}>
              <span style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '2px' }}>
                <span style={{ fontSize: '12px', fontWeight: 600,
                               color: c.id === conn ? 'var(--accent)' : 'var(--text)' }}>{c.label}</span>
                <DataValue size="xs" tone="dimmer">{c.host}</DataValue>
              </span>
              {c.id === conn ? (
                <span style={{ color: 'var(--accent)', display: 'flex' }}><Icon name="check" size={14} /></span>
              ) : null}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function SetupModal({ open, mode, setMode, accent, setAccent, layout, setLayout, onClose }) {
  if (!open) return null;

  const cardStyle = (on) => ({
    display: 'flex', gap: '12px', padding: '13px 14px',
    borderRadius: 'var(--radius-3xl)', cursor: 'pointer',
    background: on ? 'var(--accent-soft)' : 'var(--surface2)',
    border: `1.5px solid ${on ? 'var(--accent)' : 'var(--line)'}`,
    transition: 'background var(--dur-quick) var(--ease-plain), border-color var(--dur-quick) var(--ease-plain)',
  });

  return (
    <div style={{
      position: 'absolute', inset: 0, zIndex: 60,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'var(--scrim-modal)', backdropFilter: 'blur(var(--scrim-blur-modal))',
    }}>
      <div style={{
        width: 720, boxSizing: 'border-box', borderRadius: 18,
        background: 'var(--surface)', border: '1px solid var(--line)',
        boxShadow: 'var(--shadow-modal)', padding: '30px 32px 24px',
        display: 'flex', flexDirection: 'column', gap: '24px',
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <span style={{
            fontSize: '10.5px', textTransform: 'uppercase', letterSpacing: '0.09em',
            fontWeight: 700, color: 'var(--accent)',
          }}>First run</span>
          <span style={{ fontSize: '23px', fontWeight: 700, letterSpacing: '-0.015em' }}>
            Set up your look
          </span>
          <span style={{ fontSize: '13px', color: 'var(--text-dim)', textWrap: 'pretty' }}>
            Pick a mode, a theme colour and a default view. Everything updates live behind
            this window, and you can change it any time from the palette button in the top bar.
          </span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <span style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.08em',
                         fontWeight: 700, color: 'var(--text-dimmer)' }}>Mode</span>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            {[['dark', 'Dark', 'Default. Warm charcoal surfaces.', '#1B1D20', '#E9E8E6', 'moon'],
              ['light', 'Light', 'Paper white with soft tint.', '#F3F3F1', '#232527', 'sun']].map(
              ([key, title, hint, tileBg, tileFg, icon]) => (
              <div key={key} onClick={() => setMode(key)} style={cardStyle(mode === key)}>
                <span style={{
                  width: 38, height: 38, borderRadius: 10, flexShrink: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: tileBg, color: tileFg,
                }}><Icon name={icon} size={17} /></span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  <span style={{ fontSize: '13.5px', fontWeight: 650 }}>{title}</span>
                  <span style={{ fontSize: '11.5px', color: 'var(--text-dim)' }}>{hint}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <span style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.08em',
                         fontWeight: 700, color: 'var(--text-dimmer)' }}>Theme colour</span>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '8px' }}>
            {ACCENTS.map((a) => {
              const on = a.key === accent;
              return (
                <div key={a.key} onClick={() => setAccent(a.key)}
                  style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '7px',
                    padding: '11px 4px 9px', borderRadius: 11, cursor: 'pointer',
                    background: on ? 'var(--accent-soft)' : 'var(--surface2)',
                    border: `1.5px solid ${on ? 'var(--accent)' : 'var(--line)'}`,
                  }}>
                  <span data-mode={mode} data-accent={a.key}
                        style={{ width: 24, height: 24, borderRadius: '50%', background: 'var(--accent)' }} />
                  <span style={{
                    fontSize: '10.5px', fontWeight: 600, textAlign: 'center', lineHeight: 1.25,
                    color: on ? 'var(--text)' : 'var(--text-dim)',
                  }}>{a.label}</span>
                </div>
              );
            })}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <span style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.08em',
                         fontWeight: 700, color: 'var(--text-dimmer)' }}>Default view</span>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
            {LAYOUTS.map((l) => {
              const on = l.key === layout;
              return (
                <div key={l.key} onClick={() => setLayout(l.key)}
                  style={{ ...cardStyle(on), position: 'relative', overflow: 'hidden',
                           flexDirection: 'column', gap: '8px' }}>
                  {l.key === 'easy' ? (
                    <span style={{
                      position: 'absolute', top: 17, right: -52, width: 164,
                      transform: 'rotate(45deg)', background: 'var(--accent)',
                      color: 'var(--accent-on)', fontSize: '8.5px', lineHeight: 1.3,
                      fontWeight: 800, letterSpacing: '0.09em', textTransform: 'uppercase',
                      textAlign: 'center', padding: '4px 0', boxShadow: '0 2px 8px var(--shadow-color)',
                    }}>New to<br />torrents</span>
                  ) : null}
                  <span style={{ color: on ? 'var(--accent)' : 'var(--text-dim)', display: 'flex' }}>
                    <Icon name={l.icon} size={20} strokeWidth={1.9} />
                  </span>
                  <span style={{ fontSize: '13px', fontWeight: 650 }}>{l.label}</span>
                  <span style={{ fontSize: '11.5px', color: 'var(--text-dim)', lineHeight: 1.35 }}>{l.desc}</span>
                </div>
              );
            })}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '14px',
                      paddingTop: '14px', borderTop: '1px solid var(--line)' }}>
          <span style={{ flex: 1, fontSize: '11.5px', color: 'var(--text-dimmer)' }}>
            You can change all of this later in Settings.
          </span>
          <Button variant="ghost" onClick={onClose}>Skip</Button>
          <Button variant="primary" onClick={onClose}>Start using rigseed</Button>
        </div>
      </div>
    </div>
  );
}

export function App() {
  const [mode, setMode] = React.useState('dark');
  const [accent, setAccent] = React.useState('dustblue');
  const [layout, setLayout] = React.useState('grid');
  const [screen, setScreen] = React.useState('transfers');
  const [rail, setRail] = React.useState(false);
  const [setup, setSetup] = React.useState(true);
  const [torrent, setTorrent] = React.useState(null);

  const openTorrent = (t) => { setTorrent(t); setScreen('detail'); };

  const CRUMB = {
    transfers: null, detail: '/ detail', settings: '/ settings', logs: '/ logs',
  }[screen];

  return (
    <div data-mode={mode} data-accent={accent} style={{
      position: 'relative', width: '100%', height: '100%', overflow: 'hidden',
      display: 'flex', background: 'var(--bg)', color: 'var(--text)',
      fontFamily: 'var(--font-ui)',
    }}>
      <NavRail
        expanded={rail}
        onToggle={() => setRail((v) => !v)}
        active={screen === 'detail' ? 'transfers' : screen}
        onSelect={(k) => { setScreen(k); setRail(false); }}
        items={[
          { key: 'transfers', label: 'Transfers', icon: <Icon name="list" size={17} /> },
          { key: 'search', label: 'Search', icon: <Icon name="search" size={17} /> },
          { key: 'cats', label: 'Categories & tags', icon: <Icon name="folder" size={17} /> },
          { key: 'logs', label: 'Logs', icon: <Icon name="logs" size={17} /> },
          { key: 'settings', label: 'Settings', icon: <Icon name="settings" size={17} /> },
        ]}
      />

      <div style={{ flex: 1, minWidth: 0, marginLeft: 'var(--rail-collapsed)',
                    display: 'flex', flexDirection: 'column' }}>
        <header style={{
          height: 'var(--topbar-height)', flexShrink: 0, boxSizing: 'border-box',
          display: 'flex', alignItems: 'center', gap: '14px', padding: '12px 18px',
          background: 'var(--sidebar-bg)', borderBottom: '1px solid var(--line)',
        }}>
          {screen === 'transfers' ? <ConnectionPicker /> : (
            <>
              <IconButton title="Back" onClick={() => setScreen('transfers')}>
                <Icon name="back" size={15} />
              </IconButton>
              <span style={{ fontSize: '12.5px', fontWeight: 600 }}>All torrents</span>
              <DataValue size="sm" tone="dimmer">{CRUMB}</DataValue>
            </>
          )}
          <span style={{ flex: 1 }} />
          <AppearanceControl mode={mode} setMode={setMode} accent={accent} setAccent={setAccent}
                             onSetup={() => setSetup(true)} />
          {screen === 'transfers' ? (
            <IconButton title="Settings" onClick={() => setScreen('settings')}>
              <Icon name="settings" size={16} />
            </IconButton>
          ) : null}
        </header>

        {screen === 'transfers' ? (
          <TransfersScreen layout={layout} setLayout={setLayout} onOpenTorrent={openTorrent} />
        ) : null}
        {screen === 'detail' && torrent ? <DetailScreen torrent={torrent} /> : null}
        {screen === 'settings' ? (
          <SettingsScreen mode={mode} setMode={setMode} accent={accent} setAccent={setAccent}
                          layout={layout} setLayout={setLayout} />
        ) : null}
        {screen === 'logs' ? <LogsScreen /> : null}
        {screen === 'search' || screen === 'cats' ? (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column',
                        alignItems: 'center', justifyContent: 'center', gap: '12px' }}>
            <IconTile size={46}><Icon name={screen === 'search' ? 'search' : 'folder'} size={22} /></IconTile>
            <span style={{ fontSize: '15px', fontWeight: 600 }}>
              {screen === 'search' ? 'Search' : 'Categories & tags'} is not in this kit
            </span>
            <span style={{ fontSize: '12.5px', color: 'var(--text-dim)', maxWidth: 380,
                           textAlign: 'center', textWrap: 'pretty' }}>
              Both screens are fully specified in the handoff documents and drawn in their
              prototypes. They are the next two to build here.
            </span>
          </div>
        ) : null}

        <footer style={{
          height: 'var(--footer-height)', flexShrink: 0, boxSizing: 'border-box',
          display: 'flex', alignItems: 'center', gap: '16px', padding: '0 18px',
          background: 'var(--sidebar-bg)', borderTop: '1px solid var(--line)',
        }}>
          <StatusDot tone="accent2" label="connected" mono />
          <DataValue size="xs" tone="dimmer">18 torrents · 4 active</DataValue>
          <DataValue size="xs" tone="dimmer">sync/maindata · transfer/info</DataValue>
          <span style={{ flex: 1 }} />
          <DataValue size="xs" tone="dimmer">qbittorrent-nox 5.0.3 · api 2.11.2</DataValue>
        </footer>
      </div>

      <SetupModal open={setup} onClose={() => setSetup(false)}
                  mode={mode} setMode={setMode} accent={accent} setAccent={setAccent}
                  layout={layout} setLayout={setLayout} />
    </div>
  );
}
