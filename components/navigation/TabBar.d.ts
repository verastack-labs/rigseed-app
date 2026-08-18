import * as React from 'react';

export interface Tab {
  value: string;
  label: string;
  icon?: React.ReactNode;
  /** Mono count badge — file, tracker and peer counts. */
  count?: number | string;
}

/**
 * Underlined tab strip. Used once, on Torrent Detail (General, Files,
 * Trackers, Peers, Speed). For exclusive choices inside a screen use
 * `SegmentedControl` instead — tabs mean "another view of this object".
 */
export interface TabBarProps {
  tabs: Tab[];
  value?: string;
  onChange?: (value: string) => void;
  style?: React.CSSProperties;
}

export declare function TabBar(props: TabBarProps): JSX.Element;
