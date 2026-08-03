import * as React from "react";
import { Link } from "react-router-dom";
import {
  FileText,
  Copy,
  Check,
  Printer,
  Save,
  Lock,
  Globe,
  ShieldCheck,
  Calculator,
  Megaphone,
  AlertTriangle,
  CircleSlash,
  Trash2,
  Sparkles,
} from "lucide-react";
import { cn, copyText, formatDateTime, uid } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { AiTag } from "@/components/common/AiTag";
import { useAuth } from "@/features/auth/AuthProvider";
import { useSelection } from "@/features/selection/SelectionProvider";
import { deleteRow, insertRow, listRows, type GeneratedBrief } from "@/lib/store";
import {
  AUDIENCES,
  BRIEF_FORMATS,
  briefToText,
  generateBrief,
  type Audience,
  type BriefFormat,
  type BriefSection,
} from "./generate";
import { ExecutiveNewsbrief } from "./ExecutiveNewsbrief";
import { PageHeader } from "@/components/layout/PageHeader";

const SECTION_STYLE: Record<
  BriefSection["kind"],
  { icon: React.ComponentType<{ className?: string }>; card: string; label: string }
> = {
  "VERIFIED FACT": { icon: ShieldCheck, card: "border-verified-500/25 bg-verified-50/70", label: "text-verified-700" },
  "COMPETITIVE ANALYSIS": { icon: Calculator, card: "border-daikin-200 bg-daikin-50/70", label: "text-daikin-800" },
  "INTERNAL RECOMMENDATION": { icon: Lock, card: "border-navy-200 bg-navy-50", label: "text-navy-700" },
  "SUGGESTED MESSAGE": { icon: Megaphone, card: "border-edge bg-white", label: "text-navy-700" },
  "CLAIM REQUIRING VALIDATION": { icon: AlertTriangle, card: "border-caution-500/25 bg-caution-50/70", label: "text-caution-700" },
  "INFORMATION UNAVAILABLE": { icon: CircleSlash, card: "border-edge bg-navy-50", label: "text-navy-500" },
};

export function BriefsPage() {
  const { selected } = useSelection();
  const { user } = useAuth();
  const { notify } = useToast();

  const [mode, setMode] = React.useState<"newsbrief" | "generator">("newsbrief");
  const [format, setFormat] = React.useState<BriefFormat>("competition_brief");
  const [audience, setAudience] = React.useState<Audience>("Dealer");
  const [focusProductId, setFocusProductId] = React.useState<string>("");
  const [drafts, setDrafts] = React.useState<GeneratedBrief[]>([]);
  const [copied, setCopied] = React.useState(false);
  const [saving, setSaving] = React.useState(false);

  const reload = React.useCallback(async () => {
    if (!user) return;
    setDrafts(await listRows<GeneratedBrief>("generated_briefs", user.email));
  }, [user]);

  React.useEffect(() => {
    void reload();
  }, [reload]);

  React.useEffect(() => {
    if (!focusProductId && selected.length) setFocusProductId(selected[0].id);
  }, [selected, focusProductId]);

  const doc = React.useMemo(
    () => (selected.length ? generateBrief(format, audience, selected, focusProductId) : null),
    [format, audience, selected, focusProductId],
  );

  async function saveDraft() {
    if (!user || !doc) return;
    setSaving(true);
    await insertRow<GeneratedBrief>("generated_briefs", {
      id: uid("brief"),
      owner_email: user.email,
      title: doc.title,
      format: doc.format,
      audience: doc.audience,
      product_ids: selected.map((p) => p.id),
      body: briefToText(doc),
      created_at: new Date().toISOString(),
    });
    setSaving(false);
    notify("Draft saved.");
    await reload();
  }

  return (
    <div className="stagger space-y-8">
      <PageHeader
        eyebrow="Briefs & newsletters"
        title={mode === "newsbrief" ? "Executive newsbrief" : "Generate source-backed content"}
        description={
          mode === "newsbrief"
            ? "A daily-brief view of the logged coverage, competitive position and customer voice — ready to put in front of leadership."
            : "Every line is generated from the products you selected and the values recorded in the imported sources, and labelled by what kind of statement it is."
        }
        actions={
        <div role="radiogroup" aria-label="Briefs view" className="segmented no-print inline-flex">
          {(
            [
              { value: "newsbrief", label: "Executive newsbrief" },
              { value: "generator", label: "Brief generator" },
            ] as const
          ).map((opt) => (
            <button
              key={opt.value}
              type="button"
              role="radio"
              aria-checked={mode === opt.value}
              onClick={() => setMode(opt.value)}
              className={cn(
                "inline-flex min-h-[44px] items-center rounded-lg px-4 text-sm font-semibold transition-colors",
                mode === opt.value
                  ? "bg-white text-navy-900 shadow-sm"
                  : "text-navy-600 hover:text-navy-900",
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
        }
      />

      {mode === "newsbrief" && <ExecutiveNewsbrief />}

      {mode === "generator" && (selected.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-edge bg-white p-12 text-center">
          <FileText className="mx-auto size-8 text-navy-300" aria-hidden />
          <p className="mt-3 text-lg font-semibold text-navy-700">No products selected</p>
          <p className="mx-auto mt-1 max-w-md text-base text-navy-500">
            Generated content is built from a product selection, so nothing can be drafted yet.
          </p>
          <Button asChild className="mt-5">
            <Link to="/dashboard">Select products</Link>
          </Button>
        </div>
      ) : (
        <>
          {/* Controls */}
          <section className="surface p-6">
            <div className="grid gap-5 lg:grid-cols-[1.6fr_1fr]">
              <div>
                <Label id="format-label">Format</Label>
                <div className="mt-2 grid gap-2 sm:grid-cols-2 xl:grid-cols-3" role="radiogroup" aria-labelledby="format-label">
                  {BRIEF_FORMATS.map((f) => (
                    <button
                      key={f.value}
                      type="button"
                      role="radio"
                      aria-checked={format === f.value}
                      onClick={() => setFormat(f.value)}
                      className={cn(
                        "rounded-xl border p-3.5 text-left transition-colors",
                        format === f.value
                          ? "border-daikin-500 bg-daikin-50 ring-1 ring-inset ring-daikin-300"
                          : "border-edge bg-white hover:border-daikin-300",
                      )}
                    >
                      <span className="block text-[0.9375rem] font-semibold text-navy-900">{f.label}</span>
                      <span className="mt-0.5 block text-sm leading-relaxed text-navy-500">{f.description}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <Label htmlFor="brief-audience">Audience</Label>
                  <select
                    id="brief-audience"
                    value={audience}
                    onChange={(e) => setAudience(e.target.value as Audience)}
                    className="mt-1.5 h-12 w-full rounded-xl border border-edge bg-white px-3.5 text-base text-navy-900 focus:border-daikin-500 focus:outline-none focus:ring-2 focus:ring-daikin-500/25"
                  >
                    {AUDIENCES.map((a) => (
                      <option key={a}>{a}</option>
                    ))}
                  </select>
                </div>

                {format === "product_one_pager" && (
                  <div>
                    <Label htmlFor="brief-focus">Product</Label>
                    <select
                      id="brief-focus"
                      value={focusProductId}
                      onChange={(e) => setFocusProductId(e.target.value)}
                      className="mt-1.5 h-12 w-full rounded-xl border border-edge bg-white px-3.5 text-base text-navy-900 focus:border-daikin-500 focus:outline-none focus:ring-2 focus:ring-daikin-500/25"
                    >
                      {selected.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.displayName}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="rounded-xl bg-navy-50 p-3.5">
                  <p className="text-xs font-bold uppercase tracking-wider text-navy-400">Built from</p>
                  <ul className="mt-1.5 space-y-1">
                    {selected.map((p) => (
                      <li key={p.id} className="flex items-center gap-2 text-sm text-navy-700">
                        <span className={cn("size-2 rounded-full", p.isDaikin ? "bg-daikin-600" : "bg-navy-300")} />
                        {p.displayName}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </section>

          {/* Draft */}
          {doc && (
            <section aria-label="Generated draft" className="surface">
              <header className="flex flex-wrap items-start justify-between gap-4 border-b border-edge p-6">
                <div className="min-w-0">
                  <h2 className="text-xl font-bold text-navy-900">{doc.title}</h2>
                  <p className="mt-1 text-sm text-navy-500">
                    {BRIEF_FORMATS.find((f) => f.value === doc.format)?.label} · {doc.audience} ·{" "}
                    {formatDateTime(doc.generatedAt)}
                  </p>
                  <Badge variant={doc.internalOnly ? "caution" : "outline"} size="sm" className="mt-2.5">
                    {doc.internalOnly ? <Lock aria-hidden /> : <Globe aria-hidden />}
                    {doc.internalOnly
                      ? "Internal use only — not for external distribution"
                      : "Cleared for customer-facing use after marketing review"}
                  </Badge>
                </div>

                <div className="no-print flex flex-wrap gap-2">
                  <Button
                    variant="secondary"
                    onClick={async () => {
                      const ok = await copyText(briefToText(doc));
                      if (ok) {
                        setCopied(true);
                        window.setTimeout(() => setCopied(false), 1800);
                        notify("Draft copied to clipboard.");
                      } else notify("Could not access the clipboard.", "warning");
                    }}
                  >
                    {copied ? <Check aria-hidden /> : <Copy aria-hidden />}
                    Copy draft
                  </Button>
                  <Button variant="secondary" onClick={() => window.print()}>
                    <Printer aria-hidden />
                    Print / export
                  </Button>
                  <Button onClick={saveDraft} disabled={saving}>
                    <Save aria-hidden />
                    {saving ? "Saving…" : "Save draft"}
                  </Button>
                </div>
              </header>

              <div className="space-y-4 p-6">
                {doc.sections.map((section, i) => {
                  const style = SECTION_STYLE[section.kind];
                  const Icon = style.icon;
                  return (
                    <article key={`${section.kind}-${i}`} className={cn("rounded-xl border p-5", style.card)}>
                      <p className={cn("flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider", style.label)}>
                        <Icon className="size-4" aria-hidden />
                        {section.kind}
                        {section.kind !== "VERIFIED FACT" && section.kind !== "INFORMATION UNAVAILABLE" && (
                          <AiTag kind="generated" />
                        )}
                      </p>
                      <h3 className="mt-2 text-lg font-bold text-navy-900">{section.heading}</h3>
                      <ul className="mt-2.5 space-y-2">
                        {section.lines.map((line, j) => (
                          <li key={j} className="whitespace-pre-line text-[0.9375rem] leading-relaxed text-navy-800">
                            {line}
                          </li>
                        ))}
                      </ul>
                      {section.citations.length > 0 && (
                        <ul className="mt-3 space-y-0.5 border-t border-black/5 pt-2.5">
                          {Array.from(new Set(section.citations)).map((c) => (
                            <li key={c} className="text-xs leading-relaxed text-navy-400">
                              {c}
                            </li>
                          ))}
                        </ul>
                      )}
                    </article>
                  );
                })}

                <footer className="rounded-xl border border-edge bg-navy-50 p-5">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-navy-500">Source list</h3>
                  <ul className="mt-2 space-y-1">
                    {doc.sourceList.map((s) => (
                      <li key={s} className="text-sm leading-relaxed text-navy-600">
                        {s}
                      </li>
                    ))}
                  </ul>
                  <p className="mt-3 text-sm leading-relaxed text-navy-500">
                    Values the source does not record are reported as “Information unavailable” and are never
                    interpreted as “No”.
                  </p>
                </footer>
              </div>
            </section>
          )}
        </>
      ))}

      {/* Saved drafts */}
      <section aria-label="Saved drafts" className="space-y-3">
        <h2 className="text-lg font-semibold text-navy-900">Saved drafts</h2>
        {drafts.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-edge bg-white p-8 text-center text-base text-navy-500">
            Saved drafts appear here. They keep the generated text exactly as it was written.
          </p>
        ) : (
          <ul className="space-y-3">
            {drafts.map((d) => (
              <li key={d.id} className="surface p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-base font-bold text-navy-900">{d.title}</p>
                    <p className="mt-0.5 text-sm text-navy-500">
                      {BRIEF_FORMATS.find((f) => f.value === d.format)?.label} · {d.audience} ·{" "}
                      {formatDateTime(d.created_at)}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={async () => {
                        const ok = await copyText(d.body);
                        notify(ok ? "Draft copied." : "Could not access the clipboard.", ok ? "success" : "warning");
                      }}
                    >
                      <Copy aria-hidden />
                      Copy
                    </Button>
                    <Button
                      variant="ghost"
                      size="iconSm"
                      aria-label={`Delete draft: ${d.title}`}
                      onClick={async () => {
                        await deleteRow("generated_briefs", d.id);
                        notify("Draft deleted.", "info");
                        await reload();
                      }}
                    >
                      <Trash2 aria-hidden />
                    </Button>
                  </div>
                </div>
                <details className="mt-3">
                  <summary className="cursor-pointer text-sm font-semibold text-daikin-700 hover:text-daikin-800">
                    Show draft text
                  </summary>
                  <pre className="mt-2.5 max-h-96 overflow-auto whitespace-pre-wrap rounded-xl bg-navy-50 p-4 text-sm leading-relaxed text-navy-700 scroll-shadow">
                    {d.body}
                  </pre>
                </details>
              </li>
            ))}
          </ul>
        )}
      </section>

      <p className="flex items-center gap-2 text-sm text-navy-400">
        <Sparkles className="size-4" aria-hidden />
        Need a different angle? Open the AI advisor and ask it to reframe a section for a specific audience.
      </p>
    </div>
  );
}
