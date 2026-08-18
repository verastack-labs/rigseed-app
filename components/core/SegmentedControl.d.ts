import * as React from 'react';

export interface SegmentedOption {
  value: string;
  label: string;
  icon?: React.ReactNode;
  /** Optional mono count, e.g. category counts on the Categories screen. */
  count?: number | string;
}

/**
 * One row of 2–5 mutually exclusive choices. Used for the view switcher,
 * dark/light, Categories/Tags, source pickers and preference enums.
 *
 * @startingPoint section="Core" subtitle="Exclusive choice strip" viewport="700x120"
 */
export interface SegmentedControlProps {
  options: Array<SegmentedOption | string>;
  value?: string;
  onChange?: (value: string) => void;
  size?: 'sm' | 'md';
  style?: React.CSSProperties;
}

export declare function SegmentedControl(props: SegmentedControlProps): JSX.Element;
