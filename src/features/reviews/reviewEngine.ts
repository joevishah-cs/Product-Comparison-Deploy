import type { Product } from "@/data/types";
import type { MatchLevel, ReviewRecord, ReviewSentiment, ReviewSource } from "@/data/review-types";
import { MATCH_LEVEL_LABEL, MATCH_LEVEL_NOTE } from "@/data/review-types";

/**
 * Matching, aggregation and insight generation over the customer-review export.
 *
 * The export records a `productId` per review but no unit or tonnage, so an
 * exact-unit match can never resolve from this source. That is reported honestly
 * rather than silently downgraded.
 */

/** Product IDs in the review export that correspond to a catalog product. */
const MODEL_ALIASES: Record<string, string[]> = {
  bc_dh6vs_fit_daikin: ["DH6VS"],
  bc_dh7vs_fit_daikin: ["DH7VS"],
  bc_dh9vs_fit_aurora_daikin: ["DH9VS"],
};

/** Catalog product id -> review product ids, tolerant of the slug format in use. */
function aliasesFor(product: Product): string[] {
  const normalized = product.id.replace(/-/g, "_");
  if (MODEL_ALIASES[normalized]) return MODEL_ALIASES[normalized];
  // Air-to-water synthetic reviews are keyed by the catalog id verbatim, because
  // the hydronic models have no separate review-export identifier.
  if (product.equipmentType === "air_to_water_hp") return [product.id];
  // Fall back to matching the catalog model prefix (e.g. "DH7VS FIT" -> "DH7VS").
  const token = product.model.split(/\s+/)[0]?.toUpperCase();
  return token ? [token] : [];
}

/** Every review in the export belongs to the Daikin FIT family. */
const FAMILY_KEY = "Daikin FIT";

export interface ThemeBreakdown {
  key: string;
  label: string;
  total: number;
  positive: number;
  neutral: number;
  negative: number;
}

export interface SubjectBreakdown {
  key: string;
  label: string;
  total: number;
  positive: number;
  neutral: number;
  negative: number;
}

export interface ProductReviewSummary {
  product: Product;
  matchLevel: MatchLevel;
  matchLabel: string;
  matchNote: string;
  /** The review product ids the match resolved to, for transparency. */
  matchedOn: string[];
  reviews: ReviewRecord[];
  count: number;
  averageRating: number | null;
  ratingDistribution: Record<1 | 2 | 3 | 4 | 5, number>;
  sentimentCounts: Record<ReviewSentiment, number>;
  positivePct: number;
  neutralPct: number;
  negativePct: number;
  themes: ThemeBreakdown[];
  subjects: SubjectBreakdown[];
  /** Reviews whose criticism is about installation, dealer or service rather than the unit. */
  nonEquipmentConcerns: ReviewRecord[];
  equipmentConcerns: ReviewRecord[];
  dateRange: { from: string; to: string } | null;
  /** How much weight a conclusion drawn from this sample can carry. */
  confidence: Confidence;
}

export type Confidence = "strong" | "moderate" | "limited" | "insufficient";

export const CONFIDENCE_LABEL: Record<Confidence, string> = {
  strong: "Strong evidence",
  moderate: "Moderate evidence",
  limited: "Limited evidence",
  insufficient: "Insufficient evidence",
};

/** Sample-size thresholds. A 5.0 from two reviews must never outrank a 4.7 from
 *  several hundred, so every conclusion carries the sample it rests on. */
export function confidenceFor(count: number, matchLevel: MatchLevel): Confidence {
  if (count === 0) return "insufficient";
  const penalty = matchLevel === "product_family" || matchLevel === "brand" ? 1 : 0;
  const tier = count >= 100 ? 3 : count >= 30 ? 2 : count >= 10 ? 1 : 0;
  const adjusted = Math.max(0, tier - penalty);
  return (["insufficient", "limited", "moderate", "strong"] as const)[adjusted];
}

export const MIN_REPORTABLE = 10;

function emptyDistribution(): Record<1 | 2 | 3 | 4 | 5, number> {
  return { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
}

function emptySentiment(): Record<ReviewSentiment, number> {
  return { positive: 0, neutral: 0, negative: 0, unrated: 0 };
}

/** Resolves the reviews for a product. Comparison contexts are strict: only
 *  reviews recorded against this exact model are used — sibling models from the
 *  same family are never mixed in, so a comparison can never borrow another
 *  product's feedback. (Family-level browsing remains available on the Reviews
 *  page, where it is clearly its own dataset rather than a comparison input.) */
export function matchReviews(source: ReviewSource, product: Product): {
  reviews: ReviewRecord[];
  matchLevel: MatchLevel;
  matchedOn: string[];
} {
  // The real export covers only the Daikin FIT family. Air-to-water products are
  // matched too, against the clearly-labelled synthetic set, which carries reviews
  // for competitor hydronic models as well as Daikin's.
  const isAtw = product.equipmentType === "air_to_water_hp";
  if (!isAtw && (!product.isDaikin || product.family !== FAMILY_KEY)) {
    return { reviews: [], matchLevel: "none", matchedOn: [] };
  }

  const aliases = aliasesFor(product).map((a) => a.toUpperCase());
  const exact = source.reviews.filter((r) => aliases.includes(r.productId.toUpperCase()));
  if (exact.length) {
    // The export carries no unit/tonnage column, so this is model-level, not unit-level.
    return { reviews: exact, matchLevel: "exact_model", matchedOn: aliases };
  }

  return { reviews: [], matchLevel: "none", matchedOn: [] };
}

export function summarizeReviews(source: ReviewSource, product: Product): ProductReviewSummary {
  const { reviews, matchLevel, matchedOn } = matchReviews(source, product);

  const distribution = emptyDistribution();
  const sentimentCounts = emptySentiment();
  let ratingSum = 0;
  let rated = 0;

  for (const r of reviews) {
    if (r.rating && r.rating >= 1 && r.rating <= 5) {
      distribution[r.rating as 1 | 2 | 3 | 4 | 5] += 1;
      ratingSum += r.rating;
      rated += 1;
    }
    sentimentCounts[r.sentiment] += 1;
  }

  const themeMap = new Map<string, ThemeBreakdown>();
  for (const def of source.themeDefinitions) {
    themeMap.set(def.key, { key: def.key, label: def.label, total: 0, positive: 0, neutral: 0, negative: 0 });
  }
  const subjectMap = new Map<string, SubjectBreakdown>();
  for (const def of source.subjectDefinitions) {
    subjectMap.set(def.key, { key: def.key, label: def.label, total: 0, positive: 0, neutral: 0, negative: 0 });
  }

  for (const r of reviews) {
    for (const t of r.themes) {
      const entry = themeMap.get(t);
      if (!entry) continue;
      entry.total += 1;
      if (r.sentiment === "positive") entry.positive += 1;
      else if (r.sentiment === "neutral") entry.neutral += 1;
      else if (r.sentiment === "negative") entry.negative += 1;
    }
    for (const s of r.subjects) {
      const entry = subjectMap.get(s);
      if (!entry) continue;
      entry.total += 1;
      if (r.sentiment === "positive") entry.positive += 1;
      else if (r.sentiment === "neutral") entry.neutral += 1;
      else if (r.sentiment === "negative") entry.negative += 1;
    }
  }

  // A critical review is treated as an equipment concern only when the reviewer is
  // actually talking about the equipment, not the crew, the dealer or a service call.
  const critical = reviews.filter((r) => r.sentiment === "neutral" || r.sentiment === "negative");
  const nonEquipmentConcerns = critical.filter(
    (r) =>
      r.subjects.some((s) => s === "installation" || s === "dealer" || s === "service" || s === "delivery") &&
      !r.subjects.includes("equipment"),
  );
  const equipmentConcerns = critical.filter((r) => r.subjects.includes("equipment"));

  const dates = reviews.map((r) => r.date).filter((d): d is string => Boolean(d)).sort();
  const total = reviews.length;

  return {
    product,
    matchLevel,
    matchLabel: MATCH_LEVEL_LABEL[matchLevel],
    matchNote: MATCH_LEVEL_NOTE[matchLevel],
    matchedOn,
    reviews,
    count: total,
    averageRating: rated ? ratingSum / rated : null,
    ratingDistribution: distribution,
    sentimentCounts,
    positivePct: total ? Math.round((sentimentCounts.positive / total) * 100) : 0,
    neutralPct: total ? Math.round((sentimentCounts.neutral / total) * 100) : 0,
    negativePct: total ? Math.round((sentimentCounts.negative / total) * 100) : 0,
    themes: Array.from(themeMap.values()).sort((a, b) => b.total - a.total),
    subjects: Array.from(subjectMap.values()).sort((a, b) => b.total - a.total),
    nonEquipmentConcerns,
    equipmentConcerns,
    dateRange: dates.length ? { from: dates[0], to: dates[dates.length - 1] } : null,
    confidence: confidenceFor(total, matchLevel),
  };
}

export function summarizeSelection(source: ReviewSource, products: Product[]): ProductReviewSummary[] {
  return products.map((p) => summarizeReviews(source, p));
}

/* ------------------------------------------------------------------ */
/* Rating trend                                                        */
/* ------------------------------------------------------------------ */

export interface TrendPoint {
  period: string;
  label: string;
  count: number;
  averageRating: number | null;
  positive: number;
  neutral: number;
  negative: number;
}

export function ratingTrend(reviews: ReviewRecord[], granularity: "quarter" | "year" = "quarter"): TrendPoint[] {
  const buckets = new Map<string, { sum: number; rated: number; count: number; pos: number; neu: number; neg: number }>();

  for (const r of reviews) {
    if (!r.date) continue;
    const d = new Date(r.date);
    if (Number.isNaN(d.getTime())) continue;
    const key =
      granularity === "year"
        ? `${d.getUTCFullYear()}`
        : `${d.getUTCFullYear()}-Q${Math.floor(d.getUTCMonth() / 3) + 1}`;
    const b = buckets.get(key) ?? { sum: 0, rated: 0, count: 0, pos: 0, neu: 0, neg: 0 };
    b.count += 1;
    if (r.rating) {
      b.sum += r.rating;
      b.rated += 1;
    }
    if (r.sentiment === "positive") b.pos += 1;
    else if (r.sentiment === "neutral") b.neu += 1;
    else if (r.sentiment === "negative") b.neg += 1;
    buckets.set(key, b);
  }

  return Array.from(buckets.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([period, b]) => ({
      period,
      label: period,
      count: b.count,
      averageRating: b.rated ? Number((b.sum / b.rated).toFixed(2)) : null,
      positive: b.pos,
      neutral: b.neu,
      negative: b.neg,
    }));
}

/* ------------------------------------------------------------------ */
/* Representative review selection                                     */
/* ------------------------------------------------------------------ */

/** Picks a balanced, non-cherry-picked set: two positive, one neutral, one concern.
 *  Reviews are returned verbatim and are never edited or merged. */
export function representativeReviews(summary: ProductReviewSummary, positives = 2): ReviewRecord[] {
  const withText = summary.reviews.filter((r) => r.text.trim().length > 40);

  const pick = (pool: ReviewRecord[], n: number) =>
    pool
      .slice()
      .sort((a, b) => b.text.length - a.text.length)
      .slice(0, n);

  const positive = pick(withText.filter((r) => r.sentiment === "positive"), positives);
  const neutral = pick(withText.filter((r) => r.sentiment === "neutral"), 1);
  const negative = pick(withText.filter((r) => r.sentiment === "negative"), 1);

  const chosen = [...positive, ...neutral, ...negative];
  if (chosen.length < positives + 1) {
    // Not enough spread in the sample -- fall back to the longest available, still unedited.
    const extra = pick(
      withText.filter((r) => !chosen.some((c) => c.id === r.id)),
      positives + 2 - chosen.length,
    );
    chosen.push(...extra);
  }
  return chosen;
}

/* ------------------------------------------------------------------ */
/* Internal insight cards                                              */
/* ------------------------------------------------------------------ */

export interface ReviewInsightCard {
  id: string;
  title: string;
  product: Product | null;
  headline: string;
  supportingTheme: string;
  reviewCount: number;
  matchLevel: MatchLevel;
  matchLabel: string;
  confidence: Confidence;
  /** Reviews that back the card, for the "View supporting reviews" action. */
  filter: { productId: string; theme?: string; sentiment?: ReviewSentiment } | null;
}

function withReviews(summaries: ProductReviewSummary[]): ProductReviewSummary[] {
  return summaries.filter((s) => s.count > 0);
}

export function buildReviewInsightCards(summaries: ProductReviewSummary[]): ReviewInsightCard[] {
  const cards: ReviewInsightCard[] = [];
  const rated = withReviews(summaries).filter((s) => s.averageRating !== null);

  const empty = (id: string, title: string, headline: string): ReviewInsightCard => ({
    id,
    title,
    product: null,
    headline,
    supportingTheme: "—",
    reviewCount: 0,
    matchLevel: "none",
    matchLabel: MATCH_LEVEL_LABEL.none,
    confidence: "insufficient",
    filter: null,
  });

  /* Highest customer rating — only among samples large enough to mean anything. */
  const reportable = rated.filter((s) => s.count >= MIN_REPORTABLE);
  if (reportable.length) {
    const best = reportable.reduce((a, b) => ((b.averageRating ?? 0) > (a.averageRating ?? 0) ? b : a));
    const excluded = rated.filter((s) => s.count < MIN_REPORTABLE);
    cards.push({
      id: "highest_rating",
      title: "Highest customer rating",
      product: best.product,
      headline: `${best.averageRating?.toFixed(2)} average across ${best.count} reviews.${
        excluded.length
          ? ` ${excluded.map((e) => e.product.model).join(", ")} excluded — fewer than ${MIN_REPORTABLE} reviews.`
          : ""
      }`,
      supportingTheme: best.themes[0]?.label ?? "—",
      reviewCount: best.count,
      matchLevel: best.matchLevel,
      matchLabel: best.matchLabel,
      confidence: best.confidence,
      filter: { productId: best.product.id },
    });
  } else {
    cards.push(
      empty(
        "highest_rating",
        "Highest customer rating",
        `No selected product has at least ${MIN_REPORTABLE} matching reviews, so no rating comparison is drawn.`,
      ),
    );
  }

  /* Most reviewed product */
  const mostReviewed = withReviews(summaries).sort((a, b) => b.count - a.count)[0];
  cards.push(
    mostReviewed
      ? {
          id: "most_reviewed",
          title: "Most reviewed product",
          product: mostReviewed.product,
          headline: `${mostReviewed.count} matching reviews between ${mostReviewed.dateRange?.from} and ${mostReviewed.dateRange?.to}.`,
          supportingTheme: mostReviewed.themes[0]?.label ?? "—",
          reviewCount: mostReviewed.count,
          matchLevel: mostReviewed.matchLevel,
          matchLabel: mostReviewed.matchLabel,
          confidence: mostReviewed.confidence,
          filter: { productId: mostReviewed.product.id },
        }
      : empty("most_reviewed", "Most reviewed product", "No selected product has matching review data."),
  );

  /* Strongest sentiment for a given theme */
  const themeCards: { id: string; title: string; theme: string }[] = [
    { id: "quiet_sentiment", title: "Strongest quietness sentiment", theme: "quietness" },
    { id: "comfort_sentiment", title: "Strongest comfort sentiment", theme: "comfort" },
    { id: "reliability_sentiment", title: "Strongest reliability sentiment", theme: "reliability" },
    { id: "value_sentiment", title: "Best perceived value", theme: "dealer" },
  ];

  for (const tc of themeCards) {
    const candidates = withReviews(summaries)
      .map((s) => ({ s, t: s.themes.find((t) => t.key === tc.theme) }))
      .filter((c) => c.t && c.t.total >= MIN_REPORTABLE) as {
      s: ProductReviewSummary;
      t: ThemeBreakdown;
    }[];

    if (!candidates.length) {
      cards.push(
        empty(
          tc.id,
          tc.title,
          `Fewer than ${MIN_REPORTABLE} matching reviews mention this theme, so no conclusion is drawn.`,
        ),
      );
      continue;
    }

    const best = candidates.reduce((a, b) =>
      b.t.positive / b.t.total > a.t.positive / a.t.total ? b : a,
    );
    const pct = Math.round((best.t.positive / best.t.total) * 100);
    cards.push({
      id: tc.id,
      title: tc.title,
      product: best.s.product,
      headline: `${best.t.positive} of ${best.t.total} reviews mentioning ${best.t.label.toLowerCase()} are positive (${pct}%).`,
      supportingTheme: best.t.label,
      reviewCount: best.t.total,
      matchLevel: best.s.matchLevel,
      matchLabel: best.s.matchLabel,
      confidence: confidenceFor(best.t.total, best.s.matchLevel),
      filter: { productId: best.s.product.id, theme: tc.theme },
    });
  }

  /* Most common concern */
  const concernPool = withReviews(summaries).flatMap((s) =>
    s.themes
      .filter((t) => t.neutral + t.negative > 0)
      .map((t) => ({ s, t, critical: t.neutral + t.negative })),
  );
  if (concernPool.length) {
    const worst = concernPool.reduce((a, b) => (b.critical > a.critical ? b : a));
    cards.push({
      id: "common_concern",
      title: "Most common concern",
      product: worst.s.product,
      headline: `${worst.critical} of ${worst.t.total} reviews mentioning ${worst.t.label.toLowerCase()} carry a rating of 3 stars or below.`,
      supportingTheme: worst.t.label,
      reviewCount: worst.t.total,
      matchLevel: worst.s.matchLevel,
      matchLabel: worst.s.matchLabel,
      confidence: confidenceFor(worst.critical, worst.s.matchLevel),
      filter: { productId: worst.s.product.id, theme: worst.t.key },
    });
  } else {
    cards.push(empty("common_concern", "Most common concern", "No critical reviews in the matched sample."));
  }

  /* Largest review-data gap */
  const noData = summaries.filter((s) => s.count === 0);
  cards.push(
    noData.length
      ? {
          id: "data_gap",
          title: "Largest review-data gap",
          product: noData[0].product,
          headline: `${noData.length} selected ${noData.length === 1 ? "product has" : "products have"} no approved user-review data: ${noData
            .map((s) => s.product.displayName)
            .join(", ")}. Rating comparisons cannot include them.`,
          supportingTheme: "No matching reviews",
          reviewCount: 0,
          matchLevel: "none",
          matchLabel: MATCH_LEVEL_LABEL.none,
          confidence: "insufficient",
          filter: null,
        }
      : empty("data_gap", "Largest review-data gap", "Every selected product has matching review data."),
  );

  /* Most polarizing */
  const polar = withReviews(summaries)
    .filter((s) => s.count >= MIN_REPORTABLE)
    .map((s) => ({
      s,
      spread:
        (s.ratingDistribution[5] + s.ratingDistribution[1]) / s.count -
        (s.ratingDistribution[3] + s.ratingDistribution[4]) / s.count,
    }));
  cards.push(
    polar.length
      ? (() => {
          const most = polar.reduce((a, b) => (b.spread > a.spread ? b : a));
          const d = most.s.ratingDistribution;
          return {
            id: "polarizing",
            title: "Most polarizing product",
            product: most.s.product,
            headline: `${d[5]} five-star and ${d[1] + d[2]} one-or-two-star reviews out of ${most.s.count}.`,
            supportingTheme: most.s.themes[0]?.label ?? "—",
            reviewCount: most.s.count,
            matchLevel: most.s.matchLevel,
            matchLabel: most.s.matchLabel,
            confidence: most.s.confidence,
            filter: { productId: most.s.product.id },
          } satisfies ReviewInsightCard;
        })()
      : empty("polarizing", "Most polarizing product", `No selected product has at least ${MIN_REPORTABLE} reviews.`),
  );

  /* Strongest improvement opportunity — the theme with the worst positive share */
  const improvement = withReviews(summaries).flatMap((s) =>
    s.themes.filter((t) => t.total >= MIN_REPORTABLE).map((t) => ({ s, t, share: t.positive / t.total })),
  );
  cards.push(
    improvement.length
      ? (() => {
          const worst = improvement.reduce((a, b) => (b.share < a.share ? b : a));
          return {
            id: "improvement",
            title: "Strongest improvement opportunity",
            product: worst.s.product,
            headline: `${worst.t.label} has the lowest positive share of any theme with at least ${MIN_REPORTABLE} mentions: ${Math.round(worst.share * 100)}% positive across ${worst.t.total} reviews.`,
            supportingTheme: worst.t.label,
            reviewCount: worst.t.total,
            matchLevel: worst.s.matchLevel,
            matchLabel: worst.s.matchLabel,
            confidence: confidenceFor(worst.t.total, worst.s.matchLevel),
            filter: { productId: worst.s.product.id, theme: worst.t.key },
          } satisfies ReviewInsightCard;
        })()
      : empty("improvement", "Strongest improvement opportunity", "Not enough themed reviews to rank improvement areas."),
  );

  return cards;
}

/* ------------------------------------------------------------------ */
/* Balanced narrative summary                                          */
/* ------------------------------------------------------------------ */

export function buildReviewNarrative(summaries: ProductReviewSummary[]): string {
  const withData = summaries.filter((s) => s.count > 0);
  const without = summaries.filter((s) => s.count === 0);

  if (!withData.length) {
    return "No approved user-review data is available for any of the selected products, so customer feedback cannot inform this comparison.";
  }

  const lead = withData.reduce((a, b) => (b.count > a.count ? b : a));
  const topThemes = lead.themes
    .filter((t) => t.total >= MIN_REPORTABLE && t.positive / t.total >= 0.85)
    .slice(0, 3)
    .map((t) => t.label.toLowerCase());

  const parts: string[] = [];

  parts.push(
    `Homeowners reviewing ${lead.product.displayName} frequently mention ${
      topThemes.length ? topThemes.join(", ") : "a range of topics"
    }, across ${lead.count} matching ${lead.matchLabel.toLowerCase()}.`,
  );

  if (lead.nonEquipmentConcerns.length) {
    parts.push(
      `${lead.nonEquipmentConcerns.length} of the critical comments relate to installation, dealer or service experience rather than the equipment itself, and those can vary by contractor.`,
    );
  }
  if (lead.equipmentConcerns.length) {
    const concernThemes = Array.from(
      new Set(lead.equipmentConcerns.flatMap((r) => r.themes)),
    )
      .map((k) => lead.themes.find((t) => t.key === k)?.label)
      .filter(Boolean)
      .slice(0, 3);
    parts.push(
      `Equipment-related concerns appear in ${lead.equipmentConcerns.length} reviews, most often around ${concernThemes.join(", ").toLowerCase() || "general operation"}.`,
    );
  }

  if (without.length) {
    parts.push(
      `${without.map((s) => s.product.displayName).join(", ")} ${without.length === 1 ? "has" : "have"} no approved user-review data, so ratings cannot be compared across the full selection.`,
    );
  }

  const counts = withData.map((s) => s.count);
  if (counts.length > 1 && Math.max(...counts) >= Math.min(...counts) * 3) {
    parts.push(
      "Review volumes differ substantially between products, so ratings should be read alongside the verified product specifications rather than on their own.",
    );
  }

  return parts.join(" ");
}
