import * as React from "react";
import { ArrowUpRight, ArrowDownRight, Minus, Lightbulb, CircleSlash, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { InfoTip } from "@/components/ui/tooltip";
import { AiTag } from "@/components/common/AiTag";

export type BetterDirection = "higher" | "lower" | "none";

export function DirectionBadge({ direction }: { direction: BetterDirection }) {
  if (direction === "none") {
    return (
      <Badge variant="outline" size="sm">
        <Minus aria-hidden />
        Neither higher nor lower is inherently better
      </Badge>
    );
  }
  return (
    <Badge variant="daikin" size="sm">
      {direction === "higher" ? <ArrowUpRight aria-hidden /> : <ArrowDownRight aria-hidden />}
      {direction === "higher" ? "Higher is better" : "Lower is better"}
    </Badge>
  );
}

export function ChartCard({
  title,
  subtitle,
  direction,
  glossaryTerm,
  glossary,
  meaning,
  sources,
  unavailableNote,
  children,
  className,
  actions,
}: {
  title: string;
  subtitle?: string;
  /** Omit to show no direction badge at all -- for cards where "better" doesn't apply. */
  direction?: BetterDirection;
  glossaryTerm?: string;
  glossary?: string;
  meaning: React.ReactNode;
  sources: string[];
  unavailableNote?: string | null;
  children: React.ReactNode;
  className?: string;
  actions?: React.ReactNode;
}) {
  const uniqueSources = Array.from(new Set(sources));
  const [expanded, setExpanded] = React.useState(false);

  return (
    <section
      // `min-w-0` is load-bearing: as a grid/flex item this card would otherwise
      // size to its min-content width (a long title plus a nowrap badge is
      // ~640px) and blow past a narrow column instead of shrinking.
      className={cn("flex min-w-0 flex-col surface p-6", className)}
      aria-label={title}
    >
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="flex items-center gap-1 text-lg font-semibold text-navy-900">
            {title}
            {glossary && glossaryTerm && <InfoTip label={glossaryTerm}>{glossary}</InfoTip>}
          </h3>
          {subtitle && <p className="mt-0.5 text-sm text-navy-500">{subtitle}</p>}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {actions}
          {direction && <DirectionBadge direction={direction} />}
        </div>
      </header>

      <div className="mt-5 flex-1">{children}</div>

      {unavailableNote && (
        <p className="mt-4 flex items-start gap-2 rounded-xl bg-caution-50 px-3.5 py-2.5 text-sm text-caution-700">
          <CircleSlash className="mt-0.5 size-4 shrink-0" aria-hidden />
          <span>{unavailableNote}</span>
        </p>
      )}

      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className={cn(
          "mt-5 flex w-full items-center justify-between rounded-xl p-4 text-left transition-all",
          expanded ? "rounded-b-none bg-daikin-50/80" : "hover:bg-daikin-50/40 bg-daikin-50/60",
        )}
        aria-expanded={expanded}
      >
        <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-daikin-800">
          <Lightbulb className="size-4" aria-hidden />
          What this means
          <AiTag kind="generated" />
        </p>
        <ChevronDown
          className={cn("size-4 shrink-0 text-daikin-700 transition-transform", expanded && "rotate-180")}
          aria-hidden
        />
      </button>

      {expanded && (
        <div className="rounded-b-xl border-t border-daikin-200/50 bg-daikin-50/80 px-4 pb-4 pt-3">
          <p className="text-[0.9375rem] leading-relaxed text-navy-700">{meaning}</p>
        </div>
      )}

      <footer className="mt-3 space-y-1">
        {uniqueSources.map((s) => (
          <p key={s} className="text-xs leading-relaxed text-navy-400">
            Source: {s}
          </p>
        ))}
      </footer>
    </section>
  );
}
