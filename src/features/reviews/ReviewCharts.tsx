import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { AXIS_COLOR, GRID_COLOR, buildColorMap, shortLabel } from "@/components/charts/palette";
import { ChartCard } from "@/components/charts/ChartCard";
import type { ProductReviewSummary } from "./reviewEngine";
import { MIN_REPORTABLE, ratingTrend } from "./reviewEngine";
import type { ReviewSource } from "@/data/review-types";
import { MATCH_LEVEL_LABEL } from "@/data/review-types";
import { AiTag } from "@/components/common/AiTag";

const SENTIMENT_COLOR = { positive: "#16a45c", neutral: "#e0900b", negative: "#e0333a" };
const STAR_COLORS = ["#0b557b", "#0097e0", "#59bcff", "#e0900b", "#e0333a"];

function Insufficient({ label }: { label: string }) {
  return (
    <div className="flex min-h-[200px] items-center justify-center rounded-xl border border-dashed border-edge bg-navy-50/50 p-8 text-center">
      <p className="text-base font-medium text-navy-500">{label}</p>
    </div>
  );
}

function sourceLines(summaries: ProductReviewSummary[], source: ReviewSource): string[] {
  const withData = summaries.filter((s) => s.count > 0);
  const lines = withData.map(
    (s) =>
      `${s.product.displayName} — ${s.count} ${MATCH_LEVEL_LABEL[s.matchLevel].toLowerCase()} from ${source.sourceFile}`,
  );
  const without = summaries.filter((s) => s.count === 0);
  if (without.length) {
    lines.push(
      `No approved user-review data for ${without.map((s) => s.product.displayName).join(", ")} — excluded from this chart.`,
    );
  }
  return lines;
}

/* ------------------------------------------------------------------ */

export function AverageRatingChart({
  summaries,
  source,
}: {
  summaries: ProductReviewSummary[];
  source: ReviewSource;
}) {
  const colors = buildColorMap(summaries.map((s) => s.product));
  const data = summaries
    .filter((s) => s.count > 0 && s.averageRating !== null)
    .map((s) => ({
      id: s.product.id,
      name: shortLabel(s.product),
      brand: s.product.brand,
      rating: Number(s.averageRating?.toFixed(2)),
      count: s.count,
      matchLabel: s.matchLabel,
      reportable: s.count >= MIN_REPORTABLE,
      barLabel: `${s.averageRating?.toFixed(2)} · ${s.count} reviews`,
    }));

  return (
    <ChartCard
      title="Average rating by product"
      subtitle="Average star rating with the review count each average rests on"
      direction="higher"
      meaning={
        <>
          An average without a sample size is not a comparison. A 5.0 from a handful of reviews is a weaker
          signal than a 4.7 from several hundred, so every bar carries its review count and any product
          below {MIN_REPORTABLE} reviews is marked as too small to rank.
        </>
      }
      sources={sourceLines(summaries, source)}
      unavailableNote={
        summaries.some((s) => s.count === 0)
          ? `${summaries.filter((s) => s.count === 0).map((s) => s.product.displayName).join(", ")} — no approved user-review data available, so no rating can be shown. This is an absence of data, not a low score.`
          : null
      }
    >
      {data.length === 0 ? (
        <Insufficient label="No selected product has matching review data." />
      ) : (
        <div style={{ width: "100%", height: Math.max(240, data.length * 56 + 60) }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} layout="vertical" margin={{ top: 8, right: 132, bottom: 8, left: 8 }} barCategoryGap="28%">
              <CartesianGrid horizontal={false} stroke={GRID_COLOR} />
              <XAxis type="number" domain={[0, 5]} ticks={[0, 1, 2, 3, 4, 5]} tick={{ fontSize: 13, fill: AXIS_COLOR }} axisLine={{ stroke: GRID_COLOR }} tickLine={false} />
              <YAxis type="category" dataKey="name" width={132} tick={{ fontSize: 13, fill: AXIS_COLOR, fontWeight: 500 }} axisLine={false} tickLine={false} />
              <Tooltip
                cursor={{ fill: "rgba(0,151,224,0.06)" }}
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const d = payload[0].payload as (typeof data)[number];
                  return (
                    <div className="max-w-xs rounded-xl border border-edge bg-white p-3.5 shadow-pop">
                      <p className="text-sm font-semibold text-navy-900">{d.brand} {d.name.replace(" ★", "")}</p>
                      <p className="mt-1 text-lg font-bold text-navy-900">{d.rating} / 5</p>
                      <p className="text-sm text-navy-500">{d.count} reviews · {d.matchLabel}</p>
                      {!d.reportable && (
                        <p className="mt-1 text-xs text-caution-700">
                          Fewer than {MIN_REPORTABLE} reviews — too small a sample to rank.
                        </p>
                      )}
                    </div>
                  );
                }}
              />
              <Bar dataKey="rating" radius={[0, 8, 8, 0]} isAnimationActive={false}>
                {data.map((d) => (
                  <Cell key={d.id} fill={colors[d.id]} fillOpacity={d.reportable ? 1 : 0.45} />
                ))}
                <LabelList
                  dataKey="barLabel"
                  position="right"
                  style={{ fontSize: 13, fontWeight: 700, fill: AXIS_COLOR }}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </ChartCard>
  );
}

/* ------------------------------------------------------------------ */

export function RatingDistributionChart({
  summaries,
  source,
}: {
  summaries: ProductReviewSummary[];
  source: ReviewSource;
}) {
  const withData = summaries.filter((s) => s.count > 0);
  const data = ([5, 4, 3, 2, 1] as const).map((star) => {
    const row: Record<string, string | number> = { star: `${star} star` };
    for (const s of withData) row[s.product.id] = s.ratingDistribution[star];
    return row;
  });

  return (
    <ChartCard
      title="Rating distribution"
      subtitle="How the reviews split across one to five stars"
      direction="none"
      meaning={
        <>
          The shape matters as much as the average. A rating clustered at five stars with a thin tail reads
          differently from one split between five and one — the second usually means experiences vary by
          install or by home, not that the product is average.
        </>
      }
      sources={sourceLines(summaries, source)}
      unavailableNote={null}
    >
      {withData.length === 0 ? (
        <Insufficient label="No selected product has matching review data." />
      ) : (
        <div style={{ width: "100%", height: 300 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 20, right: 12, bottom: 8, left: 4 }} barCategoryGap="24%">
              <CartesianGrid vertical={false} stroke={GRID_COLOR} />
              <XAxis dataKey="star" tick={{ fontSize: 13, fill: AXIS_COLOR, fontWeight: 500 }} axisLine={{ stroke: GRID_COLOR }} tickLine={false} />
              <YAxis allowDecimals={false} tick={{ fontSize: 13, fill: AXIS_COLOR }} axisLine={false} tickLine={false} />
              <Tooltip
                cursor={{ fill: "rgba(0,151,224,0.06)" }}
                content={({ active, payload, label }) => {
                  if (!active || !payload?.length) return null;
                  return (
                    <div className="rounded-xl border border-edge bg-white p-3.5 shadow-pop">
                      <p className="text-sm font-bold text-navy-900">{label}</p>
                      <ul className="mt-1.5 space-y-1">
                        {payload.map((e) => (
                          <li key={String(e.dataKey)} className="flex items-center gap-2 text-sm">
                            <span className="size-2.5 rounded-sm" style={{ backgroundColor: e.color }} />
                            <span className="text-navy-700">{e.name}</span>
                            <span className="ml-auto font-semibold text-navy-900">{e.value}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  );
                }}
              />
              <Legend wrapperStyle={{ paddingTop: 8 }} />
              {withData.map((s, i) => (
                <Bar
                  key={s.product.id}
                  dataKey={s.product.id}
                  name={`${s.product.model} (${s.count})`}
                  fill={STAR_COLORS[i % STAR_COLORS.length]}
                  radius={[6, 6, 0, 0]}
                  isAnimationActive={false}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </ChartCard>
  );
}

/* ------------------------------------------------------------------ */

export function SentimentComparisonChart({
  summaries,
  source,
}: {
  summaries: ProductReviewSummary[];
  source: ReviewSource;
}) {
  const withData = summaries.filter((s) => s.count > 0);
  const data = withData.map((s) => ({
    name: shortLabel(s.product),
    count: s.count,
    Positive: s.sentimentCounts.positive,
    Neutral: s.sentimentCounts.neutral,
    Negative: s.sentimentCounts.negative,
  }));

  return (
    <ChartCard
      title="Sentiment comparison"
      subtitle="Reviews grouped by the rating the customer gave"
      direction="none"
      actions={<AiTag />}
      meaning={
        <>
          Sentiment here is derived from the star rating the reviewer actually chose — four or five stars is
          positive, three is neutral, one or two is negative. It is not inferred from the wording, so it
          cannot drift from what the customer intended.
        </>
      }
      sources={sourceLines(summaries, source)}
      unavailableNote={null}
    >
      {!data.length ? (
        <Insufficient label="No selected product has matching review data." />
      ) : (
        <div style={{ width: "100%", height: Math.max(240, data.length * 70 + 60) }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} layout="vertical" margin={{ top: 8, right: 20, bottom: 8, left: 8 }} barCategoryGap="30%">
              <CartesianGrid horizontal={false} stroke={GRID_COLOR} />
              <XAxis type="number" tick={{ fontSize: 13, fill: AXIS_COLOR }} axisLine={{ stroke: GRID_COLOR }} tickLine={false} />
              <YAxis type="category" dataKey="name" width={132} tick={{ fontSize: 13, fill: AXIS_COLOR, fontWeight: 500 }} axisLine={false} tickLine={false} />
              <Tooltip
                cursor={{ fill: "rgba(0,151,224,0.06)" }}
                content={({ active, payload, label }) => {
                  if (!active || !payload?.length) return null;
                  const total = (payload[0].payload as { count: number }).count;
                  return (
                    <div className="rounded-xl border border-edge bg-white p-3.5 shadow-pop">
                      <p className="text-sm font-bold text-navy-900">{label}</p>
                      <p className="text-xs text-navy-500">{total} reviews</p>
                      <ul className="mt-1.5 space-y-1">
                        {payload.map((e) => (
                          <li key={String(e.dataKey)} className="flex items-center gap-2 text-sm">
                            <span className="size-2.5 rounded-sm" style={{ backgroundColor: e.color }} />
                            <span className="text-navy-700">{e.name}</span>
                            <span className="ml-auto font-semibold text-navy-900">
                              {e.value} ({Math.round((Number(e.value) / total) * 100)}%)
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  );
                }}
              />
              <Legend wrapperStyle={{ paddingTop: 8 }} />
              <Bar dataKey="Positive" stackId="s" fill={SENTIMENT_COLOR.positive} isAnimationActive={false} radius={[0, 0, 0, 0]} />
              <Bar dataKey="Neutral" stackId="s" fill={SENTIMENT_COLOR.neutral} isAnimationActive={false} />
              <Bar dataKey="Negative" stackId="s" fill={SENTIMENT_COLOR.negative} isAnimationActive={false} radius={[0, 6, 6, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </ChartCard>
  );
}

/* ------------------------------------------------------------------ */

export function ThemeComparisonChart({
  summaries,
  source,
}: {
  summaries: ProductReviewSummary[];
  source: ReviewSource;
}) {
  const withData = summaries.filter((s) => s.count > 0);
  const keys = source.themeDefinitions.map((d) => d.key);

  const data = keys
    .map((key) => {
      const row: Record<string, string | number> = {
        theme: source.themeDefinitions.find((d) => d.key === key)?.label ?? key,
      };
      let any = 0;
      for (const s of withData) {
        const t = s.themes.find((x) => x.key === key);
        row[s.product.id] = t?.total ?? 0;
        any += t?.total ?? 0;
      }
      return { row, any };
    })
    .filter((r) => r.any > 0)
    .sort((a, b) => b.any - a.any)
    .map((r) => r.row);

  return (
    <ChartCard
      title="Review theme comparison"
      subtitle="How often each topic appears across the matched reviews"
      direction="none"
      actions={<AiTag />}
      meaning={
        <>
          Themes are detected by keyword matching over the review text, so they show what customers talk
          about — not whether they were happy about it. Read this next to the sentiment chart: a topic
          mentioned often is one your message has to address either way.
        </>
      }
      sources={sourceLines(summaries, source)}
      unavailableNote={null}
    >
      {!data.length ? (
        <Insufficient label="No themed reviews in the matched sample." />
      ) : (
        <div style={{ width: "100%", height: Math.max(320, data.length * 40 + 70) }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} layout="vertical" margin={{ top: 8, right: 20, bottom: 8, left: 8 }} barCategoryGap="24%">
              <CartesianGrid horizontal={false} stroke={GRID_COLOR} />
              <XAxis type="number" allowDecimals={false} tick={{ fontSize: 13, fill: AXIS_COLOR }} axisLine={{ stroke: GRID_COLOR }} tickLine={false} />
              <YAxis type="category" dataKey="theme" width={150} tick={{ fontSize: 13, fill: AXIS_COLOR, fontWeight: 500 }} axisLine={false} tickLine={false} />
              <Tooltip
                cursor={{ fill: "rgba(0,151,224,0.06)" }}
                content={({ active, payload, label }) => {
                  if (!active || !payload?.length) return null;
                  return (
                    <div className="rounded-xl border border-edge bg-white p-3.5 shadow-pop">
                      <p className="text-sm font-bold text-navy-900">{label}</p>
                      <ul className="mt-1.5 space-y-1">
                        {payload.map((e) => (
                          <li key={String(e.dataKey)} className="flex items-center gap-2 text-sm">
                            <span className="size-2.5 rounded-sm" style={{ backgroundColor: e.color }} />
                            <span className="text-navy-700">{e.name}</span>
                            <span className="ml-auto font-semibold text-navy-900">{e.value} mentions</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  );
                }}
              />
              <Legend wrapperStyle={{ paddingTop: 8 }} />
              {withData.map((s, i) => (
                <Bar
                  key={s.product.id}
                  dataKey={s.product.id}
                  name={`${s.product.model} (${s.count})`}
                  fill={STAR_COLORS[i % STAR_COLORS.length]}
                  radius={[0, 6, 6, 0]}
                  isAnimationActive={false}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </ChartCard>
  );
}

/* ------------------------------------------------------------------ */

export function ReviewTrendChart({
  summaries,
  source,
}: {
  summaries: ProductReviewSummary[];
  source: ReviewSource;
}) {
  const lead = summaries.filter((s) => s.count > 0).sort((a, b) => b.count - a.count)[0];
  const points = lead ? ratingTrend(lead.reviews, "quarter").filter((p) => p.count >= 3) : [];

  return (
    <ChartCard
      title="Review trend over time"
      subtitle={lead ? `${lead.product.displayName} — quarters with at least 3 reviews` : "Rating over time"}
      direction="higher"
      meaning={
        <>
          Direction matters more than any single quarter. A rating that drifts after a product change, a new
          install crew or a seasonal peak is worth investigating before it shows up on a review site. Sparse
          quarters are omitted rather than plotted as noise.
        </>
      }
      sources={sourceLines(summaries, source)}
      unavailableNote={
        lead && lead.matchLevel !== "exact_model"
          ? "These reviews may cover the broader product model or family and may not reflect the exact selected unit."
          : null
      }
    >
      {points.length < 3 ? (
        <Insufficient label="Not enough reviews across time to draw a reliable trend." />
      ) : (
        <div style={{ width: "100%", height: 300 }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={points} margin={{ top: 12, right: 16, bottom: 8, left: 4 }}>
              <CartesianGrid vertical={false} stroke={GRID_COLOR} />
              <XAxis dataKey="label" tick={{ fontSize: 12, fill: AXIS_COLOR }} axisLine={{ stroke: GRID_COLOR }} tickLine={false} />
              <YAxis yAxisId="rating" domain={[3, 5]} ticks={[3, 3.5, 4, 4.5, 5]} tick={{ fontSize: 13, fill: AXIS_COLOR }} axisLine={false} tickLine={false} />
              <YAxis yAxisId="count" orientation="right" allowDecimals={false} tick={{ fontSize: 12, fill: "#9db8d8" }} axisLine={false} tickLine={false} />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (!active || !payload?.length) return null;
                  const d = payload[0].payload as (typeof points)[number];
                  return (
                    <div className="rounded-xl border border-edge bg-white p-3.5 shadow-pop">
                      <p className="text-sm font-bold text-navy-900">{label}</p>
                      <p className="mt-1 text-lg font-bold text-navy-900">{d.averageRating} / 5</p>
                      <p className="text-sm text-navy-500">{d.count} reviews in this quarter</p>
                      <p className="mt-1 text-xs text-navy-400">
                        {d.positive} positive · {d.neutral} neutral · {d.negative} negative
                      </p>
                    </div>
                  );
                }}
              />
              <Legend wrapperStyle={{ paddingTop: 8 }} />
              <Bar yAxisId="count" dataKey="count" name="Reviews" fill="#e4ecf4" isAnimationActive={false} radius={[4, 4, 0, 0]} />
              <Line yAxisId="rating" type="monotone" dataKey="averageRating" name="Average rating" stroke="#0097e0" strokeWidth={3} dot={{ r: 4, strokeWidth: 2, fill: "#fff" }} isAnimationActive={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </ChartCard>
  );
}

/* ------------------------------------------------------------------ */

export function StrengthsConcernsChart({
  summaries,
  source,
  onViewReviews,
}: {
  summaries: ProductReviewSummary[];
  source: ReviewSource;
  onViewReviews: (filter: { productId: string; theme?: string }) => void;
}) {
  const lead = summaries.filter((s) => s.count > 0).sort((a, b) => b.count - a.count)[0];

  const ranked = lead
    ? lead.themes
        .filter((t) => t.total >= MIN_REPORTABLE)
        .map((t) => ({ ...t, share: t.positive / t.total }))
        .sort((a, b) => b.share - a.share)
    : [];

  return (
    <ChartCard
      title="Strengths and concerns"
      subtitle={lead ? `${lead.product.displayName} — themes with at least ${MIN_REPORTABLE} mentions` : "Ranked themes"}
      direction="higher"
      actions={<AiTag />}
      meaning={
        <>
          Themes ranked by the share of mentions that came from a satisfied reviewer. The top of the list is
          what to lead with; the bottom is what a competitor will raise first, so it is worth having an
          answer ready rather than hoping it does not come up.
        </>
      }
      sources={sourceLines(summaries, source)}
      unavailableNote={null}
    >
      {!ranked.length ? (
        <Insufficient label={`No theme reaches ${MIN_REPORTABLE} mentions in the matched sample.`} />
      ) : (
        <ul className="space-y-2">
          {ranked.map((t) => {
            const pct = Math.round(t.share * 100);
            return (
              <li key={t.key}>
                <button
                  type="button"
                  onClick={() => lead && onViewReviews({ productId: lead.product.id, theme: t.key })}
                  // Four fixed-width columns don't fit a phone, so below `sm`
                  // the row reflows: label, then the figures, then the bar.
                  className="surface-row flex w-full flex-wrap items-center gap-x-3 gap-y-2 border-edge p-3 text-left hover:border-daikin-300 hover:bg-daikin-50/40 sm:flex-nowrap"
                >
                  <span className="w-full text-sm font-semibold text-navy-800 sm:w-40 sm:shrink-0">
                    {t.label}
                  </span>
                  <span className="order-last flex h-3 w-full overflow-hidden rounded-full bg-navy-100 sm:order-none sm:flex-1">
                    <span style={{ width: `${(t.positive / t.total) * 100}%`, background: SENTIMENT_COLOR.positive }} />
                    <span style={{ width: `${(t.neutral / t.total) * 100}%`, background: SENTIMENT_COLOR.neutral }} />
                    <span style={{ width: `${(t.negative / t.total) * 100}%`, background: SENTIMENT_COLOR.negative }} />
                  </span>
                  <span className="text-sm font-bold tabular-nums text-navy-900 sm:w-28 sm:shrink-0 sm:text-right">
                    {pct}% positive
                  </span>
                  <span className="text-xs tabular-nums text-navy-500 sm:w-24 sm:shrink-0 sm:text-right">
                    {t.total} mentions
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </ChartCard>
  );
}
