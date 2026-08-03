import * as React from "react";
import { useSearchParams } from "react-router-dom";
import {
  Landmark,
  Lightbulb,
  TrendingUp,
  Headset,
  Trophy,
  Search,
  Download,
  ClipboardCopy,
} from "lucide-react";
import { cn, copyText } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { AiTag } from "@/components/common/AiTag";
import {
  BRANDS,
  BRAND_BY_KEY,
  BRAND_INTEL_SCOPE,
  CATEGORY_BY_KEY,
  INTEL_METRICS,
  type CategoryKey,
} from "@/data/brand-intel";
import {
  AWARENESS_AIDED,
  AWARENESS_UNAIDED,
  ERP_TOP_CLASS,
  GROSS_MARGIN,
  INSTALLER_BASE,
  NPS_ENDUSER,
  NPS_INSTALLER,
  PATENT_FAMILIES,
  PERCEPTION,
  PRICE_INDEX,
  RANKING_KEYWORDS,
  RECENT_MOVES,
  REFRIGERANT,
  REVENUE_SHARE,
  REVIEW_RATING,
  REVIEW_THEMES,
  RND_SPEND,
  SENTIMENT_POSITIVE,
  SOCIAL_FOLLOWERS,
  STRENGTHS_VS_DAIKIN,
  SUSTAINABILITY,
  TIME_TO_MARKET,
  TRAINING_SEATS,
  UNIT_SHARE,
  WARRANTY_CLAIM_RATE,
  WEAKNESSES_VS_DAIKIN,
  WEB_VISITS,
  WIN_LOSS,
  daikinRank,
  leaderOf,
  pointFor,
  threatLevel,
  threatRationale,
  type BrandSeries,
} from "@/data/brand-scorecard";
import { BrandLegend, BrandRadar, RankedBars, SentimentBars } from "./BrandCharts";
import {
  COMPETITORS,
  Card,
  MetricsTable,
  PanelIntro,
  ALL_RECOMMENDATIONS,
  RADAR_SERIES,
  RecommendationCallout,
  SENTIMENT_ROWS,
  StatTile,
  SyntheticDataBanner,
  ThreatPill,
  downloadCsv,
  metricsToCsv,
  recommendationsForTopics,
  visibilityBand,
  visibilityScore,
} from "./BrandUi";

/* ------------------------------------------------------------------ */
/* Department grouping -- the 13 tracked topics rolled up to 5 owners   */
/* ------------------------------------------------------------------ */

interface DepartmentGroup {
  key: string;
  label: string;
  /** Which of the 13 sheet categories roll up into this department. */
  topics: CategoryKey[];
  icon: React.ComponentType<{ className?: string }>;
  audience: string;
  blurb: string;
}

const DEPARTMENT_GROUPS: DepartmentGroup[] = [
  {
    key: "strategy",
    label: "Corporate Strategy & Governance",
    topics: ["executive", "regulatory", "macro"],
    icon: Landmark,
    audience: "Leadership, Compliance, Strategy",
    blurb:
      "Share, strategy and the risks that reach the board, plus the regulatory and demand backdrop those decisions sit inside.",
  },
  {
    key: "innovation",
    label: "Product & Innovation",
    topics: ["product", "technology", "rnd"],
    icon: Lightbulb,
    audience: "Product, Engineering",
    blurb:
      "Specs, certifications and the refrigerant roadmap, alongside the R&D spend and cycle time that decide what ships next.",
  },
  {
    key: "commercial",
    label: "Commercial Growth",
    topics: ["sales", "marketing", "pricing"],
    icon: TrendingUp,
    audience: "Sales, Marketing, Finance",
    blurb:
      "How each brand is priced, promoted and sold — list position, margin, awareness and the digital footprint behind demand.",
  },
  {
    key: "customer",
    label: "Customer & Service Experience",
    topics: ["customer", "aftermarket"],
    icon: Headset,
    audience: "Marketing, Service",
    blurb:
      "Installer and end-user satisfaction end to end, from review sentiment through warranty performance and training scale.",
  },
  {
    key: "performance",
    label: "Business & Competitive Performance",
    topics: ["financial", "positioning"],
    icon: Trophy,
    audience: "Finance, Leadership",
    blurb:
      "The scoreboard: financial health next to where each rival beats or trails Daikin and how threatening they are.",
  },
];

const GROUP_BY_KEY = Object.fromEntries(DEPARTMENT_GROUPS.map((g) => [g.key, g])) as Record<
  string,
  DepartmentGroup
>;

const GROUP_KEYS = DEPARTMENT_GROUPS.map((g) => g.key);

function metricsForGroup(group: DepartmentGroup) {
  return INTEL_METRICS.filter((m) => group.topics.includes(m.category));
}

/** Stacked cards hold several charts, so each needs its own name. */
function ScoredSeries({ series, first }: { series: BrandSeries; first?: boolean }) {
  return (
    <div className={cn(!first && "border-t border-edge pt-4")}>
      <h4 className="mb-1.5 text-sm font-semibold text-navy-800">{series.label}</h4>
      <RankedBars series={series} height={176} />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Per-department panels                                               */
/* ------------------------------------------------------------------ */

function StrategyPanel() {
  const daikinShare = pointFor(UNIT_SHARE, "daikin");
  const sentimentLeader = leaderOf(SENTIMENT_POSITIVE);
  const visibilityLeader = [...BRANDS].sort(
    (a, b) => visibilityScore(b.key) - visibilityScore(a.key),
  )[0];
  const highThreats = COMPETITORS.filter((b) => threatLevel(b.key) === "High");

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile
          tone="daikin"
          label="Market position"
          value={`${daikinShare?.value ?? "—"}%`}
          sub={`EU heat pump unit share. Revenue share ${pointFor(REVENUE_SHARE, "daikin")?.value}%.`}
          rank={`#${daikinRank(UNIT_SHARE)} of ${UNIT_SHARE.points.length}`}
        />
        <StatTile
          tone={visibilityLeader.isDaikin ? "verified" : "caution"}
          label="Media visibility leader"
          value={visibilityLeader.name}
          sub={`${visibilityBand(visibilityScore(visibilityLeader.key))} visibility band, composite of web, social, search and events.`}
        />
        <StatTile
          tone={sentimentLeader?.brand === "daikin" ? "verified" : "caution"}
          label="Best customer sentiment"
          value={BRAND_BY_KEY[sentimentLeader!.brand].name.replace(
            "Mitsubishi Electric",
            "Mitsubishi",
          )}
          sub={`${sentimentLeader!.value}% positive. Daikin sits at ${pointFor(SENTIMENT_POSITIVE, "daikin")?.value}%, rank #${daikinRank(SENTIMENT_POSITIVE)}.`}
        />
        <StatTile
          tone="caution"
          label="High-threat rivals"
          value={String(highThreats.length)}
          sub={`${highThreats.map((b) => b.name.replace("Mitsubishi Electric", "Mitsubishi")).join(", ")} — all rated High.`}
        />
      </div>

      <Card
        title="What the aggregate says"
        hint="Synthesised from the tracked rows by this application — not an external analyst view."
      >
        <div className="space-y-3 text-[0.9375rem] leading-relaxed text-navy-700">
          <p>
            <strong>Daikin leads on scale and visibility.</strong> It holds the largest EU heat pump unit
            share ({daikinShare?.value}%) and revenue share (
            {pointFor(REVENUE_SHARE, "daikin")?.value}%), the highest unaided awareness (
            {pointFor(AWARENESS_UNAIDED, "daikin")?.value}%) and the most web traffic (
            {pointFor(WEB_VISITS, "daikin")?.value}m monthly visits).{" "}
            <AiTag kind="generated" className="align-middle" />
          </p>
          <p>
            <strong>Three rivals rate High threat and two attack the same flank.</strong>{" "}
            {highThreats.map((b) => b.name).join(", ")}. Vaillant and Viessmann both lead on
            propane/R-290 and efficiency in DACH retrofit — Daikin&apos;s largest EU segment — while
            Mitsubishi holds cold-climate spec leadership and the strongest installer loyalty.
          </p>
        </div>
      </Card>

      <Card title="Competitive watchlist" hint="Threat rating with the rationale behind it. Sheet row 73.">
        <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {[...COMPETITORS]
            .sort((a, b) => {
              const order = { High: 0, Medium: 1, Low: 2 } as const;
              return (
                (order[threatLevel(a.key) ?? "Low"] ?? 3) - (order[threatLevel(b.key) ?? "Low"] ?? 3)
              );
            })
            .map((b) => (
              <li key={b.key} className="rounded-xl border border-edge p-3.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="flex items-center gap-2 text-sm font-bold text-navy-900">
                    <span
                      aria-hidden
                      className="size-2.5 rounded-full"
                      style={{ background: b.color }}
                    />
                    {b.name}
                  </span>
                  <ThreatPill level={threatLevel(b.key)} />
                </div>
                <p className="mt-1.5 text-sm leading-relaxed text-navy-600">
                  {threatRationale(b.key)}
                </p>
              </li>
            ))}
        </ul>
      </Card>

      {/* Leadership sees every department's action, not just its own. */}
      <RecommendationCallout
        items={ALL_RECOMMENDATIONS}
        title="All open actions across departments"
        hint="The full set, including actions owned elsewhere. Open a department tab for the rationale and evidence behind each one."
        compact
      />
    </>
  );
}

function InnovationPanel() {
  return (
    <>
      <div className="grid gap-6 xl:grid-cols-2">
        <Card title="Product & Technology" hint="Efficiency-class coverage and patent depth.">
          <div className="space-y-5">
            <ScoredSeries series={ERP_TOP_CLASS} first />
            <ScoredSeries series={PATENT_FAMILIES} />
          </div>
        </Card>
        <Card title="R&D" hint="Spend and how fast ideas reach market.">
          <div className="space-y-5">
            <ScoredSeries series={RND_SPEND} first />
            <ScoredSeries series={TIME_TO_MARKET} />
          </div>
        </Card>
      </div>

      <Card
        title="Refrigerant roadmap — the axis three rivals are attacking"
        hint="Where each brand stands on the low-GWP transition. Sheet row 34."
      >
        <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {BRANDS.map((b) => (
            <li
              key={b.key}
              className={cn(
                "rounded-xl border p-3.5",
                b.isDaikin ? "border-daikin-200 bg-daikin-50/40" : "border-edge",
              )}
            >
              <p className="flex items-center gap-2 text-sm font-bold text-navy-900">
                <span aria-hidden className="size-2.5 rounded-full" style={{ background: b.color }} />
                {b.name}
              </p>
              <p className="mt-1 text-sm leading-relaxed text-navy-600">{REFRIGERANT.values[b.key]}</p>
            </li>
          ))}
        </ul>
      </Card>
    </>
  );
}

function CommercialPanel() {
  return (
    <>
      <div className="grid gap-6 xl:grid-cols-2">
        <Card
          title="Pricing & Profitability"
          hint="Lower price index = cheaper than Daikin (Daikin = 100)."
        >
          <div className="space-y-5">
            <ScoredSeries series={PRICE_INDEX} first />
            <ScoredSeries series={GROSS_MARGIN} />
          </div>
        </Card>
        <Card title="Marketing reach" hint="Unaided awareness — the cheapest proxy for brand pull.">
          <RankedBars series={AWARENESS_UNAIDED} />
        </Card>
      </div>

      <Card
        title="Media visibility by brand"
        hint="Composite of web traffic, social following, ranking keywords and stand footprint."
      >
        <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {BRANDS.map((b) => {
            const score = visibilityScore(b.key);
            const band = visibilityBand(score);
            return (
              <li
                key={b.key}
                className={cn(
                  "rounded-xl border p-4",
                  b.isDaikin ? "border-daikin-300 bg-daikin-50/50" : "border-edge",
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="flex items-center gap-2 text-sm font-bold text-navy-900">
                    <span aria-hidden className="size-3 rounded-full" style={{ background: b.color }} />
                    {b.name}
                  </p>
                  <Badge
                    variant={band === "High" ? "daikin" : band === "Medium" ? "neutral" : "outline"}
                    size="sm"
                  >
                    {band}
                  </Badge>
                </div>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-navy-100">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${score}%`, background: b.color }}
                    role="img"
                    aria-label={`Visibility index ${score} of 100`}
                  />
                </div>
                <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1 text-sm">
                  <dt className="text-navy-500">Web visits</dt>
                  <dd className="text-right font-semibold tabular-nums text-navy-800">
                    {pointFor(WEB_VISITS, b.key)?.value}m
                  </dd>
                  <dt className="text-navy-500">Followers</dt>
                  <dd className="text-right font-semibold tabular-nums text-navy-800">
                    {pointFor(SOCIAL_FOLLOWERS, b.key)?.value}k
                  </dd>
                  <dt className="text-navy-500">Keywords</dt>
                  <dd className="text-right font-semibold tabular-nums text-navy-800">
                    {pointFor(RANKING_KEYWORDS, b.key)?.value}k
                  </dd>
                  <dt className="text-navy-500">Aided awareness</dt>
                  <dd className="text-right font-semibold tabular-nums text-navy-800">
                    {pointFor(AWARENESS_AIDED, b.key)?.value}%
                  </dd>
                </dl>
                <p className="mt-3 border-t border-edge pt-2.5 text-xs leading-relaxed text-navy-500">
                  {(PERCEPTION.values[b.key] ?? "").split("perception:")[1]?.trim() ?? ""}
                </p>
              </li>
            );
          })}
        </ul>
      </Card>

      <Card
        title="Sustainability positioning"
        hint="How each brand frames the green story. Sheet row 44."
      >
        <ul className="space-y-2.5">
          {BRANDS.map((b) => (
            <li key={b.key} className="flex gap-2.5 text-sm">
              <span
                aria-hidden
                className="mt-1.5 size-2.5 shrink-0 rounded-full"
                style={{ background: b.color }}
              />
              <span>
                <strong className="text-navy-800">{b.name}:</strong>{" "}
                <span className="text-navy-600">{SUSTAINABILITY.values[b.key]}</span>
              </span>
            </li>
          ))}
        </ul>
      </Card>
    </>
  );
}

function CustomerPanel() {
  return (
    <>
      <div className="grid gap-6 xl:grid-cols-2">
        <Card
          title="Review sentiment split"
          hint="Positive / neutral / negative share per brand. Sheet row 56."
        >
          <SentimentBars rows={SENTIMENT_ROWS} />
          <ul className="mt-4 flex flex-wrap gap-x-4 gap-y-1.5 border-t border-edge pt-3 text-xs">
            <li className="flex items-center gap-1.5">
              <span aria-hidden className="size-2.5 rounded-sm bg-verified-500/85" /> Positive
            </li>
            <li className="flex items-center gap-1.5">
              <span aria-hidden className="size-2.5 rounded-sm bg-navy-300" /> Neutral
            </li>
            <li className="flex items-center gap-1.5">
              <span aria-hidden className="size-2.5 rounded-sm bg-risk-500/85" /> Negative
            </li>
          </ul>
        </Card>

        <Card title="Satisfaction scoreboard" hint="Where Daikin trails hardest. Sheet rows 26, 56.">
          <div className="space-y-5">
            <ScoredSeries series={NPS_INSTALLER} first />
            <ScoredSeries series={NPS_ENDUSER} />
            <ScoredSeries series={REVIEW_RATING} />
          </div>
        </Card>
      </div>

      <Card
        title="Aftermarket & Services"
        hint="Reliability, network reach and training scale. Sheet rows 57, 59, 84."
      >
        <div className="grid gap-6 xl:grid-cols-3">
          <ScoredSeries series={WARRANTY_CLAIM_RATE} first />
          <div className="border-t border-edge pt-4 xl:border-l xl:border-t-0 xl:pl-6 xl:pt-0">
            <h4 className="mb-1.5 text-sm font-semibold text-navy-800">{INSTALLER_BASE.label}</h4>
            <RankedBars series={INSTALLER_BASE} height={176} />
          </div>
          <div className="border-t border-edge pt-4 xl:border-l xl:border-t-0 xl:pl-6 xl:pt-0">
            <h4 className="mb-1.5 text-sm font-semibold text-navy-800">{TRAINING_SEATS.label}</h4>
            <RankedBars series={TRAINING_SEATS} height={176} />
          </div>
        </div>
      </Card>

      <Card title="What customers actually talk about" hint="Recurring themes per brand. Sheet row 56.">
        <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {BRANDS.map((b) => {
            const raw = REVIEW_THEMES.values[b.key] ?? "";
            const themes = raw.split("themes:")[1]?.trim() ?? "—";
            return (
              <li
                key={b.key}
                className={cn(
                  "rounded-xl border p-3.5",
                  b.isDaikin ? "border-daikin-200 bg-daikin-50/40" : "border-edge",
                )}
              >
                <p className="flex items-center gap-2 text-sm font-bold text-navy-900">
                  <span aria-hidden className="size-2.5 rounded-full" style={{ background: b.color }} />
                  {b.name}
                </p>
                <p className="mt-1 text-sm capitalize text-navy-600">{themes}</p>
              </li>
            );
          })}
        </ul>
      </Card>
    </>
  );
}

function PerformancePanel() {
  return (
    <>
      <div className="grid gap-6 xl:grid-cols-5">
        <Card title="Brand profile radar" className="xl:col-span-3">
          <BrandRadar series={RADAR_SERIES} brands={BRANDS.map((b) => b.key)} />
          <div className="mt-3 border-t border-edge pt-3">
            <BrandLegend />
          </div>
          <p className="mt-2 text-xs leading-relaxed text-navy-400">
            Axes: unit share, positive sentiment, unaided awareness, R&amp;D intensity, operating
            margin, service attach. Sheet rows 17, 56, 39, 45, 62, 80.
          </p>
        </Card>

        <Card
          title="Head-to-head win/loss themes"
          hint="Why deals are won and lost. Sheet row 74."
          className="xl:col-span-2"
        >
          <ul className="space-y-2.5">
            {BRANDS.map((b) => (
              <li key={b.key} className="flex gap-2.5 text-sm">
                <span
                  aria-hidden
                  className="mt-1.5 size-2.5 shrink-0 rounded-full"
                  style={{ background: b.color }}
                />
                <span className="leading-relaxed text-navy-700">{WIN_LOSS.values[b.key]}</span>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {BRANDS.map((b) => (
          <div
            key={b.key}
            className={cn(
              "flex flex-col rounded-2xl border p-5 shadow-card",
              b.isDaikin ? "border-daikin-300 bg-daikin-50/50" : "border-edge bg-white",
            )}
          >
            <div className="flex items-center justify-between gap-2">
              <p className="flex items-center gap-2 text-base font-bold text-navy-900">
                <span aria-hidden className="size-3 rounded-full" style={{ background: b.color }} />
                {b.name}
              </p>
              {b.isDaikin ? (
                <Badge variant="daikin" size="sm">
                  Reference
                </Badge>
              ) : (
                <ThreatPill level={threatLevel(b.key)} />
              )}
            </div>
            <p className="mt-0.5 text-sm text-navy-500">{b.product}</p>

            <dl className="mt-3.5 space-y-2.5 border-t border-edge pt-3 text-sm">
              <div>
                <dt className="text-xs font-bold uppercase tracking-wider text-verified-700">
                  {b.isDaikin ? "Baseline strengths" : "Beats Daikin on"}
                </dt>
                <dd className="mt-0.5 leading-relaxed text-navy-700">
                  {(STRENGTHS_VS_DAIKIN.values[b.key] ?? "").replace(/^Baseline:\s*/, "")}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-bold uppercase tracking-wider text-caution-700">
                  {b.isDaikin ? "Own weak points" : "Trails Daikin on"}
                </dt>
                <dd className="mt-0.5 leading-relaxed text-navy-700">
                  {(WEAKNESSES_VS_DAIKIN.values[b.key] ?? "").replace(/^Baseline:\s*/, "")}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-bold uppercase tracking-wider text-navy-500">
                  Recent moves
                </dt>
                <dd className="mt-0.5 leading-relaxed text-navy-600">{RECENT_MOVES.values[b.key]}</dd>
              </div>
            </dl>
          </div>
        ))}
      </div>
    </>
  );
}

const PANELS: Record<string, () => React.JSX.Element> = {
  strategy: StrategyPanel,
  innovation: InnovationPanel,
  commercial: CommercialPanel,
  customer: CustomerPanel,
  performance: PerformancePanel,
};

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

export function BrandDepartmentsPage() {
  const { notify } = useToast();
  const [params, setParams] = useSearchParams();
  const [query, setQuery] = React.useState("");
  const [topic, setTopic] = React.useState<CategoryKey | "all">("all");
  const tabRefs = React.useRef<(HTMLButtonElement | null)[]>([]);

  const raw = params.get("dept");
  const activeKey = raw && GROUP_BY_KEY[raw] ? raw : DEPARTMENT_GROUPS[0].key;
  const group = GROUP_BY_KEY[activeKey];
  const activeIndex = GROUP_KEYS.indexOf(activeKey);
  const Panel = PANELS[activeKey];

  function selectGroup(key: string, focus = false) {
    const next = new URLSearchParams(params);
    next.set("dept", key);
    setParams(next, { replace: true });
    setTopic("all"); // topic chips belong to the outgoing department
    if (focus) tabRefs.current[GROUP_KEYS.indexOf(key)]?.focus();
  }

  function onTabKeyDown(e: React.KeyboardEvent<HTMLButtonElement>) {
    const move = { ArrowRight: 1, ArrowLeft: -1 } as const;
    if (e.key in move) {
      e.preventDefault();
      const delta = move[e.key as keyof typeof move];
      selectGroup(GROUP_KEYS[(activeIndex + delta + GROUP_KEYS.length) % GROUP_KEYS.length], true);
    } else if (e.key === "Home") {
      e.preventDefault();
      selectGroup(GROUP_KEYS[0], true);
    } else if (e.key === "End") {
      e.preventDefault();
      selectGroup(GROUP_KEYS[GROUP_KEYS.length - 1], true);
    }
  }

  /** Rows this department owns, after its own topic chip and search box. */
  const groupMetrics = React.useMemo(() => metricsForGroup(group), [group]);
  const filteredMetrics = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    return groupMetrics.filter((m) => {
      if (topic !== "all" && m.category !== topic) return false;
      if (!q) return true;
      const hay = [m.metric, m.whatToCapture, ...Object.values(m.values)].join(" ").toLowerCase();
      return hay.includes(q);
    });
  }, [groupMetrics, topic, query]);

  function exportCsv() {
    downloadCsv(
      metricsToCsv(filteredMetrics),
      `daikin-${group.key}-metrics-SYNTHETIC.csv`,
    );
    notify(`Exported ${filteredMetrics.length} ${group.label} metrics. Values are synthetic.`);
  }

  async function copyBrief() {
    const lines = [
      `${group.label.toUpperCase()} - COMPETITIVE BRIEF`,
      `Topics: ${group.topics.map((t) => CATEGORY_BY_KEY[t].label).join("; ")}`,
      `Scope: ${BRAND_INTEL_SCOPE}`,
      "*** ALL FIGURES SYNTHETIC - DEMO USE ONLY, NOT SOURCED ***",
      "",
      `${groupMetrics.length} tracked metrics across ${group.topics.length} topics.`,
      "",
      ...groupMetrics.map(
        (m) => `- [${CATEGORY_BY_KEY[m.category].label}] ${m.metric}: ${m.values.daikin || "—"}`,
      ),
    ];
    const ok = await copyText(lines.join("\n"));
    notify(
      ok ? `${group.label} brief copied.` : "Could not access the clipboard.",
      ok ? "success" : "warning",
    );
  }

  return (
    <div className="space-y-6">
      <header>
        <p className="eyebrow">Brand Intelligence</p>
        <h1 className="mt-2.5 text-3xl font-bold text-navy-900">Brand view by department</h1>
        <p className="mt-2 max-w-4xl text-lg text-navy-500">
          The same {INTEL_METRICS.length} tracked metrics as the brand workspace, rolled up from
          {" "}{Object.keys(CATEGORY_BY_KEY).length} sheet topics into the five department groups that
          own them — so each function opens one tab and sees everything it is accountable for.
        </p>
        <p className="mt-2 text-sm text-navy-400">{BRAND_INTEL_SCOPE}</p>

        <div className="mt-4 flex flex-wrap gap-2">
          <Button variant="secondary" size="sm" onClick={copyBrief}>
            <ClipboardCopy aria-hidden />
            Copy {group.label} brief
          </Button>
          <Button variant="secondary" size="sm" onClick={exportCsv}>
            <Download aria-hidden />
            Export {filteredMetrics.length} metrics (CSV)
          </Button>
        </div>
      </header>

      <SyntheticDataBanner />

      {/* Department switcher. Sticky so it stays reachable on long panels. */}
      <div className="sticky top-0 z-20 -mx-1 bg-canvas/95 px-1 py-2 backdrop-blur supports-[backdrop-filter]:bg-canvas/80">
        <div
          role="tablist"
          aria-label="Department groups"
          className="flex gap-1 overflow-x-auto rounded-xl border border-edge bg-navy-50/60 p-1"
        >
          {DEPARTMENT_GROUPS.map((g, i) => {
            const selected = g.key === activeKey;
            return (
              <button
                key={g.key}
                ref={(el) => {
                  tabRefs.current[i] = el;
                }}
                type="button"
                role="tab"
                id={`dept-tab-${g.key}`}
                aria-selected={selected}
                aria-controls={`dept-panel-${g.key}`}
                tabIndex={selected ? 0 : -1}
                onClick={() => selectGroup(g.key)}
                onKeyDown={onTabKeyDown}
                className={cn(
                  "flex shrink-0 items-center gap-2 whitespace-nowrap rounded-lg px-3.5 py-2 text-sm font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-daikin-500/40",
                  selected ? "bg-white text-daikin-700 shadow-card" : "text-navy-500 hover:text-navy-700",
                )}
              >
                <span
                  className={cn(
                    "inline-flex size-5 shrink-0 items-center justify-center rounded-full text-[0.6875rem] font-bold",
                    selected ? "bg-daikin-600 text-white" : "bg-navy-200 text-navy-600",
                  )}
                >
                  {i + 1}
                </span>
                {g.label}
                <span
                  className={cn(
                    "text-xs font-bold",
                    selected ? "text-daikin-500" : "text-navy-400",
                  )}
                >
                  {metricsForGroup(g).length}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div
        role="tabpanel"
        id={`dept-panel-${activeKey}`}
        aria-labelledby={`dept-tab-${activeKey}`}
        tabIndex={0}
        className="space-y-6 focus:outline-none"
      >
        <PanelIntro icon={group.icon} title={group.label} audience={group.audience}>
          {group.blurb}
        </PanelIntro>

        {/* Which sheet topics rolled up into this department. */}
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-edge bg-white px-4 py-3">
          <span className="text-xs font-bold uppercase tracking-wider text-navy-500">
            Topics included
          </span>
          {group.topics.map((t) => (
            <Badge key={t} variant="neutral" size="sm">
              {CATEGORY_BY_KEY[t].label}
            </Badge>
          ))}
        </div>

        {/* What this department should do, before the evidence for it. */}
        <RecommendationCallout
          items={recommendationsForTopics(group.topics)}
          title={`Recommended actions — ${group.label}`}
        />

        <Panel />

        {/* Evidence table for this department only. */}
        <Card
          title={`${group.label} — tracked metrics`}
          hint="Every row names the ingestion mechanism and the source a real feed would come from."
        >
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative min-w-[15rem] flex-1">
              <Search
                className="pointer-events-none absolute left-3.5 top-1/2 size-5 -translate-y-1/2 text-navy-400"
                aria-hidden
              />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={`Search ${group.label} metrics`}
                aria-label={`Search ${group.label} metrics`}
                className="h-11 w-full rounded-xl border border-edge pl-11 pr-3 text-base text-navy-900 placeholder:text-navy-400 focus:border-daikin-400 focus:outline-none focus:ring-2 focus:ring-daikin-500/25"
              />
            </div>
            <p className="text-sm font-medium text-navy-500" aria-live="polite">
              {filteredMetrics.length} of {groupMetrics.length} metrics
            </p>
          </div>

          <div className="mt-4 flex flex-wrap gap-1.5" role="group" aria-label="Filter by topic">
            <button
              type="button"
              onClick={() => setTopic("all")}
              aria-pressed={topic === "all"}
              className={cn(
                "rounded-lg px-3 py-1.5 text-sm font-semibold transition-colors",
                topic === "all"
                  ? "bg-daikin-600 text-white"
                  : "bg-navy-50 text-navy-600 hover:bg-navy-100",
              )}
            >
              All topics
            </button>
            {group.topics.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTopic(t)}
                aria-pressed={topic === t}
                title={CATEGORY_BY_KEY[t].blurb}
                className={cn(
                  "rounded-lg px-3 py-1.5 text-sm font-semibold transition-colors",
                  topic === t
                    ? "bg-daikin-600 text-white"
                    : "bg-navy-50 text-navy-600 hover:bg-navy-100",
                )}
              >
                {CATEGORY_BY_KEY[t].label}
                <span
                  className={cn(
                    "ml-1.5 text-xs font-bold",
                    topic === t ? "text-white/70" : "text-navy-400",
                  )}
                >
                  {groupMetrics.filter((m) => m.category === t).length}
                </span>
              </button>
            ))}
          </div>

          {topic !== "all" && (
            <p className="mt-3 rounded-xl bg-daikin-50/60 px-4 py-2.5 text-sm text-daikin-800">
              <strong>{CATEGORY_BY_KEY[topic].audience}:</strong> {CATEGORY_BY_KEY[topic].blurb}
            </p>
          )}

          <div className="mt-4">
            <MetricsTable metrics={filteredMetrics} />
          </div>
        </Card>
      </div>
    </div>
  );
}
