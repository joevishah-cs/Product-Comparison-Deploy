import * as React from "react";
import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  GitCompareArrows,
  Boxes,
  Microscope,
  Globe2,
  Newspaper,
  MessagesSquare,
  FileText,
  Bookmark,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useSelection } from "@/features/selection/SelectionProvider";

export interface NavItem {
  to: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: "selection";
}

export const NAV_GROUPS: { title: string; items: NavItem[] }[] = [
  {
    title: "Workspace",
    items: [
      { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
      { to: "/compare", label: "Compare Products", icon: GitCompareArrows, badge: "selection" },
      { to: "/explorer", label: "Product Explorer", icon: Boxes },
    ],
  },
  {
    title: "Intelligence",
    items: [
      { to: "/brand", label: "Brand Intelligence", icon: Globe2 },
      { to: "/analyst", label: "Analyst Coverage", icon: Microscope },
      { to: "/press", label: "Press & Media", icon: Newspaper },
      { to: "/reviews", label: "User Reviews", icon: MessagesSquare },
      { to: "/briefs", label: "Briefs & Newsletters", icon: FileText },
      { to: "/saved", label: "Saved Comparisons", icon: Bookmark },
    ],
  },
];

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const { selectedIds } = useSelection();

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-3 px-6 pb-6 pt-7">
        <img
          src="/brand/daikin-logo.png"
          alt="Daikin"
          className="h-8 w-auto"
          width={1168}
          height={244}
        />
      </div>

      <p className="px-6 pb-6 text-xs font-semibold uppercase leading-relaxed tracking-[0.14em] text-navy-400">
        Competitive Marketing
        <br />
        Intelligence
      </p>

      <nav className="flex-1 space-y-7 overflow-y-auto px-3 pb-6 scroll-shadow" aria-label="Primary">
        {NAV_GROUPS.map((group) => (
          <div key={group.title}>
            <h2 className="px-3 pb-2 text-xs font-bold uppercase tracking-[0.14em] text-navy-400">
              {group.title}
            </h2>
            <ul className="space-y-1">
              {group.items.map((item) => (
                <li key={item.to}>
                  <NavLink
                    to={item.to}
                    onClick={onNavigate}
                    className={({ isActive }) =>
                      cn(
                        "flex min-h-[44px] items-center gap-3 rounded-xl px-3 text-[0.9375rem] font-medium transition-colors",
                        isActive
                          ? "bg-daikin-50 text-daikin-800 shadow-[inset_0_0_0_1px_theme(colors.daikin.200)]"
                          : "text-navy-600 hover:bg-navy-100/70 hover:text-navy-900",
                      )
                    }
                  >
                    {({ isActive }) => (
                      <>
                        <item.icon
                          className={cn("size-[18px] shrink-0", isActive ? "text-daikin-600" : "text-navy-400")}
                        />
                        <span className="flex-1 truncate">{item.label}</span>
                        {item.badge === "selection" && selectedIds.length > 0 && (
                          <span
                            className={cn(
                              "inline-flex h-6 min-w-6 items-center justify-center rounded-full px-1.5 text-xs font-bold",
                              isActive ? "bg-daikin-600 text-white" : "bg-navy-200 text-navy-700",
                            )}
                          >
                            {selectedIds.length}
                          </span>
                        )}
                      </>
                    )}
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>
    </div>
  );
}

export function Sidebar() {
  return (
    <aside className="no-print fixed inset-y-0 left-0 z-40 hidden w-[260px] border-r border-edge bg-white lg:block">
      <SidebarContent />
    </aside>
  );
}

export function MobileSidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="no-print fixed inset-0 z-[100] lg:hidden">
      <button
        type="button"
        aria-label="Close navigation"
        onClick={onClose}
        className="absolute inset-0 bg-navy-950/40 backdrop-blur-[2px]"
      />
      <div className="absolute inset-y-0 left-0 w-[280px] max-w-[85vw] border-r border-edge bg-white shadow-pop">
        <button
          type="button"
          onClick={onClose}
          aria-label="Close navigation"
          className="absolute right-3 top-4 inline-flex size-11 items-center justify-center rounded-lg text-navy-500 hover:bg-navy-100"
        >
          <X className="size-5" aria-hidden />
        </button>
        <SidebarContent onNavigate={onClose} />
      </div>
    </div>
  );
}
