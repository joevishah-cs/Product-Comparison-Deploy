import * as React from "react";
import { Search, Plus, Check, X, Clock, CornerDownLeft, Sparkles } from "lucide-react";
import { cn, UNAVAILABLE } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ProductVisual } from "@/components/common/ProductVisual";
import { useToast } from "@/components/ui/toast";
import { BRANDS, FAMILIES, EQUIPMENT_TYPE_LABEL } from "@/data/catalog";
import { groupHits, highlightSegments, searchProducts, type SearchHit } from "@/features/catalog/search";
import { useSelection } from "./SelectionProvider";

const SUGGESTIONS = ["DH6VS", "cold climate", "quiet", "R-32", "3 ton", "Bosch", "115V"];

function Highlighted({ text, query }: { text: string; query: string }) {
  const segments = highlightSegments(text, query);
  return (
    <>
      {segments.map((s, i) =>
        s.match ? (
          <mark key={i} className="rounded bg-daikin-100 px-0.5 text-daikin-900">
            {s.text}
          </mark>
        ) : (
          <React.Fragment key={i}>{s.text}</React.Fragment>
        ),
      )}
    </>
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

  return (
    <li
      id={id}
      role="option"
      aria-selected={active}
      onMouseEnter={onHover}
      className={cn(
        "flex items-center gap-4 rounded-xl px-3 py-2.5 transition-colors",
        active ? "bg-daikin-50" : "bg-transparent",
      )}
    >
      <ProductVisual product={p} size="xs" />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
          <span className="text-sm font-semibold text-navy-500">
            <Highlighted text={p.brand} query={query} />
          </span>
          <span className="text-base font-semibold text-navy-900">
            <Highlighted text={p.model} query={query} />
          </span>
          {p.modelIsBrandLevel && (
            <Badge variant="outline" size="sm">
              Brand-level source row
            </Badge>
          )}
        </div>
        <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-navy-500">
          <span>{p.family}</span>
          <span aria-hidden className="text-navy-300">
            •
          </span>
          <span>
            {p.attributes.refrigerant?.status === "verified"
              ? p.attributes.refrigerant.display
              : UNAVAILABLE}
          </span>
          <span aria-hidden className="text-navy-300">
            •
          </span>
          <span className="font-medium text-navy-700">
            {hit.metricLabel} {hit.metricValue}
          </span>
        </div>
      </div>
      <Button
        size="sm"
        variant={selected ? "subtle" : "primary"}
        onClick={onAdd}
        disabled={selected}
        aria-label={selected ? `${p.displayName} already added` : `Add ${p.displayName} to comparison`}
      >
        {selected ? <Check aria-hidden /> : <Plus aria-hidden />}
        {selected ? "Added" : "Add"}
      </Button>
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
    <div ref={containerRef} className="relative">
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

      {showFilters && (
        <div className="mt-4 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="mr-1 text-sm font-semibold text-navy-500">Product category</span>
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
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="mr-1 text-sm font-semibold text-navy-500">Families</span>
            {FAMILIES.slice(0, 9).map((f) => (
              <FilterChip
                key={f}
                active={familyFilter.includes(f)}
                onClick={() => toggleChip(familyFilter, setFamilyFilter, f)}
              >
                {f}
              </FilterChip>
            ))}
            <span className="ml-3 mr-1 text-sm font-semibold text-navy-500">Brands</span>
            {BRANDS.slice(0, 7).map((b) => (
              <FilterChip
                key={b}
                active={brandFilter.includes(b)}
                onClick={() => toggleChip(brandFilter, setBrandFilter, b)}
              >
                {b}
              </FilterChip>
            ))}
            {(brandFilter.length > 0 || familyFilter.length > 0 || equipmentTypeFilter !== null) && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setBrandFilter([]);
                  setFamilyFilter([]);
                  setEquipmentTypeFilter(null);
                }}
              >
                Reset filters
              </Button>
            )}
          </div>
        </div>
      )}

      {showSuggestions && !query && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Sparkles className="size-4 text-daikin-500" aria-hidden />
          <span className="text-sm text-navy-500">Try</span>
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => {
                setQuery(s);
                setOpen(true);
                inputRef.current?.focus();
              }}
              className="min-h-[36px] rounded-full border border-edge bg-white px-3 text-sm font-medium text-navy-600 transition-colors hover:border-daikin-300 hover:text-daikin-700"
            >
              {s}
            </button>
          ))}
        </div>
      )}

      {open && (
        <div
          ref={listRef}
          className="absolute inset-x-0 top-full z-50 mt-3 max-h-[26rem] overflow-y-auto rounded-2xl border border-edge bg-white p-2 shadow-pop scroll-shadow animate-scale-in"
        >
          {recentSearches.length > 0 && !query && (
            <div className="border-b border-edge px-3 pb-3 pt-2">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-navy-400">
                  <Clock className="size-3.5" aria-hidden /> Recent searches
                </span>
                <button
                  type="button"
                  onClick={clearRecentSearches}
                  className="text-xs font-semibold text-navy-400 hover:text-navy-700"
                >
                  Clear
                </button>
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                {recentSearches.map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setQuery(r)}
                    className="rounded-full bg-navy-100 px-3 py-1 text-sm text-navy-700 hover:bg-navy-200"
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>
          )}

          {atCapacity && (
            <p className="m-2 rounded-lg bg-caution-50 px-3 py-2 text-sm font-medium text-caution-700">
              Eight products selected — remove one before adding another.
            </p>
          )}

          <ul id="product-search-listbox" role="listbox" aria-label="Product search results">
            {grouped.daikin.length > 0 && (
              <li>
                <p className="px-3 pb-1 pt-3 text-xs font-bold uppercase tracking-wider text-daikin-700">
                  Daikin products · {grouped.daikin.length}
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
                <p className="px-3 pb-1 pt-3 text-xs font-bold uppercase tracking-wider text-navy-400">
                  Competitor products · {grouped.competitors.length}
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
              <li className="px-4 py-8 text-center">
                <p className="text-base font-medium text-navy-700">No products match "{query}".</p>
                <p className="mt-1 text-sm text-navy-500">
                  Search covers brand, family, model, tonnage, refrigerant and features recorded in the
                  imported sources.
                </p>
              </li>
            )}
          </ul>

          <p className="mt-1 flex items-center gap-2 border-t border-edge px-3 pt-2.5 text-xs text-navy-400">
            <CornerDownLeft className="size-3.5" aria-hidden /> Use ↑ ↓ to move, Enter to add, Esc to close
          </p>
        </div>
      )}
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
        "min-h-[36px] rounded-full border px-3 text-sm font-medium transition-colors",
        active
          ? "border-daikin-500 bg-daikin-600 text-white"
          : "border-edge bg-white text-navy-600 hover:border-daikin-300 hover:text-daikin-700",
      )}
    >
      {children}
    </button>
  );
}
