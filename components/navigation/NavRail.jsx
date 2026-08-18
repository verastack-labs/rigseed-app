import React from 'react';
import { RailItem } from './RailItem.jsx';

const MARK = (
  <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor"
       strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M6.5 12h11M6.5 12 4 9.3M6.5 12 4 14.7M17.5 12 20 9.3M17.5 12 20 14.7" />
    <ellipse cx="12" cy="12" rx="5.2" ry="3.1" transform="rotate(-38 12 12)" strokeWidth="1.7" />
  </svg>
);

/** Left navigation. Expands as an overlay - the page never reflows. */
export function NavRail({
  items = [], active, onSelect, expanded, onToggle, brand = 'rigseed', style,
}) {
  return (
    <>
      <div
        onClick={onToggle}
        style={{
          position: 'absolute', inset: 0, zIndex: 40,
          background: 'var(--scrim)', backdropFilter: 'blur(var(--scrim-blur))',
          opacity: expanded ? 1 : 0,
          pointerEvents: expanded ? 'auto' : 'none',
          transition: 'opacity var(--dur-base) var(--ease-plain)',
        }}
      />
      <nav style={{
        position: 'absolute', top: 0, bottom: 0, left: 0, zIndex: 41,
        width: expanded ? 'var(--rail-expanded)' : 'var(--rail-collapsed)',
        boxSizing: 'border-box', padding: '12px 10px',
        display: 'flex', flexDirection: 'column', gap: '4px',
        background: 'var(--sidebar-bg)', borderRight: '1px solid var(--line)',
        boxShadow: expanded ? 'var(--shadow-rail)' : 'none',
        overflow: 'hidden',
        transition: 'width var(--dur-rail) var(--ease-rail), box-shadow var(--dur-rail) var(--ease-rail)',
        ...style,
      }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: '11px',
          height: 40, padding: '0 8px', marginBottom: '8px', overflow: 'hidden',
        }}>
          <span style={{ width: 24, display: 'flex', justifyContent: 'center', flexShrink: 0, color: 'var(--accent)' }}>
            {MARK}
          </span>
          <span style={{
            fontSize: '15px', fontWeight: 700, letterSpacing: 'var(--tracking-tight)',
            whiteSpace: 'nowrap', color: 'var(--text)',
            opacity: expanded ? 1 : 0,
            transition: 'opacity var(--dur-fast) var(--ease-plain)',
          }}>{brand}</span>
        </div>

        <RailItem
          expanded={expanded}
          onClick={onToggle}
          label={expanded ? 'Hide labels' : 'Show labels'}
          icon={
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                 strokeWidth="2" strokeLinecap="round">
              <path d="M4 7h16M4 12h16M4 17h16" />
            </svg>
          }
        />

        {items.map((it) => (
          <RailItem
            key={it.key}
            icon={it.icon}
            label={it.label}
            expanded={expanded}
            active={it.key === active}
            onClick={() => onSelect && onSelect(it.key)}
          />
        ))}
      </nav>
    </>
  );
}
