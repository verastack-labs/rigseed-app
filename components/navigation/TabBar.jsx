import React from 'react';

/** Underlined tabs - the detail screen's five sections. */
export function TabBar({ tabs = [], value, onChange, style }) {
  return (
    <div style={{ display: 'flex', gap: '2px', ...style }}>
      {tabs.map((t) => {
        const on = t.value === value;
        return (
          <button
            key={t.value}
            type="button"
            onClick={() => onChange && onChange(t.value)}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '7px',
              padding: '11px 15px', border: 'none', background: 'transparent',
              borderBottom: `2px solid ${on ? 'var(--accent)' : 'transparent'}`,
              color: on ? 'var(--accent)' : 'var(--text-dim)',
              fontFamily: 'var(--font-ui)', fontSize: '12.5px', fontWeight: 600,
              cursor: 'pointer', whiteSpace: 'nowrap',
              transition: 'color var(--dur-quick) var(--ease-plain), border-color var(--dur-quick) var(--ease-plain)',
            }}
          >
            {t.icon}{t.label}
            {t.count != null ? (
              <span style={{
                fontFamily: 'var(--font-mono)', fontSize: '10px',
                padding: '2px 5px', borderRadius: 'var(--radius-sm)',
                background: on ? 'var(--accent-soft)' : 'var(--surface2)',
              }}>{t.count}</span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
