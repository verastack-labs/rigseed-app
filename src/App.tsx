/**
 * Placeholder shell.
 *
 * This exists so the toolchain has something to compile and the token layer has
 * somewhere to prove itself. The real shell (nav rail, top bar, footer) arrives
 * with the shell branch; screens arrive after the components they consume.
 */
export function App() {
  return (
    <div className="flex h-full items-center justify-center bg-bg text-text">
      <div className="rounded-2xl border border-line bg-surface p-8 text-center">
        <h1 className="text-[30px] font-semibold tracking-[-0.02em] text-text">rigseed</h1>
        <p className="mt-2 text-[12.5px] text-text-dim">
          Toolchain scaffold. Components land next.
        </p>
        <p className="mt-4 font-mono text-[11px] text-text-dimmer">
          data-mode and data-accent are set on &lt;html&gt;
        </p>
      </div>
    </div>
  )
}
