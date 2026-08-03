import * as React from "react";
import { Outlet, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Sidebar, MobileSidebar } from "./Sidebar";
import { Header } from "./Header";
import { AmbientScene } from "@/components/layout/AmbientScene";
import { AiAdvisor } from "@/features/ai/AiAdvisor";

/** The saturated blue scene is reserved for the dashboard. Working pages stay
 *  near-white so dense tables and charts read at full contrast. */
const RICH_SCENE_ROUTES = new Set(["/dashboard"]);

export function AppShell() {
  const [menuOpen, setMenuOpen] = React.useState(false);
  const { pathname } = useLocation();
  const richScene = RICH_SCENE_ROUTES.has(pathname);

  // Print/export: expand every disclosure (FAQ, technical-rating details, source
  // evidence) so the PDF contains their content, then restore the on-screen state.
  React.useEffect(() => {
    const touched: HTMLDetailsElement[] = [];
    const before = () => {
      document.querySelectorAll<HTMLDetailsElement>("details:not([open])").forEach((d) => {
        d.open = true;
        touched.push(d);
      });
    };
    const after = () => {
      touched.splice(0).forEach((d) => {
        d.open = false;
      });
    };
    window.addEventListener("beforeprint", before);
    window.addEventListener("afterprint", after);
    return () => {
      window.removeEventListener("beforeprint", before);
      window.removeEventListener("afterprint", after);
    };
  }, []);

  return (
    <div className={cn("min-h-screen", richScene && "scene-rich")}>
      {richScene && <AmbientScene />}

      <a
        href="#main-content"
        className="no-print sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[200] focus:rounded-lg focus:bg-daikin-600 focus:px-4 focus:py-2.5 focus:text-white"
      >
        Skip to main content
      </a>

      <Sidebar />
      <MobileSidebar open={menuOpen} onClose={() => setMenuOpen(false)} />

      <div className="relative lg:pl-[260px] print:pl-0">
        <Header onOpenMenu={() => setMenuOpen(true)} />
        <main id="main-content" className="mx-auto max-w-content px-4 py-8 sm:px-6 lg:px-8 print-full">
          <Outlet />
        </main>
      </div>

      <AiAdvisor />
    </div>
  );
}
