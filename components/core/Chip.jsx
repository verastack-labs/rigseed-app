import React from 'react';

/** Pill filter chip — engines, categories, tags. */
export function Chip({
  label, dot, icon, count, selected, dashed, onClick, color, style,
}) {
  const [hover, setHover] = React.useState(false);
  const tint = color && selected ? `color-mix(in srgb, ${color} 18%, transparent)` : null;

  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: '7px',
        padding: '6px 11px', borderRadius: 'var(--radius-pill)',
        background: selected ? (tint || 'var(--accent-soft)') : hover ? 'var(--surface2)' : 'var(--surface2)',
        border: `1px ${dashed ? 'dashed' : 'solid'} ${selected ? (color || 'var(--accent)') : hover ? 'var(--accent)' : 'var(--line)'}`,
        color: selected ? (color || 'var(--accent)') : 'var(--text-dim)',
        fontFamily: 'var(--font-ui)', fontSize: '12px', fontWeight: 600,
        cursor: 'pointer', whiteSpace: 'nowrap',
        transition: 'background var(--dur-quick) var(--ease-plain), border-color var(--dur-quick) var(--ease-plain), color var(--dur-quick) var(--ease-plain)',
        ...style,
      }}
    >
      {dot ? (
        <span style={{ width: 7, height: 7, borderRadius: '50%', background: color || 'var(--accent)', flexShrink: 0 }} />
      ) : null}
      {icon}
      {label}
      {count != null ? (
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10.5px', opacity: 0.8 }}>{count}</span>
      ) : null}
    </button>
  );
}
