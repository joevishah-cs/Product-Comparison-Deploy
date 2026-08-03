import * as React from "react";
import { cn, UNAVAILABLE } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Explain, InfoTip } from "@/components/ui/tooltip";
import { SourceAssessmentNote } from "@/components/common/Provenance";
import { ATTRIBUTE_BY_KEY, ATTRIBUTE_KEYS_BY_EQUIPMENT } from "@/data/catalog";
import type { Product } from "@/data/types";
import type { ComparisonResult } from "./engine";

type TableFilter = "all" | "differences" | "advantages" | "missing";

const FILTER_LABEL: Record<TableFilter, string> = {
  all: "All attributes",
  differences: "Differences only",
  advantages: "Daikin advantages",
  missing: "Missing data",
};

export function FeatureTable({
  products,
  result,
}: {
  products: Product[];
  result: ComparisonResult;
}) {
  const [filter, setFilter] = React.useState<TableFilter>("all");

  const edgeKeys = React.useMemo(() => new Set(result.edges.map((e) => e.attributeKey)), [result.edges]);

  const keys = React.useMemo(() => {
    const types = Array.from(new Set(products.map((p) => p.equipmentType)));
    return Array.from(new Set(types.flatMap((t) => ATTRIBUTE_KEYS_BY_EQUIPMENT[t])));
  }, [products]);

  const rows = React.useMemo(() => {
    return keys.filter((key) => {
      const values = products.map((p) => p.attributes[key]);
      const verified = values.filter((v) => v?.status === "verified");
      switch (filter) {
        case "differences": {
          const distinct = new Set(verified.map((v) => v.display));
          return distinct.size > 1;
        }
        case "advantages":
          return edgeKeys.has(key);
        case "missing":
          return values.some((v) => !v || v.status !== "verified");
        default:
          return true;
      }
    });
  }, [keys, products, filter, edgeKeys]);

  const grouped = React.useMemo(() => {
    const map = new Map<string, string[]>();
    for (const key of rows) {
      const group = ATTRIBUTE_BY_KEY[key]?.group ?? "Other";
      map.set(group, [...(map.get(group) ?? []), key]);
    }
    return Array.from(map.entries());
  }, [rows]);

  const counts = React.useMemo(() => {
    const distinctCount = keys.filter((key) => {
      const verified = products.map((p) => p.attributes[key]).filter((v) => v?.status === "verified");
      return new Set(verified.map((v) => v.display)).size > 1;
    }).length;
    const missingCount = keys.filter((key) =>
      products.some((p) => p.attributes[key]?.status !== "verified"),
    ).length;
    return { all: keys.length, differences: distinctCount, advantages: edgeKeys.size, missing: missingCount };
  }, [keys, products, edgeKeys]);

  return (
    <section aria-label="Detailed feature comparison" className="space-y-4">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-navy-900">Detailed feature comparison</h2>
          <p className="mt-1.5 max-w-3xl text-base text-navy-500">
            Every attribute recorded in the imported sources for the products you selected. Hover a value
            to see the exact document, page or cell it came from.
          </p>
        </div>
        <div className="no-print flex flex-wrap gap-2" role="group" aria-label="Filter attributes">
          {(Object.keys(FILTER_LABEL) as TableFilter[]).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              aria-pressed={filter === f}
              className={cn(
                "inline-flex min-h-[44px] items-center gap-2 rounded-xl border px-3.5 text-sm font-semibold transition-colors",
                filter === f
                  ? "border-daikin-600 bg-daikin-600 text-white"
                  : "border-edge bg-white text-navy-600 hover:border-daikin-300 hover:text-daikin-700",
              )}
            >
              {FILTER_LABEL[f]}
              <span
                className={cn(
                  "rounded-full px-1.5 text-xs font-bold",
                  filter === f ? "bg-white/25" : "bg-navy-100 text-navy-500",
                )}
              >
                {counts[f]}
              </span>
            </button>
          ))}
        </div>
      </header>

      {rows.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-edge bg-white p-10 text-center text-base text-navy-500">
          No attributes match this filter for the current selection.
        </p>
      ) : (
        <div className="max-h-[calc(100vh-11rem)] overflow-auto surface scroll-shadow print-scroll-reset">
          <table className="w-full min-w-[900px] border-collapse text-left">
            <caption className="sr-only">
              Attribute comparison across {products.length} selected products
            </caption>
            <thead className="sticky top-0 z-20">
              <tr>
                <th
                  scope="col"
                  className="sticky left-0 z-30 w-64 min-w-[16rem] border-b border-edge bg-white px-5 py-4 text-sm font-bold text-navy-500"
                >
                  Attribute
                </th>
                {products.map((p) => (
                  <th
                    key={p.id}
                    scope="col"
                    className={cn(
                      "min-w-[11rem] border-b border-l border-edge px-4 py-3 align-bottom",
                      p.isDaikin ? "bg-daikin-50" : "bg-white",
                    )}
                  >
                    <span className="block text-xs font-semibold text-navy-500">{p.brand}</span>
                    <span
                      className={cn(
                        "block text-[0.9375rem] font-bold leading-tight",
                        p.isDaikin ? "text-daikin-900" : "text-navy-900",
                      )}
                    >
                      {p.model}
                    </span>
                    {p.isDaikin && (
                      <Badge variant="daikin" size="sm" className="mt-1">
                        Daikin
                      </Badge>
                    )}
                  </th>
                ))}
              </tr>
            </thead>

            {grouped.map(([group, groupKeys]) => (
              <tbody key={group}>
                <tr>
                  <th
                    scope="colgroup"
                    colSpan={products.length + 1}
                    className="sticky left-0 border-y border-edge bg-navy-50 px-5 py-2 text-xs font-bold uppercase tracking-wider text-navy-500"
                  >
                    {group}
                  </th>
                </tr>
                {groupKeys.map((key) => {
                  const def = ATTRIBUTE_BY_KEY[key];
                  const isEdge = edgeKeys.has(key);
                  return (
                    <tr key={key} className="even:bg-navy-50/40">
                      <th
                        scope="row"
                        className="sticky left-0 z-10 border-b border-edge bg-inherit px-5 py-3 align-top"
                      >
                        <span className="flex items-start gap-1 text-sm font-semibold text-navy-800">
                          <span>{def?.label ?? key}</span>
                          {def?.plainLanguage && (
                            <InfoTip label={def.label}>{def.plainLanguage}</InfoTip>
                          )}
                        </span>
                        {def?.sourceComment && (
                          <Explain content={`Source note: ${def.sourceComment}`}>
                            <span
                              tabIndex={0}
                              className="mt-0.5 block max-w-[14rem] truncate text-xs text-navy-400"
                            >
                              {def.sourceComment}
                            </span>
                          </Explain>
                        )}
                      </th>

                      {products.map((p) => {
                        const v = p.attributes[key];
                        const applicable = ATTRIBUTE_KEYS_BY_EQUIPMENT[p.equipmentType].includes(key);
                        const verified = v?.status === "verified";
                        const daikinEdgeCell = isEdge && p.isDaikin && verified;

                        return (
                          <td
                            key={p.id}
                            className={cn(
                              "border-b border-l border-edge px-4 py-3 align-top",
                              p.isDaikin && "bg-daikin-50/50",
                              daikinEdgeCell && "bg-verified-50",
                            )}
                          >
                            {!applicable ? (
                              <Explain content={`This attribute is only recorded for ${def?.equipmentType === "air_to_water_hp" ? "air-to-water" : "inverter ducted split"} products. It is not applicable to this model, and is not counted as a missing value.`}>
                                <span tabIndex={0} className="text-sm text-navy-300">
                                  Not applicable
                                </span>
                              </Explain>
                            ) : verified ? (
                              <>
                                <span className="flex items-start gap-1.5">
                                  <span className="text-[0.9375rem] font-medium leading-snug text-navy-900">
                                    {v.display}
                                  </span>
                                  <SourceAssessmentNote value={v} />
                                </span>
                                {daikinEdgeCell && (
                                  <Badge variant="verified" size="sm" className="mt-1.5">
                                    Verified Daikin edge
                                  </Badge>
                                )}
                                <Explain content={v.source.citation}>
                                  <span
                                    tabIndex={0}
                                    className="mt-1 block truncate text-xs text-navy-400 hover:text-daikin-700"
                                  >
                                    {v.source.cell
                                      ? `Cell ${v.source.cell}`
                                      : `p.${v.source.page} · ${v.source.column}`}
                                  </span>
                                </Explain>
                              </>
                            ) : (
                              <Explain
                                content={
                                  v?.status === "formula_error"
                                    ? `The source cell ${v.source.cell} contains ${v.raw}, a spreadsheet error. It is excluded from verified values rather than shown as data.`
                                    : "The source document leaves this cell blank. A blank is not a “No” — the value was never recorded."
                                }
                              >
                                <span
                                  tabIndex={0}
                                  className="text-sm font-medium text-caution-700"
                                >
                                  {UNAVAILABLE}
                                </span>
                              </Explain>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            ))}
          </table>
        </div>
      )}

      <p className="text-sm leading-relaxed text-navy-400">
        Small coloured dots reproduce the battlecard's own shading — its legend reads “Daikin better”,
        “Comp. better” and “Information not available”. Those marks are the source author's qualitative
        judgement, shown as presentation evidence only; the “Verified Daikin edge” badges are calculated
        by this application from the numeric source values.
      </p>
    </section>
  );
}
