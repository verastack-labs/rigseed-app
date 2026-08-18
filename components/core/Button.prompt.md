Action button in four variants - use it for every clickable action that is not an icon-only control.

```jsx
<Button variant="primary" icon={<Icon name="plus" />}>Add and start</Button>
<Button>Cancel</Button>
<Button variant="danger" size="sm">Remove</Button>
```

- `variant`: `primary` (one per view), `secondary` (default), `ghost` (Skip, Cancel), `danger` (remove, delete).
- `size`: `sm` 11.5px / `md` 12.5px / `lg` 13px.
- Hover brightens primary 7% and gives secondary an accent-soft fill; press scales to 0.96.
- For icon-only controls use `IconButton` instead - it is square and 30–34px.
