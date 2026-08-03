import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * The single page-title treatment used by every route, so eyebrow / heading /
 * description / actions share one rhythm and one entrance animation across the
 * app. Actions sit right on wide screens and wrap beneath the text on narrow
 * ones. Children render below the description for page-specific controls
 * (tab strips, mode toggles, filter rows).
 */
export function PageHeader({
  eyebrow,
  title,
  description,
  meta,
  actions,
  children,
  className,
}: {
  eyebrow: string;
  title: React.ReactNode;
  description?: React.ReactNode;
  /** Small print under the description — scope notes, counts, timestamps. */
  meta?: React.ReactNode;
  actions?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <header className={cn("animate-fade-up", className)}>
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
        <div className="min-w-0 max-w-4xl">
          <p className="eyebrow">{eyebrow}</p>
          <h1 className="mt-2.5 text-balance text-3xl font-bold leading-tight text-navy-900 sm:text-4xl">
            {title}
          </h1>
          {description && (
            <p className="mt-3 text-lg leading-relaxed text-navy-500">{description}</p>
          )}
          {meta && <p className="mt-2 text-sm text-navy-400">{meta}</p>}
        </div>
        {/* `max-w-full` + `[&>*]:max-w-full` keep a long action label (e.g. a
            department name inside a button) from pushing past a narrow
            viewport, since buttons are `whitespace-nowrap` by default. */}
        {actions && (
          <div className="flex max-w-full flex-wrap items-center gap-2 [&>*]:max-w-full">{actions}</div>
        )}
      </div>
      {children && <div className="mt-6">{children}</div>}
    </header>
  );
}
