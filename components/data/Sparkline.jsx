import React from 'react';

/** 60-sample speed history. The only graphic surface in the app. */
export function Sparkline({
  data = [], upload, height = 46, tone = 'accent', fill = true, gridlines, style,
}) {
  const series = data.length ? data : [0];
  const all = upload && upload.length ? series.concat(upload) : series;
  const max = Math.max(1, ...all);
  const w = 100, h = 100;

  const path = (arr) => arr.map((v, i) => {
    const x = (i / Math.max(1, arr.length - 1)) * w;
    const y = h - (v / max) * h * 0.92;
    return `${i ? 'L' : 'M'}${x.toFixed(2)} ${y.toFixed(2)}`;
  }).join(' ');

  const c1 = tone === 'accent2' ? 'var(--accent2)' : 'var(--accent)';

  return (
    <div style={{ height, width: '100%', position: 'relative', ...style }}>
      <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none"
           style={{ width: '100%', height: '100%', display: 'block' }}>
        {gridlines ? [33, 66].map((y) => (
          <line key={y} x1="0" x2={w} y1={y} y2={y}
                stroke="var(--line)" strokeWidth="0.5" vectorEffect="non-scaling-stroke" />
        )) : null}
        {fill ? (
          <path d={`${path(series)} L${w} ${h} L0 ${h} Z`} fill={c1} opacity="0.16" />
        ) : null}
        <path d={path(series)} fill="none" stroke={c1} strokeWidth="1.8"
              vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
        {upload && upload.length ? (
          <path d={path(upload)} fill="none" stroke="var(--accent2)" strokeWidth="1.8"
                vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
        ) : null}
      </svg>
    </div>
  );
}
