Square icon-only button, 30–34px - for actions with no room for a word.

```jsx
<IconButton title="Settings"><Icon name="settings" /></IconButton>
<IconButton title="Appearance" active={open}><Icon name="palette" /></IconButton>
```

- `title` is mandatory and doubles as the accessible name.
- `active` keeps it in the accent state (used by the appearance control while its panel is open).
