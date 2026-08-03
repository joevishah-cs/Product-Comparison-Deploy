import {
  gradientId,
  gradientStops,
  COMPETITOR_SERIES,
  BLUE_RAMP,
  DAIKIN_FILL,
  DAIKIN_FILL_ALT,
  DAIKIN_LIGHT,
} from "./palette";

/** Every colour a chart in this app can assign to a series. Deduplicated: the
 *  brand blues also appear inside the sequential ramp, and one gradient per
 *  colour is both sufficient and required (ids must be unique). */
export const ALL_SERIES_COLORS = Array.from(
  new Set([
    DAIKIN_FILL,
    DAIKIN_FILL_ALT,
    DAIKIN_LIGHT,
    ...COMPETITOR_SERIES,
    ...BLUE_RAMP,
    // status hues used by sentiment charts
    "#16a45c",
    "#e0900b",
    "#e0333a",
  ]),
);

/**
 * A hidden, document-level SVG holding one gradient per series colour in both
 * orientations. Charts reference them with `gradFill(color, dir)`.
 *
 * Why a separate sprite rather than a `<defs>` inside each chart: Recharts only
 * renders children it recognises and silently drops anything else, so a custom
 * component returning `<defs>` never reaches the chart's SVG — bars then
 * reference a missing id and render invisible. SVG paint servers resolve by id
 * across the whole document, so defining them once here works everywhere.
 *
 * Rendered once at the app root; safe to mount more than once (ids are stable
 * and identical), though once is enough.
 */
export function ChartGradientDefs() {
  return (
    <svg width="0" height="0" aria-hidden focusable="false" className="absolute" style={{ position: "absolute" }}>
      <defs>
        {ALL_SERIES_COLORS.flatMap((c) => {
          const { light, deep } = gradientStops(c);
          return [
            // Vertical bars: light at the top, saturated at the baseline.
            <linearGradient key={`v-${c}`} id={gradientId(c, "v")} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={light} />
              <stop offset="100%" stopColor={deep} />
            </linearGradient>,
            // Horizontal bars: saturated at the origin, easing out to the tip.
            <linearGradient key={`h-${c}`} id={gradientId(c, "h")} x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor={deep} />
              <stop offset="100%" stopColor={light} />
            </linearGradient>,
          ];
        })}
      </defs>
    </svg>
  );
}

/** Reference a gradient from the document-level sprite. The trailing solid
 *  colour is an SVG paint fallback, so a mark can never render invisible. */
export function gradFill(color: string, dir: "v" | "h" = "v"): string {
  return `url(#${gradientId(color, dir)}) ${color}`;
}
