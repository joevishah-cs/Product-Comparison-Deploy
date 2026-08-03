import * as React from "react";
import { createPortal } from "react-dom";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import type { ReportSlide } from "./HomeownerView";

/**
 * Full-screen, one-section-at-a-time presentation for showing the report on a
 * laptop or tablet. Application navigation and every internal control are hidden.
 */
export function PresentationMode({ slides, onExit }: { slides: ReportSlide[]; onExit: () => void }) {
  const [index, setIndex] = React.useState(0);
  const contentRef = React.useRef<HTMLDivElement>(null);

  const clamped = Math.min(index, Math.max(slides.length - 1, 0));
  const slide = slides[clamped];

  const go = React.useCallback(
    (delta: number) => {
      setIndex((i) => Math.min(Math.max(i + delta, 0), slides.length - 1));
      contentRef.current?.scrollTo({ top: 0 });
    },
    [slides.length],
  );

  React.useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onExit();
      else if (e.key === "ArrowRight" || e.key === "PageDown") go(1);
      else if (e.key === "ArrowLeft" || e.key === "PageUp") go(-1);
    }
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [go, onExit]);

  if (!slide) {
    return createPortal(
      <div className="theme-scene fixed inset-0 z-[200] grid place-items-center p-8 text-center">
        <div>
          <p className="text-xl font-semibold text-navy-800">
            There is nothing to present with the current section settings.
          </p>
          <Button className="mt-5" onClick={onExit}>
            Exit presentation
          </Button>
        </div>
      </div>,
      document.body,
    );
  }

  return createPortal(
    <div className="theme-scene no-print fixed inset-0 z-[200] flex flex-col text-[1.0625rem]">
      {/* Header — Daikin branding stays visible, nothing internal does */}
      <header className="flex shrink-0 items-center justify-between gap-4 border-b border-edge px-6 py-4">
        <img src="/brand/daikin-logo.png" alt="Daikin" className="h-8 w-auto" />
        <p className="hidden text-base font-semibold text-navy-500 sm:block">{slide.title}</p>
        <Button variant="ghost" onClick={onExit} aria-label="Exit presentation mode">
          <X aria-hidden />
          Exit presentation
        </Button>
      </header>

      {/* One section at a time, with larger type */}
      <div
        ref={contentRef}
        className="flex-1 overflow-y-auto scroll-shadow"
        role="region"
        aria-label={`Slide ${clamped + 1} of ${slides.length}: ${slide.title}`}
        aria-live="polite"
      >
        <div className="mx-auto max-w-5xl px-6 py-10 sm:px-10 sm:py-14 [&_h2]:text-4xl [&_h3]:text-2xl">
          {slide.node}
        </div>
      </div>

      {/* Controls */}
      <footer className="flex shrink-0 items-center justify-between gap-4 border-t border-edge bg-navy-50/70 px-6 py-4">
        <Button
          variant="secondary"
          size="lg"
          onClick={() => go(-1)}
          disabled={clamped === 0}
          aria-label="Previous section"
        >
          <ChevronLeft aria-hidden />
          Previous
        </Button>

        <nav aria-label="Sections" className="hidden flex-1 items-center justify-center gap-1.5 md:flex">
          {slides.map((s, i) => (
            <button
              key={s.key}
              type="button"
              onClick={() => {
                setIndex(i);
                contentRef.current?.scrollTo({ top: 0 });
              }}
              aria-label={`Go to ${s.title}`}
              aria-current={i === clamped}
              className={cn(
                "h-2.5 rounded-full transition-all",
                i === clamped ? "w-8 bg-daikin-600" : "w-2.5 bg-navy-200 hover:bg-navy-300",
              )}
            />
          ))}
        </nav>

        <p className="text-base font-semibold text-navy-600 md:hidden">
          {clamped + 1} / {slides.length}
        </p>

        <Button size="lg" onClick={() => go(1)} disabled={clamped === slides.length - 1} aria-label="Next section">
          Next
          <ChevronRight aria-hidden />
        </Button>
      </footer>
    </div>,
    document.body,
  );
}
