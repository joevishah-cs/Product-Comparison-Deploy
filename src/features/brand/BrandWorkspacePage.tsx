import * as React from "react";
import { useSearchParams } from "react-router-dom";
import {
  ShieldAlert,
  TrendingUp,
  Users,
  Megaphone,
  Radar as RadarIcon,
  Landmark,
  Search,
  Download,
  ClipboardCopy,
  Trophy,
  TriangleAlert,
  Minus,
  Sparkles,
  Database,
  Cable,
  PencilLine,
  Building2,
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
  CATEGORIES,
  CATEGORY_BY_KEY,
  INTEL_METRICS,
  ingestionKind,
  metricsForCategory,
  type BrandKey,
  type CategoryKey,
  type IntelMetric,
} from "@/data/brand-intel";
import {
  AWARENESS_AIDED,
  AWARENESS_UNAIDED,
  ERP_TOP_CLASS,
  GROSS_MARGIN,
  INSTALLER_BASE,
  NPS_ENDUSER,
  NPS_INSTALLER,
  OPERATING_MARGIN,
  PATENT_FAMILIES,
  PERCEPTION,
  PRICE_INDEX,
  RANKING_KEYWORDS,
  RECENT_MOVES,
  REFRIGERANT,
  REVENUE_SHARE,
  REVIEW_RATING,
  REVIEW_THEMES,
  RND_INTENSITY,
  RND_SPEND,
  SENTIMENT_NEGATIVE,
  SENTIMENT_NEUTRAL,
  SENTIMENT_POSITIVE,
  SERVICE_ATTACH,
  SOCIAL_FOLLOWERS,
  STAND_FOOTPRINT,
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
  ALL_RECOMMENDATIONS,
  RecommendationCallout,
  recommendationsForTopics,
} from "./BrandUi";

const COMPETITORS = BRANDS.filter((b) => !b.isDaikin);

/* ------------------------------------------------------------------ */
/* Derived headline read-outs                                          */
/* ------------------------------------------------------------------ */

function visibilityScore(brand: BrandKey): number {
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

function visibilityBand(score: number): "High" | "Medium" | "Low" {
  if (score >= 70) return "High";
  if (score >= 45) return "Medium";
  return "Low";
}

const SENTIMENT_ROWS = BRANDS.map((b) => ({
  brand: b.key,
  positive: pointFor(SENTIMENT_POSITIVE, b.key)?.value ?? 0,
  neutral: pointFor(SENTIMENT_NEUTRAL, b.key)?.value ?? 0,
  negative: pointFor(SENTIMENT_NEGATIVE, b.key)?.value ?? 0,
  raw: pointFor(SENTIMENT_POSITIVE, b.key)?.raw ?? "",
}));

const RADAR_SERIES = [
  UNIT_SHARE,
  SENTIMENT_POSITIVE,
  AWARENESS_UNAIDED,
  RND_INTENSITY,
  OPERATING_MARGIN,
  SERVICE_ATTACH,
];

/* ------------------------------------------------------------------ */
/* Small building blocks                                               */
/* ------------------------------------------------------------------ */

function PanelIntro({
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

function Card({
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

function StatTile({
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

function ThreatPill({ level }: { level: "High" | "Medium" | "Low" | null }) {
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

function IngestionBadge({ ingestion }: { ingestion: string }) {
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

/* ------------------------------------------------------------------ */
/* Section panels — one per tab                                        */
/* ------------------------------------------------------------------ */

function SummaryPanel() {
  const daikinShare = pointFor(UNIT_SHARE, "daikin");
  const sentimentLeader = leaderOf(SENTIMENT_POSITIVE);
  const visibilityLeader = [...BRANDS].sort(
    (a, b) => visibilityScore(b.key) - visibilityScore(a.key),
  )[0];
  const highThreats = COMPETITORS.filter((b) => threatLevel(b.key) === "High");

  return (
    <div className="space-y-6">
      <PanelIntro icon={TrendingUp} title="Executive summary" audience="Leadership">
        The four questions an executive opens this page to answer, each traceable to a row in the
        source sheet.
      </PanelIntro>

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
          value={BRAND_BY_KEY[sentimentLeader!.brand].name.replace("Mitsubishi Electric", "Mitsubishi")}
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
            {pointFor(AWARENESS_UNAIDED, "daikin")?.value}%), the most web traffic (
            {pointFor(WEB_VISITS, "daikin")?.value}m monthly visits) and the largest trade-show
            footprint ({pointFor(STAND_FOOTPRINT, "daikin")?.value.toLocaleString()}m²).{" "}
            <AiTag kind="generated" className="align-middle" />
          </p>
          <p>
            <strong>Sentiment is the soft spot.</strong> Daikin&apos;s{" "}
            {pointFor(SENTIMENT_POSITIVE, "daikin")?.value}% positive review share ranks #
            {daikinRank(SENTIMENT_POSITIVE)}, behind{" "}
            {BRAND_BY_KEY[sentimentLeader!.brand].name} ({sentimentLeader!.value}%). Installer NPS is
            the sharper gap: Daikin {pointFor(NPS_INSTALLER, "daikin")?.value} against{" "}
            {leaderOf(NPS_INSTALLER)?.value} for{" "}
            {BRAND_BY_KEY[leaderOf(NPS_INSTALLER)!.brand].name} — rank #
            {daikinRank(NPS_INSTALLER)} of {NPS_INSTALLER.points.length}.
          </p>
          <p>
            <strong>Three rivals rate High threat and two attack the same flank.</strong>{" "}
            {highThreats.map((b) => b.name).join(", ")}. Vaillant and Viessmann both lead on
            propane/R-290 and efficiency in DACH retrofit — Daikin&apos;s largest EU segment — while
            Mitsubishi holds cold-climate spec leadership and the strongest installer loyalty.
          </p>
        </div>
      </Card>

      {/* Lifted out of the prose above so the actions survive scanning. */}
      <RecommendationCallout items={ALL_RECOMMENDATIONS} />
    </div>
  );
}

function ProfilePanel() {
  return (
    <div className="space-y-6">
      <PanelIntro icon={RadarIcon} title="Competitive profile" audience="Leadership / Strategy">
        Six normalised axes, indexed 0–100 within this selection. Read the shape, not the score — a
        well-rounded profile is harder to attack than a single spike.
      </PanelIntro>

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
          title="Competitive watchlist"
          hint="Threat rating with the rationale behind it."
          className="xl:col-span-2"
        >
          <ul className="space-y-3">
            {[...COMPETITORS]
              .sort((a, b) => {
                const order = { High: 0, Medium: 1, Low: 2 } as const;
                return (
                  (order[threatLevel(a.key) ?? "Low"] ?? 3) -
                  (order[threatLevel(b.key) ?? "Low"] ?? 3)
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
                      <span className="font-normal text-navy-400">{b.product}</span>
                    </span>
                    <ThreatPill level={threatLevel(b.key)} />
                  </div>
                  <p className="mt-1.5 text-sm leading-relaxed text-navy-600">
                    {threatRationale(b.key)}
                  </p>
                </li>
              ))}
          </ul>
          <p className="mt-3 text-xs text-navy-400">Sheet row 73.</p>
        </Card>
      </div>
    </div>
  );
}

function SentimentPanel() {
  return (
    <div className="space-y-6">
      <PanelIntro icon={Users} title="Customer sentiment" audience="Marketing / Service">
        Review sentiment and satisfaction. This is the one area where Daikin&apos;s own numbers come
        from a real dataset in this app — the competitor figures on this page do not.
      </PanelIntro>

      <RecommendationCallout items={recommendationsForTopics(["customer", "aftermarket"])} />

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

        <div className="grid gap-6">
          <Card title="Installer NPS" hint="Where Daikin trails hardest. Sheet row 26.">
            <RankedBars series={NPS_INSTALLER} height={176} />
          </Card>
          <Card title="End-user NPS" hint="Sheet row 26.">
            <RankedBars series={NPS_ENDUSER} height={176} />
          </Card>
          <Card title="Average review rating" hint="Sheet row 56.">
            <RankedBars series={REVIEW_RATING} height={176} />
          </Card>
        </div>
      </div>

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
    </div>
  );
}

function MediaPanel() {
  return (
    <div className="space-y-6">
      <PanelIntro icon={Megaphone} title="Media visibility & marketing" audience="Marketing">
        Media visibility stands in for brand awareness — derived from digital footprint and event
        presence rather than expensive panel research.
      </PanelIntro>

      <RecommendationCallout items={recommendationsForTopics(["marketing"])} />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {BRANDS.map((b) => {
          const score = visibilityScore(b.key);
          const band = visibilityBand(score);
          return (
            <div
              key={b.key}
              className={cn(
                "rounded-2xl border p-5 shadow-card",
                b.isDaikin ? "border-daikin-300 bg-daikin-50/50" : "border-edge bg-white",
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
            </div>
          );
        })}
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card title="Unaided brand awareness" hint="Sheet row 39.">
          <RankedBars series={AWARENESS_UNAIDED} />
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
      </div>
    </div>
  );
}

function PositioningPanel() {
  return (
    <div className="space-y-6">
      <PanelIntro icon={Trophy} title="Analyst-style positioning" audience="Leadership / Product">
        Strengths and weaknesses relative to Daikin, plus each rival&apos;s most recent competitive
        moves. Sheet rows 70–72.
      </PanelIntro>

      <RecommendationCallout items={recommendationsForTopics(["positioning", "executive"])} />

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

      <Card title="Head-to-head win/loss themes" hint="Why deals are won and lost. Sheet row 74.">
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
  );
}

/** Stacked scoreboard cards hold 2-3 charts, so each needs its own name. */
function ScoredSeries({ series, first }: { series: BrandSeries; first?: boolean }) {
  return (
    <div className={cn(!first && "border-t border-edge pt-4")}>
      <h4 className="mb-1.5 text-sm font-semibold text-navy-800">{series.label}</h4>
      <RankedBars series={series} height={176} />
    </div>
  );
}

function ScoreboardsPanel() {
  return (
    <div className="space-y-6">
      <PanelIntro icon={Trophy} title="Team scoreboards" audience="Product, Sales, R&D, Service">
        The numeric metrics each function is measured on, ranked. Every bar reads the same parsed
        sheet values as the evidence table under <em>By team</em>.
      </PanelIntro>

      <RecommendationCallout
        items={recommendationsForTopics(["product", "technology", "rnd", "sales", "pricing"])}
      />

      <div className="grid gap-6 xl:grid-cols-2">
        <Card title="Product & Technology" hint="Efficiency-class coverage and patent depth.">
          <div className="space-y-5">
            <ScoredSeries series={ERP_TOP_CLASS} first />
            <ScoredSeries series={PATENT_FAMILIES} />
          </div>
        </Card>

        <Card title="R&D" hint="Spend, intensity and how fast ideas reach market.">
          <div className="space-y-5">
            <ScoredSeries series={RND_SPEND} first />
            <ScoredSeries series={TIME_TO_MARKET} />
          </div>
        </Card>

        <Card
          title="Sales & Pricing"
          hint="Price position and margin. Lower price index = cheaper than Daikin."
        >
          <div className="space-y-5">
            <ScoredSeries series={PRICE_INDEX} first />
            <ScoredSeries series={GROSS_MARGIN} />
          </div>
        </Card>

        <Card title="Service & Aftermarket" hint="Reliability, network reach and training scale.">
          <div className="space-y-5">
            <ScoredSeries series={WARRANTY_CLAIM_RATE} first />
            <ScoredSeries series={INSTALLER_BASE} />
            <ScoredSeries series={TRAINING_SEATS} />
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
    </div>
  );
}

function ByTeamPanel({
  team,
  setTeam,
  query,
  setQuery,
  metrics,
}: {
  team: CategoryKey | "all";
  setTeam: (t: CategoryKey | "all") => void;
  query: string;
  setQuery: (q: string) => void;
  metrics: IntelMetric[];
}) {
  return (
    <div className="space-y-6">
      <PanelIntro icon={Building2} title="By team" audience="Every function">
        The same {INTEL_METRICS.length} tracked metrics, filtered to what each team owns. Every row
        names the ingestion mechanism and the source a real feed would come from.
      </PanelIntro>

      <div className="rounded-2xl border border-edge bg-white p-5 shadow-card">
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
              placeholder="Search metrics and values"
              aria-label="Search brand intelligence metrics"
              className="h-11 w-full rounded-xl border border-edge pl-11 pr-3 text-base text-navy-900 placeholder:text-navy-400 focus:border-daikin-400 focus:outline-none focus:ring-2 focus:ring-daikin-500/25"
            />
          </div>
          <p className="text-sm font-medium text-navy-500" aria-live="polite">
            {metrics.length} of {INTEL_METRICS.length} metrics
          </p>
        </div>

        <div
          className="mt-4 flex flex-wrap gap-1.5"
          role="group"
          aria-label="Filter metrics by owning team"
        >
          <button
            type="button"
            onClick={() => setTeam("all")}
            aria-pressed={team === "all"}
            className={cn(
              "rounded-lg px-3 py-1.5 text-sm font-semibold transition-colors",
              team === "all"
                ? "bg-daikin-600 text-white"
                : "bg-navy-50 text-navy-600 hover:bg-navy-100",
            )}
          >
            All teams
          </button>
          {CATEGORIES.map((c) => (
            <button
              key={c.key}
              type="button"
              onClick={() => setTeam(c.key)}
              aria-pressed={team === c.key}
              title={c.blurb}
              className={cn(
                "rounded-lg px-3 py-1.5 text-sm font-semibold transition-colors",
                team === c.key
                  ? "bg-daikin-600 text-white"
                  : "bg-navy-50 text-navy-600 hover:bg-navy-100",
              )}
            >
              {c.label}
              <span
                className={cn(
                  "ml-1.5 text-xs font-bold",
                  team === c.key ? "text-white/70" : "text-navy-400",
                )}
              >
                {metricsForCategory(c.key).length}
              </span>
            </button>
          ))}
        </div>

        {team !== "all" && (
          <p className="mt-3 rounded-xl bg-daikin-50/60 px-4 py-2.5 text-sm text-daikin-800">
            <strong>{CATEGORY_BY_KEY[team].audience}:</strong> {CATEGORY_BY_KEY[team].blurb}
          </p>
        )}

        <div className="mt-4 overflow-x-auto rounded-xl border border-edge">
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

        {metrics.length === 0 && (
          <p className="mt-4 rounded-xl border border-dashed border-edge p-8 text-center text-navy-500">
            No metric matches that search.
          </p>
        )}
      </div>
    </div>
  );
}

function FeedReadinessPanel() {
  return (
    <div className="space-y-6">
      <PanelIntro
        icon={Database}
        title="How this would arrive in production"
        audience="Data / Engineering"
      >
        The honest part of this page. Each metric is tagged with the mechanism that would keep it
        fresh, so the client can see what is automatable versus what needs a licence or a human.
      </PanelIntro>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {(
          [
            ["api", "API / automated", Cable, "Pollable feeds — certification directories, patent databases, web analytics, review platforms."],
            ["mixed", "Hybrid", Sparkles, "Partly automatable, needs a licensed tool or human validation."],
            ["manual", "Manual / licensed", PencilLine, "Analyst reports, price lists, interviews, policy tracking."],
            ["internal", "Internal systems", Landmark, "CRM, warranty records, marketing automation — already in-house."],
          ] as const
        ).map(([kind, label, Icon, blurb]) => {
          const rows = INTEL_METRICS.filter((m) => ingestionKind(m.ingestion) === kind);
          const pct = Math.round((rows.length / INTEL_METRICS.length) * 100);
          return (
            <div key={kind} className="rounded-2xl border border-edge bg-white p-5 shadow-card">
              <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-navy-500">
                <Icon className="size-4 text-daikin-600" aria-hidden />
                {label}
              </p>
              <p className="mt-2.5 text-3xl font-bold tabular-nums text-navy-900">
                {rows.length}
                <span className="ml-1.5 text-base font-semibold text-navy-400">
                  / {INTEL_METRICS.length}
                </span>
              </p>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-navy-100">
                <div className="h-full rounded-full bg-daikin-500" style={{ width: `${pct}%` }} />
              </div>
              <p className="mt-2.5 text-sm leading-relaxed text-navy-500">{blurb}</p>
            </div>
          );
        })}
      </div>

      <footer className="rounded-2xl border border-edge bg-navy-50/50 p-5">
        <p className="text-sm leading-relaxed text-navy-600">
          <strong className="text-navy-800">Provenance.</strong> All {INTEL_METRICS.length} metrics
          on this page are read from <code className="text-xs">src/data/brand-intel.ts</code>, which
          is generated from <em>Daikin Competitor Intel (1).xlsx</em> (sheet Altherma, rows 16–84) by{" "}
          <code className="text-xs">datasets-1/extract-brand-intel.py</code>. Every figure shown is
          parsed from that sheet rather than retyped, so the charts, cards and evidence table cannot
          drift apart — but every per-brand value in the sheet is synthetic. Replace columns E–J with
          licensed data to make this page real.
        </p>
      </footer>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Tab definitions                                                     */
/* ------------------------------------------------------------------ */

const TABS = [
  { key: "summary", label: "Executive summary", icon: TrendingUp },
  { key: "profile", label: "Competitive profile", icon: RadarIcon },
  { key: "sentiment", label: "Customer sentiment", icon: Users },
  { key: "media", label: "Media & marketing", icon: Megaphone },
  { key: "positioning", label: "Analyst positioning", icon: Trophy },
  { key: "scoreboards", label: "Team scoreboards", icon: Building2 },
  { key: "metrics", label: "By team", icon: Search },
  { key: "readiness", label: "Feed readiness", icon: Database },
] as const;

type TabKey = (typeof TABS)[number]["key"];

const TAB_KEYS = TABS.map((t) => t.key) as readonly TabKey[];

function isTabKey(value: string | null): value is TabKey {
  return !!value && (TAB_KEYS as readonly string[]).includes(value);
}

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

export function BrandWorkspacePage() {
  const { notify } = useToast();
  const [params, setParams] = useSearchParams();
  const [team, setTeam] = React.useState<CategoryKey | "all">("all");
  const [query, setQuery] = React.useState("");
  const tabRefs = React.useRef<(HTMLButtonElement | null)[]>([]);

  const raw = params.get("tab");
  const active: TabKey = isTabKey(raw) ? raw : "summary";
  const activeIndex = TAB_KEYS.indexOf(active);

  function selectTab(key: TabKey, focus = false) {
    const next = new URLSearchParams(params);
    next.set("tab", key);
    setParams(next, { replace: true });
    if (focus) tabRefs.current[TAB_KEYS.indexOf(key)]?.focus();
  }

  function onTabKeyDown(e: React.KeyboardEvent<HTMLButtonElement>) {
    const last = TAB_KEYS.length - 1;
    const move = { ArrowRight: 1, ArrowLeft: -1 } as const;
    if (e.key in move) {
      e.preventDefault();
      const delta = move[e.key as keyof typeof move];
      selectTab(TAB_KEYS[(activeIndex + delta + TAB_KEYS.length) % TAB_KEYS.length], true);
    } else if (e.key === "Home") {
      e.preventDefault();
      selectTab(TAB_KEYS[0], true);
    } else if (e.key === "End") {
      e.preventDefault();
      selectTab(TAB_KEYS[last], true);
    }
  }

  const filteredMetrics = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    return INTEL_METRICS.filter((m) => {
      if (team !== "all" && m.category !== team) return false;
      if (!q) return true;
      const hay = [m.metric, m.whatToCapture, ...Object.values(m.values)].join(" ").toLowerCase();
      return hay.includes(q);
    });
  }, [team, query]);

  const daikinShare = pointFor(UNIT_SHARE, "daikin");
  const sentimentLeader = leaderOf(SENTIMENT_POSITIVE);
  const visibilityLeader = [...BRANDS].sort(
    (a, b) => visibilityScore(b.key) - visibilityScore(a.key),
  )[0];
  const highThreats = COMPETITORS.filter((b) => threatLevel(b.key) === "High");

  function exportCsv() {
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
    const body = filteredMetrics.map((m) =>
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
    const csv = [head.map(esc).join(","), ...body].join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "daikin-brand-intelligence-SYNTHETIC.csv";
    a.click();
    URL.revokeObjectURL(url);
    notify(`Exported ${filteredMetrics.length} metrics. Values are synthetic.`);
  }

  async function copySummary() {
    const lines = [
      "OVERALL BRAND INTELLIGENCE - EXECUTIVE SUMMARY",
      `Scope: ${BRAND_INTEL_SCOPE}`,
      "*** ALL FIGURES SYNTHETIC - DEMO USE ONLY, NOT SOURCED ***",
      "",
      `Market position: Daikin ${daikinShare?.value}% EU heat pump unit share (rank ${daikinRank(UNIT_SHARE)} of ${UNIT_SHARE.points.length}).`,
      `Media visibility leader: ${visibilityLeader.name} (${visibilityBand(visibilityScore(visibilityLeader.key))}).`,
      `Best customer sentiment: ${BRAND_BY_KEY[sentimentLeader!.brand].name} at ${sentimentLeader!.value}% positive; Daikin ${pointFor(SENTIMENT_POSITIVE, "daikin")?.value}%.`,
      `High-threat competitors: ${highThreats.map((b) => b.name).join(", ")}.`,
      "",
      "WATCHLIST",
      ...COMPETITORS.map((b) => `- ${b.name} (${threatLevel(b.key)}): ${threatRationale(b.key)}`),
    ];
    const ok = await copyText(lines.join("\n"));
    notify(
      ok ? "Executive summary copied." : "Could not access the clipboard.",
      ok ? "success" : "warning",
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <header>
        <p className="eyebrow">Brand Intelligence</p>
        <h1 className="mt-2.5 text-3xl font-bold text-navy-900">Brand workspace</h1>
        <p className="mt-2 max-w-4xl text-lg text-navy-500">
          Customer reviews, media visibility, analyst positioning and competitive signals for Daikin Altherma against five tracked rivals — aggregated into one view, then broken out per team.
        </p>
        <p className="mt-2 text-sm text-navy-400">{BRAND_INTEL_SCOPE}</p>

        <div className="mt-4 flex flex-wrap gap-2">
          <Button variant="secondary" size="sm" onClick={copySummary}>
            <ClipboardCopy aria-hidden />
            Copy executive summary
          </Button>
          <Button variant="secondary" size="sm" onClick={exportCsv}>
            <Download aria-hidden />
            Export {filteredMetrics.length} metrics (CSV)
          </Button>
        </div>
      </header>

      {/* Provenance banner -- deliberately loud and above everything. */}
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

      {/* Tab bar — sticky so the section switcher stays reachable on long panels. */}
      <div className="sticky top-0 z-20 -mx-1 bg-canvas/95 px-1 py-2 backdrop-blur supports-[backdrop-filter]:bg-canvas/80">
        <div
          role="tablist"
          aria-label="Brand intelligence sections"
          className="flex gap-1 overflow-x-auto rounded-xl border border-edge bg-navy-50/60 p-1"
        >
          {TABS.map((tab, i) => {
            const selected = tab.key === active;
            return (
              <button
                key={tab.key}
                ref={(el) => {
                  tabRefs.current[i] = el;
                }}
                type="button"
                role="tab"
                id={`brand-tab-${tab.key}`}
                aria-selected={selected}
                aria-controls={`brand-panel-${tab.key}`}
                tabIndex={selected ? 0 : -1}
                onClick={() => selectTab(tab.key)}
                onKeyDown={onTabKeyDown}
                className={cn(
                  "flex shrink-0 items-center gap-2 whitespace-nowrap rounded-lg px-3.5 py-2 text-sm font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-daikin-500/40",
                  selected
                    ? "bg-white text-daikin-700 shadow-card"
                    : "text-navy-500 hover:text-navy-700",
                )}
              >
                <tab.icon
                  className={cn("size-4 shrink-0", selected ? "text-daikin-600" : "text-navy-400")}
                  aria-hidden
                />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      <div
        role="tabpanel"
        id={`brand-panel-${active}`}
        aria-labelledby={`brand-tab-${active}`}
        tabIndex={0}
        className="focus:outline-none"
      >
        {active === "summary" && <SummaryPanel />}
        {active === "profile" && <ProfilePanel />}
        {active === "sentiment" && <SentimentPanel />}
        {active === "media" && <MediaPanel />}
        {active === "positioning" && <PositioningPanel />}
        {active === "scoreboards" && <ScoreboardsPanel />}
        {active === "metrics" && (
          <ByTeamPanel
            team={team}
            setTeam={setTeam}
            query={query}
            setQuery={setQuery}
            metrics={filteredMetrics}
          />
        )}
        {active === "readiness" && <FeedReadinessPanel />}
      </div>
    </div>
  );
}
