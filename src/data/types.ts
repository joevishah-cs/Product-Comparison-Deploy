/** Shapes for the generated source records and the normalized catalog built from them. */

export type SourceAssessment =
  | "daikin_better"
  | "competitor_better"
  | "not_available_marker"
  | "equal_or_no_difference";

export type VerificationStatus = "verified" | "unavailable" | "formula_error";

export type AttributeDirection = "higher" | "lower" | "none" | "range";

export type AttributeKind =
  | "measure"
  | "bool"
  | "text"
  | "range"
  | "warranty"
  | "tonnage"
  | "ordinal";

/* ------------------------------------------------------------------ */
/* Generated source records                                            */
/* ------------------------------------------------------------------ */

export interface BattlecardProductRecord {
  colIndex: number;
  sourceHeader: string;
  model: string;
  brand: string | null;
  family: string;
}

export interface BattlecardRowRecord {
  key: string;
  label: string;
  sourceLabel: string;
  group: string;
  unit: string;
  direction: AttributeDirection;
  kind: AttributeKind;
  pdfRow: number;
  values: (string | null)[];
  assessment: (SourceAssessment | null)[];
  comment: string | null;
}

export interface BattlecardSource {
  products: BattlecardProductRecord[];
  rows: BattlecardRowRecord[];
  legend: { token: string; meaning: string }[];
  title: string;
}

export interface HydronicProductRecord {
  rowRefs: string[];
  sourceHeader: string;
  brand: string;
  model: string | null;
  family: string | null;
}

export interface HydronicCellRecord {
  ref: string;
  raw: string | null;
  formula: string | null;
  error: boolean;
}

export interface HydronicRowRecord {
  key: string;
  label: string;
  sourceLabel: string;
  group: string;
  unit: string;
  direction: AttributeDirection;
  kind: AttributeKind;
  headerRef: string;
  cells: HydronicCellRecord[];
}

export interface HydronicSource {
  products: HydronicProductRecord[];
  rows: HydronicRowRecord[];
  errorCells: { ref: string; raw: string }[];
}

/* ------------------------------------------------------------------ */
/* Normalized catalog                                                  */
/* ------------------------------------------------------------------ */

export interface SourceDocument {
  id: string;
  title: string;
  fileName: string;
  kind: "spreadsheet" | "pdf";
  scope: string;
  importedAt: string;
  excludedCells: number;
  productCount: number;
}

export interface SourceLocation {
  documentId: string;
  /** Short citation shown next to a value, e.g. `Battlecard p.1 · row "SEER2" · col "DH6VS FIT"`. */
  citation: string;
  page?: number;
  sheet?: string;
  cell?: string;
  row?: string;
  column?: string;
}

export interface AttributeValue {
  attributeKey: string;
  /** Verbatim source text. `null` when the source cell was blank. */
  raw: string | null;
  /** Parsed number where the attribute is numeric. */
  numeric: number | null;
  /** Secondary parsed number (range max, replacement-warranty term). */
  numericSecondary: number | null;
  /** Parsed boolean. `null` for blank, "NA" or non-boolean attributes. */
  boolean: boolean | null;
  /** Display string, already resolved to "Information unavailable" when needed. */
  display: string;
  unit: string;
  status: VerificationStatus;
  source: SourceLocation;
  sourceAssessment: SourceAssessment | null;
  importedAt: string;
}

export interface AttributeDefinition {
  key: string;
  label: string;
  sourceLabel: string;
  group: string;
  unit: string;
  direction: AttributeDirection;
  kind: AttributeKind;
  /** Plain-language explanation shown in tooltips for homeowners and dealers. */
  plainLanguage: string;
  /** Verbatim analyst comment from the source document, when present. */
  sourceComment: string | null;
  documentId: string;
  equipmentType: EquipmentType;
}

export type EquipmentType = "ducted_split_hp" | "air_to_water_hp";

export interface Product {
  id: string;
  brand: string;
  /** True when the source column carried no brand line. */
  brandFromSource: boolean;
  model: string;
  modelIsBrandLevel: boolean;
  displayName: string;
  family: string;
  familyFromSource: boolean;
  equipmentType: EquipmentType;
  equipmentTypeLabel: string;
  isDaikin: boolean;
  chassis: string | null;
  image: string;
  imageIsRepresentative: boolean;
  tonnages: number[] | null;
  /** Rated capacities in kBtu/h. Air-to-water models are listed by capacity, not tonnage. */
  capacities: number[] | null;
  documentId: string;
  sourceHeader: string;
  attributes: Record<string, AttributeValue>;
}
