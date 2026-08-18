import React from 'react';

/** Surface container. Header strip is optional and sits on surface2. */
export function Card({ title, api, action, padded = true, hoverable, children, style }) {
  const [hover, setHover] = React.useState(false);
  return (
    <div
      onMouseEnter={() => hoverable && setHover(true)}
      onMouseLeave={() => hoverable && setHover(false)}
      style={{
        borderRadius: 'var(--radius-2xl)', background: 'var(--surface)',
        border: `1px solid ${hover ? 'var(--accent)' : 'var(--line)'}`,
        overflow: 'hidden', flexShrink: 0,
        transition: 'border-color var(--dur-quick) var(--ease-plain)',
        ...style,
      }}
    >
      {title ? (
        <div style={{
          display: 'flex', alignItems: 'center', gap: '10px',
          padding: '13px 18px', background: 'var(--surface2)',
          borderBottom: '1px solid var(--line)',
        }}>
          <span style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--text)' }}>{title}</span>
          <span style={{ flex: 1 }} />
          {api ? (
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10.5px', color: 'var(--text-dimmer)' }}>{api}</span>
          ) : null}
          {action}
        </div>
      ) : null}
      <div style={{ padding: padded ? 'var(--pad-card-lg)' : 0 }}>{children}</div>
    </div>
  );
}
