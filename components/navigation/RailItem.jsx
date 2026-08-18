import React from 'react';

/** One destination in the nav rail. Icon sits in a fixed 24px slot. */
export function RailItem({ icon, label, active, expanded, onClick, style }) {
  const [hover, setHover] = React.useState(false);
  return (
    <button
      type="button"
      title={label}
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: 'flex', alignItems: 'center', gap: '11px',
        height: 40, padding: '0 8px', width: '100%', boxSizing: 'border-box',
        border: 'none', borderRadius: 'var(--radius-xl)',
        background: active ? 'var(--accent-soft)' : hover ? 'var(--surface2)' : 'transparent',
        color: active ? 'var(--accent)' : hover ? 'var(--text)' : 'var(--text-dim)',
        cursor: 'pointer', overflow: 'hidden', textAlign: 'left',
        transition: 'background var(--dur-quick) var(--ease-plain), color var(--dur-quick) var(--ease-plain)',
        ...style,
      }}
    >
      <span style={{ width: 24, display: 'flex', justifyContent: 'center', flexShrink: 0 }}>{icon}</span>
      <span style={{
        fontFamily: 'var(--font-ui)', fontSize: '12.5px', fontWeight: 600,
        whiteSpace: 'nowrap', opacity: expanded ? 1 : 0,
        transition: 'opacity var(--dur-fast) var(--ease-plain)',
      }}>{label}</span>
    </button>
  );
}
