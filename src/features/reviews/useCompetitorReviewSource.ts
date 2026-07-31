import * as React from "react";
import type { ReviewSource } from "@/data/review-types";

/**
 * ILLUSTRATIVE / SYNTHETIC DATA — no real competitor review export exists for this
 * project. See source-documents/generate-competitor-review-records.py. Every consumer
 * of this hook must keep that clearly labeled in the UI.
 */
let cache: ReviewSource | null = null;
let inFlight: Promise<ReviewSource> | null = null;

export function loadCompetitorReviewSource(): Promise<ReviewSource> {
  if (cache) return Promise.resolve(cache);
  if (inFlight) return inFlight;

  inFlight = fetch("/data/competitor-reviews-synthetic.json")
    .then((res) => {
      if (!res.ok) throw new Error(`Competitor review data unavailable (${res.status})`);
      return res.json() as Promise<ReviewSource>;
    })
    .then((data) => {
      cache = data;
      inFlight = null;
      return data;
    })
    .catch((err) => {
      inFlight = null;
      throw err;
    });

  return inFlight;
}

export interface ReviewSourceState {
  source: ReviewSource | null;
  loading: boolean;
  error: string | null;
}

export function useCompetitorReviewSource(): ReviewSourceState {
  const [state, setState] = React.useState<ReviewSourceState>(() =>
    cache ? { source: cache, loading: false, error: null } : { source: null, loading: true, error: null },
  );

  React.useEffect(() => {
    if (cache) {
      setState({ source: cache, loading: false, error: null });
      return;
    }
    let cancelled = false;
    loadCompetitorReviewSource()
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
