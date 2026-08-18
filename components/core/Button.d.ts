import * as React from 'react';

/**
 * Primary, secondary, ghost and danger actions.
 *
 * Primary is the one committing action in a view (Apply, Add and start,
 * Start using rigseed). Secondary is everything else. Ghost is for Skip and
 * Cancel. Danger is remove and delete - never use the accent for those.
 *
 * @startingPoint section="Core" subtitle="Action buttons in four variants" viewport="700x150"
 */
export interface ButtonProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'style'> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  /** Leading icon node, 14–15px. */
  icon?: React.ReactNode;
  /** Trailing icon node, e.g. a chevron. */
  iconRight?: React.ReactNode;
  disabled?: boolean;
  fullWidth?: boolean;
  children?: React.ReactNode;
  style?: React.CSSProperties;
}

export declare function Button(props: ButtonProps): JSX.Element;
