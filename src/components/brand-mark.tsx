/**
 * The rigseed brand mark.
 *
 * Lives here rather than beside the icon set because it is a component, and a
 * module that exports both a component and data cannot be hot reloaded.
 */
/** The cleat. A horizontal bar with flared horns and a rope loop at -38deg. */
export function BrandMark({ size = 20 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M6.5 12h11M6.5 12 4 9.3M6.5 12 4 14.7M17.5 12 20 9.3M17.5 12 20 14.7" />
      <ellipse cx="12" cy="12" rx="5.2" ry="3.1" transform="rotate(-38 12 12)" strokeWidth="1.7" />
    </svg>
  )
}
