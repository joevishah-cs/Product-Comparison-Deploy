import * as React from "react";
import { MessagesSquare, Wrench, Users, LifeBuoy, Package, Cpu, ExternalLink, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ProductVisual } from "@/components/common/ProductVisual";
import type { Product } from "@/data/types";
import type { ReviewSource } from "@/data/review-types";
import {
  buildReviewInsightCards,
  buildReviewNarrative,
  summarizeSelection,
  MIN_REPORTABLE,
  type ProductReviewSummary,
} from "./reviewEngine";
import { StarRating, MatchLevelBadge, ConfidenceBadge, NoReviewData } from "./ReviewPrimitives";
import { AiTag } from "@/components/common/AiTag";
import {
  AverageRatingChart,
  RatingDistributionChart,
  SentimentComparisonChart,
  ThemeComparisonChart,
  ReviewTrendChart,
  StrengthsConcernsChart,
} from "./ReviewCharts";
import type { ReviewDrawerFilter } from "./ReviewDrawer";

const SUBJECT_ICON: Record<string, React.ComponentType<{ className?: string }>> = {
  equipment: Cpu,
  installation: Wrench,
  dealer: Users,
  service: LifeBuoy,
  delivery: Package,
};

export function ReviewIntelligence({
  products,
  source,
  onViewReviews,
}: {
  products: Product[];
  source: ReviewSource;
  onViewReviews: (filter?: ReviewDrawerFilter) => void;
}) {
  const summaries = React.useMemo(() => summarizeSelection(source, products), [source, products]);
  const cards = React.useMemo(() => buildReviewInsightCards(summaries), [summaries]);
  const narrative = React.useMemo(() => buildReviewNarrative(summaries), [summaries]);

  const withData = summaries.filter((s) => s.count > 0);
  const totalReviews = withData.reduce((n, s) => n + s.count, 0);

  return (
    <section id="user-review-intelligence" aria-label="User review intelligence" className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="flex items-center gap-2 text-2xl font-bold text-navy-900">
            <MessagesSquare className="size-6 text-daikin-600" aria-hidden />
            User review intelligence
          </h2>
          <p className="mt-1.5 max-w-4xl text-base text-navy-500">
            {totalReviews.toLocaleString()} matching customer{" "}
            {totalReviews === 1 ? "review" : "reviews"} from {source.sourceFile}, matched to the selected
            products and always shown with the sample they rest on.
          </p>
        </div>
        {totalReviews > 0 && (
          <Button variant="secondary" onClick={() => onViewReviews()}>
            <ExternalLink aria-hidden />
            View supporting reviews
          </Button>
        )}
      </header>

      <p className="flex items-start gap-2.5 rounded-2xl border border-edge bg-navy-50/70 p-4 text-[0.9375rem] leading-relaxed text-navy-700">
        <Info className="mt-0.5 size-5 shrink-0 text-navy-400" aria-hidden />
        <span>
          <strong>Review-based insight, not verified product fact.</strong> Everything in this section is
          customer opinion. It never feeds the verified-edge calculations on the technical comparison, and it
          is not evidence of energy savings, product life or reliability. The export records no
          verified-purchase status, source platform, helpful votes or sub-ratings, so none are shown.
        </span>
      </p>

      {/* Per-product summary */}
      <div className="grid gap-4 lg:grid-cols-2">
        {summaries.map((s) => (
          <ProductReviewPanel key={s.product.id} summary={s} source={source} onViewReviews={onViewReviews} />
        ))}
      </div>

      {/* Narrative */}
      <div className="rounded-2xl border border-daikin-200 bg-daikin-50/60 p-5">
        <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-daikin-800">Review-based insight <AiTag kind="generated" /></p>
        <p className="mt-2 text-[0.9375rem] leading-relaxed text-navy-800">{narrative}</p>
      </div>

      {/* Insight cards */}
      <div>
        <h3 className="mb-3 text-lg font-semibold text-navy-900">Review insight cards</h3>
        <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {cards.map((card) => (
            <li
              key={card.id}
              className={cn(
                "flex flex-col rounded-2xl border p-5 shadow-card",
                card.product ? "border-edge bg-white" : "border-dashed border-edge bg-navy-50/40",
              )}
            >
              <p className="text-xs font-bold uppercase tracking-wider text-navy-500">{card.title}</p>
              <p className="mt-2 text-lg font-bold leading-tight text-navy-900">
                {card.product ? card.product.displayName : "Not determined"}
              </p>
              <p className="mt-1.5 flex-1 text-sm leading-relaxed text-navy-600">{card.headline}</p>

              <dl className="mt-3 space-y-1 border-t border-edge pt-3 text-sm">
                <div className="flex justify-between gap-3">
                  <dt className="flex items-center gap-1.5 text-navy-500">Supporting theme <AiTag /></dt>
                  <dd className="font-medium text-navy-800">{card.supportingTheme}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-navy-500">Reviews analysed</dt>
                  <dd className="font-medium text-navy-800">{card.reviewCount}</dd>
                </div>
              </dl>

              <div className="mt-3 flex flex-wrap items-center gap-2">
                <MatchLevelBadge matchLevel={card.matchLevel} />
                <ConfidenceBadge confidence={card.confidence} count={card.reviewCount} />
              </div>

              {card.filter && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="mt-3 self-start"
                  onClick={() => onViewReviews(card.filter ?? undefined)}
                >
                  View supporting reviews
                </Button>
              )}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function ProductReviewPanel({
  summary,
  source,
  onViewReviews,
}: {
  summary: ProductReviewSummary;
  source: ReviewSource;
  onViewReviews: (filter?: ReviewDrawerFilter) => void;
}) {
  const s = summary;

  if (s.count === 0) {
    return (
      <div className="surface p-5">
        <div className="flex items-center gap-3">
          <ProductVisual product={s.product} size="sm" />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-navy-500">{s.product.brand}</p>
            <p className="text-lg font-bold text-navy-900">{s.product.model}</p>
          </div>
        </div>
        <div className="mt-4">
          <NoReviewData productName={s.product.displayName} />
        </div>
      </div>
    );
  }

  const topPositive = s.themes.filter((t) => t.total >= MIN_REPORTABLE).slice(0, 4);
  const concerns = s.themes
    .filter((t) => t.neutral + t.negative > 0)
    .sort((a, b) => b.neutral + b.negative - (a.neutral + a.negative))
    .slice(0, 3);

  return (
    <div className="surface p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <ProductVisual product={s.product} size="sm" />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-navy-500">{s.product.brand}</p>
            <p className="text-lg font-bold text-navy-900">{s.product.model}</p>
          </div>
        </div>
        <div className="text-right">
          <StarRating value={s.averageRating} showValue />
          <p className="mt-0.5 text-sm text-navy-500">{s.count} reviews</p>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <MatchLevelBadge matchLevel={s.matchLevel} count={s.count} />
        <ConfidenceBadge confidence={s.confidence} count={s.count} />
        {s.dateRange && (
          <span className="text-xs text-navy-400">
            {s.dateRange.from} → {s.dateRange.to}
          </span>
        )}
      </div>

      {/* Rating distribution */}
      <div className="mt-4 space-y-1">
        {([5, 4, 3, 2, 1] as const).map((star) => {
          const n = s.ratingDistribution[star];
          const pct = s.count ? (n / s.count) * 100 : 0;
          return (
            <div key={star} className="flex items-center gap-2.5">
              <span className="w-8 shrink-0 text-xs font-semibold text-navy-500">{star}★</span>
              <span className="meter-track flex-1">
                <span className="block h-full rounded-full bg-daikin-500" style={{ width: `${pct}%` }} />
              </span>
              <span className="w-10 shrink-0 text-right text-xs text-navy-500">{n}</span>
            </div>
          );
        })}
      </div>

      {/* Sentiment split */}
      <dl className="mt-4 grid grid-cols-3 gap-2 text-center">
        <div className="rounded-xl bg-verified-50 p-2.5">
          <dt className="text-xs font-semibold text-verified-700">Positive</dt>
          <dd className="text-xl font-bold text-navy-900">{s.positivePct}%</dd>
        </div>
        <div className="rounded-xl bg-caution-50 p-2.5">
          <dt className="text-xs font-semibold text-caution-700">Neutral</dt>
          <dd className="text-xl font-bold text-navy-900">{s.neutralPct}%</dd>
        </div>
        <div className="rounded-xl bg-risk-50 p-2.5">
          <dt className="text-xs font-semibold text-risk-700">Negative</dt>
          <dd className="text-xl font-bold text-navy-900">{s.negativePct}%</dd>
        </div>
      </dl>

      {/* What the feedback is about */}
      <div className="mt-4">
        <p className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-navy-400">
          What the feedback is about <AiTag />
        </p>
        <ul className="flex flex-wrap gap-2">
          {s.subjects
            .filter((sub) => sub.total > 0)
            .map((sub) => {
              const Icon = SUBJECT_ICON[sub.key] ?? Cpu;
              return (
                <li key={sub.key}>
                  <button
                    type="button"
                    onClick={() => onViewReviews({ productId: s.product.id })}
                    className="flex min-h-[36px] items-center gap-1.5 rounded-full border border-edge px-3 text-sm text-navy-700 transition-colors hover:border-daikin-300 hover:bg-daikin-50"
                  >
                    <Icon className="size-3.5 text-navy-400" aria-hidden />
                    {sub.label}
                    <span className="font-semibold text-navy-900">{sub.total}</span>
                  </button>
                </li>
              );
            })}
        </ul>
        <p className="mt-2 text-xs leading-relaxed text-navy-500">
          {s.nonEquipmentConcerns.length} of the {s.sentimentCounts.neutral + s.sentimentCounts.negative}{" "}
          critical reviews concern installation, dealer or service rather than the equipment itself.
        </p>
      </div>

      {/* Themes */}
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div>
          <p className="mb-1.5 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-verified-700">
            Most mentioned <AiTag />
          </p>
          <ul className="space-y-1">
            {topPositive.map((t) => (
              <li key={t.key} className="flex items-baseline justify-between gap-2 text-sm">
                <span className="text-navy-700">{t.label}</span>
                <span className="font-semibold text-navy-900">
                  {Math.round((t.positive / t.total) * 100)}%{" "}
                  <span className="font-normal text-navy-400">of {t.total}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p className="mb-1.5 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-caution-700">
            Recurring concerns <AiTag />
          </p>
          {concerns.length ? (
            <ul className="space-y-1">
              {concerns.map((t) => (
                <li key={t.key} className="flex items-baseline justify-between gap-2 text-sm">
                  <span className="text-navy-700">{t.label}</span>
                  <span className="font-semibold text-navy-900">{t.neutral + t.negative}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-navy-400">No critical reviews in the matched sample.</p>
          )}
        </div>
      </div>

      <Button variant="ghost" size="sm" className="mt-3" onClick={() => onViewReviews({ productId: s.product.id })}>
        View {s.count} reviews
      </Button>

      <p className="mt-2 text-xs leading-relaxed text-navy-400">
        {s.matchNote} Source: {source.sourceFile}.
      </p>
    </div>
  );
}

export function ReviewAnalyticalCharts({
  products,
  source,
  onViewReviews,
}: {
  products: Product[];
  source: ReviewSource;
  onViewReviews: (filter?: ReviewDrawerFilter) => void;
}) {
  const summaries = React.useMemo(() => summarizeSelection(source, products), [source, products]);
  const withData = summaries.filter((s) => s.count > 0);

  if (!withData.length) {
    return (
      <section aria-label="Review analytical charts" className="space-y-4">
        <h2 className="text-2xl font-bold text-navy-900">Review analytical charts</h2>
        <NoReviewData />
      </section>
    );
  }

  return (
    <section aria-label="Review analytical charts" className="space-y-4">
      <header>
        <h2 className="text-2xl font-bold text-navy-900">Review analytical charts</h2>
        <p className="mt-1.5 max-w-4xl text-base text-navy-500">
          Charts appear only where the matched sample is large enough to mean something. Every one carries
          its review count and match level.
        </p>
      </header>

      <div className="grid gap-6 xl:grid-cols-2">
        <AverageRatingChart summaries={summaries} source={source} />
        <RatingDistributionChart summaries={summaries} source={source} />
        <SentimentComparisonChart summaries={summaries} source={source} />
        <ThemeComparisonChart summaries={summaries} source={source} />
        <ReviewTrendChart summaries={summaries} source={source} />
        <StrengthsConcernsChart
          summaries={summaries}
          source={source}
          onViewReviews={(f) => onViewReviews(f)}
        />
      </div>

      <p className="rounded-xl border border-edge bg-navy-50/60 p-4 text-sm leading-relaxed text-navy-600">
        <Badge variant="caution" size="sm" className="mr-2">
          Review disclaimer
        </Badge>
        Customer reviews reflect individual experiences and may relate to equipment, installation, contractor
        service, home conditions, climate, maintenance, or personal expectations. Reviews are not guarantees
        of future performance.
      </p>
    </section>
  );
}
