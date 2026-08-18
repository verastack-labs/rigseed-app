import * as React from 'react';

export interface ContextMenuItem {
  label?: string;
  icon?: React.ReactNode;
  onClick?: () => void;
  /** Danger colour — Remove, Delete, Ban. */
  danger?: boolean;
  /** Render a divider instead of a row. */
  separator?: boolean;
}

/**
 * The three-dot menu. Anchors to its trigger: right edges aligned, 8px below.
 *
 * Two rules the prototypes learned the hard way — the trigger's wrapper needs
 * `position: relative`, and while the menu is open its owning card must be
 * lifted to `z-index: 30` or neighbouring cards clip it. Near the bottom of
 * the viewport pass `above` so the menu flips upward.
 */
export interface ContextMenuProps {
  items: ContextMenuItem[];
  open?: boolean;
  /** Called on item click and on any outside click. */
  onClose?: () => void;
  /** Flip above the trigger — for rows near the bottom edge. */
  above?: boolean;
  width?: number;
  style?: React.CSSProperties;
}

export declare function ContextMenu(props: ContextMenuProps): JSX.Element | null;
