import * as React from "react";
import {
  FileText,
  Printer,
  FileDown,
  ClipboardCopy,
  Link2,
  Mail,
  MonitorPlay,
  SlidersHorizontal,
  Info,
} from "lucide-react";
import { copyText, formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input, Label, Textarea } from "@/components/ui/input";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/components/ui/toast";
import type { ReviewSource } from "@/data/review-types";
import { brochureFeaturesFor } from "@/data/a2w-brochure-features";
import type { ComparisonResult } from "@/features/compare/engine";
import {
  buildReviewNarrative,
  summarizeSelection,
  type ProductReviewSummary,
} from "@/features/reviews/reviewEngine";
import {
  alignPriorities,
  buildRecommendationReasons,
  pickRecommendedProduct,
  PRIORITY_BY_KEY,
} from "./homeownerEngine";
import {
  ComfortBenefitsSection,
  BrochureCapabilitiesSection,
  Disclaimers,
  FaqSection,
  SupportingInformation,
  FinalRecommendationSection,
  HomeownerReviewsSection,
  ImportantDifferencesSection,
  PlainEnglishSection,
  PriorityFitSection,
  RecommendationSection,
  ReportCover,
  SectionShell,
  SimpleComparisonSection,
  HOMEOWNER_DISCLAIMER,
  REVIEW_DISCLAIMER,
} from "./HomeownerReport";
import {
  ComfortBenefitsOverview,
  EfficiencyChart,
  FeatureComparison,
  OperatingRangeChart,
  SoundChart,
  WarrantyChart,
} from "./HomeownerCharts";
import { REPORT_SECTIONS, useHomeowner, type ReportSectionKey } from "./HomeownerProvider";
import { ReportSetupDialog } from "./ReportSetupDialog";
import { PresentationMode } from "./PresentationMode";

export interface ReportSlide {
  key: string;
  title: string;
  node: React.ReactNode;
}

export function HomeownerView({
  result,
  unitSelections,
  reviewSource,
  reviewsLoading,
  onViewTechnical,
  onViewReviews,
}: {
  result: ComparisonResult;
  unitSelections: Record<string, number>;
  reviewSource: ReviewSource | null;
  reviewsLoading: boolean;
  onViewTechnical: () => void;
  onViewReviews: () => void;
}) {
  const { config, update, toggleSection, generated, markGenerated, presenting, setPresenting, setView } =
    useHomeowner();
  const { notify } = useToast();

  const [setupOpen, setSetupOpen] = React.useState(false);
  const [controlsOpen, setControlsOpen] = React.useState(false);
  const [shareOpen, setShareOpen] = React.useState(false);
  const reportRef = React.useRef<HTMLDivElement>(null);

  const daikinProducts = result.daikinProducts;
  const competitorProducts = result.competitorProducts;

  const recommended = React.useMemo(() => {
    const chosen = daikinProducts.find((p) => p.id === config.recommendedProductId);
    return chosen ?? pickRecommendedProduct(result, config.priorities);
  }, [daikinProducts, config.recommendedProductId, config.priorities, result]);

  const includedCompetitors = React.useMemo(() => {
    if (!config.competitorIds.length) return competitorProducts;
    const filtered = competitorProducts.filter((p) => config.competitorIds.includes(p.id));
    return filtered.length ? filtered : competitorProducts;
  }, [competitorProducts, config.competitorIds]);

  const reportProducts = React.useMemo(
    () => (recommended ? [recommended, ...includedCompetitors] : includedCompetitors),
    [recommended, includedCompetitors],
  );

  const summaries: ProductReviewSummary[] = React.useMemo(
    () => (reviewSource ? summarizeSelection(reviewSource, reportProducts) : []),
    [reviewSource, reportProducts],
  );

  const daikinSummary = summaries.find((s) => s.product.id === recommended?.id) ?? null;

  const alignments = React.useMemo(
    () =>
      recommended ? alignPriorities(config.priorities, recommended, includedCompetitors, daikinSummary) : [],
    [recommended, config.priorities, includedCompetitors, daikinSummary],
  );

  const reasons = React.useMemo(
    () => (recommended ? buildRecommendationReasons(result, recommended, config.priorities, daikinSummary) : []),
    [result, recommended, config.priorities, daikinSummary],
  );

  const narrative = React.useMemo(
    () => (summaries.length ? buildReviewNarrative(summaries) : ""),
    [summaries],
  );

  const tons = recommended ? unitSelections[recommended.id] : undefined;
  const hasReviewData = summaries.some((s) => s.count > 0);
  const wantsCold = config.priorities.includes("cold");

  const on = (key: ReportSectionKey) => config.sections[key];

  /* ---- report as an ordered list of slides, shared with Presentation Mode ---- */
  const slides: ReportSlide[] = React.useMemo(() => {
    if (!recommended) return [];
    const list: ReportSlide[] = [];

    if (config.priorities.length) {
      list.push({
        key: "priorities",
        title: "What matters to you",
        node: (
          <SectionShell
            eyebrow="Your priorities"
            title="What matters most in your home"
            intro="Everything in this comparison is organised around these."
          >
            <ul className="flex flex-wrap gap-3">
              {config.priorities.map((k) => (
                <li
                  key={k}
                  className="rounded-2xl border-2 border-daikin-300 bg-daikin-50 px-5 py-3 text-lg font-bold text-daikin-900"
                >
                  {PRIORITY_BY_KEY[k]?.label ?? k}
                </li>
              ))}
            </ul>
          </SectionShell>
        ),
      });
    }

    if (on("recommendation")) {
      list.push({
        key: "recommendation",
        title: "Our recommendation",
        node: (
          <RecommendationSection
            recommended={recommended}
            tons={tons}
            reasons={reasons}
            priorities={config.priorities}
          />
        ),
      });
    }

    if (on("fit") && alignments.length) {
      list.push({ key: "fit", title: "Why it fits", node: <PriorityFitSection alignments={alignments} /> });
    }

    if (on("benefits")) {
      list.push({
        key: "benefits",
        title: "Comfort benefits",
        node: <ComfortBenefitsSection daikin={recommended} />,
      });
      list.push({
        key: "comfort-overview",
        title: "Comfort at a glance",
        node: <ComfortBenefitsOverview products={reportProducts} />,
      });
      // Air-to-water only: renders nothing when no brochure is registered.
      if (brochureFeaturesFor(recommended)) {
        list.push({
          key: "brochure-capabilities",
          title: "Installation and controls",
          node: <BrochureCapabilitiesSection daikin={recommended} />,
        });
      }
    }

    if (on("comparison") && includedCompetitors.length) {
      list.push({
        key: "comparison",
        title: "Simple comparison",
        node: (
          <SimpleComparisonSection
            daikin={recommended}
            competitors={includedCompetitors}
            onViewTechnical={on("technical") ? onViewTechnical : undefined}
          />
        ),
      });
    }

    if (on("reviews") && reviewSource) {
      list.push({
        key: "reviews",
        title: "What homeowners are saying",
        node: (
          <HomeownerReviewsSection
            source={reviewSource}
            summaries={summaries}
            narrative={narrative}
            showExcerpts={on("reviewExcerpts")}
            showThemes={on("reviewThemes")}
            showConcerns={on("reviewConcerns")}
            onViewMore={onViewReviews}
          />
        ),
      });
    }

    if (on("quiet")) {
      list.push({ key: "quiet", title: "Quiet operation", node: <SoundChart products={reportProducts} /> });
    }
    if (on("efficiency")) {
      list.push({
        key: "efficiency",
        title: "Energy and performance",
        node: <EfficiencyChart products={reportProducts} />,
      });
    }
    if (on("cold") && wantsCold) {
      list.push({
        key: "cold",
        title: "Cold-weather performance",
        node: <OperatingRangeChart products={reportProducts} />,
      });
    }
    if (on("warranty")) {
      list.push({
        key: "warranty",
        title: "Reliability and warranty",
        node: <WarrantyChart products={reportProducts} />,
      });
    }
    if (on("smart")) {
      list.push({
        key: "smart",
        title: "Smart features and service",
        node: <FeatureComparison products={reportProducts} />,
      });
    }

    if (on("differences") && includedCompetitors.length) {
      list.push({
        key: "differences",
        title: "Important differences",
        node: (
          <ImportantDifferencesSection
            result={result}
            daikin={recommended}
            competitors={includedCompetitors}
            summaries={summaries}
          />
        ),
      });
    }

    if (on("faq")) {
      list.push({
        key: "faq",
        title: "Questions",
        node: (
          <FaqSection
            daikin={recommended}
            competitors={includedCompetitors}
            summaries={summaries}
            result={result}
          />
        ),
      });
    }

    if (on("plainEnglish")) {
      list.push({
        key: "plain",
        title: "Why this recommendation",
        node: (
          <PlainEnglishSection
            daikin={recommended}
            tons={tons}
            result={result}
            alignments={alignments}
            summaries={summaries}
          />
        ),
      });
    }

    list.push({
      key: "final",
      title: "Final recommendation",
      node: (
        <FinalRecommendationSection
          daikin={recommended}
          tons={tons}
          config={config}
          reasonCount={reasons.length}
        />
      ),
    });

    return list.filter((s) => s.node !== null);
  }, [
    recommended,
    config,
    tons,
    reasons,
    alignments,
    includedCompetitors,
    reportProducts,
    reviewSource,
    summaries,
    narrative,
    result,
    wantsCold,
    onViewTechnical,
    onViewReviews,
  ]);

  /* ---------------------------------------------------------------- */

  if (!recommended) {
    return (
      <div className="rounded-3xl border border-dashed border-edge bg-white p-12 text-center">
        <FileText className="mx-auto size-8 text-navy-300" aria-hidden />
        <h2 className="mt-3 text-xl font-bold text-navy-900">No Daikin product selected</h2>
        <p className="mx-auto mt-2 max-w-md text-base text-navy-500">
          Homeowner View builds a recommendation around a Daikin system. Add one to the comparison to
          continue.
        </p>
      </div>
    );
  }

  if (presenting) {
    return <PresentationMode slides={slides} onExit={() => setPresenting(false)} />;
  }

  function emailBody(): string {
    const lines = [
      `Your Home Comfort Comparison${config.homeownerName ? ` — prepared for ${config.homeownerName}` : ""}`,
      "",
      `Recommended system: ${recommended!.brand} ${recommended!.model}${tons ? ` — ${tons} Ton` : ""}`,
      config.location ? `Location: ${config.location}` : "",
      `Report date: ${formatDate(config.generatedAt ?? new Date().toISOString())}`,
      "",
      "WHY IT STANDS OUT",
      ...(reasons.length
        ? reasons.map((r) => `• ${r.title} — ${r.body}`)
        : ["• No single specification advantage stands out in this comparison."]),
      "",
      ...(hasReviewData
        ? ["WHAT HOMEOWNERS ARE SAYING", narrative, ""]
        : ["WHAT HOMEOWNERS ARE SAYING", "No approved user-review data available for the compared products.", ""]),
      "IMPORTANT DIFFERENCES TO CONSIDER",
      ...(result.gaps.length
        ? result.gaps.map(
            (g) =>
              `• ${g.attributeLabel}: ${g.leadingProduct.brand} ${g.leadingProduct.model} lists ${g.leadingValue.display} against ${g.affectedValue.display}.`,
          )
        : ["• No compared product leads on a published figure in this comparison."]),
      "",
      config.personalNote ? `A note from ${config.repName || "your representative"}:\n${config.personalNote}\n` : "",
      config.dealerName ? `${config.dealerName}` : "",
      config.dealerContact,
      config.repName ? `${config.repName}` : "",
      config.repContact,
      "",
      HOMEOWNER_DISCLAIMER,
      hasReviewData ? `\n${REVIEW_DISCLAIMER}` : "",
    ];
    return lines.filter((l) => l !== "").join("\n");
  }

  function shareLink(): string {
    const params = new URLSearchParams({
      products: reportProducts.map((p) => p.id).join(","),
      rec: recommended!.id,
      priorities: config.priorities.join(","),
      sections: REPORT_SECTIONS.filter((s) => config.sections[s.key]).map((s) => s.key).join(","),
    });
    if (config.homeownerName) params.set("for", config.homeownerName);
    if (config.dealerName) params.set("dealer", config.dealerName);
    if (config.repName) params.set("rep", config.repName);
    if (Object.keys(unitSelections).length) params.set("units", JSON.stringify(unitSelections));
    return `${window.location.origin}/report?${params.toString()}`;
  }

  return (
    <div className="space-y-10" ref={reportRef}>
      {/* Action bar */}
      <div className="no-print flex flex-wrap items-center gap-2 rounded-2xl border border-edge bg-white p-4 shadow-card">
        <Button onClick={() => setSetupOpen(true)}>
          <FileText aria-hidden />
          {generated ? "Edit homeowner report" : "Create homeowner report"}
        </Button>
        <Button variant="secondary" onClick={() => setPresenting(true)}>
          <MonitorPlay aria-hidden />
          Present to homeowner
        </Button>
        <Button variant="secondary" onClick={() => setControlsOpen(true)}>
          <SlidersHorizontal aria-hidden />
          Sections
          <Badge variant="neutral" size="sm">
            {REPORT_SECTIONS.filter((s) => config.sections[s.key]).length}/{REPORT_SECTIONS.length}
          </Badge>
        </Button>
        <div className="flex-1" />
        <Button variant="secondary" onClick={() => window.print()}>
          <Printer aria-hidden />
          Print
        </Button>
        <Button
          variant="secondary"
          onClick={() => {
            notify("Opening the print dialog — choose “Save as PDF” as the destination.", "info");
            window.setTimeout(() => window.print(), 400);
          }}
        >
          <FileDown aria-hidden />
          Save as PDF
        </Button>
        <Button variant="secondary" onClick={() => setShareOpen(true)}>
          <Link2 aria-hidden />
          Share
        </Button>
      </div>

      {reviewsLoading && (
        <p className="no-print rounded-xl bg-navy-50 px-4 py-3 text-sm text-navy-500">
          Loading customer review data…
        </p>
      )}

      {/* The report */}
      <ReportCover config={config} recommended={recommended} tons={tons} />

      {slides.map((slide) => (
        <React.Fragment key={slide.key}>{slide.node}</React.Fragment>
      ))}

      <SupportingInformation products={reportProducts} summaries={summaries} source={reviewSource} />

      {on("reviewDisclaimer") ? <Disclaimers includeReview={hasReviewData} /> : <Disclaimers includeReview={false} />}

      {/* Dialogs */}
      <ReportSetupDialog
        open={setupOpen}
        onOpenChange={setSetupOpen}
        daikinProducts={daikinProducts}
        competitorProducts={competitorProducts}
        unitSelections={unitSelections}
        onGenerate={() => {
          markGenerated();
          setSetupOpen(false);
          setView("homeowner");
          notify("Homeowner report updated", "success");
          // Auto-scroll to report after a brief delay to let dialog close
          setTimeout(() => {
            reportRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
          }, 300);
        }}
      />

      <Dialog open={controlsOpen} onOpenChange={setControlsOpen}>
        <DialogContent className="max-w-lg">
          <DialogTitle>Sections to include</DialogTitle>
          <DialogDescription>
            Choose what the homeowner sees. Specifications, ratings, review text, review counts and themes
            cannot be edited — only shown or hidden.
          </DialogDescription>

          <ul className="mt-4 space-y-1">
            {REPORT_SECTIONS.map((s) => (
              <li key={s.key}>
                <label className="flex min-h-[44px] cursor-pointer items-center gap-3 rounded-lg px-2 hover:bg-navy-50">
                  <Checkbox
                    checked={config.sections[s.key]}
                    onCheckedChange={() => toggleSection(s.key)}
                    aria-label={s.label}
                  />
                  <span className="text-[0.9375rem] text-navy-800">{s.label}</span>
                </label>
              </li>
            ))}
          </ul>

          <p className="mt-4 flex items-start gap-2 rounded-xl bg-navy-50 p-3.5 text-sm leading-relaxed text-navy-600">
            <Info className="mt-0.5 size-4 shrink-0" aria-hidden />
            Hiding the concerns or review sections removes them from the homeowner's copy. Consider whether a
            balanced report is more persuasive than a filtered one.
          </p>

          <div className="mt-5 flex justify-end">
            <Button onClick={() => setControlsOpen(false)}>Done</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={shareOpen} onOpenChange={setShareOpen}>
        <DialogContent className="max-w-lg">
          <DialogTitle>Share this report</DialogTitle>
          <DialogDescription>
            The shared version contains only the homeowner-facing sections. Internal analysis, marketing
            takeaways and source-evidence references are never included.
          </DialogDescription>

          <div className="mt-5 space-y-4">
            <div>
              <Label htmlFor="share-dealer-contact">Dealer contact details</Label>
              <Textarea
                id="share-dealer-contact"
                value={config.dealerContact}
                onChange={(e) => update({ dealerContact: e.target.value })}
                placeholder="Phone, email, address"
                className="mt-1.5 min-h-[72px]"
              />
            </div>
            <div>
              <Label htmlFor="share-rep-contact">Representative contact details</Label>
              <Input
                id="share-rep-contact"
                value={config.repContact}
                onChange={(e) => update({ repContact: e.target.value })}
                placeholder="Phone or email"
                className="mt-1.5"
              />
            </div>

            <div className="grid gap-2 sm:grid-cols-2">
              <Button
                variant="secondary"
                onClick={async () => {
                  const ok = await copyText(shareLink());
                  notify(ok ? "Read-only link copied." : "Could not access the clipboard.", ok ? "success" : "warning");
                }}
              >
                <Link2 aria-hidden />
                Copy read-only link
              </Button>
              <Button
                variant="secondary"
                onClick={async () => {
                  const ok = await copyText(emailBody());
                  notify(ok ? "Email-ready version copied." : "Could not access the clipboard.", ok ? "success" : "warning");
                }}
              >
                <Mail aria-hidden />
                Copy email version
              </Button>
              <Button
                variant="secondary"
                onClick={async () => {
                  const summary = reasons.length
                    ? `${recommended.brand} ${recommended.model}${tons ? ` — ${tons} Ton` : ""}\n\n${reasons.map((r) => `• ${r.title}: ${r.body}`).join("\n")}`
                    : `${recommended.brand} ${recommended.model}${tons ? ` — ${tons} Ton` : ""}\n\nNo single specification advantage stands out in this comparison.`;
                  const ok = await copyText(`${summary}\n\n${HOMEOWNER_DISCLAIMER}`);
                  notify(ok ? "Recommendation summary copied." : "Could not access the clipboard.", ok ? "success" : "warning");
                }}
              >
                <ClipboardCopy aria-hidden />
                Copy recommendation
              </Button>
              <Button variant="secondary" onClick={() => window.print()}>
                <FileDown aria-hidden />
                Save as PDF
              </Button>
            </div>

            <div className="rounded-xl bg-navy-50 p-3.5">
              <p className="text-xs font-bold uppercase tracking-wider text-navy-400">Read-only link</p>
              <p className="mt-1 break-all font-mono text-xs text-navy-600">{shareLink()}</p>
            </div>
          </div>

          <div className="mt-5 flex justify-end">
            <Button onClick={() => setShareOpen(false)}>Done</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
