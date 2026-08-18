import React from 'react';

/** Mutually exclusive choices in one strip - layouts, tabs, modes. */
export function SegmentedControl({ options = [], value, onChange, size = 'md', style }) {
  const pad = size === 'sm' ? '5px 9px' : '6px 12px';
  return (
    <div style={{
      display: 'inline-flex', gap: '3px', padding: '3px',
      borderRadius: 'var(--radius-xl)', background: 'var(--surface2)',
      border: '1px solid var(--line)', ...style,
    }}>
      {options.map((o) => {
        const opt = typeof o === 'string' ? { value: o, label: o } : o;
        const on = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            title={opt.label}
            onClick={() => onChange && onChange(opt.value)}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '6px',
              padding: pad, border: 'none', borderRadius: 'var(--radius-md)',
              background: on ? 'var(--accent-soft)' : 'transparent',
              color: on ? 'var(--accent)' : 'var(--text-dim)',
              fontFamily: 'var(--font-ui)',
              fontSize: size === 'sm' ? '11.5px' : '12px',
              fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap',
              transition: 'background var(--dur-quick) var(--ease-plain), color var(--dur-quick) var(--ease-plain)',
            }}
          >
            {opt.icon}{opt.label}
            {opt.count != null ? (
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', opacity: 0.75 }}>{opt.count}</span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
