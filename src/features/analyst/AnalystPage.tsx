import * as React from "react";
import { Plus, Microscope, FileSearch, Trash2, ExternalLink, ArrowRight } from "lucide-react";
import { cn, formatDate, uid } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input, Label, Textarea } from "@/components/ui/input";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast";
import { useAuth } from "@/features/auth/AuthProvider";
import { deleteRow, insertRow, listRows, updateRow, type AnalystNote } from "@/lib/store";
import { useNavigate } from "react-router-dom";
import { SOURCED_ANALYST_ITEMS } from "@/data/web-coverage";
import { PageHeader } from "@/components/layout/PageHeader";

const TRACKS = [
  "Cold-climate heat pump performance",
  "Refrigerant transition",
  "Efficiency regulation & rebates",
  "Installation quality & commissioning",
  "Connected services & diagnostics",
  "Warranty and total cost of ownership",
];

const STATUSES: { value: AnalystNote["status"]; label: string; badge: "neutral" | "daikin" | "caution" | "verified" }[] = [
  { value: "open", label: "Open", badge: "neutral" },
  { value: "in_progress", label: "In progress", badge: "daikin" },
  { value: "evidence_pending", label: "Evidence pending", badge: "caution" },
  { value: "closed", label: "Closed", badge: "verified" },
];

/** Starter questions derived from real gaps and caveats in the imported sources —
 *  not fabricated coverage. Each one cites the observation that raises it. */
const SUGGESTED_QUESTIONS: Omit<AnalystNote, "id" | "owner_email" | "created_at">[] = [
  {
    track: "Cold-climate heat pump performance",
    question:
      "Nine competitor models have no published Max Capacity at 115°F in the battlecard. Can AHRI or manufacturer data close those gaps before we lead with extreme-heat capacity externally?",
    owner_name: "Unassigned",
    status: "open",
    due_date: "",
    connected_report: "Compare page — capacity charts",
    evidence_status: "external_source_required",
    notes: "Raised by blank cells in Daikin FIT Battlecard.pdf, row 'Max Capacity at 115F'.",
  },
  {
    track: "Installation quality & commissioning",
    question:
      "The battlecard notes quiet-mode dBAs are not included and records no measurement distance or condition. What is the exact rating basis for each competitor's published sound level?",
    owner_name: "Unassigned",
    status: "open",
    due_date: "",
    connected_report: "Sound performance comparison",
    evidence_status: "external_source_required",
    notes: "Raised by the source comment on the 'Sound Performance' row.",
  },
  {
    track: "Refrigerant transition",
    question:
      "Five battlecard columns (Infinity 27VNA3, DC5, Signature SL22KLV, Elite EL18KSLV, EVOX) carry no brand line in the source. Confirm the manufacturers so brand-level claims can be made safely.",
    owner_name: "Unassigned",
    status: "open",
    due_date: "",
    connected_report: "Product Explorer",
    evidence_status: "external_source_required",
    notes: "These products currently display 'Information unavailable' for brand.",
  },
  {
    track: "Warranty and total cost of ownership",
    question:
      "Competitor warranty rows record terms but not remedy detail (repair vs replacement, registration conditions). Obtain current warranty documents so the remedy comparison is defensible.",
    owner_name: "Unassigned",
    status: "open",
    due_date: "",
    connected_report: "Warranty coverage comparison",
    evidence_status: "external_source_required",
    notes: "The '12y parts & 12y Repl.' vs '10y parts & 10y Comp' distinction needs primary-source backing.",
  },
  {
    track: "Connected services & diagnostics",
    question:
      "The review export contains no competitor reviews, so review comparisons are one-sided. Can an approved competitor review dataset be licensed to balance the sample?",
    owner_name: "Unassigned",
    status: "open",
    due_date: "",
    connected_report: "User review intelligence",
    evidence_status: "external_source_required",
    notes: "DaikinFitReviews.xlsx covers Daikin FIT product IDs only (1,682 reviews).",
  },
  {
    track: "Efficiency regulation & rebates",
    question:
      "Cells I5:L5 in Competitor comparison.xlsx return #VALUE! and are excluded from verified values. Recover the intended emitter-compatibility figures from the sheet author.",
    owner_name: "Unassigned",
    status: "open",
    due_date: "",
    connected_report: "Hydronic comparison",
    evidence_status: "internal_evidence",
    notes: "Formula-error cells are currently excluded rather than guessed.",
  },
];

const EVIDENCE: { value: AnalystNote["evidence_status"]; label: string; badge: "risk" | "caution" | "verified" }[] = [
  { value: "external_source_required", label: "External source required", badge: "risk" },
  { value: "internal_evidence", label: "Internal evidence only", badge: "caution" },
  { value: "source_linked", label: "Licensed source linked", badge: "verified" },
];

export function AnalystPage() {
  const { user } = useAuth();
  const { notify } = useToast();
  const navigate = useNavigate();

  const [notes, setNotes] = React.useState<AnalystNote[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [addOpen, setAddOpen] = React.useState(false);
  const [statusFilter, setStatusFilter] = React.useState<AnalystNote["status"] | "all">("all");
  const [trackFilter, setTrackFilter] = React.useState<string>("all");

  const [form, setForm] = React.useState({
    track: TRACKS[0],
    question: "",
    owner_name: "",
    status: "open" as AnalystNote["status"],
    due_date: "",
    connected_report: "",
    evidence_status: "external_source_required" as AnalystNote["evidence_status"],
    notes: "",
  });

  const seedSuggested = React.useCallback(
    async (existingQuestions: Set<string>) => {
      if (!user) return 0;
      let added = 0;
      for (const q of [...SOURCED_ANALYST_ITEMS, ...SUGGESTED_QUESTIONS]) {
        if (existingQuestions.has(q.question)) continue;
        await insertRow<AnalystNote>("analyst_notes", {
          id: uid("ana"),
          owner_email: user.email,
          ...q,
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
    let rows = await listRows<AnalystNote>("analyst_notes", user.email);
    // First visit: seed the board with data-derived and source-linked questions
    // so coverage is never empty out of the box. Runs once.
    const SEED_FLAG = "dcmi.v1.analystSeeded";
    if (rows.length === 0 && !window.localStorage.getItem(SEED_FLAG)) {
      // Claim the flag before the first await so StrictMode's double-invoked
      // effect cannot seed twice.
      try {
        window.localStorage.setItem(SEED_FLAG, "1");
      } catch { /* storage unavailable */ }
      await seedSuggested(new Set());
      rows = await listRows<AnalystNote>("analyst_notes", user.email);
    }
    setNotes(rows);
    setLoading(false);
  }, [user, seedSuggested]);

  React.useEffect(() => {
    void reload();
  }, [reload]);

  const filtered = React.useMemo(
    () =>
      notes.filter(
        (n) =>
          (statusFilter === "all" || n.status === statusFilter) &&
          (trackFilter === "all" || n.track === trackFilter),
      ),
    [notes, statusFilter, trackFilter],
  );

  const byTrack = React.useMemo(() => {
    const map = new Map<string, AnalystNote[]>();
    for (const t of TRACKS) map.set(t, []);
    for (const n of notes) map.set(n.track, [...(map.get(n.track) ?? []), n]);
    return Array.from(map.entries());
  }, [notes]);

  async function addSuggested() {
    const added = await seedSuggested(new Set(notes.map((n) => n.question)));
    notify(
      added
        ? `${added} suggested research question${added === 1 ? "" : "s"} added.`
        : "All suggested questions are already on the board.",
    );
    await reload();
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    if (!form.question.trim()) return notify("Add the research question.", "warning");
    if (!form.owner_name.trim()) return notify("Assign an owner.", "warning");

    await insertRow<AnalystNote>("analyst_notes", {
      id: uid("ana"),
      owner_email: user.email,
      ...form,
      created_at: new Date().toISOString(),
    });
    setAddOpen(false);
    setForm((f) => ({ ...f, question: "", owner_name: "", connected_report: "", notes: "", due_date: "" }));
    notify("Research question added.");
    await reload();
  }

  return (
    <div className="stagger space-y-8">
      <PageHeader
        eyebrow="Analyst coverage"
        title="Research tracks and open questions"
        description="The questions your team is working through, who owns them, and whether the evidence behind each one is licensed."
        actions={
          <>
          <Button variant="secondary" size="lg" onClick={() => navigate("/briefs")}>
            <FileSearch aria-hidden />
            Create research brief
          </Button>
          <Button variant="secondary" size="lg" onClick={addSuggested}>
            <Microscope aria-hidden />
            Add suggested questions
          </Button>
            <Button size="lg" onClick={() => setAddOpen(true)}>
              <Plus aria-hidden />
              Add analyst note
            </Button>
          </>
        }
      />

      <div className="flex items-start gap-3 rounded-2xl border border-risk-500/25 bg-risk-50 p-5">
        <ExternalLink className="mt-0.5 size-5 shrink-0 text-risk-600" aria-hidden />
        <div>
          <p className="text-base font-bold text-risk-700">No external analyst coverage is connected</p>
          <p className="mt-1 text-[0.9375rem] leading-relaxed text-navy-700">
            This workspace does not have a licensed analyst feed. Rather than showing invented coverage,
            every research track stays marked <strong>External source required</strong> until someone links
            a real licensed source. Only the two imported product documents are treated as evidence
            anywhere in this application.
          </p>
        </div>
      </div>

      {/* Coverage tracks */}
      <section aria-label="Research coverage tracks">
        <h2 className="text-lg font-semibold text-navy-900">Research coverage tracks</h2>
        <ul className="mt-3 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {byTrack.map(([track, items]) => {
            const linked = items.filter((i) => i.evidence_status === "source_linked").length;
            return (
              <li key={track} className="surface p-5">
                <h3 className="text-base font-bold leading-snug text-navy-900">{track}</h3>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <Badge variant="neutral" size="sm">
                    {items.length} question{items.length === 1 ? "" : "s"}
                  </Badge>
                  <Badge variant={linked > 0 ? "verified" : "risk"} size="sm">
                    {linked > 0 ? `${linked} source-linked` : "External source required"}
                  </Badge>
                </div>
                <button
                  type="button"
                  onClick={() => setTrackFilter(track)}
                  className="mt-3 inline-flex min-h-[44px] items-center gap-1.5 text-sm font-semibold text-daikin-700 hover:text-daikin-800"
                >
                  View questions
                  <ArrowRight className="size-4" aria-hidden />
                </button>
              </li>
            );
          })}
        </ul>
      </section>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 surface p-4">
        <div>
          <label className="sr-only" htmlFor="analyst-track">
            Filter by topic
          </label>
          <select
            id="analyst-track"
            value={trackFilter}
            onChange={(e) => setTrackFilter(e.target.value)}
            className="h-11 min-w-[16rem] rounded-xl border border-edge bg-white px-3 text-base text-navy-800 focus:border-daikin-500 focus:outline-none focus:ring-2 focus:ring-daikin-500/25"
          >
            <option value="all">All topics</option>
            {TRACKS.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
        </div>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by status">
          <button
            type="button"
            onClick={() => setStatusFilter("all")}
            aria-pressed={statusFilter === "all"}
            className={cn(
              "min-h-[44px] rounded-xl border px-3.5 text-sm font-semibold transition-colors",
              statusFilter === "all"
                ? "border-daikin-600 bg-daikin-600 text-white"
                : "border-edge bg-white text-navy-600 hover:border-daikin-300",
            )}
          >
            All statuses
          </button>
          {STATUSES.map((s) => (
            <button
              key={s.value}
              type="button"
              onClick={() => setStatusFilter(s.value)}
              aria-pressed={statusFilter === s.value}
              className={cn(
                "min-h-[44px] rounded-xl border px-3.5 text-sm font-semibold transition-colors",
                statusFilter === s.value
                  ? "border-daikin-600 bg-daikin-600 text-white"
                  : "border-edge bg-white text-navy-600 hover:border-daikin-300",
              )}
            >
              {s.label}
            </button>
          ))}
        </div>
        <p className="ml-auto text-sm font-medium text-navy-500" aria-live="polite">
          {filtered.length} of {notes.length} questions
        </p>
      </div>

      {/* Question list */}
      {loading ? (
        <p className="text-base text-navy-500">Loading research questions…</p>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-edge bg-white p-12 text-center">
          <Microscope className="mx-auto size-8 text-navy-300" aria-hidden />
          <p className="mt-3 text-lg font-semibold text-navy-700">No research questions yet</p>
          <p className="mx-auto mt-1 max-w-md text-base text-navy-500">
            No external analyst feed is connected and nothing is invented in its place. Start with the
            questions the imported data itself raises, or add your own.
          </p>
          <div className="mt-5 flex flex-wrap justify-center gap-2">
            <Button onClick={addSuggested}>
              <Microscope aria-hidden />
              Add suggested questions
            </Button>
            <Button variant="secondary" onClick={() => setAddOpen(true)}>
              <Plus aria-hidden />
              Add your own
            </Button>
          </div>
        </div>
      ) : (
        <div className="overflow-x-auto surface scroll-shadow">
          <table className="table-sleek table-fixed min-w-[1080px]">
            <caption className="sr-only">Open research questions</caption>
            {/* Explicit widths: without them the question column collapses to a
                few words per line while the short columns keep slack. */}
            <colgroup>
              <col className="w-[26rem]" />
              <col className="w-[10rem]" />
              <col className="w-[8rem]" />
              <col className="w-[10.5rem]" />
              <col className="w-[5.5rem]" />
              <col className="w-[12rem]" />
              <col className="w-[11.5rem]" />
              <col className="w-[4.5rem]" />
            </colgroup>
            <thead>
              <tr>
                {["Question", "Track", "Owner", "Status", "Due", "Connected report", "Evidence", ""].map((h) => (
                  <th key={h} scope="col">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((n) => {
                const status = STATUSES.find((s) => s.value === n.status);
                const evidence = EVIDENCE.find((e) => e.value === n.evidence_status);
                return (
                  <tr key={n.id} className="border-b border-edge last:border-b-0 even:bg-navy-50/40">
                    <td className="max-w-sm px-4 py-3.5">
                      <p className="text-[0.9375rem] font-semibold text-navy-900">{n.question}</p>
                      {n.notes && <p className="mt-1 text-sm leading-relaxed text-navy-500">{n.notes}</p>}
                    </td>
                    <td className="px-4 py-3.5 text-sm text-navy-600">{n.track}</td>
                    <td className="px-4 py-3.5 text-sm font-medium text-navy-800">{n.owner_name}</td>
                    <td className="px-4 py-3.5">
                      <label className="sr-only" htmlFor={`status-${n.id}`}>
                        Status for {n.question}
                      </label>
                      <select
                        id={`status-${n.id}`}
                        value={n.status}
                        onChange={async (e) => {
                          await updateRow<AnalystNote>("analyst_notes", n.id, {
                            status: e.target.value as AnalystNote["status"],
                          });
                          await reload();
                        }}
                        className="h-10 w-full rounded-lg border border-edge bg-white px-2 text-center text-sm text-navy-800 focus:border-daikin-500 focus:outline-none focus:ring-2 focus:ring-daikin-500/25"
                      >
                        {STATUSES.map((s) => (
                          <option key={s.value} value={s.value}>
                            {s.label}
                          </option>
                        ))}
                      </select>
                      <span className="sr-only">{status?.label}</span>
                    </td>
                    <td className="px-4 py-3.5 text-sm text-navy-600">
                      {n.due_date ? formatDate(n.due_date) : "Not set"}
                    </td>
                    <td className="px-4 py-3.5 text-sm text-navy-600">
                      {n.connected_report || "None linked"}
                    </td>
                    <td className="px-4 py-3.5">
                      {/* `whitespace-normal` overrides the badge default so a
                          long status label wraps instead of overflowing. */}
                      <Badge
                        variant={evidence?.badge ?? "neutral"}
                        size="sm"
                        className="justify-center whitespace-normal text-center leading-snug"
                      >
                        {evidence?.label}
                      </Badge>
                    </td>
                    <td className="px-4 py-3.5">
                      <Button
                        variant="ghost"
                        size="iconSm"
                        aria-label={`Delete research question: ${n.question}`}
                        onClick={async () => {
                          await deleteRow("analyst_notes", n.id);
                          notify("Research question deleted.", "info");
                          await reload();
                        }}
                      >
                        <Trash2 aria-hidden />
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-xl">
          <DialogTitle>Add an analyst note or research question</DialogTitle>
          <DialogDescription>
            Track an open question and the evidence behind it. Leave the evidence status as “External source
            required” until a licensed source is genuinely linked.
          </DialogDescription>

          <form className="mt-5 space-y-4" onSubmit={submit}>
            <div>
              <Label htmlFor="ana-question">Research question</Label>
              <Textarea
                id="ana-question"
                required
                value={form.question}
                onChange={(e) => setForm((f) => ({ ...f, question: e.target.value }))}
                placeholder="e.g. How do competitor cold-climate capacity claims hold up against published AHRI data?"
                className="mt-1.5"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="ana-track">Track</Label>
                <select
                  id="ana-track"
                  value={form.track}
                  onChange={(e) => setForm((f) => ({ ...f, track: e.target.value }))}
                  className="mt-1.5 h-12 w-full rounded-xl border border-edge bg-white px-3 text-base text-navy-900 focus:border-daikin-500 focus:outline-none focus:ring-2 focus:ring-daikin-500/25"
                >
                  {TRACKS.map((t) => (
                    <option key={t}>{t}</option>
                  ))}
                </select>
              </div>
              <div>
                <Label htmlFor="ana-owner">Owner</Label>
                <Input
                  id="ana-owner"
                  required
                  value={form.owner_name}
                  onChange={(e) => setForm((f) => ({ ...f, owner_name: e.target.value }))}
                  placeholder="Who is chasing this?"
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label htmlFor="ana-due">Due date</Label>
                <Input
                  id="ana-due"
                  type="date"
                  value={form.due_date}
                  onChange={(e) => setForm((f) => ({ ...f, due_date: e.target.value }))}
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label htmlFor="ana-status">Status</Label>
                <select
                  id="ana-status"
                  value={form.status}
                  onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as AnalystNote["status"] }))}
                  className="mt-1.5 h-12 w-full rounded-xl border border-edge bg-white px-3 text-base text-navy-900 focus:border-daikin-500 focus:outline-none focus:ring-2 focus:ring-daikin-500/25"
                >
                  {STATUSES.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <Label htmlFor="ana-report">Connected report</Label>
              <Input
                id="ana-report"
                value={form.connected_report}
                onChange={(e) => setForm((f) => ({ ...f, connected_report: e.target.value }))}
                placeholder="Internal report or brief this feeds"
                className="mt-1.5"
              />
            </div>

            <div>
              <Label htmlFor="ana-evidence">Evidence status</Label>
              <select
                id="ana-evidence"
                value={form.evidence_status}
                onChange={(e) =>
                  setForm((f) => ({ ...f, evidence_status: e.target.value as AnalystNote["evidence_status"] }))
                }
                className="mt-1.5 h-12 w-full rounded-xl border border-edge bg-white px-3 text-base text-navy-900 focus:border-daikin-500 focus:outline-none focus:ring-2 focus:ring-daikin-500/25"
              >
                {EVIDENCE.map((e) => (
                  <option key={e.value} value={e.value}>
                    {e.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <Label htmlFor="ana-notes">Notes</Label>
              <Textarea
                id="ana-notes"
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                placeholder="Working notes, hypotheses, what would settle the question"
                className="mt-1.5 min-h-[88px]"
              />
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <Button type="button" variant="ghost" onClick={() => setAddOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">Add question</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
