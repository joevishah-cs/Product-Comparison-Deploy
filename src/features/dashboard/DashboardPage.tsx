import * as React from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  History,
  Bookmark,
  DatabaseZap,
  ArrowRight,
  ShieldCheck,
  FileSpreadsheet,
  FileText,
  Boxes,
  ListChecks,
  type LucideIcon,
} from "lucide-react";
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
import { cn, formatDate } from "@/lib/utils";

/** Mirrors the Product Explorer's equipment tabs so the two pages agree on naming. */
const EQUIPMENT_BREAKDOWN: { key: EquipmentType; label: string; short: string }[] = [
  { key: "ducted_split_hp", label: "Air-to-Air (ducted split)", short: "A2A" },
  { key: "air_to_water_hp", label: "Air-to-Water (hydronic)", short: "A2W" },
];

const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

/** Counts from 0 to `target` once on mount; renders the final value straight
 *  away when the user prefers reduced motion. */
function useCountUp(target: number, duration = 750): number {
  const [value, setValue] = React.useState(0);

  React.useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setValue(target);
      return;
    }
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min((now - start) / duration, 1);
      setValue(Math.round(target * easeOutCubic(t)));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);

  return value;
}

/** Returns 0 on first paint, then the real percentage, so the CSS width
 *  transition on `.meter-fill` animates the bar in. */
function useMeterFill(pct: number): number {
  const [width, setWidth] = React.useState(0);

  React.useEffect(() => {
    let raf2 = 0;
    const raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => setWidth(pct));
    });
    return () => {
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
    };
  }, [pct]);

  return width;
}

function StatTile({
  icon: Icon,
  label,
  value,
  context,
  chip,
  glow,
  delay = 0,
}: {
  icon: LucideIcon;
  label: string;
  value: number;
  context: string;
  /** Pastel color classes for the circular icon chip. */
  chip: string;
  /** Background class for the soft color wash in the tile corner. */
  glow: string;
  delay?: number;
}) {
  const count = useCountUp(value);

  return (
    <article
      className="glass-card card-lift animate-fade-up relative overflow-hidden p-5"
      style={{ animationDelay: `${delay}ms` }}
    >
      <span className={cn("pointer-events-none absolute -right-8 -top-10 size-28 rounded-full blur-2xl", glow)} aria-hidden />
      <Icon
        className="pointer-events-none absolute -bottom-3 -right-3 size-16 -rotate-12 text-navy-900 opacity-[0.06]"
        aria-hidden
      />
      <div className="relative">
        <div className="flex items-start justify-between gap-3">
          <p className="text-sm font-medium text-navy-500">{label}</p>
          <span className={cn("grid size-10 shrink-0 place-items-center rounded-full", chip)}>
            <Icon className="size-[18px]" aria-hidden />
          </span>
        </div>
        <p className="mt-1.5 text-4xl font-bold tracking-tight text-navy-900">
          <span aria-hidden>{count.toLocaleString("en-US")}</span>
          <span className="sr-only">{value.toLocaleString("en-US")}</span>
        </p>
        <p className="mt-1.5 text-xs font-medium text-navy-500">{context}</p>
      </div>
    </article>
  );
}

/** Animated ring gauge — a single percentage reads better as a dial than a bar. */
function CoverageRing({ pct }: { pct: number }) {
  const fill = useMeterFill(pct);
  const R = 26;
  const C = 2 * Math.PI * R;

  return (
    <div
      className="relative shrink-0"
      role="progressbar"
      aria-valuenow={pct}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label="Share of product attributes carrying a verified source value"
    >
      <svg width="64" height="64" viewBox="0 0 64 64" className="-rotate-90">
        <defs>
          <linearGradient id="coverage-ring-gradient" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#59bcff" />
            <stop offset="100%" stopColor="#0079b5" />
          </linearGradient>
        </defs>
        <circle cx="32" cy="32" r={R} fill="none" strokeWidth="6" className="stroke-daikin-100" />
        <circle
          cx="32"
          cy="32"
          r={R}
          fill="none"
          strokeWidth="6"
          strokeLinecap="round"
          stroke="url(#coverage-ring-gradient)"
          strokeDasharray={C}
          strokeDashoffset={C * (1 - fill / 100)}
          style={{ transition: "stroke-dashoffset 700ms cubic-bezier(0.16,1,0.3,1)" }}
        />
      </svg>
      <ShieldCheck className="absolute inset-0 m-auto size-5 text-daikin-700" aria-hidden />
    </div>
  );
}

function CoverageTile({
  pct,
  verified,
  total,
  delay = 0,
}: {
  pct: number;
  verified: number;
  total: number;
  delay?: number;
}) {
  const count = useCountUp(pct);

  return (
    <article
      className="glass-card card-lift animate-fade-up relative overflow-hidden p-5"
      style={{ animationDelay: `${delay}ms` }}
    >
      <span className="pointer-events-none absolute -right-8 -top-10 size-28 rounded-full bg-verified-100/90 blur-2xl" aria-hidden />
      <div className="relative flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-navy-500">Verified coverage</p>
          <p className="mt-1.5 text-4xl font-bold tracking-tight text-navy-900">
            <span aria-hidden>{count}%</span>
            <span className="sr-only">{pct}%</span>
          </p>
          <p className="mt-1.5 text-xs font-medium text-navy-500">
            {verified.toLocaleString()} of {total.toLocaleString()} cells verified
          </p>
        </div>
        <CoverageRing pct={pct} />
      </div>
    </article>
  );
}

function EquipmentMeter({
  label,
  short,
  pct,
  count,
  attributes,
}: {
  label: string;
  short: string;
  pct: number;
  count: number;
  attributes: number;
}) {
  const fill = useMeterFill(pct);

  return (
    <li>
      <div className="flex items-center justify-between gap-3">
        <span className="flex min-w-0 items-center gap-2 text-sm font-medium text-navy-700">
          {/* Fixed width so both equipment labels start on the same x. */}
          <Badge variant="outline" size="sm" className="w-11 shrink-0 justify-center">
            {short}
          </Badge>
          <span className="truncate">{label}</span>
        </span>
        <span className="shrink-0 text-sm font-bold tabular-nums text-navy-900">{pct}%</span>
      </div>
      <div
        className="meter-track mt-2"
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`${label} — share of attributes carrying a verified source value`}
      >
        <div className="meter-fill" style={{ width: `${fill}%` }} />
      </div>
      <p className="mt-1.5 text-xs text-navy-400">
        {count} products · {attributes} attributes
      </p>
    </li>
  );
}

function CardEmptyState({ icon: Icon, title, hint }: { icon: LucideIcon; title: string; hint: string }) {
  return (
    <div className="mt-4 flex flex-1 flex-col items-center justify-center rounded-xl border border-dashed border-navy-200/70 bg-white/40 px-5 py-8 text-center">
      <span className="grid size-10 place-items-center rounded-full bg-white text-navy-400 shadow-sm ring-1 ring-white/80">
        <Icon className="size-[18px]" aria-hidden />
      </span>
      <p className="mt-3 text-sm font-semibold text-navy-600">{title}</p>
      <p className="mt-1 max-w-[26ch] text-xs leading-relaxed text-navy-400">{hint}</p>
    </div>
  );
}

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
      {/* Hero — floats directly on the glass scene; the search is the page's
          command center. z-20 keeps its results dropdown above the sections below. */}
      <header className="relative z-20 animate-fade-up">
        {/* Radar motif — a nod to competitive intelligence. Decorative only;
            the global reduced-motion rule stops every animation below. */}
        <div className="pointer-events-none absolute -top-12 right-0 hidden lg:block" aria-hidden>
          {/* overflow-hidden: the spinning wrappers are squares, so at 45° their
              bounding box would push ~60px past this container and widen the
              document. Every child is a circle inscribed in the box, so
              clipping to it changes nothing visually. */}
          <div className="relative size-72 overflow-hidden">
            {/* Sweep beam */}
            <div className="absolute inset-0 animate-[spin_16s_linear_infinite] rounded-full [background:conic-gradient(from_0deg,transparent_0deg,transparent_296deg,rgba(0,151,224,0.16)_352deg,transparent_360deg)]" />
            <div className="absolute inset-0 rounded-full border border-white/70" />
            <div className="absolute inset-9 rounded-full border border-white/80" />
            <div className="absolute inset-[4.5rem] rounded-full border border-daikin-200/70" />
            {/* Breathing core */}
            <div className="absolute inset-[6.75rem] animate-[pulse_7s_ease-in-out_infinite] rounded-full bg-daikin-100/60 backdrop-blur-sm" />
            {/* Orbiting blips — the wrapper spins, carrying the dot round its ring. */}
            <div className="absolute inset-0 animate-[spin_28s_linear_infinite]">
              <div className="absolute right-11 top-14 size-2.5 rounded-full bg-daikin-500 shadow-glow" />
            </div>
            <div className="absolute inset-9 animate-[spin_22s_linear_infinite] [animation-direction:reverse]">
              <div className="absolute bottom-7 left-6 size-1.5 rounded-full bg-daikin-400/80" />
            </div>
            <div className="absolute inset-[4.5rem] animate-[spin_18s_linear_infinite]">
              <div className="absolute right-4 top-8 size-1 rounded-full bg-daikin-500/70" />
            </div>
          </div>
        </div>
        <p className="eyebrow">Daikin Competitive Marketing Intelligence</p>
        <h1 className="mt-3 max-w-4xl text-balance text-3xl font-bold leading-tight text-navy-900 sm:text-4xl">
          Which products would you like to compare?
        </h1>
        <p className="mt-3 max-w-3xl text-lg leading-relaxed text-navy-500">
          Search once across Daikin and competitor models, select units where source data supports
          them, then compare.
        </p>
        <div className="mt-6">
          <ProductSearch />
        </div>
      </header>

      <section aria-label="Data coverage at a glance" className="grid grid-cols-2 gap-4 sm:gap-5 xl:grid-cols-4">
        <StatTile icon={Boxes} label="Products tracked" value={PRODUCTS.length} context="Daikin + competitor models" chip="bg-daikin-100 text-daikin-700" glow="bg-daikin-200/80" delay={40} />
        <StatTile icon={FileText} label="Source documents" value={SOURCE_DOCUMENTS.length} context="Imported with full provenance" chip="bg-indigo-100 text-indigo-600" glow="bg-indigo-200/70" delay={80} />
        <StatTile icon={ListChecks} label="Attributes" value={ATTRIBUTE_DEFINITIONS.length} context="Comparable spec fields" chip="bg-sky-100 text-sky-600" glow="bg-sky-200/80" delay={120} />
        <CoverageTile pct={coverage.pct} verified={coverage.verified} total={coverage.total} delay={160} />
      </section>

      <div className="animate-fade-up [animation-delay:180ms]">
        <SelectedProducts />
      </div>

      <section aria-label="Quick access" className="grid gap-5 lg:grid-cols-3">
        {/* Recently compared */}
        <article className="glass-card card-lift animate-fade-up flex flex-col p-6 [animation-delay:60ms]">
          <header className="flex items-center gap-2.5">
            <span className="grid size-10 place-items-center rounded-full bg-indigo-100 text-indigo-600">
              <History className="size-[18px]" aria-hidden />
            </span>
            <h2 className="text-lg font-semibold text-navy-900">Recently compared</h2>
          </header>

          {recentComparisons.length === 0 ? (
            <CardEmptyState
              icon={History}
              title="Nothing compared yet"
              hint="Run your first comparison and it will appear here for one-click reopening."
            />
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
                      className="group flex w-full items-center gap-3 rounded-xl border border-white/70 bg-white/80 p-3 text-left transition-all duration-200 hover:border-daikin-200 hover:bg-white hover:shadow-card"
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
                      <ArrowRight
                        className="size-4 shrink-0 text-navy-400 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-daikin-600"
                        aria-hidden
                      />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </article>

        {/* Saved comparisons */}
        <article className="glass-card card-lift animate-fade-up flex flex-col p-6 [animation-delay:120ms]">
          <header className="flex items-center gap-2.5">
            <span className="grid size-10 place-items-center rounded-full bg-daikin-100 text-daikin-700">
              <Bookmark className="size-[18px]" aria-hidden />
            </span>
            <h2 className="text-lg font-semibold text-navy-900">Saved comparisons</h2>
          </header>

          {savedLoading ? (
            <>
              <p className="sr-only" role="status">
                Loading your saved comparisons…
              </p>
              <ul className="mt-4 space-y-2" aria-hidden>
                {[0, 1, 2].map((i) => (
                  <li key={i} className="flex items-center gap-3 rounded-xl border border-white/70 bg-white/50 p-3">
                    <div className="skeleton size-9 rounded-lg" />
                    <div className="flex-1 space-y-2">
                      <div className="skeleton h-3 w-3/5" />
                      <div className="skeleton h-2.5 w-2/5" />
                    </div>
                  </li>
                ))}
              </ul>
            </>
          ) : saved.length === 0 ? (
            <CardEmptyState
              icon={Bookmark}
              title="No saved comparisons"
              hint="Save a comparison from the compare page and it will reopen here with its exact product selection and unit sizes intact."
            />
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
                        className="group flex w-full items-center gap-3 rounded-xl border border-white/70 bg-white/80 p-3 text-left transition-all duration-200 hover:border-daikin-200 hover:bg-white hover:shadow-card"
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
                        <ArrowRight
                          className="size-4 shrink-0 text-navy-400 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-daikin-600"
                          aria-hidden
                        />
                      </button>
                    </li>
                  );
                })}
              </ul>
              <Link
                to="/saved"
                className="mt-auto inline-flex min-h-[44px] items-center gap-1.5 pt-4 text-sm font-semibold text-daikin-700 hover:text-daikin-800"
              >
                {saved.length > 5 ? `See all ${saved.length} saved comparisons` : "Manage saved comparisons"}
                <ArrowRight className="size-4" aria-hidden />
              </Link>
            </>
          )}
        </article>

        {/* Product data coverage */}
        <article className="glass-card card-lift animate-fade-up flex flex-col p-6 [animation-delay:180ms]">
          <header className="flex items-center gap-2.5">
            <span className="grid size-10 place-items-center rounded-full bg-sky-100 text-sky-600">
              <DatabaseZap className="size-[18px]" aria-hidden />
            </span>
            <h2 className="text-lg font-semibold text-navy-900">Product data coverage</h2>
          </header>

          <div className="mt-4">
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm font-medium text-navy-700">Verified source values</span>
              <span className="shrink-0 text-sm font-bold tabular-nums text-navy-900">
                {coverage.pct}%
              </span>
            </div>
            <div
              className="meter-track mt-2"
              role="progressbar"
              aria-valuenow={coverage.pct}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label="Share of product attributes carrying a verified source value"
            >
              <CoverageMeterFill pct={coverage.pct} />
            </div>
            <p className="mt-1.5 text-xs leading-relaxed text-navy-400">
              {coverage.verified.toLocaleString()} of {coverage.total.toLocaleString()} attribute cells carry a
              source value. The rest display “Information unavailable”.
            </p>
          </div>

          <ul className="mt-4 space-y-3 border-t border-edge pt-4">
            {byEquipment.map((row) => (
              <EquipmentMeter
                key={row.key}
                label={row.label}
                short={row.short}
                pct={row.pct}
                count={row.count}
                attributes={row.attributes}
              />
            ))}
          </ul>

          <ul className="mt-4 space-y-2 border-t border-edge pt-4">
            {SOURCE_DOCUMENTS.map((doc) => (
              <li key={doc.id} className="flex items-start gap-2.5">
                <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-white/80 text-navy-500 ring-1 ring-inset ring-white/80">
                  {doc.kind === "pdf" ? (
                    <FileText className="size-4" aria-hidden />
                  ) : (
                    <FileSpreadsheet className="size-4" aria-hidden />
                  )}
                </span>
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
            <p className="mt-3 rounded-xl bg-caution-50 px-3 py-2 text-xs leading-relaxed text-caution-700 ring-1 ring-inset ring-caution-500/20">
              Cells {EXCLUDED_CELLS.map((c) => c.ref).join(", ")} returned {EXCLUDED_CELLS[0]?.raw} and are
              excluded from verified values.
            </p>
          )}
        </article>
      </section>

      {/* Workflow CTA — the page's anchor: a brand-gradient glass band. */}
      <section className="animate-fade-up relative overflow-hidden rounded-3xl bg-[linear-gradient(115deg,#0f2740_0%,#0b557b_40%,#0079b5_78%,#0097e0_108%)] p-6 shadow-pop sm:p-8 [animation-delay:240ms]">
        <div className="pointer-events-none absolute inset-0" aria-hidden>
          <div className="absolute inset-0 opacity-50 [background-image:radial-gradient(circle,rgba(255,255,255,0.14)_1px,transparent_1px)] [background-size:20px_20px]" />
          <div className="absolute -right-16 -top-28 h-72 w-72 rounded-full bg-daikin-400/40 blur-3xl" />
          <div className="absolute -bottom-32 left-1/3 h-64 w-64 rounded-full bg-white/15 blur-3xl" />
          <div className="absolute inset-0 shadow-[inset_0_1px_0_rgba(255,255,255,0.25)]" />
        </div>
        <div className="relative flex flex-wrap items-center gap-6">
          {selected.length > 0 && (
            <div className="flex -space-x-3">
              {selected.slice(0, 4).map((p) => (
                <ProductVisual key={p.id} product={p} size="xs" className="border-2 border-white/60" />
              ))}
            </div>
          )}
          <div className="min-w-[16rem] flex-1">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-1 text-xs font-semibold text-white ring-1 ring-inset ring-white/25 backdrop-blur-sm">
              <ShieldCheck className="size-3.5" aria-hidden />
              Source-backed workflow
            </span>
            <h2 className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-2 text-white">
              {["Search", "Select", "Compare", "Explain", "Publish"].map((step, i) => (
                <React.Fragment key={step}>
                  {i > 0 && <ArrowRight className="size-3.5 shrink-0 text-daikin-200" aria-hidden />}
                  <span className="rounded-full bg-white/15 px-3.5 py-1.5 text-sm font-semibold ring-1 ring-inset ring-white/25 backdrop-blur-sm">
                    {step}
                  </span>
                </React.Fragment>
              ))}
            </h2>
            <p className="mt-2.5 text-base text-daikin-100">
              Move from a selection to a printable, cited sales message without leaving the app.
            </p>
          </div>
          <Button
            size="lg"
            disabled={selected.length < 2}
            className="bg-white text-navy-900 shadow-lg hover:bg-daikin-50 active:bg-daikin-100"
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

/** Separate component so the width transition hook runs per meter. */
function CoverageMeterFill({ pct }: { pct: number }) {
  const fill = useMeterFill(pct);
  return <div className="meter-fill" style={{ width: `${fill}%` }} />;
}
