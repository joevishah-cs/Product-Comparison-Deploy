import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { AXIS_COLOR, GRID_COLOR, buildColorMap, shortLabel, DAIKIN_FILL } from "./palette";
import type { Product } from "@/data/types";
import { ATTRIBUTE_KEYS_BY_EQUIPMENT, coverageFor } from "@/data/catalog";
import { UNAVAILABLE, formatNumber } from "@/lib/utils";
import { gradFill } from "./ChartGradients";

function EmptyState({ label, height = 260 }: { label: string; height?: number }) {
  return (
    <div
      className="flex items-center justify-center rounded-xl border border-dashed border-edge bg-navy-50/50 p-8 text-center"
      style={{ minHeight: height }}
    >
      <p className="text-base font-medium text-navy-500">{label}</p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Operating-range chart (floating bars)                               */
/* ------------------------------------------------------------------ */

export function OperatingRangeChart({
  products,
  attributeKey,
  height = 320,
}: {
  products: Product[];
  attributeKey: string;
  height?: number;
}) {
  const colors = buildColorMap(products);
  const data = products
    .map((p) => {
      const v = p.attributes[attributeKey];
      if (v?.status !== "verified" || v.numeric === null) return null;
      const min = v.numeric;
      const max = v.numericSecondary;
      return {
        id: p.id,
        name: shortLabel(p),
        min,
        span: max !== null ? max - min : 0,
        max,
        display: v.display,
        citation: v.source.citation,
        singleBound: max === null,
        brand: p.brand,
      };
    })
    .filter(Boolean) as {
    id: string;
    name: string;
    min: number;
    span: number;
    max: number | null;
    display: string;
    citation: string;
    singleBound: boolean;
    brand: string;
  }[];

  if (!data.length) return <EmptyState label={`${UNAVAILABLE} — no verified operating range in this selection.`} height={height} />;

  const lo = Math.min(...data.map((d) => d.min));
  const hi = Math.max(...data.map((d) => d.max ?? d.min));

  return (
    <div style={{ width: "100%", height: Math.max(height, data.length * 44 + 60) }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ top: 8, right: 96, bottom: 8, left: 8 }} barCategoryGap="26%">
          <CartesianGrid horizontal={false} stroke={GRID_COLOR} />
          <XAxis
            type="number"
            domain={[Math.floor(lo - 12), Math.ceil(hi + 12)]}
            tick={{ fontSize: 13, fill: AXIS_COLOR }}
            tickFormatter={(v: number) => `${v}°F`}
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
            cursor={{ fill: "rgba(0,151,224,0.06)" }}
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const d = payload[0].payload as (typeof data)[number];
              return (
                <div className="max-w-xs rounded-xl border border-edge bg-white p-3.5 shadow-pop">
                  <p className="text-sm font-semibold text-navy-900">
                    {d.brand} {d.name.replace(" ★", "")}
                  </p>
                  <p className="mt-1 text-lg font-bold text-navy-900">{d.display}</p>
                  {d.singleBound && (
                    <p className="mt-1 text-sm text-caution-700">
                      The source records only one bound for this model.
                    </p>
                  )}
                  <p className="mt-1.5 text-xs leading-relaxed text-navy-400">{d.citation}</p>
                </div>
              );
            }}
          />
          <Bar dataKey="min" stackId="range" fill="transparent" isAnimationActive={false} />
          <Bar dataKey="span" stackId="range" radius={6} isAnimationActive={false}>
            {data.map((d) => (
              <Cell key={d.id} fill={gradFill(colors[d.id], "h")} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Radar: normalized profile across six dimensions                     */
/* ------------------------------------------------------------------ */

const RADAR_DIMENSIONS_DUCTED: { key: string; label: string; attributeKey: string; invert?: boolean }[] = [
  { key: "efficiency", label: "Efficiency", attributeKey: "seer2" },
  { key: "sound", label: "Quietness", attributeKey: "sound_level", invert: true },
  { key: "warranty", label: "Warranty", attributeKey: "warranty" },
  { key: "cold", label: "Cold climate", attributeKey: "heating_range", invert: true },
  { key: "controls", label: "Controls", attributeKey: "__controls" },
  { key: "install", label: "Installation", attributeKey: "__install" },
];

const RADAR_DIMENSIONS_A2W: { key: string; label: string; attributeKey: string; invert?: boolean }[] = [
  { key: "cop", label: "Efficiency (COP)", attributeKey: "cop_a446w158" },
  { key: "cop_cold", label: "Cold-climate COP", attributeKey: "cop_a5w95" },
  { key: "eer", label: "Cooling (EER)", attributeKey: "eer_a95w716" },
  { key: "sound", label: "Quietness", attributeKey: "outdoor_sound", invert: true },
  { key: "lwt", label: "Max leaving water temp", attributeKey: "max_lwt" },
  { key: "capacity", label: "Heating capacity", attributeKey: "heat_cap_a446w158" },
];

function radarDimensionsFor(products: Product[]) {
  const allA2W = products.length > 0 && products.every((p) => p.equipmentType === "air_to_water_hp");
  return allA2W ? RADAR_DIMENSIONS_A2W : RADAR_DIMENSIONS_DUCTED;
}

const CONTROL_KEYS = ["thermostat_type", "humidity_control", "intelligent_defrost", "cloud_alerts"];
const INSTALL_KEYS = ["charge_verification", "slow_loss_alerting", "regional_profiles", "reusable_profiles", "coil_only_matchup"];

function capabilityScore(product: Product, keys: string[]): number | null {
  const known = keys.filter((k) => product.attributes[k]?.status === "verified");
  if (!known.length) return null;
  const yes = known.filter((k) => {
    const v = product.attributes[k];
    return v.boolean === true || (v.boolean === null && v.display.toLowerCase().includes("smart"));
  });
  return (yes.length / keys.length) * 100;
}

export function CapabilityRadar({ products, height = 380 }: { products: Product[]; height?: number }) {
  const colors = buildColorMap(products);
  const dimensions = radarDimensionsFor(products);
  const eligibleType = dimensions === RADAR_DIMENSIONS_A2W ? "air_to_water_hp" : "ducted_split_hp";
  const eligible = products.filter((p) => p.equipmentType === eligibleType);

  const raw = eligible.map((p) => {
    const scores: Record<string, number | null> = {};
    for (const dim of dimensions) {
      if (dim.attributeKey === "__controls") scores[dim.key] = capabilityScore(p, CONTROL_KEYS);
      else if (dim.attributeKey === "__install") scores[dim.key] = capabilityScore(p, INSTALL_KEYS);
      else {
        const v = p.attributes[dim.attributeKey];
        scores[dim.key] = v?.status === "verified" && v.numeric !== null ? v.numeric : null;
      }
    }
    return { product: p, scores };
  });

  if (!raw.length) {
    const label =
      eligibleType === "air_to_water_hp"
        ? "The radar covers air-to-water heat pumps. Select at least one to see it."
        : "The radar covers inverter ducted split heat pumps. Select at least one to see it.";
    return <EmptyState label={label} height={height} />;
  }

  const data = dimensions.map((dim) => {
    const values = raw.map((r) => r.scores[dim.key]).filter((v): v is number => v !== null);
    const min = values.length ? Math.min(...values) : 0;
    const max = values.length ? Math.max(...values) : 1;
    const span = max - min || 1;

    const row: Record<string, string | number> = { dimension: dim.label };
    for (const r of raw) {
      const v = r.scores[dim.key];
      if (v === null) {
        row[r.product.id] = 0;
      } else if (dim.attributeKey === "__controls" || dim.attributeKey === "__install") {
        row[r.product.id] = Math.round(v);
      } else {
        const normalized = ((v - min) / span) * 100;
        row[r.product.id] = Math.round(dim.invert ? 100 - normalized : normalized);
      }
    }
    return row;
  });

  return (
    <div style={{ width: "100%", height }}>
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart data={data} outerRadius="72%">
          <PolarGrid stroke={GRID_COLOR} />
          <PolarAngleAxis dataKey="dimension" tick={{ fontSize: 13, fill: AXIS_COLOR, fontWeight: 600 }} />
          <PolarRadiusAxis domain={[0, 100]} tick={{ fontSize: 11, fill: "#9db8d8" }} tickCount={5} />
          <Tooltip
            content={({ active, payload, label }) => {
              if (!active || !payload?.length) return null;
              return (
                <div className="rounded-xl border border-edge bg-white p-3.5 shadow-pop">
                  <p className="text-sm font-bold text-navy-900">{label}</p>
                  <p className="mt-0.5 text-xs text-navy-400">Relative score within this selection (0–100)</p>
                  <ul className="mt-2 space-y-1">
                    {payload.map((entry) => (
                      <li key={String(entry.dataKey)} className="flex items-center gap-2 text-sm">
                        <span className="size-2.5 rounded-sm" style={{ backgroundColor: entry.color }} />
                        <span className="text-navy-700">{entry.name}</span>
                        <span className="ml-auto font-semibold text-navy-900">{entry.value}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            }}
          />
          <Legend wrapperStyle={{ paddingTop: 12 }} />
          {raw.map((r) => (
            <Radar
              key={r.product.id}
              name={`${r.product.brand} ${r.product.model}${r.product.isDaikin ? " ★" : ""}`}
              dataKey={r.product.id}
              stroke={colors[r.product.id]}
              fill={colors[r.product.id]}
              fillOpacity={r.product.isDaikin ? 0.28 : 0.12}
              strokeWidth={r.product.isDaikin ? 3 : 2}
              isAnimationActive={false}
            />
          ))}
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Donut charts                                                        */
/* ------------------------------------------------------------------ */

export interface DonutSlice {
  name: string;
  value: number;
  color: string;
  note?: string;
}

export function DonutChart({
  slices,
  height = 280,
  centerLabel,
  centerValue,
}: {
  slices: DonutSlice[];
  height?: number;
  centerLabel?: string;
  centerValue?: string;
}) {
  const total = slices.reduce((s, d) => s + d.value, 0);
  if (!total) return <EmptyState label={`${UNAVAILABLE} — nothing to chart for the current selection.`} height={height} />;

  return (
    <div className="relative" style={{ width: "100%", height }}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={slices}
            dataKey="value"
            nameKey="name"
            innerRadius="58%"
            outerRadius="86%"
            paddingAngle={2}
            isAnimationActive={false}
            stroke="#fff"
            strokeWidth={2}
          >
            {slices.map((s) => (
              <Cell key={s.name} fill={gradFill(s.color, "v")} />
            ))}
          </Pie>
          <Tooltip
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const d = payload[0].payload as DonutSlice;
              return (
                <div className="rounded-xl border border-edge bg-white p-3.5 shadow-pop">
                  <p className="text-sm font-semibold text-navy-900">{d.name}</p>
                  <p className="mt-0.5 text-lg font-bold text-navy-900">
                    {d.value} <span className="text-sm font-medium text-navy-500">({Math.round((d.value / total) * 100)}%)</span>
                  </p>
                  {d.note && <p className="mt-1 text-xs text-navy-400">{d.note}</p>}
                </div>
              );
            }}
          />
          <Legend
            verticalAlign="bottom"
            height={40}
            formatter={(value: string) => <span style={{ color: AXIS_COLOR, fontSize: 14 }}>{value}</span>}
          />
        </PieChart>
      </ResponsiveContainer>
      {centerValue && (
        <div className="pointer-events-none absolute inset-x-0 top-[38%] -translate-y-1/2 text-center">
          <p className="text-3xl font-bold text-navy-900">{centerValue}</p>
          {centerLabel && <p className="text-sm text-navy-500">{centerLabel}</p>}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Refrigerant reference comparison                                    */
/* ------------------------------------------------------------------ */

interface RefrigerantReference {
  gwp: string;
  flammability: string;
  efficiency: string;
  trend: string;
}

/** General industry reference values -- not drawn from the imported source
 *  documents, so this is kept separate from any verified-citation display. */
const REFRIGERANT_REFERENCE: Record<string, RefrigerantReference> = {
  "R-32": {
    gwp: "Lower (~675)",
    flammability: "Mildly flammable (A2L)",
    efficiency: "High",
    trend: "Widely adopted, lower environmental impact",
  },
  "R-454B": {
    gwp: "Even lower (~466)",
    flammability: "Mildly flammable (A2L)",
    efficiency: "High",
    trend: "Increasing adoption as an R-410A replacement",
  },
  "R-410A": {
    gwp: "High (~2088)",
    flammability: "Non-flammable (A1)",
    efficiency: "High",
    trend: "Being phased down under EPA AIM Act schedules",
  },
};

export function RefrigerantComparisonTable({
  modelsByRefrigerant,
}: {
  /** Refrigerant display value -> model names of selected products using it. */
  modelsByRefrigerant: Record<string, string[]>;
}) {
  const known = Object.keys(modelsByRefrigerant).filter((r) => REFRIGERANT_REFERENCE[r]);
  if (!known.length) return null;

  return (
    <div>
      <div className="mb-2 flex items-center gap-2">
        <span className="inline-flex items-center rounded-full bg-navy-100 px-2.5 py-1 text-xs font-bold uppercase tracking-wider text-navy-600">
          Industry reference
        </span>
      </div>
      <div className="overflow-x-auto rounded-xl border border-edge">
        <table className="table-sleek min-w-[420px]">
          <thead>
            <tr>
              <th className="px-3.5 py-2.5">Refrigerant</th>
              <th className="px-3.5 py-2.5">Model</th>
              <th className="px-3.5 py-2.5">Industry trend</th>
            </tr>
          </thead>
          <tbody>
            {known.map((r) => {
              const ref = REFRIGERANT_REFERENCE[r];
              const models = modelsByRefrigerant[r];
              return (
                <tr key={r} className="border-b border-edge last:border-b-0">
                  <td className="px-3.5 py-2.5 font-semibold text-navy-900">{r}</td>
                  <td className="px-3.5 py-2.5 text-navy-700">{models.join(", ")}</td>
                  <td className="px-3.5 py-2.5 text-navy-700">{ref.trend}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Data completeness                                                   */
/* ------------------------------------------------------------------ */

export function DataCompletenessChart({ products, height = 300 }: { products: Product[]; height?: number }) {
  const colors = buildColorMap(products);
  const data = products.map((p) => {
    const c = coverageFor(p);
    return {
      id: p.id,
      name: shortLabel(p),
      pct: c.pct,
      display: `${c.verified} of ${c.total}`,
      brand: p.brand,
    };
  });

  return (
    <div style={{ width: "100%", height: Math.max(height, data.length * 42 + 60) }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ top: 8, right: 96, bottom: 8, left: 8 }} barCategoryGap="26%">
          <CartesianGrid horizontal={false} stroke={GRID_COLOR} />
          <XAxis
            type="number"
            domain={[0, 100]}
            tick={{ fontSize: 13, fill: AXIS_COLOR }}
            tickFormatter={(v: number) => `${v}%`}
            axisLine={{ stroke: GRID_COLOR }}
            tickLine={false}
          />
          <YAxis type="category" dataKey="name" width={132} tick={{ fontSize: 13, fill: AXIS_COLOR, fontWeight: 500 }} axisLine={false} tickLine={false} />
          <Tooltip
            cursor={{ fill: "rgba(0,151,224,0.06)" }}
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const d = payload[0].payload as (typeof data)[number];
              return (
                <div className="rounded-xl border border-edge bg-white p-3.5 shadow-pop">
                  <p className="text-sm font-semibold text-navy-900">{d.brand} {d.name.replace(" ★", "")}</p>
                  <p className="mt-1 text-lg font-bold text-navy-900">{d.pct}% complete</p>
                  <p className="text-sm text-navy-500">{d.display} attributes carry a verified source value.</p>
                </div>
              );
            }}
          />
          <Bar dataKey="pct" radius={[0, 8, 8, 0]} isAnimationActive={false} label={{ position: "right", formatter: (v: number) => `${v}%`, style: { fontSize: 14, fontWeight: 700, fill: AXIS_COLOR } }}>
            {data.map((d) => (
              <Cell key={d.id} fill={gradFill(colors[d.id], "h")} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Capacity availability (air-to-water)                                */
/* ------------------------------------------------------------------ */

/** Air-to-water models are listed by rated capacity in kBtu/h rather than tonnage. */
export function CapacityAvailabilityChart({
  products,
  height = 300,
}: {
  products: Product[];
  height?: number;
}) {
  const withCaps = products.filter((p) => p.capacities && p.capacities.length);
  if (!withCaps.length) {
    return (
      <EmptyState
        label="No selected product lists rated capacities in the imported sources."
        height={height}
      />
    );
  }
  const colors = buildColorMap(products);

  return (
    <ul className="space-y-2.5">
      {withCaps.map((p) => (
        <li key={p.id} className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <span
            className={`w-44 shrink-0 text-sm ${p.isDaikin ? "font-semibold text-navy-900" : "font-medium text-navy-800"}`}
          >
            {p.brand} {p.model}
            {p.isDaikin && " ★"}
          </span>
          <span className="flex flex-wrap gap-1.5">
            {p.capacities!.map((c) => (
              <span
                key={c}
                className="rounded-md px-2.5 py-1 text-sm font-bold text-white"
                style={{ backgroundColor: colors[p.id] }}
              >
                {c} kBtu/h
              </span>
            ))}
          </span>
        </li>
      ))}
    </ul>
  );
}

/* ------------------------------------------------------------------ */
/* Tonnage availability                                                */
/* ------------------------------------------------------------------ */

const TON_STEPS = [1, 1.5, 2, 2.5, 3, 3.5, 4, 5];

export function TonnageAvailabilityChart({ products, height = 300 }: { products: Product[]; height?: number }) {
  const withTons = products.filter((p) => p.tonnages && p.tonnages.length);
  if (!withTons.length) {
    return <EmptyState label="No selected product lists tonnage options in the imported sources — model-level information only." height={height} />;
  }
  const colors = buildColorMap(products);

  return (
    <div className="overflow-x-auto scroll-shadow">
      <table className="w-full min-w-[520px] border-separate border-spacing-y-1.5">
        <caption className="sr-only">Tonnage availability by product</caption>
        <thead>
          <tr>
            <th scope="col" className="w-44 pb-2 text-left text-sm font-semibold text-navy-500">
              Product
            </th>
            {TON_STEPS.map((t) => (
              <th key={t} scope="col" className="pb-2 text-center text-sm font-semibold text-navy-500">
                {t}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {withTons.map((p) => (
            <tr key={p.id}>
              <th scope="row" className="pr-3 text-left text-sm font-medium text-navy-800">
                <span className={p.isDaikin ? "font-semibold text-navy-900" : ""}>
                  {p.brand} {p.model}
                  {p.isDaikin && " ★"}
                </span>
              </th>
              {TON_STEPS.map((t) => {
                const has = p.tonnages?.includes(t);
                return (
                  <td key={t} className="px-1 text-center">
                    <span
                      className="mx-auto flex h-8 w-full min-w-[2rem] items-center justify-center rounded-md text-sm font-bold"
                      style={
                        has
                          ? { backgroundColor: colors[p.id], color: "#fff" }
                          : { backgroundColor: "#f2f6fa", color: "#9db8d8" }
                      }
                      aria-label={has ? `${t} ton available` : `${t} ton not listed`}
                    >
                      {has ? "✓" : "–"}
                    </span>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Fit score                                                           */
/* ------------------------------------------------------------------ */

export function FitScoreChart({ products, height = 300 }: { products: Product[]; height?: number }) {
  const colors = buildColorMap(products);
  const keys = ["seer2", "hspf2", "cop_5f", "warranty", "sound_level", "cap_5f"];

  const rows = products.map((p) => {
    const parts: number[] = [];
    for (const key of keys) {
      const values = products
        .map((q) => q.attributes[key])
        .filter((v) => v?.status === "verified" && v.numeric !== null)
        .map((v) => v.numeric as number);
      if (values.length < 2) continue;
      const v = p.attributes[key];
      if (v?.status !== "verified" || v.numeric === null) continue;
      const min = Math.min(...values);
      const max = Math.max(...values);
      const span = max - min || 1;
      const normalized = ((v.numeric - min) / span) * 100;
      parts.push(key === "sound_level" ? 100 - normalized : normalized);
    }
    return {
      id: p.id,
      name: shortLabel(p),
      brand: p.brand,
      score: parts.length ? Math.round(parts.reduce((a, b) => a + b, 0) / parts.length) : null,
      basis: parts.length,
    };
  });

  const scored = rows.filter((r) => r.score !== null) as (Omit<(typeof rows)[number], "score"> & { score: number })[];
  if (scored.length < 2) {
    return <EmptyState label="A fit score needs at least two products with overlapping verified metrics." height={height} />;
  }

  return (
    <div style={{ width: "100%", height: Math.max(height, scored.length * 42 + 60) }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={scored} layout="vertical" margin={{ top: 8, right: 76, bottom: 8, left: 8 }} barCategoryGap="26%">
          <CartesianGrid horizontal={false} stroke={GRID_COLOR} />
          <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 13, fill: AXIS_COLOR }} axisLine={{ stroke: GRID_COLOR }} tickLine={false} />
          <YAxis type="category" dataKey="name" width={132} tick={{ fontSize: 13, fill: AXIS_COLOR, fontWeight: 500 }} axisLine={false} tickLine={false} />
          <Tooltip
            cursor={{ fill: "rgba(0,151,224,0.06)" }}
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const d = payload[0].payload as (typeof scored)[number];
              return (
                <div className="max-w-xs rounded-xl border border-edge bg-white p-3.5 shadow-pop">
                  <p className="text-sm font-semibold text-navy-900">{d.brand} {d.name.replace(" ★", "")}</p>
                  <p className="mt-1 text-lg font-bold text-navy-900">{d.score} / 100</p>
                  <p className="mt-1 text-xs leading-relaxed text-navy-400">
                    Averaged across {d.basis} verified metrics shared by this selection. This is a calculated
                    comparison, not a manufacturer rating.
                  </p>
                </div>
              );
            }}
          />
          <Bar dataKey="score" radius={[0, 8, 8, 0]} isAnimationActive={false} label={{ position: "right", style: { fontSize: 14, fontWeight: 700, fill: AXIS_COLOR } }}>
            {scored.map((d) => (
              <Cell key={d.id} fill={gradFill(colors[d.id], "h")} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Feature availability matrix                                         */
/* ------------------------------------------------------------------ */

export function FeatureMatrix({
  products,
  attributeKeys,
  labels,
}: {
  products: Product[];
  attributeKeys: string[];
  labels: Record<string, string>;
}) {
  return (
    <div className="overflow-x-auto scroll-shadow print-scroll-reset">
      <table className="w-full min-w-[640px] border-separate border-spacing-0">
        <caption className="sr-only">Feature availability across selected products</caption>
        <thead>
          <tr>
            <th scope="col" className="sticky left-0 z-10 border-b border-edge bg-white pb-3 pr-4 text-left text-sm font-semibold text-navy-500">
              Feature
            </th>
            {products.map((p) => (
              <th key={p.id} scope="col" className="border-b border-edge px-2 pb-3 text-center text-sm font-semibold text-navy-700">
                <span className={p.isDaikin ? "text-daikin-800" : ""}>
                  {p.model}
                  {p.isDaikin && <span aria-label="Daikin"> ★</span>}
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {attributeKeys.map((key) => (
            <tr key={key} className="even:bg-navy-50/40">
              <th scope="row" className="sticky left-0 z-10 bg-inherit py-2.5 pr-4 text-left text-sm font-medium text-navy-800">
                {labels[key] ?? key}
              </th>
              {products.map((p) => {
                const v = p.attributes[key];
                const verified = v?.status === "verified";
                const yes = verified && v.boolean === true;
                const no = verified && v.boolean === false;
                const other = verified && v.boolean === null;
                return (
                  <td key={p.id} className="px-2 py-2.5 text-center">
                    {yes && (
                      <span className="inline-flex min-w-[3.25rem] items-center justify-center gap-1 rounded-md bg-verified-50 px-2 py-1 text-sm font-bold text-verified-700 ring-1 ring-inset ring-verified-500/25">
                        ✓ Yes
                      </span>
                    )}
                    {no && (
                      <span className="inline-flex min-w-[3.25rem] items-center justify-center gap-1 rounded-md bg-navy-100 px-2 py-1 text-sm font-semibold text-navy-500">
                        ✕ No
                      </span>
                    )}
                    {other && (
                      <span className="inline-flex min-w-[3.25rem] items-center justify-center rounded-md bg-daikin-50 px-2 py-1 text-sm font-semibold text-daikin-800">
                        {v.display}
                      </span>
                    )}
                    {!verified && (
                      <span className="inline-flex min-w-[3.25rem] items-center justify-center rounded-md bg-caution-50 px-2 py-1 text-xs font-semibold text-caution-700 ring-1 ring-inset ring-caution-500/25">
                        Unavailable
                      </span>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Simple trend line (used by the reviews workspace)                   */
/* ------------------------------------------------------------------ */

export function TrendLineChart({
  data,
  series,
  height = 280,
  xKey = "label",
}: {
  data: Record<string, string | number>[];
  series: { key: string; name: string; color: string }[];
  height?: number;
  xKey?: string;
}) {
  if (!data.length) return <EmptyState label="No records yet — add one to build the trend." height={height} />;
  return (
    <div style={{ width: "100%", height }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 12, right: 16, bottom: 8, left: 4 }}>
          <CartesianGrid vertical={false} stroke={GRID_COLOR} />
          <XAxis dataKey={xKey} tick={{ fontSize: 13, fill: AXIS_COLOR }} axisLine={{ stroke: GRID_COLOR }} tickLine={false} />
          <YAxis allowDecimals={false} tick={{ fontSize: 13, fill: AXIS_COLOR }} axisLine={false} tickLine={false} />
          <Tooltip
            content={({ active, payload, label }) => {
              if (!active || !payload?.length) return null;
              return (
                <div className="rounded-xl border border-edge bg-white p-3.5 shadow-pop">
                  <p className="text-sm font-bold text-navy-900">{label}</p>
                  <ul className="mt-1.5 space-y-1">
                    {payload.map((e) => (
                      <li key={String(e.dataKey)} className="flex items-center gap-2 text-sm">
                        <span className="size-2.5 rounded-sm" style={{ backgroundColor: e.color }} />
                        <span className="text-navy-700">{e.name}</span>
                        <span className="ml-auto font-semibold text-navy-900">{formatNumber(Number(e.value))}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            }}
          />
          <Legend wrapperStyle={{ paddingTop: 8 }} />
          {series.map((s) => (
            <Line
              key={s.key}
              type="monotone"
              dataKey={s.key}
              name={s.name}
              stroke={s.color}
              strokeWidth={3}
              dot={{ r: 4, strokeWidth: 2, fill: "#fff" }}
              isAnimationActive={false}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export function CountBarChart({
  data,
  height = 280,
  color = DAIKIN_FILL,
  valueLabel = "Count",
}: {
  data: { name: string; value: number; color?: string }[];
  height?: number;
  color?: string;
  valueLabel?: string;
}) {
  if (!data.length || !data.some((d) => d.value > 0)) {
    return <EmptyState label="No records yet — add one to populate this chart." height={height} />;
  }
  return (
    <div style={{ width: "100%", height: Math.max(height, data.length * 40 + 60) }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ top: 8, right: 60, bottom: 8, left: 8 }} barCategoryGap="26%">
          <CartesianGrid horizontal={false} stroke={GRID_COLOR} />
          <XAxis type="number" allowDecimals={false} tick={{ fontSize: 13, fill: AXIS_COLOR }} axisLine={{ stroke: GRID_COLOR }} tickLine={false} />
          <YAxis type="category" dataKey="name" width={150} tick={{ fontSize: 13, fill: AXIS_COLOR, fontWeight: 500 }} axisLine={false} tickLine={false} />
          <Tooltip
            cursor={{ fill: "rgba(0,151,224,0.06)" }}
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const d = payload[0].payload as { name: string; value: number };
              return (
                <div className="rounded-xl border border-edge bg-white p-3.5 shadow-pop">
                  <p className="text-sm font-semibold text-navy-900">{d.name}</p>
                  <p className="mt-1 text-lg font-bold text-navy-900">
                    {d.value} <span className="text-sm font-medium text-navy-500">{valueLabel}</span>
                  </p>
                </div>
              );
            }}
          />
          <Bar dataKey="value" radius={[0, 8, 8, 0]} isAnimationActive={false} label={{ position: "right", style: { fontSize: 14, fontWeight: 700, fill: AXIS_COLOR } }}>
            {data.map((d, i) => (
              <Cell key={i} fill={gradFill(d.color ?? color, "h")} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export { ATTRIBUTE_KEYS_BY_EQUIPMENT };
