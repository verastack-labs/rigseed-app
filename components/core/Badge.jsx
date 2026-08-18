import React from 'react';

const TONE = {
  neutral: ['var(--surface2)', 'var(--text-dim)', 'var(--line)'],
  accent: ['var(--accent-soft)', 'var(--accent)', 'var(--accent)'],
  accent2: ['var(--accent2-soft)', 'var(--accent2)', 'var(--accent2)'],
  warn: ['var(--warn-soft)', 'var(--warn)', 'var(--warn)'],
  danger: ['var(--danger-soft)', 'var(--danger)', 'var(--danger)'],
};

/** Small mono count or status word. */
export function Badge({ tone = 'neutral', mono = true, children, style }) {
  const [bg, fg, bd] = TONE[tone];
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center',
      padding: '2px 6px', borderRadius: 'var(--radius-sm)',
      background: bg, color: fg, border: `1px solid ${bd}`,
      fontFamily: mono ? 'var(--font-mono)' : 'var(--font-ui)',
      fontSize: '10px', fontWeight: 600, ...style,
    }}>{children}</span>
  );
}
