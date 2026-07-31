import type { Product } from "@/data/types";
import type { ReviewSource } from "@/data/review-types";
import { buildComparison } from "@/features/compare/engine";
import { ATTRIBUTE_BY_KEY, coverageFor } from "@/data/catalog";
import {
  CONFIDENCE_LABEL,
  MIN_REPORTABLE,
  buildReviewNarrative,
  summarizeSelection,
  type Confidence,
  type ProductReviewSummary,
} from "@/features/reviews/reviewEngine";
import { UNAVAILABLE } from "@/lib/utils";

export type AnswerSectionKind =
  | "VERIFIED PRODUCT FACT"
  | "CALCULATED COMPARISON"
  | "REVIEW-BASED INSIGHT"
  | "AI ANALYTICAL INSIGHT"
  | "HOMEOWNER BENEFIT EXPLANATION"
  | "SUGGESTED MARKETING MESSAGE"
  | "SALES RECOMMENDATION"
  | "CLAIM REQUIRING VALIDATION"
  | "INFORMATION UNAVAILABLE";

export interface AnswerSection {
  kind: AnswerSectionKind;
  body: string;
  citations: string[];
  /** Present on every review-derived section. */
  evidence?: {
    reviewsAnalysed: number;
    matchLabel: string;
    confidence: Confidence;
    subjects: string;
    themes: string[];
  };
}

export interface AdvisorAnswer {
  sections: AnswerSection[];
}

export const INTERNAL_QUESTIONS = [
  "What are Daikin's strongest technical advantages?",
  "Which product has the strongest review evidence?",
  "What do customers mention most about quietness?",
  "Which concerns are product-related versus installation-related?",
  "Does customer feedback support the technical comparison?",
  "Which competitor advantage should Marketing acknowledge?",
];

export const HOMEOWNER_QUESTIONS = [
  "Why is Daikin recommended for this home?",
  "Which product is quieter?",
  "What are homeowners saying?",
  "How does the warranty compare?",
  "What concerns should I be aware of?",
  "Is the review sample large enough to trust?",
  "Explain this comparison in plain English.",
];

/** Kept for callers that do not distinguish a view. */
export const SUGGESTED_QUESTIONS = INTERNAL_QUESTIONS;

function noSelection(): AdvisorAnswer {
  return {
    sections: [
      {
        kind: "INFORMATION UNAVAILABLE",
        body: "No products are selected yet. Add at least two products on the Dashboard and I can answer from their source records.",
        citations: [],
      },
    ],
  };
}

/**
 * Deterministic answers derived only from the imported source records and the
 * comparison engine. Used when no server-side AI key is configured, and as the
 * grounding payload sent to the Edge Function when one is.
 */
export function answerLocally(
  question: string,
  products: Product[],
  reviewSource?: ReviewSource | null,
  view: "internal" | "homeowner" = "internal",
): AdvisorAnswer {
  if (!products.length) return noSelection();

  const q = question.toLowerCase();
  const result = buildComparison(products);
  const sections: AnswerSection[] = [];
  const summaries = reviewSource ? summarizeSelection(reviewSource, products) : [];

  const reviewAnswer = answerFromReviews(q, summaries, result, view);
  if (reviewAnswer) return reviewAnswer;

  const isQuiet = /quiet|sound|db|noise/.test(q);
  const isWarranty = /warrant|coverage|parts|replace/.test(q);
  const isGap = /competitor|outperform|beat|lose|weak|gap|worse/.test(q);
  const isHomeowner = /homeowner|explain|plain|simple|sales explanation|dealer/.test(q);
  const isEvidence = /evidence|source|citation|prove|where.*from|back(ing)? that/.test(q);

  if (isEvidence) {
    const cited = [
      ...result.edges.slice(0, 4).map((e) => ({ label: e.attributeLabel, c: e.citation })),
      ...result.gaps.slice(0, 2).map((g) => ({ label: g.attributeLabel, c: g.citation })),
    ];
    if (cited.length) {
      sections.push({
        kind: "VERIFIED PRODUCT FACT",
        body: `Every statement in this comparison resolves to a cell in one of the two imported documents. The claims currently on screen rest on these records:\n${cited.map((c) => `• ${c.label} — ${c.c}`).join("\n")}`,
        citations: cited.map((c) => c.c),
      });
    } else {
      sections.push({
        kind: "INFORMATION UNAVAILABLE",
        body: "There are no calculated claims in the current selection to show evidence for.",
        citations: [],
      });
    }
    return { sections };
  }

  if (isQuiet) {
    const scored = products
      .map((p) => {
        const v = p.attributes.sound_level ?? p.attributes.outdoor_sound;
        return v?.status === "verified" && v.numeric !== null ? { p, v, n: v.numeric } : null;
      })
      .filter(Boolean) as { p: Product; v: NonNullable<Product["attributes"][string]>; n: number }[];

    const missing = products.filter(
      (p) => !(p.attributes.sound_level ?? p.attributes.outdoor_sound)?.numeric,
    );

    if (!scored.length) {
      sections.push({
        kind: "INFORMATION UNAVAILABLE",
        body: "No selected product carries a verified sound level in the imported sources.",
        citations: [],
      });
    } else {
      const lowest = Math.min(...scored.map((s) => s.n));
      const tied = scored.filter((s) => s.n === lowest);
      const best = tied[0];
      const runnerUp = scored.filter((s) => s.n > lowest).sort((a, b) => a.n - b.n)[0];

      sections.push({
        kind: "VERIFIED PRODUCT FACT",
        body:
          tied.length > 1
            ? `${tied.map((s) => s.p.displayName).join(" and ")} are tied at the lowest recorded sound level in this selection: ${best.v.display}.`
            : `${best.p.displayName} is listed at ${best.v.display}.`,
        citations: tied.map((s) => s.v.source.citation),
      });
      if (runnerUp) {
        sections.push({
          kind: "CALCULATED COMPARISON",
          body: `That is ${(runnerUp.n - lowest).toFixed(1)} dBA lower than the next quietest selected product, ${runnerUp.p.displayName} at ${runnerUp.v.display}. Sound is measured on a logarithmic scale, so a 10 dBA reduction is heard as roughly half as loud.`,
          citations: [best.v.source.citation, runnerUp.v.source.citation],
        });
      } else {
        sections.push({
          kind: "CALCULATED COMPARISON",
          body: `Every selected product with a recorded sound level sits at ${lowest} dBA, so sound does not separate this selection.`,
          citations: tied.map((s) => s.v.source.citation),
        });
      }
      sections.push({
        kind: "SUGGESTED MARKETING MESSAGE",
        body: `"At ${lowest} dBA, ${best.p.displayName} runs at about the level of a quiet room — so a unit outside a bedroom window or on a small patio stays in the background."`,
        citations: [best.v.source.citation],
      });
      sections.push({
        kind: "CLAIM REQUIRING VALIDATION",
        body: "The battlecard notes that quiet-mode ratings are not included in these figures, and does not record the measurement distance or condition. Confirm the rating basis with product marketing before using a sound claim externally.",
        citations: ["Daikin FIT Battlecard.pdf · p.1 · row \"Sound Performance\" · comment column"],
      });
    }
    if (missing.length) {
      sections.push({
        kind: "INFORMATION UNAVAILABLE",
        body: `${missing.map((p) => p.displayName).join(", ")} — ${UNAVAILABLE} for sound level. A blank source cell is not a “No”; these products are excluded from the ranking rather than placed last.`,
        citations: [],
      });
    }
    return { sections };
  }

  if (isWarranty) {
    const scored = products
      .map((p) => {
        const v = p.attributes.warranty;
        return v?.status === "verified" ? { p, v } : null;
      })
      .filter(Boolean) as { p: Product; v: NonNullable<Product["attributes"][string]> }[];
    const missing = products.filter((p) => p.attributes.warranty?.status !== "verified");

    if (scored.length) {
      sections.push({
        kind: "VERIFIED PRODUCT FACT",
        body: scored.map((s) => `${s.p.displayName}: ${s.v.display}`).join("\n"),
        citations: scored.map((s) => s.v.source.citation),
      });
      const daikin = scored.filter((s) => s.p.isDaikin);
      const comps = scored.filter((s) => !s.p.isDaikin);
      if (daikin.length && comps.length) {
        const dMax = Math.max(...daikin.map((s) => s.v.numeric ?? 0));
        const cMax = Math.max(...comps.map((s) => s.v.numeric ?? 0));
        sections.push({
          kind: "CALCULATED COMPARISON",
          body:
            dMax > cMax
              ? `The longest verified Daikin parts term in this selection is ${dMax} years against ${cMax} years for the strongest selected competitor — ${dMax - cMax} years longer. The remedy type differs too: the Daikin rows record a replacement term, while the competitor rows record compressor coverage.`
              : dMax === cMax
                ? `Parts terms match at ${dMax} years. The differentiator here is the remedy type rather than the term — check whether the competitor covers replacement or compressor only.`
                : `A selected competitor records a longer parts term (${cMax} years) than the selected Daikin product (${dMax} years). Verify the remedy type before conceding.`,
          citations: scored.map((s) => s.v.source.citation),
        });
      }
      sections.push({
        kind: "SUGGESTED MARKETING MESSAGE",
        body: '"Ask what happens in year eleven. A parts warranty pays for a part. A replacement warranty replaces the unit."',
        citations: scored.filter((s) => s.p.isDaikin).map((s) => s.v.source.citation),
      });
    }
    if (missing.length) {
      sections.push({
        kind: "INFORMATION UNAVAILABLE",
        body: `${missing.map((p) => p.displayName).join(", ")} — ${UNAVAILABLE} for warranty in the imported sources.`,
        citations: [],
      });
    }
    return { sections };
  }

  if (isGap) {
    if (!result.gaps.length) {
      sections.push({
        kind: "CALCULATED COMPARISON",
        body: "Across the attributes both sides have verified values for, no selected competitor currently leads the selected Daikin products.",
        citations: [],
      });
    } else {
      for (const gap of result.gaps.slice(0, 4)) {
        sections.push({
          kind: "CALCULATED COMPARISON",
          body: `${gap.attributeLabel}: ${gap.headline}${gap.marginLabel ? ` That is ${gap.marginLabel}.` : ""}`,
          citations: [gap.citation],
        });
      }
      sections.push({
        kind: "AI ANALYTICAL INSIGHT",
        body: result.gaps[0].suggestedAction,
        citations: [],
      });
    }
    if (result.validations.length) {
      sections.push({
        kind: "CLAIM REQUIRING VALIDATION",
        body: `${result.validations.length} attribute${result.validations.length === 1 ? "" : "s"} could not be compared because at least one side has no recorded value. Blank cells are excluded from both wins and losses.`,
        citations: [],
      });
    }
    return { sections };
  }

  if (isHomeowner) {
    const top = result.edges.slice(0, 3);
    if (!top.length) {
      sections.push({
        kind: "INFORMATION UNAVAILABLE",
        body: "The current selection produces no verified Daikin advantage to build a homeowner explanation on. Try adding a Daikin product and a competitor from the same equipment type.",
        citations: [],
      });
      return { sections };
    }
    sections.push({
      kind: "VERIFIED PRODUCT FACT",
      body: top.map((e) => `${e.attributeLabel}: ${e.daikinValue.display} on ${e.daikinProduct.displayName}`).join("\n"),
      citations: top.map((e) => e.citation),
    });
    sections.push({
      kind: "SUGGESTED MARKETING MESSAGE",
      body: `"Here is what this means for your home. ${top
        .map((e) => plainSentence(e.attributeKey, e.daikinValue.display))
        .join(" ")}"`,
      citations: top.map((e) => e.citation),
    });
    sections.push({
      kind: "AI ANALYTICAL INSIGHT",
      body: "Lead with the thing the homeowner will notice on day one — usually sound or comfort — then bring in the numbers that back it up. Keep the specification sheet in your hand, not in the conversation.",
      citations: [],
    });
    sections.push({
      kind: "CLAIM REQUIRING VALIDATION",
      body: "Anything phrased as a benefit rather than a specification needs marketing sign-off before it is used externally.",
      citations: [],
    });
    return { sections };
  }

  /* Default: strongest differentiators. */
  {
    if (!result.edges.length) {
      sections.push({
        kind: "INFORMATION UNAVAILABLE",
        body: result.daikinProducts.length
          ? "No attribute in this selection has a Daikin value that beats every selected competitor with a recorded value. Add a competitor from the same equipment type, or widen the selection."
          : "No Daikin product is selected. Add one to calculate differentiators.",
        citations: [],
      });
      return { sections };
    }

    for (const edge of result.edges.slice(0, 4)) {
      sections.push({
        kind: "VERIFIED PRODUCT FACT",
        body: `${edge.attributeLabel}: ${edge.headline}`,
        citations: [edge.citation],
      });
    }
    const lead = result.edges[0];
    sections.push({
      kind: "CALCULATED COMPARISON",
      body: lead.marginLabel
        ? `On ${lead.attributeLabel}, ${lead.daikinProduct.displayName} is ${lead.marginLabel} than the closest selected competitor, calculated across ${lead.beatenCompetitors.length} competitor value${lead.beatenCompetitors.length === 1 ? "" : "s"}.`
        : `${lead.attributeLabel} is listed as available on Daikin and listed as not available on ${lead.beatenCompetitors.length} selected competitor${lead.beatenCompetitors.length === 1 ? "" : "s"}.`,
      citations: [lead.citation],
    });
    sections.push({
      kind: "SUGGESTED MARKETING MESSAGE",
      body: `"${plainSentence(lead.attributeKey, lead.daikinValue.display)}"`,
      citations: [lead.citation],
    });
    if (lead.unvalidatedCompetitors.length) {
      sections.push({
        kind: "CLAIM REQUIRING VALIDATION",
        body: `${lead.unvalidatedCompetitors.map((p) => p.displayName).join(", ")} have no recorded value for ${lead.attributeLabel}, so they are excluded from this claim rather than counted as a loss. Do not state “only Daikin” externally until those are confirmed.`,
        citations: [],
      });
    }
    const coverage = Math.round(
      products.reduce((s, p) => s + coverageFor(p).pct, 0) / products.length,
    );
    sections.push({
      kind: "AI ANALYTICAL INSIGHT",
      body: `Source coverage across this selection averages ${coverage}%. Where coverage is thin, lead with the attributes that are fully populated — a claim that survives scrutiny is worth more than a longer list.`,
      citations: [],
    });
  }

  return { sections };
}

function plainSentence(attributeKey: string, value: string): string {
  const def = ATTRIBUTE_BY_KEY[attributeKey];
  switch (attributeKey) {
    case "sound_level":
      return `At ${value}, you can hold a normal conversation right next to the outdoor unit.`;
    case "warranty":
      return `${value} — so the coverage is still there long after the install crew has gone.`;
    case "seer2":
      return `A ${value} cooling efficiency rating means less electricity for the same comfort every summer.`;
    case "hspf2":
      return `A ${value} heating efficiency rating means the system keeps its running cost down through the heating season.`;
    case "cop_5f":
      return `A COP of ${value} at 5°F means it is still moving more heat into the house than the electricity it is drawing, even on a cold morning.`;
    case "charge_verification":
      return "Your installer can confirm the refrigerant charge is exactly right without guessing — and correct charge is the single biggest driver of the efficiency you actually get.";
    case "slow_loss_alerting":
      return "If refrigerant starts leaking slowly, the system tells your contractor before you notice a comfort problem.";
    case "cloud_alerts":
      return "If something goes wrong, your contractor can often see what it is before the van leaves the shop.";
    case "air_handler_matchup":
      return "The indoor unit can run on a standard household circuit, which can save running a new dedicated line through the house.";
    default:
      return `${def?.label ?? attributeKey}: ${value}.`;
  }
}

/* ------------------------------------------------------------------ */
/* Review-aware answers                                                */
/* ------------------------------------------------------------------ */

function evidenceFor(s: ProductReviewSummary, themes: string[] = []) {
  const subjects = s.subjects
    .filter((sub) => sub.total > 0)
    .slice(0, 3)
    .map((sub) => `${sub.label} (${sub.total})`)
    .join(", ");
  return {
    reviewsAnalysed: s.count,
    matchLabel: s.matchLabel,
    confidence: s.confidence,
    subjects: subjects || "Not categorised",
    themes,
  };
}

/**
 * Answers questions that turn on customer feedback. Every section carries the
 * sample it rests on, the match level, a confidence rating and what the feedback
 * is actually about, so review opinion is never mistaken for a product fact.
 */
function answerFromReviews(
  q: string,
  summaries: ProductReviewSummary[],
  result: ReturnType<typeof buildComparison>,
  view: "internal" | "homeowner",
): AdvisorAnswer | null {
  const isReviewQuestion =
    /review|customer|homeowner.*say|rating|star|feedback|sentiment|sample|complaint|concern|what are (people|owners)/.test(
      q,
    );
  if (!isReviewQuestion) return null;

  const sections: AnswerSection[] = [];
  const withData = summaries.filter((s) => s.count > 0);
  const without = summaries.filter((s) => s.count === 0);

  if (!withData.length) {
    return {
      sections: [
        {
          kind: "INFORMATION UNAVAILABLE",
          body: "No approved user-review data is available for any of the selected products, so no review-based conclusion can be drawn.",
          citations: [],
        },
      ],
    };
  }

  const lead = withData.reduce((a, b) => (b.count > a.count ? b : a));

  /* ---- installation vs equipment ---- */
  if (/install|contractor|dealer|product-related|equipment/.test(q)) {
    const critical = lead.sentimentCounts.neutral + lead.sentimentCounts.negative;
    sections.push({
      kind: "REVIEW-BASED INSIGHT",
      body: `Of the ${critical} critical reviews for ${lead.product.displayName}, ${lead.nonEquipmentConcerns.length} concern installation, dealer or service experience and ${lead.equipmentConcerns.length} concern the equipment itself. Installation and contractor issues vary job to job and are not a property of the equipment, so they should not be read as a product defect — nor should they be dismissed, since the homeowner experiences them either way.`,
      citations: [],
      evidence: evidenceFor(lead, ["Installation experience", "Dealer or contractor", "Service and support"]),
    });
    sections.push({
      kind: "AI ANALYTICAL INSIGHT",
      body:
        lead.nonEquipmentConcerns.length > lead.equipmentConcerns.length
          ? "The majority of dissatisfaction in this sample traces to how the system was sold or installed rather than to the hardware. That is a dealer-enablement signal more than a product signal."
          : "Most dissatisfaction in this sample traces to the equipment rather than the install. That is worth routing to product management rather than treating as a training issue.",
      citations: [],
    });
    return { sections };
  }

  /* ---- sample size / trustworthiness ---- */
  if (/sample|enough|trust|reliab.*(sample|data)|significant/.test(q)) {
    sections.push({
      kind: "REVIEW-BASED INSIGHT",
      body: withData
        .map(
          (s) =>
            `${s.product.displayName}: ${s.count} reviews (${s.matchLabel.toLowerCase()}), average ${s.averageRating?.toFixed(2)} — ${CONFIDENCE_LABEL[s.confidence].toLowerCase()}.`,
        )
        .join("\n"),
      citations: [],
      evidence: evidenceFor(lead),
    });
    if (without.length) {
      sections.push({
        kind: "INFORMATION UNAVAILABLE",
        body: `${without.map((s) => s.product.displayName).join(", ")} — no approved user-review data, so ratings cannot be compared across the full selection. A product without reviews is not a product without satisfied owners.`,
        citations: [],
      });
    }
    sections.push({
      kind: "CLAIM REQUIRING VALIDATION",
      body: "Review volumes differ between the compared products, so ratings must not be ranked against each other on their own. Read them alongside the verified specifications.",
      citations: [],
    });
    return { sections };
  }

  /* ---- theme-specific ---- */
  const themeMatch = lead.themes.find((t) =>
    new RegExp(t.label.split(" ")[0], "i").test(q) && t.total > 0,
  );
  if (themeMatch) {
    const pct = Math.round((themeMatch.positive / themeMatch.total) * 100);
    const enough = themeMatch.total >= MIN_REPORTABLE;
    sections.push({
      kind: enough ? "REVIEW-BASED INSIGHT" : "INFORMATION UNAVAILABLE",
      body: enough
        ? `${themeMatch.label} appears in ${themeMatch.total} of the ${lead.count} matching reviews for ${lead.product.displayName}. ${themeMatch.positive} of those (${pct}%) come from customers who rated the product four or five stars; ${themeMatch.neutral + themeMatch.negative} rated it three or below.`
        : `Only ${themeMatch.total} matching reviews mention ${themeMatch.label.toLowerCase()} — too few to draw a reliable conclusion from.`,
      citations: [],
      evidence: evidenceFor(lead, [themeMatch.label]),
    });

    const edge = result.edges.find((e) =>
      ["sound_level", "humidity_control", "warranty", "seer2", "cloud_alerts"].includes(e.attributeKey),
    );
    if (enough && edge) {
      sections.push({
        kind: "CALCULATED COMPARISON",
        body: `On the specification side, ${edge.attributeLabel} is a verified edge for ${edge.daikinProduct.displayName} at ${edge.daikinValue.display}. The published data and the customer feedback point the same way here, which makes it a defensible thing to lead with.`,
        citations: [edge.citation],
      });
    }
    return { sections };
  }

  /* ---- general "what are homeowners saying" ---- */
  sections.push({
    kind: "REVIEW-BASED INSIGHT",
    body: buildReviewNarrative(summaries),
    citations: [],
    evidence: evidenceFor(
      lead,
      lead.themes.filter((t) => t.total >= MIN_REPORTABLE).slice(0, 4).map((t) => t.label),
    ),
  });

  sections.push({
    kind: "REVIEW-BASED INSIGHT",
    body: withData
      .map(
        (s) =>
          `${s.product.displayName}: ${s.averageRating?.toFixed(2)} from ${s.count} reviews (${s.matchLabel.toLowerCase()}) — ${s.positivePct}% positive, ${s.neutralPct}% neutral, ${s.negativePct}% negative.`,
      )
      .join("\n"),
    citations: [],
    evidence: evidenceFor(lead),
  });

  if (without.length) {
    sections.push({
      kind: "INFORMATION UNAVAILABLE",
      body: `${without.map((s) => s.product.displayName).join(", ")} — no approved user-review data available.`,
      citations: [],
    });
  }

  if (view === "homeowner") {
    sections.push({
      kind: "HOMEOWNER BENEFIT EXPLANATION",
      body: `In plain terms: most owners of ${lead.product.displayName} are happy with it, and the things they mention most often are ${lead.themes
        .filter((t) => t.total >= MIN_REPORTABLE)
        .slice(0, 3)
        .map((t) => t.label.toLowerCase())
        .join(", ")}. Where people are unhappy, it is more often about how the system was installed or serviced than about the equipment — which is worth asking your dealer about directly.`,
      citations: [],
      evidence: evidenceFor(lead),
    });
  } else {
    sections.push({
      kind: "CLAIM REQUIRING VALIDATION",
      body: "Review sentiment is customer opinion, not a product specification. It is not evidence of energy savings, product life or reliability, and it must not be quoted as a performance claim.",
      citations: [],
    });
  }

  return { sections };
}
