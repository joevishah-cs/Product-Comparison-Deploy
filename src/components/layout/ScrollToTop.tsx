import * as React from "react";
import { useLocation, useNavigationType } from "react-router-dom";

/**
 * Resets the window to the top of the page whenever the route changes.
 *
 * Without this, a single-page app keeps the previous page's scroll offset, so
 * navigating from halfway down one page drops you halfway down the next one.
 *
 * Two deliberate scoping decisions:
 *
 * - Keyed on `pathname` only, **not** on the location key or search string.
 *   Brand Workspace and Brand by Department keep their active tab in the URL
 *   query, so keying on anything finer would jerk the page to the top every
 *   time someone switched a tab. Same reason the dashboard's search is
 *   unaffected: it never navigates, so this effect never runs for it.
 *
 * - Skipped for `POP` (browser back/forward), where landing back where you left
 *   off is the expected behaviour.
 */
export function ScrollToTop() {
  const { pathname } = useLocation();
  const navigationType = useNavigationType();

  /* Held in a ref rather than passed as a dependency on purpose. A fresh page
     load reports `POP`, so the first in-page navigation that only changes the
     query (switching a Brand Workspace tab) flips it to `PUSH` — and if that
     value were a dependency, the change alone would re-run this effect and
     yank the page to the top even though the pathname never changed. */
  const navigationTypeRef = React.useRef(navigationType);
  navigationTypeRef.current = navigationType;

  React.useEffect(() => {
    if (navigationTypeRef.current === "POP") return;
    // Instant, not smooth: a page transition should already be at the top when
    // the new content paints, not glide there afterwards.
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [pathname]);

  return null;
}
