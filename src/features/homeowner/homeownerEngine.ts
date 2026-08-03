import type { AttributeValue, Product } from "@/data/types";
import { ATTRIBUTE_BY_KEY } from "@/data/catalog";
import {
  brochureFeaturesFor,
  type BrochureCapabilities,
  type BrochureFeature,
} from "@/data/a2w-brochure-features";
import type { ComparisonResult } from "@/features/compare/engine";
import type { ProductReviewSummary } from "@/features/reviews/reviewEngine";
import { MIN_REPORTABLE } from "@/features/reviews/reviewEngine";
import { UNAVAILABLE } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/* Homeowner priorities                                                */
/* ------------------------------------------------------------------ */

export interface PriorityDefinition {
  key: string;
  label: string;
  /** Attributes that speak to this priority, best first. */
  attributeKeys: string[];
  /** Review themes that speak to this priority. */
  reviewThemes: string[];
  icon: string;
}

export const PRIORITIES: PriorityDefinition[] = [
  { key: "energy", label: "Lower energy use", attributeKeys: ["seer2", "hspf2", "eer2"], reviewThemes: ["efficiency"], icon: "Leaf" },
  { key: "quiet", label: "Quiet operation", attributeKeys: ["sound_level", "sound_blanket"], reviewThemes: ["quietness"], icon: "Volume2" },
  { key: "comfort", label: "Better comfort", attributeKeys: ["compressor_type", "humidity_control", "cap_47f"], reviewThemes: ["comfort"], icon: "Sofa" },
  { key: "humidity", label: "Humidity control", attributeKeys: ["humidity_control"], reviewThemes: ["humidity"], icon: "Droplets" },
  { key: "cold", label: "Cold-weather performance", attributeKeys: ["cop_5f", "cap_5f", "heating_range", "energy_star_cchp", "intelligent_defrost"], reviewThemes: ["heating"], icon: "Snowflake" },
  { key: "reliability", label: "Reliability", attributeKeys: ["anticorrosive", "slow_loss_alerting", "compressor_type"], reviewThemes: ["reliability"], icon: "ShieldCheck" },
  { key: "warranty", label: "Warranty protection", attributeKeys: ["warranty"], reviewThemes: ["service"], icon: "ShieldPlus" },
  { key: "smart", label: "Smart controls", attributeKeys: ["thermostat_type", "cloud_alerts"], reviewThemes: ["controls"], icon: "Smartphone" },
  { key: "service", label: "Easier service", attributeKeys: ["cloud_alerts", "charge_verification", "regional_profiles", "reusable_profiles"], reviewThemes: ["service", "installation"], icon: "Wrench" },
  { key: "footprint", label: "Smaller outdoor unit", attributeKeys: ["footprint", "chassis_type"], reviewThemes: ["size"], icon: "Ruler" },
  { key: "refrigerant", label: "Environmentally responsible refrigerant", attributeKeys: ["refrigerant"], reviewThemes: [], icon: "Recycle" },
];

/** Air-to-water equivalents of the priority attribute keys. The hydronic sheet
 *  records different columns, so each priority is re-pointed at the keys that
 *  actually carry a value; priorities with no hydronic equivalent (warranty,
 *  humidity, easier service) fall back to the brochure capabilities instead of
 *  rendering as permanently unavailable. */
const A2W_PRIORITY_KEYS: Record<string, string[]> = {
  energy: ["cop_a446w95", "cop_a446w110", "eer_a95w644"],
  quiet: ["outdoor_sound", "indoor_sound"],
  comfort: ["compressor_type", "heat_cap_a446w110"],
  cold: ["cop_a5w95", "heat_cap_a5w95", "min_ambient_heating"],
  reliability: ["compressor_type"],
  footprint: ["outdoor_dimensions", "outdoor_weight"],
  refrigerant: ["refrigerant"],
  smart: [],
  humidity: [],
  warranty: [],
  service: [],
};

/** Priority definitions re-pointed for the products in the report. */
export function prioritiesFor(products: Product[]): PriorityDefinition[] {
  const atwOnly =
    products.some((p) => p.equipmentType === "air_to_water_hp") &&
    !products.some((p) => p.equipmentType === "ducted_split_hp");
  if (!atwOnly) return PRIORITIES;
  return PRIORITIES.map((p) => ({
    ...p,
    attributeKeys: A2W_PRIORITY_KEYS[p.key] ?? p.attributeKeys,
  }));
}

/** Which brochure capability list backs each priority, for priorities the
 *  comparison sheet cannot answer. */
const BROCHURE_PRIORITY_FEATURES: Record<
  string,
  (b: BrochureCapabilities) => BrochureFeature[]
> = {
  quiet: (b) => b.quiet,
  smart: (b) => b.smartControls,
  service: (b) => b.installation,
  footprint: (b) => b.installation,
};

export const RECOMMENDED_PRIORITIES = ["quiet", "comfort", "energy", "warranty"];

export const PRIORITY_BY_KEY: Record<string, PriorityDefinition> = Object.fromEntries(
  PRIORITIES.map((p) => [p.key, p]),
);

/* ------------------------------------------------------------------ */
/* Technical fact -> homeowner benefit                                 */
/* ------------------------------------------------------------------ */

/** What a specification means for the person living with the system. Written as
 *  capability, never as a guarantee of outcome. */
export const BENEFIT_TRANSLATION: Record<string, string> = {
  sound_level:
    "Designed for quieter operation, which may help reduce outdoor-unit noise around patios, bedrooms, and neighbouring homes.",
  sound_blanket:
    "An insulating jacket around the compressor is intended to muffle the sound it makes.",
  compressor_type:
    "Adjusts output gradually instead of frequently turning fully on and off, helping maintain more consistent indoor comfort.",
  humidity_control:
    "Helps manage indoor moisture so the home can feel more comfortable without overcooling.",
  cloud_alerts:
    "Can help your contractor identify potential issues earlier and simplify service diagnosis.",
  heating_range:
    "Designed to continue providing heat across a broader range of cold outdoor conditions.",
  warranty:
    "Provides additional protection for covered components, subject to product registration and applicable warranty terms.",
  footprint:
    "May require less outdoor space and provide more placement flexibility.",
  chassis_type:
    "A side-discharge cabinet blows air sideways rather than upward, which can suit narrower side yards.",
  seer2:
    "A higher seasonal cooling rating may indicate lower energy use for the same cooling under standardised test conditions.",
  eer2:
    "A higher rating at peak conditions may indicate lower energy use on the hottest days.",
  hspf2:
    "A higher seasonal heating rating may indicate lower energy use across the heating season under standardised test conditions.",
  cop_5f:
    "Indicates how much heat the system can still move at 5°F outdoors relative to the electricity it draws.",
  cap_5f:
    "Indicates how much heating output remains available on genuinely cold days, which may reduce reliance on backup electric heat.",
  cap_47f: "Indicates the heating output available in milder winter conditions.",
  cap_95f: "Indicates the cooling output available on a hot summer day.",
  cap_115f: "Indicates the cooling output available in extreme heat.",
  charge_verification:
    "Allows your installer to confirm the refrigerant charge without gauges. Correct charge is one of the biggest influences on the efficiency a system actually delivers.",
  slow_loss_alerting:
    "Designed to alert your contractor to a slow refrigerant leak before it affects comfort.",
  regional_profiles:
    "Preconfigured setup profiles are intended to reduce guesswork when the installer commissions the system.",
  reusable_profiles:
    "Saved configuration files are intended to keep setup consistent across installations.",
  thermostat_type:
    "Describes the kind of thermostat the system is designed around and how much information it exchanges with the equipment.",
  thermostat_24v:
    "Indicates whether the system can work with a conventional 24-volt thermostat, which many homes already have wired.",
  intelligent_defrost:
    "Designed to keep delivering heat while clearing frost from the outdoor coil, instead of blowing cool air during defrost.",
  anticorrosive:
    "A protective coating on the outdoor coil is intended to resist corrosion, which can matter near the coast or in industrial air.",
  energy_star: "Carries the U.S. EPA ENERGY STAR efficiency certification.",
  energy_star_cchp:
    "Carries the ENERGY STAR cold-climate designation, awarded to models that maintain heating output in cold weather.",
  cee_2025: "Meets the Consortium for Energy Efficiency 2025 tier, which some utility rebate programmes reference.",
  refrigerant:
    "Identifies the refrigerant the system uses. Refrigerants differ in operating pressure, service procedure and global-warming potential.",

  /* Air-to-water (hydronic) capabilities */
  max_lwt:
    "The hottest water the system is rated to send to your radiators or floor loops. A higher figure means existing high-temperature radiators are more likely to work as they are.",
  min_lwt:
    "The coolest water the system is rated to leave with, which widens the range one machine can cover across heating and cooling.",
  outdoor_sound:
    "Designed for quieter outdoor operation, which may help reduce noise around patios, bedrooms and neighbouring homes.",
  indoor_sound:
    "Indicates how quiet the indoor hydronic unit is in the space it is installed in.",
  min_ambient_heating:
    "Designed to keep producing heat down to this outdoor air temperature, which may reduce how often a backup heat source is needed.",
  heating_ambient_range:
    "The span of outdoor air temperatures the system is rated to keep heating across.",
  cop_a446w95:
    "Indicates how much heat the system moves in mild weather relative to the electricity it draws, at a low water temperature.",
  cop_a5w95:
    "Indicates how much heat the system still moves at 5°F outdoors relative to the electricity it draws.",
  heat_cap_a5w95:
    "Indicates how much heating output remains available on genuinely cold days, which may reduce reliance on a backup heat source.",
  heat_cap_a446w110:
    "Indicates the heating output available at a low water temperature, the condition underfloor heating typically runs at.",
  backup_heater_cap:
    "The output of the built-in electric backup heater, which covers the gap when the heat pump alone cannot meet the load.",
  outdoor_dimensions:
    "The outdoor unit's overall size, which determines the pad and clearances the installer needs.",
  indoor_dimensions:
    "The indoor hydronic unit's overall size, which determines the mechanical space it needs.",
  air_handler_matchup:
    "Indicates the electrical supply the matching indoor unit can run on. A 115V option may avoid running a new dedicated circuit.",
  coil_only_matchup:
    "Indicates whether the outdoor unit can pair with an indoor coil alone, which can matter when keeping an existing furnace.",
  tonnage_options:
    "More available sizes means an installer can match your home more precisely rather than rounding up.",
  line_length:
    "Indicates how far the outdoor unit can be placed from the indoor unit, which affects siting options.",
  base_pan_heater:
    "A heater in the base of the outdoor unit is intended to stop melted frost re-freezing during winter operation.",
  heater_kit_3stage:
    "An optional backup electric heater with three output steps, so the system can call for only as much backup heat as it needs.",
};

/* ------------------------------------------------------------------ */
/* Simple homeowner comparison                                         */
/* ------------------------------------------------------------------ */

export type ComparisonStatus =
  | "daikin_advantage"
  | "comparable"
  | "competitor_advantage"
  | "unavailable";

export const STATUS_LABEL: Record<ComparisonStatus, string> = {
  daikin_advantage: "Daikin Advantage",
  comparable: "Comparable",
  competitor_advantage: "Competitor Advantage",
  unavailable: "Information Not Available",
};

export interface CategoryDefinition {
  key: string;
  label: string;
  icon: string;
  attributeKeys: string[];
  question: string;
}

export const CATEGORIES: CategoryDefinition[] = [
  { key: "comfort", label: "Comfort", icon: "Sofa", attributeKeys: ["compressor_type", "cap_47f"], question: "How steady will the temperature feel?" },
  { key: "quiet", label: "Quiet operation", icon: "Volume2", attributeKeys: ["sound_level"], question: "How loud is the outdoor unit?" },
  { key: "efficiency", label: "Energy efficiency", icon: "Leaf", attributeKeys: ["seer2", "hspf2"], question: "How much electricity does it use for the same comfort?" },
  { key: "heating", label: "Heating performance", icon: "Flame", attributeKeys: ["cop_5f", "cap_5f", "heating_range"], question: "How well does it heat when it gets cold?" },
  { key: "humidity", label: "Humidity management", icon: "Droplets", attributeKeys: ["humidity_control"], question: "Can it manage indoor moisture, not just temperature?" },
  { key: "smart", label: "Smart controls", icon: "Smartphone", attributeKeys: ["thermostat_type", "cloud_alerts"], question: "How do you control it, and what can it tell you?" },
  { key: "service", label: "Service and diagnostics", icon: "Wrench", attributeKeys: ["cloud_alerts", "charge_verification", "slow_loss_alerting"], question: "How easily can a contractor diagnose and service it?" },
  { key: "install", label: "Installation flexibility", icon: "Ruler", attributeKeys: ["footprint", "air_handler_matchup", "tonnage_options"], question: "How easily does it fit your home?" },
  { key: "warranty", label: "Warranty protection", icon: "ShieldPlus", attributeKeys: ["warranty"], question: "What is covered, and for how long?" },
  { key: "environment", label: "Environmental considerations", icon: "Recycle", attributeKeys: ["refrigerant", "energy_star"], question: "What refrigerant does it use and how is it certified?" },
];

/** Air-to-water categories. The hydronic sheet records no humidity-control or
 *  service-diagnostics column, so those two categories are dropped rather than shown
 *  as permanently "Information not available"; the rest point at hydronic keys. */
export const A2W_CATEGORIES: CategoryDefinition[] = [
  { key: "comfort", label: "Comfort", icon: "Sofa", attributeKeys: ["compressor_type", "heat_cap_a446w110"], question: "How steady will the temperature feel?" },
  { key: "quiet", label: "Quiet operation", icon: "Volume2", attributeKeys: ["outdoor_sound", "indoor_sound"], question: "How loud is the outdoor unit?" },
  { key: "efficiency", label: "Energy efficiency", icon: "Leaf", attributeKeys: ["cop_a446w95", "cop_a446w110"], question: "How much electricity does it use for the same comfort?" },
  { key: "heating", label: "Heating performance", icon: "Flame", attributeKeys: ["cop_a5w95", "heat_cap_a5w95", "min_ambient_heating"], question: "How well does it heat when it gets cold?" },
  { key: "water_temp", label: "Water temperature range", icon: "Thermometer", attributeKeys: ["max_lwt", "min_lwt"], question: "Can it drive the radiators or floor loops you already have?" },
  { key: "smart", label: "Smart controls", icon: "Smartphone", attributeKeys: ["thermostat_type", "cloud_alerts"], question: "How do you control it, and what can it tell you?" },
  // Dimensions and weight are recorded but have no better/worse direction, so this
  // category reports what is listed rather than ranking it.
  { key: "install", label: "Installation flexibility", icon: "Ruler", attributeKeys: ["outdoor_dimensions", "indoor_dimensions"], question: "How easily does it fit your home?" },
  { key: "environment", label: "Environmental considerations", icon: "Recycle", attributeKeys: ["refrigerant"], question: "What refrigerant does it use?" },
];

/** Categories appropriate to the products in the report. */
export function categoriesFor(products: Product[]): CategoryDefinition[] {
  return products.some((p) => p.equipmentType === "air_to_water_hp") &&
    !products.some((p) => p.equipmentType === "ducted_split_hp")
    ? A2W_CATEGORIES
    : CATEGORIES;
}

export interface CategoryComparison {
  category: CategoryDefinition;
  status: ComparisonStatus;
  /** The attribute the status was decided on. */
  decidingKey: string | null;
  daikinValue: AttributeValue | null;
  competitorValue: AttributeValue | null;
  competitor: Product | null;
  explanation: string;
  benefit: string | null;
}

function score(v: AttributeValue | undefined): number | null {
  if (!v || v.status !== "verified") return null;
  if (v.numeric !== null) return v.numeric;
  if (v.boolean !== null) return v.boolean ? 1 : 0;
  return null;
}

function better(key: string, a: number, b: number): boolean {
  return (ATTRIBUTE_BY_KEY[key]?.direction ?? "higher") === "lower" ? a < b : a > b;
}

/** Which brochure capability list backs each homeowner category, for categories the
 *  comparison sheet cannot answer. */
const BROCHURE_CATEGORY_FEATURES: Record<
  string,
  (b: BrochureCapabilities) => BrochureFeature[]
> = {
  quiet: (b) => b.quiet,
  smart: (b) => b.smartControls,
  install: (b) => b.installation,
};

/** Compares one Daikin product against one competitor across the homeowner categories. */
export function compareCategories(daikin: Product, competitor: Product): CategoryComparison[] {
  const brochure = brochureFeaturesFor(daikin);

  return categoriesFor([daikin, competitor]).map((category) => {
    let best: CategoryComparison = {
      category,
      status: "unavailable",
      decidingKey: null,
      daikinValue: null,
      competitorValue: null,
      competitor,
      explanation: `The source documents do not record a comparable value for ${category.label.toLowerCase()} on both products.`,
      benefit: null,
    };

    for (const key of category.attributeKeys) {
      const dv = daikin.attributes[key];
      const cv = competitor.attributes[key];
      const ds = score(dv);
      const cs = score(cv);

      // Text and non-directional attributes (refrigerant, compressor type,
      // dimensions) carry no score, but both products still recording a value is
      // reportable — it is just never an advantage either way.
      if (ds === null || cs === null) {
        const bothRecorded = dv?.status === "verified" && cv?.status === "verified";
        const nonDirectional = (ATTRIBUTE_BY_KEY[key]?.direction ?? "higher") === "none";
        if (bothRecorded && nonDirectional && best.status === "unavailable") {
          const label = ATTRIBUTE_BY_KEY[key]?.label ?? key;
          best = {
            category,
            status: "comparable",
            decidingKey: key,
            daikinValue: dv,
            competitorValue: cv,
            competitor,
            explanation:
              dv.display === cv.display
                ? `Both list ${dv.display} for ${label.toLowerCase()}, so this is not a point of difference.`
                : `${daikin.model} lists ${dv.display} and the compared product lists ${cv.display} for ${label.toLowerCase()}. The source records these without ranking them.`,
            benefit: BENEFIT_TRANSLATION[key] ?? null,
          };
        }
        continue;
      }

      const def = ATTRIBUTE_BY_KEY[key];
      const label = def?.label ?? key;
      let status: ComparisonStatus;
      let explanation: string;

      if (ds === cs) {
        status = "comparable";
        explanation = `Both list ${dv.display} for ${label.toLowerCase()}, so this is not a point of difference.`;
      } else if (better(key, ds, cs)) {
        status = "daikin_advantage";
        explanation = `${daikin.model} lists ${dv.display} against ${cv.display} for ${competitor.model}.`;
      } else {
        status = "competitor_advantage";
        explanation = `${competitor.model} lists ${cv.display} against ${dv.display} for ${daikin.model}.`;
      }

      best = {
        category,
        status,
        decidingKey: key,
        daikinValue: dv,
        competitorValue: cv,
        competitor,
        explanation,
        benefit: BENEFIT_TRANSLATION[key] ?? null,
      };
      break; // the first attribute with values on both sides decides the category
    }

    /* Brochure fallback: the comparison sheet has no column for smart controls or
       installation flexibility, so fall back to the brand's own consumer brochure.
       Single-product literature cannot establish an advantage, so it reports as
       "comparable" — a published capability, not a win over the competitor. */
    if (best.status === "unavailable" && brochure) {
      const features = BROCHURE_CATEGORY_FEATURES[category.key]?.(brochure);
      if (features?.length) {
        best = {
          ...best,
          status: "comparable",
          explanation: `${brochure.documentLabel} records: ${features
            .slice(0, 2)
            .map((f) => f.detail)
            .join(" ")}`,
        };
      }
    }

    return best;
  });
}

/* ------------------------------------------------------------------ */
/* Priority alignment                                                  */
/* ------------------------------------------------------------------ */

export interface PriorityAlignment {
  priority: PriorityDefinition;
  /** What the specifications say. */
  technical: {
    status: ComparisonStatus;
    statement: string;
    attributeKey: string | null;
    citation: string | null;
  };
  /** What the reviews say, when the sample is large enough to report. */
  review: {
    available: boolean;
    statement: string;
    mentions: number;
    positive: number;
    matchLabel: string;
  } | null;
  /** The combined reading, only asserted where both sources agree. */
  interpretation: string;
  basis: "verified" | "verified_and_reviews";
}

export function alignPriorities(
  priorityKeys: string[],
  daikin: Product,
  competitors: Product[],
  daikinReviews: ProductReviewSummary | null,
): PriorityAlignment[] {
  const byKey = Object.fromEntries(
    prioritiesFor([daikin, ...competitors]).map((p) => [p.key, p]),
  );
  const brochure = brochureFeaturesFor(daikin);

  return priorityKeys
    .map((key) => byKey[key] ?? PRIORITY_BY_KEY[key])
    .filter(Boolean)
    .map((priority) => {
      /* ---- technical side ---- */
      let technical: PriorityAlignment["technical"] = {
        status: "unavailable",
        statement: `The source documents do not record a comparable value for ${priority.label.toLowerCase()}.`,
        attributeKey: null,
        citation: null,
      };


      for (const attributeKey of priority.attributeKeys) {
        const dv = daikin.attributes[attributeKey];
        const ds = score(dv);
        if (ds === null) continue;

        const scored = competitors
          .map((c) => ({ product: c, value: c.attributes[attributeKey], s: score(c.attributes[attributeKey]) }))
          .filter((c) => c.s !== null) as { product: Product; value: AttributeValue; s: number }[];
        if (!scored.length) continue;

        const def = ATTRIBUTE_BY_KEY[attributeKey];
        const label = def?.label ?? attributeKey;
        const beatsAll = scored.every((c) => better(attributeKey, ds, c.s));
        const losesToAny = scored.some((c) => better(attributeKey, c.s, ds));

        technical = {
          status: beatsAll ? "daikin_advantage" : losesToAny ? "competitor_advantage" : "comparable",
          statement: beatsAll
            ? `${daikin.model} lists ${dv.display} for ${label.toLowerCase()}, ahead of every compared product with a recorded value.`
            : losesToAny
              ? `A compared product lists a stronger ${label.toLowerCase()} figure than ${daikin.model}'s ${dv.display}.`
              : `${daikin.model} lists ${dv.display} for ${label.toLowerCase()}, in line with the compared products.`,
          attributeKey,
          citation: dv.source.citation,
        };
        break;
      }

      /* ---- brochure fallback ------------------------------------------
         Where the comparison sheet has no column for a priority, the brand's own
         consumer brochure often does. It is single-product literature rather than a
         like-for-like measurement, so it is reported as "comparable" — a published
         capability — and never as an advantage over a competitor. */
      if (technical.status === "unavailable" && brochure) {
        const features = BROCHURE_PRIORITY_FEATURES[priority.key]?.(brochure);
        if (features?.length) {
          const first = features[0];
          technical = {
            status: "comparable",
            statement: `${brochure.documentLabel} records: ${first.detail}`,
            attributeKey: null,
            citation: `${brochure.documentLabel} · p.${first.page} · “${first.label}”`,
          };
        }
      }

      /* ---- review side ---- */
      let review: PriorityAlignment["review"] = null;
      if (daikinReviews && daikinReviews.count > 0 && priority.reviewThemes.length) {
        const matched = daikinReviews.themes.filter((t) => priority.reviewThemes.includes(t.key));
        const mentions = matched.reduce((n, t) => n + t.total, 0);
        const positive = matched.reduce((n, t) => n + t.positive, 0);

        if (mentions >= MIN_REPORTABLE) {
          const pct = Math.round((positive / mentions) * 100);
          review = {
            available: true,
            statement: `${priority.label} is mentioned in ${mentions} matching reviews, ${positive} of them from customers who rated the product four or five stars (${pct}%).`,
            mentions,
            positive,
            matchLabel: daikinReviews.matchLabel,
          };
        } else if (mentions > 0) {
          review = {
            available: false,
            statement: `Only ${mentions} matching ${mentions === 1 ? "review mentions" : "reviews mention"} this topic — too few to draw a conclusion from.`,
            mentions,
            positive,
            matchLabel: daikinReviews.matchLabel,
          };
        }
      }

      /* ---- combined interpretation, asserted only where both agree ---- */
      let interpretation: string;
      let basis: PriorityAlignment["basis"] = "verified";

      const reviewSupports = review?.available && review.positive / review.mentions >= 0.8;

      if (technical.status === "daikin_advantage" && reviewSupports) {
        interpretation = `Both the published product information and the available customer feedback support ${priority.label.toLowerCase()} as a strength of the selected Daikin system.`;
        basis = "verified_and_reviews";
      } else if (technical.status === "daikin_advantage" && review?.available && !reviewSupports) {
        interpretation = `The published specification points to an advantage here, but the available customer reviews are mixed. Installation conditions and equipment configuration may affect the experience.`;
        basis = "verified_and_reviews";
      } else if (technical.status === "daikin_advantage") {
        interpretation = `The published product information supports ${priority.label.toLowerCase()} as a strength. There is not enough matching customer feedback on this topic to add to it.`;
      } else if (technical.status === "competitor_advantage") {
        interpretation = `A compared product currently leads on this priority in the published specifications. This is worth discussing openly rather than working around.`;
      } else if (technical.status === "comparable") {
        interpretation = `The compared products are broadly similar on this priority, so it is unlikely to be the deciding factor.`;
      } else {
        interpretation = `The source documents do not record enough information to compare this priority.`;
      }

      return { priority, technical, review, interpretation, basis };
    });
}

/* ------------------------------------------------------------------ */
/* Recommendation reasons                                              */
/* ------------------------------------------------------------------ */

export interface RecommendationReason {
  title: string;
  body: string;
  basis: "verified" | "verified_and_reviews";
  citation: string | null;
}

const REASON_TITLE: Record<string, string> = {
  sound_level: "Quieter comfort",
  compressor_type: "More consistent comfort",
  humidity_control: "Moisture management, not just cooling",
  cloud_alerts: "Added service visibility",
  charge_verification: "Set up correctly from day one",
  slow_loss_alerting: "Early warning on refrigerant loss",
  warranty: "Strong warranty protection",
  seer2: "Efficient cooling",
  hspf2: "Efficient heating",
  cop_5f: "Cold-weather capability",
  cap_5f: "Heat when it matters most",
  air_handler_matchup: "Flexible indoor installation",
  heating_range: "A wider heating window",
  footprint: "A smaller outdoor footprint",
};

export function buildRecommendationReasons(
  result: ComparisonResult,
  daikin: Product,
  priorityKeys: string[],
  daikinReviews: ProductReviewSummary | null,
): RecommendationReason[] {
  const prioritised = new Set(
    priorityKeys.flatMap((k) => PRIORITY_BY_KEY[k]?.attributeKeys ?? []),
  );

  const edges = result.edges
    .filter((e) => e.daikinProduct.id === daikin.id)
    .sort((a, b) => {
      const aP = prioritised.has(a.attributeKey) ? 1 : 0;
      const bP = prioritised.has(b.attributeKey) ? 1 : 0;
      return bP - aP;
    });

  const reasons: RecommendationReason[] = [];

  for (const edge of edges.slice(0, 5)) {
    const benefit = BENEFIT_TRANSLATION[edge.attributeKey];
    if (!benefit) continue;

    const themes = PRIORITIES.find((p) => p.attributeKeys.includes(edge.attributeKey))?.reviewThemes ?? [];
    const matched = daikinReviews
      ? daikinReviews.themes.filter((t) => themes.includes(t.key))
      : [];
    const mentions = matched.reduce((n, t) => n + t.total, 0);
    const positive = matched.reduce((n, t) => n + t.positive, 0);
    const reviewBacked = mentions >= MIN_REPORTABLE && positive / mentions >= 0.8;

    reasons.push({
      title: REASON_TITLE[edge.attributeKey] ?? edge.attributeLabel,
      body: reviewBacked
        ? `${benefit} ${edge.attributeLabel} is listed at ${edge.daikinValue.display}, and this topic is also mentioned positively in ${positive} of ${mentions} matching customer reviews.`
        : `${benefit} ${edge.attributeLabel} is listed at ${edge.daikinValue.display}.`,
      basis: reviewBacked ? "verified_and_reviews" : "verified",
      citation: edge.citation,
    });
  }

  return reasons.slice(0, 5);
}

/** Chooses the Daikin product to recommend: the one carrying the most verified
 *  edges that map to the homeowner's stated priorities. Never a fixed default. */
export function pickRecommendedProduct(
  result: ComparisonResult,
  priorityKeys: string[],
): Product | null {
  const daikinProducts = result.daikinProducts;
  if (!daikinProducts.length) return null;
  if (daikinProducts.length === 1) return daikinProducts[0];

  const prioritised = new Set(priorityKeys.flatMap((k) => PRIORITY_BY_KEY[k]?.attributeKeys ?? []));

  const scored = daikinProducts.map((p) => {
    const edges = result.edges.filter((e) => e.daikinProduct.id === p.id);
    const priorityHits = edges.filter((e) => prioritised.has(e.attributeKey)).length;
    return { product: p, score: priorityHits * 10 + edges.length };
  });

  return scored.reduce((a, b) => (b.score > a.score ? b : a)).product;
}

export { UNAVAILABLE };
