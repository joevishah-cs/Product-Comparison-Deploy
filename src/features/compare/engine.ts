import type { AttributeValue, EquipmentType, Product } from "@/data/types";
import { ATTRIBUTE_BY_KEY, ATTRIBUTE_KEYS_BY_EQUIPMENT, coverageFor } from "@/data/catalog";
import { UNAVAILABLE, formatNumber } from "@/lib/utils";

export type EdgeKind = "measure" | "capability";

export interface DaikinEdge {
  id: string;
  attributeKey: string;
  attributeLabel: string;
  kind: EdgeKind;
  /** The Daikin product the claim rests on. */
  daikinProduct: Product;
  daikinValue: AttributeValue;
  /** Competitors the claim was proved against. */
  beatenCompetitors: { product: Product; value: AttributeValue }[];
  /** Competitors whose source value is blank -- excluded from the claim. */
  unvalidatedCompetitors: Product[];
  headline: string;
  plainLanguage: string;
  citation: string;
  margin: number | null;
  marginLabel: string | null;
}

export interface CompetitiveGap {
  id: string;
  attributeKey: string;
  attributeLabel: string;
  /** `leads` = the competitor is genuinely ahead. `parity` = both list the
   *  capability, so it simply is not a differentiator against this selection. */
  kind: "leads" | "parity";
  leadingProduct: Product;
  leadingValue: AttributeValue;
  affectedDaikinProduct: Product;
  affectedValue: AttributeValue;
  headline: string;
  suggestedAction: string;
  citation: string;
  margin: number | null;
  marginLabel: string | null;
}

export interface ValidationRequirement {
  id: string;
  attributeKey: string;
  attributeLabel: string;
  reason: string;
  products: Product[];
}

export interface ComparedAttribute {
  attributeKey: string;
  attributeLabel: string;
  group: string;
  unit: string;
  /** Products with a verified source value for this attribute, in selection order. */
  verifiedProducts: { product: Product; value: AttributeValue }[];
  /** Selected products with no verified value for this attribute. */
  unverifiedProducts: Product[];
}

export interface ComparisonResult {
  daikinProducts: Product[];
  competitorProducts: Product[];
  equipmentTypes: EquipmentType[];
  crossFamily: boolean;
  edges: DaikinEdge[];
  gaps: CompetitiveGap[];
  validations: ValidationRequirement[];
  attributesCompared: number;
  comparedAttributes: ComparedAttribute[];
  dataConfidence: number;
  comparableAttributeKeys: string[];
}

/* ------------------------------------------------------------------ */

const CAPABILITY_EDGE_KEYS = [
  "charge_verification",
  "slow_loss_alerting",
  "cloud_alerts",
  "regional_profiles",
  "reusable_profiles",
] as const;

const MEASURE_EDGE_KEYS = [
  "seer2",
  "eer2",
  "hspf2",
  "cop_5f",
  "sound_level",
  "warranty",
  "cap_5f",
  "cap_115f",
  "line_length",
  "elevation",
  "max_lwt",
  "min_lwt",
  "min_heat_cap",
  "emitter_high_temp",
  "cop_a446w158",
  "cop_a5w95",
  "heat_cap_a446w158",
  "outdoor_sound",
  "indoor_sound",
  "min_ambient_heating",
  "max_ambient_cooling",
] as const;

/** Source values such as "12y parts & 12y Repl." end in a period; drop it so the
 *  value never produces a doubled full stop inside a generated sentence. */
function trimValue(display: string): string {
  return display.replace(/\.\s*$/, "");
}

function isVerifiedNumber(v: AttributeValue | undefined): v is AttributeValue & { numeric: number } {
  return Boolean(v && v.status === "verified" && v.numeric !== null);
}

function warrantyScore(v: AttributeValue | undefined): number | null {
  if (!v || v.status !== "verified" || v.numeric === null) return null;
  // Parts term is the primary comparable figure; a replacement term is a stronger
  // remedy than a compressor-only term, so it breaks ties upward.
  const raw = (v.raw ?? "").toLowerCase();
  const bonus = raw.includes("repl") ? 0.5 : 0;
  return v.numeric + bonus;
}

function comparableScore(key: string, v: AttributeValue | undefined): number | null {
  if (key === "warranty") return warrantyScore(v);
  if (key === "heating_range" || key === "cooling_range") {
    return isVerifiedNumber(v) ? v.numeric : null;
  }
  return isVerifiedNumber(v) ? v.numeric : null;
}

function better(key: string, a: number, b: number): boolean {
  const dir = ATTRIBUTE_BY_KEY[key]?.direction ?? "higher";
  return dir === "lower" ? a < b : a > b;
}

/** Margin is always taken from the raw source numbers so the tie-break bonus
 *  applied to warranty remedy type never leaks into a quoted figure. */
function marginFor(a: AttributeValue, b: AttributeValue): number | null {
  if (a.numeric === null || b.numeric === null) return null;
  return Math.abs(a.numeric - b.numeric);
}

/** A real margin must never print as "0". Ratio metrics such as COP differ in the
 *  second or third decimal, so widen the precision until the figure is non-zero
 *  rather than rounding a genuine lead away. */
function formatMargin(diff: number, maxDigits = 1): string {
  for (let digits = maxDigits; digits <= 3; digits += 1) {
    const text = formatNumber(diff, digits);
    if (Number(text.replace(/,/g, "")) !== 0) return text;
  }
  return formatNumber(diff, 3);
}

function marginText(key: string, diff: number): string {
  const def = ATTRIBUTE_BY_KEY[key];
  const unit = def?.unit ?? "";
  if (key === "warranty") {
    return `${formatNumber(diff)} ${diff === 1 ? "year" : "years"} longer on parts coverage`;
  }
  if (def?.direction === "lower") {
    // "quieter" only makes sense for sound. Every other lower-is-better attribute
    // (minimum leaving-water temp, minimum ambient) needs a neutral comparative.
    const comparative = unit === "dBA" ? "quieter" : "lower";
    return `${formatMargin(diff)}${unit ? ` ${unit}` : ""} ${comparative}`;
  }
  if (unit === "BTU/h" || unit === "Btu/h") {
    return `${formatNumber(diff, 0)} ${unit} more`;
  }
  return `${formatMargin(diff)}${unit && unit !== "tons" ? ` ${unit}` : ""} higher`;
}

/* ------------------------------------------------------------------ */

export function buildComparison(products: Product[]): ComparisonResult {
  const daikinProducts = products.filter((p) => p.isDaikin);
  const competitorProducts = products.filter((p) => !p.isDaikin);
  const equipmentTypes = Array.from(new Set(products.map((p) => p.equipmentType)));
  const crossFamily = equipmentTypes.length > 1;

  const comparableAttributeKeys = Array.from(
    new Set(equipmentTypes.flatMap((t) => ATTRIBUTE_KEYS_BY_EQUIPMENT[t])),
  );

  const edges: DaikinEdge[] = [];
  const gaps: CompetitiveGap[] = [];
  const validations: ValidationRequirement[] = [];

  for (const type of equipmentTypes) {
    const daikinInType = daikinProducts.filter((p) => p.equipmentType === type);
    const compsInType = competitorProducts.filter((p) => p.equipmentType === type);
    if (!daikinInType.length || !compsInType.length) continue;

    /* ---- measurable advantages ---------------------------------- */
    for (const key of MEASURE_EDGE_KEYS) {
      const def = ATTRIBUTE_BY_KEY[key];
      if (!def || def.equipmentType !== type) continue;

      const scoredDaikin = daikinInType
        .map((p) => ({ product: p, value: p.attributes[key], score: comparableScore(key, p.attributes[key]) }))
        .filter((e) => e.score !== null) as { product: Product; value: AttributeValue; score: number }[];
      const scoredComps = compsInType
        .map((p) => ({ product: p, value: p.attributes[key], score: comparableScore(key, p.attributes[key]) }))
        .filter((e) => e.score !== null) as { product: Product; value: AttributeValue; score: number }[];

      const missingComps = compsInType.filter((p) => comparableScore(key, p.attributes[key]) === null);
      const missingDaikin = daikinInType.filter((p) => comparableScore(key, p.attributes[key]) === null);

      if (missingComps.length || missingDaikin.length) {
        validations.push({
          id: `val_${type}_${key}`,
          attributeKey: key,
          attributeLabel: def.label,
          reason:
            missingDaikin.length && missingComps.length
              ? "The source records no value on either side, so no comparison can be made."
              : missingDaikin.length
                ? "The source records no value for the selected Daikin product, so no comparison can be made."
                : "The source records no value for one or more selected competitors, so they are excluded from the claim.",
          products: [...missingDaikin, ...missingComps],
        });
      }

      if (!scoredDaikin.length || !scoredComps.length) continue;

      const bestDaikin = scoredDaikin.reduce((a, b) => (better(key, b.score, a.score) ? b : a));
      const beaten = scoredComps.filter((c) => better(key, bestDaikin.score, c.score));

      if (beaten.length === scoredComps.length && beaten.length > 0) {
        const closest = beaten.reduce((a, b) => (better(key, a.score, b.score) ? a : b));
        const margin = marginFor(bestDaikin.value, closest.value);
        edges.push({
          id: `edge_${type}_${key}`,
          attributeKey: key,
          attributeLabel: def.label,
          kind: "measure",
          daikinProduct: bestDaikin.product,
          daikinValue: bestDaikin.value,
          beatenCompetitors: beaten.map((b) => ({ product: b.product, value: b.value })),
          unvalidatedCompetitors: missingComps,
          headline: `${bestDaikin.product.displayName} records ${trimValue(bestDaikin.value.display)}, ahead of every selected competitor with a recorded value.`,
          plainLanguage: def.plainLanguage,
          citation: bestDaikin.value.source.citation,
          margin,
          marginLabel: margin === null ? null : marginText(key, margin),
        });
      }

      /* ---- gaps: a competitor leads the best Daikin -------------- */
      const bestComp = scoredComps.reduce((a, b) => (better(key, b.score, a.score) ? b : a));
      if (better(key, bestComp.score, bestDaikin.score)) {
        const gapMargin = marginFor(bestComp.value, bestDaikin.value);
        gaps.push({
          id: `gap_${type}_${key}`,
          attributeKey: key,
          attributeLabel: def.label,
          kind: "leads",
          leadingProduct: bestComp.product,
          leadingValue: bestComp.value,
          affectedDaikinProduct: bestDaikin.product,
          affectedValue: bestDaikin.value,
          headline: `${bestComp.product.displayName} records ${trimValue(bestComp.value.display)} against ${trimValue(bestDaikin.value.display)} for ${bestDaikin.product.displayName}.`,
          suggestedAction: gapAction(key, bestComp.product, bestDaikin.product),
          citation: bestComp.value.source.citation,
          margin: gapMargin,
          marginLabel: gapMargin === null ? null : marginText(key, gapMargin),
        });
      }
    }

    /* ---- capability advantages ---------------------------------- */
    for (const key of CAPABILITY_EDGE_KEYS) {
      const def = ATTRIBUTE_BY_KEY[key];
      if (!def || def.equipmentType !== type) continue;

      const daikinYes = daikinInType.filter(
        (p) => p.attributes[key]?.status === "verified" && p.attributes[key]?.boolean === true,
      );
      if (!daikinYes.length) continue;

      const compsNo = compsInType.filter(
        (p) => p.attributes[key]?.status === "verified" && p.attributes[key]?.boolean === false,
      );
      const compsYes = compsInType.filter(
        (p) => p.attributes[key]?.status === "verified" && p.attributes[key]?.boolean === true,
      );
      const compsUnknown = compsInType.filter((p) => p.attributes[key]?.status !== "verified");

      if (compsUnknown.length) {
        validations.push({
          id: `val_${type}_${key}`,
          attributeKey: key,
          attributeLabel: def.label,
          reason:
            "The source records no value for one or more selected competitors. A blank is not a “No” — it is excluded from the claim.",
          products: compsUnknown,
        });
      }

      if (compsNo.length && !compsYes.length) {
        const lead = daikinYes[0];
        edges.push({
          id: `edge_${type}_${key}`,
          attributeKey: key,
          attributeLabel: def.label,
          kind: "capability",
          daikinProduct: lead,
          daikinValue: lead.attributes[key],
          beatenCompetitors: compsNo.map((p) => ({ product: p, value: p.attributes[key] })),
          unvalidatedCompetitors: compsUnknown,
          headline: `${def.label} is listed as available on ${daikinYes.map((p) => p.displayName).join(", ")}, and listed as not available on ${compsNo.length === 1 ? "the selected competitor" : `all ${compsNo.length} selected competitors with a recorded value`}.`,
          plainLanguage: def.plainLanguage,
          citation: lead.attributes[key].source.citation,
          margin: null,
          marginLabel: null,
        });
      } else if (compsYes.length) {
        gaps.push({
          id: `gap_${type}_${key}`,
          attributeKey: key,
          attributeLabel: def.label,
          kind: "parity",
          leadingProduct: compsYes[0],
          leadingValue: compsYes[0].attributes[key],
          affectedDaikinProduct: daikinYes[0],
          affectedValue: daikinYes[0].attributes[key],
          headline: `${compsYes.map((p) => p.displayName).join(", ")} also list this capability, so it is not a differentiator against the current selection.`,
          suggestedAction:
            "Drop this from the lead message for this competitive set and lead with a differentiator that is unique in this comparison.",
          citation: compsYes[0].attributes[key].source.citation,
          margin: null,
          marginLabel: null,
        });
      }
    }

    /* ---- 115V air-handler compatibility ------------------------- */
    if (type === "ducted_split_hp") {
      const daikin115 = daikinInType.filter((p) =>
        (p.attributes.air_handler_matchup?.display ?? "").includes("115V"),
      );
      const comps115 = compsInType.filter((p) =>
        (p.attributes.air_handler_matchup?.display ?? "").includes("115V"),
      );
      const compsWithout = compsInType.filter(
        (p) =>
          p.attributes.air_handler_matchup?.status === "verified" &&
          !p.attributes.air_handler_matchup.display.includes("115V"),
      );
      const compsUnknown = compsInType.filter(
        (p) => p.attributes.air_handler_matchup?.status !== "verified",
      );

      if (daikin115.length && compsWithout.length && !comps115.length) {
        const lead = daikin115[0];
        edges.push({
          id: `edge_${type}_air_handler_115v`,
          attributeKey: "air_handler_matchup",
          attributeLabel: "115V air-handler compatibility",
          kind: "capability",
          daikinProduct: lead,
          daikinValue: lead.attributes.air_handler_matchup,
          beatenCompetitors: compsWithout.map((p) => ({
            product: p,
            value: p.attributes.air_handler_matchup,
          })),
          unvalidatedCompetitors: compsUnknown,
          headline: `${daikin115.map((p) => p.displayName).join(", ")} list a 115V air-handler matchup; no selected competitor lists one.`,
          plainLanguage:
            "A 115V air handler runs on a standard household circuit. That can remove the cost and disruption of running a new dedicated 240V circuit, which matters most in retrofits and older homes.",
          citation: lead.attributes.air_handler_matchup.source.citation,
          margin: null,
          marginLabel: null,
        });
      }
    }
  }

  /* ---- data confidence ------------------------------------------ */
  const coverages = products.map((p) => coverageFor(p));
  const verifiedCells = coverages.reduce((sum, c) => sum + c.verified, 0);
  const totalCells = coverages.reduce((sum, c) => sum + c.total, 0);
  const dataConfidence = totalCells ? Math.round((verifiedCells / totalCells) * 100) : 0;

  const comparedAttributes: ComparedAttribute[] = comparableAttributeKeys
    .map((key) => {
      const verifiedProducts = products
        .filter((p) => p.attributes[key]?.status === "verified")
        .map((p) => ({ product: p, value: p.attributes[key] }));
      if (!verifiedProducts.length) return null;
      const unverifiedProducts = products.filter((p) => p.attributes[key]?.status !== "verified");
      const def = ATTRIBUTE_BY_KEY[key];
      return {
        attributeKey: key,
        attributeLabel: def?.label ?? key,
        group: def?.group ?? "Other",
        unit: def?.unit ?? "",
        verifiedProducts,
        unverifiedProducts,
      };
    })
    .filter((a): a is ComparedAttribute => a !== null);

  const attributesCompared = comparedAttributes.length;

  return {
    daikinProducts,
    competitorProducts,
    equipmentTypes,
    crossFamily,
    edges: dedupe(edges),
    gaps: dedupe(gaps),
    validations: dedupe(validations),
    attributesCompared,
    comparedAttributes,
    dataConfidence,
    comparableAttributeKeys,
  };
}

function dedupe<T extends { id: string }>(items: T[]): T[] {
  const seen = new Set<string>();
  return items.filter((i) => (seen.has(i.id) ? false : (seen.add(i.id), true)));
}

function gapAction(key: string, leader: Product, daikin: Product): string {
  switch (key) {
    case "seer2":
    case "eer2":
      return `Reframe the conversation around installed efficiency and operating cost rather than the headline rating, and confirm whether a higher-rated ${daikin.family} tier is available for this bid against ${leader.displayName}.`;
    case "hspf2":
      return `Pair the heating-efficiency answer with cold-weather capacity and COP at 5°F, where the seasonal number alone understates real cold-climate behaviour. Validate against ${leader.displayName} before quoting.`;
    case "cop_5f":
    case "cop_a446w158":
    case "cop_a5w95":
      return `Lead with delivered heating capacity at low ambient and backup-heat avoidance rather than the COP figure alone. Flag to product marketing for review against ${leader.displayName}.`;
    case "sound_level":
    case "outdoor_sound":
      return `Confirm the measurement condition before conceding — the source notes quiet-mode ratings are not included. Escalate to product marketing if ${leader.displayName} is being quoted on sound in your territory.`;
    case "warranty":
      return `Verify the remedy type, not only the term: compare parts coverage, compressor coverage and whether the remedy is repair or replacement against ${leader.displayName}.`;
    case "cap_5f":
    case "cap_115f":
    case "cap_47f":
    case "cap_95f":
      return `Confirm the tonnage the competitor figure was taken at before conceding capacity. Match tonnage first, then re-run the comparison against ${leader.displayName}.`;
    case "line_length":
    case "elevation":
      return `Where the job needs the longer run, confirm the installed derate at that length rather than the headline maximum. Raise with product management if ${leader.displayName} is winning bids on line-set flexibility.`;
    default:
      return `Validate this attribute against ${leader.displayName} with product marketing before it is used externally, and lead with a verified differentiator in the meantime.`;
  }
}

/* ------------------------------------------------------------------ */
/* Scorecards                                                          */
/* ------------------------------------------------------------------ */

export interface Scorecard {
  id: string;
  title: string;
  attributeKey: string | null;
  winner: Product | null;
  value: string;
  detail: string;
  citation: string | null;
  isDaikin: boolean;
}

function leaderFor(products: Product[], key: string): { product: Product; value: AttributeValue } | null {
  const scored = products
    .map((p) => ({ product: p, value: p.attributes[key], score: comparableScore(key, p.attributes[key]) }))
    .filter((e) => e.score !== null) as { product: Product; value: AttributeValue; score: number }[];
  if (!scored.length) return null;
  const best = scored.reduce((a, b) => (better(key, b.score, a.score) ? b : a));
  return { product: best.product, value: best.value };
}

export function buildScorecards(products: Product[], result: ComparisonResult): Scorecard[] {
  const cards: Scorecard[] = [];
  const hasDucted = products.some((p) => p.equipmentType === "ducted_split_hp");
  const hasHydronic = products.some((p) => p.equipmentType === "air_to_water_hp");
  /** True when every selected product is hydronic, so ducted-only concepts
   *  (warranty column, install-diagnostics features) do not exist to compare. */
  const a2wOnly = hasHydronic && !hasDucted;

  const efficiency = leaderFor(products, "seer2") ?? leaderFor(products, "cop_a446w158");
  cards.push(
    efficiency
      ? {
          id: "efficiency",
          title: "Efficiency leader",
          attributeKey: "seer2",
          winner: efficiency.product,
          value: efficiency.value.display,
          detail: `Highest verified ${efficiency.value.attributeKey === "seer2" ? "SEER2" : "COP"} in this selection.`,
          citation: efficiency.value.source.citation,
          isDaikin: efficiency.product.isDaikin,
        }
      : emptyCard("efficiency", "Efficiency leader"),
  );

  const quiet = leaderFor(products, "sound_level") ?? leaderFor(products, "outdoor_sound");
  cards.push(
    quiet
      ? {
          id: "quietest",
          title: "Quietest product",
          attributeKey: "sound_level",
          winner: quiet.product,
          value: quiet.value.display,
          detail: "Lowest verified sound level in this selection. Quiet-mode ratings are not included in the source.",
          citation: quiet.value.source.citation,
          isDaikin: quiet.product.isDaikin,
        }
      : emptyCard("quietest", "Quietest product"),
  );

  if (a2wOnly) {
    const cooling = leaderFor(products, "eer_a95w716");
    cards.push(
      cooling
        ? {
            id: "warranty",
            title: "Best cooling efficiency (EER)",
            attributeKey: "eer_a95w716",
            winner: cooling.product,
            value: cooling.value.display,
            detail: "Highest verified EER at A95°F/W71.6°F in this selection. The A2W source does not record a warranty column.",
            citation: cooling.value.source.citation,
            isDaikin: cooling.product.isDaikin,
          }
        : emptyCard("warranty", "Best cooling efficiency (EER)"),
    );
  } else {
    const warranty = leaderFor(products, "warranty");
    cards.push(
      warranty
        ? {
            id: "warranty",
            title: "Best warranty",
            attributeKey: "warranty",
            winner: warranty.product,
            value: warranty.value.display,
            detail: "Longest verified parts term; a replacement remedy breaks ties above a compressor-only remedy.",
            citation: warranty.value.source.citation,
            isDaikin: warranty.product.isDaikin,
          }
        : emptyCard("warranty", "Best warranty"),
    );
  }

  const coldLeader = coldClimateLeader(products);
  cards.push(
    coldLeader
      ? {
          id: "cold",
          title: "Best cold-climate range",
          attributeKey: coldLeader.value.attributeKey,
          winner: coldLeader.product,
          value: coldLeader.value.display,
          detail: "Lowest verified minimum outdoor operating temperature in heating in this selection.",
          citation: coldLeader.value.source.citation,
          isDaikin: coldLeader.product.isDaikin,
        }
      : emptyCard("cold", "Best cold-climate range"),
  );

  if (a2wOnly) {
    const lwt = leaderFor(products, "max_lwt");
    cards.push(
      lwt
        ? {
            id: "install",
            title: "Widest leaving-water-temp range",
            attributeKey: "max_lwt",
            winner: lwt.product,
            value: lwt.value.display,
            detail: "Highest verified maximum leaving water temperature — the simplest retrofit onto existing high-temperature emitters.",
            citation: lwt.value.source.citation,
            isDaikin: lwt.product.isDaikin,
          }
        : emptyCard("install", "Widest leaving-water-temp range"),
    );
  } else {
    const install = installFlexibilityLeader(products);
    cards.push(
      install
        ? {
            id: "install",
            title: "Best installation flexibility",
            attributeKey: null,
            winner: install.product,
            value: `${install.count} of ${install.total} capabilities listed`,
            detail: install.detail,
            citation: install.citation,
            isDaikin: install.product.isDaikin,
          }
        : emptyCard("install", "Best installation flexibility"),
    );
  }

  const lead = result.edges[0] ?? null;
  cards.push(
    lead
      ? {
          id: "lead",
          title: "Daikin edge to lead with",
          attributeKey: lead.attributeKey,
          winner: lead.daikinProduct,
          value: lead.attributeLabel,
          detail: lead.marginLabel
            ? `${lead.marginLabel} than the closest selected competitor.`
            : "Listed as available on Daikin and not listed on the selected competitors.",
          citation: lead.citation,
          isDaikin: true,
        }
      : emptyCard("lead", "Daikin edge to lead with"),
  );

  return cards;
}

function emptyCard(id: string, title: string): Scorecard {
  return {
    id,
    title,
    attributeKey: null,
    winner: null,
    value: UNAVAILABLE,
    detail: "No selected product carries a verified value for this attribute.",
    citation: null,
    isDaikin: false,
  };
}

function coldClimateLeader(products: Product[]): { product: Product; value: AttributeValue } | null {
  const scored = products
    .map((p) => {
      // Cold-climate capability is an outdoor-air figure. For hydronic products that
      // is the minimum heating ambient -- never a leaving-water temperature, which
      // describes the water side and is unrelated to how cold it can run.
      const v = p.attributes.heating_range ?? p.attributes.min_ambient_heating;
      return v && v.status === "verified" && v.numeric !== null ? { product: p, value: v, score: v.numeric } : null;
    })
    .filter(Boolean) as { product: Product; value: AttributeValue; score: number }[];
  if (!scored.length) return null;
  const best = scored.reduce((a, b) => (b.score < a.score ? b : a));
  return { product: best.product, value: best.value };
}

const INSTALL_KEYS = [
  "charge_verification",
  "slow_loss_alerting",
  "cloud_alerts",
  "regional_profiles",
  "reusable_profiles",
  "coil_only_matchup",
];

function installFlexibilityLeader(products: Product[]): {
  product: Product;
  count: number;
  total: number;
  detail: string;
  citation: string;
} | null {
  const scored = products
    .filter((p) => p.equipmentType === "ducted_split_hp")
    .map((p) => {
      const listed = INSTALL_KEYS.filter(
        (k) => p.attributes[k]?.status === "verified" && p.attributes[k]?.boolean === true,
      );
      const known = INSTALL_KEYS.filter((k) => p.attributes[k]?.status === "verified");
      return { product: p, count: listed.length, known: known.length, listed };
    });
  if (!scored.length) return null;
  const best = scored.reduce((a, b) => (b.count > a.count ? b : a));
  if (best.count === 0) return null;
  return {
    product: best.product,
    count: best.count,
    total: INSTALL_KEYS.length,
    detail: `Listed: ${best.listed.map((k) => ATTRIBUTE_BY_KEY[k]?.label ?? k).join(", ")}. Attributes with a blank source cell are excluded rather than counted as “No”.`,
    citation: `Daikin FIT Battlecard.pdf · p.1 · installation & diagnostics rows · column "${best.product.sourceHeader}"`,
  };
}
