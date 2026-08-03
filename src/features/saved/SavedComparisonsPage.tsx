import * as React from "react";
import { Link, useNavigate } from "react-router-dom";
import { Bookmark, Copy, Trash2, ExternalLink, AlertTriangle } from "lucide-react";
import { formatDateTime, uid } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast";
import { PageHeader } from "@/components/layout/PageHeader";
import { Callout } from "@/components/common/Callout";
import { PRODUCT_BY_ID } from "@/data/catalog";
import { useAuth } from "@/features/auth/AuthProvider";
import { useSelection } from "@/features/selection/SelectionProvider";
import { deleteRow, insertRow, listRows, STORAGE_MODE, type SavedComparison } from "@/lib/store";

export function SavedComparisonsPage() {
  const { user } = useAuth();
  const { replaceAll, recordComparison } = useSelection();
  const { notify } = useToast();
  const navigate = useNavigate();

  const [items, setItems] = React.useState<SavedComparison[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [pendingDelete, setPendingDelete] = React.useState<SavedComparison | null>(null);

  const reload = React.useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setItems(await listRows<SavedComparison>("saved_comparisons", user.email));
    setLoading(false);
  }, [user]);

  React.useEffect(() => {
    void reload();
  }, [reload]);

  async function duplicate(item: SavedComparison) {
    if (!user) return;
    const now = new Date().toISOString();
    await insertRow<SavedComparison>("saved_comparisons", {
      id: uid("cmp"),
      owner_email: user.email,
      name: `${item.name} (copy)`,
      scenario: item.scenario,
      audience: item.audience,
      product_ids: item.product_ids,
      unit_selections: item.unit_selections,
      created_at: now,
      updated_at: now,
    });
    notify("Comparison duplicated.");
    await reload();
  }

  function reopen(item: SavedComparison) {
    replaceAll(item.product_ids, item.unit_selections);
    recordComparison();
    navigate("/compare");
  }

  return (
    <div className="stagger space-y-8">
      <PageHeader
        eyebrow="Saved comparisons"
        title="Your saved product sets"
        description="Each saved comparison keeps the exact product selection and unit sizes, so the evidence you showed once can be reopened unchanged."
        actions={
          <Button asChild variant="secondary" size="lg">
            <Link to="/dashboard">Build a new comparison</Link>
          </Button>
        }
      />

      {STORAGE_MODE === "local" && (
        <Callout className="animate-fade-up [animation-delay:60ms]">
          Supabase is not configured, so saved comparisons persist locally in this browser under your
          account. Add <code className="rounded bg-white/80 px-1.5 py-0.5 font-mono text-xs">VITE_SUPABASE_URL</code>{" "}
          and <code className="rounded bg-white/80 px-1.5 py-0.5 font-mono text-xs">VITE_SUPABASE_ANON_KEY</code> and
          the same records write to your Supabase project instead — no code change required.
        </Callout>
      )}

      {loading ? (
        <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3" aria-hidden>
          {[0, 1, 2].map((i) => (
            <li key={i} className="surface p-5">
              <div className="skeleton h-4 w-2/5" />
              <div className="skeleton mt-3 h-3 w-3/5" />
              <div className="skeleton mt-4 h-9 w-full" />
            </li>
          ))}
        </ul>
      ) : items.length === 0 ? (
        <div className="surface animate-fade-up border-dashed border-navy-200/70 p-12 text-center [animation-delay:100ms]">
          <Bookmark className="mx-auto size-8 text-navy-300" aria-hidden />
          <p className="mt-3 text-lg font-semibold text-navy-700">Nothing saved yet</p>
          <p className="mx-auto mt-1 max-w-md text-base text-navy-500">
            Run a comparison and use <strong>Save comparison</strong> to keep the product set, scenario and
            audience for next time.
          </p>
          <Button asChild className="mt-5">
            <Link to="/dashboard">Start a comparison</Link>
          </Button>
        </div>
      ) : (
        <ul className="grid gap-4 lg:grid-cols-2">
          {items.map((item) => {
            const products = item.product_ids.map((id) => PRODUCT_BY_ID[id]).filter(Boolean);
            const missing = item.product_ids.length - products.length;
            return (
              <li key={item.id} className="surface p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="text-lg font-bold text-navy-900">{item.name}</h2>
                    <p className="mt-0.5 text-sm text-navy-500">
                      Updated {formatDateTime(item.updated_at)}
                    </p>
                  </div>
                  <Badge variant="outline" size="sm">
                    {item.audience}
                  </Badge>
                </div>

                {item.scenario && (
                  <p className="mt-3 rounded-xl bg-navy-50 p-3 text-sm leading-relaxed text-navy-600">
                    {item.scenario}
                  </p>
                )}

                <ul className="mt-4 flex flex-wrap gap-2">
                  {products.map((p) => (
                    <li key={p.id} className="flex items-center gap-2 rounded-xl border border-edge p-2 pr-3">
                      <img
                        src={p.image}
                        alt={`${p.displayName} — representative illustration`}
                        className="size-10 rounded-lg object-cover"
                      />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-navy-900">{p.model}</p>
                        <p className="text-xs text-navy-500">
                          {p.brand}
                          {item.unit_selections[p.id] ? ` · ${item.unit_selections[p.id]} ton` : ""}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>

                {missing > 0 && (
                  <p className="mt-3 flex items-center gap-2 text-sm text-caution-700">
                    <AlertTriangle className="size-4 shrink-0" aria-hidden />
                    {missing} product{missing === 1 ? " is" : "s are"} no longer in the catalog.
                  </p>
                )}

                <div className="mt-5 flex flex-wrap gap-2">
                  <Button onClick={() => reopen(item)} disabled={products.length < 2}>
                    <ExternalLink aria-hidden />
                    Reopen
                  </Button>
                  <Button variant="secondary" onClick={() => duplicate(item)}>
                    <Copy aria-hidden />
                    Duplicate
                  </Button>
                  <Button
                    variant="outlineDanger"
                    onClick={() => setPendingDelete(item)}
                    aria-label={`Delete saved comparison: ${item.name}`}
                  >
                    <Trash2 aria-hidden />
                    Delete
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <Dialog open={Boolean(pendingDelete)} onOpenChange={(open) => !open && setPendingDelete(null)}>
        <DialogContent className="max-w-md">
          <DialogTitle>Delete this saved comparison?</DialogTitle>
          <DialogDescription>
            “{pendingDelete?.name}” will be removed permanently. The products themselves are not affected.
          </DialogDescription>
          <div className="mt-6 flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setPendingDelete(null)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={async () => {
                if (!pendingDelete) return;
                await deleteRow("saved_comparisons", pendingDelete.id);
                setPendingDelete(null);
                notify("Saved comparison deleted.", "info");
                await reload();
              }}
            >
              <Trash2 aria-hidden />
              Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
