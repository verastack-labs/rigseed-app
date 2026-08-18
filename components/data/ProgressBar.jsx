import React from 'react';

/** Track + fill. Animates between polls so a download reads as continuous. */
export function ProgressBar({
  value = 0, height = 6, tone = 'accent', paused, showValue, split, style,
}) {
  const pct = Math.max(0, Math.min(100, value));
  const fill = paused ? 'var(--text-dimmer)' : tone === 'accent2' ? 'var(--accent2)' : 'var(--accent)';

  const bar = (
    <div style={{
      flex: 1, height, borderRadius: Math.max(2, height / 2),
      background: 'var(--surface2)', overflow: 'hidden', display: 'flex',
    }}>
      <div style={{
        width: pct + '%', background: fill,
        transition: 'width var(--dur-base) var(--ease-plain), background var(--dur-quick) var(--ease-plain)',
      }} />
      {split ? (
        <div style={{ width: (100 - pct) + '%', background: 'var(--accent-soft)' }} />
      ) : null}
    </div>
  );

  if (!showValue) return <div style={{ display: 'flex', ...style }}>{bar}</div>;

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', ...style }}>
      {bar}
      <span style={{
        fontFamily: 'var(--font-mono)', fontSize: '11px', fontWeight: 500,
        color: paused ? 'var(--text-dimmer)' : 'var(--text-dim)',
        minWidth: 34, textAlign: 'right',
      }}>{pct.toFixed(0)}%</span>
    </div>
  );
}
