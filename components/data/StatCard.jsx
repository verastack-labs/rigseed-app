import React from 'react';

/** Icon + label over a mono value and a sub-line. */
export function StatCard({ icon, label, value, sub, tone = 'default', style }) {
  const valueColor = {
    default: 'var(--text)', accent: 'var(--accent)', accent2: 'var(--accent2)',
    warn: 'var(--warn)', dim: 'var(--text-dim)',
  }[tone];

  return (
    <div style={{
      borderRadius: 'var(--radius-2xl)', background: 'var(--surface)',
      border: '1px solid var(--line)', padding: '14px 16px',
      display: 'flex', flexDirection: 'column', gap: '8px', ...style,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '7px', color: 'var(--text-dimmer)' }}>
        {icon}
        <span style={{
          fontSize: 'var(--text-eyebrow)', fontWeight: 700,
          letterSpacing: 'var(--tracking-eyebrow)', textTransform: 'uppercase',
        }}>{label}</span>
      </div>
      <span style={{
        fontFamily: 'var(--font-mono)', fontSize: 'var(--text-stat)',
        fontWeight: 600, color: valueColor,
      }}>{value}</span>
      {sub ? (
        <span style={{ fontSize: '11px', color: 'var(--text-dim)' }}>{sub}</span>
      ) : null}
    </div>
  );
}
