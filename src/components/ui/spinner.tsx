/**
 * The one spinner, for work with no measurable progress.
 *
 * rigseed shows absence with skeletons, which are shaped like the content
 * they stand in for and so say what is coming. A spinner says only "wait",
 * which is why it is reserved for the two places where nothing is arriving
 * in pieces and the wait is a single opaque call: checking for an update,
 * and running a search across plugins.
 *
 * An update check against GitHub has been observed taking twenty seconds on
 * a network that delays one particular host, and for that length of time a
 * button label alone reads as a wedged app.
 *
 * It is `currentColor`, so it takes the colour of whatever it sits inside
 * rather than carrying one of its own.
 *
 * Under reduced motion it does not turn. The ring keeps its gap so it still
 * reads as an indicator rather than a bullet, and the label beside it is
 * what actually carries the meaning: "Checking…" says the same thing
 * standing still.
 */
export function Spinner({ size = 13 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      className="motion-safe:animate-spin"
      // The text beside it already announces the state, and a screen reader
      // reading out a decoration twice is worse than not reading it at all.
      aria-hidden="true"
      focusable="false"
    >
      <circle cx="8" cy="8" r="6.4" stroke="currentColor" strokeOpacity="0.3" strokeWidth="2" />
      <path
        d="M8 1.6A6.4 6.4 0 0 1 14.4 8"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  )
}
