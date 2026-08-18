import { Button } from '../../components/core/Button.jsx';
import { IconButton } from '../../components/core/IconButton.jsx';
import { Input } from '../../components/core/Input.jsx';
import { Switch } from '../../components/core/Switch.jsx';
import { Checkbox } from '../../components/core/Checkbox.jsx';
import { SegmentedControl } from '../../components/core/SegmentedControl.jsx';
import { Chip } from '../../components/core/Chip.jsx';
import { Card } from '../../components/core/Card.jsx';
import { SectionHeader } from '../../components/core/SectionHeader.jsx';
import { StatusDot } from '../../components/core/StatusDot.jsx';
import { IconTile } from '../../components/core/IconTile.jsx';
import { Badge } from '../../components/core/Badge.jsx';
import { ProgressBar } from '../../components/data/ProgressBar.jsx';
import { DataValue } from '../../components/data/DataValue.jsx';
import { Sparkline } from '../../components/data/Sparkline.jsx';
import { StatCard } from '../../components/data/StatCard.jsx';
import { NavRail } from '../../components/navigation/NavRail.jsx';
import { RailItem } from '../../components/navigation/RailItem.jsx';
import { FilterRow } from '../../components/navigation/FilterRow.jsx';
import { TabBar } from '../../components/navigation/TabBar.jsx';
import { ContextMenu } from '../../components/navigation/ContextMenu.jsx';

/* The kit reads components off one namespace so a screen file needs a single
   line of setup. In a real app you would import them directly. */
window.__RS_NS = {
  Button, IconButton, Input, Switch, Checkbox, SegmentedControl, Chip, Card,
  SectionHeader, StatusDot, IconTile, Badge,
  ProgressBar, DataValue, Sparkline, StatCard,
  NavRail, RailItem, FilterRow, TabBar, ContextMenu,
};

export default window.__RS_NS;
