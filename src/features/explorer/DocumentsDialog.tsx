import * as React from "react";
import { FileText, Download, ExternalLink } from "lucide-react";
import { Dialog, DialogContent, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { documentsForProduct } from "@/data/documents";
import type { EquipmentType } from "@/data/types";

export function DocumentsDialog({
  brand,
  equipmentType,
  productLabel,
  trigger,
}: {
  brand: string;
  equipmentType: EquipmentType;
  productLabel: string;
  trigger: React.ReactNode;
}) {
  const docs = documentsForProduct({ brand, equipmentType });
  if (docs.length === 0) return null;

  const grouped = React.useMemo(() => {
    const map = new Map<string, typeof docs>();
    for (const doc of docs) {
      map.set(doc.category, [...(map.get(doc.category) ?? []), doc]);
    }
    return Array.from(map.entries());
  }, [docs]);

  return (
    <Dialog>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogTitle>Documents</DialogTitle>
        <DialogDescription>
          Literature available for {productLabel}. Open a document to view it, or download it for offline use.
        </DialogDescription>

        <div className="mt-5 space-y-5">
          {grouped.map(([category, items]) => (
            <div key={category}>
              <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-navy-400">{category}</h3>
              <ul className="space-y-1.5">
                {items.map((doc) => (
                  <li
                    key={doc.file}
                    className="flex items-center gap-3 rounded-xl border border-edge bg-white px-3.5 py-2.5"
                  >
                    <FileText className="size-4 shrink-0 text-daikin-500" aria-hidden />
                    <span className="flex-1 text-sm font-medium text-navy-700">{doc.label}</span>
                    <a
                      href={doc.file}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-semibold text-daikin-700 hover:bg-daikin-50"
                      aria-label={`View ${doc.label}`}
                    >
                      <ExternalLink className="size-3.5" aria-hidden />
                      View
                    </a>
                    <a
                      href={doc.file}
                      download
                      className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-semibold text-navy-600 hover:bg-navy-100"
                      aria-label={`Download ${doc.label}`}
                    >
                      <Download className="size-3.5" aria-hidden />
                      Download
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
