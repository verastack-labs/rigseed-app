import * as React from 'react';

/**
 * Speed history over a rolling 60-sample window, one sample per poll.
 * Used in the sidebar speed panel (46px, both series) and on the Speed tab
 * (104px, one series with gridlines).
 *
 * Strokes are `vector-effect: non-scaling-stroke` so the 1.8px line holds
 * at any container width.
 */
export interface SparklineProps {
  /** Download samples, oldest first. */
  data?: number[];
  /** Optional upload series, drawn in accent2 over the same scale. */
  upload?: number[];
  height?: number;
  tone?: 'accent' | 'accent2';
  /** Filled area under the line at 16% opacity. */
  fill?: boolean;
  /** Two hairline gridlines — the Speed tab cards. */
  gridlines?: boolean;
  style?: React.CSSProperties;
}

export declare function Sparkline(props: SparklineProps): JSX.Element;
