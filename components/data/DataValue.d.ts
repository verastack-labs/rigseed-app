import * as React from 'react';

/**
 * Any machine-readable value: sizes, speeds, ratios, ETAs, hashes, IPs,
 * ports and API endpoint names. If a number is on screen it goes through
 * this, and if a sentence is on screen it does not.
 */
export interface DataValueProps {
  /** xs 10.5 · sm 11 · md 12.5 · lg 17 (stat card) · xl 20 (speed readout) · hero 40 (the one big percentage). */
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'hero';
  tone?: 'default' | 'dim' | 'dimmer' | 'accent' | 'accent2' | 'warn' | 'danger';
  weight?: number;
  children?: React.ReactNode;
  style?: React.CSSProperties;
}

export declare function DataValue(props: DataValueProps): JSX.Element;
