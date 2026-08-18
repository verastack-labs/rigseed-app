import React from 'react';

/** 36×20 toggle. The only on/off control in the system. */
export function Switch({ checked, onChange, disabled, label, style }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={!!checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange && onChange(!checked)}
      style={{
        width: 36, height: 20, flexShrink: 0, padding: 0, position: 'relative',
        borderRadius: 10, cursor: disabled ? 'default' : 'pointer',
        background: checked ? 'var(--accent-soft)' : 'var(--surface2)',
        border: `1px solid ${checked ? 'var(--accent)' : 'var(--line)'}`,
        opacity: disabled ? 0.45 : 1, pointerEvents: disabled ? 'none' : 'auto',
        transition: 'background var(--dur-quick) var(--ease-plain), border-color var(--dur-quick) var(--ease-plain)',
        ...style,
      }}
    >
      <span style={{
        position: 'absolute', top: 3, left: 3, width: 12, height: 12,
        borderRadius: '50%',
        background: checked ? 'var(--accent)' : 'var(--text-dimmer)',
        transform: checked ? 'translateX(16px)' : 'translateX(0)',
        transition: 'transform var(--dur-spring) var(--ease-overshoot), background var(--dur-quick) var(--ease-plain)',
      }} />
    </button>
  );
}
