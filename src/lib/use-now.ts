import { useEffect, useState } from 'react'

/**
 * The current time, as something a component may read during render.
 *
 * `Date.now()` in a render body is impure: two renders of the same props give
 * different answers, which is exactly what React's rules forbid and what the
 * purity lint catches. It was a default parameter here first, which reads as
 * harmless and is the same violation.
 *
 * It also fixes a real defect rather than only a rule. A timestamp read once
 * during render is frozen until something unrelated re-renders the component,
 * so "10m ago" would still say 10m an hour later on a screen that had nothing
 * else to update. Ticking on an interval is what makes a relative time relative
 * to now rather than to whenever it was last drawn.
 *
 * Thirty seconds by default, which is a floor rather than the update rate: any
 * other render still picks up the newer value. The unit these feed is minutes,
 * so a half-minute of lag is invisible, and a shorter interval would wake the
 * screen for nothing.
 */
export function useNow(everyMs = 30_000): number {
  // The lazy initialiser runs once at mount rather than on every render, which
  // is why this is allowed where a bare call in the body is not.
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), everyMs)
    return () => clearInterval(timer)
  }, [everyMs])

  return now
}
