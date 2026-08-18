import * as React from 'react';

/**
 * 36×20 toggle with an overshoot knob. Use for every boolean preference.
 * Never use a checkbox for a setting, or a switch for list selection.
 */
export interface SwitchProps {
  checked?: boolean;
  onChange?: (next: boolean) => void;
  disabled?: boolean;
  /** Accessible name when no visible label sits beside it. */
  label?: string;
  style?: React.CSSProperties;
}

export declare function Switch(props: SwitchProps): JSX.Element;
