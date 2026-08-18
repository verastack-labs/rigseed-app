import React from 'react';

const TONE = {
  accent: 'var(--accent)',
  accent2: 'var(--accent2)',
  warn: 'var(--warn)',
  danger: 'var(--danger)',
  muted: 'var(--text-dimmer)',
};

/** Coloured dot plus its word. Never ship the dot alone. */
export function StatusDot({ tone = 'muted', label, pulse, size = 7, mono, style }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', ...style }}>
      <span style={{
        width: size, height: size, borderRadius: '50%', flexShrink: 0,
        background: TONE[tone],
        animation: pulse ? 'rs-pulse 1.4s ease-in-out infinite' : undefined,
      }} />
      {label ? (
        <span style={{
          fontFamily: mono ? 'var(--font-mono)' : 'var(--font-ui)',
          fontSize: mono ? '10.5px' : '10.5px', fontWeight: 600,
          color: tone === 'muted' ? 'var(--text-dim)' : TONE[tone],
        }}>{label}</span>
      ) : null}
      <style>{'@keyframes rs-pulse{0%,100%{opacity:1}50%{opacity:.35}}'}</style>
    </span>
  );
}
