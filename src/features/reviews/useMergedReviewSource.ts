import * as React from "react";
import type { ReviewSource } from "@/data/review-types";
import { loadReviewSource } from "./useReviewSource";
import { loadCompetitorReviewSource } from "./useCompetitorReviewSource";

/**
 * The real review export (DaikinFitReviews.xlsx) covers only the Daikin FIT ducted
 * split family. Air-to-water products have no real review export at all, so their
 * reviews come from the clearly-labelled synthetic set.
 *
 * This hook merges both so a report can show reviews for whatever products it
 * contains. Every synthetic review keeps its own `synthetic: true` flag, and the
 * merged source is marked synthetic whenever any synthetic review is included —
 * consumers must keep that labeled in the UI.
 */
let cache: ReviewSource | null = null;
let inFlight: Promise<ReviewSource> | null = null;

function merge(real: ReviewSource, synthetic: ReviewSource): ReviewSource {
  const dedupe = <T extends { key: string }>(items: T[]): T[] => {
    const seen = new Set<string>();
    return items.filter((i) => (seen.has(i.key) ? false : (seen.add(i.key), true)));
  };

  return {
    ...real,
    synthetic: true,
    totalReviews: real.reviews.length + synthetic.reviews.length,
    themeDefinitions: dedupe([...real.themeDefinitions, ...synthetic.themeDefinitions]),
    subjectDefinitions: dedupe([...real.subjectDefinitions, ...synthetic.subjectDefinitions]),
    reviewedProducts: [...real.reviewedProducts, ...synthetic.reviewedProducts],
    reviews: [...real.reviews, ...synthetic.reviews],
  };
}

export function loadMergedReviewSource(): Promise<ReviewSource> {
  if (cache) return Promise.resolve(cache);
  if (inFlight) return inFlight;

  inFlight = Promise.all([loadReviewSource(), loadCompetitorReviewSource()])
    .then(([real, synthetic]) => {
      cache = merge(real, synthetic);
      inFlight = null;
      return cache;
    })
    .catch((err) => {
      inFlight = null;
      throw err;
    });

  return inFlight;
}

export interface MergedReviewSourceState {
  source: ReviewSource | null;
  loading: boolean;
  error: string | null;
}

export function useMergedReviewSource(): MergedReviewSourceState {
  const [state, setState] = React.useState<MergedReviewSourceState>(() =>
    cache ? { source: cache, loading: false, error: null } : { source: null, loading: true, error: null },
  );

  React.useEffect(() => {
    if (cache) {
      setState({ source: cache, loading: false, error: null });
      return;
    }
    let cancelled = false;
    loadMergedReviewSource()
      .then((data) => {
        if (!cancelled) setState({ source: data, loading: false, error: null });
      })
      .catch((err: Error) => {
        if (!cancelled) setState({ source: null, loading: false, error: err.message });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}
