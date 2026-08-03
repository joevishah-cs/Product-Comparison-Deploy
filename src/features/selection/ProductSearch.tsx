import * as React from "react";
import { Search, SearchX, Plus, Check, X, Clock, CornerDownLeft, Sparkles, Info } from "lucide-react";
import { cn, UNAVAILABLE } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ProductVisual } from "@/components/common/ProductVisual";
import { useToast } from "@/components/ui/toast";
import { BRANDS, FAMILIES, EQUIPMENT_TYPE_LABEL } from "@/data/catalog";
import { groupHits, highlightSegments, searchProducts, type SearchHit } from "@/features/catalog/search";
import { useSelection } from "./SelectionProvider";

const SUGGESTIONS = ["DH6VS", "cold climate", "quiet", "R-32", "3 ton", "Bosch", "115V"];

/** Matched runs are weighted and tinted rather than given a background box —
 *  a mid-word highlight box breaks the word shape and reads as a defect. */
function Highlighted({ text, query }: { text: string; query: string }) {
  const segments = highlightSegments(text, query);
  return (
    <>
      {segments.map((s, i) =>
        s.match ? (
          <mark key={i} className="bg-transparent font-bold text-daikin-700">
            {s.text}
          </mark>
        ) : (
          <React.Fragment key={i}>{s.text}</React.Fragment>
        ),
      )}
    </>
  );
}

/** Keycap used in the results footer; mirrors the header's ⌘K chip. */
function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="inline-flex min-w-[1.375rem] items-center justify-center rounded-md border border-edge bg-white px-1 py-0.5 font-sans text-[0.6875rem] font-semibold text-navy-500 shadow-sm">
      {children}
    </kbd>
  );
}

function MetaDot() {
  return (
    <span aria-hidden className="text-navy-300">
      ·
    </span>
  );
}

function ResultRow({
  hit,
  query,
  active,
  onAdd,
  onHover,
  id,
}: {
  hit: SearchHit;
  query: string;
  active: boolean;
  onAdd: () => void;
  onHover: () => void;
  id: string;
}) {
  const { isSelected } = useSelection();
  const selected = isSelected(hit.product.id);
  const p = hit.product;

  const refrigerant =
    p.attributes.refrigerant?.status === "verified" ? p.attributes.refrigerant.display : UNAVAILABLE;
  const metric = `${hit.metricLabel} ${hit.metricValue}`;
  /** Some source rows carry no brand, so the catalog stores the placeholder.
   *  Italicise it so it reads as a missing value, not as a brand name. */
  const brandUnknown = p.brand === UNAVAILABLE;

  return (
    <li
      id={id}
      role="option"
      aria-selected={active}
      onMouseEnter={onHover}
      className={cn(
        "group relative flex items-center gap-3 rounded-xl py-2 pl-3 pr-2 transition-colors duration-150",
        active ? "bg-daikin-50/70 ring-1 ring-inset ring-daikin-100" : "ring-1 ring-inset ring-transparent",
      )}
    >
      {/* Accent rail marks the keyboard-active row without moving anything. */}
      <span
        aria-hidden
        className={cn(
          "absolute left-0 top-1/2 h-8 w-[3px] -translate-y-1/2 rounded-r-full bg-daikin-500 transition-opacity duration-150",
          active ? "opacity-100" : "opacity-0",
        )}
      />

      <ProductVisual product={p} size="xs" />

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
          {/* Wraps rather than truncates — the model name is the identity of the
              row, so it must never be clipped on narrow widths. */}
          <span className="text-[0.9375rem] font-semibold text-navy-900">
            <span
              className={cn(
                "font-medium",
                brandUnknown ? "italic text-navy-400" : "text-navy-500",
              )}
            >
              <Highlighted text={p.brand} query={query} />
            </span>{" "}
            <Highlighted text={p.model} query={query} />
          </span>
          {p.modelIsBrandLevel && (
            <Badge variant="outline" size="sm">
              Brand-level source row
            </Badge>
          )}
        </div>
        <div className="mt-0.5 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-xs text-navy-500">
          <span>{p.family}</span>
          <MetaDot />
          <span>{refrigerant}</span>
          {/* Below sm the metric has no room on the right, so it rides here. */}
          <span className="sm:hidden">
            <MetaDot />
          </span>
          <span className="font-semibold text-navy-700 sm:hidden">{metric}</span>
        </div>
      </div>

      <span className="hidden shrink-0 items-center rounded-full bg-white/80 px-2.5 py-1 text-xs font-semibold tabular-nums text-navy-700 ring-1 ring-inset ring-edge sm:inline-flex">
        {metric}
      </span>

      {selected ? (
        <span className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-xl bg-verified-50 px-3 text-sm font-semibold text-verified-700 ring-1 ring-inset ring-verified-500/25">
          <Check className="size-4" aria-hidden />
          Added
        </span>
      ) : (
        <Button
          size="sm"
          className={cn("h-9 shrink-0 transition-transform", active && "scale-[1.03]")}
          onClick={onAdd}
          aria-label={`Add ${p.displayName} to comparison`}
        >
          <Plus aria-hidden />
          Add
        </Button>
      )}
    </li>
  );
}

export function ProductSearch({
  size = "lg",
  placeholder = 'Search brand, model, family, tonnage, refrigerant or a feature like "quiet" or "cold climate"',
  showFilters = true,
  showSuggestions = true,
}: {
  size?: "lg" | "md";
  placeholder?: string;
  showFilters?: boolean;
  showSuggestions?: boolean;
}) {
  const { add, recentSearches, pushRecentSearch, clearRecentSearches, atCapacity, equipmentTypeFilter, setEquipmentTypeFilter } = useSelection();
  const { notify } = useToast();

  /** The compact size renders inside the ⌘K dialog, where the chips need the
   *  full width — so its filter labels sit above each group instead of beside it. */
  const compactFilters = size === "md";
  /** Only the page-level search pins itself under the header; the dialog and the
   *  compare page must not scroll the document behind them. */
  const pinOnOpen = !compactFilters;

  const [query, setQuery] = React.useState("");
  const [open, setOpen] = React.useState(false);
  const [activeIndex, setActiveIndex] = React.useState(0);
  const [brandFilter, setBrandFilter] = React.useState<string[]>([]);
  const [familyFilter, setFamilyFilter] = React.useState<string[]>([]);

  const containerRef = React.useRef<HTMLDivElement>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const listRef = React.useRef<HTMLDivElement>(null);

  const hits = React.useMemo(
    () => searchProducts(query, { brands: brandFilter, families: familyFilter, equipmentType: equipmentTypeFilter }, 30),
    [query, brandFilter, familyFilter, equipmentTypeFilter],
  );
  const grouped = React.useMemo(() => groupHits(hits), [hits]);
  const flat = React.useMemo(() => [...grouped.daikin, ...grouped.competitors], [grouped]);

  React.useEffect(() => setActiveIndex(0), [query, brandFilter, familyFilter]);

  React.useEffect(() => {
    function onClickAway(e: MouseEvent) {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickAway);
    return () => document.removeEventListener("mousedown", onClickAway);
  }, []);

  React.useEffect(() => {
    if (!open) return;
    const el = listRef.current?.querySelector(`#search-option-${activeIndex}`);
    el?.scrollIntoView({ block: "nearest" });
  }, [activeIndex, open]);

  /** On open, bring the search up under the sticky header so the results panel
   *  below the filters is never clipped by the fold. `scroll-mt-24` on the
   *  container keeps it clear of the header. */
  React.useEffect(() => {
    if (!open || !pinOnOpen) return;
    const el = containerRef.current;
    if (!el) return;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
  }, [open, pinOnOpen]);

  const handleAdd = React.useCallback(
    (hit: SearchHit) => {
      const res = add(hit.product.id);
      if (res.ok) {
        notify(`${hit.product.displayName} added to the comparison.`, "success");
        pushRecentSearch(query || hit.product.model);
      } else {
        notify(res.reason ?? "Could not add that product.", "warning");
      }
    },
    [add, notify, pushRecentSearch, query],
  );

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setOpen(true);
      setActiveIndex((i) => Math.min(i + 1, Math.max(flat.length - 1, 0)));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      const hit = flat[activeIndex];
      if (open && hit) {
        e.preventDefault();
        handleAdd(hit);
      }
    } else if (e.key === "Escape") {
      setOpen(false);
      inputRef.current?.blur();
    } else if (e.key === "Home") {
      setActiveIndex(0);
    } else if (e.key === "End") {
      setActiveIndex(Math.max(flat.length - 1, 0));
    }
  }

  function toggleChip(list: string[], setList: (v: string[]) => void, value: string) {
    setList(list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);
  }

  let optionIndex = -1;

  return (
    <div
      ref={containerRef}
      className={cn("relative", pinOnOpen && "search-hero scroll-mt-24")}
    >
      <div className="relative">
        <Search
          className={cn(
            "pointer-events-none absolute left-5 top-1/2 -translate-y-1/2 text-navy-400",
            size === "lg" ? "size-6" : "size-5",
          )}
          aria-hidden
        />
        <input
          ref={inputRef}
          type="search"
          role="combobox"
          aria-expanded={open}
          aria-controls="product-search-listbox"
          aria-autocomplete="list"
          aria-activedescendant={open && flat.length ? `search-option-${activeIndex}` : undefined}
          aria-label="Search Daikin and competitor products"
          value={query}
          placeholder={placeholder}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          className={cn(
            // An input must stay opaque and blur-free, so it keeps explicit
            // styling rather than the frosted `.surface` card recipe.
            "w-full rounded-2xl border border-edge bg-white pr-14 text-navy-900 shadow-card transition-all",
            "placeholder:text-navy-400 focus:border-daikin-400 focus:outline-none focus:ring-4 focus:ring-daikin-500/15",
            size === "lg" ? "h-[4.25rem] pl-14 text-lg" : "h-12 pl-12 text-base",
          )}
        />
        {query && (
          <button
            type="button"
            onClick={() => {
              setQuery("");
              inputRef.current?.focus();
            }}
            aria-label="Clear search"
            className="absolute right-4 top-1/2 inline-flex size-9 -translate-y-1/2 items-center justify-center rounded-lg text-navy-400 hover:bg-navy-100 hover:text-navy-700"
          >
            <X className="size-5" aria-hidden />
          </button>
        )}
      </div>

      {(showFilters || (showSuggestions && !query)) && (
        <div
          className={cn(
            "mt-5 grid gap-x-8 gap-y-4",
            // Two columns only where there is real room; the compact variant
            // (⌘K dialog, compare page) stays single-column. The right column
            // is wider because Families/Brands carry more chips than the left.
            !compactFilters && "lg:grid-cols-[minmax(0,0.47fr)_minmax(0,0.53fr)]",
          )}
        >
          {/* Left column — product category, then the search suggestions. */}
          <div className="space-y-4">
            {showFilters && (
              <FilterRow label="Product category">
                <FilterChip
                  active={equipmentTypeFilter === null}
                  onClick={() => setEquipmentTypeFilter(null)}
                >
                  All
                </FilterChip>
                <FilterChip
                  active={equipmentTypeFilter === "ducted_split_hp"}
                  onClick={() => setEquipmentTypeFilter("ducted_split_hp")}
                >
                  {EQUIPMENT_TYPE_LABEL.ducted_split_hp}
                </FilterChip>
                <FilterChip
                  active={equipmentTypeFilter === "air_to_water_hp"}
                  onClick={() => setEquipmentTypeFilter("air_to_water_hp")}
                >
                  {EQUIPMENT_TYPE_LABEL.air_to_water_hp}
                </FilterChip>
              </FilterRow>
            )}

            {showSuggestions && !query && (
              <FilterRow
                label={
                  <span className="inline-flex items-center gap-1.5">
                    <Sparkles className="size-3.5 text-daikin-500" aria-hidden />
                    Try
                  </span>
                }
              >
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => {
                      setQuery(s);
                      setOpen(true);
                      inputRef.current?.focus();
                    }}
                    className="min-h-[32px] rounded-full border border-edge bg-white px-2 text-xs font-medium text-navy-600 transition-colors hover:border-daikin-300 hover:text-daikin-700"
                  >
                    {s}
                  </button>
                ))}
              </FilterRow>
            )}
          </div>

          {/* Right column — families, then brands. */}
          {showFilters && (
            <div className="space-y-4">
              <FilterRow
                label="Families"
                action={
                  (brandFilter.length > 0 ||
                    familyFilter.length > 0 ||
                    equipmentTypeFilter !== null) && (
                    <button
                      type="button"
                      onClick={() => {
                        setBrandFilter([]);
                        setFamilyFilter([]);
                        setEquipmentTypeFilter(null);
                      }}
                      className="text-[0.6875rem] font-bold uppercase tracking-[0.12em] text-daikin-700 transition-colors hover:text-daikin-800"
                    >
                      Reset filters
                    </button>
                  )
                }
              >
                {FAMILIES.slice(0, 9).map((f) => (
                  <FilterChip
                    key={f}
                    active={familyFilter.includes(f)}
                    onClick={() => toggleChip(familyFilter, setFamilyFilter, f)}
                  >
                    {f}
                  </FilterChip>
                ))}
              </FilterRow>

              <FilterRow label="Brands">
                {BRANDS.slice(0, 7).map((b) => (
                  <FilterChip
                    key={b}
                    active={brandFilter.includes(b)}
                    onClick={() => toggleChip(brandFilter, setBrandFilter, b)}
                  >
                    {b}
                  </FilterChip>
                ))}
              </FilterRow>
            </div>
          )}
        </div>
      )}

      {open && (
        <div
          ref={listRef}
          className="absolute inset-x-0 top-full z-50 mt-3 max-h-[26rem] overflow-y-auto overscroll-contain rounded-3xl border border-white/70 bg-white/95 p-2 shadow-pop ring-1 ring-navy-900/5 backdrop-blur-xl scroll-shadow animate-scale-in"
        >
          {recentSearches.length > 0 && !query && (
            <div className="border-b border-edge px-3 pb-3 pt-2">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-[0.6875rem] font-bold uppercase tracking-[0.12em] text-navy-400">
                  <Clock className="size-3.5" aria-hidden /> Recent searches
                </span>
                <button
                  type="button"
                  onClick={clearRecentSearches}
                  className="text-[0.6875rem] font-bold uppercase tracking-[0.12em] text-navy-400 transition-colors hover:text-navy-700"
                >
                  Clear
                </button>
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {recentSearches.map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setQuery(r)}
                    className="min-h-[32px] rounded-full border border-edge bg-white px-2.5 text-xs font-medium text-navy-600 transition-colors hover:border-daikin-300 hover:text-daikin-700"
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>
          )}

          {atCapacity && (
            <p className="m-2 flex items-center gap-2 rounded-xl bg-caution-50 px-3 py-2.5 text-sm font-medium text-caution-700 ring-1 ring-inset ring-caution-500/20">
              <Info className="size-4 shrink-0" aria-hidden />
              Eight products selected — remove one before adding another.
            </p>
          )}

          <ul id="product-search-listbox" role="listbox" aria-label="Product search results">
            {grouped.daikin.length > 0 && (
              <li>
                <p className="sticky top-0 z-10 -mx-2 flex items-center gap-2 bg-white/90 px-5 pb-1.5 pt-2.5 text-[0.6875rem] font-bold uppercase tracking-[0.12em] text-daikin-700 backdrop-blur-sm">
                  <span className="size-1.5 rounded-full bg-daikin-500" aria-hidden />
                  Daikin products
                  <span className="rounded-full bg-daikin-100 px-1.5 py-px text-[0.625rem] tabular-nums text-daikin-700">
                    {grouped.daikin.length}
                  </span>
                </p>
                <ul>
                  {grouped.daikin.map((hit) => {
                    optionIndex += 1;
                    const idx = optionIndex;
                    return (
                      <ResultRow
                        key={hit.product.id}
                        id={`search-option-${idx}`}
                        hit={hit}
                        query={query}
                        active={idx === activeIndex}
                        onHover={() => setActiveIndex(idx)}
                        onAdd={() => handleAdd(hit)}
                      />
                    );
                  })}
                </ul>
              </li>
            )}

            {grouped.competitors.length > 0 && (
              <li>
                <p className="sticky top-0 z-10 -mx-2 flex items-center gap-2 bg-white/90 px-5 pb-1.5 pt-2.5 text-[0.6875rem] font-bold uppercase tracking-[0.12em] text-navy-400 backdrop-blur-sm">
                  <span className="size-1.5 rounded-full bg-navy-300" aria-hidden />
                  Competitor products
                  <span className="rounded-full bg-navy-100 px-1.5 py-px text-[0.625rem] tabular-nums text-navy-600">
                    {grouped.competitors.length}
                  </span>
                </p>
                <ul>
                  {grouped.competitors.map((hit) => {
                    optionIndex += 1;
                    const idx = optionIndex;
                    return (
                      <ResultRow
                        key={hit.product.id}
                        id={`search-option-${idx}`}
                        hit={hit}
                        query={query}
                        active={idx === activeIndex}
                        onHover={() => setActiveIndex(idx)}
                        onAdd={() => handleAdd(hit)}
                      />
                    );
                  })}
                </ul>
              </li>
            )}

            {flat.length === 0 && (
              <li className="px-6 py-10 text-center">
                <span className="mx-auto grid size-11 place-items-center rounded-full bg-navy-50 text-navy-400 ring-1 ring-inset ring-edge">
                  <SearchX className="size-5" aria-hidden />
                </span>
                <p className="mt-3 text-base font-semibold text-navy-800">
                  No products match “{query}”.
                </p>
                <p className="mx-auto mt-1 max-w-md text-sm leading-relaxed text-navy-500">
                  Search covers brand, family, model, tonnage, refrigerant and features recorded in the
                  imported sources.
                </p>
              </li>
            )}
          </ul>

          <div className="sticky bottom-0 -mx-2 -mb-2 mt-1 flex flex-wrap items-center gap-x-4 gap-y-1.5 border-t border-edge bg-white/90 px-4 py-2.5 text-xs text-navy-400 backdrop-blur-sm">
            <span className="flex items-center gap-1.5">
              <Kbd>↑</Kbd>
              <Kbd>↓</Kbd>
              move
            </span>
            <span className="flex items-center gap-1.5">
              <Kbd>
                <CornerDownLeft className="size-3" aria-hidden />
              </Kbd>
              add
            </span>
            <span className="flex items-center gap-1.5">
              <Kbd>esc</Kbd>
              close
            </span>
            {flat.length > 0 && (
              <span className="ml-auto font-medium tabular-nums text-navy-400">
                {flat.length} {flat.length === 1 ? "result" : "results"}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/** One labelled filter group. The label sits above its chips so each group can
 *  use the full width of its column — in a half-width column a left-hand label
 *  gutter would force every group to wrap. `action` is an optional control
 *  pinned to the right of the label line. */
function FilterRow({
  label,
  children,
  action,
}: {
  label: React.ReactNode;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex min-h-[1.125rem] items-center justify-between gap-3">
        <span className="text-[0.6875rem] font-bold uppercase tracking-[0.12em] text-navy-400">
          {label}
        </span>
        {action}
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-1.5">{children}</div>
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "min-h-[32px] rounded-full border px-2 text-xs font-medium transition-colors",
        active
          ? "border-daikin-500 bg-daikin-600 text-white"
          : "border-edge bg-white text-navy-600 hover:border-daikin-300 hover:text-daikin-700",
      )}
    >
      {children}
    </button>
  );
}
