import * as React from "react";
import { Plus, Newspaper, Copy, Check, Trash2, Radio, FileText } from "lucide-react";
import { copyText, formatDate, uid } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input, Label, Textarea } from "@/components/ui/input";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast";
import { ChartCard } from "@/components/charts/ChartCard";
import { CountBarChart, DonutChart } from "@/components/charts/SpecialCharts";
import { PRODUCTS, PRODUCT_BY_ID } from "@/data/catalog";
import { useAuth } from "@/features/auth/AuthProvider";
import { useSelection } from "@/features/selection/SelectionProvider";
import { deleteRow, insertRow, listRows, type MediaClip, type Sentiment } from "@/lib/store";
import { buildComparison } from "@/features/compare/engine";
import { COMPETITOR_SERIES, DAIKIN_FILL } from "@/components/charts/palette";
import { useNavigate } from "react-router-dom";
import { SOURCED_CLIPS, COVERAGE_RETRIEVED_ON } from "@/data/web-coverage";
import { AiTag } from "@/components/common/AiTag";
import { Callout } from "@/components/common/Callout";
import { PageHeader } from "@/components/layout/PageHeader";

const TOPICS = [
  "Cold-climate performance",
  "Refrigerant transition",
  "Efficiency & rebates",
  "Installation quality",
  "Connected services",
  "Warranty & ownership cost",
  "Sound & comfort",
];

const SENTIMENT_META: Record<Sentiment, { label: string; color: string; badge: "verified" | "caution" | "risk" }> = {
  positive: { label: "Positive", color: "#16a45c", badge: "verified" },
  mixed: { label: "Mixed", color: "#e0900b", badge: "caution" },
  concern: { label: "Concern", color: "#e0333a", badge: "risk" },
};

const WATCHLIST = [
  { topic: "Cold-climate performance", why: "Competitors increasingly lead with a low-ambient heating number rather than a seasonal rating." },
  { topic: "Refrigerant transition", why: "R-32 and R-454B are both in market; coverage often conflates safety class with efficiency." },
  { topic: "Installation quality", why: "Commissioning and charge accuracy rarely appear in coverage, but drive real-world efficiency." },
  { topic: "Connected diagnostics", why: "Contractor-facing cloud services are a differentiator that trade press underreports." },
  { topic: "Warranty terms", why: "Replacement versus compressor-only remedies are routinely reported as equivalent." },
];

export function PressPage() {
  const { user } = useAuth();
  const { selected } = useSelection();
  const { notify } = useToast();
  const navigate = useNavigate();

  const [clips, setClips] = React.useState<MediaClip[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [addOpen, setAddOpen] = React.useState(false);
  const [copiedAngle, setCopiedAngle] = React.useState<string | null>(null);

  const [form, setForm] = React.useState({
    headline: "",
    publication: "",
    author: "",
    published_on: new Date().toISOString().slice(0, 10),
    product_id: selected[0]?.id ?? PRODUCTS[0].id,
    sentiment: "positive" as Sentiment,
    topic: TOPICS[0],
    url: "",
    notes: "",
  });

  const seedSourced = React.useCallback(
    async (existingHeadlines: Set<string>) => {
      if (!user) return 0;
      let added = 0;
      for (const c of SOURCED_CLIPS) {
        if (existingHeadlines.has(c.headline)) continue;
        await insertRow<MediaClip>("media_clips", {
          id: uid("clip"),
          owner_email: user.email,
          headline: c.headline,
          publication: c.publication,
          author: c.author,
          published_on: c.published_on,
          product_id: c.productId,
          sentiment: c.sentiment,
          topic: c.topic,
          url: c.url,
          notes: c.notes,
          created_at: new Date().toISOString(),
        });
        added += 1;
      }
      return added;
    },
    [user],
  );

  const reload = React.useCallback(async () => {
    if (!user) return;
    setLoading(true);
    let rows = await listRows<MediaClip>("media_clips", user.email);
    // First visit: populate with the curated web-sourced clips so the charts are
    // never empty out of the box. Runs once; deleting clips later is respected.
    const SEED_FLAG = "dcmi.v1.pressSeeded";
    if (rows.length === 0 && !window.localStorage.getItem(SEED_FLAG)) {
      // Claim the flag before the first await so StrictMode's double-invoked
      // effect cannot seed twice.
      try {
        window.localStorage.setItem(SEED_FLAG, "1");
      } catch { /* storage unavailable */ }
      await seedSourced(new Set());
      rows = await listRows<MediaClip>("media_clips", user.email);
    }
    setClips(rows);
    setLoading(false);
  }, [user, seedSourced]);

  React.useEffect(() => {
    void reload();
  }, [reload]);

  const angles = React.useMemo(() => {
    if (selected.length < 2) return [];
    const result = buildComparison(selected);
    return result.edges.slice(0, 5).map((edge) => ({
      id: edge.id,
      headline: angleHeadline(edge.attributeLabel),
      body: `${edge.attributeLabel}: ${edge.headline}${edge.marginLabel ? ` The measured gap is ${edge.marginLabel} against the closest product in this comparison.` : ""}`,
      citation: edge.citation,
    }));
  }, [selected]);

  const sentimentSlices = React.useMemo(
    () =>
      (Object.keys(SENTIMENT_META) as Sentiment[])
        .map((s) => ({
          name: SENTIMENT_META[s].label,
          value: clips.filter((c) => c.sentiment === s).length,
          color: SENTIMENT_META[s].color,
        }))
        .filter((s) => s.value > 0),
    [clips],
  );

  const shareOfVoice = React.useMemo(() => {
    const counts = new Map<string, number>();
    for (const c of clips) {
      const brand = PRODUCT_BY_ID[c.product_id]?.brand ?? "Unassigned";
      counts.set(brand, (counts.get(brand) ?? 0) + 1);
    }
    return Array.from(counts.entries())
      .map(([name, value]) => ({ name, value, color: name === "Daikin" ? DAIKIN_FILL : COMPETITOR_SERIES[0] }))
      .sort((a, b) => b.value - a.value);
  }, [clips]);

  const topicCounts = React.useMemo(() => {
    const counts = new Map<string, number>();
    for (const c of clips) counts.set(c.topic, (counts.get(c.topic) ?? 0) + 1);
    return Array.from(counts.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [clips]);

  async function addSourced() {
    const added = await seedSourced(new Set(clips.map((c) => c.headline)));
    notify(
      added
        ? `${added} web-sourced clip${added === 1 ? "" : "s"} added — real articles retrieved ${COVERAGE_RETRIEVED_ON}, each with its original URL.`
        : "All sourced clips are already in the intake.",
    );
    await reload();
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    if (!form.headline.trim()) return notify("Add the headline of the coverage.", "warning");
    if (!form.publication.trim()) return notify("Record the publication.", "warning");

    await insertRow<MediaClip>("media_clips", {
      id: uid("clip"),
      owner_email: user.email,
      ...form,
      created_at: new Date().toISOString(),
    });
    setAddOpen(false);
    setForm((f) => ({ ...f, headline: "", publication: "", author: "", url: "", notes: "" }));
    notify("Media clip recorded.");
    await reload();
  }

  return (
    <div className="stagger space-y-8">
      <PageHeader
        eyebrow="Press & media"
        title="Coverage, angles and share of voice"
        description="Generate editorial angles from verified comparison evidence, and log coverage as your team finds it."
        actions={
          <>
          <Button variant="secondary" size="lg" onClick={addSourced}>
            <Newspaper aria-hidden />
            Add sourced coverage
          </Button>
            <Button size="lg" onClick={() => setAddOpen(true)}>
              <Plus aria-hidden />
              Add media clip
            </Button>
          </>
        }
      />

      <Callout tone="risk" className="animate-fade-up [animation-delay:60ms]">
        <div>
          <p className="text-base font-bold text-risk-700">No live media monitoring feed is connected</p>
          <p className="mt-1 text-[0.9375rem] leading-relaxed text-navy-700">
            No coverage is ever invented. A curated set of real articles — trade press, market data and
            regulatory sources retrieved from the public web on {COVERAGE_RETRIEVED_ON}, each with its
            original URL — can be added with <strong>Add sourced coverage</strong>. Everything else comes
            from your team or a licensed feed.
          </p>
        </div>
      </Callout>

      {/* Comparison angle generator */}
      <section aria-label="Comparison angle generator" className="surface p-6">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="flex items-center gap-2 text-lg font-semibold text-navy-900">
              <Radio className="size-5 text-daikin-600" aria-hidden />
              Comparison angle generator
              <AiTag kind="generated" />
            </h2>
            <p className="mt-1 text-sm text-navy-500">
              Editorial angles built from the verified edges in your current comparison selection.
            </p>
          </div>
          <Button variant="secondary" onClick={() => navigate("/dashboard")}>
            Change selection
          </Button>
        </header>

        {angles.length === 0 ? (
          <p className="mt-4 rounded-xl border border-dashed border-edge bg-navy-50/50 p-8 text-center text-base text-navy-500">
            Select at least two products on the Dashboard — the generator builds angles only from calculated,
            source-backed advantages.
          </p>
        ) : (
          <ul className="mt-4 grid gap-3 lg:grid-cols-2">
            {angles.map((a) => (
              <li key={a.id} className="rounded-xl border border-daikin-200 bg-daikin-50/50 p-4">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-base font-bold text-navy-900">{a.headline}</p>
                  <button
                    type="button"
                    aria-label={`Copy the editorial angle: ${a.headline}`}
                    onClick={async () => {
                      const ok = await copyText(
                        `EDITORIAL ANGLE\n${a.headline}\n\n${a.body}\n\nSource: ${a.citation}\n\nINTERNAL — verify all claims with product marketing before any external pitch.`,
                      );
                      if (ok) {
                        setCopiedAngle(a.id);
                        window.setTimeout(() => setCopiedAngle(null), 1800);
                        notify("Editorial angle copied.");
                      } else notify("Could not access the clipboard.", "warning");
                    }}
                    className="shrink-0 rounded-lg p-2 text-navy-400 hover:bg-white hover:text-navy-700"
                  >
                    {copiedAngle === a.id ? <Check className="size-4" aria-hidden /> : <Copy className="size-4" aria-hidden />}
                  </button>
                </div>
                <p className="mt-1.5 text-[0.9375rem] leading-relaxed text-navy-700">{a.body}</p>
                <p className="mt-2.5 text-xs leading-relaxed text-navy-400">{a.citation}</p>
              </li>
            ))}
          </ul>
        )}

        {angles.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            <Button variant="secondary" onClick={() => navigate("/briefs")}>
              <FileText aria-hidden />
              Turn coverage into a newsletter
            </Button>
          </div>
        )}
      </section>

      {/* Media watchlist */}
      <section aria-label="Media watchlist" className="surface p-6">
        <h2 className="text-lg font-semibold text-navy-900">Media watchlist</h2>
        <p className="mt-1 text-sm text-navy-500">
          Topics worth watching, and why each one matters for positioning. These are internal editorial
          priorities, not observed coverage.
        </p>
        <ul className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {WATCHLIST.map((w) => (
            <li key={w.topic} className="rounded-xl border border-edge p-4">
              <p className="text-base font-semibold text-navy-900">{w.topic}</p>
              <p className="mt-1 text-sm leading-relaxed text-navy-500">{w.why}</p>
            </li>
          ))}
        </ul>
      </section>

      {/* Charts */}
      <div className="grid gap-6 xl:grid-cols-3">
        <ChartCard
          title="Media sentiment"
          subtitle="Across the coverage your team has logged"
          direction="none"
          meaning={
            <>
              Sentiment on logged coverage only. This chart stays empty until real clips are recorded — no
              coverage is generated or assumed.
            </>
          }
          sources={["Media clips recorded by your team in this workspace"]}
          unavailableNote={null}
        >
          <DonutChart slices={sentimentSlices} centerValue={String(clips.length)} centerLabel="clips" />
        </ChartCard>

        <ChartCard
          title="Brand share of voice"
          subtitle="Clips logged per brand"
          direction="none"
          meaning={
            <>
              Share of voice tells you who is shaping the conversation. A low share is not automatically a
              problem — but it does mean a competitor's framing is reaching the market unanswered.
            </>
          }
          sources={["Media clips recorded by your team in this workspace"]}
          unavailableNote={null}
        >
          <CountBarChart data={shareOfVoice} valueLabel="clips" />
        </ChartCard>

        <ChartCard
          title="Topic distribution"
          subtitle="What the logged coverage is about"
          direction="none"
          meaning={
            <>
              Where coverage clusters shows what the trade press currently finds newsworthy. Gaps here are
              opportunities: an important story nobody is telling is the easiest one to place.
            </>
          }
          sources={["Media clips recorded by your team in this workspace"]}
          unavailableNote={null}
        >
          <CountBarChart data={topicCounts} valueLabel="clips" />
        </ChartCard>
      </div>

      {/* Coverage intake */}
      <section aria-label="Coverage intake" className="space-y-3">
        <h2 className="text-lg font-semibold text-navy-900">Coverage intake</h2>
        {loading ? (
          <p className="text-base text-navy-500">Loading coverage…</p>
        ) : clips.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-edge bg-white p-12 text-center">
            <Newspaper className="mx-auto size-8 text-navy-300" aria-hidden />
            <p className="mt-3 text-lg font-semibold text-navy-700">No coverage logged</p>
            <p className="mx-auto mt-1 max-w-md text-base text-navy-500">
              Start with the curated web-sourced articles, or record a clip your team has found. Nothing is
              ever invented.
            </p>
            <div className="mt-5 flex flex-wrap justify-center gap-2">
              <Button onClick={addSourced}>
                <Newspaper aria-hidden />
                Add sourced coverage
              </Button>
              <Button variant="secondary" onClick={() => setAddOpen(true)}>
                <Plus aria-hidden />
                Add your own clip
              </Button>
            </div>
          </div>
        ) : (
          <ul className="space-y-3">
            {clips.map((c) => {
              const meta = SENTIMENT_META[c.sentiment];
              const product = PRODUCT_BY_ID[c.product_id];
              return (
                <li key={c.id} className="surface p-5">
                  <div className="flex flex-wrap items-start gap-4">
                    <div className="min-w-[16rem] flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant={meta.badge} size="sm">
                          {meta.label}
                        </Badge>
                        <Badge variant="outline" size="sm">
                          {c.topic}
                        </Badge>
                        <span className="text-sm text-navy-500">{formatDate(c.published_on)}</span>
                      </div>
                      <h3 className="mt-2 text-base font-bold text-navy-900">{c.headline}</h3>
                      <p className="mt-1 text-sm text-navy-600">
                        {c.publication}
                        {c.author && ` · ${c.author}`}
                        {product && ` · ${product.displayName}`}
                      </p>
                      {c.notes && <p className="mt-2 text-sm leading-relaxed text-navy-500">{c.notes}</p>}
                      {c.url && <p className="mt-2 break-all text-xs text-navy-400">{c.url}</p>}
                    </div>
                    <Button
                      variant="ghost"
                      size="iconSm"
                      aria-label={`Delete the clip: ${c.headline}`}
                      onClick={async () => {
                        await deleteRow("media_clips", c.id);
                        notify("Clip deleted.", "info");
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
          <DialogTitle>Add a media clip</DialogTitle>
          <DialogDescription>
            Record coverage your team has actually found. Do not paste article text you are not licensed to
            reuse — a headline, link and your own summary are enough.
          </DialogDescription>

          <form className="mt-5 space-y-4" onSubmit={submit}>
            <div>
              <Label htmlFor="clip-headline">Headline</Label>
              <Input
                id="clip-headline"
                required
                value={form.headline}
                onChange={(e) => setForm((f) => ({ ...f, headline: e.target.value }))}
                className="mt-1.5"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="clip-pub">Publication</Label>
                <Input
                  id="clip-pub"
                  required
                  value={form.publication}
                  onChange={(e) => setForm((f) => ({ ...f, publication: e.target.value }))}
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label htmlFor="clip-author">Author</Label>
                <Input
                  id="clip-author"
                  value={form.author}
                  onChange={(e) => setForm((f) => ({ ...f, author: e.target.value }))}
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label htmlFor="clip-date">Published</Label>
                <Input
                  id="clip-date"
                  type="date"
                  value={form.published_on}
                  onChange={(e) => setForm((f) => ({ ...f, published_on: e.target.value }))}
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label htmlFor="clip-topic">Topic</Label>
                <select
                  id="clip-topic"
                  value={form.topic}
                  onChange={(e) => setForm((f) => ({ ...f, topic: e.target.value }))}
                  className="mt-1.5 h-12 w-full rounded-xl border border-edge bg-white px-3 text-base text-navy-900 focus:border-daikin-500 focus:outline-none focus:ring-2 focus:ring-daikin-500/25"
                >
                  {TOPICS.map((t) => (
                    <option key={t}>{t}</option>
                  ))}
                </select>
              </div>
              <div>
                <Label htmlFor="clip-product">Product</Label>
                <select
                  id="clip-product"
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
                <Label htmlFor="clip-sentiment">Sentiment</Label>
                <select
                  id="clip-sentiment"
                  value={form.sentiment}
                  onChange={(e) => setForm((f) => ({ ...f, sentiment: e.target.value as Sentiment }))}
                  className="mt-1.5 h-12 w-full rounded-xl border border-edge bg-white px-3 text-base text-navy-900 focus:border-daikin-500 focus:outline-none focus:ring-2 focus:ring-daikin-500/25"
                >
                  {(Object.keys(SENTIMENT_META) as Sentiment[]).map((s) => (
                    <option key={s} value={s}>
                      {SENTIMENT_META[s].label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <Label htmlFor="clip-url">Link</Label>
              <Input
                id="clip-url"
                type="url"
                value={form.url}
                onChange={(e) => setForm((f) => ({ ...f, url: e.target.value }))}
                placeholder="https://"
                className="mt-1.5"
              />
            </div>

            <div>
              <Label htmlFor="clip-notes">Your summary</Label>
              <Textarea
                id="clip-notes"
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                placeholder="What the piece argues, and what it means for positioning"
                className="mt-1.5 min-h-[88px]"
              />
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <Button type="button" variant="ghost" onClick={() => setAddOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">Save clip</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function angleHeadline(attributeLabel: string): string {
  const map: Record<string, string> = {
    "Sound level": "The quiet argument: what a decibel difference actually sounds like at the property line",
    Warranty: "Term versus remedy: why two “10-year” warranties are not the same product promise",
    SEER2: "Beyond the sticker: seasonal efficiency and what a homeowner actually banks",
    "COP @ 5°F": "Cold-weather reality check: what a heat pump delivers when it is 5°F outside",
    "Charge verification without tools": "The efficiency you lose at commissioning — and the tooling that prevents it",
    "Slow loss-of-charge alerting": "The leak nobody notices: catching slow refrigerant loss before the compressor pays for it",
    "Real-time cloud-connected alerts & diagnostics": "Diagnosing before dispatch: what connected service does to a contractor's day",
    "115V air-handler compatibility": "The retrofit nobody budgets for: why the indoor unit's voltage decides the job cost",
  };
  return map[attributeLabel] ?? `${attributeLabel}: what the specification difference means in the field`;
}
