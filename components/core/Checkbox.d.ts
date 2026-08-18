import * as React from 'react';

/**
 * 16×16 selection box (20px in the Easy layout). Selection only -
 * for a preference use `Switch`.
 */
export interface CheckboxProps {
  checked?: boolean;
  /** Header checkbox when some but not all rows are selected. */
  indeterminate?: boolean;
  onChange?: (next: boolean) => void;
  disabled?: boolean;
  /** 16 by default; 20 in the Easy layout. */
  size?: number;
  label?: string;
  style?: React.CSSProperties;
}

export declare function Checkbox(props: CheckboxProps): JSX.Element;
