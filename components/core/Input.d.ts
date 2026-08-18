import * as React from 'react';

/**
 * Text input. Set `mono` for anything machine-readable - paths, ports,
 * magnet links, numeric limits. Leave it off for human names.
 */
export interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size' | 'style'> {
  /** JetBrains Mono instead of Inter. Use for data, always. */
  mono?: boolean;
  /** sm 31px · md 34px · lg 42px (the name field in an editor pane). */
  size?: 'sm' | 'md' | 'lg';
  /** Fixed width, e.g. 92 or '260px'. Defaults to filling its container. */
  width?: number | string;
  /** Trailing unit label in mono, e.g. 'KiB/s', 'ports'. */
  unit?: string;
  /** Leading icon, 13–14px. */
  icon?: React.ReactNode;
  /** Danger border - a failed validation. */
  invalid?: boolean;
  style?: React.CSSProperties;
}

export declare function Input(props: InputProps): JSX.Element;
