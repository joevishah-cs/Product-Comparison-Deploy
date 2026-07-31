import * as React from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  PolarAngleAxis,
  PolarGrid,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Table2, BarChart3 } from "lucide-react";
import { cn } from "@/lib/utils";
import { BRANDS, BRAND_BY_KEY, type BrandKey } from "@/data/brand-intel";
import { leaderOf, pointFor, type BrandSeries } from "@/data/brand-scorecard";

const AXIS_COLOR = "#274060";
const GRID_COLOR = "#e4ecf4";

function fmt(value: number, unit: string): string {
  const n =
    value >= 10000
      ? value.toLocaleString("en-US")
      : Number.isInteger(value)
        ? String(value)
        : value.toFixed(1);
  if (unit === "%") return `${n}%`;
  if (unit === "/5") return `${n}/5`;
  if (!unit) return n;
  return `${n} ${unit}`;
}

/** Shared table view. Every chart ships one so identity is never colour-alone. */
function SeriesTable({ series }: { series: BrandSeries }) {
  const leader = leaderOf(series);
  return (
    <div className="overflow-x-auto rounded-xl border border-edge">
      <table className="w-full min-w-[320px] text-left text-sm">
        <thead>
          <tr className="border-b border-edge bg-navy-50/60 text-xs font-bold uppercase tracking-wider text-navy-500">
            <th className="px-3 py-2">Brand</th>
            <th className="px-3 py-2 text-right">{series.label}</th>
          </tr>
        </thead>
        <tbody>
          {[...series.points]
            .sort((a, b) =>
              series.direction === "lower" ? a.value - b.value : b.value - a.value,
            )
            .map((p) => {
              const brand = BRAND_BY_KEY[p.brand];
              return (
                <tr key={p.brand} className="border-b border-edge last:border-b-0">
                  <td className="px-3 py-2">
                    <span className="flex items-center gap-2">
                      <span
                        aria-hidden
                        className="size-2.5 shrink-0 rounded-full"
                        style={{ background: brand.color }}
                      />
                      <span className={cn("text-navy-800", brand.isDaikin && "font-bold")}>
                        {brand.name}
                      </span>
                      {leader?.brand === p.brand && (
                        <span className="rounded-full bg-verified-50 px-1.5 py-0.5 text-[0.6875rem] font-bold uppercase text-verified-700">
                          Leads
                        </span>
                      )}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-right font-semibold tabular-nums text-navy-900">
                    {fmt(p.value, series.unit)}
                  </td>
                </tr>
              );
            })}
        </tbody>
      </table>
    </div>
  );
}

function ChartTooltip({ active, payload, unit }: any) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="rounded-xl border border-edge bg-white p-3 shadow-pop">
      <p className="text-sm font-semibold text-navy-900">{d.fullName}</p>
      <p className="mt-0.5 text-lg font-bold tabular-nums text-navy-900">{fmt(d.value, unit)}</p>
      <p className="mt-1 max-w-[16rem] text-xs leading-relaxed text-navy-400">{d.raw}</p>
    </div>
  );
}

/** Horizontal ranked bars + a table toggle. The default form for magnitude. */
export function RankedBars({
  series,
  height = 200,
}: {
  series: BrandSeries;
  height?: number;
}) {
  const [view, setView] = React.useState<"chart" | "table">("chart");

  const data = React.useMemo(
    () =>
      [...series.points]
        .sort((a, b) => (series.direction === "lower" ? b.value - a.value : a.value - b.value))
        .map((p) => ({
          name: BRAND_BY_KEY[p.brand].name.replace("Mitsubishi Electric", "Mitsubishi"),
          fullName: `${BRAND_BY_KEY[p.brand].name} (${BRAND_BY_KEY[p.brand].product})`,
          value: p.value,
          raw: p.raw,
          color: BRAND_BY_KEY[p.brand].color,
          isDaikin: BRAND_BY_KEY[p.brand].isDaikin,
        })),
    [series],
  );

  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="text-xs font-medium text-navy-400">
          {series.direction === "lower" ? "Lower is better" : "Higher is better"} · sheet row{" "}
          {series.sourceRow}
        </p>
        <button
          type="button"
          onClick={() => setView(view === "chart" ? "table" : "chart")}
          className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-semibold text-navy-500 transition-colors hover:bg-navy-100 hover:text-navy-800"
          aria-label={view === "chart" ? "Show as table" : "Show as chart"}
        >
          {view === "chart" ? <Table2 className="size-3.5" /> : <BarChart3 className="size-3.5" />}
          {view === "chart" ? "Table" : "Chart"}
        </button>
      </div>

      {view === "table" ? (
        <SeriesTable series={series} />
      ) : (
        <div style={{ width: "100%", height }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} layout="vertical" margin={{ top: 4, right: 56, bottom: 4, left: 4 }}>
              <CartesianGrid horizontal={false} stroke={GRID_COLOR} />
              <XAxis type="number" hide domain={[0, "dataMax"]} />
              <YAxis
                type="category"
                dataKey="name"
                width={96}
                tickLine={false}
                axisLine={false}
                tick={{ fill: AXIS_COLOR, fontSize: 12 }}
              />
              <Tooltip
                cursor={{ fill: "rgba(0,151,224,0.06)" }}
                content={<ChartTooltip unit={series.unit} />}
              />
              <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={16} isAnimationActive={false}>
                {data.map((d) => (
                  <Cell key={d.name} fill={d.color} stroke="#fff" strokeWidth={2} />
                ))}
                {/* Direct labels double as the secondary encoding the palette needs. */}
                <LabelList
                  dataKey="value"
                  position="right"
                  formatter={(v: number) => fmt(v, series.unit)}
                  style={{ fill: AXIS_COLOR, fontSize: 12, fontWeight: 700 }}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

/** Normalized multi-axis profile. Shape comparison, not a score. */
export function BrandRadar({
  series,
  brands,
  height = 320,
}: {
  series: BrandSeries[];
  brands: BrandKey[];
  height?: number;
}) {
  const data = React.useMemo(
    () =>
      series.map((s) => {
        const values = s.points.map((p) => p.value);
        const min = Math.min(...values);
        const max = Math.max(...values);
        const span = max - min || 1;
        const row: Record<string, string | number> = {
          axis: s.label.replace(/ \(.*\)$/, ""),
        };
        for (const key of brands) {
          const p = pointFor(s, key);
          if (!p) continue;
          // Normalize 0-100 within the selection; invert when lower is better.
          const norm = ((p.value - min) / span) * 100;
          row[key] = Math.round(s.direction === "lower" ? 100 - norm : norm);
        }
        return row;
      }),
    [series, brands],
  );

  return (
    <div style={{ width: "100%", height }}>
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart data={data} outerRadius="72%">
          <PolarGrid stroke={GRID_COLOR} />
          <PolarAngleAxis dataKey="axis" tick={{ fill: AXIS_COLOR, fontSize: 11 }} />
          {brands.map((key) => (
            <Radar
              key={key}
              name={BRAND_BY_KEY[key].name}
              dataKey={key}
              stroke={BRAND_BY_KEY[key].color}
              fill={BRAND_BY_KEY[key].color}
              fillOpacity={0.14}
              strokeWidth={2}
              isAnimationActive={false}
            />
          ))}
          <Tooltip
            content={({ active, payload, label }) => {
              if (!active || !payload?.length) return null;
              return (
                <div className="rounded-xl border border-edge bg-white p-3 shadow-pop">
                  <p className="text-sm font-semibold text-navy-900">{label}</p>
                  <ul className="mt-1 space-y-0.5">
                    {payload.map((e) => (
                      <li key={String(e.name)} className="flex items-center gap-2 text-xs">
                        <span
                          aria-hidden
                          className="size-2 rounded-full"
                          style={{ background: e.color }}
                        />
                        <span className="text-navy-600">{e.name}</span>
                        <span className="ml-auto font-bold tabular-nums text-navy-900">
                          {e.value}
                        </span>
                      </li>
                    ))}
                  </ul>
                  <p className="mt-1.5 text-[0.6875rem] text-navy-400">
                    Indexed 0-100 within this selection.
                  </p>
                </div>
              );
            }}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Legend shared by charts with >= 2 series. */
export function BrandLegend({ brands }: { brands?: BrandKey[] }) {
  const list = brands ? BRANDS.filter((b) => brands.includes(b.key)) : BRANDS;
  return (
    <ul className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
      {list.map((b) => (
        <li key={b.key} className="flex items-center gap-1.5 text-xs">
          <span aria-hidden className="size-2.5 rounded-full" style={{ background: b.color }} />
          <span className={cn("text-navy-600", b.isDaikin && "font-bold text-navy-800")}>
            {b.name}
          </span>
        </li>
      ))}
    </ul>
  );
}

/** Stacked sentiment bar -- one row per brand, 2px gaps between segments. */
export function SentimentBars({
  rows,
}: {
  rows: { brand: BrandKey; positive: number; neutral: number; negative: number; raw: string }[];
}) {
  return (
    <ul className="space-y-3">
      {rows.map((r) => {
        const brand = BRAND_BY_KEY[r.brand];
        return (
          <li key={r.brand}>
            <div className="mb-1 flex items-baseline justify-between gap-3">
              <span
                className={cn(
                  "flex items-center gap-2 text-sm text-navy-700",
                  brand.isDaikin && "font-bold text-navy-900",
                )}
              >
                <span
                  aria-hidden
                  className="size-2.5 rounded-full"
                  style={{ background: brand.color }}
                />
                {brand.name}
              </span>
              <span className="text-sm font-bold tabular-nums text-verified-700">
                {r.positive}% positive
              </span>
            </div>
            <div
              className="flex h-6 gap-0.5 overflow-hidden rounded-lg"
              role="img"
              aria-label={`${brand.name}: ${r.positive}% positive, ${r.neutral}% neutral, ${r.negative}% negative`}
            >
              <div
                className="flex items-center justify-center bg-verified-500/85 text-[0.6875rem] font-bold text-white"
                style={{ width: `${r.positive}%` }}
              >
                {r.positive}%
              </div>
              <div
                className="flex items-center justify-center bg-navy-300 text-[0.6875rem] font-bold text-navy-700"
                style={{ width: `${r.neutral}%` }}
              >
                {r.neutral > 6 ? `${r.neutral}%` : ""}
              </div>
              <div
                className="flex items-center justify-center bg-risk-500/85 text-[0.6875rem] font-bold text-white"
                style={{ width: `${r.negative}%` }}
              >
                {r.negative > 6 ? `${r.negative}%` : ""}
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
