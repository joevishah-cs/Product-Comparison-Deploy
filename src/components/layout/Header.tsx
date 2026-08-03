import * as React from "react";
import { Link, useNavigate } from "react-router-dom";
import { Menu, Search, Bell, Sparkles, LogOut, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { ProductSearch } from "@/features/selection/ProductSearch";
import { useAuth } from "@/features/auth/AuthProvider";
import { useAiAdvisor } from "@/features/ai/AiAdvisorProvider";

const NOTIFICATIONS = [
  {
    id: "n1",
    title: "Battlecard import complete",
    body: "22 inverter ducted split models imported from Daikin FIT Battlecard.pdf with page and column provenance.",
    tone: "verified" as const,
  },
  {
    id: "n2",
    title: "4 spreadsheet cells excluded",
    body: "Cells I5:L5 in Competitor comparison.xlsx returned a formula error and were excluded from verified values.",
    tone: "caution" as const,
  },
  {
    id: "n3",
    title: "Web-sourced coverage available",
    body: "Curated real articles and reports (retrieved 2026-07-28, each with its original URL) can be added to Analyst Coverage and Press & Media — no coverage is ever invented.",
    tone: "neutral" as const,
  },
];

export function Header({ onOpenMenu }: { onOpenMenu: () => void }) {
  const { user, signOut } = useAuth();
  const { open: openAi } = useAiAdvisor();
  const navigate = useNavigate();

  const [searchOpen, setSearchOpen] = React.useState(false);
  const [notifOpen, setNotifOpen] = React.useState(false);
  const [menuOpen, setMenuOpen] = React.useState(false);

  React.useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearchOpen(true);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <header className="app-header no-print sticky top-0 z-30 border-b border-edge bg-white/85 backdrop-blur-md">
      <div className="mx-auto flex h-[4.5rem] max-w-content items-center gap-3 px-4 sm:px-6 lg:px-8">
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden"
          onClick={onOpenMenu}
          aria-label="Open navigation menu"
        >
          <Menu aria-hidden />
        </Button>

        <img src="/brand/daikin-logo.png" alt="Daikin" className="h-6 w-auto md:hidden" />

        <div className="flex-1" />

        <button
          type="button"
          onClick={() => setSearchOpen(true)}
          className="hidden h-11 w-64 items-center gap-2.5 rounded-xl border border-edge bg-navy-50/70 px-3.5 text-left text-sm text-navy-500 transition-colors hover:border-navy-200 hover:bg-white xl:flex"
        >
          <Search className="size-4 shrink-0" aria-hidden />
          <span className="flex-1 truncate">Search products…</span>
          <kbd className="rounded border border-edge bg-white px-1.5 py-0.5 text-xs font-semibold text-navy-400">
            ⌘K
          </kbd>
        </button>

        <Button
          variant="ghost"
          size="icon"
          className="xl:hidden"
          onClick={() => setSearchOpen(true)}
          aria-label="Search products"
        >
          <Search aria-hidden />
        </Button>

        <Button variant="secondary" size="md" onClick={openAi} className="hidden sm:inline-flex">
          <Sparkles aria-hidden />
          Ask AI
        </Button>
        <Button variant="secondary" size="icon" onClick={openAi} className="sm:hidden" aria-label="Ask AI">
          <Sparkles aria-hidden />
        </Button>

        <div className="relative">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setNotifOpen((v) => !v)}
            aria-label={`Notifications, ${NOTIFICATIONS.length} items`}
            aria-expanded={notifOpen}
          >
            <Bell aria-hidden />
            <span className="absolute right-2 top-2 size-2 rounded-full bg-daikin-600 ring-2 ring-white" />
          </Button>
          {notifOpen && (
            <>
              <button
                type="button"
                className="fixed inset-0 z-40 cursor-default"
                aria-label="Close notifications"
                onClick={() => setNotifOpen(false)}
              />
              <div className="absolute right-0 z-50 mt-2 w-[min(24rem,calc(100vw-2rem))] surface p-2 shadow-pop animate-scale-in">
                <div className="flex items-center justify-between px-3 py-2">
                  <h2 className="text-sm font-bold uppercase tracking-wider text-navy-400">
                    Notifications
                  </h2>
                  <button
                    type="button"
                    onClick={() => setNotifOpen(false)}
                    aria-label="Close notifications"
                    className="rounded p-1 text-navy-400 hover:bg-navy-100"
                  >
                    <X className="size-4" aria-hidden />
                  </button>
                </div>
                <ul className="space-y-1">
                  {NOTIFICATIONS.map((n) => (
                    <li key={n.id} className="rounded-xl px-3 py-2.5 hover:bg-navy-50">
                      <div className="flex items-start gap-2">
                        <Badge variant={n.tone} size="sm">
                          {n.tone === "verified" ? "Import" : n.tone === "caution" ? "Excluded" : "Setup"}
                        </Badge>
                      </div>
                      <p className="mt-1.5 text-sm font-semibold text-navy-900">{n.title}</p>
                      <p className="mt-0.5 text-sm leading-relaxed text-navy-500">{n.body}</p>
                    </li>
                  ))}
                </ul>
              </div>
            </>
          )}
        </div>

        <div className="relative">
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            aria-expanded={menuOpen}
            aria-label={`Account menu for ${user?.name ?? "user"}`}
            className={cn(
              "flex h-11 items-center gap-2.5 rounded-xl px-1.5 transition-colors hover:bg-navy-100",
              menuOpen && "bg-navy-100",
            )}
          >
            <span className="grid size-9 place-items-center rounded-lg bg-daikin-600 text-sm font-bold text-white">
              {user?.initials ?? "?"}
            </span>
            <span className="hidden text-left lg:block">
              <span className="block text-sm font-semibold leading-tight text-navy-900">
                {user?.name}
              </span>
              <span className="block text-xs leading-tight text-navy-400">{user?.role}</span>
            </span>
          </button>
          {menuOpen && (
            <>
              <button
                type="button"
                className="fixed inset-0 z-40 cursor-default"
                aria-label="Close account menu"
                onClick={() => setMenuOpen(false)}
              />
              <div className="absolute right-0 z-50 mt-2 w-64 surface p-2 shadow-pop animate-scale-in">
                <div className="px-3 py-2">
                  <p className="text-sm font-semibold text-navy-900">{user?.name}</p>
                  <p className="truncate text-sm text-navy-500">{user?.email}</p>
                </div>
                <Link
                  to="/saved"
                  onClick={() => setMenuOpen(false)}
                  className="flex min-h-[44px] items-center rounded-lg px-3 text-sm font-medium text-navy-700 hover:bg-navy-50"
                >
                  Saved comparisons
                </Link>
                <button
                  type="button"
                  onClick={async () => {
                    setMenuOpen(false);
                    await signOut();
                    navigate("/login", { replace: true });
                  }}
                  className="flex min-h-[44px] w-full items-center gap-2 rounded-lg px-3 text-left text-sm font-medium text-risk-600 hover:bg-risk-50"
                >
                  <LogOut className="size-4" aria-hidden />
                  Sign out
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      <Dialog open={searchOpen} onOpenChange={setSearchOpen}>
        <DialogContent className="max-w-3xl p-5 sm:p-6">
          <DialogTitle className="sr-only">Search products</DialogTitle>
          <ProductSearch size="md" showFilters showSuggestions />
        </DialogContent>
      </Dialog>
    </header>
  );
}
