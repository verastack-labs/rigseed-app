import React from 'react';

/** Sidebar filter line - status, category or tag. */
export function FilterRow({ icon, dot, label, count, active, onClick, style }) {
  const [hover, setHover] = React.useState(false);
  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: 'flex', alignItems: 'center', gap: '10px',
        width: '100%', boxSizing: 'border-box', padding: '8px 9px',
        border: 'none', borderRadius: 'var(--radius-md)',
        background: active ? 'var(--accent-soft)' : hover ? 'var(--surface2)' : 'transparent',
        color: active ? 'var(--accent)' : 'var(--text-dim)',
        cursor: 'pointer', textAlign: 'left',
        transition: 'background var(--dur-quick) var(--ease-plain), color var(--dur-quick) var(--ease-plain)',
        ...style,
      }}
    >
      {dot ? (
        <span style={{ width: 9, height: 9, borderRadius: '50%', background: dot, flexShrink: 0, marginLeft: 3 }} />
      ) : (
        <span style={{ display: 'flex', flexShrink: 0 }}>{icon}</span>
      )}
      <span style={{
        flex: 1, minWidth: 0, fontSize: '12.5px',
        fontWeight: active ? 600 : 500, whiteSpace: 'nowrap',
        overflow: 'hidden', textOverflow: 'ellipsis',
        color: active ? 'var(--accent)' : 'var(--text)',
      }}>{label}</span>
      {count != null ? (
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10.5px', color: 'var(--text-dimmer)' }}>{count}</span>
      ) : null}
    </button>
  );
}
