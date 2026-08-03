import type { Product } from "@/data/types";

/**
 * Chart colour is built from the Daikin blue ramp so every chart reads as one
 * branded system. Daikin always takes the saturated brand blue; competitors take
 * cooler, deeper or paler steps of the same blue-navy family.
 *
 * The competitor sequence is ordered for separation, not for prettiness: it was
 * checked with the palette validator, and adjacent pairs clear ΔE 19 for normal
 * vision and ΔE 19 under protanopia/tritanopia. A purely monochrome blue ramp
 * was tried first and failed badly (ΔE 3.7 normal vision between two of the
 * steps) — series would have been indistinguishable, so the family is widened
 * across lightness instead. Identity is never carried by colour alone: every
 * chart also labels its values and marks the Daikin series.
 */
export const DAIKIN_FILL = "#0097e0";
export const DAIKIN_FILL_ALT = "#0b557b";
export const DAIKIN_LIGHT = "#59bcff";

export const COMPETITOR_SERIES = [
  "#0f2740",
  "#7c8b9d",
  "#0b557b",
  "#b8c4d2",
  "#2b4a73",
  "#a8b6c6",
  "#4574aa",
  "#cbd5e1",
];

export const AXIS_COLOR = "#274060";
export const GRID_COLOR = "#e4ecf4";

/** Sequential blue ramp for single-measure charts (counts, shares, trends). */
export const BLUE_RAMP = ["#bce4ff", "#8ed4ff", "#59bcff", "#2e9fff", "#0097e0", "#0079b5", "#0b557b"];

/** Assigns a stable colour per product across every chart in a comparison. */
export function buildColorMap(products: Product[]): Record<string, string> {
  const map: Record<string, string> = {};
  let daikinIdx = 0;
  let compIdx = 0;
  for (const p of products) {
    if (p.isDaikin) {
      map[p.id] = [DAIKIN_FILL, DAIKIN_FILL_ALT, DAIKIN_LIGHT][daikinIdx % 3];
      daikinIdx += 1;
    } else {
      map[p.id] = COMPETITOR_SERIES[compIdx % COMPETITOR_SERIES.length];
      compIdx += 1;
    }
  }
  return map;
}

/** Short axis label that stays legible when projected. */
export function shortLabel(product: Product): string {
  const model = product.model.length > 16 ? `${product.model.slice(0, 15)}…` : product.model;
  return product.isDaikin ? `${model} ★` : model;
}

/** A stable, DOM-safe id for a colour's gradient definition. */
export function gradientId(color: string, key = "g"): string {
  return `grad-${key}-${color.replace("#", "")}`;
}

/** Lightens a hex colour toward white by `amount` (0–1) for the gradient top. */
export function lighten(hex: string, amount = 0.32): string {
  const n = hex.replace("#", "");
  const r = parseInt(n.slice(0, 2), 16);
  const g = parseInt(n.slice(2, 4), 16);
  const b = parseInt(n.slice(4, 6), 16);
  const mix = (c: number) => Math.round(c + (255 - c) * amount);
  return `#${[mix(r), mix(g), mix(b)].map((c) => c.toString(16).padStart(2, "0")).join("")}`;
}

/** Shared shadow-free vertical gradient defs for a set of series colours.
 *  Render inside a Recharts `<defs>` and reference with `fill={url(#id)}`. */
export function gradientStops(color: string): { light: string; deep: string } {
  return { light: lighten(color, 0.34), deep: color };
}
