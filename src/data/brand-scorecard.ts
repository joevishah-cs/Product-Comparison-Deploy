/* Headline numeric series derived from INTEL_METRICS, for the chart layer.
 *
 * Each series names the spreadsheet row it came from, so any number on screen can
 * be traced back to a cell. Values are parsed from the sheet text rather than
 * retyped here, so the charts and the evidence table can never disagree.
 *
 * Same provenance caveat as brand-intel.ts: every figure is SYNTHETIC.
 */

import { BRANDS, INTEL_METRICS, type BrandKey } from "./brand-intel";

export interface BrandPoint {
  brand: BrandKey;
  value: number;
  /** The verbatim sheet text this number was read out of. */
  raw: string;
}

export interface BrandSeries {
  id: string;
  label: string;
  unit: string;
  /** Higher value = better for this measure. */
  direction: "higher" | "lower";
  sourceRow: number;
  points: BrandPoint[];
}

function metricByRow(row: number) {
  const found = INTEL_METRICS.find((m) => m.sourceRow === row);
  if (!found) throw new Error(`brand-scorecard: no metric at sheet row ${row}`);
  return found;
}

/** Reads the first number matching `pattern` out of each brand's sheet text. */
function series(
  id: string,
  label: string,
  unit: string,
  direction: "higher" | "lower",
  row: number,
  pattern: RegExp,
): BrandSeries {
  const metric = metricByRow(row);
  const points: BrandPoint[] = [];

  for (const brand of BRANDS) {
    const raw = metric.values[brand.key] ?? "";
    const match = raw.match(pattern);
    if (!match) continue;
    // Alternation patterns leave unmatched groups undefined -- take the first hit.
    const captured = match.slice(1).find((g) => g !== undefined);
    if (captured === undefined) continue;
    const value = Number(captured.replace(/,/g, ""));
    if (Number.isNaN(value)) continue;
    points.push({ brand: brand.key, value, raw });
  }

  return { id, label, unit, direction, sourceRow: row, points };
}

/* ---- Executive / share ---------------------------------------------- */

/* The Daikin cell reads "EU A2W unit share 21.3% (No.1); revenue share 22.8%",
 * the others read "14.6% unit / 15.1% revenue" -- so unit share needs both
 * shapes, and revenue share is read off the explicit "revenue" phrasing. */
export const UNIT_SHARE: BrandSeries = (() => {
  const metric = metricByRow(17);
  const points: BrandPoint[] = [];
  for (const brand of BRANDS) {
    const raw = metric.values[brand.key] ?? "";
    const m = raw.match(/unit share ([\d.]+)%/i) ?? raw.match(/([\d.]+)%\s*unit/i);
    if (m) points.push({ brand: brand.key, value: Number(m[1]), raw });
  }
  return {
    id: "unit_share",
    label: "EU A2W unit share",
    unit: "%",
    direction: "higher",
    sourceRow: 17,
    points,
  };
})();

export const REVENUE_SHARE: BrandSeries = (() => {
  const metric = metricByRow(17);
  const points: BrandPoint[] = [];
  for (const brand of BRANDS) {
    const raw = metric.values[brand.key] ?? "";
    const m = raw.match(/revenue share ([\d.]+)%/i) ?? raw.match(/([\d.]+)%\s*revenue/i);
    if (m) points.push({ brand: brand.key, value: Number(m[1]), raw });
  }
  return {
    id: "revenue_share",
    label: "EU A2W revenue share",
    unit: "%",
    direction: "higher",
    sourceRow: 17,
    points,
  };
})();

/* ---- Voice of customer ---------------------------------------------- */

export const SENTIMENT_POSITIVE = series(
  "sentiment_positive",
  "Positive review share",
  "%",
  "higher",
  56,
  /positive (\d+)%/i,
);

export const SENTIMENT_NEUTRAL = series(
  "sentiment_neutral",
  "Neutral review share",
  "%",
  "higher",
  56,
  /neutral (\d+)%/i,
);

export const SENTIMENT_NEGATIVE = series(
  "sentiment_negative",
  "Negative review share",
  "%",
  "lower",
  56,
  /negative (\d+)%/i,
);

export const REVIEW_RATING = series(
  "review_rating",
  "Average review rating",
  "/5",
  "higher",
  56,
  /([\d.]+)\/5/,
);

export const NPS_ENDUSER = series(
  "nps_enduser",
  "End-user NPS",
  "",
  "higher",
  26,
  /End-user NPS \+?(-?\d+)/i,
);

export const NPS_INSTALLER = series(
  "nps_installer",
  "Installer NPS",
  "",
  "higher",
  26,
  /installer NPS \+?(-?\d+)/i,
);

/* ---- Marketing / visibility ----------------------------------------- */

export const WEB_VISITS = series(
  "web_visits",
  "Monthly web visits",
  "m",
  "higher",
  41,
  /([\d.]+)m (?:monthly )?visits/i,
);

export const SOCIAL_FOLLOWERS = series(
  "social_followers",
  "Social followers",
  "k",
  "higher",
  41,
  /(\d+)k (?:social )?followers/i,
);

export const RANKING_KEYWORDS = series(
  "ranking_keywords",
  "Ranking keywords",
  "k",
  "higher",
  41,
  /([\d.]+)k (?:ranking )?keywords/i,
);

export const AWARENESS_UNAIDED = series(
  "awareness_unaided",
  "Unaided brand awareness",
  "%",
  "higher",
  39,
  /Unaided (\d+)%/i,
);

/* "Unaided 34% / aided 71%" -- the leading \b stops this matching inside
 * "Unaided", which would silently report the unaided figure twice. */
export const AWARENESS_AIDED = series(
  "awareness_aided",
  "Aided brand awareness",
  "%",
  "higher",
  39,
  /\baided (\d+)%/,
);

export const STAND_FOOTPRINT = series(
  "stand_footprint",
  "Trade-show stand footprint",
  "m2",
  "higher",
  43,
  /~?([\d,]+)m2/i,
);

/* ---- Sales / pricing ------------------------------------------------ */

export const PRICE_INDEX = series(
  "price_index",
  "List price index (Daikin = 100)",
  "",
  "lower",
  60,
  /Index (\d+)/i,
);

export const GROSS_MARGIN = series(
  "gross_margin",
  "A2W gross margin",
  "%",
  "higher",
  62,
  /~(\d+)%/,
);

export const OPERATING_MARGIN = series(
  "operating_margin",
  "Operating margin",
  "%",
  "higher",
  62,
  /operating ~([\d.]+)%/i,
);

export const WARRANTY_CLAIM_RATE = series(
  "warranty_claims",
  "In-warranty claim rate",
  "%",
  "lower",
  57,
  /([\d.]+)%/,
);

export const SERVICE_ATTACH = series(
  "service_attach",
  "Service contract attach rate",
  "%",
  "higher",
  80,
  /(?:attach )?(\d+)%/i,
);

/* ---- Technology / R&D ----------------------------------------------- */

export const PATENT_FAMILIES = series(
  "patent_families",
  "Active patent families",
  "",
  "higher",
  38,
  /([\d,]+) (?:active )?(?:HP-related )?families/i,
);

export const RND_SPEND = series(
  "rnd_spend",
  "R&D spend",
  "EUR m",
  "higher",
  45,
  /EUR ([\d,]+)m/i,
);

export const RND_INTENSITY = series(
  "rnd_intensity",
  "R&D as share of revenue",
  "%",
  "higher",
  45,
  /([\d.]+)%/,
);

export const TIME_TO_MARKET = series(
  "time_to_market",
  "Concept-to-launch time",
  "months",
  "lower",
  49,
  /(\d+) months/i,
);

export const ERP_TOP_CLASS = series(
  "erp_top_class",
  "Range at ErP A+++",
  "%",
  "higher",
  51,
  /(\d+)% (?:of range )?(?:at )?(?:ErP )?A\+\+\+/i,
);

export const INSTALLER_BASE = series(
  "installer_base",
  "Certified installers (EMEA)",
  "",
  "higher",
  59,
  /([\d,]+)/,
);

export const TRAINING_SEATS = series(
  "training_seats",
  "Annual training seats",
  "",
  "higher",
  84,
  /~([\d,]+) seats/i,
);

/** Every series the page can chart, in presentation order. */
export const ALL_SERIES: BrandSeries[] = [
  UNIT_SHARE,
  REVENUE_SHARE,
  SENTIMENT_POSITIVE,
  SENTIMENT_NEGATIVE,
  REVIEW_RATING,
  NPS_ENDUSER,
  NPS_INSTALLER,
  WEB_VISITS,
  SOCIAL_FOLLOWERS,
  RANKING_KEYWORDS,
  AWARENESS_UNAIDED,
  AWARENESS_AIDED,
  STAND_FOOTPRINT,
  PRICE_INDEX,
  GROSS_MARGIN,
  OPERATING_MARGIN,
  WARRANTY_CLAIM_RATE,
  SERVICE_ATTACH,
  PATENT_FAMILIES,
  RND_SPEND,
  RND_INTENSITY,
  TIME_TO_MARKET,
  ERP_TOP_CLASS,
  INSTALLER_BASE,
  TRAINING_SEATS,
];

/** Leader on a series, respecting its direction. */
export function leaderOf(s: BrandSeries): BrandPoint | null {
  if (!s.points.length) return null;
  return s.points.reduce((best, p) =>
    s.direction === "lower" ? (p.value < best.value ? p : best) : p.value > best.value ? p : best,
  );
}

export function pointFor(s: BrandSeries, brand: BrandKey): BrandPoint | null {
  return s.points.find((p) => p.brand === brand) ?? null;
}

/** Daikin's 1-based rank on a series (1 = leader). Null when Daikin has no value. */
export function daikinRank(s: BrandSeries): number | null {
  const own = pointFor(s, "daikin");
  if (!own) return null;
  const sorted = [...s.points].sort((a, b) =>
    s.direction === "lower" ? a.value - b.value : b.value - a.value,
  );
  return sorted.findIndex((p) => p.brand === "daikin") + 1;
}

/* ---- Qualitative pulls used by the narrative sections --------------- */

export function metricValues(row: number): { metric: string; values: Record<BrandKey, string> } {
  const m = metricByRow(row);
  return { metric: m.metric, values: m.values };
}

export const THREAT_LEVELS = metricValues(73);
export const STRENGTHS_VS_DAIKIN = metricValues(70);
export const WEAKNESSES_VS_DAIKIN = metricValues(71);
export const RECENT_MOVES = metricValues(72);
export const WIN_LOSS = metricValues(74);
export const PERCEPTION = metricValues(39);
export const SUSTAINABILITY = metricValues(44);
export const REFRIGERANT = metricValues(34);
export const REVIEW_THEMES = metricValues(56);

/** Parsed High/Medium/Low threat rating per competitor. */
export function threatLevel(brand: BrandKey): "High" | "Medium" | "Low" | null {
  const raw = THREAT_LEVELS.values[brand] ?? "";
  const m = raw.match(/^(High|Medium|Low)/i);
  if (!m) return null;
  const v = m[1].toLowerCase();
  return v === "high" ? "High" : v === "medium" ? "Medium" : "Low";
}

/** Rationale text after the "High - " prefix. */
export function threatRationale(brand: BrandKey): string {
  const raw = THREAT_LEVELS.values[brand] ?? "";
  return raw.replace(/^(High|Medium|Low)\s*-\s*/i, "");
}
