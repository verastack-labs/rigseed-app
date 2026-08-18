import React from 'react';

const P = {
  list: 'M4 6h16M4 12h16M4 18h10',
  search: 'M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16zM21 21l-4.3-4.3',
  folder: 'M4 6h7l2 3h7v9H4z',
  logs: 'M6 4h12v16H6zM9 8h6M9 12h6M9 16h4',
  settings: 'M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-2.7 1.1v.3a2 2 0 1 1-4 0v-.2a1.6 1.6 0 0 0-2.8-1.1l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1A1.6 1.6 0 0 0 3.5 14H3a2 2 0 1 1 0-4h.2a1.6 1.6 0 0 0 1.1-2.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1A1.6 1.6 0 0 0 10 3.5V3a2 2 0 1 1 4 0v.2a1.6 1.6 0 0 0 2.7 1.1l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0 1.1 2.7h.3a2 2 0 1 1 0 4h-.2a1.6 1.6 0 0 0-1.3 1.2z',
  menu: 'M4 7h16M4 12h16M4 17h16',
  down: 'M12 4v12M7 12l5 5 5-5M5 20h14',
  up: 'M12 20V8M7 12l5-5 5 5M5 4h14',
  play: 'M8 5.5v13l10-6.5z',
  pause: 'M9 5v14M15 5v14',
  check: 'M20 6 9 17l-5-5',
  clock: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 7v5l3 2',
  trash: 'M5 7h14M9 7V5h6v2M7 7l1 12h8l1-12',
  more: 'M12 6.5h.01M12 12h.01M12 17.5h.01',
  plus: 'M12 5v14M5 12h14',
  x: 'M6 6l12 12M18 6L6 18',
  chevron: 'M9 6l6 6-6 6',
  chevronDown: 'M6 9l6 6 6-6',
  back: 'M15 6l-6 6 6 6',
  palette: 'M12 3a9 9 0 1 0 0 18c1.1 0 1.8-.8 1.8-1.7 0-.5-.2-.9-.5-1.2-.3-.3-.5-.7-.5-1.1 0-.9.8-1.7 1.7-1.7H16a5 5 0 0 0 5-5c0-4-4-7.3-9-7.3z',
  moon: 'M21 12.8A8.5 8.5 0 1 1 11.2 3a6.6 6.6 0 0 0 9.8 9.8z',
  sun: 'M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M18.4 5.6 17 7M7 17l-1.4 1.4',
  magnet: 'M6 5v7a6 6 0 0 0 12 0V5h-4v7a2 2 0 0 1-4 0V5z',
  link: 'M10 13a5 5 0 0 0 7 0l2-2a5 5 0 0 0-7-7l-1 1M14 11a5 5 0 0 0-7 0l-2 2a5 5 0 0 0 7 7l1-1',
  file: 'M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8zM14 3v5h5',
  film: 'M4 5h16v14H4zM4 9h16M4 15h16M9 5v14M15 5v14',
  music: 'M9 18V6l10-2v12M9 18a3 3 0 1 1-6 0 3 3 0 0 1 6 0zM19 16a3 3 0 1 1-6 0 3 3 0 0 1 6 0z',
  box: 'M4 8l8-4 8 4v8l-8 4-8-4zM4 8l8 4 8-4M12 12v8',
  rabbit: 'M14 8a4 4 0 0 1 4 4v6H8v-6a4 4 0 0 1 4-4zM9 8 7 3M14 8l2-5M8 14h.01',
  grid: 'M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z',
  rows: 'M4 6h16M4 12h16M4 18h16',
  easy: 'M4 5h16v6H4zM4 13h16v6H4z',
  seed: 'M12 20V10M12 10a5 5 0 0 1 5-5h2v2a5 5 0 0 1-5 5zM12 14a5 5 0 0 0-5-5H5v2a5 5 0 0 0 5 5z',
  wifi: 'M5 12.5a10 10 0 0 1 14 0M8.5 16a5 5 0 0 1 7 0M12 19.5h.01M2 9a15 15 0 0 1 20 0',
  ban: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM5.6 5.6l12.8 12.8',
  download: 'M12 4v10M8 11l4 4 4-4M5 19h14',
};

export function Icon({ name, size = 15, strokeWidth = 2, style }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
         strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round"
         style={{ display: 'block', flexShrink: 0, ...style }}>
      <path d={P[name] || P.file} />
    </svg>
  );
}

export function Mark({ size = 19 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
         strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'block' }}>
      <path d="M6.5 12h11M6.5 12 4 9.3M6.5 12 4 14.7M17.5 12 20 9.3M17.5 12 20 14.7" />
      <ellipse cx="12" cy="12" rx="5.2" ry="3.1" transform="rotate(-38 12 12)" strokeWidth="1.7" />
    </svg>
  );
}
