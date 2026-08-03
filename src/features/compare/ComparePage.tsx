import * as React from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  X,
  Printer,
  FileDown,
  ClipboardCopy,
  Presentation,
  Bookmark,
  ShieldCheck,
  TriangleAlert,
  Layers,
  Gauge,
  Trophy,
  Volume2,
  ShieldPlus,
  Snowflake,
  Wrench,
  Sparkles,
  ArrowLeft,
  Users,
} from "lucide-react";
import { cn, copyText, UNAVAILABLE } from "@/lib/utils";
import type { Product } from "@/data/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input, Label, Textarea } from "@/components/ui/input";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast";
import { ProductVisual } from "@/components/common/ProductVisual";
import { ValueText } from "@/components/common/Provenance";
import { useSelection, MIN_COMPARE } from "@/features/selection/SelectionProvider";
import { useAuth } from "@/features/auth/AuthProvider";
import { useAiAdvisor } from "@/features/ai/AiAdvisorProvider";
import { insertRow, type SavedComparison } from "@/lib/store";
import { buildComparison, buildScorecards } from "./engine";
import { PositioningSummary } from "./PositioningSummary";
import { AiCompetitiveInsights } from "./AiInsights";
import { AiTag } from "@/components/common/AiTag";
import { ComparisonCharts } from "./ComparisonCharts";
import { FeatureTable } from "./FeatureTable";
import { MarketingTakeaways, buildTakeaways } from "./MarketingTakeaways";
import { ProductSearch } from "@/features/selection/ProductSearch";
import { useHomeowner } from "@/features/homeowner/HomeownerProvider";
import { HomeownerView } from "@/features/homeowner/HomeownerView";
import { useMergedReviewSource } from "@/features/reviews/useMergedReviewSource";
import { ReviewIntelligence, ReviewAnalyticalCharts } from "@/features/reviews/ReviewIntelligence";
import { ReviewDrawer, useReviewDrawer } from "@/features/reviews/ReviewDrawer";
import { ViewToggle } from "./ViewToggle";
import { summarizeSelection } from "@/features/reviews/reviewEngine";
import type { ReviewSource } from "@/data/review-types";
import { PageHeader } from "@/components/layout/PageHeader";

/** Review summaries for the drawer, memoized per source + selection by React. */
function summarizeForDrawer(source: ReviewSource, products: Product[]) {
  return summarizeSelection(source, products);
}

const SCORECARD_ICON: Record<string, React.ComponentType<{ className?: string }>> = {
  efficiency: Gauge,
  quietest: Volume2,
  warranty: ShieldPlus,
  cold: Snowflake,
  install: Wrench,
  lead: Trophy,
};

export function ComparePage() {
  const { selected, remove, unitSelections, recordComparison } = useSelection();
  const { user } = useAuth();
  const { open: openAi } = useAiAdvisor();
  const { notify } = useToast();
  const navigate = useNavigate();

  const { view, setView } = useHomeowner();
  const { source: reviewSource, loading: reviewsLoading } = useMergedReviewSource();
  const reviewDrawer = useReviewDrawer();

  const [presentation, setPresentation] = React.useState(false);
  const [saveOpen, setSaveOpen] = React.useState(false);
  const [saveName, setSaveName] = React.useState("");
  const [saveScenario, setSaveScenario] = React.useState("");
  const [saveAudience, setSaveAudience] = React.useState("Dealer");
  const [saving, setSaving] = React.useState(false);

  const result = React.useMemo(() => buildComparison(selected), [selected]);
  const scorecards = React.useMemo(() => buildScorecards(selected, result), [selected, result]);

  React.useEffect(() => {
    if (selected.length >= MIN_COMPARE) recordComparison();
  }, [selected.length, recordComparison]);

  React.useEffect(() => {
    if (!presentation) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setPresentation(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [presentation]);

  if (selected.length < MIN_COMPARE) {
    return (
      <div className="space-y-6">
        <PageHeader
          eyebrow="Compare products"
          title="Where Daikin wins — and where to improve."
          description={`Select at least ${MIN_COMPARE} products to run a comparison. You currently have ${selected.length}.`}
        />
        <div className="surface p-6">
          <ProductSearch size="md" />
        </div>
        <div className="flex gap-3">
          <Button asChild variant="secondary">
            <Link to="/dashboard">
              <ArrowLeft aria-hidden />
              Back to the comparison builder
            </Link>
          </Button>
          <Button asChild variant="ghost">
            <Link to="/explorer">Browse all products</Link>
          </Button>
        </div>
      </div>
    );
  }

  function buildSummaryText(): string {
    const takeaways = buildTakeaways(selected, result);
    const lines: string[] = [
      "DAIKIN COMPETITIVE MARKETING INTELLIGENCE — COMPARISON SUMMARY",
      `Generated ${new Date().toLocaleString("en-US")}`,
      "",
      "SELECTED PRODUCTS",
      ...selected.map((p) => {
        const unit = unitSelections[p.id];
        // Air-to-water models are sized by rated capacity, not tonnage.
        const size = unit
          ? ` — ${unit} ton`
          : p.capacities
            ? ` — ${p.capacities.map((c) => `${c} kBtu/h`).join(", ")}`
            : "";
        return `• ${p.displayName}${size} (${p.equipmentTypeLabel})`;
      }),
      "",
      `VERIFIED DAIKIN EDGES (${result.edges.length})`,
      ...(result.edges.length
        ? result.edges.map((e) => `• ${e.attributeLabel}: ${e.headline}\n  Source: ${e.citation}`)
        : ["• None calculated for this selection."]),
      "",
      `IMPROVEMENT OPPORTUNITIES (${result.gaps.length})`,
      ...(result.gaps.length
        ? result.gaps.map((g) => `• ${g.attributeLabel}: ${g.headline}\n  Action: ${g.suggestedAction}\n  Source: ${g.citation}`)
        : ["• None calculated for this selection."]),
      "",
      `VALIDATION REQUIRED (${result.validations.length})`,
      ...(result.validations.length
        ? result.validations.map((v) => `• ${v.attributeLabel}: ${v.reason}`)
        : ["• None."]),
      "",
      "MARKETING TAKEAWAYS",
      ...takeaways.map(
        (t) => `[${t.kind}]${t.usage === "internal" ? " (INTERNAL USE ONLY)" : ""} ${t.text}${t.source ? `\n  Source: ${t.source}` : ""}`,
      ),
      "",
      `Data confidence: ${result.dataConfidence}% of attributes carry a verified source value across this selection.`,
      "Blank source cells are reported as “Information unavailable” and are never interpreted as “No”.",
    ];
    return lines.join("\n");
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    const name = saveName.trim() || `${selected.map((p) => p.model).join(" vs ")}`;
    setSaving(true);
    const now = new Date().toISOString();
    await insertRow<SavedComparison>("saved_comparisons", {
      owner_email: user.email,
      name,
      scenario: saveScenario.trim(),
      audience: saveAudience,
      product_ids: selected.map((p) => p.id),
      unit_selections: unitSelections,
      created_at: now,
      updated_at: now,
    });
    setSaving(false);
    setSaveOpen(false);
    setSaveName("");
    setSaveScenario("");
    notify(`Saved “${name}”.`);
    navigate("/saved");
  }

  const viewToggle = (
    <ViewToggle
      view={view}
      onChange={setView}
      homeownerDisabled={result.daikinProducts.length === 0}
    />
  );

  if (view === "homeowner") {
    return (
      <div className="space-y-8">
        <header className="no-print flex flex-wrap items-end justify-between gap-5">
          <div className="min-w-0">
            <p className="eyebrow">Homeowner view</p>
            <h1 className="mt-2.5 text-balance text-3xl font-bold leading-tight text-navy-900 sm:text-4xl">
              A comparison built for the living room.
            </h1>
            <p className="mt-2.5 max-w-3xl text-lg text-navy-500">
              The same products, units and evidence as the technical comparison — translated into plain
              language.
            </p>
          </div>
          {viewToggle}
        </header>

        <HomeownerView
          result={result}
          unitSelections={unitSelections}
          reviewSource={reviewSource}
          reviewsLoading={reviewsLoading}
          onViewTechnical={() => setView("internal")}
          onViewReviews={() => reviewDrawer.show()}
        />

        {reviewSource && (
          <ReviewDrawer
            open={reviewDrawer.open}
            onClose={reviewDrawer.hide}
            summaries={summarizeForDrawer(reviewSource, selected)}
            source={reviewSource}
            initialFilter={reviewDrawer.filter}
          />
        )}
      </div>
    );
  }

  return (
    <div className={cn("space-y-10", presentation && "text-[1.0625rem]")}>
      {presentation && (
        <div className="no-print sticky top-[4.5rem] z-20 flex items-center justify-between gap-3 rounded-xl border border-daikin-300 bg-daikin-600 px-4 py-2.5 text-white shadow-lift">
          <p className="flex items-center gap-2 text-sm font-semibold">
            <Presentation className="size-4" aria-hidden />
            Presentation mode — larger type, chrome reduced. Press Esc to exit.
          </p>
          <Button
            variant="ghost"
            size="sm"
            className="text-white hover:bg-white/15"
            onClick={() => setPresentation(false)}
          >
            Exit
          </Button>
        </div>
      )}

      <PageHeader
        eyebrow="Compare products"
        title="Where Daikin wins — and where to improve."
        description={`${selected.length} products compared across ${result.attributesCompared} attributes with a verified source value.`}
        actions={
          <Button size="lg" className="no-print" onClick={() => setSaveOpen(true)}>
            <Bookmark aria-hidden />
            Save comparison
          </Button>
        }
      >
        {/* View switch and tools are separated: the toggle changes what you are
            looking at, the toolbar acts on it. Every action stays visible —
            nothing moved behind an overflow menu. */}
        <div className="no-print flex flex-wrap items-center justify-between gap-3">
          {viewToggle}
          <div className="segmented flex-wrap gap-1">
            <Button variant="ghost" size="sm" onClick={() => setView("homeowner")} disabled={result.daikinProducts.length === 0}>
              <Users aria-hidden />
              Homeowner report
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setPresentation((v) => !v)} aria-pressed={presentation}>
              <Presentation aria-hidden />
              Present
            </Button>
            <Button variant="ghost" size="sm" onClick={openAi}>
              <Sparkles aria-hidden />
              Ask AI
            </Button>
            <span className="mx-0.5 h-6 w-px self-center bg-edge" aria-hidden />
            <Button
              variant="ghost"
              size="sm"
              onClick={async () => {
                const ok = await copyText(buildSummaryText());
                notify(ok ? "Comparison summary copied to clipboard." : "Could not access the clipboard.", ok ? "success" : "warning");
              }}
            >
              <ClipboardCopy aria-hidden />
              Copy summary
            </Button>
            <Button variant="ghost" size="sm" onClick={() => window.print()}>
              <Printer aria-hidden />
              Print
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                notify("Opening the print dialog — choose “Save as PDF” as the destination.", "info");
                window.setTimeout(() => window.print(), 400);
              }}
            >
              <FileDown aria-hidden />
              PDF
            </Button>
          </div>
        </div>
      </PageHeader>

      {/* Selected product summary cards */}
      <section aria-label="Selected product summary">
        <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {selected.map((p) => {
            const sound = p.attributes.sound_level ?? p.attributes.outdoor_sound;
            const isAtw = p.equipmentType === "air_to_water_hp";
            return (
              <li
                key={p.id}
                className={cn(
                  "relative rounded-2xl border p-5 shadow-card",
                  p.isDaikin ? "border-daikin-300 bg-daikin-50/50" : "border-edge bg-white",
                )}
              >
                <button
                  type="button"
                  onClick={() => remove(p.id)}
                  aria-label={`Remove ${p.displayName} from the comparison`}
                  className="no-print absolute right-2 top-2 inline-flex size-9 items-center justify-center rounded-lg text-navy-400 transition-colors hover:bg-white hover:text-risk-600"
                >
                  <X className="size-4" aria-hidden />
                </button>

                <ProductVisual product={p} size="lg" className="w-full" />

                <div className="mt-3.5">
                  <p className="text-sm font-semibold text-navy-500">{p.brand}</p>
                  <h2 className="text-lg font-bold leading-tight text-navy-900">{p.model}</h2>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {p.isDaikin && (
                      <Badge variant="daikin" size="sm">
                        Daikin
                      </Badge>
                    )}
                    {p.modelIsBrandLevel && (
                      <Badge variant="outline" size="sm">
                        Brand-level source row
                      </Badge>
                    )}
                  </div>
                </div>

                <dl className="mt-3.5 space-y-1.5 border-t border-edge pt-3 text-sm">
                  <div className="flex justify-between gap-3">
                    <dt className="text-navy-500">
                      {isAtw ? "Rated capacity" : "Selected unit"}
                    </dt>
                    <dd className="font-medium text-navy-800">
                      {isAtw
                        ? p.capacities
                          ? p.capacities.map((c) => `${c} kBtu/h`).join(", ")
                          : "Model-level only"
                        : unitSelections[p.id]
                          ? `${unitSelections[p.id]} ton`
                          : p.tonnages
                            ? "Not selected"
                            : "Model-level only"}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-navy-500">Refrigerant</dt>
                    <dd className="text-right"><ValueText value={p.attributes.refrigerant} /></dd>
                  </div>
                  {/* The hydronic sheet records COP at rated conditions, not SEER2. */}
                  <div className="flex justify-between gap-3">
                    <dt className="text-navy-500">{isAtw ? "COP (A44.6°F/W95°F)" : "SEER2"}</dt>
                    <dd className="text-right">
                      <ValueText value={isAtw ? p.attributes.cop_a446w95 : p.attributes.seer2} />
                    </dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-navy-500">Sound level</dt>
                    <dd className="text-right"><ValueText value={sound} /></dd>
                  </div>
                </dl>
              </li>
            );
          })}
        </ul>
      </section>

      {/* Four summary metrics */}
      <section aria-label="Comparison summary metrics" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          icon={ShieldCheck}
          tone="verified"
          value={String(result.edges.length)}
          label="Verified Daikin edges"
          detail="Attributes where a Daikin value beats every selected competitor that has a recorded value."
          targetId="verified-daikin-edges"
        />
        <MetricCard
          icon={TriangleAlert}
          tone="caution"
          value={String(result.gaps.length)}
          label="Improvement gaps"
          detail="Attributes where a selected competitor leads the strongest selected Daikin product."
          targetId="improvement-opportunities"
        />
        <MetricCard
          icon={Layers}
          tone="neutral"
          value={String(result.attributesCompared)}
          label="Attributes compared"
          detail="Attributes with at least one verified source value across the current selection."
          targetId="attributes-compared"
        />
        <MetricCard
          icon={Gauge}
          tone="daikin"
          value={`${result.dataConfidence}%`}
          label="Data confidence"
          detail="Share of all attribute cells in this selection that carry a verified source value."
        />
      </section>

      <AiCompetitiveInsights
        products={selected}
        result={result}
        reviewSource={reviewSource}
        onAsk={openAi}
      />

      <PositioningSummary result={result} />

      <FeatureTable products={selected} result={result} />

      {/* Scorecards */}
      <section aria-label="Key advantage scorecards" className="space-y-4">
        <header>
          <h2 className="text-2xl font-bold text-navy-900">Key advantage scorecards</h2>
          <p className="mt-1.5 max-w-4xl text-base text-navy-500">
            Each card names the actual leader from the selected source values. Where a competitor leads,
            the card says so.
          </p>
        </header>
        <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {scorecards.map((card) => {
            const Icon = SCORECARD_ICON[card.id] ?? Trophy;
            return (
              <li
                key={card.id}
                className={cn(
                  "rounded-2xl border p-5 shadow-card",
                  card.winner
                    ? card.isDaikin
                      ? "border-daikin-300 bg-daikin-50/60"
                      : "border-edge bg-white"
                    : "border-dashed border-edge bg-navy-50/40",
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-navy-500">
                    <Icon className="size-4" aria-hidden />
                    {card.title}
                  </p>
                  {card.winner && (
                    <Badge variant={card.isDaikin ? "daikin" : "neutral"} size="sm">
                      {card.isDaikin ? "Daikin" : "Competitor"}
                    </Badge>
                  )}
                </div>

                <p className="mt-3 text-xl font-bold leading-tight text-navy-900">
                  {card.winner ? card.winner.displayName : UNAVAILABLE}
                </p>
                <p className="mt-1 text-base font-semibold text-daikin-800">{card.value}</p>
                <p className="mt-2 text-sm leading-relaxed text-navy-500">
                  {card.detail} <AiTag kind="generated" className="align-middle" />
                </p>
                {card.citation && (
                  <p className="mt-3 border-t border-edge pt-2.5 text-xs leading-relaxed text-navy-400">
                    {card.citation}
                  </p>
                )}
              </li>
            );
          })}
        </ul>
      </section>

      <ComparisonCharts products={selected} result={result} />

      {reviewsLoading && (
        <p className="rounded-xl bg-navy-50 px-4 py-3 text-sm text-navy-500">
          Loading customer review data…
        </p>
      )}

      {reviewSource && (
        <>
          <ReviewIntelligence
            products={selected}
            source={reviewSource}
            onViewReviews={(f) => reviewDrawer.show(f)}
          />
          <ReviewAnalyticalCharts
            products={selected}
            source={reviewSource}
            onViewReviews={(f) => reviewDrawer.show(f)}
          />
        </>
      )}

      <MarketingTakeaways products={selected} result={result} />

      {reviewSource && (
        <ReviewDrawer
          open={reviewDrawer.open}
          onClose={reviewDrawer.hide}
          summaries={summarizeForDrawer(reviewSource, selected)}
          source={reviewSource}
          initialFilter={reviewDrawer.filter}
        />
      )}

      <Dialog open={saveOpen} onOpenChange={setSaveOpen}>
        <DialogContent>
          <DialogTitle>Save this comparison</DialogTitle>
          <DialogDescription>
            Saved comparisons keep the exact product selection and unit sizes, so you can reopen the same
            evidence later.
          </DialogDescription>

          <form className="mt-5 space-y-4" onSubmit={handleSave}>
            <div>
              <Label htmlFor="save-name">Name</Label>
              <Input
                id="save-name"
                value={saveName}
                onChange={(e) => setSaveName(e.target.value)}
                placeholder={selected.map((p) => p.model).join(" vs ")}
                className="mt-1.5"
              />
            </div>
            <div>
              <Label htmlFor="save-scenario">Scenario</Label>
              <Textarea
                id="save-scenario"
                value={saveScenario}
                onChange={(e) => setSaveScenario(e.target.value)}
                placeholder="e.g. Cold-climate retrofit bid, competitor quoting on seasonal efficiency"
                className="mt-1.5 min-h-[88px]"
              />
            </div>
            <div>
              <Label htmlFor="save-audience">Audience</Label>
              <select
                id="save-audience"
                value={saveAudience}
                onChange={(e) => setSaveAudience(e.target.value)}
                className="mt-1.5 h-12 w-full rounded-xl border border-edge bg-white px-3.5 text-base text-navy-900 focus:border-daikin-500 focus:outline-none focus:ring-2 focus:ring-daikin-500/25"
              >
                {["Homeowner", "Dealer", "Product marketing", "Executive"].map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <Button type="button" variant="ghost" onClick={() => setSaveOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                <Bookmark aria-hidden />
                {saving ? "Saving…" : "Save comparison"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function MetricCard({
  icon: Icon,
  value,
  label,
  detail,
  tone,
  targetId,
}: {
  icon: React.ComponentType<{ className?: string }>;
  value: string;
  label: string;
  detail: string;
  tone: "verified" | "caution" | "neutral" | "daikin";
  targetId?: string;
}) {
  const toneClass = {
    verified: "border-verified-500/25 bg-verified-50/70 text-verified-700",
    caution: "border-caution-500/25 bg-caution-50/70 text-caution-700",
    neutral: "border-edge bg-white text-navy-600",
    daikin: "border-daikin-200 bg-daikin-50/70 text-daikin-800",
  }[tone];

  const content = (
    <>
      <div className="flex items-center gap-2">
        <Icon className="size-5" aria-hidden />
        <p className="text-sm font-bold uppercase tracking-wider">{label}</p>
      </div>
      <p className="mt-3 text-4xl font-bold text-navy-900">{value}</p>
      <p className="mt-1.5 text-sm leading-relaxed text-navy-500">{detail}</p>
    </>
  );

  if (!targetId) {
    return <div className={cn("rounded-2xl border p-5 shadow-card", toneClass)}>{content}</div>;
  }

  return (
    <button
      type="button"
      onClick={() => {
        document.getElementById(targetId)?.scrollIntoView({ behavior: "smooth", block: "start" });
      }}
      className={cn(
        "rounded-2xl border p-5 text-left shadow-card transition-shadow hover:shadow-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-daikin-500/50",
        toneClass,
      )}
    >
      {content}
    </button>
  );
}
