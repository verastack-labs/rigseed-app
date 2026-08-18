import React from 'react';
import { Icon } from './icons.jsx';
import { TORRENTS, CATEGORIES, TAGS, STATUSES, speedSeries } from './data.js';

const NS = window.__RS_NS;
const { Button, IconButton, Input, Checkbox, SegmentedControl, Card, SectionHeader,
        StatusDot, IconTile, ProgressBar, DataValue, Sparkline, FilterRow, ContextMenu } = NS;

const STATE_LABEL = {
  downloading: ['accent', 'Downloading'],
  seeding: ['accent2', 'Seeding'],
  stalled: ['warn', 'Stalled'],
  paused: ['muted', 'Paused'],
};

const MENU = (paused) => [
  { label: paused ? 'Resume' : 'Pause', icon: <Icon name={paused ? 'play' : 'pause'} size={14} /> },
  { label: 'Force recheck', icon: <Icon name="check" size={14} /> },
  { separator: true },
  { label: 'Copy magnet link', icon: <Icon name="magnet" size={14} /> },
  { label: 'Open folder', icon: <Icon name="folder" size={14} /> },
  { separator: true },
  { label: 'Remove', icon: <Icon name="trash" size={14} />, danger: true },
];

function catOf(name) { return CATEGORIES.find((c) => c.name === name) || CATEGORIES[0]; }

function RowMenu({ hash, paused, open, setOpen }) {
  return (
    <div style={{ position: 'relative', flexShrink: 0 }}>
      <IconButton size="sm" title="More" active={open}
                  onClick={(e) => { e.stopPropagation(); setOpen(open ? null : hash); }}>
        <Icon name="more" size={15} />
      </IconButton>
      <ContextMenu open={open} onClose={() => setOpen(null)} items={MENU(paused)} />
    </div>
  );
}

function GridCard({ t, selected, onSelect, onOpen, menu, setMenu }) {
  const [hover, setHover] = React.useState(false);
  const cat = catOf(t.category);
  const [tone, label] = STATE_LABEL[t.state];
  const open = menu === t.hash;

  return (
    <div
      onClick={onOpen}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        position: 'relative', zIndex: open ? 30 : 1,
        borderRadius: 'var(--radius-2xl)', background: 'var(--surface)',
        border: `1px solid ${hover || open ? 'var(--accent)' : 'var(--line)'}`,
        padding: '14px', display: 'flex', flexDirection: 'column', gap: '11px',
        cursor: 'pointer',
        transition: 'border-color var(--dur-quick) var(--ease-plain)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
        <div onClick={(e) => { e.stopPropagation(); onSelect(); }} style={{ paddingTop: 5 }}>
          <Checkbox checked={selected} onChange={onSelect} />
        </div>
        <IconTile size={26} color={cat.color}><Icon name={cat.icon} size={13} /></IconTile>
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <span style={{
            fontSize: '12.5px', fontWeight: 600, color: 'var(--text)',
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          }}>{t.name}</span>
          <StatusDot tone={tone} label={label} />
        </div>
        <RowMenu hash={t.hash} paused={t.state === 'paused'} open={open} setOpen={setMenu} />
      </div>

      <ProgressBar value={t.progress} paused={t.state === 'paused'} showValue />

      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: '5px', color: 'var(--accent)' }}>
          <Icon name="down" size={12} /><DataValue tone="accent">{t.dl}</DataValue>
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: '5px', color: 'var(--accent2)' }}>
          <Icon name="up" size={12} /><DataValue tone="accent2">{t.up}</DataValue>
        </span>
        <span style={{ flex: 1 }} />
        <DataValue tone="dimmer">{t.size}</DataValue>
      </div>
    </div>
  );
}

function ListRow({ t, selected, onSelect, onOpen, menu, setMenu, last }) {
  const [hover, setHover] = React.useState(false);
  const cat = catOf(t.category);
  const open = menu === t.hash;

  return (
    <div
      onClick={onOpen}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        position: 'relative', zIndex: open ? 30 : 1,
        display: 'grid', gridTemplateColumns: '1fr 96px 190px 108px 108px 34px',
        alignItems: 'center', gap: '14px', padding: '10px 16px',
        borderBottom: last ? 'none' : '1px solid var(--line)',
        background: hover ? 'var(--surface2)' : 'transparent', cursor: 'pointer',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
        <div onClick={(e) => e.stopPropagation()}>
          <Checkbox checked={selected} onChange={onSelect} />
        </div>
        <span style={{ color: cat.color, display: 'flex' }}><Icon name={cat.icon} size={14} /></span>
        <span style={{
          fontSize: '12.5px', fontWeight: 500, color: 'var(--text)',
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        }}>{t.name}</span>
      </div>
      <DataValue tone="dim">{t.size}</DataValue>
      <ProgressBar value={t.progress} height={4} paused={t.state === 'paused'} showValue />
      <DataValue tone={t.dl === '0 B/s' ? 'dimmer' : 'accent'}>{t.dl}</DataValue>
      <DataValue tone={t.up === '0 B/s' ? 'dimmer' : 'accent2'}>{t.up}</DataValue>
      <RowMenu hash={t.hash} paused={t.state === 'paused'} open={open} setOpen={setMenu} />
    </div>
  );
}

function EasyCard({ t, selected, onSelect, onOpen }) {
  const cat = catOf(t.category);
  const done = t.progress === 100;
  const plain = done ? 'Sharing with others'
    : t.state === 'paused' ? 'Paused'
    : t.state === 'stalled' ? 'Waiting for people to share'
    : `${t.eta} left`;

  return (
    <div
      onClick={onOpen}
      style={{
        borderRadius: 'var(--radius-2xl)', background: 'var(--surface)',
        border: '1px solid var(--line)', padding: '18px',
        display: 'flex', flexDirection: 'column', gap: '14px', cursor: 'pointer',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
        <div onClick={(e) => e.stopPropagation()}>
          <Checkbox size={20} checked={selected} onChange={onSelect} />
        </div>
        <IconTile size={46} color={cat.color}><Icon name={cat.icon} size={22} /></IconTile>
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '5px' }}>
          <span style={{
            fontSize: '15px', fontWeight: 600, color: 'var(--text)',
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          }}>{t.name}</span>
          <span style={{ fontSize: '12.5px', color: 'var(--text-dim)' }}>{plain}</span>
        </div>
        <Button variant={done ? 'secondary' : 'primary'} size="lg"
                icon={<Icon name={t.state === 'paused' ? 'play' : 'pause'} size={15} />}>
          {t.state === 'paused' ? 'Resume' : done ? 'Stop' : 'Pause'}
        </Button>
      </div>
      <ProgressBar value={t.progress} height={10} paused={t.state === 'paused'} />
    </div>
  );
}

function Fab({ open, setOpen }) {
  const OPTIONS = [
    { label: 'Add torrent file', icon: 'file' },
    { label: 'Add magnet link', icon: 'magnet' },
    { label: 'From URL', icon: 'link' },
    { label: 'Create torrent', icon: 'plus' },
  ];

  return (
    <div style={{ position: 'absolute', right: 26, bottom: 26, zIndex: 25,
                  display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '12px' }}>
      {OPTIONS.map((o, i) => {
        const idx = OPTIONS.length - 1 - i;
        return (
          <div key={o.label} style={{
            display: 'flex', alignItems: 'center', gap: '10px',
            opacity: open ? 1 : 0,
            transform: open ? 'translateY(0) scale(1)' : 'translateY(18px) scale(0.85)',
            pointerEvents: open ? 'auto' : 'none',
            transition: `opacity var(--dur-spring) var(--ease-overshoot) ${idx * 30}ms, transform var(--dur-spring) var(--ease-overshoot) ${idx * 30}ms`,
          }}>
            <span style={{
              padding: '7px 11px', borderRadius: 'var(--radius-lg)',
              background: 'var(--surface)', border: '1px solid var(--line)',
              fontSize: '12px', fontWeight: 600, color: 'var(--text)', whiteSpace: 'nowrap',
            }}>{o.label}</span>
            <FabOption icon={o.icon} />
          </div>
        );
      })}

      <button
        type="button"
        onClick={() => setOpen(!open)}
        title="Add torrent"
        style={{
          width: 58, height: 58, borderRadius: '50%', border: 'none',
          background: 'var(--accent)', color: 'var(--accent-on)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', boxShadow: 'var(--shadow-fab)',
          transform: open ? 'scale(1.04)' : 'scale(1)',
          transition: 'transform var(--dur-spring) var(--ease-overshoot)',
        }}
      >
        <span style={{
          display: 'flex',
          transform: open ? 'rotate(135deg)' : 'rotate(0deg)',
          transition: 'transform var(--dur-spring) var(--ease-overshoot)',
        }}>
          <Icon name="plus" size={24} strokeWidth={2.4} />
        </span>
      </button>
    </div>
  );
}

function FabOption({ icon }) {
  const [hover, setHover] = React.useState(false);
  return (
    <span
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        width: 42, height: 42, borderRadius: '50%',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: hover ? 'var(--accent-hover-surface)' : 'var(--surface)',
        border: '1px solid var(--line)', backdropFilter: 'blur(8px)',
        color: hover ? 'var(--accent)' : 'var(--text-dim)',
        boxShadow: 'var(--shadow-float)', cursor: 'pointer',
        transform: hover ? 'scale(1.08)' : 'scale(1)',
        transition: 'background var(--dur-fast) var(--ease-plain), color var(--dur-fast) var(--ease-plain), transform var(--dur-fast) var(--ease-plain)',
      }}
    >
      <Icon name={icon} size={17} />
    </span>
  );
}

export function TransfersScreen({ layout, setLayout, onOpenTorrent }) {
  const [status, setStatus] = React.useState('all');
  const [cat, setCat] = React.useState(null);
  const [tag, setTag] = React.useState(null);
  const [query, setQuery] = React.useState('');
  const [sel, setSel] = React.useState([]);
  const [menu, setMenu] = React.useState(null);
  const [alt, setAlt] = React.useState(false);
  const [fab, setFab] = React.useState(false);

  const list = TORRENTS.filter((t) => {
    if (status === 'downloading' && t.state !== 'downloading') return false;
    if (status === 'seeding' && t.state !== 'seeding') return false;
    if (status === 'completed' && t.progress !== 100) return false;
    if (status === 'paused' && t.state !== 'paused') return false;
    if (status === 'stalled' && t.state !== 'stalled') return false;
    if (cat && t.category !== cat) return false;
    if (tag && !t.tags.includes(tag)) return false;
    if (query && !t.name.toLowerCase().includes(query.toLowerCase())) return false;
    return true;
  });

  const toggle = (h) => setSel((s) => s.includes(h) ? s.filter((x) => x !== h) : s.concat(h));
  const filtered = cat || tag || query;

  return (
    <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>
      {/* sidebar */}
      <aside style={{
        width: 'var(--sidebar-width)', flexShrink: 0, boxSizing: 'border-box',
        background: 'var(--sidebar-bg)', borderRight: '1px solid var(--line)',
        padding: '14px 12px', display: 'flex', flexDirection: 'column', gap: '16px',
        overflow: 'auto',
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
          <SectionHeader style={{ padding: '0 9px 3px' }}>Status</SectionHeader>
          {STATUSES.map((s) => (
            <FilterRow key={s.key} label={s.label} count={s.count} active={status === s.key}
                       icon={<Icon name={s.icon} size={14} />}
                       onClick={() => setStatus(s.key)} />
          ))}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
          <SectionHeader style={{ padding: '0 9px 3px' }}>Categories</SectionHeader>
          {CATEGORIES.map((c) => (
            <FilterRow key={c.name} label={c.name} count={c.count} active={cat === c.name}
                       icon={<span style={{ color: c.color, display: 'flex' }}><Icon name={c.icon} size={14} /></span>}
                       onClick={() => setCat(cat === c.name ? null : c.name)} />
          ))}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
          <SectionHeader style={{ padding: '0 9px 3px' }}>Tags</SectionHeader>
          {TAGS.map((t) => (
            <FilterRow key={t.name} label={t.name} count={t.count} dot={t.color}
                       active={tag === t.name}
                       onClick={() => setTag(tag === t.name ? null : t.name)} />
          ))}
        </div>

        <button
          type="button"
          onClick={() => { setCat(null); setTag(null); setQuery(''); }}
          style={{
            alignSelf: 'flex-start', margin: '0 9px', padding: 0, border: 'none',
            background: 'transparent', color: 'var(--accent)', cursor: 'pointer',
            fontSize: '11.5px', fontWeight: 600, fontFamily: 'var(--font-ui)',
            opacity: filtered ? 1 : 0, pointerEvents: filtered ? 'auto' : 'none',
            transition: 'opacity var(--dur-quick) var(--ease-plain)',
          }}
        >Clear filters</button>

        <div style={{ flex: 1 }} />

        <Card padded={false} style={{ borderRadius: 'var(--radius-3xl)' }}>
          <div style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '7px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--accent)' }}>
              <Icon name="down" size={13} />
              <span style={{ fontSize: '11px', color: 'var(--text-dim)', flex: 1 }}>Download</span>
              <DataValue tone="accent" weight={600}>18.9 MiB/s</DataValue>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--accent2)' }}>
              <Icon name="up" size={13} />
              <span style={{ fontSize: '11px', color: 'var(--text-dim)', flex: 1 }}>Upload</span>
              <DataValue tone="accent2" weight={600}>4.7 MiB/s</DataValue>
            </div>
          </div>
          <div style={{ background: 'var(--surface2)', borderTop: '1px solid var(--line)', borderBottom: '1px solid var(--line)' }}>
            <Sparkline data={speedSeries(60, 1)} upload={speedSeries(60, 3, 0.35)} height={46} />
          </div>
        </Card>
      </aside>

      {/* main */}
      <main style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', position: 'relative' }}>
        <div style={{
          height: 'var(--toolbar-height)', flexShrink: 0, boxSizing: 'border-box',
          display: 'flex', alignItems: 'center', gap: '10px',
          padding: '0 var(--pad-screen-x)', borderBottom: '1px solid var(--line)',
        }}>
          <Button size="sm" icon={<Icon name="play" size={13} />}>Resume</Button>
          <Button size="sm" icon={<Icon name="pause" size={13} />}>Pause</Button>
          <Button size="sm" variant="danger" icon={<Icon name="trash" size={13} />}>Remove</Button>

          {sel.length ? (
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: '7px',
              padding: '5px 6px 5px 11px', borderRadius: 'var(--radius-pill)',
              background: 'var(--accent-soft)', color: 'var(--accent)',
              fontSize: '11.5px', fontWeight: 600,
            }}>
              {sel.length} selected
              <IconButton size="sm" title="Clear selection" onClick={() => setSel([])}
                          style={{ width: 20, height: 20, background: 'transparent', border: 'none' }}>
                <Icon name="x" size={12} />
              </IconButton>
            </span>
          ) : null}

          <span style={{ flex: 1 }} />

          <Input size="sm" width={232} value={query} mono
                 onChange={(e) => setQuery(e.target.value)}
                 icon={<Icon name="search" size={13} />} placeholder="Search torrents…" />
          <SectionHeader>View</SectionHeader>
          <SegmentedControl size="sm" value={layout} onChange={setLayout}
            options={[
              { value: 'easy', label: 'Easy', icon: <Icon name="easy" size={13} /> },
              { value: 'grid', label: 'Grid', icon: <Icon name="grid" size={13} /> },
              { value: 'list', label: 'List', icon: <Icon name="rows" size={13} /> },
            ]} />
          <span style={{ width: 1, height: 22, background: 'var(--line)' }} />
          <span style={{ display: 'flex', alignItems: 'center', gap: '8px', color: alt ? 'var(--accent)' : 'var(--text-dim)' }}>
            <Icon name="rabbit" size={15} />
            <NS.Switch checked={alt} onChange={setAlt} label="Alternative speed limits" />
          </span>
        </div>

        <div style={{ flex: 1, overflow: 'auto', padding: 'var(--pad-screen-x)' }}>
          {!list.length ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center',
                          gap: '12px', padding: '80px 0' }}>
              <IconTile size={46}><Icon name="search" size={22} /></IconTile>
              <span style={{ fontSize: '15px', fontWeight: 600 }}>No torrents match these filters</span>
              <span style={{ fontSize: '12.5px', color: 'var(--text-dim)' }}>
                Nothing in this view matches the category, tag or search you have set.
              </span>
              <Button onClick={() => { setStatus('all'); setCat(null); setTag(null); setQuery(''); }}>
                Clear filters
              </Button>
            </div>
          ) : layout === 'grid' ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(330px, 1fr))', gap: '14px' }}>
              {list.map((t) => (
                <GridCard key={t.hash} t={t} menu={menu} setMenu={setMenu}
                          selected={sel.includes(t.hash)} onSelect={() => toggle(t.hash)}
                          onOpen={() => onOpenTorrent(t)} />
              ))}
            </div>
          ) : layout === 'list' ? (
            <Card padded={false}>
              {list.map((t, i) => (
                <ListRow key={t.hash} t={t} menu={menu} setMenu={setMenu} last={i === list.length - 1}
                         selected={sel.includes(t.hash)} onSelect={() => toggle(t.hash)}
                         onOpen={() => onOpenTorrent(t)} />
              ))}
            </Card>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {list.map((t) => (
                <EasyCard key={t.hash} t={t}
                          selected={sel.includes(t.hash)} onSelect={() => toggle(t.hash)}
                          onOpen={() => onOpenTorrent(t)} />
              ))}
            </div>
          )}
        </div>

        <Fab open={fab} setOpen={setFab} />
      </main>
    </div>
  );
}
