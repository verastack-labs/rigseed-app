import React from 'react';

const SIZES = { sm: 30, md: 32, lg: 34 };

/** Square icon-only control. Always give it a title. */
export function IconButton({
  size = 'md', active, disabled, title, onClick, children, style, ...rest
}) {
  const [hover, setHover] = React.useState(false);
  const px = SIZES[size];
  const on = active || hover;

  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      disabled={disabled}
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        width: px, height: px, display: 'inline-flex', alignItems: 'center',
        justifyContent: 'center', flexShrink: 0,
        borderRadius: 'var(--radius-lg)',
        background: active ? 'var(--accent-soft)' : 'var(--surface2)',
        border: `1px solid ${active ? 'var(--accent)' : 'var(--line)'}`,
        color: on ? 'var(--accent)' : 'var(--text-dim)',
        cursor: disabled ? 'default' : 'pointer',
        opacity: disabled ? 0.45 : 1, pointerEvents: disabled ? 'none' : 'auto',
        transition: 'background var(--dur-quick) var(--ease-plain), color var(--dur-quick) var(--ease-plain), border-color var(--dur-quick) var(--ease-plain)',
        ...style,
      }}
      {...rest}
    >
      {children}
    </button>
  );
}
