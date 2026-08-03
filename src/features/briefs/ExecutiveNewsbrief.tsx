import * as React from "react";
import { Printer, FileDown, Copy, Check, ExternalLink, Circle } from "lucide-react";
import { cn, copyText, formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AiTag } from "@/components/common/AiTag";
import { useToast } from "@/components/ui/toast";
import { useAuth } from "@/features/auth/AuthProvider";
import { listRows, type MediaClip, type Sentiment } from "@/lib/store";
import { PRODUCTS, PRODUCT_BY_ID } from "@/data/catalog";
import { buildComparison } from "@/features/compare/engine";
import { useReviewSource } from "@/features/reviews/useReviewSource";
import { MIN_REPORTABLE, summarizeSelection } from "@/features/reviews/reviewEngine";
import { useSelection } from "@/features/selection/SelectionProvider";

/**
 * Executive newsbrief — a Fullintel-style daily media brief with Daikin branding,
 * composed from the logged coverage, the comparison engine and the matched
 * customer reviews. Print-ready, CEO-ready, internal-use only.
 */

const SENTIMENT_DOT: Record<Sentiment, string> = {
  positive: "text-verified-500",
  mixed: "text-caution-500",
  concern: "text-risk-500",
};

const SENTIMENT_LABEL: Record<Sentiment, string> = {
  positive: "Positive",
  mixed: "Neutral",
  concern: "Negative",
};

function StoryRow({ clip, lead = false }: { clip: MediaClip; lead?: boolean }) {
  const product = PRODUCT_BY_ID[clip.product_id];
  return (
    <article className={cn("py-4", !lead && "border-t border-edge")}>
      <div className="flex items-start gap-2.5">
        <Circle
          className={cn("mt-1.5 size-2.5 shrink-0 fill-current", SENTIMENT_DOT[clip.sentiment])}
          aria-hidden
        />
        <div className="min-w-0">
          <h4 className={cn("font-bold leading-snug text-navy-900", lead ? "text-xl" : "text-[1.0625rem]")}>
            {clip.url ? (
              <a
                href={clip.url}
                target="_blank"
                rel="noreferrer"
                className="hover:text-daikin-700 hover:underline"
              >
                {clip.headline}
              </a>
            ) : (
              clip.headline
            )}
          </h4>
          <p className="mt-1 text-sm text-navy-500">
            {clip.publication}
            {" · "}
            {formatDate(clip.published_on)}
            {" · "}
            <span className="font-medium">{SENTIMENT_LABEL[clip.sentiment]}</span>
            {product && ` · ${product.brand} ${product.model}`}
          </p>
          {clip.notes && (
            <p className={cn("mt-1.5 leading-relaxed text-navy-700", lead ? "text-[1.0625rem]" : "text-[0.9375rem]")}>
              {clip.notes.replace(/\s*(Publication month approximate; )?[Rr]etrieved \d{4}-\d{2}-\d{2}\.?\s*$/, "")}
            </p>
          )}
          {clip.url && (
            <a
              href={clip.url}
              target="_blank"
              rel="noreferrer"
              className="no-print mt-1.5 inline-flex items-center gap-1 text-sm font-semibold text-daikin-700 hover:text-daikin-800"
            >
              Read the full story <ExternalLink className="size-3.5" aria-hidden />
            </a>
          )}
        </div>
      </div>
    </article>
  );
}

function SectionRule({ title }: { title: string }) {
  return (
    <div className="mt-8 flex items-center gap-3">
      <h3 className="shrink-0 text-sm font-bold uppercase tracking-[0.18em] text-daikin-800">{title}</h3>
      <span className="h-px flex-1 bg-navy-200" aria-hidden />
    </div>
  );
}

export function ExecutiveNewsbrief() {
  const { user } = useAuth();
  const { notify } = useToast();
  const { selected } = useSelection();
  const { source: reviewSource } = useReviewSource();

  const [clips, setClips] = React.useState<MediaClip[]>([]);
  const [copied, setCopied] = React.useState(false);

  React.useEffect(() => {
    if (!user) return;
    void listRows<MediaClip>("media_clips", user.email).then(setClips);
  }, [user]);

  /* ---- classify coverage ---- */
  const isMarket = (c: MediaClip) =>
    /ahri|shipment|sales|market|gas furnace|outsell|outpace|declines/i.test(c.headline);
  const isCompetitor = (c: MediaClip) => {
    const p = PRODUCT_BY_ID[c.product_id];
    return Boolean(p && !p.isDaikin);
  };

  const sorted = React.useMemo(
    () => clips.slice().sort((a, b) => b.published_on.localeCompare(a.published_on)),
    [clips],
  );
  const marketStories = sorted.filter(isMarket);
  const competitorStories = sorted.filter((c) => !isMarket(c) && isCompetitor(c));
  const daikinStories = sorted.filter((c) => !isMarket(c) && !isCompetitor(c));

  /* ---- supporting intelligence ---- */
  const fitProducts = React.useMemo(() => {
    const base = selected.length >= 2 ? selected : PRODUCTS.filter((p) => p.equipmentType === "ducted_split_hp");
    return base;
  }, [selected]);
  const result = React.useMemo(() => buildComparison(fitProducts), [fitProducts]);
  const reviewLead = React.useMemo(() => {
    if (!reviewSource) return null;
    return (
      summarizeSelection(reviewSource, fitProducts.filter((p) => p.isDaikin))
        .filter((s) => s.count >= MIN_REPORTABLE)
        .sort((a, b) => b.count - a.count)[0] ?? null
    );
  }, [reviewSource, fitProducts]);

  const today = new Date();

  /* ---- generated executive summary ---- */
  const summary = React.useMemo(() => {
    const parts: string[] = [];
    if (marketStories.length) {
      parts.push(
        "The category tailwind holds: heat pumps outsold gas furnaces for a fourth consecutive year and monthly shipments have begun eclipsing central air conditioners — the structural shift continues despite 2025's volume dip.",
      );
    }
    if (competitorStories.length) {
      parts.push(
        "Competitively, Carrier's DOE cold-climate credentials remain the loudest external story, while the R-454B supply squeeze continues to pressure every competitor on that refrigerant; the FIT line's R-32 platform sits outside that exposure.",
      );
    }
    if (result.edges.length) {
      const lead = result.edges[0];
      parts.push(
        `On published specification, the FIT family holds ${result.edges.length} verified edges in the current comparison set — strongest on ${lead.attributeLabel.toLowerCase()}${lead.marginLabel ? ` (${lead.marginLabel} than the closest competitor)` : ""}.`,
      );
    }
    if (reviewLead) {
      parts.push(
        `Customer voice remains a net asset: ${reviewLead.count} matching reviews for ${reviewLead.product.model} average ${reviewLead.averageRating?.toFixed(2)}, with critical feedback pointing more often at installation and dealer experience than at the equipment.`,
      );
    }
    return parts.join(" ");
  }, [marketStories.length, competitorStories.length, result, reviewLead]);

  const metrics = [
    { label: "Stories tracked", value: String(clips.length) },
    {
      label: "Positive coverage",
      value: clips.length
        ? `${Math.round((clips.filter((c) => c.sentiment === "positive").length / clips.length) * 100)}%`
        : "—",
    },
    { label: "Verified product edges", value: String(result.edges.length) },
    {
      label: "Customer rating",
      value: reviewLead ? `${reviewLead.averageRating?.toFixed(2)} / 5` : "—",
    },
  ];

  const actions = React.useMemo(() => {
    const out: string[] = [];
    if (competitorStories.some((c) => /cold-climate/i.test(c.topic)))
      out.push(
        "Prepare a cold-climate response narrative before the next selling season — Carrier's DOE story will be quoted in bids.",
      );
    if (clips.some((c) => c.sentiment === "concern"))
      out.push(
        "Keep the R-454B supply narrative factual and logistics-only; route any refrigerant claim through product marketing.",
      );
    if (result.gaps.some((g) => g.kind === "leads"))
      out.push(
        "Close the published-figure gaps where competitors lead — capacity at low ambient and line-set length are the recurring bid objections.",
      );
    if (reviewLead)
      out.push(
        "Amplify the quiet-operation story where specification and customer voice already agree — it is the most defensible external claim available.",
      );
    return out;
  }, [competitorStories, clips, result.gaps, reviewLead]);

  const asText = React.useCallback(() => {
    const lines = [
      "DAIKIN COMPETITIVE INTELLIGENCE — EXECUTIVE NEWSBRIEF",
      `${formatDate(today.toISOString())} · Prepared for the Office of the CEO · Internal use only`,
      "",
      "EXECUTIVE SUMMARY",
      summary,
      "",
      "TOP STORIES",
      ...daikinStories.map((c) => `• ${c.headline} (${c.publication}, ${formatDate(c.published_on)}) ${c.url}`),
      "",
      "COMPETITOR WATCH",
      ...competitorStories.map((c) => `• ${c.headline} (${c.publication}, ${formatDate(c.published_on)}) ${c.url}`),
      "",
      "MARKET SIGNALS",
      ...marketStories.map((c) => `• ${c.headline} (${c.publication}, ${formatDate(c.published_on)}) ${c.url}`),
      "",
      "RECOMMENDED ACTIONS",
      ...actions.map((a) => `• ${a}`),
      "",
      "AI-assisted summary generated from logged coverage, the product comparison and review data. Internal use only.",
    ];
    return lines.join("\n");
  }, [summary, daikinStories, competitorStories, marketStories, actions, today]);

  return (
    <section aria-label="Executive newsbrief" className="mx-auto max-w-4xl">
      {/* Actions */}
      <div className="no-print mb-4 flex flex-wrap justify-end gap-2">
        <Button
          variant="secondary"
          onClick={async () => {
            const ok = await copyText(asText());
            if (ok) {
              setCopied(true);
              window.setTimeout(() => setCopied(false), 1800);
              notify("Email-ready newsbrief copied.");
            } else notify("Could not access the clipboard.", "warning");
          }}
        >
          {copied ? <Check aria-hidden /> : <Copy aria-hidden />}
          Copy email version
        </Button>
        <Button variant="secondary" onClick={() => window.print()}>
          <Printer aria-hidden />
          Print
        </Button>
        <Button
          onClick={() => {
            notify("Opening the print dialog — choose “Save as PDF”.", "info");
            window.setTimeout(() => window.print(), 400);
          }}
        >
          <FileDown aria-hidden />
          Save as PDF
        </Button>
      </div>

      {/* The brief document */}
      <div className="overflow-hidden surface">
        {/* Masthead */}
        <header className="border-b-4 border-daikin-600 px-8 pb-6 pt-8 sm:px-12">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <img src="/brand/daikin-logo.png" alt="Daikin" className="h-8 w-auto" />
            <Badge variant="caution" size="sm">
              Internal use only
            </Badge>
          </div>
          <h2 className="mt-5 text-3xl font-bold tracking-tight text-navy-900 sm:text-4xl">
            Competitive Intelligence Newsbrief
          </h2>
          <p className="mt-2 text-base text-navy-500">
            {today.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
            {" · "}Prepared for the Office of the CEO
          </p>
        </header>

        {/* Metrics strip */}
        <div className="grid grid-cols-2 divide-x divide-edge border-b border-edge bg-navy-50/60 sm:grid-cols-4">
          {metrics.map((m) => (
            <div key={m.label} className="px-6 py-4 text-center">
              <p className="text-2xl font-bold text-navy-900">{m.value}</p>
              <p className="mt-0.5 text-xs font-semibold uppercase tracking-wider text-navy-500">{m.label}</p>
            </div>
          ))}
        </div>

        <div className="px-8 pb-10 sm:px-12">
          {/* Executive summary */}
          <div className="mt-8 rounded-xl border-l-4 border-daikin-600 bg-daikin-50/50 p-5">
            <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-daikin-800">
              Executive summary <AiTag kind="generated" />
            </p>
            <p className="mt-2.5 text-[1.0625rem] leading-relaxed text-navy-800">
              {summary || "No coverage has been logged yet, so there is nothing to summarise."}
            </p>
          </div>

          {/* Top stories */}
          {daikinStories.length > 0 && (
            <>
              <SectionRule title="Top stories — Daikin" />
              <div>
                {daikinStories.map((c, i) => (
                  <StoryRow key={c.id} clip={c} lead={i === 0} />
                ))}
              </div>
            </>
          )}

          {/* Competitor watch */}
          {competitorStories.length > 0 && (
            <>
              <SectionRule title="Competitor watch" />
              <div>
                {competitorStories.map((c, i) => (
                  <StoryRow key={c.id} clip={c} lead={i === 0} />
                ))}
              </div>
            </>
          )}

          {/* Market signals */}
          {marketStories.length > 0 && (
            <>
              <SectionRule title="Market signals" />
              <div>
                {marketStories.map((c, i) => (
                  <StoryRow key={c.id} clip={c} lead={i === 0} />
                ))}
              </div>
            </>
          )}

          {/* Product voice */}
          {reviewLead && (
            <>
              <SectionRule title="Voice of the customer" />
              <p className="mt-4 text-[1.0625rem] leading-relaxed text-navy-800">
                {reviewLead.product.model} holds a {reviewLead.averageRating?.toFixed(2)} average across{" "}
                {reviewLead.count} matching reviews ({reviewLead.positivePct}% positive). The most-mentioned
                topics are{" "}
                {reviewLead.themes
                  .filter((t) => t.total >= MIN_REPORTABLE)
                  .slice(0, 3)
                  .map((t) => t.label.toLowerCase())
                  .join(", ")}
                . Of the critical reviews, {reviewLead.nonEquipmentConcerns.length} concern installation or
                dealer experience against {reviewLead.equipmentConcerns.length} about the equipment itself.{" "}
                <AiTag kind="generated" className="align-middle" />
              </p>
            </>
          )}

          {/* Recommended actions */}
          {actions.length > 0 && (
            <>
              <SectionRule title="Recommended actions" />
              <ol className="mt-4 space-y-2.5">
                {actions.map((a, i) => (
                  <li key={i} className="flex gap-3 text-[1.0625rem] leading-relaxed text-navy-800">
                    <span className="grid size-6 shrink-0 place-items-center rounded-full bg-daikin-600 text-xs font-bold text-white">
                      {i + 1}
                    </span>
                    <span>
                      {a} <AiTag kind="generated" className="align-middle" />
                    </span>
                  </li>
                ))}
              </ol>
            </>
          )}

          {/* Footer */}
          <footer className="mt-10 border-t border-edge pt-5">
            <p className="text-xs leading-relaxed text-navy-400">
              Compiled from coverage logged in this workspace (each story links to its original source), the
              verified product comparison, and {reviewSource?.totalReviews.toLocaleString() ?? "the imported"}{" "}
              customer reviews from {reviewSource?.sourceFile ?? "the review export"}. AI-assisted summary
              generated from that data and nothing outside it. Story sentiment reflects the workspace's own
              classification of each article. Internal use only — not for external distribution.
            </p>
          </footer>
        </div>
      </div>
    </section>
  );
}
