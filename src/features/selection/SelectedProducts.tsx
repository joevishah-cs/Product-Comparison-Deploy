import { useNavigate } from "react-router-dom";
import { X, GitCompareArrows, Info } from "lucide-react";
import { cn, UNAVAILABLE } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ProductVisual } from "@/components/common/ProductVisual";
import { Explain } from "@/components/ui/tooltip";
import { MAX_COMPARE, MIN_COMPARE, useSelection } from "./SelectionProvider";

export function SelectedProducts({ compact = false }: { compact?: boolean }) {
  const { selected, remove, clear, unitSelections, setUnit, canCompare, recordComparison } =
    useSelection();
  const navigate = useNavigate();

  return (
    <section aria-label="Selected products" className="surface p-5 sm:p-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold text-navy-900">Selected products</h2>
          <Badge variant={canCompare ? "daikin" : "neutral"}>
            {selected.length} of {MAX_COMPARE}
          </Badge>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {selected.length > 0 && (
            <Button variant="ghost" size="sm" onClick={clear}>
              Clear all
            </Button>
          )}
          <Button
            size="md"
            disabled={!canCompare}
            onClick={() => {
              recordComparison();
              navigate("/compare");
            }}
          >
            <GitCompareArrows aria-hidden />
            Compare {selected.length > 0 ? selected.length : ""} product{selected.length === 1 ? "" : "s"}
          </Button>
        </div>
      </header>

      {!canCompare && (
        <p className="mt-3 flex items-center gap-2 rounded-xl bg-caution-50 px-3.5 py-2.5 text-sm font-medium text-caution-700">
          <Info className="size-4 shrink-0" aria-hidden />
          Select at least {MIN_COMPARE} products to run a comparison.
        </p>
      )}

      {selected.length === 0 ? (
        <div className="mt-5 rounded-xl border border-dashed border-edge bg-navy-50/50 p-10 text-center">
          <p className="text-base font-medium text-navy-600">No products selected yet.</p>
          <p className="mt-1 text-sm text-navy-500">
            Search above for a brand, model, tonnage, refrigerant or a feature like “quiet”.
          </p>
        </div>
      ) : (
        <ul
          className={cn(
            "mt-5 grid gap-4",
            compact ? "sm:grid-cols-2 xl:grid-cols-3" : "sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4",
          )}
        >
          {selected.map((p) => (
            <li
              key={p.id}
              className={cn(
                "relative rounded-2xl border p-4 transition-shadow hover:shadow-lift",
                p.isDaikin ? "border-daikin-200 bg-daikin-50/40" : "border-edge bg-white",
              )}
            >
              <button
                type="button"
                onClick={() => remove(p.id)}
                aria-label={`Remove ${p.displayName} from the comparison`}
                className="absolute right-2 top-2 inline-flex size-9 items-center justify-center rounded-lg text-navy-400 transition-colors hover:bg-white hover:text-risk-600"
              >
                <X className="size-4" aria-hidden />
              </button>

              <div className="flex gap-3">
                <ProductVisual product={p} size="sm" />
                <div className="min-w-0 flex-1 pr-7">
                  <p className="text-sm font-semibold text-navy-500">{p.brand}</p>
                  <p className="truncate text-base font-bold text-navy-900" title={p.model}>
                    {p.model}
                  </p>
                  <p className="mt-0.5 truncate text-sm text-navy-500">{p.family}</p>
                </div>
              </div>

              <div className="mt-3.5">
                {p.tonnages && p.tonnages.length > 0 ? (
                  <>
                    <p className="mb-1.5 text-xs font-bold uppercase tracking-wider text-navy-400">
                      Unit size (tons)
                    </p>
                    <div className="flex flex-wrap gap-1.5" role="group" aria-label={`Unit size for ${p.displayName}`}>
                      {p.tonnages.map((t) => {
                        const active = unitSelections[p.id] === t;
                        return (
                          <button
                            key={t}
                            type="button"
                            aria-pressed={active}
                            onClick={() => setUnit(p.id, t)}
                            className={cn(
                              "min-h-[36px] min-w-[44px] rounded-lg border px-2.5 text-sm font-semibold transition-colors",
                              active
                                ? "border-daikin-600 bg-daikin-600 text-white"
                                : "border-edge bg-white text-navy-600 hover:border-daikin-300 hover:text-daikin-700",
                            )}
                          >
                            {t}
                          </button>
                        );
                      })}
                    </div>
                  </>
                ) : (
                  <Explain content="The imported source records this product at model level and does not break out unit sizes, so no tonnage can be selected.">
                    <p tabIndex={0} className="rounded-lg bg-navy-100/70 px-3 py-2 text-sm font-medium text-navy-500">
                      Model-level information only
                    </p>
                  </Explain>
                )}
              </div>

              <dl className="mt-3.5 grid grid-cols-2 gap-x-3 gap-y-1.5 border-t border-edge pt-3 text-sm">
                <dt className="text-navy-500">Refrigerant</dt>
                <dd className="text-right font-medium text-navy-800">
                  {p.attributes.refrigerant?.status === "verified"
                    ? p.attributes.refrigerant.display
                    : UNAVAILABLE}
                </dd>
                {/* The hydronic sheet records COP at rated conditions, not SEER2. */}
                {p.equipmentType === "air_to_water_hp" ? (
                  <>
                    <dt className="text-navy-500">COP</dt>
                    <dd className="text-right font-medium text-navy-800">
                      {p.attributes.cop_a446w95?.status === "verified"
                        ? p.attributes.cop_a446w95.display
                        : UNAVAILABLE}
                    </dd>
                  </>
                ) : (
                  <>
                    <dt className="text-navy-500">SEER2</dt>
                    <dd className="text-right font-medium text-navy-800">
                      {p.attributes.seer2?.status === "verified" ? p.attributes.seer2.display : UNAVAILABLE}
                    </dd>
                  </>
                )}
              </dl>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
