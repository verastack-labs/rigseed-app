import * as React from 'react';

export interface NavRailItem {
  key: string;
  label: string;
  icon?: React.ReactNode;
}

/**
 * The app's only navigation. 60px collapsed, 212px expanded — and it expands
 * **over** the content behind a scrim, so nothing reflows. Clicking the scrim
 * collapses it. Content should be padded 60px from the left.
 *
 * Destinations are Transfers, Search, Categories & tags, Logs, Settings.
 * Add Torrent is deliberately absent: it is a modal from the FAB.
 *
 * Requires a positioned ancestor — it absolutely positions itself and its scrim.
 *
 * @startingPoint section="Navigation" subtitle="Collapsible 60px icon rail" viewport="700x420"
 */
export interface NavRailProps {
  items: NavRailItem[];
  /** Key of the active destination. */
  active?: string;
  onSelect?: (key: string) => void;
  expanded?: boolean;
  onToggle?: () => void;
  /** Wordmark shown when expanded. */
  brand?: string;
  style?: React.CSSProperties;
}

export declare function NavRail(props: NavRailProps): JSX.Element;
