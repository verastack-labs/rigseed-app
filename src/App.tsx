/**
 * Placeholder shell.
 *
 * This exists so the toolchain has something to compile and the token layer has
 * somewhere to prove itself. The real shell (nav rail, top bar, footer) arrives
 * with the shell branch; screens arrive after the components they consume.
 */
export function App() {
  return (
    <div className="bg-bg text-text flex h-full items-center justify-center">
      <div className="border-line bg-surface rounded-2xl border p-8 text-center">
        <h1 className="text-text text-[30px] font-semibold tracking-[-0.02em]">rigseed</h1>
        <p className="text-text-dim mt-2 text-[12.5px]">
          Toolchain scaffold. Components land next.
        </p>
        <p className="text-text-dimmer mt-4 font-mono text-[11px]">
          data-mode and data-accent are set on &lt;html&gt;
        </p>
      </div>
    </div>
  )
}
