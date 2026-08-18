import React from 'react';

/** 16×16 selection box - torrent rows, file lists. */
export function Checkbox({ checked, indeterminate, onChange, disabled, size = 16, label, style }) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={indeterminate ? 'mixed' : !!checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange && onChange(!checked)}
      style={{
        width: size, height: size, flexShrink: 0, padding: 0,
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        borderRadius: 'var(--radius-sm)',
        background: checked || indeterminate ? 'var(--accent)' : 'transparent',
        border: `1.5px solid ${checked || indeterminate ? 'var(--accent)' : 'var(--line)'}`,
        cursor: disabled ? 'default' : 'pointer',
        opacity: disabled ? 0.45 : 1, pointerEvents: disabled ? 'none' : 'auto',
        transition: 'background var(--dur-fast) var(--ease-plain), border-color var(--dur-fast) var(--ease-plain)',
        ...style,
      }}
    >
      {indeterminate ? (
        <span style={{ width: size * 0.5, height: 2, borderRadius: 1, background: 'var(--accent-on)' }} />
      ) : checked ? (
        <svg width={size * 0.68} height={size * 0.68} viewBox="0 0 24 24" fill="none"
             stroke="var(--accent-on)" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 6 9 17l-5-5" />
        </svg>
      ) : null}
    </button>
  );
}
