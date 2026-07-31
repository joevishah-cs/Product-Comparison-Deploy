/** Shapes for the customer-review export in `public/data/reviews.json`. */

export type ReviewSentiment = "positive" | "neutral" | "negative" | "unrated";

/** How closely a review was matched to the product being compared. */
export type MatchLevel = "exact_unit" | "exact_model" | "product_family" | "brand" | "none";

export const MATCH_LEVEL_LABEL: Record<MatchLevel, string> = {
  exact_unit: "Exact-unit reviews",
  exact_model: "Exact-model reviews",
  product_family: "Product-family reviews",
  brand: "Brand-level feedback",
  none: "No matching reviews",
};

export const MATCH_LEVEL_NOTE: Record<MatchLevel, string> = {
  exact_unit: "These reviews are recorded against the exact selected unit size.",
  exact_model:
    "These reviews are recorded against this exact model. The source does not record a unit size, so they are not specific to the selected tonnage.",
  product_family:
    "These reviews may cover the broader product model or family and may not reflect the exact selected unit.",
  brand: "This is brand-level feedback and may not reflect this specific model or unit.",
  none: "No approved user-review data available",
};

export interface ReviewRecord {
  id: string;
  date: string | null;
  rating: number | null;
  /** Verbatim source title. */
  title: string;
  /** Verbatim source text. */
  text: string;
  productId: string;
  productName: string;
  brand: string;
  category: string | null;
  sentiment: ReviewSentiment;
  /** Deterministically detected topics — detection metadata, not a source field. */
  themes: string[];
  /** What the feedback is about: equipment, installation, dealer, service, delivery. */
  subjects: string[];
  hasPositiveLanguage: boolean;
  hasCriticalLanguage: boolean;
  sourceRow: number;
  /** True only for the illustrative competitor dataset — never present on real imported reviews. */
  synthetic?: boolean;
}

export interface ReviewSource {
  /** True only for the illustrative competitor dataset — never present on real imported reviews. */
  synthetic?: boolean;
  sourceFile: string | null;
  sourceSheet: string | null;
  importedAt: string;
  totalReviews: number;
  dateRange: { from: string; to: string };
  /** Fields the export actually contains. */
  availableFields: string[];
  /** Fields the export does not contain. These are never fabricated. */
  absentFields: string[];
  sourcePlatformRecorded: boolean;
  themeDefinitions: { key: string; label: string }[];
  subjectDefinitions: { key: string; label: string }[];
  reviewedProducts: { productId: string; productName: string; brand: string; reviewCount: number }[];
  reviews: ReviewRecord[];
}
