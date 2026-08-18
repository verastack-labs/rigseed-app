import React from 'react';

/** 10px uppercase label that opens a group. */
export function SectionHeader({ children, style }) {
  return (
    <span style={{
      fontFamily: 'var(--font-ui)', fontSize: 'var(--text-eyebrow)',
      fontWeight: 700, letterSpacing: 'var(--tracking-eyebrow)',
      textTransform: 'uppercase', color: 'var(--text-dimmer)',
      flexShrink: 0, ...style,
    }}>{children}</span>
  );
}
