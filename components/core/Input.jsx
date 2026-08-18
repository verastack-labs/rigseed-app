import React from 'react';

/** Text input. Mono for paths, numbers and magnets; Inter for names. */
export function Input({
  mono, size = 'md', width, unit, icon, invalid, style, ...rest
}) {
  const [focus, setFocus] = React.useState(false);
  const h = size === 'sm' ? 31 : size === 'lg' ? 42 : 34;

  const field = (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '8px',
      height: h, width: width || '100%', boxSizing: 'border-box',
      padding: '0 11px', borderRadius: 'var(--radius-lg)',
      background: 'var(--surface2)',
      border: `1px solid ${invalid ? 'var(--danger)' : focus ? 'var(--accent)' : 'var(--line)'}`,
      transition: 'border-color var(--dur-fast) var(--ease-plain)',
    }}>
      {icon ? <span style={{ display: 'flex', color: 'var(--text-dimmer)', flexShrink: 0 }}>{icon}</span> : null}
      <input
        onFocus={(e) => { setFocus(true); rest.onFocus && rest.onFocus(e); }}
        onBlur={(e) => { setFocus(false); rest.onBlur && rest.onBlur(e); }}
        {...rest}
        style={{
          flex: 1, minWidth: 0, border: 'none', outline: 'none', background: 'transparent',
          color: 'var(--text)',
          fontFamily: mono ? 'var(--font-mono)' : 'var(--font-ui)',
          fontSize: size === 'lg' ? '15px' : '12px',
          fontWeight: size === 'lg' ? 600 : 400,
          ...style,
        }}
      />
    </div>
  );

  if (!unit) return field;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      {field}
      <span style={{
        width: 44, flexShrink: 0, fontFamily: 'var(--font-mono)',
        fontSize: '10.5px', color: 'var(--text-dimmer)',
      }}>{unit}</span>
    </div>
  );
}
