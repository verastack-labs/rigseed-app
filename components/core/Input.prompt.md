Text input, 34px by default, surface2 fill with an accent border on focus.

```jsx
<Input mono placeholder="/home/rigan/downloads" />
<Input mono width={92} unit="KiB/s" defaultValue="2048" />
<Input size="sm" width={232} icon={<Icon name="search" />} placeholder="Search torrents…" />
```

Rule: `mono` for paths, ports, numbers and magnets; plain Inter for names and labels.
