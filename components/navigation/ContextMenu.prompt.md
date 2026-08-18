Three-dot menu, anchored to its button.

```jsx
<div style={{ position: 'relative', zIndex: open ? 30 : 1 }}>
  <IconButton title="More" onClick={() => setOpen(v => !v)}><Icon name="more" /></IconButton>
  <ContextMenu open={open} onClose={() => setOpen(false)} items={[
    { label: 'Resume', icon: <Icon name="play" /> },
    { label: 'Pause', icon: <Icon name="pause" /> },
    { separator: true },
    { label: 'Remove', icon: <Icon name="trash" />, danger: true },
  ]} />
</div>
```

Standard order: Resume · Pause · Force recheck - Copy magnet link · Open folder - Remove.
