import * as React from "react";
import { ChartCard } from "@/components/charts/ChartCard";
import { AttributeBarChart, ChartLegend, buildBarData } from "@/components/charts/AttributeBarChart";
import {
  CapabilityRadar,
  CapacityAvailabilityChart,
  DataCompletenessChart,
  DonutChart,
  FeatureMatrix,
  FitScoreChart,
  OperatingRangeChart,
  RefrigerantComparisonTable,
  TonnageAvailabilityChart,
} from "@/components/charts/SpecialCharts";
import { ATTRIBUTE_BY_KEY, SOURCE_DOCUMENTS } from "@/data/catalog";
import type { Product } from "@/data/types";
import type { ComparisonResult } from "./engine";
import { DAIKIN_FILL, DAIKIN_FILL_ALT, DAIKIN_LIGHT } from "@/components/charts/palette";
import { UNAVAILABLE } from "@/lib/utils";

const SOURCE_LABELS = SOURCE_DOCUMENTS.map((d) => `${d.fileName} — ${d.scope}`);

function missingNote(products: Product[], attributeKey: string): string | null {
  const { missing } = buildBarData(products, attributeKey);
  if (!missing.length) return null;
  return `${missing.map((p) => p.displayName).join(", ")} — ${UNAVAILABLE} for this attribute, so ${missing.length === 1 ? "it is" : "they are"} not plotted. A blank source cell is never read as a zero or a “No”.`;
}

function sourcesFor(products: Product[], attributeKey: string): string[] {
  const first = products.find((p) => p.attributes[attributeKey]?.status === "verified");
  const doc = first?.attributes[attributeKey]?.source.documentId;
  const match = SOURCE_DOCUMENTS.find((d) => d.id === doc);
  return match ? [`${match.fileName} — ${match.title}`] : SOURCE_LABELS;
}

interface ModuleConfig {
  id: string;
  attributeKey: string;
  title: string;
  subtitle: string;
  meaning: (products: Product[]) => React.ReactNode;
}

const MEASURE_MODULES: ModuleConfig[] = [
  {
    id: "seer2",
    attributeKey: "seer2",
    title: "SEER2 efficiency comparison",
    subtitle: "Seasonal cooling efficiency as recorded in the battlecard",
    meaning: () => (
      <>
        SEER2 is roughly how much cooling you get for each unit of electricity across a whole summer. A
        higher number means the same comfort for a smaller bill. Moving from 17 to 21 is a meaningful
        step, not a rounding difference — but the installed quality of the system matters just as much as
        the number on the box.
      </>
    ),
  },
  {
    id: "eer2",
    attributeKey: "eer2",
    title: "EER2 efficiency comparison",
    subtitle: "Cooling efficiency at a single hot design condition",
    meaning: () => (
      <>
        Where SEER2 averages a whole season, EER2 looks at one hot day. It answers a different question:
        how hard does this system work when the weather is at its worst? For a homeowner in a hot,
        long-summer climate, this is often the number that shows up on the bill.
      </>
    ),
  },
  {
    id: "hspf2",
    attributeKey: "hspf2",
    title: "HSPF2 heating efficiency comparison",
    subtitle: "Seasonal heating efficiency as recorded in the battlecard",
    meaning: () => (
      <>
        HSPF2 is the heating equivalent of SEER2 — heat delivered per unit of electricity across a heating
        season. Read it alongside cold-weather capacity: a strong seasonal average still leaves questions
        about what happens on the coldest morning of the year.
      </>
    ),
  },
  {
    id: "cop_5f",
    attributeKey: "cop_5f",
    title: "COP at 5°F comparison",
    subtitle: "Coefficient of performance at 5°F outdoor temperature",
    meaning: () => (
      <>
        A COP of 2.0 means the system moves two units of heat into the house for every one unit of
        electricity it draws — at 5°F outside. Anything above 1.0 beats electric resistance heat. This is
        the single clearest answer to “does a heat pump actually work in the cold?”
      </>
    ),
  },
  {
    id: "sound",
    attributeKey: "sound_level",
    title: "Sound performance comparison",
    subtitle: "Outdoor unit sound level in dBA",
    meaning: () => (
      <>
        Decibels are logarithmic, so the gaps are bigger than they look: a 10 dBA reduction is heard as
        roughly half as loud. Around 45 dBA is a quiet room; around 60 dBA is normal conversation. If the
        unit sits under a bedroom window or beside a patio, this is often the specification the homeowner
        cares about most. The source notes that quiet-mode ratings are not included.
      </>
    ),
  },
  {
    id: "warranty",
    attributeKey: "warranty",
    title: "Warranty coverage comparison",
    subtitle: "Parts term in years; remedy type differs by manufacturer",
    meaning: () => (
      <>
        The bar shows the parts term in years, but the term is only half the story. Ask what the remedy
        is: a compressor warranty pays for a compressor, while a replacement warranty replaces the unit.
        Hover any bar to see the exact wording recorded in the source.
      </>
    ),
  },
  {
    id: "cap_5f",
    attributeKey: "cap_5f",
    title: "Maximum capacity at 5°F",
    subtitle: "Heating output in BTU/h at 5°F outdoor temperature",
    meaning: () => (
      <>
        This is how much heat the system can still push into the house on a genuinely cold day. When this
        number falls short of what the house needs, the difference is made up by backup electric heat —
        which is where winter bills spike. Higher here means less backup heat.
      </>
    ),
  },
  {
    id: "cap_115f",
    attributeKey: "cap_115f",
    title: "Maximum capacity at 115°F",
    subtitle: "Cooling output in BTU/h at 115°F outdoor temperature",
    meaning: () => (
      <>
        Extreme-heat performance. Many manufacturers do not publish a figure at this condition at all, and
        a missing value here means exactly that — not a zero. Where the number exists, it tells you whether
        the system holds up in a heat wave rather than giving up at the worst moment.
      </>
    ),
  },
];

export function ComparisonCharts({
  products,
  result,
}: {
  products: Product[];
  result: ComparisonResult;
}) {
  const hasDucted = products.some((p) => p.equipmentType === "ducted_split_hp");
  const hasHydronic = products.some((p) => p.equipmentType === "air_to_water_hp");

  const modelsByRefrigerant = React.useMemo(() => {
    const map: Record<string, string[]> = {};
    for (const p of products) {
      const v = p.attributes.refrigerant;
      if (v?.status !== "verified") continue;
      (map[v.display] ??= []).push(p.model);
    }
    return map;
  }, [products]);

  const refrigerantSlices = React.useMemo(() => {
    const palette = [DAIKIN_FILL, "#94a3b8", "#64748b", "#cbd5e1"];
    const unknownCount = products.filter((p) => p.attributes.refrigerant?.status !== "verified").length;
    const slices = Object.entries(modelsByRefrigerant).map(([name, models], i) => ({
      name,
      value: models.length,
      color: palette[i % palette.length],
      note: `Model${models.length === 1 ? "" : "s"}: ${models.join(", ")}`,
    }));
    if (unknownCount) {
      slices.push({ name: UNAVAILABLE, value: unknownCount, color: "#e2e8f0", note: "Source cell blank." });
    }
    return slices;
  }, [products, modelsByRefrigerant]);

  const edgeSlices = React.useMemo(() => {
    const byGroup = new Map<string, number>();
    for (const e of result.edges) {
      const group = ATTRIBUTE_BY_KEY[e.attributeKey]?.group ?? "Other";
      byGroup.set(group, (byGroup.get(group) ?? 0) + 1);
    }
    const palette = [DAIKIN_FILL, DAIKIN_FILL_ALT, DAIKIN_LIGHT, "#66c4a0", "#8fd0f2", "#0079b5"];
    return Array.from(byGroup.entries()).map(([name, value], i) => ({
      name,
      value,
      color: palette[i % palette.length],
    }));
  }, [result.edges]);

  const featureKeys = [
    "charge_verification",
    "slow_loss_alerting",
    "cloud_alerts",
    "regional_profiles",
    "reusable_profiles",
    "intelligent_defrost",
    "humidity_control",
    "sound_blanket",
    "anticorrosive",
    "energy_star_cchp",
  ];
  const featureLabels = Object.fromEntries(
    featureKeys.map((k) => [k, ATTRIBUTE_BY_KEY[k]?.label ?? k]),
  );

  return (
    <section aria-label="Charts and visual comparison" className="space-y-6">
      <header>
        <h2 className="text-2xl font-bold text-navy-900">Charts and visual evidence</h2>
        <p className="mt-1.5 max-w-4xl text-base text-navy-500">
          Every chart is built from the selected products only, and updates the moment your selection
          changes. Values that the source never recorded are called out rather than plotted as zero.
        </p>
      </header>

      <div className="grid gap-6 xl:grid-cols-2">
        {MEASURE_MODULES.filter((m) => {
          const def = ATTRIBUTE_BY_KEY[m.attributeKey];
          if (!def) return false;
          return def.equipmentType === "ducted_split_hp" ? hasDucted : hasHydronic;
        }).map((mod) => {
          const def = ATTRIBUTE_BY_KEY[mod.attributeKey];
          return (
            <ChartCard
              key={mod.id}
              title={mod.title}
              subtitle={mod.subtitle}
              direction={def.direction === "lower" ? "lower" : def.direction === "higher" ? "higher" : "none"}
              glossaryTerm={def.label}
              glossary={def.plainLanguage}
              meaning={mod.meaning(products)}
              sources={sourcesFor(products, mod.attributeKey)}
              unavailableNote={missingNote(products, mod.attributeKey)}
            >
              <AttributeBarChart products={products} attributeKey={mod.attributeKey} />
            </ChartCard>
          );
        })}

        {hasDucted && (
          <ChartCard
            title="Heating operating range"
            subtitle="Minimum and maximum outdoor temperature permitted in heating mode"
            direction="none"
            glossaryTerm="Heating operating range"
            glossary={ATTRIBUTE_BY_KEY.heating_range?.plainLanguage}
            meaning={
              <>
                Each bar spans the outdoor temperatures the manufacturer allows the system to run in heating
                mode. The left edge is what matters in a cold climate — it is the point at which the heat
                pump stops and something else has to keep the house warm. Where a source records only one
                bound, the tooltip says so rather than inventing the other end.
              </>
            }
            sources={sourcesFor(products, "heating_range")}
            unavailableNote={missingNote(products, "heating_range")}
          >
            <OperatingRangeChart products={products} attributeKey="heating_range" />
            <ChartLegend products={products.filter((p) => p.attributes.heating_range?.status === "verified")} />
          </ChartCard>
        )}

        {hasDucted && (
          <ChartCard
            title="Cooling operating range"
            subtitle="Minimum and maximum outdoor temperature permitted in cooling mode"
            direction="none"
            glossaryTerm="Cooling operating range"
            glossary={ATTRIBUTE_BY_KEY.cooling_range?.plainLanguage}
            meaning={
              <>
                The same idea for summer. A wider band is not automatically better — what matters is
                whether the band covers the weather your territory actually sees. A unit rated to 130°F is
                irrelevant in a climate that never passes 100°F.
              </>
            }
            sources={sourcesFor(products, "cooling_range")}
            unavailableNote={missingNote(products, "cooling_range")}
          >
            <OperatingRangeChart products={products} attributeKey="cooling_range" />
          </ChartCard>
        )}

        {hasDucted && (
          <ChartCard
            title="Installation and diagnostic capabilities"
            subtitle="Commissioning and service features recorded per model"
            direction="higher"
            meaning={
              <>
                These are the features that decide whether the system delivers its rated performance after
                the install crew leaves. Charge verification, leak alerting and cloud diagnostics do not
                appear on an efficiency label, but they are the difference between a system that keeps its
                rating and one that quietly loses it. Amber cells mean the source recorded nothing — not
                that the feature is absent.
              </>
            }
            sources={sourcesFor(products, "charge_verification")}
            unavailableNote={null}
          >
            <FeatureMatrix
              products={products.filter((p) => p.equipmentType === "ducted_split_hp")}
              attributeKeys={featureKeys}
              labels={featureLabels}
            />
          </ChartCard>
        )}

        {hasDucted && (
          <ChartCard
            title="Maximum capacity at 47°F"
            subtitle="Heating output in BTU/h at the standard mild-weather rating point"
            direction="higher"
            glossaryTerm="Capacity at 47°F"
            glossary={ATTRIBUTE_BY_KEY.cap_47f?.plainLanguage}
            meaning={
              <>
                47°F is the standard mild-weather rating point, so this is the closest thing to a
                like-for-like heating output figure across brands. Compare it with the 5°F chart: the gap
                between the two tells you how much output a system gives up as the weather turns.
              </>
            }
            sources={sourcesFor(products, "cap_47f")}
            unavailableNote={missingNote(products, "cap_47f")}
          >
            <AttributeBarChart products={products} attributeKey="cap_47f" />
          </ChartCard>
        )}

        {hasDucted && (
          <ChartCard
            title="Maximum capacity at 95°F"
            subtitle="Cooling output in BTU/h at the standard hot-weather rating point"
            direction="higher"
            glossaryTerm="Capacity at 95°F"
            glossary={ATTRIBUTE_BY_KEY.cap_95f?.plainLanguage}
            meaning={
              <>
                The standard cooling rating point. This is the number a load calculation is usually sized
                against, so it is the fairest single comparison of cooling output between models.
              </>
            }
            sources={sourcesFor(products, "cap_95f")}
            unavailableNote={missingNote(products, "cap_95f")}
          >
            <AttributeBarChart products={products} attributeKey="cap_95f" />
          </ChartCard>
        )}

        <ChartCard
          title="Refrigerant reference"
          subtitle="Refrigerant recorded for each selected product"
          glossaryTerm="Refrigerant"
          glossary={ATTRIBUTE_BY_KEY.refrigerant?.plainLanguage}
          meaning={
            <>
              This shows what the sources record, and nothing more. Refrigerants differ in operating
              pressure, service procedure and global-warming potential, and the imported documents do not
              rank them — so this application does not either. If a refrigerant claim is needed for a bid,
              route it through product marketing.
            </>
          }
          sources={sourcesFor(products, "refrigerant")}
          unavailableNote={null}
        >
          <DonutChart
            slices={refrigerantSlices}
            centerValue={String(products.length)}
            centerLabel="products"
          />
          <div className="mt-5">
            <RefrigerantComparisonTable modelsByRefrigerant={modelsByRefrigerant} />
          </div>
        </ChartCard>

        {/* A2W selections have no Daikin-advantage distribution: the hydronic sheet
            records no qualitative assessment to attribute an edge to. */}
        {!hasHydronic && (
        <ChartCard
          title="Daikin advantage distribution"
          subtitle="Where the verified edges in this selection come from"
          direction="none"
          meaning={
            <>
              A quick read on the shape of the story. If the edges cluster in one area, the pitch is narrow
              and a competitor can neutralise it with a single counter. Edges spread across efficiency,
              comfort, installation and warranty are much harder to argue away.
            </>
          }
          sources={["Calculated from both imported source documents"]}
          unavailableNote={
            result.edges.length === 0
              ? "No verified Daikin edge in the current selection, so there is nothing to distribute."
              : null
          }
        >
          <DonutChart
            slices={edgeSlices}
            centerValue={String(result.edges.length)}
            centerLabel={result.edges.length === 1 ? "verified edge" : "verified edges"}
          />
        </ChartCard>
        )}

        {!hasHydronic && (
        <ChartCard
          title="Competitive profile radar"
          subtitle="Efficiency, quietness, warranty, cold climate, controls and installation"
          direction="higher"
          meaning={
            <>
              Each axis is scored 0–100 relative to the products you selected, not against the whole market.
              It is a shape, not a score — use it to spot where a product is well-rounded versus where it
              is strong on one axis and thin everywhere else. Missing source values pull an axis to zero,
              so read it alongside the data-completeness chart.
            </>
          }
          sources={["Daikin FIT Battlecard.pdf — normalized within the current selection"]}
          unavailableNote={null}
          className="xl:col-span-2"
        >
          <CapabilityRadar products={products} />
        </ChartCard>
        )}

        {/* A2W models are listed by rated capacity, not by tonnage. */}
        {hasHydronic ? (
          <ChartCard
            title="Capacity availability"
            subtitle="Rated capacities each model is listed in"
            direction="higher"
            glossaryTerm="Rated capacity"
            glossary="The nominal capacities the model is sold in, in kBtu/h. More sizes means an installer can match the heat load more precisely instead of rounding up."
            meaning={
              <>
                Air-to-water models are listed by rated capacity rather than tonnage. More sizes means an
                installer can match the heat load more precisely instead of rounding up — oversizing is one
                of the most common causes of a system that short-cycles and wears out early.
              </>
            }
            sources={sourcesFor(products, "heat_cap_a446w95")}
            unavailableNote={
              products.some((p) => p.equipmentType === "air_to_water_hp" && !p.capacities)
                ? `${products
                    .filter((p) => p.equipmentType === "air_to_water_hp" && !p.capacities)
                    .map((p) => p.displayName)
                    .join(", ")} — the source does not break out rated capacities for this model.`
                : null
            }
          >
            <CapacityAvailabilityChart
              products={products.filter((p) => p.equipmentType === "air_to_water_hp")}
            />
          </ChartCard>
        ) : (
        <ChartCard
          title="Tonnage availability"
          subtitle="Unit sizes each model is listed in"
          direction="higher"
          glossaryTerm="Tonnage"
          glossary={ATTRIBUTE_BY_KEY.tonnage_options?.plainLanguage}
          meaning={
            <>
              More sizes means an installer can match the house more precisely instead of rounding up.
              Oversizing is one of the most common causes of a system that short-cycles, controls humidity
              poorly and wears out early — so this row matters more than it looks.
            </>
          }
          sources={sourcesFor(products, "tonnage_options")}
          unavailableNote={
            products.some((p) => !p.tonnages)
              ? `${products.filter((p) => !p.tonnages).map((p) => p.displayName).join(", ")} — model-level information only; the source does not break out unit sizes.`
              : null
          }
        >
          <TonnageAvailabilityChart products={products} />
        </ChartCard>
        )}

        <ChartCard
          title="Data completeness"
          subtitle="Share of attributes carrying a verified source value"
          direction="higher"
          meaning={
            <>
              How much of each product's specification the imported documents actually record. A low bar is
              not a weak product — it is a thin evidence base. Lead with the products at the top of this
              chart when the claim has to survive scrutiny, and treat the rest as needing validation.
            </>
          }
          sources={SOURCE_LABELS}
          unavailableNote={null}
        >
          <DataCompletenessChart products={products} />
        </ChartCard>

        {/* The fit score composites ducted-split metrics (SEER2, HSPF2, warranty) that
            the hydronic sheet does not record, so it is not shown for A2W selections. */}
        {!hasHydronic && (
        <ChartCard
          title="Selected-product fit score"
          subtitle="Composite of the verified metrics this selection shares"
          direction="higher"
          meaning={
            <>
              A single calculated number averaging efficiency, heating, warranty, sound and cold-weather
              capacity, normalized across the products you chose. This is a comparison aid produced by this
              application — it is not a manufacturer rating and should never be quoted as one.
            </>
          }
          sources={["Calculated from verified values in the current selection"]}
          unavailableNote={null}
        >
          <FitScoreChart products={products} />
        </ChartCard>
        )}

        {hasHydronic && (
          <>
            <ChartCard
              title="Maximum leaving water temperature"
              subtitle="Hottest water the unit can deliver, in °F"
              direction="higher"
              glossaryTerm="Leaving water temperature"
              glossary={ATTRIBUTE_BY_KEY.max_lwt?.plainLanguage}
              meaning={
                <>
                  In a hydronic system this decides what you can keep. High-temperature radiators need hot
                  water; if the heat pump cannot reach it, the emitters have to be replaced too. A higher
                  figure means a simpler, cheaper retrofit.
                </>
              }
              sources={sourcesFor(products, "max_lwt")}
              unavailableNote={missingNote(products, "max_lwt")}
            >
              <AttributeBarChart products={products} attributeKey="max_lwt" />
            </ChartCard>

            <ChartCard
              title="Minimum leaving water temperature"
              subtitle="Coolest water the unit is rated to leave with, in °F"
              direction="lower"
              glossaryTerm="Minimum leaving water temperature"
              glossary={ATTRIBUTE_BY_KEY.min_lwt?.plainLanguage}
              meaning={
                <>
                  The bottom of the leaving-water band recorded in the sheet. Together with the maximum it
                  defines how much of the heating and cooling range one machine can cover before a second
                  heat source or a buffer strategy is needed.
                </>
              }
              sources={sourcesFor(products, "min_lwt")}
              unavailableNote={missingNote(products, "min_lwt")}
            >
              <AttributeBarChart products={products} attributeKey="min_lwt" />
            </ChartCard>

            <ChartCard
              title="Outdoor ambient operating range — heating"
              subtitle="Outdoor air temperatures permitted in heating mode, in °F"
              direction="none"
              glossaryTerm="Outdoor ambient operating range"
              glossary={ATTRIBUTE_BY_KEY.heating_ambient_range?.plainLanguage}
              meaning={
                <>
                  Each bar spans the outdoor air temperatures the manufacturer allows in heating. The left
                  edge is what matters in a cold climate — it is the point at which the heat pump stops and
                  something else has to keep the house warm.
                </>
              }
              sources={sourcesFor(products, "heating_ambient_range")}
              unavailableNote={missingNote(products, "heating_ambient_range")}
            >
              <OperatingRangeChart products={products} attributeKey="heating_ambient_range" />
              <ChartLegend
                products={products.filter(
                  (p) => p.attributes.heating_ambient_range?.status === "verified",
                )}
              />
            </ChartCard>

            <ChartCard
              title="Outdoor ambient operating range — cooling"
              subtitle="Outdoor air temperatures permitted in cooling mode, in °F"
              direction="none"
              glossaryTerm="Outdoor ambient operating range"
              glossary={ATTRIBUTE_BY_KEY.cooling_ambient_range?.plainLanguage}
              meaning={
                <>
                  The same envelope for cooling. A wider band is not automatically better — what matters is
                  whether it covers the weather the territory actually sees.
                </>
              }
              sources={sourcesFor(products, "cooling_ambient_range")}
              unavailableNote={missingNote(products, "cooling_ambient_range")}
            >
              <OperatingRangeChart products={products} attributeKey="cooling_ambient_range" />
            </ChartCard>

            <ChartCard
              title="Heating capacity at 44.6°F / 158°F LWT"
              subtitle="Peak heating output in Btu/h while producing 158°F water at 44.6°F outdoor air"
              direction="higher"
              glossaryTerm="Heating capacity"
              glossary={ATTRIBUTE_BY_KEY.heat_cap_a446w158?.plainLanguage}
              meaning={
                <>
                  Peak heat output measured at a demanding water temperature. Read it next to the
                  cold-weather figure recorded in the same sheet: the smaller the drop between them, the
                  less the system leans on a backup boiler when it gets cold.
                </>
              }
              sources={sourcesFor(products, "heat_cap_a446w158")}
              unavailableNote={missingNote(products, "heat_cap_a446w158")}
            >
              <AttributeBarChart products={products} attributeKey="heat_cap_a446w158" />
            </ChartCard>

            {/* The W158°F condition is blank for some models in the source sheet, so the
                W95°F condition is charted alongside it — every model records that one. */}
            <ChartCard
              title="Heating capacity at 44.6°F / 95°F LWT"
              subtitle="Heating output in Btu/h while producing 95°F water at 44.6°F outdoor air"
              direction="higher"
              glossaryTerm="Heating capacity"
              glossary={ATTRIBUTE_BY_KEY.heat_cap_a446w95?.plainLanguage}
              meaning={
                <>
                  The same measurement at the low water temperature underfloor heating typically runs at.
                  Every model in the sheet records this condition, so it is the most complete
                  like-for-like heating comparison available here.
                </>
              }
              sources={sourcesFor(products, "heat_cap_a446w95")}
              unavailableNote={missingNote(products, "heat_cap_a446w95")}
            >
              <AttributeBarChart products={products} attributeKey="heat_cap_a446w95" />
            </ChartCard>

            <ChartCard
              title="COP at 5°F / 95°F LWT"
              subtitle="Coefficient of performance at 5°F outdoor air producing 95°F water"
              direction="higher"
              glossaryTerm="COP"
              glossary={ATTRIBUTE_BY_KEY.cop_a5w95?.plainLanguage}
              meaning={
                <>
                  Cold-weather efficiency: how much heat the system moves per unit of electricity when it
                  is 5°F outside. Recorded for every model in the sheet, so it is directly comparable
                  across all three brands.
                </>
              }
              sources={sourcesFor(products, "cop_a5w95")}
              unavailableNote={missingNote(products, "cop_a5w95")}
            >
              <AttributeBarChart products={products} attributeKey="cop_a5w95" />
            </ChartCard>
          </>
        )}
      </div>
    </section>
  );
}
