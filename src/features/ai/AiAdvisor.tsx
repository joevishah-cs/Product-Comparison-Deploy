import * as React from "react";
import { Sparkles, X, Send, Copy, Check, ShieldCheck, Calculator, Brain, Megaphone, AlertTriangle, CircleSlash, MessagesSquare, Home, Handshake, ExternalLink } from "lucide-react";
import { cn, copyText, uid } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/toast";
import { useSelection } from "@/features/selection/SelectionProvider";
import { useAiAdvisor } from "./AiAdvisorProvider";
import {
  HOMEOWNER_QUESTIONS,
  INTERNAL_QUESTIONS,
  answerLocally,
  type AdvisorAnswer,
  type AnswerSectionKind,
} from "./answers";
import { useReviewSource } from "@/features/reviews/useReviewSource";
import { useHomeowner } from "@/features/homeowner/HomeownerProvider";
import type { ReviewSource } from "@/data/review-types";
import { PRIORITY_BY_KEY } from "@/features/homeowner/homeownerEngine";
import { AiTag } from "@/components/common/AiTag";
import { insertRow, type ChatMessageRecord } from "@/lib/store";
import { useAuth } from "@/features/auth/AuthProvider";
import { askLlm, isLlmConfigured } from "./llmClient";

interface ChatTurn {
  id: string;
  role: "user" | "assistant";
  text?: string;
  answer?: AdvisorAnswer;
}

const SECTION_STYLE: Record<AnswerSectionKind, { icon: React.ComponentType<{ className?: string }>; className: string; badge: string }> = {
  "VERIFIED PRODUCT FACT": { icon: ShieldCheck, className: "border-verified-500/25 bg-verified-50", badge: "text-verified-700" },
  "CALCULATED COMPARISON": { icon: Calculator, className: "border-daikin-200 bg-daikin-50", badge: "text-daikin-800" },
  "REVIEW-BASED INSIGHT": { icon: MessagesSquare, className: "border-navy-200 bg-white", badge: "text-navy-700" },
  "HOMEOWNER BENEFIT EXPLANATION": { icon: Home, className: "border-daikin-200 bg-daikin-50/60", badge: "text-daikin-800" },
  "SALES RECOMMENDATION": { icon: Handshake, className: "border-verified-500/25 bg-verified-50/60", badge: "text-verified-700" },
  "AI ANALYTICAL INSIGHT": { icon: Brain, className: "border-navy-200 bg-navy-50", badge: "text-navy-700" },
  "SUGGESTED MARKETING MESSAGE": { icon: Megaphone, className: "border-daikin-200 bg-white", badge: "text-daikin-800" },
  "CLAIM REQUIRING VALIDATION": { icon: AlertTriangle, className: "border-caution-500/25 bg-caution-50", badge: "text-caution-700" },
  "INFORMATION UNAVAILABLE": { icon: CircleSlash, className: "border-edge bg-navy-50", badge: "text-navy-500" },
};

async function askAdvisor(
  question: string,
  products: ReturnType<typeof useSelection>["selected"],
  reviewSource: ReviewSource | null,
  view: "internal" | "homeowner",
): Promise<AdvisorAnswer> {
  const grounding = answerLocally(question, products, reviewSource, view);

  if (!isLlmConfigured) return grounding;

  const llmProducts = products.map((p) => ({
    id: p.id,
    name: p.displayName,
    isDaikin: p.isDaikin,
    equipmentType: p.equipmentType,
    attributes: Object.fromEntries(
      Object.entries(p.attributes).map(([k, v]) => [
        k,
        { value: v.status === "verified" ? v.display : null, citation: v.source.citation },
      ]),
    ),
  }));

  return askLlm(question, llmProducts, grounding, view);
}

function AnswerBlock({ answer }: { answer: AdvisorAnswer }) {
  const { notify } = useToast();
  const [copiedId, setCopiedId] = React.useState<string | null>(null);

  return (
    <div className="space-y-2.5">
      {answer.sections.map((section, i) => {
        const style = SECTION_STYLE[section.kind];
        const Icon = style.icon;
        const key = `${section.kind}-${i}`;
        return (
          <div key={key} className={cn("rounded-xl border p-3.5", style.className)}>
            <div className="flex items-start justify-between gap-2">
              <p className={cn("flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider", style.badge)}>
                <Icon className="size-3.5" aria-hidden />
                {section.kind}
                {section.kind !== "VERIFIED PRODUCT FACT" && section.kind !== "INFORMATION UNAVAILABLE" && (
                  <AiTag kind={section.kind === "REVIEW-BASED INSIGHT" ? "derived" : "generated"} />
                )}
              </p>
              <button
                type="button"
                aria-label={`Copy ${section.kind.toLowerCase()}`}
                onClick={async () => {
                  const ok = await copyText(
                    `${section.kind}\n${section.body}${section.citations.length ? `\n\nSources:\n${section.citations.join("\n")}` : ""}`,
                  );
                  if (ok) {
                    setCopiedId(key);
                    window.setTimeout(() => setCopiedId(null), 1800);
                    notify("Copied to clipboard.");
                  } else notify("Could not access the clipboard.", "warning");
                }}
                className="shrink-0 rounded-md p-1 text-navy-400 transition-colors hover:bg-white/70 hover:text-navy-700"
              >
                {copiedId === key ? <Check className="size-4" aria-hidden /> : <Copy className="size-4" aria-hidden />}
              </button>
            </div>
            <p className="mt-1.5 whitespace-pre-line text-[0.9375rem] leading-relaxed text-navy-800">{section.body}</p>

            {section.evidence && (
              <dl className="mt-2.5 grid grid-cols-2 gap-x-3 gap-y-1 rounded-lg bg-white/70 p-2.5 text-xs">
                <dt className="text-navy-500">Reviews analysed</dt>
                <dd className="text-right font-semibold text-navy-900">{section.evidence.reviewsAnalysed}</dd>
                <dt className="text-navy-500">Match level</dt>
                <dd className="text-right font-semibold text-navy-900">{section.evidence.matchLabel}</dd>
                <dt className="text-navy-500">Confidence</dt>
                <dd className="text-right font-semibold text-navy-900">
                  {section.evidence.confidence === "strong"
                    ? "Strong"
                    : section.evidence.confidence === "moderate"
                      ? "Moderate"
                      : section.evidence.confidence === "limited"
                        ? "Limited"
                        : "Insufficient"}
                </dd>
                <dt className="text-navy-500">Feedback is about</dt>
                <dd className="text-right font-semibold text-navy-900">{section.evidence.subjects}</dd>
                {section.evidence.themes.length > 0 && (
                  <>
                    <dt className="col-span-2 mt-1 text-navy-500">Supporting themes</dt>
                    <dd className="col-span-2 font-medium text-navy-800">
                      {section.evidence.themes.join(", ")}
                    </dd>
                  </>
                )}
                <dd className="col-span-2 mt-1">
                  <a
                    href="#user-review-intelligence"
                    className="inline-flex items-center gap-1 font-semibold text-daikin-700 hover:text-daikin-800"
                  >
                    <ExternalLink className="size-3" aria-hidden />
                    View reviews
                  </a>
                </dd>
              </dl>
            )}

            {section.citations.length > 0 && (
              <ul className="mt-2 space-y-0.5 border-t border-black/5 pt-2">
                {section.citations.map((c) => (
                  <li key={c} className="text-xs leading-relaxed text-navy-400">
                    {c}
                  </li>
                ))}
              </ul>
            )}
          </div>
        );
      })}
    </div>
  );
}

export function AiAdvisor() {
  const { isOpen, open, close } = useAiAdvisor();
  const { selected, unitSelections } = useSelection();
  const { user } = useAuth();
  const { source: reviewSource } = useReviewSource();
  const { view, config } = useHomeowner();
  const [turns, setTurns] = React.useState<ChatTurn[]>([]);
  const [input, setInput] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const sessionId = React.useRef(uid("chat"));
  const endRef = React.useRef<HTMLDivElement>(null);
  const panelRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (isOpen) endRef.current?.scrollIntoView({ block: "end" });
  }, [turns, isOpen]);

  React.useEffect(() => {
    if (!isOpen) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") close();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, close]);

  const send = React.useCallback(
    async (question: string) => {
      const trimmed = question.trim();
      if (!trimmed || busy) return;
      setInput("");
      setTurns((prev) => [...prev, { id: uid("turn"), role: "user", text: trimmed }]);
      setBusy(true);

      if (user) {
        void insertRow<ChatMessageRecord>("chat_messages", {
          session_id: sessionId.current,
          owner_email: user.email,
          role: "user",
          content: trimmed,
          created_at: new Date().toISOString(),
        });
      }

      const answer = await askAdvisor(trimmed, selected, reviewSource, view);
      setTurns((prev) => [...prev, { id: uid("turn"), role: "assistant", answer }]);
      setBusy(false);

      if (user) {
        void insertRow<ChatMessageRecord>("chat_messages", {
          session_id: sessionId.current,
          owner_email: user.email,
          role: "assistant",
          content: answer.sections.map((s) => `${s.kind}: ${s.body}`).join("\n\n"),
          created_at: new Date().toISOString(),
        });
      }
    },
    [busy, selected, user, reviewSource, view],
  );

  return (
    <>
      {!isOpen && (
        <button
          type="button"
          onClick={open}
          aria-label="Open the AI competitive advisor"
          className="no-print fixed bottom-6 right-6 z-[70] flex size-16 items-center justify-center rounded-full bg-daikin-600 text-white shadow-pop transition-transform hover:scale-105 hover:bg-daikin-700 focus-visible:ring-4 focus-visible:ring-daikin-500/30"
        >
          <Sparkles className="size-7" aria-hidden />
        </button>
      )}

      {isOpen && (
        <div
          ref={panelRef}
          role="dialog"
          aria-modal="false"
          aria-label="AI competitive advisor"
          className="no-print fixed bottom-0 right-0 z-[70] flex h-[min(46rem,100dvh)] w-full flex-col border-l border-t border-edge bg-white shadow-pop animate-fade-up sm:bottom-6 sm:right-6 sm:h-[min(42rem,calc(100dvh-3rem))] sm:w-[27rem] sm:rounded-2xl sm:border"
        >
          <header className="flex items-start gap-3 border-b border-edge p-4">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-daikin-600 text-white">
              <Sparkles className="size-5" aria-hidden />
            </span>
            <div className="min-w-0 flex-1">
              <h2 className="text-base font-semibold text-navy-900">AI Competitive Advisor</h2>
              <p className="truncate text-sm text-navy-500">
                {selected.length
                  ? `${view === "homeowner" ? "Homeowner view" : "Internal view"} · ${selected.length} product${selected.length === 1 ? "" : "s"}`
                  : "No products selected"}
              </p>
            </div>
            <Button variant="ghost" size="iconSm" onClick={close} aria-label="Close the AI advisor">
              <X aria-hidden />
            </Button>
          </header>

          <div className="flex-1 space-y-4 overflow-y-auto p-4 scroll-shadow">
            {turns.length === 0 && (
              <div className="space-y-3">
                <div className="rounded-xl border border-edge bg-navy-50/70 p-4">
                  <p className="text-[0.9375rem] leading-relaxed text-navy-700">
                    I answer only from the two imported source documents and the calculations this app
                    performs on them. Every factual line carries its citation, and anything the sources do
                    not record is returned as “Information unavailable”.
                  </p>
                </div>
                {selected.length > 0 && (
                  <div className="rounded-xl border border-edge p-3.5">
                    <p className="text-xs font-bold uppercase tracking-wider text-navy-400">Chat context</p>
                    <ul className="mt-1.5 space-y-1">
                      {selected.map((p) => (
                        <li key={p.id} className="flex items-center gap-2 text-sm text-navy-700">
                          <span className={cn("size-2 rounded-full", p.isDaikin ? "bg-daikin-600" : "bg-navy-300")} />
                          {p.displayName}
                          {unitSelections[p.id] && (
                            <span className="text-navy-500">· {unitSelections[p.id]} ton</span>
                          )}
                        </li>
                      ))}
                    </ul>
                    {view === "homeowner" && config.priorities.length > 0 && (
                      <>
                        <p className="mt-2.5 text-xs font-bold uppercase tracking-wider text-navy-400">
                          Homeowner priorities
                        </p>
                        <p className="mt-1 text-sm text-navy-700">
                          {config.priorities
                            .map((k) => PRIORITY_BY_KEY[k]?.label ?? k)
                            .join(", ")}
                        </p>
                      </>
                    )}
                  </div>
                )}
                <div>
                  <p className="mb-2 text-xs font-bold uppercase tracking-wider text-navy-400">
                    Suggested questions
                  </p>
                  <div className="flex flex-col gap-2">
                    {(view === "homeowner" ? HOMEOWNER_QUESTIONS : INTERNAL_QUESTIONS).map((q) => (
                      <button
                        key={q}
                        type="button"
                        onClick={() => void send(q)}
                        className="min-h-[44px] rounded-xl border border-edge px-3.5 py-2.5 text-left text-sm font-medium text-navy-700 transition-colors hover:border-daikin-300 hover:bg-daikin-50 hover:text-daikin-800"
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {turns.map((turn) =>
              turn.role === "user" ? (
                <div key={turn.id} className="flex justify-end">
                  <p className="max-w-[85%] rounded-2xl rounded-br-md bg-daikin-600 px-4 py-2.5 text-[0.9375rem] text-white">
                    {turn.text}
                  </p>
                </div>
              ) : (
                <div key={turn.id}>{turn.answer && <AnswerBlock answer={turn.answer} />}</div>
              ),
            )}

            {busy && (
              <p className="flex items-center gap-2 text-sm text-navy-500">
                <span className="size-2 animate-pulse rounded-full bg-daikin-500" />
                Checking the source records…
              </p>
            )}
            <div ref={endRef} />
          </div>

          <form
            className="border-t border-edge p-3"
            onSubmit={(e) => {
              e.preventDefault();
              void send(input);
            }}
          >
            <div className="flex items-end gap-2">
              <label className="sr-only" htmlFor="ai-input">
                Ask the competitive advisor a question
              </label>
              <textarea
                id="ai-input"
                value={input}
                rows={1}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    void send(input);
                  }
                }}
                placeholder="Ask about the selected products…"
                className="max-h-32 min-h-[44px] flex-1 resize-none rounded-xl border border-edge px-3.5 py-2.5 text-[0.9375rem] text-navy-900 placeholder:text-navy-400 focus:border-daikin-400 focus:outline-none focus:ring-2 focus:ring-daikin-500/25"
              />
              <Button type="submit" size="icon" disabled={!input.trim() || busy} aria-label="Send question">
                <Send aria-hidden />
              </Button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}

export { Badge };
