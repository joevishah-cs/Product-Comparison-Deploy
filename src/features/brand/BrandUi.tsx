import * as React from "react";
import { ShieldAlert, TriangleAlert, Minus, Lightbulb } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { AiTag } from "@/components/common/AiTag";
import {
  BRANDS,
  CATEGORY_BY_KEY,
  INTEL_METRICS,
  ingestionKind,
  type BrandKey,
  type CategoryKey,
  type IntelMetric,
} from "@/data/brand-intel";
import {
  AWARENESS_UNAIDED,
  OPERATING_MARGIN,
  RANKING_KEYWORDS,
  RND_INTENSITY,
  SENTIMENT_NEGATIVE,
  SENTIMENT_NEUTRAL,
  SENTIMENT_POSITIVE,
  SERVICE_ATTACH,
  SOCIAL_FOLLOWERS,
  STAND_FOOTPRINT,
  UNIT_SHARE,
  WEB_VISITS,
  pointFor,
} from "@/data/brand-scorecard";

/** Shared by every brand view: the tracked rivals, minus Daikin itself. */
export const COMPETITORS = BRANDS.filter((b) => !b.isDaikin);

/* ------------------------------------------------------------------ */
/* Derived read-outs                                                   */
/* ------------------------------------------------------------------ */

export function visibilityScore(brand: BrandKey): number {
  /** Composite of the three digital signals + event footprint, indexed to the
   *  strongest brand in the set. Presented as a band, never as a precise score. */
  const parts: number[] = [];
  for (const s of [WEB_VISITS, SOCIAL_FOLLOWERS, RANKING_KEYWORDS, STAND_FOOTPRINT]) {
    const own = pointFor(s, brand);
    const max = Math.max(...s.points.map((p) => p.value));
    if (own && max) parts.push((own.value / max) * 100);
  }
  if (!parts.length) return 0;
  return Math.round(parts.reduce((a, b) => a + b, 0) / parts.length);
}

export function visibilityBand(score: number): "High" | "Medium" | "Low" {
  if (score >= 70) return "High";
  if (score >= 45) return "Medium";
  return "Low";
}

export const SENTIMENT_ROWS = BRANDS.map((b) => ({
  brand: b.key,
  positive: pointFor(SENTIMENT_POSITIVE, b.key)?.value ?? 0,
  neutral: pointFor(SENTIMENT_NEUTRAL, b.key)?.value ?? 0,
  negative: pointFor(SENTIMENT_NEGATIVE, b.key)?.value ?? 0,
  raw: pointFor(SENTIMENT_POSITIVE, b.key)?.raw ?? "",
}));

export const RADAR_SERIES = [
  UNIT_SHARE,
  SENTIMENT_POSITIVE,
  AWARENESS_UNAIDED,
  RND_INTENSITY,
  OPERATING_MARGIN,
  SERVICE_ATTACH,
];

/* ------------------------------------------------------------------ */
/* Recommended actions                                                 */
/* ------------------------------------------------------------------ */

export type RecommendationPriority = "High" | "Medium" | "Low";

export interface Recommendation {
  id: string;
  /** Imperative headline -- the thing to actually do. */
  action: string;
  /** One line on why, phrased against the tracked numbers. */
  rationale: string;
  priority: RecommendationPriority;
  /** Functions that would carry the action. */
  owners: string[];
  /** Sheet rows the action is read from, so it stays traceable. */
  evidenceRows: number[];
  /** Topics this action belongs to -- drives which panel surfaces it. */
  topics: CategoryKey[];
}

/**
 * AI-generated wording on top of synthetic figures. These are shaped like real
 * actions so the workflow is legible, but they are not researched advice --
 * every rendering of them carries an AiTag for that reason.
 */
export const RECOMMENDATIONS: Recommendation[] = [
  {
    id: "r290-messaging",
    action: "Accelerate R-290 messaging ahead of the 2026 monobloc launch",
    rationale:
      "Vaillant and Viessmann both lead the propane narrative in DACH retrofit — Daikin's largest EU segment — while Daikin's own R-290 story arrives later.",
    priority: "High",
    owners: ["Marketing", "Product"],
    evidenceRows: [34, 44],
    topics: ["technology", "marketing"],
  },
  {
    id: "installer-experience",
    action: "Close the installer experience gap",
    rationale:
      "Daikin leads on unit share but ranks behind on installer NPS — the sharpest gap on the page, and the one rivals convert into loyalty.",
    priority: "High",
    owners: ["Service", "Marketing"],
    evidenceRows: [26, 59],
    topics: ["customer", "aftermarket"],
  },
  {
    id: "watch-viessmann",
    action: "Put Viessmann on the closest watch of the five",
    rationale:
      "Carrier backing plus whole-home bundling overlaps Daikin's premium segment directly, on top of a High threat rating.",
    priority: "High",
    owners: ["Strategy", "Leadership"],
    evidenceRows: [72, 73],
    topics: ["positioning", "executive"],
  },
  {
    id: "tco-evidence",
    action: "Defend the price premium with published TCO evidence",
    rationale:
      "Daikin sits above the field on list price index; without a running-cost argument the premium reads as pure cost in tender comparisons.",
    priority: "Medium",
    owners: ["Sales", "Finance"],
    evidenceRows: [60, 62, 64],
    topics: ["pricing", "sales"],
  },
  {
    id: "review-volume",
    action: "Convert search and event reach into review volume",
    rationale:
      "Daikin leads web traffic, keywords and stand footprint, yet trails on positive review share — the funnel leaks between reach and advocacy.",
    priority: "Medium",
    owners: ["Marketing"],
    evidenceRows: [41, 43, 56],
    topics: ["marketing", "customer"],
  },
  {
    id: "cycle-time",
    action: "Shorten concept-to-launch to match the fastest rival",
    rationale:
      "R&D spend leads the set but time-to-market does not, so the spend advantage is not reaching the market as speed.",
    priority: "Medium",
    owners: ["R&D", "Product"],
    evidenceRows: [45, 49],
    topics: ["rnd"],
  },
  {
    id: "fgas-position",
    action: "Pre-position the range for the next F-Gas step-down",
    rationale:
      "Refrigerant and efficiency mandates move ahead of product cycles; rivals already market compliance as a differentiator rather than a floor.",
    priority: "Medium",
    owners: ["Compliance", "Product"],
    evidenceRows: [50, 51, 54],
    topics: ["regulatory", "product"],
  },
  {
    id: "patent-claims",
    action: "Bank the patent lead into spec-sheet claims",
    rationale:
      "The largest active patent portfolio in the set is not visible in customer-facing material, so it earns nothing in a head-to-head comparison.",
    priority: "Low",
    owners: ["Product", "Marketing"],
    evidenceRows: [38],
    topics: ["product", "technology"],
  },
];

const PRIORITY_ORDER: Record<RecommendationPriority, number> = { High: 0, Medium: 1, Low: 2 };

/** Every action, most urgent first -- for leadership roll-ups. */
export const ALL_RECOMMENDATIONS = [...RECOMMENDATIONS].sort(
  (a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority],
);

/** Actions belonging to any of the given topics, most urgent first. */
export function recommendationsForTopics(topics: CategoryKey[]): Recommendation[] {
  return RECOMMENDATIONS.filter((r) => r.topics.some((t) => topics.includes(t))).sort(
    (a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority],
  );
}

function PriorityPill({ priority }: { priority: RecommendationPriority }) {
  const variant = { High: "risk", Medium: "caution", Low: "neutral" }[priority] as
    | "risk"
    | "caution"
    | "neutral";
  return (
    <Badge variant={variant} size="sm">
      {priority} priority
    </Badge>
  );
}

/** Sheet rows an action is read from, named so they can be looked up. */
function EvidenceRows({ rows }: { rows: number[] }) {
  const named = rows.map((row) => {
    const metric = INTEL_METRICS.find((m) => m.sourceRow === row);
    return metric ? `${metric.metric} (row ${row})` : `row ${row}`;
  });
  return (
    <p className="mt-2 text-xs leading-relaxed text-navy-400">
      <span className="font-semibold uppercase tracking-wider">Evidence</span> · {named.join(" · ")}
    </p>
  );
}

/**
 * The page's actions, lifted out of the prose so they survive scanning. Left
 * accent bar matches the callout treatment used in the executive newsbrief.
 */
export function RecommendationCallout({
  items,
  title = "Recommended actions",
  hint,
  compact = false,
  className,
}: {
  items: Recommendation[];
  title?: string;
  hint?: string;
  /** Drops rationale and evidence -- for roll-ups that point elsewhere. */
  compact?: boolean;
  className?: string;
}) {
  if (!items.length) return null;

  return (
    <section
      aria-label={title}
      className={cn(
        "rounded-2xl border border-edge border-l-4 border-l-daikin-600 bg-daikin-50/50 p-5 shadow-card",
        className,
      )}
    >
      <div className="flex flex-wrap items-center gap-2">
        <Lightbulb className="size-5 shrink-0 text-daikin-600" aria-hidden />
        <h3 className="text-base font-bold text-navy-900">{title}</h3>
        <Badge variant="daikin" size="sm">
          {items.length} {items.length === 1 ? "action" : "actions"}
        </Badge>
        <AiTag kind="generated" />
      </div>
      <p className="mt-1 text-sm text-navy-500">
        {hint ?? "Generated by this application from the tracked rows — review before acting."}
      </p>

      <ol className={cn("mt-4", compact ? "space-y-2" : "space-y-3")}>
        {items.map((r) => (
          <li
            key={r.id}
            className={cn(
              "rounded-xl border border-daikin-200/70 bg-white",
              compact ? "px-3.5 py-2.5" : "p-4",
            )}
          >
            <div className="flex flex-wrap items-center gap-2">
              <PriorityPill priority={r.priority} />
              <span className="text-xs font-semibold text-navy-500">{r.owners.join(" · ")}</span>
            </div>
            <p
              className={cn(
                "mt-1.5 font-bold text-navy-900",
                compact ? "text-sm" : "text-[0.9375rem]",
              )}
            >
              {r.action}
            </p>
            {!compact && (
              <>
                <p className="mt-1 text-sm leading-relaxed text-navy-600">{r.rationale}</p>
                <EvidenceRows rows={r.evidenceRows} />
              </>
            )}
          </li>
        ))}
      </ol>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Presentational primitives                                           */
/* ------------------------------------------------------------------ */

export function PanelIntro({
  icon: Icon,
  title,
  audience,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  audience?: string;
  children?: React.ReactNode;
}) {
  return (
    <header>
      <div className="flex flex-wrap items-center gap-2.5">
        <Icon className="size-5 text-daikin-600" aria-hidden />
        <h2 className="text-2xl font-bold text-navy-900">{title}</h2>
        {audience && (
          <Badge variant="outline" size="sm">
            For {audience}
          </Badge>
        )}
      </div>
      {children && <p className="mt-1.5 max-w-4xl text-base text-navy-500">{children}</p>}
    </header>
  );
}

export function Card({
  title,
  hint,
  children,
  className,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn("rounded-2xl border border-edge bg-white p-5 shadow-card", className)}
      aria-label={title}
    >
      <h3 className="text-base font-semibold text-navy-900">{title}</h3>
      {hint && <p className="mt-0.5 text-sm text-navy-500">{hint}</p>}
      <div className="mt-4">{children}</div>
    </section>
  );
}

export function StatTile({
  label,
  value,
  sub,
  tone = "neutral",
  rank,
}: {
  label: string;
  value: string;
  sub: string;
  tone?: "daikin" | "verified" | "caution" | "neutral";
  rank?: string;
}) {
  const toneClass = {
    daikin: "border-daikin-200 bg-daikin-50/70",
    verified: "border-verified-500/25 bg-verified-50/70",
    caution: "border-caution-500/25 bg-caution-50/70",
    neutral: "border-edge bg-white",
  }[tone];

  return (
    <div className={cn("rounded-2xl border p-5 shadow-card", toneClass)}>
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-bold uppercase tracking-wider text-navy-500">{label}</p>
        {rank && (
          <span className="shrink-0 rounded-full bg-white/80 px-2 py-0.5 text-xs font-bold text-navy-600">
            {rank}
          </span>
        )}
      </div>
      <p className="mt-2.5 text-3xl font-bold tabular-nums text-navy-900">{value}</p>
      <p className="mt-1 text-sm leading-relaxed text-navy-500">{sub}</p>
    </div>
  );
}

export function ThreatPill({ level }: { level: "High" | "Medium" | "Low" | null }) {
  if (!level) return null;
  const map = {
    High: { variant: "risk" as const, icon: TriangleAlert },
    Medium: { variant: "caution" as const, icon: Minus },
    Low: { variant: "verified" as const, icon: Minus },
  };
  const { variant, icon: Icon } = map[level];
  return (
    <Badge variant={variant} size="sm">
      <Icon aria-hidden />
      {level} threat
    </Badge>
  );
}

export function IngestionBadge({ ingestion }: { ingestion: string }) {
  const kind = ingestionKind(ingestion);
  const map = {
    api: { variant: "verified" as const, label: "API" },
    mixed: { variant: "daikin" as const, label: "Hybrid" },
    manual: { variant: "caution" as const, label: "Manual" },
    internal: { variant: "neutral" as const, label: "Internal" },
  };
  const { variant, label } = map[kind];
  return (
    <span className="flex flex-col items-start gap-1">
      <Badge variant={variant} size="sm">
        {label}
      </Badge>
      <span className="text-[0.6875rem] leading-relaxed text-navy-500">{ingestion}</span>
    </span>
  );
}

/** The loud provenance notice every brand view opens with. */
export function SyntheticDataBanner() {
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-risk-500/30 bg-risk-50 px-4 py-3.5">
      <ShieldAlert className="mt-0.5 size-5 shrink-0 text-risk-700" aria-hidden />
      <div>
        <p className="text-sm font-bold uppercase tracking-wider text-risk-700">
          Synthetic demonstration data
        </p>
        <p className="mt-1 text-sm leading-relaxed text-risk-700/90">
          Every per-brand figure on this page is an illustrative placeholder generated for this
          proof of concept — it is <strong>not researched, sourced, or verified</strong>, and must
          not be quoted externally or used for a real decision. The page demonstrates the
          aggregation workflow and the shape of the output. The <em>ingestion mechanism</em> and{" "}
          <em>suggested source</em> columns are genuine recommendations for wiring real feeds.
        </p>
      </div>
    </div>
  );
}

/** The evidence table -- one row per tracked metric, one column per brand. */
export function MetricsTable({ metrics }: { metrics: IntelMetric[] }) {
  if (!metrics.length) {
    return (
      <p className="rounded-xl border border-dashed border-edge p-8 text-center text-navy-500">
        No metric matches that search.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-edge">
      <table className="w-full min-w-[1100px] text-left text-sm">
        <thead>
          <tr className="border-b border-edge bg-navy-50/70 text-xs font-bold uppercase tracking-wider text-navy-500">
            <th className="px-3 py-2.5">Metric</th>
            {BRANDS.map((b) => (
              <th key={b.key} className="px-3 py-2.5">
                <span className="flex items-center gap-1.5">
                  <span
                    aria-hidden
                    className="size-2 rounded-full"
                    style={{ background: b.color }}
                  />
                  {b.name
                    .replace("Mitsubishi Electric", "Mitsubishi")
                    .replace("Bosch/Buderus", "Bosch")}
                </span>
              </th>
            ))}
            <th className="px-3 py-2.5">Ingestion</th>
          </tr>
        </thead>
        <tbody>
          {metrics.map((m) => (
            <tr key={m.sourceRow} className="border-b border-edge align-top last:border-b-0">
              <td className="px-3 py-3">
                <p className="font-semibold text-navy-900">{m.metric}</p>
                <p className="mt-0.5 text-xs leading-relaxed text-navy-400">{m.whatToCapture}</p>
                <p className="mt-1 text-[0.6875rem] text-navy-400">
                  {CATEGORY_BY_KEY[m.category].label} · row {m.sourceRow}
                </p>
              </td>
              {BRANDS.map((b) => (
                <td
                  key={b.key}
                  className={cn(
                    "px-3 py-3 leading-relaxed",
                    b.isDaikin ? "bg-daikin-50/40 font-medium text-navy-800" : "text-navy-600",
                  )}
                >
                  {m.values[b.key] || "—"}
                </td>
              ))}
              <td className="px-3 py-3">
                <IngestionBadge ingestion={m.ingestion} />
                <p className="mt-1.5 text-[0.6875rem] leading-relaxed text-navy-400">
                  {m.suggestedSource}
                </p>
                <p className="mt-1 text-[0.6875rem] italic leading-relaxed text-navy-400">
                  Viz: {m.visualization}
                </p>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** CSV of the given metrics, matching the on-screen columns. */
export function metricsToCsv(metrics: IntelMetric[]): string {
  const head = [
    "Category",
    "Metric",
    "What to capture",
    ...BRANDS.map((b) => b.name),
    "Ingestion",
    "Suggested source",
    "Sheet row",
  ];
  const esc = (v: string) => `"${String(v).replace(/"/g, '""')}"`;
  const body = metrics.map((m) =>
    [
      CATEGORY_BY_KEY[m.category].label,
      m.metric,
      m.whatToCapture,
      ...BRANDS.map((b) => m.values[b.key] ?? ""),
      m.ingestion,
      m.suggestedSource,
      String(m.sourceRow),
    ]
      .map(esc)
      .join(","),
  );
  return [head.map(esc).join(","), ...body].join("\n");
}

export function downloadCsv(csv: string, filename: string) {
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
