import * as React from "react";
import { Link, useNavigate } from "react-router-dom";
import { History, Bookmark, DatabaseZap, ArrowRight, ShieldCheck, FileSpreadsheet, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ProductSearch } from "@/features/selection/ProductSearch";
import { SelectedProducts } from "@/features/selection/SelectedProducts";
import { useSelection } from "@/features/selection/SelectionProvider";
import { ProductVisual } from "@/components/common/ProductVisual";
import {
  PRODUCTS,
  PRODUCT_BY_ID,
  SOURCE_DOCUMENTS,
  ATTRIBUTE_DEFINITIONS,
  ATTRIBUTE_KEYS_BY_EQUIPMENT,
  coverageFor,
  EXCLUDED_CELLS,
} from "@/data/catalog";
import type { EquipmentType } from "@/data/types";
import { useAuth } from "@/features/auth/AuthProvider";
import { listRows, type SavedComparison } from "@/lib/store";
import { formatDate } from "@/lib/utils";

/** Mirrors the Product Explorer's equipment tabs so the two pages agree on naming. */
const EQUIPMENT_BREAKDOWN: { key: EquipmentType; label: string; short: string }[] = [
  { key: "ducted_split_hp", label: "Air-to-Air (ducted split)", short: "A2A" },
  { key: "air_to_water_hp", label: "Air-to-Water (hydronic)", short: "A2W" },
];

export function DashboardPage() {
  const { selected, recentComparisons, replaceAll, recordComparison } = useSelection();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [saved, setSaved] = React.useState<SavedComparison[]>([]);
  const [savedLoading, setSavedLoading] = React.useState(true);

  React.useEffect(() => {
    let active = true;
    if (!user) {
      setSaved([]);
      setSavedLoading(false);
      return;
    }
    setSavedLoading(true);
    void listRows<SavedComparison>("saved_comparisons", user.email).then((rows) => {
      // Guard against a resolved fetch landing after the user changed.
      if (!active) return;
      setSaved(rows);
      setSavedLoading(false);
    });
    return () => {
      active = false;
    };
  }, [user]);

  const coverage = React.useMemo(() => {
    const totals = PRODUCTS.map((p) => coverageFor(p));
    const verified = totals.reduce((s, c) => s + c.verified, 0);
    const total = totals.reduce((s, c) => s + c.total, 0);
    return { verified, total, pct: Math.round((verified / total) * 100) };
  }, []);

  /** Coverage split by equipment type, so air-to-air and air-to-water read as the
   *  two distinct catalogues they are — the same split the Product Explorer uses. */
  const byEquipment = React.useMemo(
    () =>
      EQUIPMENT_BREAKDOWN.map((row) => {
        const products = PRODUCTS.filter((p) => p.equipmentType === row.key);
        const totals = products.map((p) => coverageFor(p));
        const verified = totals.reduce((s, c) => s + c.verified, 0);
        const total = totals.reduce((s, c) => s + c.total, 0);
        return {
          ...row,
          count: products.length,
          attributes: ATTRIBUTE_KEYS_BY_EQUIPMENT[row.key].length,
          pct: total ? Math.round((verified / total) * 100) : 0,
        };
      }),
    [],
  );

  return (
    <div className="space-y-8">
      <header className="animate-fade-up">
        <p className="eyebrow">Daikin Competitive Marketing Intelligence</p>
        <h1 className="mt-3 max-w-4xl text-balance text-3xl font-bold leading-tight text-navy-900 sm:text-4xl">
          Which products would you like to compare?
        </h1>
        <p className="mt-3 max-w-3xl text-lg leading-relaxed text-navy-500">
          Search once across Daikin and competitor models, select units where source data supports them,
          then compare.
        </p>
      </header>

      <div className="relative z-20">
        <ProductSearch />
      </div>

      <SelectedProducts />

      <section aria-label="Quick access" className="grid gap-5 lg:grid-cols-3">
        {/* Recently compared */}
        <article className="rounded-2xl border border-edge bg-white p-6 shadow-card">
          <header className="flex items-center gap-2.5">
            <span className="grid size-9 place-items-center rounded-xl bg-navy-100 text-navy-600">
              <History className="size-[18px]" aria-hidden />
            </span>
            <h2 className="text-lg font-semibold text-navy-900">Recently compared</h2>
          </header>

          {recentComparisons.length === 0 ? (
            <p className="mt-4 rounded-xl border border-dashed border-edge bg-navy-50/50 p-5 text-center text-sm text-navy-500">
              Run your first comparison and it will appear here for one-click reopening.
            </p>
          ) : (
            <ul className="mt-4 space-y-2">
              {recentComparisons.map((r) => {
                const products = r.productIds.map((id) => PRODUCT_BY_ID[id]).filter(Boolean);
                return (
                  <li key={r.id}>
                    <button
                      type="button"
                      onClick={() => {
                        replaceAll(r.productIds);
                        recordComparison();
                        navigate("/compare");
                      }}
                      className="flex w-full items-center gap-3 rounded-xl border border-edge p-3 text-left transition-colors hover:border-daikin-300 hover:bg-daikin-50/50"
                    >
                      <div className="flex -space-x-2">
                        {products.slice(0, 3).map((p) => (
                          <img
                            key={p.id}
                            src={p.image}
                            alt=""
                            className="size-9 rounded-lg border-2 border-white object-cover"
                          />
                        ))}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-navy-900">
                          {products.map((p) => p.model).join(" vs ")}
                        </p>
                        <p className="text-xs text-navy-400">{formatDate(r.at)}</p>
                      </div>
                      <ArrowRight className="size-4 shrink-0 text-navy-400" aria-hidden />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </article>

        {/* Saved comparisons */}
        <article className="rounded-2xl border border-edge bg-white p-6 shadow-card">
          <header className="flex items-center gap-2.5">
            <span className="grid size-9 place-items-center rounded-xl bg-daikin-50 text-daikin-700">
              <Bookmark className="size-[18px]" aria-hidden />
            </span>
            <h2 className="text-lg font-semibold text-navy-900">Saved comparisons</h2>
          </header>

          {savedLoading ? (
            <p className="mt-4 rounded-xl border border-dashed border-edge bg-navy-50/50 p-5 text-center text-sm text-navy-500">
              Loading your saved comparisons…
            </p>
          ) : saved.length === 0 ? (
            <p className="mt-4 rounded-xl border border-dashed border-edge bg-navy-50/50 p-5 text-center text-sm text-navy-500">
              Save a comparison from the compare page and it will appear here, with its exact product
              selection and unit sizes intact.
            </p>
          ) : (
            <>
              <ul className="mt-4 space-y-2">
                {saved.slice(0, 5).map((item) => {
                  const products = item.product_ids.map((id) => PRODUCT_BY_ID[id]).filter(Boolean);
                  return (
                    <li key={item.id}>
                      <button
                        type="button"
                        onClick={() => {
                          replaceAll(item.product_ids, item.unit_selections);
                          recordComparison();
                          navigate("/compare");
                        }}
                        className="flex w-full items-center gap-3 rounded-xl border border-edge p-3 text-left transition-colors hover:border-daikin-300 hover:bg-daikin-50/50"
                      >
                        <div className="flex -space-x-2">
                          {products.slice(0, 3).map((p) => (
                            <img
                              key={p.id}
                              src={p.image}
                              alt=""
                              className="size-9 rounded-lg border-2 border-white object-cover"
                            />
                          ))}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-navy-900">{item.name}</p>
                          <p className="truncate text-xs text-navy-400">
                            {products.map((p) => p.model).join(" vs ") || "No products recorded"}
                          </p>
                          <p className="text-xs text-navy-400">{formatDate(item.updated_at)}</p>
                        </div>
                        <ArrowRight className="size-4 shrink-0 text-navy-400" aria-hidden />
                      </button>
                    </li>
                  );
                })}
              </ul>
              <Link
                to="/saved"
                className="mt-4 inline-flex min-h-[44px] items-center gap-1.5 text-sm font-semibold text-daikin-700 hover:text-daikin-800"
              >
                {saved.length > 5 ? `See all ${saved.length} saved comparisons` : "Manage saved comparisons"}
                <ArrowRight className="size-4" aria-hidden />
              </Link>
            </>
          )}
        </article>

        {/* Product data coverage */}
        <article className="rounded-2xl border border-edge bg-white p-6 shadow-card">
          <header className="flex items-center gap-2.5">
            <span className="grid size-9 place-items-center rounded-xl bg-daikin-50 text-daikin-700">
              <DatabaseZap className="size-[18px]" aria-hidden />
            </span>
            <h2 className="text-lg font-semibold text-navy-900">Product data coverage</h2>
          </header>

          <div className="mt-4 grid grid-cols-3 gap-3 text-center">
            <div className="rounded-xl bg-navy-50 p-3">
              <p className="text-2xl font-bold text-navy-900">{PRODUCTS.length}</p>
              <p className="text-xs font-medium text-navy-500">Products</p>
            </div>
            <div className="rounded-xl bg-navy-50 p-3">
              <p className="text-2xl font-bold text-navy-900">{SOURCE_DOCUMENTS.length}</p>
              <p className="text-xs font-medium text-navy-500">Sources</p>
            </div>
            <div className="rounded-xl bg-navy-50 p-3">
              <p className="text-2xl font-bold text-navy-900">{ATTRIBUTE_DEFINITIONS.length}</p>
              <p className="text-xs font-medium text-navy-500">Attributes</p>
            </div>
          </div>

          <div className="mt-4">
            <div className="flex items-baseline justify-between">
              <span className="text-sm font-medium text-navy-600">Verified source values</span>
              <span className="text-sm font-bold text-navy-900">{coverage.pct}%</span>
            </div>
            <div
              className="mt-1.5 h-2.5 overflow-hidden rounded-full bg-navy-100"
              role="progressbar"
              aria-valuenow={coverage.pct}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label="Share of product attributes carrying a verified source value"
            >
              <div className="h-full rounded-full bg-daikin-600" style={{ width: `${coverage.pct}%` }} />
            </div>
            <p className="mt-1.5 text-xs text-navy-400">
              {coverage.verified.toLocaleString()} of {coverage.total.toLocaleString()} attribute cells carry a
              source value. The rest display “Information unavailable”.
            </p>
          </div>

          <ul className="mt-4 space-y-2.5 border-t border-edge pt-4">
            {byEquipment.map((row) => (
              <li key={row.key}>
                <div className="flex items-baseline justify-between gap-2">
                  <span className="flex items-center gap-1.5 text-sm font-medium text-navy-700">
                    <Badge variant="outline" size="sm">
                      {row.short}
                    </Badge>
                    {row.label}
                  </span>
                  <span className="text-sm font-bold text-navy-900">{row.pct}%</span>
                </div>
                <div
                  className="mt-1.5 h-2 overflow-hidden rounded-full bg-navy-100"
                  role="progressbar"
                  aria-valuenow={row.pct}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label={`${row.label} — share of attributes carrying a verified source value`}
                >
                  <div
                    className="h-full rounded-full bg-daikin-500"
                    style={{ width: `${row.pct}%` }}
                  />
                </div>
                <p className="mt-1 text-xs text-navy-400">
                  {row.count} products · {row.attributes} attributes
                </p>
              </li>
            ))}
          </ul>

          <ul className="mt-4 space-y-2 border-t border-edge pt-4">
            {SOURCE_DOCUMENTS.map((doc) => (
              <li key={doc.id} className="flex items-start gap-2.5">
                {doc.kind === "pdf" ? (
                  <FileText className="mt-0.5 size-4 shrink-0 text-navy-400" aria-hidden />
                ) : (
                  <FileSpreadsheet className="mt-0.5 size-4 shrink-0 text-navy-400" aria-hidden />
                )}
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-navy-800">{doc.fileName}</p>
                  <p className="text-xs leading-relaxed text-navy-500">
                    {doc.productCount} products · imported {formatDate(doc.importedAt)}
                    {doc.excludedCells > 0 && ` · ${doc.excludedCells} formula-error cells excluded`}
                  </p>
                </div>
              </li>
            ))}
          </ul>

          {EXCLUDED_CELLS.length > 0 && (
            <p className="mt-3 rounded-lg bg-caution-50 px-3 py-2 text-xs leading-relaxed text-caution-700">
              Cells {EXCLUDED_CELLS.map((c) => c.ref).join(", ")} returned {EXCLUDED_CELLS[0]?.raw} and are
              excluded from verified values.
            </p>
          )}
        </article>
      </section>

      <section className="rounded-2xl border border-daikin-200 bg-gradient-to-r from-daikin-50 to-white p-6 shadow-card sm:p-8">
        <div className="flex flex-wrap items-center gap-6">
          <div className="flex -space-x-3">
            {selected.slice(0, 4).map((p) => (
              <ProductVisual key={p.id} product={p} size="xs" className="border-2 border-white" />
            ))}
          </div>
          <div className="min-w-[16rem] flex-1">
            <Badge variant="verified" size="sm">
              <ShieldCheck aria-hidden />
              Source-backed workflow
            </Badge>
            <h2 className="mt-2 text-xl font-bold text-navy-900">
              Search → select → compare → explain → publish
            </h2>
            <p className="mt-1 text-base text-navy-600">
              Move from a selection to a printable, cited sales message without leaving the app.
            </p>
          </div>
          <Button
            size="lg"
            disabled={selected.length < 2}
            onClick={() => {
              recordComparison();
              navigate("/compare");
            }}
          >
            Open comparison
            <ArrowRight aria-hidden />
          </Button>
        </div>
      </section>
    </div>
  );
}
