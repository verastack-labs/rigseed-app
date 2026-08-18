import * as React from 'react';

/**
 * One line in the Transfers sidebar: a status, a category (icon + colour) or
 * a tag (colour dot). Selected takes the standard accent-soft treatment.
 */
export interface FilterRowProps {
  icon?: React.ReactNode;
  /** Colour value — renders a 9px dot instead of an icon. Tags use this. */
  dot?: string;
  label: string;
  /** Mono count on the right. */
  count?: number | string;
  active?: boolean;
  onClick?: () => void;
  style?: React.CSSProperties;
}

export declare function FilterRow(props: FilterRowProps): JSX.Element;
