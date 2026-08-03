import * as React from "react";
import {
  Check,
  Minus,
  X,
  HelpCircle,
  Star,
  ShieldCheck,
  MessageSquareQuote,
  Info,
  ChevronRight,
  Quote,
} from "lucide-react";
import { cn, formatDate } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { ProductVisual } from "@/components/common/ProductVisual";
import type { Product } from "@/data/types";
import { ATTRIBUTE_BY_KEY } from "@/data/catalog";
import { brochureFeaturesFor } from "@/data/a2w-brochure-features";
import type { ReviewSource } from "@/data/review-types";
import type { ComparisonResult } from "@/features/compare/engine";
import {
  MIN_REPORTABLE,
  representativeReviews,
  summarizeReviews,
  type ProductReviewSummary,
} from "@/features/reviews/reviewEngine";
import { StarRating, MatchLevelBadge, ReviewCard, NoReviewData } from "@/features/reviews/ReviewPrimitives";
import { AiTag } from "@/components/common/AiTag";
import {
  BENEFIT_TRANSLATION,
  STATUS_LABEL,
  alignPriorities,
  buildRecommendationReasons,
  compareCategories,
  PRIORITY_BY_KEY,
  type ComparisonStatus,
} from "./homeownerEngine";
import type { HomeownerReportConfig } from "./HomeownerProvider";

export const HOMEOWNER_DISCLAIMER =
  "This comparison is based on product information and customer-review data available in the referenced sources. Actual performance, efficiency, comfort, sound, operating costs, and customer experience may vary based on equipment matchup, system sizing, installation quality, home characteristics, climate, thermostat settings, maintenance, contractor service, and usage. Product specifications and warranty terms should be confirmed before purchase.";

export const REVIEW_DISCLAIMER =
  "Customer reviews reflect individual experiences and may relate to equipment, installation, contractor service, home conditions, climate, maintenance, or personal expectations. Reviews are not guarantees of future performance.";

export const AI_DISCLAIMER =
  "AI-assisted summary generated from the available product comparison and review data.";

/* ------------------------------------------------------------------ */

const STATUS_STYLE: Record<
  ComparisonStatus,
  { icon: React.ComponentType<{ className?: string }>; chip: string; iconColor: string }
> = {
  daikin_advantage: {
    icon: Check,
    chip: "bg-verified-50 text-verified-700 ring-verified-500/25",
    iconColor: "text-verified-600",
  },
  comparable: { icon: Minus, chip: "bg-navy-100 text-navy-700 ring-navy-200", iconColor: "text-navy-500" },
  competitor_advantage: {
    icon: X,
    chip: "bg-caution-50 text-caution-800 ring-caution-500/25",
    iconColor: "text-caution-600",
  },
  unavailable: {
    icon: HelpCircle,
    chip: "bg-white text-navy-500 ring-edge",
    iconColor: "text-navy-400",
  },
};

export function StatusChip({ status }: { status: ComparisonStatus }) {
  const s = STATUS_STYLE[status];
  const Icon = s.icon;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1.5 text-sm font-bold ring-1 ring-inset",
        s.chip,
      )}
    >
      <Icon className="size-4" aria-hidden />
      {STATUS_LABEL[status]}
    </span>
  );
}

export function SectionShell({
  eyebrow,
  title,
  intro,
  children,
  className,
}: {
  eyebrow?: string;
  title: string;
  intro?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("space-y-5", className)} aria-label={title}>
      <header>
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h2 className="mt-2 text-balance text-2xl font-bold leading-tight text-navy-900 sm:text-3xl">
          {title}
        </h2>
        {intro && <p className="mt-3 max-w-3xl text-[1.0625rem] leading-relaxed text-navy-600">{intro}</p>}
      </header>
      {children}
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* 1. Cover                                                            */
/* ------------------------------------------------------------------ */

export function ReportCover({
  config,
  recommended,
  tons,
}: {
  config: HomeownerReportConfig;
  recommended: Product | null;
  tons: number | undefined;
}) {
  return (
    <section
      aria-label="Your home comfort comparison"
      className="overflow-hidden rounded-3xl border border-daikin-200 bg-gradient-to-br from-daikin-50 via-white to-white shadow-card"
    >
      <div className="grid gap-8 p-8 sm:p-12 lg:grid-cols-[1.3fr_1fr] lg:items-center">
        <div>
          <img src="/brand/daikin-logo.png" alt="Daikin" className="h-9 w-auto" />

          <h1 className="mt-8 text-balance text-4xl font-bold leading-[1.1] text-navy-900 sm:text-5xl">
            Your Home Comfort Comparison
          </h1>
          <p className="mt-4 max-w-xl text-lg leading-relaxed text-navy-600">
            A clear comparison designed around your comfort, efficiency, and long-term peace of mind.
          </p>

          {config.homeownerName && (
            <p className="mt-6 text-xl font-semibold text-navy-900">
              Prepared for {config.homeownerName}
            </p>
          )}

          <dl className="mt-6 grid gap-x-8 gap-y-3 text-[0.9375rem] sm:grid-cols-2">
            {recommended && (
              <div>
                <dt className="font-semibold text-navy-500">Recommended system</dt>
                <dd className="text-navy-900">
                  {recommended.brand} {recommended.model}
                  {/* Air-to-water models are sized by rated capacity, not tonnage. */}
                  {tons
                    ? ` — ${tons} Ton`
                    : recommended.capacities
                      ? ` — ${recommended.capacities.map((c) => `${c} kBtu/h`).join(", ")}`
                      : ""}
                </dd>
              </div>
            )}
            {config.location && (
              <div>
                <dt className="font-semibold text-navy-500">Location</dt>
                <dd className="text-navy-900">{config.location}</dd>
              </div>
            )}
            {config.dealerName && (
              <div>
                <dt className="font-semibold text-navy-500">Prepared by</dt>
                <dd className="text-navy-900">{config.dealerName}</dd>
              </div>
            )}
            {config.repName && (
              <div>
                <dt className="font-semibold text-navy-500">Your representative</dt>
                <dd className="text-navy-900">{config.repName}</dd>
              </div>
            )}
            <div>
              <dt className="font-semibold text-navy-500">Report date</dt>
              <dd className="text-navy-900">
                {formatDate(config.generatedAt ?? new Date().toISOString())}
              </dd>
            </div>
          </dl>

          {config.personalNote && (
            <div className="mt-7 rounded-2xl border border-daikin-200 bg-white p-5">
              <p className="text-xs font-bold uppercase tracking-wider text-daikin-700">
                A note from your representative
              </p>
              <p className="mt-2 whitespace-pre-line text-[1.0625rem] leading-relaxed text-navy-700">
                {config.personalNote}
              </p>
            </div>
          )}
        </div>

        {recommended && (
          <div className="flex justify-center">
            <div className="w-full max-w-sm rounded-3xl surface p-6 shadow-lift">
              <ProductVisual product={recommended} size="xl" className="w-full" />
              <p className="mt-4 text-sm font-semibold text-navy-500">{recommended.brand}</p>
              <p className="text-2xl font-bold text-navy-900">{recommended.model}</p>
              {tons && <p className="mt-1 text-lg text-daikin-700">{tons} Ton</p>}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* 2. Recommendation                                                   */
/* ------------------------------------------------------------------ */

export function RecommendationSection({
  recommended,
  tons,
  reasons,
  priorities,
}: {
  recommended: Product;
  tons: number | undefined;
  reasons: ReturnType<typeof buildRecommendationReasons>;
  priorities: string[];
}) {
  const priorityLabels = priorities.map((k) => PRIORITY_BY_KEY[k]?.label).filter(Boolean);

  return (
    <SectionShell eyebrow="Our recommendation" title="Recommended for your home">
      <div className="rounded-3xl border-2 border-daikin-300 bg-daikin-50/50 p-6 shadow-card sm:p-8">
        <div className="flex flex-wrap items-start gap-6">
          <ProductVisual product={recommended} size="lg" />
          <div className="min-w-[14rem] flex-1">
            <p className="text-base font-semibold text-navy-500">{recommended.brand}</p>
            <p className="text-3xl font-bold text-navy-900">
              {recommended.model}
              {tons ? ` — ${tons} Ton` : ""}
            </p>
            {priorityLabels.length > 0 && (
              <p className="mt-3 text-[1.0625rem] leading-relaxed text-navy-700">
                A strong fit for what you told us matters most:{" "}
                <strong>{priorityLabels.join(", ").toLowerCase()}</strong>.
              </p>
            )}
          </div>
        </div>

        {reasons.length > 0 && (
          <>
            <p className="mt-7 flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-daikin-800">
              Why it stands out <AiTag kind="generated" />
            </p>
            <ul className="mt-3 grid gap-3 sm:grid-cols-2">
              {reasons.map((r) => (
                <li key={r.title} className="rounded-2xl bg-white p-4 shadow-sm">
                  <p className="flex items-start gap-2 text-[1.0625rem] font-bold text-navy-900">
                    <Check className="mt-1 size-5 shrink-0 text-verified-600" aria-hidden />
                    {r.title}
                  </p>
                  <p className="mt-1.5 pl-7 text-[0.9375rem] leading-relaxed text-navy-600">{r.body}</p>
                  <p className="mt-2 pl-7 text-xs font-medium text-navy-400">
                    {r.basis === "verified_and_reviews"
                      ? "Based on product information and customer-review themes"
                      : "Based on verified product information"}
                  </p>
                </li>
              ))}
            </ul>
          </>
        )}

        {reasons.length === 0 && (
          <p className="mt-6 rounded-2xl bg-white p-5 text-[1.0625rem] leading-relaxed text-navy-600">
            On the attributes recorded for both this system and the compared products, no clear advantage
            stands out. That is worth knowing — it means the decision may come down to installation quality,
            pricing and service rather than the specification sheet.
          </p>
        )}
      </div>
    </SectionShell>
  );
}

/* ------------------------------------------------------------------ */
/* 3. Why this system fits — priority alignment                        */
/* ------------------------------------------------------------------ */

export function PriorityFitSection({
  alignments,
}: {
  alignments: ReturnType<typeof alignPriorities>;
}) {
  if (!alignments.length) {
    return (
      <SectionShell
        eyebrow="Your priorities"
        title="Why this Daikin system fits your home"
        intro="No priorities were selected, so this section has nothing to align against. Add priorities when creating the report to see how the system matches them."
      />
    );
  }

  return (
    <SectionShell
      eyebrow="Your priorities"
      title="Why this Daikin system fits your home"
      intro="For each thing you told us matters, here is what the published product information says, what other homeowners report, and how the two read together."
    >
      <ul className="space-y-4">
        {alignments.map((a) => (
          <li key={a.priority.key} className="surface p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h3 className="text-xl font-bold text-navy-900">{a.priority.label}</h3>
              <StatusChip status={a.technical.status} />
            </div>

            <dl className="mt-4 space-y-3">
              <div>
                <dt className="text-xs font-bold uppercase tracking-wider text-navy-400">
                  What the product information says
                </dt>
                <dd className="mt-1 text-[1.0625rem] leading-relaxed text-navy-700">
                  {a.technical.statement}
                </dd>
              </div>

              {a.review && (
                <div>
                  <dt className="text-xs font-bold uppercase tracking-wider text-navy-400">
                    What homeowners report
                  </dt>
                  <dd className="mt-1 text-[1.0625rem] leading-relaxed text-navy-700">
                    {a.review.statement}
                  </dd>
                </div>
              )}

              <div className="rounded-xl bg-daikin-50/70 p-4">
                <dt className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-daikin-800">
                  Reading them together <AiTag kind="generated" />
                </dt>
                <dd className="mt-1 text-[1.0625rem] leading-relaxed text-navy-800">{a.interpretation}</dd>
              </div>
            </dl>
          </li>
        ))}
      </ul>
    </SectionShell>
  );
}

/* ------------------------------------------------------------------ */
/* 4. Simple comparison                                                */
/* ------------------------------------------------------------------ */

export function SimpleComparisonSection({
  daikin,
  competitors,
  onViewTechnical,
}: {
  daikin: Product;
  competitors: Product[];
  onViewTechnical?: () => void;
}) {
  const primary = competitors[0];
  if (!primary) return null;

  const [activeCompetitor, setActiveCompetitor] = React.useState(primary.id);
  const competitor = competitors.find((c) => c.id === activeCompetitor) ?? primary;
  const rows = React.useMemo(() => compareCategories(daikin, competitor), [daikin, competitor]);

  return (
    <SectionShell
      eyebrow="Side by side"
      title="A simple comparison"
      intro="The categories most people care about, in plain language. Where a manufacturer does not publish a figure, it is shown as unavailable rather than counted against them."
    >
      {competitors.length > 1 && (
        <div className="flex flex-wrap gap-2" role="group" aria-label="Choose a product to compare against">
          {competitors.map((c) => (
            <button
              key={c.id}
              type="button"
              aria-pressed={c.id === competitor.id}
              onClick={() => setActiveCompetitor(c.id)}
              className={cn(
                "min-h-[44px] rounded-xl border px-4 text-[0.9375rem] font-semibold transition-colors",
                c.id === competitor.id
                  ? "border-daikin-600 bg-daikin-600 text-white"
                  : "border-edge bg-white text-navy-600 hover:border-daikin-300",
              )}
            >
              vs {c.brand} {c.model}
            </button>
          ))}
        </div>
      )}

      <ul className="space-y-3">
        {rows.map((row) => (
          <li key={row.category.key} className="surface p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="text-lg font-bold text-navy-900">{row.category.label}</h3>
                <p className="mt-0.5 text-sm text-navy-500">{row.category.question}</p>
              </div>
              <StatusChip status={row.status} />
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-daikin-200 bg-daikin-50/50 p-3.5">
                <p className="text-xs font-bold uppercase tracking-wider text-daikin-800">
                  {daikin.brand} {daikin.model}
                </p>
                <p className="mt-1 text-[1.0625rem] font-semibold text-navy-900">
                  {row.daikinValue?.status === "verified" ? row.daikinValue.display : "Not published"}
                </p>
              </div>
              <div className="rounded-xl border border-edge bg-navy-50/60 p-3.5">
                <p className="text-xs font-bold uppercase tracking-wider text-navy-500">
                  {competitor.brand} {competitor.model}
                </p>
                <p className="mt-1 text-[1.0625rem] font-semibold text-navy-900">
                  {row.competitorValue?.status === "verified" ? row.competitorValue.display : "Not published"}
                </p>
              </div>
            </div>

            <p className="mt-3 text-[0.9375rem] leading-relaxed text-navy-700">{row.explanation}</p>
            {row.benefit && (
              <p className="mt-2 rounded-xl bg-navy-50/70 p-3.5 text-[0.9375rem] leading-relaxed text-navy-600">
                <strong className="text-navy-800">What this means for you <AiTag kind="generated" className="mx-1 align-middle" />: </strong>
                {row.benefit}
              </p>
            )}
          </li>
        ))}
      </ul>

      {onViewTechnical && (
        <button
          type="button"
          onClick={onViewTechnical}
          className="no-print inline-flex min-h-[44px] items-center gap-1.5 text-[0.9375rem] font-semibold text-daikin-700 hover:text-daikin-800"
        >
          View technical details
          <ChevronRight className="size-4" aria-hidden />
        </button>
      )}
    </SectionShell>
  );
}

/* ------------------------------------------------------------------ */
/* 5. Comfort and lifestyle benefits                                   */
/* ------------------------------------------------------------------ */

export function ComfortBenefitsSection({ daikin }: { daikin: Product }) {
  const benefits = Object.entries(BENEFIT_TRANSLATION)
    .filter(([key]) => {
      const v = daikin.attributes[key];
      if (v?.status !== "verified") return false;
      if (v.boolean === false) return false;
      return true;
    })
    .slice(0, 8)
    .map(([key, benefit]) => ({
      key,
      benefit,
      value: daikin.attributes[key],
    }));

  if (!benefits.length) return null;

  return (
    <SectionShell
      eyebrow="Day to day"
      title="Comfort and lifestyle benefits"
      intro="What each published capability actually means once the system is running in your home."
    >
      <ul className="grid gap-4 sm:grid-cols-2">
        {benefits.map((b) => (
          <li key={b.key} className="surface p-5">
            {/* Lead with what the capability is; the recorded value is supporting
                detail. Showing the bare value read as a meaningless number. */}
            <p className="flex items-center justify-between gap-2 text-sm font-semibold text-daikin-700">
              {ATTRIBUTE_BY_KEY[b.key]?.label ?? b.key}
              <AiTag kind="generated" />
            </p>
            <p className="mt-1 text-sm font-medium text-navy-500">
              {b.value.display}
              {b.value.unit && !b.value.display.includes(b.value.unit) ? ` ${b.value.unit}` : ""}
            </p>
            <p className="mt-2 text-[1.0625rem] leading-relaxed text-navy-700">{b.benefit}</p>
          </li>
        ))}
      </ul>
    </SectionShell>
  );
}

/* ------------------------------------------------------------------ */
/* 5b. Published capabilities from the consumer brochure               */
/* ------------------------------------------------------------------ */

/** Installation flexibility, smart controls and quiet operation for air-to-water
 *  products. The comparison spreadsheet has no column for any of these, so the
 *  claims come from the brand's own consumer brochure and are cited to it. */
export function BrochureCapabilitiesSection({ daikin }: { daikin: Product }) {
  const brochure = brochureFeaturesFor(daikin);
  if (!brochure) return null;

  const groups = [
    { label: "Quiet operation", features: brochure.quiet },
    { label: "Installation flexibility", features: brochure.installation },
    { label: "Smart controls", features: brochure.smartControls },
  ].filter((g) => g.features.length);

  if (!groups.length) return null;

  return (
    <SectionShell
      eyebrow="Published capabilities"
      title="How it installs, how it is controlled, how quiet it is"
      intro="These come from the manufacturer's consumer brochure rather than the specification comparison, so they describe what this system offers rather than ranking it against another product."
    >
      <div className="space-y-5">
        {groups.map((group) => (
          <div key={group.label}>
            <h3 className="text-lg font-bold text-navy-900">{group.label}</h3>
            <ul className="mt-2.5 grid gap-3 sm:grid-cols-2">
              {group.features.map((f) => (
                <li key={f.label} className="surface p-5">
                  <p className="text-sm font-semibold text-daikin-700">{f.label}</p>
                  <p className="mt-1.5 text-[1.0625rem] leading-relaxed text-navy-700">{f.detail}</p>
                  <p className="mt-2 text-xs text-navy-400">
                    {brochure.documentLabel} · p.{f.page}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </SectionShell>
  );
}

/* ------------------------------------------------------------------ */
/* 6. What homeowners are saying                                       */
/* ------------------------------------------------------------------ */

export function HomeownerReviewsSection({
  source,
  summaries,
  narrative,
  showExcerpts,
  showThemes,
  showConcerns,
  onViewMore,
}: {
  source: ReviewSource;
  summaries: ProductReviewSummary[];
  narrative: string;
  showExcerpts: boolean;
  showThemes: boolean;
  showConcerns: boolean;
  onViewMore?: () => void;
}) {
  const themeLabels = React.useMemo(
    () => Object.fromEntries(source.themeDefinitions.map((d) => [d.key, d.label])),
    [source],
  );

  const withData = summaries.filter((s) => s.count > 0);

  return (
    <SectionShell
      eyebrow="Real experiences"
      title="What homeowners are saying"
      intro="Customer reviews for the products in this comparison, shown exactly as they were written — including the critical ones."
    >
      {withData.length === 0 ? (
        <NoReviewData />
      ) : (
        <>
          <div className="rounded-2xl border border-daikin-200 bg-daikin-50/60 p-5">
            <p className="mb-2"><AiTag kind="generated" /></p>
            <p className="text-[1.0625rem] leading-relaxed text-navy-800">{narrative}</p>
          </div>

          <ul className="grid gap-4 lg:grid-cols-2">
            {summaries.map((s) => (
              <li key={s.product.id} className="surface p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <ProductVisual product={s.product} size="sm" />
                    <div>
                      <p className="text-sm font-semibold text-navy-500">{s.product.brand}</p>
                      <p className="text-lg font-bold text-navy-900">{s.product.model}</p>
                    </div>
                  </div>
                  {s.count > 0 && (
                    <div className="text-right">
                      <StarRating value={s.averageRating} showValue />
                      <p className="mt-0.5 text-sm text-navy-500">
                        {s.count} {s.count === 1 ? "review" : "reviews"}
                      </p>
                    </div>
                  )}
                </div>

                {s.count === 0 ? (
                  <p className="mt-4 rounded-xl bg-navy-50 p-4 text-[0.9375rem] text-navy-600">
                    No approved user-review data available for this product.
                  </p>
                ) : (
                  <>
                    <div className="mt-3">
                      <MatchLevelBadge matchLevel={s.matchLevel} count={s.count} />
                    </div>

                    {showThemes && (
                      <div className="mt-4">
                        <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-verified-700">
                          Most often mentioned <AiTag />
                        </p>
                        <ul className="mt-2 flex flex-wrap gap-2">
                          {s.themes
                            .filter((t) => t.total >= MIN_REPORTABLE)
                            .slice(0, 5)
                            .map((t) => (
                              <li
                                key={t.key}
                                className="rounded-full bg-verified-50 px-3 py-1.5 text-sm font-medium text-verified-700 ring-1 ring-inset ring-verified-500/20"
                              >
                                {t.label}
                                <span className="ml-1.5 font-bold">{t.total}</span>
                              </li>
                            ))}
                        </ul>
                      </div>
                    )}

                    {showConcerns && (
                      <div className="mt-4">
                        <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-caution-700">
                          Common concerns <AiTag />
                        </p>
                        {s.sentimentCounts.neutral + s.sentimentCounts.negative > 0 ? (
                          <>
                            <ul className="mt-2 flex flex-wrap gap-2">
                              {s.themes
                                .filter((t) => t.neutral + t.negative > 0)
                                .sort((a, b) => b.neutral + b.negative - (a.neutral + a.negative))
                                .slice(0, 4)
                                .map((t) => (
                                  <li
                                    key={t.key}
                                    className="rounded-full bg-caution-50 px-3 py-1.5 text-sm font-medium text-caution-800 ring-1 ring-inset ring-caution-500/20"
                                  >
                                    {t.label}
                                    <span className="ml-1.5 font-bold">{t.neutral + t.negative}</span>
                                  </li>
                                ))}
                            </ul>
                            {s.nonEquipmentConcerns.length > 0 && (
                              <p className="mt-2 text-sm leading-relaxed text-navy-600">
                                {s.nonEquipmentConcerns.length} of these relate to installation, dealer or
                                service experience rather than the equipment itself, and those can vary by
                                contractor.
                              </p>
                            )}
                          </>
                        ) : (
                          <p className="mt-2 text-sm text-navy-500">
                            No critical reviews in the matched sample.
                          </p>
                        )}
                      </div>
                    )}

                    <p className="mt-4 text-xs leading-relaxed text-navy-400">
                      {s.matchNote} Source: {source.sourceFile}.
                    </p>
                  </>
                )}
              </li>
            ))}
          </ul>

          {showExcerpts && withData.length > 0 && (
            <div>
              <h3 className="flex items-center gap-2 text-lg font-bold text-navy-900">
                <Quote className="size-5 text-daikin-600" aria-hidden />
                In their own words
              </h3>
              <p className="mt-1 text-[0.9375rem] text-navy-500">
                A balanced selection — positive, mixed and critical. Nothing is edited, shortened or merged.
              </p>
              <div className="mt-4 grid gap-3 lg:grid-cols-2">
                {withData
                  .flatMap((s) =>
                    representativeReviews(s).map((r) => ({ review: r, matchLevel: s.matchLevel })),
                  )
                  .slice(0, 4)
                  .map(({ review, matchLevel }) => (
                    <ReviewCard
                      key={review.id}
                      review={review}
                      matchLevel={matchLevel}
                      themeLabels={themeLabels}
                      showSubjects={false}
                      compact
                    />
                  ))}
              </div>
              {onViewMore && (
                <button
                  type="button"
                  onClick={onViewMore}
                  className="no-print mt-4 inline-flex min-h-[44px] items-center gap-1.5 text-[0.9375rem] font-semibold text-daikin-700 hover:text-daikin-800"
                >
                  View more reviews
                  <ChevronRight className="size-4" aria-hidden />
                </button>
              )}
            </div>
          )}
        </>
      )}
    </SectionShell>
  );
}

/* ------------------------------------------------------------------ */
/* 11. Important differences                                           */
/* ------------------------------------------------------------------ */

export function ImportantDifferencesSection({
  result,
  daikin,
  competitors,
  summaries,
}: {
  result: ComparisonResult;
  daikin: Product;
  competitors: Product[];
  summaries: ProductReviewSummary[];
}) {
  const gaps = result.gaps.filter((g) => g.kind === "leads");
  const parity = result.gaps.filter((g) => g.kind === "parity");
  const comparable = React.useMemo(() => {
    const primary = competitors[0];
    if (!primary) return [];
    return compareCategories(daikin, primary).filter((c) => c.status === "comparable");
  }, [daikin, competitors]);

  const unavailable = React.useMemo(() => {
    const primary = competitors[0];
    if (!primary) return [];
    return compareCategories(daikin, primary).filter((c) => c.status === "unavailable");
  }, [daikin, competitors]);

  const reviewGap = summaries.filter((s) => s.count === 0);
  const daikinSummary = summaries.find((s) => s.product.id === daikin.id);
  const equipmentConcerns = daikinSummary?.equipmentConcerns ?? [];

  return (
    <SectionShell
      eyebrow="Full picture"
      title="Important differences to consider"
      intro="A comparison is only useful if it is honest. These are the places where the compared product leads, where the two are alike, and where nobody publishes an answer."
    >
      <div className="space-y-4">
        {gaps.length > 0 && (
          <div className="rounded-2xl border border-caution-500/25 bg-caution-50/60 p-5">
            <h3 className="text-lg font-bold text-navy-900">Where the compared product leads</h3>
            <ul className="mt-3 space-y-3">
              {gaps.map((g) => (
                <li key={g.id} className="rounded-xl bg-white p-4">
                  <p className="font-bold text-navy-900">{g.attributeLabel}</p>
                  <p className="mt-1 text-[0.9375rem] leading-relaxed text-navy-700">
                    {g.headline}
                    {g.marginLabel ? ` That is ${g.marginLabel}.` : ""}
                  </p>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-[0.9375rem] leading-relaxed text-navy-700">
              Worth weighing against the areas where the Daikin system holds a verified advantage — no single
              rating decides which system suits a home.
            </p>
          </div>
        )}

        {comparable.length > 0 && (
          <div className="surface p-5">
            <h3 className="text-lg font-bold text-navy-900">Where the products are alike</h3>
            <p className="mt-2 text-[0.9375rem] leading-relaxed text-navy-600">
              {comparable.map((c) => c.category.label).join(", ")} — the published figures are the same or
              close enough that they are unlikely to be the deciding factor.
            </p>
            {parity.length > 0 && (
              <ul className="mt-3 space-y-1.5">
                {parity.map((g) => (
                  <li key={g.id} className="text-[0.9375rem] leading-relaxed text-navy-600">
                    <strong className="text-navy-800">{g.attributeLabel}:</strong> {g.headline}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {unavailable.length > 0 && (
          <div className="surface p-5">
            <h3 className="text-lg font-bold text-navy-900">Where information is not published</h3>
            <p className="mt-2 text-[0.9375rem] leading-relaxed text-navy-600">
              {unavailable.map((c) => c.category.label).join(", ")} — one or both manufacturers do not
              publish a comparable figure. That is an absence of information, not a shortcoming.
            </p>
          </div>
        )}

        {reviewGap.length > 0 && (
          <div className="surface p-5">
            <h3 className="text-lg font-bold text-navy-900">Review coverage is uneven</h3>
            <p className="mt-2 text-[0.9375rem] leading-relaxed text-navy-600">
              There is no approved customer-review data for{" "}
              {reviewGap.map((s) => `${s.product.brand} ${s.product.model}`).join(", ")}. Ratings can
              therefore only be shown for part of this comparison, and a product without reviews should not
              be read as a product without satisfied owners.
            </p>
          </div>
        )}

        {equipmentConcerns.length > 0 && (
          <div className="surface p-5">
            <h3 className="text-lg font-bold text-navy-900">
              What some Daikin owners have raised
            </h3>
            <p className="mt-2 text-[0.9375rem] leading-relaxed text-navy-600">
              {equipmentConcerns.length} of the matching reviews raise a concern about the equipment itself
              rather than the install or the dealer. These are shown in full in the review section rather
              than filtered out.
            </p>
          </div>
        )}

        <div className="rounded-2xl border border-edge bg-navy-50/70 p-5">
          <h3 className="text-lg font-bold text-navy-900">What else affects the outcome</h3>
          <p className="mt-2 text-[0.9375rem] leading-relaxed text-navy-600">
            Published specifications describe equipment tested under standard conditions. What you actually
            experience also depends on how the system is sized for your home, the quality of the
            installation, your ductwork, insulation, climate, thermostat settings, maintenance and how you
            use it. Two identical systems in two different homes can perform very differently.
          </p>
        </div>
      </div>
    </SectionShell>
  );
}

/* ------------------------------------------------------------------ */
/* 12. FAQ                                                             */
/* ------------------------------------------------------------------ */

export function FaqSection({
  daikin,
  competitors,
  summaries,
  result,
}: {
  daikin: Product;
  competitors: Product[];
  summaries: ProductReviewSummary[];
  result: ComparisonResult;
}) {
  const daikinSummary = summaries.find((s) => s.product.id === daikin.id);
  const faqs = buildFaqs(daikin, competitors, daikinSummary, result);

  return (
    <SectionShell
      eyebrow="Common questions"
      title="Frequently asked questions"
      intro={
        <>
          Straight answers drawn from the same product information and reviews used throughout this report.{" "}
          <AiTag kind="generated" className="align-middle" />
        </>
      }
    >
      <ul className="space-y-3">
        {faqs.map((f) => (
          <li key={f.q} className="surface">
            <details className="group">
              <summary className="flex cursor-pointer items-center justify-between gap-4 p-5 text-[1.0625rem] font-bold text-navy-900">
                {f.q}
                <ChevronRight
                  className="size-5 shrink-0 text-navy-400 transition-transform group-open:rotate-90"
                  aria-hidden
                />
              </summary>
              <div className="px-5 pb-5">
                <p className="text-[1.0625rem] leading-relaxed text-navy-700">{f.a}</p>
              </div>
            </details>
          </li>
        ))}
      </ul>
    </SectionShell>
  );
}

function buildFaqs(
  daikin: Product,
  competitors: Product[],
  summary: ProductReviewSummary | undefined,
  result: ComparisonResult,
): { q: string; a: string }[] {
  const faqs: { q: string; a: string }[] = [];
  const attr = (k: string) => {
    const v = daikin.attributes[k];
    return v?.status === "verified" ? v.display : null;
  };

  const compressor = attr("compressor_type");
  if (compressor) {
    faqs.push({
      q: "Why is variable-speed operation important?",
      a: `${daikin.model} lists a ${compressor.toLowerCase()} compressor. ${BENEFIT_TRANSLATION.compressor_type} A single-speed system only has full-on and off, which is why older systems can feel like they swing between too cold and too warm.`,
    });
  }

  const sound = attr("sound_level");
  if (sound) {
    const quieter = result.edges.find((e) => e.attributeKey === "sound_level");
    const reviewMentions = summary?.themes.find((t) => t.key === "quietness");
    faqs.push({
      q: "Will this system be quieter?",
      a: `The published sound level for ${daikin.model} is ${sound}.${
        quieter ? ` That is lower than every compared product with a published figure.` : ""
      }${
        reviewMentions && reviewMentions.total >= MIN_REPORTABLE
          ? ` Quiet operation is also mentioned in ${reviewMentions.total} matching customer reviews, ${reviewMentions.positive} of them from customers who rated the product four or five stars.`
          : ""
      } How loud it actually seems to you depends on where the unit is placed and what surrounds it.`,
    });
  }

  const warranty = attr("warranty");
  if (warranty) {
    faqs.push({
      q: "How does the warranty compare?",
      a: `${daikin.model} lists ${warranty}. ${competitors
        .map((c) => {
          const v = c.attributes.warranty;
          return v?.status === "verified" ? `${c.model} lists ${v.display}` : `${c.model} has no published figure`;
        })
        .join("; ")}. Ask what the remedy is, not only the term — a compressor warranty pays for a compressor, a replacement warranty replaces the unit. Eligibility may depend on registration, installation, location and applicable warranty terms.`,
    });
  }

  const seer = attr("seer2");
  if (seer) {
    faqs.push({
      q: "What do the efficiency ratings mean?",
      a: `SEER2 is a seasonal cooling efficiency rating measured under standardised laboratory conditions — ${daikin.model} is rated at ${seer}. A higher number may indicate lower energy use for the same cooling, but it is not a prediction of your bill. Your actual costs depend on your climate, home, system sizing, installation and how you use it.`,
    });
  }

  const humidity = attr("humidity_control");
  if (humidity) {
    faqs.push({
      q: "How can this system help manage humidity?",
      a: `${daikin.model} lists humidity control as ${humidity.toLowerCase()}. ${BENEFIT_TRANSLATION.humidity_control} It works by running the compressor while keeping indoor airflow low, so the coil pulls moisture out of the air rather than simply dropping the temperature.`,
    });
  }

  const heating = attr("heating_range");
  if (heating) {
    faqs.push({
      q: "Can this system provide heat in colder weather?",
      a: `The published heating operating range for ${daikin.model} is ${heating}. ${BENEFIT_TRANSLATION.heating_range} Heating output falls as the outdoor temperature drops, so a correctly sized system and a sensible backup-heat setup matter as much as the range itself.`,
    });
  }

  const thermostat = attr("thermostat_type");
  if (thermostat) {
    faqs.push({
      q: "Does it work with a smart thermostat?",
      a: `${daikin.model} is designed around a ${thermostat.toLowerCase()}. ${
        attr("thermostat_24v") === "Yes"
          ? "It also lists a conventional 24-volt thermostat option."
          : "The source does not list a conventional 24-volt thermostat option for this model, so confirm compatibility if you want to keep an existing thermostat."
      }`,
    });
  }

  const cloud = attr("cloud_alerts");
  if (cloud === "Yes") {
    faqs.push({
      q: "How can connected diagnostics help with service?",
      a: `${BENEFIT_TRANSLATION.cloud_alerts} In practice that can mean a contractor arrives already knowing what to look at, rather than starting the diagnosis on your driveway.`,
    });
  }

  if (summary && summary.count > 0) {
    faqs.push({
      q: "What are homeowners saying about this product?",
      a: `${summary.count} matching reviews average ${summary.averageRating?.toFixed(1)} out of 5. ${summary.matchNote} The most frequently mentioned topics are ${summary.themes
        .filter((t) => t.total >= MIN_REPORTABLE)
        .slice(0, 3)
        .map((t) => t.label.toLowerCase())
        .join(", ")}.`,
    });

    const nonEquip = summary.nonEquipmentConcerns.length;
    const equip = summary.equipmentConcerns.length;
    faqs.push({
      q: "Are the complaints related to the product or the installation?",
      a: `Of the critical reviews in this sample, ${nonEquip} relate to installation, dealer or service experience and ${equip} relate to the equipment itself. That distinction matters: installation and contractor issues vary from job to job and are not a property of the equipment. It is a fair question to ask your dealer how they commission and verify the system.`,
    });
  }

  faqs.push({
    q: "What factors may affect actual performance?",
    a: "Equipment matchup, system sizing, installation quality, ductwork, home insulation and air-sealing, climate, thermostat settings, maintenance, contractor service and how you use the system. Published specifications describe equipment tested under standard conditions and are a fair way to compare products — they are not a promise of what any individual home will experience.",
  });

  return faqs;
}

/* ------------------------------------------------------------------ */
/* 13. Plain-English summary and final recommendation                  */
/* ------------------------------------------------------------------ */

export function PlainEnglishSection({
  daikin,
  tons,
  result,
  alignments,
  summaries,
}: {
  daikin: Product;
  tons: number | undefined;
  result: ComparisonResult;
  alignments: ReturnType<typeof alignPriorities>;
  summaries: ProductReviewSummary[];
}) {
  const daikinSummary = summaries.find((s) => s.product.id === daikin.id);
  const strengths = alignments.filter((a) => a.technical.status === "daikin_advantage");
  const tradeoffs = alignments.filter((a) => a.technical.status === "competitor_advantage");

  return (
    <SectionShell eyebrow="In summary" title="Your comparison in simple terms">
      <p className="-mt-2"><AiTag kind="generated" /></p>
      <div className="space-y-4 rounded-3xl surface p-6 sm:p-8">
        <p className="text-[1.125rem] leading-relaxed text-navy-800">
          {daikin.brand} {daikin.model}
          {tons ? ` at ${tons} tons` : ""} is recommended here because{" "}
          {strengths.length
            ? `it holds a published advantage on ${strengths
                .map((s) => s.priority.label.toLowerCase())
                .join(", ")} — the things you said matter most`
            : "it matches your stated priorities across the attributes the manufacturers publish"}
          .
        </p>

        {result.edges.length > 0 && (
          <div>
            <p className="text-sm font-bold uppercase tracking-wider text-navy-400">
              Its most important verified advantages
            </p>
            <ul className="mt-2 space-y-1.5">
              {result.edges.slice(0, 4).map((e) => (
                <li key={e.id} className="flex gap-2 text-[1.0625rem] leading-relaxed text-navy-700">
                  <Check className="mt-1 size-5 shrink-0 text-verified-600" aria-hidden />
                  <span>
                    <strong>{e.attributeLabel}:</strong> {e.daikinValue.display}
                    {e.marginLabel ? ` — ${e.marginLabel} than the closest compared product.` : "."}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {daikinSummary && daikinSummary.count > 0 && (
          <div>
            <p className="text-sm font-bold uppercase tracking-wider text-navy-400">
              What owners tend to mention
            </p>
            <p className="mt-2 text-[1.0625rem] leading-relaxed text-navy-700">
              Across {daikinSummary.count} matching reviews averaging{" "}
              {daikinSummary.averageRating?.toFixed(1)} out of 5, the topics that come up most are{" "}
              {daikinSummary.themes
                .filter((t) => t.total >= MIN_REPORTABLE)
                .slice(0, 3)
                .map((t) => t.label.toLowerCase())
                .join(", ")}
              . {daikinSummary.nonEquipmentConcerns.length > 0 &&
                `Where owners are unhappy, it is more often about the installation or the dealer than the equipment.`}
            </p>
          </div>
        )}

        {tradeoffs.length > 0 && (
          <div>
            <p className="text-sm font-bold uppercase tracking-wider text-caution-700">
              The tradeoffs worth knowing
            </p>
            <ul className="mt-2 space-y-1.5">
              {tradeoffs.map((t) => (
                <li key={t.priority.key} className="text-[1.0625rem] leading-relaxed text-navy-700">
                  <strong>{t.priority.label}:</strong> {t.technical.statement}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="rounded-2xl bg-daikin-50/70 p-5">
          <p className="text-sm font-bold uppercase tracking-wider text-daikin-800">
            Questions worth asking your representative
          </p>
          <ul className="mt-2 space-y-1.5 text-[1.0625rem] leading-relaxed text-navy-800">
            <li>• How was this system sized for my home, and what does that calculation assume?</li>
            <li>• How will you verify the refrigerant charge and airflow when you commission it?</li>
            <li>• What exactly does the warranty cover, and what do I need to do to register it?</li>
            <li>• What happens if something goes wrong in year one, and in year eight?</li>
            {tradeoffs.length > 0 && (
              <li>
                • A compared product rates higher on{" "}
                {tradeoffs.map((t) => t.priority.label.toLowerCase()).join(" and ")} — why is this system
                still the better fit for my home?
              </li>
            )}
          </ul>
        </div>

        <p className="text-xs leading-relaxed text-navy-400">{AI_DISCLAIMER}</p>
      </div>
    </SectionShell>
  );
}

export function FinalRecommendationSection({
  daikin,
  tons,
  config,
  reasonCount,
}: {
  daikin: Product;
  tons: number | undefined;
  config: HomeownerReportConfig;
  reasonCount: number;
}) {
  return (
    <SectionShell eyebrow="Final recommendation" title="Where we would land">
      <div className="rounded-3xl border-2 border-daikin-300 bg-gradient-to-br from-daikin-50 to-white p-6 shadow-card sm:p-8">
        <div className="flex flex-wrap items-center gap-6">
          <ProductVisual product={daikin} size="lg" />
          <div className="min-w-[14rem] flex-1">
            <Badge variant="daikin" size="md">
              <ShieldCheck aria-hidden />
              Recommended
            </Badge>
            <p className="mt-3 text-3xl font-bold text-navy-900">
              {daikin.brand} {daikin.model}
              {tons ? ` — ${tons} Ton` : ""}
            </p>
            <p className="mt-3 max-w-2xl text-[1.0625rem] leading-relaxed text-navy-700">
              {reasonCount > 0
                ? `Based on the published product information for the systems compared here and the priorities you shared, this system is a strong fit — with ${reasonCount} verified ${reasonCount === 1 ? "advantage" : "advantages"} in the areas you told us matter.`
                : "Based on the published product information for the systems compared here, this system meets your stated priorities. The decision may come down to installation quality, service and price rather than the specification sheet."}{" "}
              Confirm the exact model, unit size and current warranty terms with your dealer before you buy.
            </p>
          </div>
        </div>

        {(config.dealerName || config.repName || config.dealerContact || config.repContact) && (
          <div className="mt-7 grid gap-4 border-t border-daikin-200 pt-6 sm:grid-cols-2">
            {(config.dealerName || config.dealerContact) && (
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-navy-400">Your dealer</p>
                <p className="mt-1 text-lg font-semibold text-navy-900">{config.dealerName}</p>
                {config.dealerContact && (
                  <p className="whitespace-pre-line text-[0.9375rem] text-navy-600">{config.dealerContact}</p>
                )}
              </div>
            )}
            {(config.repName || config.repContact) && (
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-navy-400">
                  Your representative
                </p>
                <p className="mt-1 text-lg font-semibold text-navy-900">{config.repName}</p>
                {config.repContact && (
                  <p className="whitespace-pre-line text-[0.9375rem] text-navy-600">{config.repContact}</p>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </SectionShell>
  );
}

/* ------------------------------------------------------------------ */

export function Disclaimers({ includeReview }: { includeReview: boolean }) {
  return (
    <section aria-label="Disclaimers" className="space-y-3 rounded-2xl border border-edge bg-navy-50/60 p-6">
      <div className="flex items-start gap-2.5">
        <Info className="mt-0.5 size-5 shrink-0 text-navy-400" aria-hidden />
        <p className="text-sm leading-relaxed text-navy-600">{HOMEOWNER_DISCLAIMER}</p>
      </div>
      {includeReview && (
        <div className="flex items-start gap-2.5">
          <MessageSquareQuote className="mt-0.5 size-5 shrink-0 text-navy-400" aria-hidden />
          <p className="text-sm leading-relaxed text-navy-600">{REVIEW_DISCLAIMER}</p>
        </div>
      )}
      <div className="flex items-start gap-2.5">
        <Star className="mt-0.5 size-5 shrink-0 text-navy-400" aria-hidden />
        <p className="text-sm leading-relaxed text-navy-600">{AI_DISCLAIMER}</p>
      </div>
    </section>
  );
}

export { summarizeReviews };

/* ------------------------------------------------------------------ */
/* Source evidence — subtle, expandable, homeowner-safe                */
/* ------------------------------------------------------------------ */

const EVIDENCE_KEYS = [
  "sound_level",
  "seer2",
  "hspf2",
  "warranty",
  "humidity_control",
  "cloud_alerts",
  "heating_range",
  "refrigerant",
] as const;

/** Section 30: Homeowner View stays clean — provenance lives behind one calm
 *  disclosure rather than being stamped on every number. */
export function SupportingInformation({
  products,
  summaries,
  source,
}: {
  products: Product[];
  summaries: ProductReviewSummary[];
  source: ReviewSource | null;
}) {
  return (
    <details className="group surface">
      <summary className="flex min-h-[52px] cursor-pointer items-center justify-between gap-4 px-6 py-4 text-[0.9375rem] font-semibold text-navy-600 hover:text-daikin-700">
        View supporting product information
        <ChevronRight
          className="size-5 shrink-0 text-navy-400 transition-transform group-open:rotate-90"
          aria-hidden
        />
      </summary>

      <div className="space-y-5 border-t border-edge px-6 py-5">
        <p className="text-sm leading-relaxed text-navy-500">
          Every figure in this report comes from a recorded source. The table below lists the supporting
          specification and its origin for each product compared, along with whether the value is recorded
          at unit level or model level.
        </p>

        {products.map((p) => {
          const rows = EVIDENCE_KEYS.map((k) => p.attributes[k]).filter(
            (v): v is NonNullable<typeof v> => Boolean(v && v.status === "verified"),
          );
          const summary = summaries.find((s) => s.product.id === p.id);
          return (
            <div key={p.id} className="rounded-xl bg-navy-50/60 p-4">
              <p className="text-sm font-bold text-navy-900">
                {p.brand} {p.model}
                <span className="ml-2 font-medium text-navy-500">
                  Model-level specifications — the sources do not record unit-level values
                </span>
              </p>
              {rows.length > 0 ? (
                <ul className="mt-2 space-y-1.5">
                  {rows.map((v) => (
                    <li key={v.attributeKey} className="text-sm leading-relaxed text-navy-600">
                      <span className="font-semibold text-navy-800">{v.display}</span>
                      <span className="text-navy-400"> — {v.source.citation}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-2 text-sm text-navy-500">
                  No supporting specifications recorded in the source documents for this product.
                </p>
              )}
              {summary && source && (
                <p className="mt-2.5 border-t border-navy-100 pt-2 text-sm text-navy-600">
                  {summary.count > 0
                    ? `Customer feedback: ${summary.count} ${summary.matchLabel.toLowerCase()} from ${source.sourceFile}, averaging ${summary.averageRating?.toFixed(1)} of 5.`
                    : "Customer feedback: no approved user-review data available for this product."}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </details>
  );
}
