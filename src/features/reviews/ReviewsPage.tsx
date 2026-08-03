import * as React from "react";
import { Plus, MessagesSquare, ShieldAlert, Trash2, Filter } from "lucide-react";
import { cn, formatDate, uid } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input, Label, Textarea } from "@/components/ui/input";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast";
import { ChartCard } from "@/components/charts/ChartCard";
import { CountBarChart, DonutChart, TrendLineChart } from "@/components/charts/SpecialCharts";
import { ProductVisual } from "@/components/common/ProductVisual";
import { PRODUCTS, PRODUCT_BY_ID } from "@/data/catalog";
import { useAuth } from "@/features/auth/AuthProvider";
import { useSelection } from "@/features/selection/SelectionProvider";
import { deleteRow, insertRow, listRows, type ReviewSignal, type Sentiment } from "@/lib/store";
import { COMPETITOR_SERIES, DAIKIN_FILL } from "@/components/charts/palette";
import { ImportedReviewsSection } from "./ImportedReviewsSection";
import { CompetitorReviewsSection } from "./CompetitorReviewsSection";
import { loadReviewSource } from "./useReviewSource";
import type { ReviewRecord } from "@/data/review-types";
import { PageHeader } from "@/components/layout/PageHeader";

const SENTIMENTS: { value: Sentiment; label: string; color: string; badge: "verified" | "caution" | "risk" }[] = [
  { value: "positive", label: "Positive", color: "#16a45c", badge: "verified" },
  { value: "mixed", label: "Mixed", color: "#e0900b", badge: "caution" },
  { value: "concern", label: "Concern", color: "#e0333a", badge: "risk" },
];

const REVIEWER_TYPES = ["Homeowner", "Dealer", "Installing technician", "Field sales", "Distributor"];
const VERIFICATION = [
  { value: "approved_excerpt", label: "Approved review excerpt" },
  { value: "field_note", label: "Internal field note" },
  { value: "pending_review", label: "Pending review" },
] as const;

const THEME_OPTIONS = [
  "Sound",
  "Cold-weather heating",
  "Installation & commissioning",
  "Controls & app",
  "Humidity control",
  "Service & diagnostics",
  "Efficiency & bills",
  "Footprint & siting",
];

export function ReviewsPage() {
  const { user } = useAuth();
  const { selected } = useSelection();
  const { notify } = useToast();

  const [signals, setSignals] = React.useState<ReviewSignal[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [addOpen, setAddOpen] = React.useState(false);
  const [productFilter, setProductFilter] = React.useState<string>("all");
  const [sentimentFilter, setSentimentFilter] = React.useState<Sentiment | "all">("all");

  const [form, setForm] = React.useState({
    product_id: selected[0]?.id ?? PRODUCTS[0].id,
    sentiment: "positive" as Sentiment,
    excerpt: "",
    context: "",
    reviewer_type: REVIEWER_TYPES[0],
    source: "",
    occurred_on: new Date().toISOString().slice(0, 10),
    verification_status: "approved_excerpt" as ReviewSignal["verification_status"],
    themes: [] as string[],
  });

  /** Maps detected review themes onto the field-note theme chips. */
  const THEME_MAP: Record<string, string> = React.useMemo(
    () => ({
      quietness: "Sound",
      heating: "Cold-weather heating",
      installation: "Installation & commissioning",
      controls: "Controls & app",
      humidity: "Humidity control",
      service: "Service & diagnostics",
      efficiency: "Efficiency & bills",
      size: "Footprint & siting",
    }),
    [],
  );

  /** First visit: seed the board with verbatim excerpts from the imported review
   *  export — real customer text with real dates, never invented notes. Balanced:
   *  positives, a neutral and the concerns are all included. */
  const seedFromImportedReviews = React.useCallback(async () => {
    if (!user) return 0;
    const source = await loadReviewSource().catch(() => null);
    if (!source) return 0;

    const catalogFor: Record<string, string> = {
      DH6VS: "bc_dh6vs-fit-daikin",
      DH7VS: "bc_dh7vs-fit-daikin",
      DH9VS: "bc_dh9vs-fit-aurora-daikin",
    };
    const pool = source.reviews.filter(
      (r) => catalogFor[r.productId.toUpperCase()] && r.text.trim().length > 80,
    );
    const longest = (rs: ReviewRecord[], n: number) =>
      rs.slice().sort((a, b) => b.text.length - a.text.length).slice(0, n);

    const picks = [
      ...longest(pool.filter((r) => r.sentiment === "positive"), 3),
      ...longest(pool.filter((r) => r.sentiment === "neutral"), 2),
      ...longest(pool.filter((r) => r.sentiment === "negative"), 1),
    ];

    let added = 0;
    for (const r of picks) {
      await insertRow<ReviewSignal>("review_signals", {
        id: uid("rev"),
        owner_email: user.email,
        product_id: catalogFor[r.productId.toUpperCase()],
        sentiment: r.sentiment === "positive" ? "positive" : r.sentiment === "neutral" ? "mixed" : "concern",
        excerpt: r.title ? `${r.title} — ${r.text}` : r.text,
        context: "Verbatim excerpt from the imported customer-review export.",
        reviewer_type: "Homeowner",
        source: `${source.sourceFile} · sheet "${source.sourceSheet}" · review ${r.id}`,
        occurred_on: r.date ?? new Date().toISOString().slice(0, 10),
        verification_status: "approved_excerpt",
        themes: Array.from(new Set(r.themes.map((t) => THEME_MAP[t]).filter(Boolean))) as string[],
        created_at: new Date().toISOString(),
      });
      added += 1;
    }
    return added;
  }, [user, THEME_MAP]);

  const reload = React.useCallback(async () => {
    if (!user) return;
    setLoading(true);
    let rows = await listRows<ReviewSignal>("review_signals", user.email);
    const SEED_FLAG = "dcmi.v1.fieldNotesSeeded";
    if (rows.length === 0 && !window.localStorage.getItem(SEED_FLAG)) {
      // Claim the flag before the first await so StrictMode cannot seed twice.
      try {
        window.localStorage.setItem(SEED_FLAG, "1");
      } catch { /* storage unavailable */ }
      await seedFromImportedReviews();
      rows = await listRows<ReviewSignal>("review_signals", user.email);
    }
    setSignals(rows);
    setLoading(false);
  }, [user, seedFromImportedReviews]);

  React.useEffect(() => {
    void reload();
  }, [reload]);

  const filtered = React.useMemo(
    () =>
      signals.filter(
        (s) =>
          (productFilter === "all" || s.product_id === productFilter) &&
          (sentimentFilter === "all" || s.sentiment === sentimentFilter),
      ),
    [signals, productFilter, sentimentFilter],
  );

  const sentimentSlices = React.useMemo(
    () =>
      SENTIMENTS.map((s) => ({
        name: s.label,
        value: filtered.filter((r) => r.sentiment === s.value).length,
        color: s.color,
      })).filter((s) => s.value > 0),
    [filtered],
  );

  const volumeByProduct = React.useMemo(() => {
    const counts = new Map<string, number>();
    for (const s of filtered) counts.set(s.product_id, (counts.get(s.product_id) ?? 0) + 1);
    return Array.from(counts.entries())
      .map(([id, value]) => ({
        name: PRODUCT_BY_ID[id]?.displayName ?? id,
        value,
        color: PRODUCT_BY_ID[id]?.isDaikin ? DAIKIN_FILL : COMPETITOR_SERIES[0],
      }))
      .sort((a, b) => b.value - a.value);
  }, [filtered]);

  const themeCounts = React.useMemo(() => {
    const counts = new Map<string, number>();
    for (const s of filtered) for (const t of s.themes) counts.set(t, (counts.get(t) ?? 0) + 1);
    return Array.from(counts.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [filtered]);

  const trend = React.useMemo(() => {
    const byMonth = new Map<string, { positive: number; concern: number; mixed: number }>();
    for (const s of filtered) {
      const key = s.occurred_on.slice(0, 7);
      const bucket = byMonth.get(key) ?? { positive: 0, concern: 0, mixed: 0 };
      bucket[s.sentiment] += 1;
      byMonth.set(key, bucket);
    }
    return Array.from(byMonth.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, v]) => ({
        label: new Date(`${month}-01T00:00:00`).toLocaleDateString("en-US", { month: "short", year: "2-digit" }),
        ...v,
      }));
  }, [filtered]);

  const comparison = React.useMemo(() => {
    if (selected.length < 2) return null;
    return selected.map((p) => {
      const rows = signals.filter((s) => s.product_id === p.id);
      return {
        product: p,
        total: rows.length,
        positive: rows.filter((r) => r.sentiment === "positive").length,
        mixed: rows.filter((r) => r.sentiment === "mixed").length,
        concern: rows.filter((r) => r.sentiment === "concern").length,
      };
    });
  }, [selected, signals]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    if (!form.excerpt.trim()) return notify("Add the review excerpt or field note text.", "warning");
    if (!form.source.trim()) return notify("Record where this signal came from.", "warning");

    await insertRow<ReviewSignal>("review_signals", {
      id: uid("rev"),
      owner_email: user.email,
      ...form,
      created_at: new Date().toISOString(),
    });
    setAddOpen(false);
    setForm((f) => ({ ...f, excerpt: "", context: "", source: "", themes: [] }));
    notify("Review signal saved.");
    await reload();
  }

  return (
    <div className="stagger space-y-8">
      <PageHeader
        eyebrow="User reviews"
        title="Customer reviews and field signals"
        description="The imported customer-review dataset, plus field notes your team records — both kept deliberately separate from verified product specifications."
      />

      <ImportedReviewsSection />

      <div className="border-t border-edge pt-8">
        <CompetitorReviewsSection />
      </div>

      <header className="flex flex-wrap items-end justify-between gap-4 border-t border-edge pt-8">
        <div>
          <h2 className="text-2xl font-bold text-navy-900">Field notes from your team</h2>
          <p className="mt-2 max-w-3xl text-base text-navy-500">
            Approved excerpts and observations added manually — dealer visits, install debriefs, council
            feedback.
          </p>
        </div>
        <Button size="lg" onClick={() => setAddOpen(true)}>
          <Plus aria-hidden />
          Add review signal
        </Button>
      </header>

      <div className="flex items-start gap-3 rounded-2xl border border-caution-500/25 bg-caution-50 p-4">
        <ShieldAlert className="mt-0.5 size-5 shrink-0 text-caution-600" aria-hidden />
        <p className="text-[0.9375rem] leading-relaxed text-caution-800">
          <strong>Review signals are not product specifications.</strong> Everything on this page is
          opinion or field observation captured by your team. It never feeds the verified-edge calculations
          on the comparison page, and it must not be quoted as a performance claim.
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 surface p-4">
        <span className="flex items-center gap-2 text-sm font-semibold text-navy-500">
          <Filter className="size-4" aria-hidden />
          Filters
        </span>
        <div>
          <label className="sr-only" htmlFor="review-product-filter">
            Filter by product
          </label>
          <select
            id="review-product-filter"
            value={productFilter}
            onChange={(e) => setProductFilter(e.target.value)}
            className="h-11 min-w-[14rem] rounded-xl border border-edge bg-white px-3 text-base text-navy-800 focus:border-daikin-500 focus:outline-none focus:ring-2 focus:ring-daikin-500/25"
          >
            <option value="all">All products</option>
            {PRODUCTS.map((p) => (
              <option key={p.id} value={p.id}>
                {p.displayName}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by sentiment">
          <button
            type="button"
            onClick={() => setSentimentFilter("all")}
            aria-pressed={sentimentFilter === "all"}
            className={cn(
              "min-h-[44px] rounded-xl border px-3.5 text-sm font-semibold transition-colors",
              sentimentFilter === "all"
                ? "border-daikin-600 bg-daikin-600 text-white"
                : "border-edge bg-white text-navy-600 hover:border-daikin-300",
            )}
          >
            All sentiment
          </button>
          {SENTIMENTS.map((s) => (
            <button
              key={s.value}
              type="button"
              onClick={() => setSentimentFilter(s.value)}
              aria-pressed={sentimentFilter === s.value}
              className={cn(
                "min-h-[44px] rounded-xl border px-3.5 text-sm font-semibold transition-colors",
                sentimentFilter === s.value
                  ? "border-daikin-600 bg-daikin-600 text-white"
                  : "border-edge bg-white text-navy-600 hover:border-daikin-300",
              )}
            >
              {s.label}
            </button>
          ))}
        </div>
        <p className="ml-auto text-sm font-medium text-navy-500" aria-live="polite">
          {filtered.length} of {signals.length} signals
        </p>
      </div>

      {/* Sentiment summary */}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryTile label="Total signals" value={String(filtered.length)} tone="neutral" />
        {SENTIMENTS.map((s) => (
          <SummaryTile
            key={s.value}
            label={s.label}
            value={String(filtered.filter((r) => r.sentiment === s.value).length)}
            tone={s.badge}
          />
        ))}
      </section>

      {/* Charts */}
      <div className="grid gap-6 xl:grid-cols-2">
        <ChartCard
          title="Sentiment distribution"
          subtitle="Across the signals matching the current filters"
          direction="none"
          meaning={
            <>
              A quick read on the balance of what your team is hearing. Treat a small sample with caution:
              five signals is a conversation starter, not evidence. Concerns are as useful as praise —
              they tell you what a competitor will raise first.
            </>
          }
          sources={["Review signals recorded by your team in this workspace"]}
          unavailableNote={null}
        >
          <DonutChart
            slices={sentimentSlices}
            centerValue={String(filtered.length)}
            centerLabel={filtered.length === 1 ? "signal" : "signals"}
          />
        </ChartCard>

        <ChartCard
          title="Review volume by product"
          subtitle="Which products your team is hearing about"
          direction="none"
          meaning={
            <>
              Volume shows attention, not quality. A product with many signals is one your team is actively
              selling or servicing; silence usually means low deployment rather than a problem-free product.
            </>
          }
          sources={["Review signals recorded by your team in this workspace"]}
          unavailableNote={null}
        >
          <CountBarChart data={volumeByProduct} valueLabel="signals" />
        </ChartCard>

        <ChartCard
          title="Recurring themes"
          subtitle="Topics tagged across the filtered signals"
          direction="none"
          meaning={
            <>
              Themes that keep reappearing are where your message should focus — either to reinforce a
              strength customers already notice, or to get ahead of an objection before a competitor raises
              it.
            </>
          }
          sources={["Review signals recorded by your team in this workspace"]}
          unavailableNote={null}
        >
          <CountBarChart data={themeCounts} valueLabel="mentions" />
        </ChartCard>

        <ChartCard
          title="Positive vs concern trend"
          subtitle="Signal counts by month"
          direction="none"
          meaning={
            <>
              The direction matters more than any single month. A rising concern line following a product
              change or a new install crew is worth investigating before it reaches a review site.
            </>
          }
          sources={["Review signals recorded by your team in this workspace"]}
          unavailableNote={null}
        >
          <TrendLineChart
            data={trend}
            series={[
              { key: "positive", name: "Positive", color: "#16a45c" },
              { key: "mixed", name: "Mixed", color: "#e0900b" },
              { key: "concern", name: "Concern", color: "#e0333a" },
            ]}
          />
        </ChartCard>
      </div>

      {/* Cross-product sentiment comparison */}
      {comparison && (
        <section className="surface p-6">
          <h2 className="text-lg font-semibold text-navy-900">
            Sentiment across your selected comparison
          </h2>
          <p className="mt-1 text-sm text-navy-500">
            The same products currently loaded on the comparison page.
          </p>
          <ul className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {comparison.map((c) => (
              <li key={c.product.id} className="rounded-xl border border-edge p-4">
                <div className="flex items-center gap-2.5">
                  <ProductVisual product={c.product} size="xs" />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-navy-900">{c.product.model}</p>
                    <p className="text-xs text-navy-500">{c.total} signals</p>
                  </div>
                </div>
                {c.total > 0 ? (
                  <div className="mt-3 flex h-2.5 overflow-hidden rounded-full bg-navy-100">
                    <div style={{ width: `${(c.positive / c.total) * 100}%`, background: "#16a45c" }} />
                    <div style={{ width: `${(c.mixed / c.total) * 100}%`, background: "#e0900b" }} />
                    <div style={{ width: `${(c.concern / c.total) * 100}%`, background: "#e0333a" }} />
                  </div>
                ) : (
                  <p className="mt-3 text-sm text-navy-400">No signals recorded yet.</p>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Signal list */}
      <section aria-label="Review signals" className="space-y-3">
        <h2 className="text-lg font-semibold text-navy-900">Signal log</h2>
        {loading ? (
          <p className="text-base text-navy-500">Loading signals…</p>
        ) : filtered.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-edge bg-white p-12 text-center">
            <MessagesSquare className="mx-auto size-8 text-navy-300" aria-hidden />
            <p className="mt-3 text-lg font-semibold text-navy-700">No review signals yet</p>
            <p className="mx-auto mt-1 max-w-md text-base text-navy-500">
              Add an approved review excerpt or a field note from a dealer visit. Signals are stored against
              your account and kept separate from verified specifications.
            </p>
            <Button className="mt-5" onClick={() => setAddOpen(true)}>
              <Plus aria-hidden />
              Add the first signal
            </Button>
          </div>
        ) : (
          <ul className="space-y-3">
            {filtered.map((s) => {
              const product = PRODUCT_BY_ID[s.product_id];
              const sentiment = SENTIMENTS.find((x) => x.value === s.sentiment);
              return (
                <li key={s.id} className="surface p-5">
                  <div className="flex flex-wrap items-start gap-4">
                    {product && <ProductVisual product={product} size="sm" />}
                    <div className="min-w-[14rem] flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant={sentiment?.badge ?? "neutral"} size="sm">
                          {sentiment?.label}
                        </Badge>
                        <Badge variant="outline" size="sm">
                          {VERIFICATION.find((v) => v.value === s.verification_status)?.label}
                        </Badge>
                        <span className="text-sm text-navy-500">{s.reviewer_type}</span>
                        <span aria-hidden className="text-navy-300">•</span>
                        <span className="text-sm text-navy-500">{formatDate(s.occurred_on)}</span>
                      </div>
                      <p className="mt-2 text-base font-semibold text-navy-900">
                        {product?.displayName ?? s.product_id}
                      </p>
                      <blockquote className="mt-1.5 border-l-2 border-daikin-300 pl-3 text-[0.9375rem] leading-relaxed text-navy-700">
                        {s.excerpt}
                      </blockquote>
                      {s.context && <p className="mt-2 text-sm text-navy-500">Context: {s.context}</p>}
                      <div className="mt-2.5 flex flex-wrap items-center gap-2">
                        {s.themes.map((t) => (
                          <Badge key={t} variant="neutral" size="sm">
                            {t}
                          </Badge>
                        ))}
                      </div>
                      <p className="mt-2.5 text-xs text-navy-400">Source: {s.source}</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="iconSm"
                      aria-label={`Delete this signal for ${product?.displayName ?? s.product_id}`}
                      onClick={async () => {
                        await deleteRow("review_signals", s.id);
                        notify("Signal deleted.", "info");
                        await reload();
                      }}
                    >
                      <Trash2 aria-hidden />
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-xl">
          <DialogTitle>Add a review signal</DialogTitle>
          <DialogDescription>
            Record an approved review excerpt or an internal field note. Do not paste copyrighted review
            text you are not licensed to reuse.
          </DialogDescription>

          <form className="mt-5 space-y-4" onSubmit={submit}>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="rev-product">Product</Label>
                <select
                  id="rev-product"
                  value={form.product_id}
                  onChange={(e) => setForm((f) => ({ ...f, product_id: e.target.value }))}
                  className="mt-1.5 h-12 w-full rounded-xl border border-edge bg-white px-3 text-base text-navy-900 focus:border-daikin-500 focus:outline-none focus:ring-2 focus:ring-daikin-500/25"
                >
                  {PRODUCTS.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.displayName}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label htmlFor="rev-date">Date</Label>
                <Input
                  id="rev-date"
                  type="date"
                  value={form.occurred_on}
                  onChange={(e) => setForm((f) => ({ ...f, occurred_on: e.target.value }))}
                  className="mt-1.5"
                />
              </div>
            </div>

            <fieldset>
              <legend className="text-sm font-semibold text-navy-700">Sentiment</legend>
              <div className="mt-1.5 flex gap-2">
                {SENTIMENTS.map((s) => (
                  <button
                    key={s.value}
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, sentiment: s.value }))}
                    aria-pressed={form.sentiment === s.value}
                    className={cn(
                      "min-h-[44px] flex-1 rounded-xl border px-3 text-sm font-semibold transition-colors",
                      form.sentiment === s.value
                        ? "border-daikin-600 bg-daikin-600 text-white"
                        : "border-edge bg-white text-navy-600 hover:border-daikin-300",
                    )}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </fieldset>

            <div>
              <Label htmlFor="rev-excerpt">Review excerpt or field note</Label>
              <Textarea
                id="rev-excerpt"
                required
                value={form.excerpt}
                onChange={(e) => setForm((f) => ({ ...f, excerpt: e.target.value }))}
                placeholder="What was said, in the reviewer's own words or your summary of it"
                className="mt-1.5"
              />
            </div>

            <div>
              <Label htmlFor="rev-context">Context</Label>
              <Input
                id="rev-context"
                value={form.context}
                onChange={(e) => setForm((f) => ({ ...f, context: e.target.value }))}
                placeholder="e.g. 3-ton retrofit, coastal, replacing a 15-year-old system"
                className="mt-1.5"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="rev-reviewer">Reviewer type</Label>
                <select
                  id="rev-reviewer"
                  value={form.reviewer_type}
                  onChange={(e) => setForm((f) => ({ ...f, reviewer_type: e.target.value }))}
                  className="mt-1.5 h-12 w-full rounded-xl border border-edge bg-white px-3 text-base text-navy-900 focus:border-daikin-500 focus:outline-none focus:ring-2 focus:ring-daikin-500/25"
                >
                  {REVIEWER_TYPES.map((r) => (
                    <option key={r}>{r}</option>
                  ))}
                </select>
              </div>
              <div>
                <Label htmlFor="rev-verification">Verification status</Label>
                <select
                  id="rev-verification"
                  value={form.verification_status}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, verification_status: e.target.value as ReviewSignal["verification_status"] }))
                  }
                  className="mt-1.5 h-12 w-full rounded-xl border border-edge bg-white px-3 text-base text-navy-900 focus:border-daikin-500 focus:outline-none focus:ring-2 focus:ring-daikin-500/25"
                >
                  {VERIFICATION.map((v) => (
                    <option key={v.value} value={v.value}>
                      {v.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <Label htmlFor="rev-source">Source</Label>
              <Input
                id="rev-source"
                required
                value={form.source}
                onChange={(e) => setForm((f) => ({ ...f, source: e.target.value }))}
                placeholder="e.g. Dealer council, Mar 2026 · approved for internal reuse"
                className="mt-1.5"
              />
            </div>

            <fieldset>
              <legend className="text-sm font-semibold text-navy-700">Themes</legend>
              <div className="mt-1.5 flex flex-wrap gap-2">
                {THEME_OPTIONS.map((t) => {
                  const active = form.themes.includes(t);
                  return (
                    <button
                      key={t}
                      type="button"
                      aria-pressed={active}
                      onClick={() =>
                        setForm((f) => ({
                          ...f,
                          themes: active ? f.themes.filter((x) => x !== t) : [...f.themes, t],
                        }))
                      }
                      className={cn(
                        "min-h-[38px] rounded-full border px-3 text-sm font-medium transition-colors",
                        active
                          ? "border-daikin-500 bg-daikin-600 text-white"
                          : "border-edge bg-white text-navy-600 hover:border-daikin-300",
                      )}
                    >
                      {t}
                    </button>
                  );
                })}
              </div>
            </fieldset>

            <div className="flex justify-end gap-2 pt-1">
              <Button type="button" variant="ghost" onClick={() => setAddOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">Save signal</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function SummaryTile({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "neutral" | "verified" | "caution" | "risk";
}) {
  const cls = {
    neutral: "border-edge bg-white",
    verified: "border-verified-500/25 bg-verified-50/70",
    caution: "border-caution-500/25 bg-caution-50/70",
    risk: "border-risk-500/25 bg-risk-50/70",
  }[tone];
  return (
    <div className={cn("rounded-2xl border p-5 shadow-card", cls)}>
      <p className="text-sm font-bold uppercase tracking-wider text-navy-500">{label}</p>
      <p className="mt-2 text-4xl font-bold text-navy-900">{value}</p>
    </div>
  );
}
