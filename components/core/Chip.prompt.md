Pill chip, radius 20px - filters, engines, categories, tags.

```jsx
<Chip label="1337x" dot count={18} selected color="var(--swatch-sage)" />
<Chip label="New tag" dashed onClick={openCreator} />
```

Selected chips with a `color` tint themselves with it; without one they fall back to the accent.
