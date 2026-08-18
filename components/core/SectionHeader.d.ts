import * as React from 'react';

/**
 * The only uppercase text in the app besides table headers.
 * 10px / 700 / 0.08em tracking / text-dimmer.
 */
export interface SectionHeaderProps {
  children?: React.ReactNode;
  style?: React.CSSProperties;
}

export declare function SectionHeader(props: SectionHeaderProps): JSX.Element;
