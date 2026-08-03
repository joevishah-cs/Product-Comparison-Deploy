import * as React from "react";
import { FlaskConical, Filter } from "lucide-react";
import { cn, formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import type { ReviewRecord, ReviewSentiment } from "@/data/review-types";
import { useCompetitorReviewSource } from "./useCompetitorReviewSource";
import { ReviewCard, StarRating } from "./ReviewPrimitives";

const SENTIMENTS: { value: ReviewSentiment | "all"; label: string }[] = [
  { value: "all", label: "All ratings" },
  { value: "positive", label: "Positive (4–5★)" },
  { value: "neutral", label: "Neutral (3★)" },
  { value: "negative", label: "Negative (1–2★)" },
];

/**
 * ILLUSTRATIVE / SYNTHETIC competitor review data. No real competitor review export
 * exists for this project — every review shown here is generated for demonstration
 * purposes and must stay clearly labeled as such. See
 * source-documents/generate-competitor-review-records.py for how it was produced.
 */
export function CompetitorReviewsSection() {
  const { source, loading, error } = useCompetitorReviewSource();

  const [brandId, setBrandId] = React.useState("all");
  const [sentiment, setSentiment] = React.useState<ReviewSentiment | "all">("all");
  const [theme, setTheme] = React.useState("all");
  const [limit, setLimit] = React.useState(20);

  React.useEffect(() => setLimit(20), [brandId, sentiment, theme]);

  const themeLabels = React.useMemo(
    () => (source ? Object.fromEntries(source.themeDefinitions.map((d) => [d.key, d.label])) : {}),
    [source],
  );

  const filtered: ReviewRecord[] = React.useMemo(() => {
    if (!source) return [];
    return source.reviews.filter(
      (r) =>
        (brandId === "all" || r.productId === brandId) &&
        (sentiment === "all" || r.sentiment === sentiment) &&
        (theme === "all" || r.themes.includes(theme)),
    );
  }, [source, brandId, sentiment, theme]);

  const stats = React.useMemo(() => {
    if (!filtered.length) return null;
    const rated = filtered.filter((r) => r.rating !== null);
    const avg = rated.length ? rated.reduce((n, r) => n + (r.rating ?? 0), 0) / rated.length : null;
    return { count: filtered.length, avg };
  }, [filtered]);

  if (loading) {
    return <p className="rounded-xl bg-navy-50 px-4 py-3 text-sm text-navy-500">Loading illustrative competitor reviews…</p>;
  }
  if (error || !source) {
    return (
      <p className="rounded-2xl border border-dashed border-edge bg-white p-8 text-center text-base text-navy-500">
        No competitor review sample available.
      </p>
    );
  }

  return (
    <section aria-label="Illustrative competitor reviews" className="space-y-5">
      <div className="rounded-2xl border-2 border-dashed border-caution-500/50 bg-caution-50/60 p-4">
        <p className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-caution-800">
          <FlaskConical className="size-4" aria-hidden />
          Illustrative sample data — not real customer reviews
        </p>
        <p className="mt-1.5 text-sm leading-relaxed text-caution-800/90">
          No competitor review export was supplied to this project. The {source.totalReviews} reviews below are{" "}
          <strong>synthetically generated</strong> for demonstration purposes only, so this section can show what a
          competitor-review comparison would look like once a real source (e.g. Google Reviews, Trustpilot, a
          retailer export) is connected. They must not be quoted externally, used in marketing, or treated as
          evidence of real customer sentiment. Only the Daikin FIT reviews above are real, sourced, verbatim
          customer feedback.
        </p>
      </div>

      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="flex items-center gap-2 text-2xl font-bold text-navy-900">
            <FlaskConical className="size-6 text-caution-600" aria-hidden />
            Competitor reviews
          </h2>
          <p className="mt-1.5 max-w-4xl text-base text-navy-500">
            {source.totalReviews} illustrative reviews across 4 competitor brands (
            {formatDate(source.dateRange.from)} – {formatDate(source.dateRange.to)}). Generated, not imported.
          </p>
        </div>
        {stats && (
          <div className="rounded-2xl border border-caution-500/30 bg-white px-5 py-3 text-right shadow-card">
            <StarRating value={stats.avg} showValue />
            <p className="mt-0.5 text-sm text-navy-500">
              {stats.count.toLocaleString()} {stats.count === 1 ? "review" : "reviews"} in view
            </p>
          </div>
        )}
      </header>

      <div className="overflow-x-auto scroll-shadow">
        <div className="flex min-w-max gap-2 pb-1">
          <button
            type="button"
            aria-pressed={brandId === "all"}
            onClick={() => setBrandId("all")}
            className={cn(
              "min-h-[44px] rounded-xl border px-3.5 text-sm font-semibold transition-colors",
              brandId === "all"
                ? "border-caution-600 bg-caution-600 text-white"
                : "border-edge bg-white text-navy-600 hover:border-caution-300",
            )}
          >
            All brands · {source.totalReviews}
          </button>
          {source.reviewedProducts.map((p) => (
            <button
              key={p.productId}
              type="button"
              aria-pressed={brandId === p.productId}
              onClick={() => setBrandId(p.productId)}
              className={cn(
                "min-h-[44px] rounded-xl border px-3.5 text-left text-sm transition-colors",
                brandId === p.productId
                  ? "border-caution-600 bg-caution-600 text-white"
                  : "border-edge bg-white text-navy-600 hover:border-caution-300",
              )}
            >
              <span className="block font-semibold">{p.brand}</span>
              <span className={cn("block text-xs", brandId === p.productId ? "text-white/80" : "text-navy-400")}>
                {p.reviewCount} reviews
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 surface p-4">
        <span className="flex items-center gap-2 text-sm font-semibold text-navy-500">
          <Filter className="size-4" aria-hidden />
          Filters
        </span>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by rating">
          {SENTIMENTS.map((s) => (
            <button
              key={s.value}
              type="button"
              aria-pressed={sentiment === s.value}
              onClick={() => setSentiment(s.value)}
              className={cn(
                "min-h-[40px] rounded-xl border px-3 text-sm font-semibold transition-colors",
                sentiment === s.value
                  ? "border-caution-600 bg-caution-600 text-white"
                  : "border-edge bg-white text-navy-600 hover:border-caution-300",
              )}
            >
              {s.label}
            </button>
          ))}
        </div>
        <label className="ml-auto flex items-center gap-2">
          <span className="text-sm font-semibold text-navy-500">Theme</span>
          <select
            value={theme}
            onChange={(e) => setTheme(e.target.value)}
            className="h-10 rounded-xl border border-edge bg-white px-3 text-sm text-navy-800 focus:border-caution-500 focus:outline-none focus:ring-2 focus:ring-caution-500/25"
          >
            <option value="all">All themes</option>
            {source.themeDefinitions.map((d) => (
              <option key={d.key} value={d.key}>
                {d.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      {filtered.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-edge bg-white p-10 text-center text-base text-navy-500">
          No sample reviews match these filters.
        </p>
      ) : (
        <>
          <div className="grid gap-3 lg:grid-cols-2">
            {filtered.slice(0, limit).map((r) => (
              <ReviewCard key={r.id} review={r} matchLevel="brand" themeLabels={themeLabels} />
            ))}
          </div>
          {filtered.length > limit && (
            <Button variant="secondary" className="w-full" onClick={() => setLimit((l) => l + 20)}>
              Show {Math.min(20, filtered.length - limit)} more of {(filtered.length - limit).toLocaleString()}{" "}
              remaining
            </Button>
          )}
        </>
      )}
    </section>
  );
}
