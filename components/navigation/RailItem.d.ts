import * as React from 'react';

/**
 * A rail destination. The 24px icon slot is fixed so icons stay aligned
 * whether the rail is collapsed or expanded; only the label fades.
 * `title` is always the label - it is the collapsed rail's only affordance.
 */
export interface RailItemProps {
  icon?: React.ReactNode;
  label: string;
  active?: boolean;
  /** Rail state - controls label visibility. */
  expanded?: boolean;
  onClick?: () => void;
  style?: React.CSSProperties;
}

export declare function RailItem(props: RailItemProps): JSX.Element;
