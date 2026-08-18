import React from 'react';

/** Anchored menu. Right edges align with the trigger, 8px below it. */
export function ContextMenu({ items = [], open, onClose, above, width = 224, style }) {
  React.useEffect(() => {
    if (!open) return undefined;
    const close = () => onClose && onClose();
    window.addEventListener('click', close);
    return () => window.removeEventListener('click', close);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      onClick={(e) => e.stopPropagation()}
      style={{
        position: 'absolute', right: 0, width,
        top: above ? undefined : 'calc(100% + 8px)',
        bottom: above ? 'calc(100% + 8px)' : undefined,
        zIndex: 30, padding: '6px',
        borderRadius: 'var(--radius-3xl)', background: 'var(--surface)',
        border: '1px solid var(--line)', boxShadow: 'var(--shadow-card)',
        ...style,
      }}
    >
      {items.map((it, i) => it.separator ? (
        <div key={'sep' + i} style={{ height: 1, background: 'var(--line)', margin: '5px 4px' }} />
      ) : (
        <MenuRow key={it.label} item={it} onClose={onClose} />
      ))}
    </div>
  );
}

function MenuRow({ item, onClose }) {
  const [hover, setHover] = React.useState(false);
  return (
    <button
      type="button"
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onClick={() => { item.onClick && item.onClick(); onClose && onClose(); }}
      style={{
        display: 'flex', alignItems: 'center', gap: '10px',
        width: '100%', boxSizing: 'border-box', padding: '7px 9px',
        border: 'none', borderRadius: 'var(--radius-md)',
        background: hover ? 'var(--surface2)' : 'transparent',
        color: item.danger ? 'var(--danger)' : 'var(--text)',
        fontFamily: 'var(--font-ui)', fontSize: '12px', fontWeight: 500,
        cursor: 'pointer', textAlign: 'left',
      }}
    >
      <span style={{ display: 'flex', color: item.danger ? 'var(--danger)' : 'var(--text-dim)' }}>{item.icon}</span>
      {item.label}
    </button>
  );
}
