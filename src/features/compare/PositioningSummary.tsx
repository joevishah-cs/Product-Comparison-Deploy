import * as React from "react";
import { ShieldCheck, TriangleAlert, CircleSlash, Copy, Check, Layers, ChevronRight } from "lucide-react";
import { copyText } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/toast";
import { InfoTip } from "@/components/ui/tooltip";
import { AiTag } from "@/components/common/AiTag";
import type { ComparisonResult } from "./engine";

/** Attribute groups, each independently collapsible. A2W selections produce ~46
 *  attributes, which is far too much to read as one flat wall of cards. */
function AttributesCompared({ result }: { result: ComparisonResult }) {
  const groups = React.useMemo(
    () =>
      Object.entries(
        result.comparedAttributes.reduce<Record<string, typeof result.comparedAttributes>>(
          (acc, attr) => {
            (acc[attr.group] ??= []).push(attr);
            return acc;
          },
          {},
        ),
      ),
    [result.comparedAttributes],
  );

  // First group open by default; the rest collapsed so the section stays scannable.
  const [open, setOpen] = React.useState<Record<string, boolean>>(() =>
    Object.fromEntries(groups.map(([g], i) => [g, i === 0])),
  );

  // Re-seed when the selection changes the set of groups.
  React.useEffect(() => {
    setOpen((prev) =>
      Object.fromEntries(groups.map(([g], i) => [g, prev[g] ?? i === 0])),
    );
  }, [groups]);

  const allOpen = groups.length > 0 && groups.every(([g]) => open[g]);

  return (
    <div id="attributes-compared" className="scroll-mt-24">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <h3 className="flex items-center gap-2 text-lg font-semibold text-navy-900">
          <Layers className="size-5 text-navy-500" aria-hidden />
          Attributes compared
          <Badge variant="neutral" size="sm">
            {result.attributesCompared}
          </Badge>
        </h3>
        {groups.length > 0 && (
          <button
            type="button"
            onClick={() =>
              setOpen(Object.fromEntries(groups.map(([g]) => [g, !allOpen])))
            }
            className="no-print ml-auto rounded-lg border border-edge px-3 py-1.5 text-sm font-semibold text-navy-600 transition-colors hover:bg-navy-50 hover:text-navy-900"
          >
            {allOpen ? "Collapse all" : "Expand all"}
          </button>
        )}
      </div>

      {groups.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-edge bg-white p-8 text-center text-base text-navy-500">
          No attribute in this selection carries a verified source value yet.
        </p>
      ) : (
        groups.map(([group, attrs]) => {
          const isOpen = Boolean(open[group]);
          const panelId = `attrs-${group.replace(/[^a-zA-Z0-9]+/g, "-").toLowerCase()}`;
          return (
            <div key={group} className="mb-3 last:mb-0">
              <button
                type="button"
                aria-expanded={isOpen}
                aria-controls={panelId}
                onClick={() => setOpen((p) => ({ ...p, [group]: !p[group] }))}
                className="flex w-full items-center gap-2 rounded-xl border border-edge bg-white px-3 py-2.5 text-left transition-colors hover:bg-navy-50"
              >
                <ChevronRight
                  className={`size-4 shrink-0 text-navy-400 transition-transform ${isOpen ? "rotate-90" : ""}`}
                  aria-hidden
                />
                <span className="text-sm font-bold uppercase tracking-wider text-navy-600">
                  {group}
                </span>
                <Badge variant="neutral" size="sm">
                  {attrs.length}
                </Badge>
              </button>

              {isOpen && (
                <ul id={panelId} className="mt-2 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {attrs.map((attr) => (
                    <li
                      key={attr.attributeKey}
                      className="rounded-2xl border border-edge bg-white p-4 shadow-card"
                    >
                      <h5 className="text-base font-semibold text-navy-900">
                        {attr.attributeLabel}
                      </h5>
                      <dl className="mt-2.5 space-y-1.5 text-sm">
                        {attr.verifiedProducts.map(({ product, value }) => (
                          <div key={product.id} className="flex justify-between gap-2">
                            {/* Brand sits under the model so a bare model number is
                                still attributable at a glance and on hover. */}
                            <dt
                              className="text-navy-500"
                              title={`${product.brand} — ${product.displayName}`}
                            >
                              {product.displayName}
                              <span className="block text-xs font-medium text-navy-400">
                                {product.brand}
                              </span>
                            </dt>
                            <dd className="font-semibold text-navy-800">{value.display}</dd>
                          </div>
                        ))}
                      </dl>
                      {attr.unverifiedProducts.length > 0 && (
                        <p className="mt-2 border-t border-edge pt-2 text-xs text-caution-700">
                          No verified value:{" "}
                          {attr.unverifiedProducts.map((p) => p.displayName).join(", ")}
                        </p>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );
        })
      )}
    </div>
  );
}

function CopyButton({ text, label }: { text: string; label: string }) {
  const { notify } = useToast();
  const [copied, setCopied] = React.useState(false);
  return (
    <button
      type="button"
      aria-label={label}
      onClick={async () => {
        const ok = await copyText(text);
        if (ok) {
          setCopied(true);
          window.setTimeout(() => setCopied(false), 1800);
          notify("Copied to clipboard.");
        } else notify("Could not access the clipboard.", "warning");
      }}
      className="shrink-0 rounded-lg p-2 text-navy-400 transition-colors hover:bg-white/70 hover:text-navy-700"
    >
      {copied ? <Check className="size-4" aria-hidden /> : <Copy className="size-4" aria-hidden />}
    </button>
  );
}

export function PositioningSummary({ result }: { result: ComparisonResult }) {
  return (
    <section aria-label="Daikin positioning summary" className="space-y-5">
      <header>
        <h2 className="text-2xl font-bold text-navy-900">Daikin positioning summary</h2>
        <p className="mt-1.5 max-w-4xl text-base text-navy-500">
          Every claim below is calculated from the source values of the products you selected. Where a
          source cell is blank, the attribute is marked for validation rather than counted as a win or a
          loss.
        </p>
      </header>

      {result.crossFamily && (
        <p className="flex items-start gap-2.5 rounded-xl border border-caution-500/25 bg-caution-50 px-4 py-3 text-sm leading-relaxed text-caution-700">
          <TriangleAlert className="mt-0.5 size-5 shrink-0" aria-hidden />
          <span>
            Your selection spans more than one equipment type. Inverter ducted split heat pumps and
            air-to-water heat pumps are rated on different attributes, so advantages are calculated only
            within each equipment type — never across them.
          </span>
        </p>
      )}

      {/* Verified edges */}
      <div id="verified-daikin-edges" className="scroll-mt-24">
        <h3 className="mb-3 flex items-center gap-2 text-lg font-semibold text-navy-900">
          <ShieldCheck className="size-5 text-verified-600" aria-hidden />
          Verified Daikin edges
          <Badge variant="verified" size="sm">
            {result.edges.length}
          </Badge>
        </h3>

        {result.edges.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-edge bg-white p-8 text-center text-base text-navy-500">
            No attribute in this selection has a Daikin value that beats every selected competitor with a
            recorded value. Add a competitor from the same equipment type, or widen the selection.
          </p>
        ) : (
          <ul className="grid gap-4 lg:grid-cols-2">
            {result.edges.map((edge) => {
              const copy = [
                "VERIFIED DAIKIN EDGE",
                edge.attributeLabel,
                edge.headline,
                edge.marginLabel ? `Margin: ${edge.marginLabel} than the closest selected competitor.` : "",
                `Supporting product: ${edge.daikinProduct.displayName}`,
                `Source: ${edge.citation}`,
              ]
                .filter(Boolean)
                .join("\n");

              return (
                <li
                  key={edge.id}
                  className="rounded-2xl border border-verified-500/25 bg-verified-50/70 p-5 shadow-card"
                >
                  <div className="flex items-start justify-between gap-2">
                    <Badge variant="verified" size="sm">
                      <ShieldCheck aria-hidden />
                      Verified Daikin edge
                    </Badge>
                    <CopyButton text={copy} label={`Copy the ${edge.attributeLabel} edge`} />
                  </div>

                  <h4 className="mt-3 flex items-center gap-1 text-lg font-bold text-navy-900">
                    {edge.attributeLabel}
                    {edge.plainLanguage && (
                      <InfoTip label={edge.attributeLabel}>{edge.plainLanguage}</InfoTip>
                    )}
                  </h4>

                  <p className="mt-1.5 text-[0.9375rem] leading-relaxed text-navy-700">
                    {edge.headline} <AiTag kind="generated" className="align-middle" />
                  </p>

                  {edge.marginLabel && (
                    <p className="mt-2 inline-flex rounded-lg bg-white px-3 py-1.5 text-sm font-bold text-verified-700">
                      {edge.marginLabel} than the closest selected competitor
                    </p>
                  )}

                  <dl className="mt-3.5 space-y-1.5 border-t border-verified-500/20 pt-3 text-sm">
                    <div className="flex gap-2">
                      <dt className="shrink-0 font-semibold text-navy-500">Supporting product</dt>
                      <dd className="text-navy-800">{edge.daikinProduct.displayName}</dd>
                    </div>
                    <div className="flex gap-2">
                      <dt className="shrink-0 font-semibold text-navy-500">Proved against</dt>
                      <dd className="text-navy-800">
                        {edge.beatenCompetitors.map((c) => c.product.displayName).join(", ")}
                      </dd>
                    </div>
                    {edge.unvalidatedCompetitors.length > 0 && (
                      <div className="flex gap-2">
                        <dt className="shrink-0 font-semibold text-caution-700">Excluded (no value)</dt>
                        <dd className="text-caution-700">
                          {edge.unvalidatedCompetitors.map((p) => p.displayName).join(", ")}
                        </dd>
                      </div>
                    )}
                  </dl>

                  <p className="mt-3 text-xs leading-relaxed text-navy-400">{edge.citation}</p>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Gaps */}
      <div id="improvement-opportunities" className="scroll-mt-24">
        <h3 className="mb-3 flex items-center gap-2 text-lg font-semibold text-navy-900">
          <TriangleAlert className="size-5 text-caution-600" aria-hidden />
          Improvement opportunities
          <Badge variant="caution" size="sm">
            {result.gaps.length}
          </Badge>
        </h3>

        {result.gaps.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-edge bg-white p-8 text-center text-base text-navy-500">
            Across the attributes both sides have verified values for, no selected competitor currently
            leads the selected Daikin products.
          </p>
        ) : (
          <ul className="grid gap-4 lg:grid-cols-2">
            {result.gaps.map((gap) => {
              const copy = [
                "COMPETITIVE GAP / ACTION",
                gap.attributeLabel,
                gap.headline,
                `Affected Daikin product: ${gap.affectedDaikinProduct.displayName}`,
                `Suggested action: ${gap.suggestedAction}`,
                `Source: ${gap.citation}`,
                "INTERNAL USE ONLY — not for external distribution.",
              ].join("\n");

              return (
                <li key={gap.id} className="rounded-2xl border border-caution-500/25 bg-caution-50/70 p-5 shadow-card">
                  <div className="flex items-start justify-between gap-2">
                    <Badge variant="caution" size="sm">
                      <TriangleAlert aria-hidden />
                      Competitive gap / action
                    </Badge>
                    <CopyButton text={copy} label={`Copy the ${gap.attributeLabel} gap`} />
                  </div>

                  <h4 className="mt-3 text-lg font-bold text-navy-900">{gap.attributeLabel}</h4>
                  <p className="mt-1.5 text-[0.9375rem] leading-relaxed text-navy-700">{gap.headline}</p>

                  <dl className="mt-3.5 space-y-1.5 border-t border-caution-500/20 pt-3 text-sm">
                    <div className="flex gap-2">
                      <dt className="shrink-0 font-semibold text-navy-500">Competitor leading</dt>
                      <dd className="text-navy-800">{gap.leadingProduct.displayName}</dd>
                    </div>
                    <div className="flex gap-2">
                      <dt className="shrink-0 font-semibold text-navy-500">Daikin product affected</dt>
                      <dd className="text-navy-800">{gap.affectedDaikinProduct.displayName}</dd>
                    </div>
                    <div>
                      <dt className="flex items-center gap-1.5 font-semibold text-navy-500">
                        Suggested action <AiTag kind="generated" />
                      </dt>
                      <dd className="mt-0.5 leading-relaxed text-navy-700">{gap.suggestedAction}</dd>
                    </div>
                  </dl>

                  <p className="mt-3 text-xs leading-relaxed text-navy-400">{gap.citation}</p>
                  <p className="mt-2 text-xs font-bold uppercase tracking-wider text-caution-700">
                    Internal use only
                  </p>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Attributes compared */}
      <AttributesCompared result={result} />

      {/* Validation required */}
      {result.validations.length > 0 && (
        <div>
          <h3 className="mb-3 flex items-center gap-2 text-lg font-semibold text-navy-900">
            <CircleSlash className="size-5 text-navy-400" aria-hidden />
            Validation required
            <Badge variant="neutral" size="sm">
              {result.validations.length}
            </Badge>
          </h3>
          <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {result.validations.map((v) => (
              <li key={v.id} className="rounded-2xl border border-edge bg-white p-4 shadow-card">
                <Badge variant="outline" size="sm">
                  Validation required
                </Badge>
                <h4 className="mt-2.5 text-base font-semibold text-navy-900">{v.attributeLabel}</h4>
                <p className="mt-1 text-sm leading-relaxed text-navy-500">{v.reason}</p>
                <p className="mt-2 text-sm font-medium text-navy-700">
                  {v.products.map((p) => p.displayName).join(", ")}
                </p>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
