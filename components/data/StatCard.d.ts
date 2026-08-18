import * as React from 'react';

/**
 * One figure in the detail screen's 4-column stat grid - Status, Size,
 * Down, Up, ETA, Ratio, Seeds/Peers, Added on.
 *
 * @startingPoint section="Data" subtitle="Single figure with label and sub-line" viewport="700x140"
 */
export interface StatCardProps {
  icon?: React.ReactNode;
  /** Uppercase 10px label. */
  label: string;
  /** The figure - mono, 17px/600. */
  value: React.ReactNode;
  /** 11px context line under the value. */
  sub?: string;
  tone?: 'default' | 'accent' | 'accent2' | 'warn' | 'dim';
  style?: React.CSSProperties;
}

export declare function StatCard(props: StatCardProps): JSX.Element;
