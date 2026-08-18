import * as React from 'react';

/**
 * Square icon-only control — top bar actions, row actions, toolbar utilities.
 * `title` is required: it is the only label a collapsed control has.
 */
export interface IconButtonProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'style' | 'title'> {
  size?: 'sm' | 'md' | 'lg';
  /** Persistent on-state — accent-soft fill and accent border. */
  active?: boolean;
  disabled?: boolean;
  /** Required. Used as both tooltip and accessible name. */
  title: string;
  children?: React.ReactNode;
  style?: React.CSSProperties;
}

export declare function IconButton(props: IconButtonProps): JSX.Element;
