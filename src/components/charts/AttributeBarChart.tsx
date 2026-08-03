import * as React from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { AXIS_COLOR, GRID_COLOR, buildColorMap, shortLabel } from "./palette";
import type { AttributeValue, Product } from "@/data/types";
import { ATTRIBUTE_BY_KEY } from "@/data/catalog";
import { formatNumber, UNAVAILABLE } from "@/lib/utils";
import { gradFill } from "./ChartGradients";

export interface BarDatum {
  id: string;
  name: string;
  value: number;
  /** Verbatim source text, shown in the tooltip. */
  display: string;
  /** Compact label drawn on the bar so long source strings never overflow. */
  label: string;
  isDaikin: boolean;
  citation: string;
  brand: string;
}

/** Long source strings such as "Extremely Quiet, ∼45dBA" or "12y parts & 12y Repl."
 *  do not fit beside a bar, so the bar carries a compact form and the tooltip keeps
 *  the exact source wording. */
function compactLabel(attributeKey: string, value: AttributeValue): string {
  const n = value.numeric;
  if (n === null) return value.display;
  const unit = ATTRIBUTE_BY_KEY[attributeKey]?.unit ?? "";
  if (attributeKey === "warranty") {
    return `${formatNumber(n, 0)} yr parts`;
  }
  if (unit === "BTU/h") return formatNumber(n, 0);
  if (unit === "dBA" || unit === "ft" || unit === "°F" || unit === "A") {
    return `${formatNumber(n)} ${unit}`;
  }
  if (unit === "ratio") return formatNumber(n, 2);
  return formatNumber(n);
}

export function buildBarData(products: Product[], attributeKey: string): {
  data: BarDatum[];
  missing: Product[];
} {
  const data: BarDatum[] = [];
  const missing: Product[] = [];

  for (const p of products) {
    const v = p.attributes[attributeKey];
    if (v?.status === "verified" && v.numeric !== null) {
      data.push({
        id: p.id,
        name: shortLabel(p),
        value: v.numeric,
        display: v.display,
        label: compactLabel(attributeKey, v),
        isDaikin: p.isDaikin,
        citation: v.source.citation,
        brand: p.brand,
      });
    } else {
      missing.push(p);
    }
  }
  return { data, missing };
}

function ChartTooltip({
  active,
  payload,
  unit,
}: {
  active?: boolean;
  payload?: { payload: BarDatum }[];
  unit?: string;
}) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="max-w-xs rounded-xl border border-edge bg-white p-3.5 shadow-pop">
      <p className="text-sm font-semibold text-navy-900">
        {d.brand} {d.name.replace(" ★", "")}
        {d.isDaikin && <span className="ml-1.5 text-daikin-700">· Daikin</span>}
      </p>
      <p className="mt-1 text-lg font-bold text-navy-900">
        {d.display}
        {unit && !d.display.includes(unit) ? ` ${unit}` : ""}
      </p>
      <p className="mt-1.5 text-xs leading-relaxed text-navy-400">{d.citation}</p>
    </div>
  );
}

export function AttributeBarChart({
  products,
  attributeKey,
  height = 300,
  layout = "vertical",
}: {
  products: Product[];
  attributeKey: string;
  height?: number;
  layout?: "vertical" | "horizontal";
}) {
  const def = ATTRIBUTE_BY_KEY[attributeKey];
  const { data } = React.useMemo(() => buildBarData(products, attributeKey), [products, attributeKey]);
  const colors = React.useMemo(() => buildColorMap(products), [products]);

  if (!data.length) {
    return (
      <div
        className="flex items-center justify-center rounded-xl border border-dashed border-edge bg-navy-50/50 p-8 text-center"
        style={{ minHeight: height }}
      >
        <p className="text-base font-medium text-navy-500">
          {UNAVAILABLE} — no selected product carries a verified {def?.label ?? "value"} in the imported
          sources.
        </p>
      </div>
    );
  }

  const isBTU = def?.unit === "BTU/h";
  const maxValue = Math.max(...data.map((d) => d.value));

  return (
    <div style={{ width: "100%", height: Math.max(height, data.length * 44 + 60) }}>
      <ResponsiveContainer width="100%" height="100%">
        {layout === "vertical" ? (
          <BarChart
            data={data}
            layout="vertical"
            margin={{ top: 8, right: 104, bottom: 8, left: 8 }}
            barCategoryGap="22%"
          >
            <CartesianGrid horizontal={false} stroke={GRID_COLOR} />
            <XAxis
              type="number"
              domain={[0, maxValue * 1.14]}
              tick={{ fontSize: 13, fill: AXIS_COLOR }}
              tickFormatter={(v: number) => (isBTU ? `${Math.round(v / 1000)}k` : formatNumber(v))}
              axisLine={{ stroke: GRID_COLOR }}
              tickLine={false}
            />
            <YAxis
              type="category"
              dataKey="name"
              width={132}
              tick={{ fontSize: 13, fill: AXIS_COLOR, fontWeight: 500 }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              content={<ChartTooltip unit={def?.unit} />}
              cursor={{ fill: "rgba(0,151,224,0.06)" }}
            />
            <Bar dataKey="value" radius={[0, 8, 8, 0]} isAnimationActive={false}>
              {data.map((d) => (
                <Cell key={d.id} fill={gradFill(colors[d.id], "h")} />
              ))}
              <LabelList
                dataKey="label"
                position="right"
                style={{ fontSize: 14, fontWeight: 700, fill: AXIS_COLOR }}
              />
            </Bar>
          </BarChart>
        ) : (
          <BarChart data={data} margin={{ top: 28, right: 12, bottom: 8, left: 4 }} barCategoryGap="22%">
            <CartesianGrid vertical={false} stroke={GRID_COLOR} />
            <XAxis
              dataKey="name"
              tick={{ fontSize: 13, fill: AXIS_COLOR, fontWeight: 500 }}
              interval={0}
              angle={-18}
              textAnchor="end"
              height={70}
              axisLine={{ stroke: GRID_COLOR }}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 13, fill: AXIS_COLOR }}
              tickFormatter={(v: number) => (isBTU ? `${Math.round(v / 1000)}k` : formatNumber(v))}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip content={<ChartTooltip unit={def?.unit} />} cursor={{ fill: "rgba(0,151,224,0.06)" }} />
            <Bar dataKey="value" radius={[8, 8, 0, 0]} isAnimationActive={false}>
              {data.map((d) => (
                <Cell key={d.id} fill={gradFill(colors[d.id], "v")} />
              ))}
              <LabelList
                dataKey="label"
                position="top"
                style={{ fontSize: 13, fontWeight: 700, fill: AXIS_COLOR }}
              />
            </Bar>
          </BarChart>
        )}
      </ResponsiveContainer>
    </div>
  );
}

export function ChartLegend({ products }: { products: Product[] }) {
  const colors = buildColorMap(products);
  return (
    <ul className="mt-4 flex flex-wrap gap-x-5 gap-y-2">
      {products.map((p) => (
        <li key={p.id} className="flex items-center gap-2 text-sm text-navy-600">
          <span
            className="size-3 shrink-0 rounded-sm"
            style={{ backgroundColor: colors[p.id] }}
            aria-hidden
          />
          <span className={p.isDaikin ? "font-semibold text-navy-900" : ""}>
            {p.brand} {p.model}
            {p.isDaikin && <span className="ml-1 text-daikin-700">★ Daikin</span>}
          </span>
        </li>
      ))}
    </ul>
  );
}
