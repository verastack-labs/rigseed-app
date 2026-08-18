import React from 'react';

const PADS = { sm: '7px 12px', md: '9px 17px', lg: '11px 20px' };
const SIZES = { sm: '11.5px', md: '12.5px', lg: '13px' };

/** Primary, secondary, ghost and danger actions. */
export function Button({
  variant = 'secondary', size = 'md', icon, iconRight, disabled,
  fullWidth, type = 'button', onClick, children, style, ...rest
}) {
  const [hover, setHover] = React.useState(false);
  const [down, setDown] = React.useState(false);

  const skin = {
    primary: {
      background: 'var(--accent)', color: 'var(--accent-on)',
      border: '1px solid var(--accent)', fontWeight: 700,
      filter: hover ? 'brightness(1.07)' : 'none',
    },
    secondary: {
      background: hover ? 'var(--accent-soft)' : 'var(--surface2)',
      color: hover ? 'var(--accent)' : 'var(--text)',
      border: '1px solid var(--line)', fontWeight: 600,
    },
    ghost: {
      background: hover ? 'var(--surface2)' : 'transparent',
      color: hover ? 'var(--text)' : 'var(--text-dim)',
      border: '1px solid transparent', fontWeight: 600,
    },
    danger: {
      background: hover ? 'var(--danger-soft)' : 'var(--surface2)',
      color: 'var(--danger)',
      border: '1px solid var(--line)', fontWeight: 600,
    },
  }[variant];

  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => { setHover(false); setDown(false); }}
      onMouseDown={() => setDown(true)}
      onMouseUp={() => setDown(false)}
      style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '7px',
        width: fullWidth ? '100%' : undefined,
        padding: PADS[size], borderRadius: 'var(--radius-lg)',
        fontFamily: 'var(--font-ui)', fontSize: SIZES[size],
        cursor: disabled ? 'default' : 'pointer', whiteSpace: 'nowrap',
        opacity: disabled ? 0.45 : 1, pointerEvents: disabled ? 'none' : 'auto',
        transform: down ? 'scale(0.96)' : 'scale(1)',
        transition: 'background var(--dur-fast) var(--ease-plain), color var(--dur-fast) var(--ease-plain), transform var(--dur-fast) var(--ease-plain)',
        ...skin, ...style,
      }}
      {...rest}
    >
      {icon}{children}{iconRight}
    </button>
  );
}
