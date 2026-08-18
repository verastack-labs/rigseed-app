import * as React from 'react';

/**
 * Small count or status word — tab counts, plugin status badges
 * (Update / Enabled / Disabled), log level counts.
 */
export interface BadgeProps {
  tone?: 'neutral' | 'accent' | 'accent2' | 'warn' | 'danger';
  /** Mono by default, because badges are usually counts. */
  mono?: boolean;
  children?: React.ReactNode;
  style?: React.CSSProperties;
}

export declare function Badge(props: BadgeProps): JSX.Element;
