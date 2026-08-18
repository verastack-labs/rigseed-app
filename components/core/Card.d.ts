import * as React from 'react';

/**
 * The system's container. Flat at rest — surface fill, 1px line border,
 * radius 11px, no shadow. Depth comes from layered surfaces, not elevation.
 *
 * @startingPoint section="Core" subtitle="Surface container with optional header strip" viewport="700x200"
 */
export interface CardProps {
  /** Header strip title. Omit for a plain container. */
  title?: string;
  /** Mono endpoint shown at the right of the header, e.g. 'app/preferences'. */
  api?: string;
  /** Node at the far right of the header — usually a Switch or Button. */
  action?: React.ReactNode;
  /** Set false for tables and lists that manage their own padding. */
  padded?: boolean;
  /** Raise the border to accent on hover — used by torrent cards. */
  hoverable?: boolean;
  children?: React.ReactNode;
  style?: React.CSSProperties;
}

export declare function Card(props: CardProps): JSX.Element;
