The left rail: brand mark, label toggle, then the five destinations.

```jsx
<NavRail
  items={[{key:'transfers',label:'Transfers',icon:<Icon name="list"/>}, …]}
  active="transfers" onSelect={go}
  expanded={railOpen} onToggle={() => setRailOpen(v => !v)} />
```

It positions itself absolutely, so give the app shell `position: relative` and pad the content 60px from the left. Never let expansion push the page.
