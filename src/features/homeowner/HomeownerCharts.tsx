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
import {
  Droplets,
  Cloud,
  Smartphone,
  Gauge,
  ShieldCheck,
  Volume2,
  Snowflake,
  Check,
  Minus,
  HelpCircle,
} from "lucide-react";
import { cn, formatNumber } from "@/lib/utils";
import { AXIS_COLOR, GRID_COLOR, buildColorMap } from "@/components/charts/palette";
import type { Product } from "@/data/types";
import { ATTRIBUTE_BY_KEY } from "@/data/catalog";
import { BENEFIT_TRANSLATION } from "./homeownerEngine";
import { AiTag } from "@/components/common/AiTag";

/** A homeowner chart: big type, one idea, plain-language guidance, no acronyms
 *  outside the expandable details. */
export function HomeownerChartCard({
  title,
  guidance,
  detailsLabel,
  details,
  children,
  className,
}: {
  title: string;
  guidance: string;
  detailsLabel?: string;
  details?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("rounded-3xl border border-edge bg-white p-6 shadow-card sm:p-8", className)}>
      <h3 className="flex items-center gap-2 text-xl font-bold text-navy-900 sm:text-2xl">
        {title}
      </h3>
      <p className="mt-2 max-w-3xl text-[1.0625rem] leading-relaxed text-navy-600">
        {guidance} <AiTag kind="generated" className="align-middle" />
      </p>
      <div className="mt-6">{children}</div>
      {details && (
        <details className="mt-5 rounded-xl bg-navy-50/70 px-4 py-3">
          <summary className="cursor-pointer text-sm font-semibold text-daikin-700 hover:text-daikin-800">
            {detailsLabel ?? "What the technical rating means"}
          </summary>
          <div className="mt-2 text-sm leading-relaxed text-navy-600">{details}</div>
        </details>
      )}
    </section>
  );
}

interface SimpleDatum {
  id: string;
  name: string;
  brand: string;
  value: number;
  label: string;
  raw: string;
  isDaikin: boolean;
}

function buildData(products: Product[], attributeKey: string, format: (v: number, raw: string) => string) {
  const out: SimpleDatum[] = [];
  const missing: Product[] = [];
  for (const p of products) {
    const v = p.attributes[attributeKey];
    if (v?.status === "verified" && v.numeric !== null) {
      out.push({
        id: p.id,
        name: p.model,
        brand: p.brand,
        value: v.numeric,
        label: format(v.numeric, v.display),
        raw: v.display,
        isDaikin: p.isDaikin,
      });
    } else {
      missing.push(p);
    }
  }
  return { data: out, missing };
}

function SimpleBars({
  data,
  products,
  domainMax,
  ariaLabel,
}: {
  data: SimpleDatum[];
  products: Product[];
  domainMax?: number;
  ariaLabel: string;
}) {
  const colors = buildColorMap(products);
  const max = domainMax ?? Math.max(...data.map((d) => d.value)) * 1.2;

  return (
    <div style={{ width: "100%", height: Math.max(200, data.length * 62 + 40) }} aria-label={ariaLabel}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ top: 4, right: 118, bottom: 4, left: 4 }} barCategoryGap="30%">
          <CartesianGrid horizontal={false} stroke={GRID_COLOR} />
          <XAxis type="number" domain={[0, max]} hide />
          <YAxis
            type="category"
            dataKey="name"
            width={150}
            tick={{ fontSize: 15, fill: AXIS_COLOR, fontWeight: 600 }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            cursor={{ fill: "rgba(0,151,224,0.06)" }}
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const d = payload[0].payload as SimpleDatum;
              return (
                <div className="rounded-xl border border-edge bg-white p-3.5 shadow-pop">
                  <p className="text-sm font-semibold text-navy-900">
                    {d.brand} {d.name}
                  </p>
                  <p className="mt-1 text-lg font-bold text-navy-900">{d.raw}</p>
                </div>
              );
            }}
          />
          <Bar dataKey="value" radius={[0, 12, 12, 0]} isAnimationActive={false} barSize={34}>
            {data.map((d) => (
              <Cell key={d.id} fill={colors[d.id]} />
            ))}
            <LabelList
              dataKey="label"
              position="right"
              style={{ fontSize: 17, fontWeight: 800, fill: AXIS_COLOR }}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function MissingNote({ missing }: { missing: Product[] }) {
  if (!missing.length) return null;
  return (
    <p className="mt-4 rounded-xl bg-navy-50 px-4 py-3 text-[0.9375rem] text-navy-600">
      This information is not published for {missing.map((p) => `${p.brand} ${p.model}`).join(", ")}, so
      those units are not shown on this chart. A missing figure is not a low figure.
    </p>
  );
}

/* ------------------------------------------------------------------ */

export function SoundChart({ products }: { products: Product[] }) {
  const { data, missing } = buildData(products, "sound_level", (v) => `${formatNumber(v)} dBA`);
  if (!data.length) return null;

  return (
    <HomeownerChartCard
      title="How loud is the outdoor unit?"
      guidance="Lower published sound levels indicate quieter operation. For reference, a quiet library sits around 40 dBA and a normal conversation around 60."
      detailsLabel="How sound levels are measured"
      details={
        <>
          Sound is measured in A-weighted decibels (dBA) on a logarithmic scale, so a 10 dBA reduction is
          heard as roughly half as loud. The published figures here do not include quiet-mode ratings, and
          the source does not record the measurement distance or condition. Actual perceived noise depends
          on where the unit is placed, what surrounds it and how it was installed.
        </>
      }
    >
      <SimpleBars data={data} products={products} ariaLabel="Published sound levels in decibels" />
      <MissingNote missing={missing} />
    </HomeownerChartCard>
  );
}

export function EfficiencyChart({ products }: { products: Product[] }) {
  const seer = buildData(products, "seer2", (v) => formatNumber(v));
  if (seer.data.length < 1) return null;

  return (
    <HomeownerChartCard
      title="How efficiently does it cool?"
      guidance="Higher efficiency ratings may indicate lower energy use under standardised test conditions. Real bills also depend on your home, your climate, how the system is sized and how it is installed."
      detailsLabel="What SEER2 and HSPF2 mean"
      details={
        <>
          <p>
            <strong>SEER2</strong> is a seasonal cooling efficiency rating — roughly how much cooling you get
            across a summer for each unit of electricity. <strong>EER2</strong> measures the same thing at a
            single hot design condition rather than across a season. <strong>HSPF2</strong> is the heating
            equivalent of SEER2.
          </p>
          <p className="mt-2">
            These are laboratory ratings measured under standardised conditions. They are useful for
            comparing products on a like-for-like basis, but they are not a prediction of your utility bill.
          </p>
        </>
      }
    >
      <SimpleBars data={seer.data} products={products} ariaLabel="Seasonal cooling efficiency rating" />
      <MissingNote missing={seer.missing} />
    </HomeownerChartCard>
  );
}

export function WarrantyChart({ products }: { products: Product[] }) {
  const rows = products
    .map((p) => {
      const v = p.attributes.warranty;
      if (v?.status !== "verified") return null;
      const raw = v.display;
      const parts = v.numeric;
      const second = v.numericSecondary;
      const isReplacement = /repl/i.test(raw);
      return { product: p, raw, parts, second, isReplacement };
    })
    .filter(Boolean) as {
    product: Product;
    raw: string;
    parts: number | null;
    second: number | null;
    isReplacement: boolean;
  }[];

  if (!rows.length) return null;
  const missing = products.filter((p) => p.attributes.warranty?.status !== "verified");

  return (
    <HomeownerChartCard
      title="What is covered, and for how long?"
      guidance="The length of cover is only half the story — what matters just as much is the remedy. A compressor warranty pays for a compressor; a replacement warranty replaces the unit."
      detailsLabel="Important warranty conditions"
      details={
        <>
          Eligibility may depend on registration, installation, location, and applicable warranty terms.
          Confirm the current warranty documentation for the exact model and unit before purchase — the
          figures shown here come from the comparison source and may not reflect promotional or regional
          terms.
        </>
      }
    >
      <ul className="space-y-3">
        {rows.map((r) => (
          <li
            key={r.product.id}
            className={cn(
              "flex flex-wrap items-center gap-4 rounded-2xl border p-4",
              r.product.isDaikin ? "border-daikin-200 bg-daikin-50/50" : "border-edge bg-white",
            )}
          >
            <span className="min-w-[9rem] flex-1">
              <span className="block text-sm text-navy-500">{r.product.brand}</span>
              <span className="block text-lg font-bold text-navy-900">{r.product.model}</span>
            </span>
            <span className="flex flex-wrap gap-2">
              <span className="rounded-xl bg-white px-3.5 py-2 text-center shadow-sm ring-1 ring-inset ring-edge">
                <span className="block text-xs font-semibold text-navy-500">Parts</span>
                <span className="block text-xl font-bold text-navy-900">
                  {r.parts !== null ? `${r.parts} yr` : "—"}
                </span>
              </span>
              <span className="rounded-xl bg-white px-3.5 py-2 text-center shadow-sm ring-1 ring-inset ring-edge">
                <span className="block text-xs font-semibold text-navy-500">
                  {r.isReplacement ? "Replacement" : "Compressor"}
                </span>
                <span className="block text-xl font-bold text-navy-900">
                  {r.second !== null ? `${r.second} yr` : "—"}
                </span>
              </span>
            </span>
            <span className="w-full text-sm text-navy-500 sm:w-auto">{r.raw}</span>
          </li>
        ))}
      </ul>
      <MissingNote missing={missing} />
      <p className="mt-4 text-[0.9375rem] leading-relaxed text-navy-600">
        {BENEFIT_TRANSLATION.warranty}
      </p>
    </HomeownerChartCard>
  );
}

export function OperatingRangeChart({ products }: { products: Product[] }) {
  const rows = products
    .map((p) => {
      const v = p.attributes.heating_range;
      if (v?.status !== "verified" || v.numeric === null) return null;
      return { product: p, min: v.numeric, max: v.numericSecondary, raw: v.display };
    })
    .filter(Boolean) as { product: Product; min: number; max: number | null; raw: string }[];

  if (!rows.length) return null;
  const colors = buildColorMap(products);
  const lo = Math.min(...rows.map((r) => r.min));

  return (
    <HomeownerChartCard
      title="Will it still heat when it gets cold?"
      guidance="Each bar shows the outdoor temperature range the manufacturer allows the system to run in heating mode. The left-hand end is the number that matters in a cold snap — it is the point at which something else has to keep the house warm."
      detailsLabel="What affects cold-weather performance"
      details={
        <>
          Published operating ranges describe what the equipment is rated to do, not how much heat it will
          deliver at every point in that range. Output falls as the outdoor temperature drops. Actual
          performance also depends on system sizing, ductwork, insulation, and how the backup heat is set up.
        </>
      }
    >
      <ul className="space-y-3">
        {rows.map((r) => (
          <li key={r.product.id} className="flex flex-wrap items-center gap-4">
            <span className="min-w-[9rem] flex-1 text-lg font-bold text-navy-900">
              {r.product.model}
              <span className="ml-2 text-sm font-normal text-navy-500">{r.product.brand}</span>
            </span>
            <span className="flex items-center gap-3">
              <span
                className={cn(
                  "rounded-xl px-4 py-2.5 text-center",
                  r.min <= lo ? "bg-daikin-600 text-white" : "bg-navy-100 text-navy-800",
                )}
              >
                <span className="block text-xs font-semibold opacity-80">Heats down to</span>
                <span className="block text-2xl font-bold">{r.min}°F</span>
              </span>
              {r.max !== null && (
                <span className="rounded-xl bg-navy-50 px-4 py-2.5 text-center">
                  <span className="block text-xs font-semibold text-navy-500">Up to</span>
                  <span className="block text-2xl font-bold text-navy-800">{r.max}°F</span>
                </span>
              )}
              <span
                className="hidden h-3 w-32 rounded-full sm:block"
                style={{ backgroundColor: colors[r.product.id] }}
                aria-hidden
              />
            </span>
          </li>
        ))}
      </ul>
    </HomeownerChartCard>
  );
}

/* ------------------------------------------------------------------ */
/* Feature comparison with large icons                                 */
/* ------------------------------------------------------------------ */

const FEATURES: { key: string; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { key: "humidity_control", label: "Humidity control", icon: Droplets },
  { key: "cloud_alerts", label: "Connected diagnostics", icon: Cloud },
  { key: "thermostat_type", label: "Smart thermostat support", icon: Smartphone },
  { key: "slow_loss_alerting", label: "Refrigerant monitoring", icon: Gauge },
  { key: "anticorrosive", label: "Corrosion protection", icon: ShieldCheck },
  { key: "sound_blanket", label: "Quiet-operation features", icon: Volume2 },
  { key: "energy_star_cchp", label: "Cold-climate capability", icon: Snowflake },
];

export function FeatureComparison({ products }: { products: Product[] }) {
  const rows = FEATURES.filter((f) =>
    products.some((p) => p.attributes[f.key]?.status === "verified"),
  );
  if (!rows.length) return null;

  return (
    <HomeownerChartCard
      title="Which features are included?"
      guidance="These are the capabilities the manufacturers publish for each unit. Where a manufacturer does not publish an answer, that is shown as unavailable rather than assumed to be a no."
    >
      <div className="overflow-x-auto scroll-shadow print-scroll-reset">
        <table className="w-full min-w-[560px] border-separate border-spacing-y-2">
          <caption className="sr-only">Feature availability by product</caption>
          <thead>
            <tr>
              <th scope="col" className="w-64 pb-2 text-left text-sm font-semibold text-navy-500">
                Feature
              </th>
              {products.map((p) => (
                <th key={p.id} scope="col" className="px-2 pb-2 text-center">
                  <span className="block text-sm font-bold text-navy-900">{p.model}</span>
                  <span className="block text-xs text-navy-500">{p.brand}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((f) => {
              const Icon = f.icon;
              return (
                <tr key={f.key}>
                  <th scope="row" className="rounded-l-xl bg-navy-50/60 py-3 pl-4 pr-3 text-left">
                    <span className="flex items-center gap-2.5">
                      <Icon className="size-5 shrink-0 text-daikin-600" aria-hidden />
                      <span className="text-[0.9375rem] font-semibold text-navy-800">{f.label}</span>
                    </span>
                  </th>
                  {products.map((p, i) => {
                    const v = p.attributes[f.key];
                    const verified = v?.status === "verified";
                    const yes = verified && (v.boolean === true || (v.boolean === null && v.display.length > 0));
                    const no = verified && v.boolean === false;
                    return (
                      <td
                        key={p.id}
                        className={cn(
                          "bg-navy-50/60 px-2 py-3 text-center",
                          i === products.length - 1 && "rounded-r-xl",
                        )}
                      >
                        {yes ? (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-verified-50 px-3 py-1.5 text-sm font-bold text-verified-700 ring-1 ring-inset ring-verified-500/25">
                            <Check className="size-4" aria-hidden />
                            Included
                          </span>
                        ) : no ? (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-sm font-semibold text-navy-500 ring-1 ring-inset ring-edge">
                            <Minus className="size-4" aria-hidden />
                            Not listed
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-caution-50 px-3 py-1.5 text-xs font-semibold text-caution-700 ring-1 ring-inset ring-caution-500/25">
                            <HelpCircle className="size-4" aria-hidden />
                            Not published
                          </span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </HomeownerChartCard>
  );
}

/* ------------------------------------------------------------------ */
/* Comfort benefits overview                                           */
/* ------------------------------------------------------------------ */

type ComfortAxis = { key: string; label: string; attributeKey: string; invert?: boolean };

const COMFORT_AXES: ComfortAxis[] = [
  { key: "quiet", label: "Quietness", attributeKey: "sound_level", invert: true },
  { key: "humidity", label: "Humidity control", attributeKey: "humidity_control" },
  { key: "consistency", label: "Temperature consistency", attributeKey: "compressor_type" },
  { key: "smart", label: "Smart features", attributeKey: "cloud_alerts" },
  { key: "warranty", label: "Warranty protection", attributeKey: "warranty" },
];

/** Air-to-water axes. The hydronic sheet records no humidity, smart-control or
 *  warranty column, so those axes are replaced with measures it does record. */
const A2W_COMFORT_AXES: ComfortAxis[] = [
  { key: "quiet", label: "Quietness (outdoor)", attributeKey: "outdoor_sound", invert: true },
  { key: "quiet_indoor", label: "Quietness (indoor)", attributeKey: "indoor_sound", invert: true },
  { key: "efficiency", label: "Efficiency (COP)", attributeKey: "cop_a446w95" },
  { key: "cold_heating", label: "Cold-weather heating", attributeKey: "cop_a5w95" },
  { key: "water_temp", label: "Max water temperature", attributeKey: "max_lwt" },
];

export function ComfortBenefitsOverview({ products }: { products: Product[] }) {
  const colors = buildColorMap(products);
  const isAtw =
    products.some((p) => p.equipmentType === "air_to_water_hp") &&
    !products.some((p) => p.equipmentType === "ducted_split_hp");

  const axes = (isAtw ? A2W_COMFORT_AXES : COMFORT_AXES).map((axis) => {
    const values = products.map((p) => {
      const v = p.attributes[axis.attributeKey];
      if (v?.status !== "verified") return { product: p, pct: null as number | null, raw: null as string | null };
      if (v.numeric !== null) return { product: p, pct: v.numeric, raw: v.display };
      if (v.boolean !== null) return { product: p, pct: v.boolean ? 100 : 0, raw: v.display };
      return { product: p, pct: v.display ? 100 : null, raw: v.display };
    });

    const numeric = values.map((v) => v.pct).filter((n): n is number => n !== null);
    if (!numeric.length) return null;
    const min = Math.min(...numeric);
    const max = Math.max(...numeric);
    const span = max - min || 1;

    return {
      axis,
      values: values.map((v) => ({
        ...v,
        normalized:
          v.pct === null ? null : Math.round(((axis.invert ? max - v.pct : v.pct - min) / span) * 100),
      })),
    };
  }).filter(Boolean) as {
    axis: (typeof COMFORT_AXES)[number];
    values: { product: Product; pct: number | null; raw: string | null; normalized: number | null }[];
  }[];

  if (!axes.length) return null;

  return (
    <HomeownerChartCard
      title="Comfort at a glance"
      guidance="A quick side-by-side across the things people notice day to day. Each bar compares only the products in this report — it is a relative picture, not a score out of a hundred."
    >
      <div className="space-y-5">
        {axes.map(({ axis, values }) => (
          <div key={axis.key}>
            <p className="mb-2 text-[0.9375rem] font-semibold text-navy-800">{axis.label}</p>
            <ul className="space-y-1.5">
              {values.map((v) => (
                <li key={v.product.id} className="flex items-center gap-3">
                  <span className="w-36 shrink-0 truncate text-sm text-navy-600">{v.product.model}</span>
                  <span className="h-4 flex-1 overflow-hidden rounded-full bg-navy-100">
                    {v.normalized !== null && (
                      <span
                        className="block h-full rounded-full transition-all"
                        style={{
                          width: `${Math.max(v.normalized, 4)}%`,
                          backgroundColor: colors[v.product.id],
                        }}
                      />
                    )}
                  </span>
                  <span className="w-40 shrink-0 text-right text-sm font-medium text-navy-700">
                    {v.raw ?? "Not published"}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </HomeownerChartCard>
  );
}

export { ATTRIBUTE_BY_KEY };
