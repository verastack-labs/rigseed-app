import React from 'react';

/** Rounded tinted square behind a feature icon. */
export function IconTile({ size = 32, color, tone = 'accent', radius, children, style }) {
  const c = color || (tone === 'accent2' ? 'var(--accent2)' : tone === 'warn' ? 'var(--warn)' : 'var(--accent)');
  return (
    <span style={{
      width: size, height: size, flexShrink: 0,
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      borderRadius: radius || Math.round(size * 0.28),
      background: `color-mix(in srgb, ${c} 18%, transparent)`,
      color: c, ...style,
    }}>{children}</span>
  );
}
