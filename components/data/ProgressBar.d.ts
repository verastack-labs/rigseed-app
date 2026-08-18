import * as React from 'react';

/**
 * Progress track. 4px in tables, 6px in cards, 8px on the detail header
 * and the swarm-health bar.
 *
 * Paused torrents are never accent-coloured — pass `paused` and the fill
 * drops to text-dimmer.
 */
export interface ProgressBarProps {
  /** 0–100. */
  value?: number;
  height?: number;
  /** accent for download, accent2 for upload and peer progress. */
  tone?: 'accent' | 'accent2';
  paused?: boolean;
  /** Trailing mono percentage. */
  showValue?: boolean;
  /** Fill the remainder with accent-soft — the Search swarm-health bar. */
  split?: boolean;
  style?: React.CSSProperties;
}

export declare function ProgressBar(props: ProgressBarProps): JSX.Element;
