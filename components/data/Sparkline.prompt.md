Rolling speed graph. Keep 60 samples; push one per poll and drop the oldest.

```jsx
<Sparkline data={dl} upload={ul} height={46} />
<Sparkline data={dl} height={104} gridlines />
```

Do not animate the path itself - the data moving is the animation.
