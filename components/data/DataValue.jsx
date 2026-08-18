import React from 'react';

const SIZES = { xs: '10.5px', sm: '11px', md: '12.5px', lg: '17px', xl: '20px', hero: '40px' };

/** Mono value. The component that enforces the Inter/Mono split. */
export function DataValue({ size = 'sm', tone = 'default', weight, children, style }) {
  const color = {
    default: 'var(--text)',
    dim: 'var(--text-dim)',
    dimmer: 'var(--text-dimmer)',
    accent: 'var(--accent)',
    accent2: 'var(--accent2)',
    warn: 'var(--warn)',
    danger: 'var(--danger)',
  }[tone];

  return (
    <span style={{
      fontFamily: 'var(--font-mono)', fontSize: SIZES[size],
      fontWeight: weight || (size === 'lg' || size === 'xl' ? 600 : 400),
      color, whiteSpace: 'nowrap', ...style,
    }}>{children}</span>
  );
}
