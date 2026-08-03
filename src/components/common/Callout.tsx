import * as React from "react";
import { Info, AlertTriangle, ShieldCheck, Ban } from "lucide-react";
import { cn } from "@/lib/utils";

const TONE = {
  info: {
    box: "border-daikin-200/70 bg-daikin-50/70 text-navy-700",
    chip: "bg-daikin-100 text-daikin-700",
    title: "text-daikin-800",
    icon: Info,
  },
  caution: {
    box: "border-caution-500/25 bg-caution-50/80 text-caution-700",
    chip: "bg-caution-100 text-caution-700",
    title: "text-caution-700",
    icon: AlertTriangle,
  },
  risk: {
    box: "border-risk-500/25 bg-risk-50/80 text-risk-700",
    chip: "bg-risk-100 text-risk-700",
    title: "text-risk-700",
    icon: Ban,
  },
  verified: {
    box: "border-verified-500/25 bg-verified-50/80 text-verified-700",
    chip: "bg-verified-100 text-verified-700",
    title: "text-verified-700",
    icon: ShieldCheck,
  },
} as const;

/**
 * The one notice treatment used across the app — configuration notes, synthetic
 * data warnings, excluded-cell disclosures. Keeping them in one component stops
 * each page inventing its own box.
 */
export function Callout({
  tone = "info",
  title,
  children,
  className,
}: {
  tone?: keyof typeof TONE;
  title?: string;
  children: React.ReactNode;
  className?: string;
}) {
  const t = TONE[tone];
  const Icon = t.icon;

  return (
    <div
      className={cn(
        "flex items-start gap-3 rounded-2xl border px-4 py-3.5 backdrop-blur-sm",
        t.box,
        className,
      )}
    >
      <span className={cn("mt-px grid size-7 shrink-0 place-items-center rounded-lg", t.chip)}>
        <Icon className="size-4" aria-hidden />
      </span>
      <div className="min-w-0 flex-1 text-sm leading-relaxed">
        {title && (
          <p className={cn("mb-1 text-xs font-bold uppercase tracking-[0.12em]", t.title)}>{title}</p>
        )}
        {children}
      </div>
    </div>
  );
}
