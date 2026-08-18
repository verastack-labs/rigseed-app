import * as React from 'react';

/**
 * The tinted rounded square that fronts modal headers, category rows,
 * stat cards and empty states. 26px in a torrent card, 30–34px in headers
 * and list rows, 46px in an empty state.
 */
export interface IconTileProps {
  size?: number;
  /** Explicit colour - pass a category's swatch token. Overrides `tone`. */
  color?: string;
  tone?: 'accent' | 'accent2' | 'warn';
  /** Override the derived radius. */
  radius?: number;
  children?: React.ReactNode;
  style?: React.CSSProperties;
}

export declare function IconTile(props: IconTileProps): JSX.Element;
