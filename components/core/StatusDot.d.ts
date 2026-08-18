import * as React from 'react';

/**
 * Status indicator. Accessibility rule: state is never encoded by colour
 * alone, so `label` should be set on every instance the user must read.
 */
export interface StatusDotProps {
  tone?: 'accent' | 'accent2' | 'warn' | 'danger' | 'muted';
  /** The word beside the dot. Omit only in a dense table cell that repeats a labelled legend. */
  label?: string;
  /** Slow opacity pulse - a job in progress. */
  pulse?: boolean;
  size?: number;
  mono?: boolean;
  style?: React.CSSProperties;
}

export declare function StatusDot(props: StatusDotProps): JSX.Element;
