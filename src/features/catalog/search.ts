import { PRODUCTS, isColdClimate, isQuiet } from "@/data/catalog";
import type { Product } from "@/data/types";
import { normalizeSearch } from "@/lib/utils";

export interface SearchToken {
  /** Human-readable text that produced the match, shown as the "why it matched" line. */
  label: string;
  value: string;
}

interface IndexedProduct {
  product: Product;
  tokens: SearchToken[];
  haystack: string;
}

const FEATURE_KEYS = [
  "refrigerant",
  "compressor_type",
  "chassis_type",
  "air_handler_matchup",
  "thermostat_type",
  "warranty",
  "heating_range",
  "cooling_range",
];

function buildIndex(): IndexedProduct[] {
  return PRODUCTS.map((product) => {
    const tokens: SearchToken[] = [
      { label: "Brand", value: product.brand },
      { label: "Model", value: product.model },
      { label: "Family", value: product.family },
      { label: "Equipment", value: product.equipmentTypeLabel },
    ];

    for (const key of FEATURE_KEYS) {
      const v = product.attributes[key];
      if (v?.status === "verified") tokens.push({ label: key, value: v.display });
    }

    if (product.tonnages) {
      for (const t of product.tonnages) {
        tokens.push({ label: "Tonnage", value: `${t} ton` });
        tokens.push({ label: "Tonnage", value: `${t}t` });
      }
    }

    const sound = product.attributes.sound_level ?? product.attributes.outdoor_sound;
    if (sound?.status === "verified" && sound.numeric !== null) {
      tokens.push({ label: "Sound", value: `${sound.numeric} dBA` });
    }
    if (isQuiet(product)) tokens.push({ label: "Feature", value: "quiet operation" });
    if (isColdClimate(product)) tokens.push({ label: "Feature", value: "cold climate" });

    for (const key of [
      "charge_verification",
      "slow_loss_alerting",
      "cloud_alerts",
      "intelligent_defrost",
      "humidity_control",
      "energy_star",
      "energy_star_cchp",
      "anticorrosive",
    ]) {
      const v = product.attributes[key];
      if (v?.status === "verified" && v.boolean === true) {
        tokens.push({ label: "Feature", value: key.replace(/_/g, " ") });
      }
    }

    const haystack = normalizeSearch(
      [product.displayName, product.sourceHeader, ...tokens.map((t) => t.value)].join(" "),
    );

    return { product, tokens, haystack };
  });
}

const INDEX = buildIndex();

export interface SearchHit {
  product: Product;
  score: number;
  /** The metric shown on the result row. */
  metricLabel: string;
  metricValue: string;
}

function headlineMetric(product: Product): { metricLabel: string; metricValue: string } {
  const seer = product.attributes.seer2;
  if (seer?.status === "verified") return { metricLabel: "SEER2", metricValue: seer.display };
  // W158°F is blank for some hydronic models; W95°F is recorded for all of them.
  const cop =
    product.attributes.cop_5f ??
    product.attributes.cop_a446w95 ??
    product.attributes.cop_a446w158;
  if (cop?.status === "verified") return { metricLabel: "COP", metricValue: cop.display };
  const sound = product.attributes.sound_level ?? product.attributes.outdoor_sound;
  if (sound?.status === "verified") return { metricLabel: "Sound", metricValue: sound.display };
  const lwt = product.attributes.max_lwt;
  // `display` already carries the unit, so it must not be suffixed again.
  if (lwt?.status === "verified") return { metricLabel: "Max LWT", metricValue: lwt.display };
  return { metricLabel: "Data", metricValue: "Information unavailable" };
}

export interface SearchFilters {
  brands?: string[];
  families?: string[];
  equipmentType?: string | null;
}

export function searchProducts(query: string, filters: SearchFilters = {}, limit = 40): SearchHit[] {
  const q = normalizeSearch(query);
  const { brands = [], families = [], equipmentType = null } = filters;

  const results: SearchHit[] = [];

  for (const entry of INDEX) {
    const { product } = entry;
    if (brands.length && !brands.includes(product.brand)) continue;
    if (families.length && !families.includes(product.family)) continue;
    if (equipmentType && product.equipmentType !== equipmentType) continue;

    let score = 0;
    if (!q) {
      score = 1;
    } else {
      const model = normalizeSearch(product.model);
      const display = normalizeSearch(product.displayName);
      const brand = normalizeSearch(product.brand);
      const family = normalizeSearch(product.family);

      if (model === q || display === q) score = 120;
      else if (model.startsWith(q)) score = 100;
      else if (display.startsWith(q)) score = 92;
      else if (brand.startsWith(q)) score = 84;
      else if (family.startsWith(q)) score = 78;
      else if (display.includes(q)) score = 60;
      else if (entry.haystack.includes(q)) score = 40;
      else continue;
    }

    if (product.isDaikin) score += 8;
    results.push({ product, score, ...headlineMetric(product) });
  }

  return results
    .sort((a, b) => b.score - a.score || a.product.displayName.localeCompare(b.product.displayName))
    .slice(0, limit);
}

export interface GroupedHits {
  daikin: SearchHit[];
  competitors: SearchHit[];
}

export function groupHits(hits: SearchHit[]): GroupedHits {
  return {
    daikin: hits.filter((h) => h.product.isDaikin),
    competitors: hits.filter((h) => !h.product.isDaikin),
  };
}

/** Splits `text` into segments so the matched run can be highlighted. */
export function highlightSegments(text: string, query: string): { text: string; match: boolean }[] {
  const q = normalizeSearch(query);
  if (!q) return [{ text, match: false }];

  // Walk the original string, tracking its normalized offset, so highlighting
  // survives spaces and hyphens that the normalizer strips.
  const map: number[] = [];
  let normalized = "";
  for (let i = 0; i < text.length; i += 1) {
    const n = normalizeSearch(text[i]);
    if (n) {
      normalized += n;
      map.push(i);
    }
  }
  const at = normalized.indexOf(q);
  if (at === -1) return [{ text, match: false }];

  const start = map[at];
  const end = (map[at + q.length - 1] ?? start) + 1;
  const out: { text: string; match: boolean }[] = [];
  if (start > 0) out.push({ text: text.slice(0, start), match: false });
  out.push({ text: text.slice(start, end), match: true });
  if (end < text.length) out.push({ text: text.slice(end), match: false });
  return out;
}
