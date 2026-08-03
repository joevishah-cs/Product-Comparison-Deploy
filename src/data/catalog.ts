import { BATTLECARD } from "./source-records";
import { A2W } from "./a2w-source-records";
import { PLAIN_LANGUAGE } from "./plain-language";
import { UNAVAILABLE } from "@/lib/utils";
import type {
  AttributeDefinition,
  AttributeValue,
  EquipmentType,
  Product,
  SourceDocument,
  SourceLocation,
} from "./types";

const IMPORTED_AT = "2026-07-30T00:00:00.000Z";

export const DOC_BATTLECARD = "doc_battlecard_pdf";
export const DOC_A2W = "doc_a2w_xlsx";

export const SOURCE_DOCUMENTS: SourceDocument[] = [
  {
    id: DOC_BATTLECARD,
    title: "Daikin FIT Battlecard",
    fileName: "Daikin FIT Battlecard.pdf",
    kind: "pdf",
    scope: "R-32 inverter ducted split heat pumps — Daikin FIT vs. 19 competitor models",
    importedAt: IMPORTED_AT,
    excludedCells: 0,
    productCount: BATTLECARD.products.length,
  },
  {
    id: DOC_A2W,
    title: "A2W Heat Pump Comparison",
    fileName: "A2WHP Data Comparison.xlsx",
    kind: "spreadsheet",
    scope: "Air-to-water heat pumps — Daikin Altherma vs. Samsung EHS vs. Mitsubishi Ecodan",
    importedAt: IMPORTED_AT,
    excludedCells: A2W.errorCells.length,
    productCount: A2W.products.length,
  },
];

export const EXCLUDED_CELLS = A2W.errorCells;

export const EQUIPMENT_TYPE_LABEL: Record<EquipmentType, string> = {
  ducted_split_hp: "Inverter ducted split heat pump",
  air_to_water_hp: "Air-to-water (hydronic) heat pump",
};

/* ------------------------------------------------------------------ */
/* Value parsing                                                       */
/* ------------------------------------------------------------------ */

const NA_TOKENS = new Set(["na", "n/a", "n.a.", "-", "--", ""]);

function isNaToken(raw: string | null): boolean {
  return raw === null || NA_TOKENS.has(raw.trim().toLowerCase());
}

/** Pulls every number out of a string, tolerating thousands separators. */
function extractNumbers(raw: string): number[] {
  const matches = raw.replace(/,(?=\d{3}\b)/g, "").match(/-?\d+(?:\.\d+)?/g);
  if (!matches) return [];
  return matches.map(Number).filter((n) => !Number.isNaN(n));
}

function parseBoolean(raw: string): boolean | null {
  const v = raw.trim().toLowerCase();
  if (v === "yes") return true;
  if (v === "no") return false;
  return null;
}

function parseTonnages(raw: string): number[] {
  const nums = extractNumbers(raw);
  return Array.from(new Set(nums.filter((n) => n > 0 && n <= 25))).sort((a, b) => a - b);
}

interface ParseResult {
  numeric: number | null;
  numericSecondary: number | null;
  boolean: boolean | null;
  display: string;
}

function parseValue(kind: string, raw: string): ParseResult {
  const text = raw.trim();
  switch (kind) {
    case "measure": {
      const nums = extractNumbers(text);
      return {
        numeric: nums.length ? nums[nums.length - 1] : null,
        numericSecondary: null,
        boolean: null,
        display: text,
      };
    }
    case "ordinal": {
      const signs = (text.match(/\$/g) ?? []).length;
      return { numeric: signs || null, numericSecondary: null, boolean: null, display: text };
    }
    case "bool": {
      return { numeric: null, numericSecondary: null, boolean: parseBoolean(text), display: text };
    }
    case "tonnage": {
      const tons = parseTonnages(text);
      return {
        numeric: tons.length || null,
        numericSecondary: null,
        boolean: null,
        display: text,
      };
    }
    case "range": {
      const nums = extractNumbers(text);
      if (nums.length >= 2) {
        return { numeric: nums[0], numericSecondary: nums[1], boolean: null, display: text };
      }
      if (nums.length === 1) {
        // Sources such as "-13F" or "125F" record only one bound.
        return { numeric: nums[0], numericSecondary: null, boolean: null, display: text };
      }
      return { numeric: null, numericSecondary: null, boolean: null, display: text };
    }
    case "warranty": {
      const nums = extractNumbers(text);
      return {
        numeric: nums.length ? nums[0] : null,
        numericSecondary: nums.length > 1 ? nums[1] : null,
        boolean: null,
        display: text,
      };
    }
    default:
      return { numeric: null, numericSecondary: null, boolean: null, display: text };
  }
}

/** Spreadsheet cells arrive as bare numbers. The verbatim value is kept in `raw`;
 *  the display string adds separators and the unit so it is readable on screen. */
function formatSpreadsheetValue(parsed: ParseResult, unit: string): string {
  if (parsed.numeric === null) return parsed.display;
  if (unit === "ratio") return parsed.numeric.toFixed(2);
  const digits = unit === "BTU/h" || unit === "Btu/h" ? 0 : 1;
  const formatted = parsed.numeric.toLocaleString("en-US", { maximumFractionDigits: digits });
  return unit ? `${formatted} ${unit}` : formatted;
}

function unavailableValue(
  attributeKey: string,
  unit: string,
  source: SourceLocation,
  status: "unavailable" | "formula_error" = "unavailable",
  raw: string | null = null,
): AttributeValue {
  return {
    attributeKey,
    raw,
    numeric: null,
    numericSecondary: null,
    boolean: null,
    display: UNAVAILABLE,
    unit,
    status,
    source,
    sourceAssessment: null,
    importedAt: IMPORTED_AT,
  };
}

/* ------------------------------------------------------------------ */
/* Attribute definitions                                               */
/* ------------------------------------------------------------------ */

function buildAttributeDefinitions(): AttributeDefinition[] {
  const defs: AttributeDefinition[] = [];
  for (const row of BATTLECARD.rows) {
    defs.push({
      key: row.key,
      label: row.label,
      sourceLabel: row.sourceLabel,
      group: row.group,
      unit: row.unit,
      direction: row.direction,
      kind: row.kind,
      plainLanguage: PLAIN_LANGUAGE[row.key] ?? "",
      sourceComment: row.comment,
      documentId: DOC_BATTLECARD,
      equipmentType: "ducted_split_hp",
    });
  }
  for (const row of A2W.rows) {
    defs.push({
      key: row.key,
      label: row.label,
      sourceLabel: row.sourceLabel,
      group: row.group,
      unit: row.unit,
      direction: row.direction,
      kind: row.kind,
      plainLanguage: PLAIN_LANGUAGE[row.key] ?? "",
      sourceComment: null,
      documentId: DOC_A2W,
      equipmentType: "air_to_water_hp",
    });
  }
  return defs;
}

export const ATTRIBUTE_DEFINITIONS = buildAttributeDefinitions();

export const ATTRIBUTE_BY_KEY: Record<string, AttributeDefinition> = Object.fromEntries(
  ATTRIBUTE_DEFINITIONS.map((d) => [d.key, d]),
);

export const ATTRIBUTE_KEYS_BY_EQUIPMENT: Record<EquipmentType, string[]> = {
  ducted_split_hp: BATTLECARD.rows.map((r) => r.key),
  air_to_water_hp: A2W.rows.map((r) => r.key),
};

/* ------------------------------------------------------------------ */
/* Product construction                                                */
/* ------------------------------------------------------------------ */

function slug(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function chassisImage(chassis: string | null, isDaikin: boolean, atw: boolean): string {
  const tint = isDaikin ? "daikin" : "competitor";
  if (atw) return `/products/atw-${tint}.svg`;
  const isCube = (chassis ?? "").toLowerCase().includes("cube");
  return `/products/${isCube ? "cube" : "sd"}-${tint}.svg`;
}

function buildBattlecardProducts(): Product[] {
  const chassisRow = BATTLECARD.rows.find((r) => r.key === "chassis_type");
  const tonnageRow = BATTLECARD.rows.find((r) => r.key === "tonnage_options");

  return BATTLECARD.products.map((p, idx) => {
    const isDaikin = p.brand === "DAIKIN";
    const brandLabel = p.brand ? titleCaseBrand(p.brand) : UNAVAILABLE;
    const chassisRaw = chassisRow?.values[idx] ?? null;
    const tonnageRaw = tonnageRow?.values[idx] ?? null;
    const tonnages = tonnageRaw && !isNaToken(tonnageRaw) ? parseTonnages(tonnageRaw) : null;

    const attributes: Record<string, AttributeValue> = {};
    for (const row of BATTLECARD.rows) {
      const raw = row.values[idx] ?? null;
      const source: SourceLocation = {
        documentId: DOC_BATTLECARD,
        citation: `Daikin FIT Battlecard.pdf · p.1 · row "${row.sourceLabel}" · column "${p.sourceHeader}"`,
        page: 1,
        row: row.sourceLabel,
        column: p.sourceHeader,
      };
      const assessment = row.assessment[idx] ?? null;

      if (isNaToken(raw)) {
        const v = unavailableValue(row.key, row.unit, source, "unavailable", raw);
        v.sourceAssessment = assessment;
        attributes[row.key] = v;
        continue;
      }

      const parsed = parseValue(row.kind, raw as string);
      attributes[row.key] = {
        attributeKey: row.key,
        raw,
        numeric: parsed.numeric,
        numericSecondary: parsed.numericSecondary,
        boolean: parsed.boolean,
        display: parsed.display,
        unit: row.unit,
        status: "verified",
        source,
        sourceAssessment: assessment,
        importedAt: IMPORTED_AT,
      };
    }

    return {
      id: `bc_${slug(p.sourceHeader)}`,
      brand: brandLabel,
      brandFromSource: Boolean(p.brand),
      model: p.model,
      modelIsBrandLevel: false,
      displayName: p.brand ? `${titleCaseBrand(p.brand)} ${p.model}` : p.model,
      family: p.family,
      familyFromSource: true,
      equipmentType: "ducted_split_hp",
      equipmentTypeLabel: EQUIPMENT_TYPE_LABEL.ducted_split_hp,
      isDaikin,
      chassis: chassisRaw && !isNaToken(chassisRaw) ? chassisRaw : null,
      image: chassisImage(chassisRaw, isDaikin, false),
      imageIsRepresentative: true,
      tonnages: tonnages && tonnages.length ? tonnages : null,
      capacities: null,
      documentId: DOC_BATTLECARD,
      sourceHeader: p.sourceHeader,
      attributes,
    };
  });
}

const BRAND_CASING: Record<string, string> = {
  DAIKIN: "Daikin",
  "CARRIER/MIDEA": "Carrier / Midea",
  MIDEA: "Midea",
  GREE: "GREE",
  BOSCH: "Bosch",
  LG: "LG",
  HISENSE: "Hisense",
  YORK: "York",
  RHEEM: "Rheem",
  TRANE: "Trane",
  Samsung: "Samsung",
  Mitsubishi: "Mitsubishi",
};

function titleCaseBrand(brand: string): string {
  return BRAND_CASING[brand] ?? brand;
}

/** A2W model numbers encode the rated capacity in kBtu/h: UPRA036DAVK -> 36,
 *  AE041FCYDCG/AA -> 41, WUZ-SA24NMZ -> 24. Read it off the outdoor model so the
 *  list stays correct if the sheet gains models. */
function a2wCapacity(model: string | null): number[] | null {
  if (!model) return null;
  const m = model.match(/(\d{2,3})/);
  if (!m) return null;
  const kbtu = Number(m[1]);
  return kbtu >= 12 && kbtu <= 200 ? [kbtu] : null;
}

function buildA2WProducts(): Product[] {
  // Every capacity offered by a brand in this sheet, so a single selected model can
  // still show the range its family is listed in.
  const capacitiesByBrand = new Map<string, number[]>();
  for (const p of A2W.products) {
    const caps = a2wCapacity(p.model);
    if (!caps) continue;
    const list = capacitiesByBrand.get(p.brand) ?? [];
    for (const c of caps) if (!list.includes(c)) list.push(c);
    capacitiesByBrand.set(p.brand, list.sort((a, b) => a - b));
  }

  return A2W.products.map((p, idx) => {
    const isDaikin = p.brand === "Daikin";
    const attributes: Record<string, AttributeValue> = {};

    for (const row of A2W.rows) {
      const cell = row.cells[idx];
      const source: SourceLocation = {
        documentId: DOC_A2W,
        citation: `A2WHP Data Comparison.xlsx · cell ${cell.ref} · "${row.sourceLabel}"`,
        sheet: "Sheet1",
        cell: cell.ref,
        row: p.sourceHeader,
        column: row.sourceLabel,
      };

      if (cell.error) {
        attributes[row.key] = unavailableValue(
          row.key,
          row.unit,
          source,
          "formula_error",
          cell.raw,
        );
        continue;
      }
      if (isNaToken(cell.raw)) {
        attributes[row.key] = unavailableValue(row.key, row.unit, source, "unavailable", cell.raw);
        continue;
      }

      const parsed = parseValue(row.kind, cell.raw as string);
      attributes[row.key] = {
        attributeKey: row.key,
        raw: cell.raw,
        numeric: parsed.numeric,
        numericSecondary: parsed.numericSecondary,
        boolean: parsed.boolean,
        display: formatSpreadsheetValue(parsed, row.unit),
        unit: row.unit,
        status: "verified",
        source,
        sourceAssessment: null,
        importedAt: IMPORTED_AT,
      };
    }

    return {
      id: `a2w_${slug(p.sourceHeader)}`,
      brand: p.brand,
      brandFromSource: true,
      model: p.model ?? p.sourceHeader,
      modelIsBrandLevel: p.model === null,
      displayName: p.sourceHeader,
      family: p.family ?? "Air-to-water",
      familyFromSource: p.family !== null,
      equipmentType: "air_to_water_hp",
      equipmentTypeLabel: EQUIPMENT_TYPE_LABEL.air_to_water_hp,
      isDaikin,
      chassis: null,
      image: chassisImage(null, isDaikin, true),
      imageIsRepresentative: true,
      tonnages: null,
      capacities: capacitiesByBrand.get(p.brand) ?? a2wCapacity(p.model),
      documentId: DOC_A2W,
      sourceHeader: p.sourceHeader,
      attributes,
    };
  });
}

export const PRODUCTS: Product[] = [...buildBattlecardProducts(), ...buildA2WProducts()];

export const PRODUCT_BY_ID: Record<string, Product> = Object.fromEntries(
  PRODUCTS.map((p) => [p.id, p]),
);

export const BRANDS: string[] = Array.from(new Set(PRODUCTS.map((p) => p.brand))).sort((a, b) => {
  if (a === "Daikin") return -1;
  if (b === "Daikin") return 1;
  if (a === UNAVAILABLE) return 1;
  if (b === UNAVAILABLE) return -1;
  return a.localeCompare(b);
});

export const FAMILIES: string[] = Array.from(new Set(PRODUCTS.map((p) => p.family))).sort((a, b) => {
  if (a === "Daikin FIT") return -1;
  if (b === "Daikin FIT") return 1;
  return a.localeCompare(b);
});

export const REFRIGERANTS: string[] = Array.from(
  new Set(
    PRODUCTS.map((p) => p.attributes.refrigerant?.display).filter(
      (v): v is string => Boolean(v) && v !== UNAVAILABLE,
    ),
  ),
).sort();

/* ------------------------------------------------------------------ */
/* Derived helpers used across the app                                 */
/* ------------------------------------------------------------------ */

/** Cold-climate signal: ENERGY STAR ccHP verified true, or a heating range that
 *  reaches at or below 0°F. Both are read from source values only. */
export function isColdClimate(product: Product): boolean {
  const cchp = product.attributes.energy_star_cchp;
  if (cchp?.status === "verified" && cchp.boolean === true) return true;
  const heat = product.attributes.heating_range;
  if (heat?.status === "verified" && heat.numeric !== null && heat.numeric <= 0) return true;
  // Hydronic products record the outdoor-air envelope instead. The leaving-water
  // minimum is a water temperature and says nothing about cold-weather capability.
  const minAmbient = product.attributes.min_ambient_heating;
  if (minAmbient?.status === "verified" && minAmbient.numeric !== null && minAmbient.numeric <= 0) {
    return true;
  }
  return false;
}

/** Quiet-operation signal: a verified sound level at or below 50 dBA. */
export function isQuiet(product: Product): boolean {
  const sound = product.attributes.sound_level ?? product.attributes.outdoor_sound;
  return sound?.status === "verified" && sound.numeric !== null && sound.numeric <= 50;
}

export function coverageFor(product: Product): { verified: number; total: number; pct: number } {
  const keys = ATTRIBUTE_KEYS_BY_EQUIPMENT[product.equipmentType];
  const total = keys.length;
  const verified = keys.filter((k) => product.attributes[k]?.status === "verified").length;
  return { verified, total, pct: total ? Math.round((verified / total) * 100) : 0 };
}
