import * as React from "react";
import { useSearchParams, Link } from "react-router-dom";
import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PRODUCT_BY_ID } from "@/data/catalog";
import { buildComparison } from "@/features/compare/engine";
import { useMergedReviewSource } from "@/features/reviews/useMergedReviewSource";
import { buildReviewNarrative, summarizeSelection } from "@/features/reviews/reviewEngine";
import {
  alignPriorities,
  buildRecommendationReasons,
} from "./homeownerEngine";
import {
  ComfortBenefitsSection,
  BrochureCapabilitiesSection,
  Disclaimers,
  FaqSection,
  FinalRecommendationSection,
  HomeownerReviewsSection,
  ImportantDifferencesSection,
  PlainEnglishSection,
  PriorityFitSection,
  RecommendationSection,
  ReportCover,
  SimpleComparisonSection,
  SupportingInformation,
} from "./HomeownerReport";
import {
  ComfortBenefitsOverview,
  EfficiencyChart,
  FeatureComparison,
  OperatingRangeChart,
  SoundChart,
  WarrantyChart,
} from "./HomeownerCharts";
import type { HomeownerReportConfig, ReportSectionKey } from "./HomeownerProvider";
import { REPORT_SECTIONS } from "./HomeownerProvider";

/**
 * Read-only shareable report. Contains only homeowner-facing sections — no
 * navigation, no internal analysis, no marketing takeaways, no editing controls.
 * Everything is recomputed from the product ids in the URL, so the shared page
 * always reflects the same verified data the representative saw.
 */
export function ReportSharePage() {
  const [params] = useSearchParams();
  const { source: reviewSource, loading } = useMergedReviewSource();

  const productIds = (params.get("products") ?? "").split(",").filter(Boolean);
  const products = productIds.map((id) => PRODUCT_BY_ID[id]).filter(Boolean);
  const recommendedId = params.get("rec") ?? "";
  const priorities = (params.get("priorities") ?? "").split(",").filter(Boolean);
  const enabledSections = new Set((params.get("sections") ?? "").split(",").filter(Boolean));

  let unitSelections: Record<string, number> = {};
  try {
    unitSelections = JSON.parse(params.get("units") ?? "{}") as Record<string, number>;
  } catch {
    /* malformed units parameter — fall back to model-level */
  }

  const config: HomeownerReportConfig = React.useMemo(
    () => ({
      recommendedProductId: recommendedId || null,
      competitorIds: [],
      homeownerName: params.get("for") ?? "",
      dealerName: params.get("dealer") ?? "",
      repName: params.get("rep") ?? "",
      dealerContact: "",
      repContact: "",
      location: params.get("location") ?? "",
      priorities,
      personalNote: "",
      sections: Object.fromEntries(
        REPORT_SECTIONS.map((s) => [s.key, enabledSections.size === 0 || enabledSections.has(s.key)]),
      ) as Record<ReportSectionKey, boolean>,
      generatedAt: new Date().toISOString(),
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [params],
  );

  const result = React.useMemo(() => buildComparison(products), [products]);
  const recommended =
    result.daikinProducts.find((p) => p.id === recommendedId) ?? result.daikinProducts[0] ?? null;
  const competitors = result.competitorProducts;
  const reportProducts = recommended ? [recommended, ...competitors] : competitors;

  const summaries = React.useMemo(
    () => (reviewSource ? summarizeSelection(reviewSource, reportProducts) : []),
    [reviewSource, reportProducts],
  );
  const daikinSummary = summaries.find((s) => s.product.id === recommended?.id) ?? null;
  const alignments = React.useMemo(
    () => (recommended ? alignPriorities(priorities, recommended, competitors, daikinSummary) : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [recommended, competitors, daikinSummary, params],
  );
  const reasons = React.useMemo(
    () => (recommended ? buildRecommendationReasons(result, recommended, priorities, daikinSummary) : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [result, recommended, daikinSummary, params],
  );
  const narrative = React.useMemo(() => buildReviewNarrative(summaries), [summaries]);

  const tons = recommended ? unitSelections[recommended.id] : undefined;
  const hasReviewData = summaries.some((s) => s.count > 0);
  const on = (key: ReportSectionKey) => config.sections[key];

  if (!recommended || products.length < 2) {
    return (
      <div className="grid min-h-screen place-items-center bg-canvas p-8 text-center">
        <div>
          <img src="/brand/daikin-logo.png" alt="Daikin" className="mx-auto h-8 w-auto" />
          <p className="mt-6 text-xl font-semibold text-navy-800">
            This report link is incomplete or has expired.
          </p>
          <p className="mt-2 text-base text-navy-500">
            Ask your Daikin representative to share the report again.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-canvas">
      <header className="no-print sticky top-0 z-30 border-b border-edge bg-white/90 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between gap-4 px-5">
          <img src="/brand/daikin-logo.png" alt="Daikin" className="h-7 w-auto" />
          <div className="flex items-center gap-3">
            <span className="hidden text-sm font-medium text-navy-500 sm:block">
              Shared comparison report — read only
            </span>
            <Button variant="secondary" size="sm" onClick={() => window.print()}>
              <Printer aria-hidden />
              Print / save PDF
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl space-y-10 px-5 py-10 print-full">
        <ReportCover config={config} recommended={recommended} tons={tons} />

        {on("recommendation") && (
          <RecommendationSection
            recommended={recommended}
            tons={tons}
            reasons={reasons}
            priorities={priorities}
          />
        )}
        {on("fit") && alignments.length > 0 && <PriorityFitSection alignments={alignments} />}
        {on("benefits") && (
          <>
            <ComfortBenefitsSection daikin={recommended} />
            <ComfortBenefitsOverview products={reportProducts} />
            <BrochureCapabilitiesSection daikin={recommended} />
          </>
        )}
        {on("comparison") && competitors.length > 0 && (
          <SimpleComparisonSection daikin={recommended} competitors={competitors} />
        )}
        {on("reviews") && reviewSource && (
          <HomeownerReviewsSection
            source={reviewSource}
            summaries={summaries}
            narrative={narrative}
            showExcerpts={on("reviewExcerpts")}
            showThemes={on("reviewThemes")}
            showConcerns={on("reviewConcerns")}
          />
        )}
        {loading && (
          <p className="no-print rounded-xl bg-navy-50 px-4 py-3 text-sm text-navy-500">
            Loading customer review data…
          </p>
        )}
        {on("quiet") && <SoundChart products={reportProducts} />}
        {on("efficiency") && <EfficiencyChart products={reportProducts} />}
        {on("cold") && priorities.includes("cold") && <OperatingRangeChart products={reportProducts} />}
        {on("warranty") && <WarrantyChart products={reportProducts} />}
        {on("smart") && <FeatureComparison products={reportProducts} />}
        {on("differences") && competitors.length > 0 && (
          <ImportantDifferencesSection
            result={result}
            daikin={recommended}
            competitors={competitors}
            summaries={summaries}
          />
        )}
        {on("faq") && (
          <FaqSection daikin={recommended} competitors={competitors} summaries={summaries} result={result} />
        )}
        {on("plainEnglish") && (
          <PlainEnglishSection
            daikin={recommended}
            tons={tons}
            result={result}
            alignments={alignments}
            summaries={summaries}
          />
        )}
        <FinalRecommendationSection
          daikin={recommended}
          tons={tons}
          config={config}
          reasonCount={reasons.length}
        />

        <SupportingInformation products={reportProducts} summaries={summaries} source={reviewSource} />
        <Disclaimers includeReview={hasReviewData} />

        <p className="no-print pb-6 text-center text-sm text-navy-400">
          Prepared with the Daikin comparison workspace ·{" "}
          <Link to="/login" className="font-semibold text-daikin-700 hover:underline">
            Representative sign-in
          </Link>
        </p>
      </main>
    </div>
  );
}
