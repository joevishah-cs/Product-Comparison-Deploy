import * as React from "react";
import { Database, Filter } from "lucide-react";
import { cn, formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { ReviewRecord, ReviewSentiment } from "@/data/review-types";
import { useReviewSource } from "./useReviewSource";
import { ReviewCard, StarRating } from "./ReviewPrimitives";

const SENTIMENTS: { value: ReviewSentiment | "all"; label: string }[] = [
  { value: "all", label: "All ratings" },
  { value: "positive", label: "Positive (4–5★)" },
  { value: "neutral", label: "Neutral (3★)" },
  { value: "negative", label: "Negative (1–2★)" },
];

/**
 * The imported customer-review dataset, browsable across every reviewed product
 * in the export — not just the models that exist in the comparison catalog.
 */
export function ImportedReviewsSection() {
  const { source, loading, error } = useReviewSource();

  const [productId, setProductId] = React.useState("all");
  const [sentiment, setSentiment] = React.useState<ReviewSentiment | "all">("all");
  const [theme, setTheme] = React.useState("all");
  const [limit, setLimit] = React.useState(20);

  React.useEffect(() => setLimit(20), [productId, sentiment, theme]);

  const themeLabels = React.useMemo(
    () => (source ? Object.fromEntries(source.themeDefinitions.map((d) => [d.key, d.label])) : {}),
    [source],
  );

  const filtered: ReviewRecord[] = React.useMemo(() => {
    if (!source) return [];
    return source.reviews.filter(
      (r) =>
        (productId === "all" || r.productId.toUpperCase() === productId.toUpperCase()) &&
        (sentiment === "all" || r.sentiment === sentiment) &&
        (theme === "all" || r.themes.includes(theme)),
    );
  }, [source, productId, sentiment, theme]);

  const stats = React.useMemo(() => {
    if (!filtered.length) return null;
    const rated = filtered.filter((r) => r.rating !== null);
    const avg = rated.length ? rated.reduce((n, r) => n + (r.rating ?? 0), 0) / rated.length : null;
    return { count: filtered.length, avg };
  }, [filtered]);

  if (loading) {
    return <p className="rounded-xl bg-navy-50 px-4 py-3 text-sm text-navy-500">Loading imported customer reviews…</p>;
  }
  if (error || !source) {
    return (
      <p className="rounded-2xl border border-dashed border-edge bg-white p-8 text-center text-base text-navy-500">
        No approved user-review data available — the review export could not be loaded.
      </p>
    );
  }

  return (
    <section aria-label="Imported customer reviews" className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="flex items-center gap-2 text-2xl font-bold text-navy-900">
            <Database className="size-6 text-daikin-600" aria-hidden />
            Imported customer reviews
          </h2>
          <p className="mt-1.5 max-w-4xl text-base text-navy-500">
            {source.totalReviews.toLocaleString()} approved reviews from {source.sourceFile} (
            {formatDate(source.dateRange.from)} – {formatDate(source.dateRange.to)}), shown verbatim. The
            export covers Daikin FIT products only — competitor reviews are not included in the source.
          </p>
        </div>
        {stats && (
          <div className="surface px-5 py-3 text-right">
            <StarRating value={stats.avg} showValue />
            <p className="mt-0.5 text-sm text-navy-500">
              {stats.count.toLocaleString()} {stats.count === 1 ? "review" : "reviews"} in view
            </p>
          </div>
        )}
      </header>

      {/* Per-product coverage from the export itself */}
      <div className="overflow-x-auto scroll-shadow">
        <div className="flex min-w-max gap-2 pb-1">
          <button
            type="button"
            aria-pressed={productId === "all"}
            onClick={() => setProductId("all")}
            className={cn(
              "min-h-[44px] rounded-xl border px-3.5 text-sm font-semibold transition-colors",
              productId === "all"
                ? "border-daikin-600 bg-daikin-600 text-white"
                : "border-edge bg-white text-navy-600 hover:border-daikin-300",
            )}
          >
            All products · {source.totalReviews}
          </button>
          {source.reviewedProducts.map((p) => (
            <button
              key={p.productId}
              type="button"
              aria-pressed={productId === p.productId}
              onClick={() => setProductId(p.productId)}
              className={cn(
                "min-h-[44px] rounded-xl border px-3.5 text-left text-sm transition-colors",
                productId === p.productId
                  ? "border-daikin-600 bg-daikin-600 text-white"
                  : "border-edge bg-white text-navy-600 hover:border-daikin-300",
              )}
            >
              <span className="block font-semibold">{p.productId.toUpperCase()}</span>
              <span className={cn("block text-xs", productId === p.productId ? "text-white/80" : "text-navy-400")}>
                {p.reviewCount} reviews
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Filters */}
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
                  ? "border-daikin-600 bg-daikin-600 text-white"
                  : "border-edge bg-white text-navy-600 hover:border-daikin-300",
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
            className="h-10 rounded-xl border border-edge bg-white px-3 text-sm text-navy-800 focus:border-daikin-500 focus:outline-none focus:ring-2 focus:ring-daikin-500/25"
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

      {/* Review list */}
      {filtered.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-edge bg-white p-10 text-center text-base text-navy-500">
          No reviews match these filters.
        </p>
      ) : (
        <>
          <div className="grid gap-3 lg:grid-cols-2">
            {filtered.slice(0, limit).map((r) => (
              <ReviewCard key={r.id} review={r} matchLevel="exact_model" themeLabels={themeLabels} />
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

      <p className="rounded-xl border border-edge bg-navy-50/60 p-4 text-sm leading-relaxed text-navy-600">
        <Badge variant="caution" size="sm" className="mr-2">
          Review disclaimer
        </Badge>
        Customer reviews reflect individual experiences and may relate to equipment, installation,
        contractor service, home conditions, climate, maintenance, or personal expectations. Reviews are not
        guarantees of future performance. The export records no verified-purchase status, source platform,
        helpful votes or sub-ratings, so none are shown.
      </p>
    </section>
  );
}
