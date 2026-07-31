import * as React from "react";
import { PRODUCT_BY_ID } from "@/data/catalog";
import type { Product } from "@/data/types";

export const MIN_COMPARE = 2;
export const MAX_COMPARE = 8;

const DEFAULT_SELECTION = ["bc_dh6vs-fit-daikin", "bc_dh7vs-fit-daikin", "bc_37muha-carrier-midea"];

const SELECTION_KEY = "dcmi.v1.selection";
const RECENT_KEY = "dcmi.v1.recentSearches";
const RECENT_COMPARES_KEY = "dcmi.v1.recentComparisons";

export interface RecentComparison {
  id: string;
  productIds: string[];
  at: string;
}

interface SelectionContextValue {
  selectedIds: string[];
  selected: Product[];
  unitSelections: Record<string, number>;
  isSelected: (id: string) => boolean;
  add: (id: string) => { ok: boolean; reason?: string };
  remove: (id: string) => void;
  toggle: (id: string) => { ok: boolean; reason?: string };
  clear: () => void;
  replaceAll: (ids: string[], units?: Record<string, number>) => void;
  setUnit: (productId: string, tons: number) => void;
  canCompare: boolean;
  atCapacity: boolean;
  recentSearches: string[];
  pushRecentSearch: (term: string) => void;
  clearRecentSearches: () => void;
  recentComparisons: RecentComparison[];
  recordComparison: () => void;
  equipmentTypeFilter: string | null;
  setEquipmentTypeFilter: (type: string | null) => void;
}

const SelectionContext = React.createContext<SelectionContextValue | null>(null);

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown): void {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage unavailable */
  }
}

export function SelectionProvider({ children }: { children: React.ReactNode }) {
  const [selectedIds, setSelectedIds] = React.useState<string[]>(() => {
    const stored = readJson<string[] | null>(SELECTION_KEY, null);
    const source = stored && stored.length ? stored : DEFAULT_SELECTION;
    return source.filter((id) => PRODUCT_BY_ID[id]).slice(0, MAX_COMPARE);
  });

  const [unitSelections, setUnitSelections] = React.useState<Record<string, number>>(() =>
    readJson<Record<string, number>>("dcmi.v1.units", {}),
  );

  const [recentSearches, setRecentSearches] = React.useState<string[]>(() =>
    readJson<string[]>(RECENT_KEY, []),
  );

  const [recentComparisons, setRecentComparisons] = React.useState<RecentComparison[]>(() =>
    readJson<RecentComparison[]>(RECENT_COMPARES_KEY, []),
  );

  const [equipmentTypeFilter, setEquipmentTypeFilter] = React.useState<string | null>(null);

  React.useEffect(() => writeJson(SELECTION_KEY, selectedIds), [selectedIds]);
  React.useEffect(() => writeJson("dcmi.v1.units", unitSelections), [unitSelections]);
  React.useEffect(() => writeJson(RECENT_KEY, recentSearches), [recentSearches]);
  React.useEffect(() => writeJson(RECENT_COMPARES_KEY, recentComparisons), [recentComparisons]);

  const selected = React.useMemo(
    () => selectedIds.map((id) => PRODUCT_BY_ID[id]).filter(Boolean),
    [selectedIds],
  );

  const isSelected = React.useCallback((id: string) => selectedIds.includes(id), [selectedIds]);

  const add = React.useCallback(
    (id: string) => {
      const product = PRODUCT_BY_ID[id];
      if (!product) return { ok: false, reason: "Unknown product." };

      let result: { ok: boolean; reason?: string } = { ok: true };
      setSelectedIds((prev) => {
        if (prev.includes(id)) {
          result = { ok: false, reason: "Already in the comparison." };
          return prev;
        }
        if (prev.length >= MAX_COMPARE) {
          result = { ok: false, reason: `You can compare up to ${MAX_COMPARE} products at once.` };
          return prev;
        }

        // First product: establish equipment type
        if (prev.length === 0) {
          setEquipmentTypeFilter(product.equipmentType);
          return [...prev, id];
        }

        // Check equipment type compatibility with already-selected products
        const firstProduct = PRODUCT_BY_ID[prev[0]];
        if (firstProduct && product.equipmentType !== firstProduct.equipmentType) {
          result = { ok: false, reason: `Cannot mix ${product.equipmentTypeLabel} with ${firstProduct.equipmentTypeLabel}.` };
          return prev;
        }

        return [...prev, id];
      });
      return result;
    },
    [],
  );

  const remove = React.useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = prev.filter((p) => p !== id);
      if (next.length === 0) {
        setEquipmentTypeFilter(null);
      }
      return next;
    });
    setUnitSelections((prev) => {
      if (!(id in prev)) return prev;
      const next = { ...prev };
      delete next[id];
      return next;
    });
  }, []);

  const toggle = React.useCallback(
    (id: string) => {
      if (selectedIds.includes(id)) {
        remove(id);
        return { ok: true };
      }
      return add(id);
    },
    [selectedIds, add, remove],
  );

  const clear = React.useCallback(() => {
    setSelectedIds([]);
    setUnitSelections({});
    setEquipmentTypeFilter(null);
  }, []);

  const replaceAll = React.useCallback((ids: string[], units?: Record<string, number>) => {
    setSelectedIds(ids.filter((id) => PRODUCT_BY_ID[id]).slice(0, MAX_COMPARE));
    setUnitSelections(units ?? {});
  }, []);

  const setUnit = React.useCallback((productId: string, tons: number) => {
    setUnitSelections((prev) =>
      prev[productId] === tons ? omit(prev, productId) : { ...prev, [productId]: tons },
    );
  }, []);

  const pushRecentSearch = React.useCallback((term: string) => {
    const trimmed = term.trim();
    if (trimmed.length < 2) return;
    setRecentSearches((prev) => [trimmed, ...prev.filter((t) => t !== trimmed)].slice(0, 6));
  }, []);

  const clearRecentSearches = React.useCallback(() => setRecentSearches([]), []);

  const recordComparison = React.useCallback(() => {
    setSelectedIds((current) => {
      if (current.length >= MIN_COMPARE) {
        const key = current.join("|");
        setRecentComparisons((prev) =>
          [
            { id: key, productIds: current, at: new Date().toISOString() },
            ...prev.filter((r) => r.id !== key),
          ].slice(0, 5),
        );
      }
      return current;
    });
  }, []);

  const value = React.useMemo<SelectionContextValue>(
    () => ({
      selectedIds,
      selected,
      unitSelections,
      isSelected,
      add,
      remove,
      toggle,
      clear,
      replaceAll,
      setUnit,
      canCompare: selectedIds.length >= MIN_COMPARE,
      atCapacity: selectedIds.length >= MAX_COMPARE,
      recentSearches,
      pushRecentSearch,
      clearRecentSearches,
      recentComparisons,
      recordComparison,
      equipmentTypeFilter,
      setEquipmentTypeFilter,
    }),
    [
      selectedIds,
      selected,
      unitSelections,
      isSelected,
      add,
      remove,
      toggle,
      clear,
      replaceAll,
      setUnit,
      recentSearches,
      pushRecentSearch,
      clearRecentSearches,
      recentComparisons,
      recordComparison,
      equipmentTypeFilter,
    ],
  );

  return <SelectionContext.Provider value={value}>{children}</SelectionContext.Provider>;
}

function omit<T extends Record<string, unknown>>(obj: T, key: string): T {
  const next = { ...obj };
  delete next[key];
  return next;
}

export function useSelection(): SelectionContextValue {
  const ctx = React.useContext(SelectionContext);
  if (!ctx) throw new Error("useSelection must be used inside <SelectionProvider>");
  return ctx;
}
