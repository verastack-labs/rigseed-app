import * as React from 'react';

/**
 * Pill chip for filters and labels — search engines, category pickers, tags.
 * A selected chip carrying its own `color` tints itself with that colour
 * rather than the theme accent; that is how tags stay distinguishable.
 */
export interface ChipProps {
  label: string;
  /** Leading 7px colour dot — tags and engines. */
  dot?: boolean;
  icon?: React.ReactNode;
  /** Trailing mono count. */
  count?: number | string;
  selected?: boolean;
  /** Dashed border — the "New category" / "New tag" affordance. */
  dashed?: boolean;
  /** Own colour (a swatch token value). Overrides the accent when selected. */
  color?: string;
  onClick?: () => void;
  style?: React.CSSProperties;
}

export declare function Chip(props: ChipProps): JSX.Element;
