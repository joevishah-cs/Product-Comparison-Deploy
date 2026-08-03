import * as React from "react";
import { LayoutGrid, List, Search, Plus, Check, SlidersHorizontal, X, FileText } from "lucide-react";
import { cn, UNAVAILABLE, normalizeSearch } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ProductVisual } from "@/components/common/ProductVisual";
import { Citation, ValueText } from "@/components/common/Provenance";
import { useToast } from "@/components/ui/toast";
import { useSelection } from "@/features/selection/SelectionProvider";
import { EQUIPMENT_TYPE_LABEL, PRODUCTS, coverageFor, isColdClimate, isQuiet } from "@/data/catalog";
import { documentsForProduct } from "@/data/documents";
import { DocumentsDialog } from "./DocumentsDialog";
import type { EquipmentType, Product } from "@/data/types";

type SortKey = "model" | "brand" | "seer2" | "sound" | "warranty";

const SORT_LABEL: Record<SortKey, string> = {
  model: "Model (A–Z)",
  brand: "Brand (A–Z)",
  seer2: "SEER2 (high → low)",
  sound: "Sound level (low → high)",
  warranty: "Warranty (long → short)",
};

function sortValue(p: Product, key: SortKey): number | string {
  switch (key) {
    case "brand":
      return `${p.brand} ${p.model}`;
    case "seer2":
      return -(p.attributes.seer2?.numeric ?? -Infinity);
    case "sound": {
      const s = p.attributes.sound_level ?? p.attributes.outdoor_sound;
      return s?.status === "verified" && s.numeric !== null ? s.numeric : Infinity;
    }
    case "warranty":
      return -(p.attributes.warranty?.numeric ?? -Infinity);
    default:
      return p.model;
  }
}

function FilterSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border-b border-edge py-4 last:border-b-0">
      <h3 className="mb-2.5 text-xs font-bold uppercase tracking-wider text-navy-400">{title}</h3>
      {children}
    </div>
  );
}

function CheckRow({
  label,
  checked,
  onChange,
  count,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  count?: number;
}) {
  return (
    <label className="flex min-h-[38px] cursor-pointer items-center gap-2.5 rounded-lg px-1 hover:bg-navy-50">
      <Checkbox checked={checked} onCheckedChange={(v) => onChange(v === true)} aria-label={label} />
      <span className="flex-1 text-sm text-navy-700">{label}</span>
      {count !== undefined && <span className="text-xs font-medium text-navy-400">{count}</span>}
    </label>
  );
}

const EQUIPMENT_TABS: { key: EquipmentType | "all"; label: string }[] = [
  { key: "all", label: "All equipment" },
  { key: "ducted_split_hp", label: "Air-to-Air (ducted split)" },
  { key: "air_to_water_hp", label: "Air-to-Water (hydronic)" },
];

export function ProductExplorerPage() {
  const { toggle, isSelected } = useSelection();
  const { notify } = useToast();

  const [query, setQuery] = React.useState("");
  const [equipmentType, setEquipmentType] = React.useState<EquipmentType | "all">("all");
  const [brands, setBrands] = React.useState<string[]>([]);
  const [families, setFamilies] = React.useState<string[]>([]);
  const [refrigerants, setRefrigerants] = React.useState<string[]>([]);
  const [coldOnly, setColdOnly] = React.useState(false);
  const [quietOnly, setQuietOnly] = React.useState(false);
  const [verifiedOnly, setVerifiedOnly] = React.useState(false);
  const [view, setView] = React.useState<"grid" | "list">("grid");
  const [sort, setSort] = React.useState<SortKey>("model");
  const [filtersOpen, setFiltersOpen] = React.useState(false);

  const scopedProducts = React.useMemo(
    () => (equipmentType === "all" ? PRODUCTS : PRODUCTS.filter((p) => p.equipmentType === equipmentType)),
    [equipmentType],
  );

  const scopedBrands = React.useMemo(
    () => Array.from(new Set(scopedProducts.map((p) => p.brand))).sort((a, b) => a.localeCompare(b)),
    [scopedProducts],
  );
  const scopedFamilies = React.useMemo(
    () => Array.from(new Set(scopedProducts.map((p) => p.family))).sort((a, b) => a.localeCompare(b)),
    [scopedProducts],
  );
  const scopedRefrigerants = React.useMemo(
    () =>
      Array.from(
        new Set(
          scopedProducts
            .map((p) => p.attributes.refrigerant)
            .filter((r): r is NonNullable<typeof r> => r?.status === "verified")
            .map((r) => r.display),
        ),
      ).sort((a, b) => a.localeCompare(b)),
    [scopedProducts],
  );

  function setEquipmentTypeAndReset(next: EquipmentType | "all") {
    setEquipmentType(next);
    setBrands([]);
    setFamilies([]);
    setRefrigerants([]);
  }

  const filtered = React.useMemo(() => {
    const q = normalizeSearch(query);
    return scopedProducts.filter((p) => {
      if (q) {
        const hay = normalizeSearch(
          `${p.displayName} ${p.family} ${p.brand} ${p.equipmentTypeLabel} ${p.attributes.refrigerant?.display ?? ""}`,
        );
        if (!hay.includes(q)) return false;
      }
      if (brands.length && !brands.includes(p.brand)) return false;
      if (families.length && !families.includes(p.family)) return false;
      if (refrigerants.length) {
        const r = p.attributes.refrigerant;
        if (r?.status !== "verified" || !refrigerants.includes(r.display)) return false;
      }
      if (coldOnly && !isColdClimate(p)) return false;
      if (quietOnly && !isQuiet(p)) return false;
      if (verifiedOnly && coverageFor(p).pct < 80) return false;
      return true;
    }).sort((a, b) => {
      const va = sortValue(a, sort);
      const vb = sortValue(b, sort);
      if (typeof va === "string" || typeof vb === "string") return String(va).localeCompare(String(vb));
      return va - vb;
    });
  }, [scopedProducts, query, brands, families, refrigerants, coldOnly, quietOnly, verifiedOnly, sort]);

  const activeFilterCount =
    brands.length + families.length + refrigerants.length + (coldOnly ? 1 : 0) + (quietOnly ? 1 : 0) + (verifiedOnly ? 1 : 0);

  function toggleIn(list: string[], setList: (v: string[]) => void, value: string) {
    setList(list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);
  }

  function resetAll() {
    setBrands([]);
    setFamilies([]);
    setRefrigerants([]);
    setColdOnly(false);
    setQuietOnly(false);
    setVerifiedOnly(false);
    setQuery("");
  }

  function handleToggle(p: Product) {
    const res = toggle(p.id);
    if (!res.ok) notify(res.reason ?? "Could not update the comparison.", "warning");
  }

  const filterPanel = (
    <div>
      <FilterSection title="Brand">
        <div className="max-h-56 space-y-0.5 overflow-y-auto scroll-shadow pr-1">
          {scopedBrands.map((b) => (
            <CheckRow
              key={b}
              label={b}
              checked={brands.includes(b)}
              onChange={() => toggleIn(brands, setBrands, b)}
              count={scopedProducts.filter((p) => p.brand === b).length}
            />
          ))}
        </div>
      </FilterSection>

      <FilterSection title="Product family">
        <div className="max-h-56 space-y-0.5 overflow-y-auto scroll-shadow pr-1">
          {scopedFamilies.map((f) => (
            <CheckRow
              key={f}
              label={f}
              checked={families.includes(f)}
              onChange={() => toggleIn(families, setFamilies, f)}
              count={scopedProducts.filter((p) => p.family === f).length}
            />
          ))}
        </div>
      </FilterSection>

      <FilterSection title="Refrigerant">
        {scopedRefrigerants.map((r) => (
          <CheckRow
            key={r}
            label={r}
            checked={refrigerants.includes(r)}
            onChange={() => toggleIn(refrigerants, setRefrigerants, r)}
            count={scopedProducts.filter((p) => p.attributes.refrigerant?.display === r).length}
          />
        ))}
        <p className="mt-2 text-xs leading-relaxed text-navy-400">
          The imported sources record the refrigerant only. No efficiency or environmental ranking between
          refrigerants is implied.
        </p>
      </FilterSection>

      <FilterSection title="Capability">
        <CheckRow
          label="Cold-climate capable"
          checked={coldOnly}
          onChange={setColdOnly}
          count={scopedProducts.filter(isColdClimate).length}
        />
        <CheckRow
          label="Quiet operation (≤ 50 dBA)"
          checked={quietOnly}
          onChange={setQuietOnly}
          count={scopedProducts.filter(isQuiet).length}
        />
        <CheckRow
          label="Verified data ≥ 80%"
          checked={verifiedOnly}
          onChange={setVerifiedOnly}
          count={scopedProducts.filter((p) => coverageFor(p).pct >= 80).length}
        />
      </FilterSection>

      {activeFilterCount > 0 && (
        <Button variant="ghost" size="sm" className="mt-3 w-full" onClick={resetAll}>
          Clear all filters
        </Button>
      )}
    </div>
  );

  return (
    <div className="space-y-6">
      <header>
        <p className="eyebrow">Product Explorer</p>
        <h1 className="mt-2.5 text-3xl font-bold text-navy-900">All imported products</h1>
        <p className="mt-2 max-w-3xl text-lg text-navy-500">
          Every one of the {PRODUCTS.length} models imported from the two source documents, with the source
          value behind each specification.
        </p>
      </header>

      <div
        role="tablist"
        aria-label="Equipment type"
        className="inline-flex w-full flex-wrap gap-1 rounded-xl border border-edge bg-navy-50/60 p-1 sm:w-auto"
      >
        {EQUIPMENT_TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            role="tab"
            aria-selected={equipmentType === tab.key}
            onClick={() => setEquipmentTypeAndReset(tab.key)}
            className={cn(
              "flex-1 whitespace-nowrap rounded-lg px-4 py-2 text-sm font-semibold transition-colors sm:flex-none",
              equipmentType === tab.key
                ? "bg-white text-daikin-700 shadow-card"
                : "text-navy-500 hover:text-navy-700",
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-4 lg:flex-row">
        <aside className="hidden w-[268px] shrink-0 lg:block">
          <div className="sticky top-[6.5rem] rounded-2xl border border-edge bg-white p-5 shadow-card">
            <h2 className="mb-1 text-base font-semibold text-navy-900">Filters</h2>
            {equipmentType !== "all" && (
              <p className="mb-3 text-xs leading-relaxed text-navy-400">
                Showing brands and families for {EQUIPMENT_TYPE_LABEL[equipmentType].toLowerCase()}s only.
              </p>
            )}
            {filterPanel}
          </div>
        </aside>

        <div className="min-w-0 flex-1 space-y-4">
          <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-edge bg-white p-4 shadow-card">
            <div className="relative min-w-[16rem] flex-1">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 size-5 -translate-y-1/2 text-navy-400" aria-hidden />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search the catalog"
                aria-label="Search the product catalog"
                className="h-11 w-full rounded-xl border border-edge pl-11 pr-3 text-base text-navy-900 placeholder:text-navy-400 focus:border-daikin-400 focus:outline-none focus:ring-2 focus:ring-daikin-500/25"
              />
            </div>

            <Button variant="secondary" size="md" className="lg:hidden" onClick={() => setFiltersOpen(true)}>
              <SlidersHorizontal aria-hidden />
              Filters
              {activeFilterCount > 0 && <Badge variant="daikin" size="sm">{activeFilterCount}</Badge>}
            </Button>

            <div className="w-52">
              <Select value={sort} onValueChange={(v) => setSort(v as SortKey)}>
                <SelectTrigger aria-label="Sort products">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(SORT_LABEL) as SortKey[]).map((k) => (
                    <SelectItem key={k} value={k}>
                      {SORT_LABEL[k]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex rounded-xl border border-edge p-1" role="group" aria-label="View mode">
              <button
                type="button"
                onClick={() => setView("grid")}
                aria-pressed={view === "grid"}
                aria-label="Grid view"
                className={cn(
                  "inline-flex size-9 items-center justify-center rounded-lg transition-colors",
                  view === "grid" ? "bg-daikin-600 text-white" : "text-navy-500 hover:bg-navy-100",
                )}
              >
                <LayoutGrid className="size-4" aria-hidden />
              </button>
              <button
                type="button"
                onClick={() => setView("list")}
                aria-pressed={view === "list"}
                aria-label="List view"
                className={cn(
                  "inline-flex size-9 items-center justify-center rounded-lg transition-colors",
                  view === "list" ? "bg-daikin-600 text-white" : "text-navy-500 hover:bg-navy-100",
                )}
              >
                <List className="size-4" aria-hidden />
              </button>
            </div>
          </div>

          <p className="text-sm font-medium text-navy-500" aria-live="polite">
            Showing {filtered.length} of {scopedProducts.length} products
            {activeFilterCount > 0 && ` · ${activeFilterCount} filter${activeFilterCount === 1 ? "" : "s"} active`}
          </p>

          {filtered.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-edge bg-white p-12 text-center">
              <p className="text-lg font-semibold text-navy-700">No products match these filters.</p>
              <Button variant="secondary" className="mt-4" onClick={resetAll}>
                Clear all filters
              </Button>
            </div>
          ) : view === "grid" ? (
            <ul className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-3">
              {filtered.map((p) => (
                <ProductCard key={p.id} product={p} selected={isSelected(p.id)} onToggle={() => handleToggle(p)} />
              ))}
            </ul>
          ) : (
            <ul className="space-y-3">
              {filtered.map((p) => (
                <ProductRow key={p.id} product={p} selected={isSelected(p.id)} onToggle={() => handleToggle(p)} />
              ))}
            </ul>
          )}
        </div>
      </div>

      {filtersOpen && (
        <div className="fixed inset-0 z-[100] lg:hidden">
          <button
            type="button"
            aria-label="Close filters"
            onClick={() => setFiltersOpen(false)}
            className="absolute inset-0 bg-navy-950/40"
          />
          <div className="absolute inset-y-0 right-0 w-[320px] max-w-[90vw] overflow-y-auto bg-white p-5 shadow-pop scroll-shadow">
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-navy-900">Filters</h2>
              <Button variant="ghost" size="iconSm" onClick={() => setFiltersOpen(false)} aria-label="Close filters">
                <X aria-hidden />
              </Button>
            </div>
            {filterPanel}
            <Button className="mt-4 w-full" onClick={() => setFiltersOpen(false)}>
              Show {filtered.length} products
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

const SPEC_ROWS: { key: string; label: string }[] = [
  { key: "refrigerant", label: "Refrigerant" },
  { key: "seer2", label: "SEER2" },
  { key: "sound_level", label: "Sound level" },
  { key: "warranty", label: "Warranty" },
];

/* The W158°F condition is blank for the Mitsubishi column in the source sheet, so
   the card leads with the A44.6°F/W95°F condition, which every model records. */
const A2W_SPEC_ROWS: { key: string; label: string }[] = [
  { key: "refrigerant", label: "Refrigerant" },
  { key: "cop_a446w95", label: "COP (A44.6°F/W95°F)" },
  { key: "heat_cap_a446w95", label: "Heating capacity" },
  { key: "max_lwt", label: "Max. leaving water temp" },
  { key: "outdoor_sound", label: "Outdoor sound level" },
];

function ProductCard({
  product,
  selected,
  onToggle,
}: {
  product: Product;
  selected: boolean;
  onToggle: () => void;
}) {
  const rows = product.equipmentType === "air_to_water_hp" ? A2W_SPEC_ROWS : SPEC_ROWS;
  const coverage = coverageFor(product);

  return (
    <li
      className={cn(
        "flex flex-col rounded-2xl border p-5 transition-shadow hover:shadow-lift",
        product.isDaikin
          ? "border-daikin-300 bg-daikin-50/40 ring-1 ring-inset ring-daikin-100"
          : "border-edge bg-white",
      )}
    >
      <div className="flex items-start gap-4">
        <ProductVisual product={product} size="md" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold text-navy-500">{product.brand}</p>
            {product.isDaikin && (
              <Badge variant="daikin" size="sm">
                Daikin
              </Badge>
            )}
          </div>
          <h3 className="mt-0.5 text-lg font-bold leading-tight text-navy-900">{product.model}</h3>
          <p className="mt-0.5 text-sm text-navy-500">{product.family}</p>
          <p className="mt-1 text-xs leading-relaxed text-navy-400">{product.equipmentTypeLabel}</p>
        </div>
      </div>

      <dl className="mt-4 space-y-1.5 border-t border-edge pt-3.5">
        {rows.map((row) => (
          <div key={row.key} className="flex items-start justify-between gap-3">
            <dt className="text-sm text-navy-500">{row.label}</dt>
            <dd className="text-right">
              <ValueText value={product.attributes[row.key]} />
            </dd>
          </div>
        ))}
      </dl>

      <div className="mt-3.5 flex items-center gap-2">
        <span
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold",
            coverage.pct >= 80
              ? "bg-verified-50 text-verified-700"
              : coverage.pct >= 50
                ? "bg-caution-50 text-caution-700"
                : "bg-risk-50 text-risk-700",
          )}
        >
          {coverage.verified}/{coverage.total} source values
        </span>
        {product.modelIsBrandLevel && (
          <Badge variant="outline" size="sm">
            Brand-level row
          </Badge>
        )}
      </div>

      <div className="mt-3">
        <Citation
          value={product.attributes[rows[0].key] ?? { source: { citation: product.sourceHeader, documentId: product.documentId } }}
          compact
        />
      </div>

      {documentsForProduct(product).length > 0 && (
        <DocumentsDialog
          brand={product.brand}
          equipmentType={product.equipmentType}
          productLabel={product.displayName}
          trigger={
            <Button className="mt-3 w-full" variant="secondary">
              <FileText aria-hidden />
              View documents
            </Button>
          }
        />
      )}

      <Button
        className="mt-2 w-full"
        variant={selected ? "subtle" : "primary"}
        onClick={onToggle}
        aria-label={selected ? `Remove ${product.displayName} from comparison` : `Add ${product.displayName} to comparison`}
      >
        {selected ? <Check aria-hidden /> : <Plus aria-hidden />}
        {selected ? "In comparison" : "Add to comparison"}
      </Button>
    </li>
  );
}

function ProductRow({
  product,
  selected,
  onToggle,
}: {
  product: Product;
  selected: boolean;
  onToggle: () => void;
}) {
  const sound = product.attributes.sound_level ?? product.attributes.outdoor_sound;
  const warranty = product.attributes.warranty;

  return (
    <li
      className={cn(
        "flex flex-wrap items-center gap-4 rounded-2xl border p-4 transition-shadow hover:shadow-lift",
        product.isDaikin ? "border-daikin-300 bg-daikin-50/40" : "border-edge bg-white",
      )}
    >
      <ProductVisual product={product} size="sm" />
      <div className="min-w-[12rem] flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-semibold text-navy-500">{product.brand}</span>
          <span className="text-base font-bold text-navy-900">{product.model}</span>
          {product.isDaikin && <Badge variant="daikin" size="sm">Daikin</Badge>}
        </div>
        <p className="mt-0.5 text-sm text-navy-500">
          {product.family} · {product.equipmentTypeLabel}
        </p>
      </div>
      <dl className="grid flex-1 grid-cols-2 gap-x-6 gap-y-1 sm:grid-cols-4">
        <div>
          <dt className="text-xs font-medium text-navy-400">Refrigerant</dt>
          <dd><ValueText value={product.attributes.refrigerant} /></dd>
        </div>
        <div>
          <dt className="text-xs font-medium text-navy-400">SEER2</dt>
          <dd><ValueText value={product.attributes.seer2} /></dd>
        </div>
        <div>
          <dt className="text-xs font-medium text-navy-400">Sound</dt>
          <dd><ValueText value={sound} /></dd>
        </div>
        <div>
          <dt className="text-xs font-medium text-navy-400">Warranty</dt>
          <dd><ValueText value={warranty} /></dd>
        </div>
      </dl>
      <Button
        variant={selected ? "subtle" : "primary"}
        size="sm"
        onClick={onToggle}
        aria-label={selected ? `Remove ${product.displayName} from comparison` : `Add ${product.displayName} to comparison`}
      >
        {selected ? <Check aria-hidden /> : <Plus aria-hidden />}
        {selected ? "Added" : "Add"}
      </Button>
    </li>
  );
}

export { UNAVAILABLE };
