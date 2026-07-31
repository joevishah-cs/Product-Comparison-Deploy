/** Real product literature copied from the vendor launch packages in datasets-1/.
 *  Scoped per brand family for air-to-water heat pumps — each brand currently
 *  has one product row in the catalog, and shared components (hydrobox, DHW
 *  tank, etc.) apply across that brand's whole A2WHP lineup. */

export interface ProductDocument {
  label: string;
  category: string;
  file: string;
}

/** Keyed by `${equipmentType}:${brand}` — brand name alone is ambiguous because
 *  "Daikin" spans both the ducted-split FIT lineup (BATTLECARD) and the
 *  air-to-water Altherma lineup (A2W); their literature must never mix. */
export const BRAND_DOCUMENTS: Record<string, ProductDocument[]> = {
  "air_to_water_hp:Daikin": [
    { label: "Outdoor unit installation manual", category: "Manuals", file: "/docs/daikin-a2w/Outdoor-Unit-Installation-Manual.pdf" },
    { label: "Service manual", category: "Manuals", file: "/docs/daikin-a2w/Service-Manual.pdf" },
    { label: "Engineering manual", category: "Manuals", file: "/docs/daikin-a2w/Engineering-Manual.pdf" },
    { label: "Hydrobox installation manual", category: "Manuals", file: "/docs/daikin-a2w/Hydrobox-Installation-Manual.pdf" },
    { label: "Hydrobox user reference guide", category: "Manuals", file: "/docs/daikin-a2w/Hydrobox-User-Reference-Guide.pdf" },
    { label: "Hydrobox installer reference guide", category: "Manuals", file: "/docs/daikin-a2w/Hydrobox-Installer-Reference-Guide.pdf" },
    { label: "Consumer brochure", category: "Marketing", file: "/docs/daikin-a2w/Consumer-Brochure.pdf" },
    { label: "Product flyer", category: "Marketing", file: "/docs/daikin-a2w/Product-Flyer.pdf" },
    { label: "Design & application guide", category: "Marketing", file: "/docs/daikin-a2w/Design-Application-Guide.pdf" },
    { label: "Submittal — UPRA036DAVK", category: "Submittal datasheets", file: "/docs/daikin-a2w/Submittal-UPRA036DAVK.pdf" },
    { label: "Submittal — UPRA043DAVK", category: "Submittal datasheets", file: "/docs/daikin-a2w/Submittal-UPRA043DAVK.pdf" },
    { label: "Warranty certificate", category: "Warranty", file: "/docs/daikin-a2w/Warranty-Certificate.pdf" },
  ],
  "air_to_water_hp:Samsung": [
    { label: "Outdoor unit installation manual", category: "Manuals", file: "/docs/samsung-a2w/Outdoor-Unit-Installation-Manual.pdf" },
    { label: "Service manual", category: "Manuals", file: "/docs/samsung-a2w/Service-Manual.pdf" },
    { label: "Technical catalog", category: "Marketing", file: "/docs/samsung-a2w/Technical-Catalog.pdf" },
    { label: "Engineering validation", category: "Manuals", file: "/docs/samsung-a2w/Engineering-Validation.pdf" },
    { label: "Submittal — AE041FCYDCG/AA", category: "Submittal datasheets", file: "/docs/samsung-a2w/Submittal-AE041FCYDCG.pdf" },
    { label: "Submittal — AE055FCYDCG/AA", category: "Submittal datasheets", file: "/docs/samsung-a2w/Submittal-AE055FCYDCG.pdf" },
  ],
  "air_to_water_hp:Mitsubishi": [
    { label: "Installation manual", category: "Manuals", file: "/docs/mitsubishi-a2w/Installation-Manual.pdf" },
    { label: "Operation manual", category: "Manuals", file: "/docs/mitsubishi-a2w/Operation-Manual.pdf" },
    { label: "Service manual", category: "Manuals", file: "/docs/mitsubishi-a2w/Service-Manual.pdf" },
    { label: "Technical and service manual", category: "Manuals", file: "/docs/mitsubishi-a2w/Technical-and-Service-Manual.pdf" },
    { label: "Parts manual", category: "Manuals", file: "/docs/mitsubishi-a2w/Parts-Manual.pdf" },
    { label: "Quick setup guide", category: "Manuals", file: "/docs/mitsubishi-a2w/Quick-Setup-Guide.pdf" },
    { label: "Applications guide", category: "Marketing", file: "/docs/mitsubishi-a2w/Applications-Guide.pdf" },
    { label: "Ecodan catalog", category: "Marketing", file: "/docs/mitsubishi-a2w/Ecodan-Catalog.pdf" },
    { label: "Ecodan brochure", category: "Marketing", file: "/docs/mitsubishi-a2w/Ecodan-Brochure.pdf" },
    { label: "Hydronics brochure", category: "Marketing", file: "/docs/mitsubishi-a2w/Hydronics-Brochure.pdf" },
    { label: "Extended warranty process", category: "Warranty", file: "/docs/mitsubishi-a2w/Extended-Warranty-Process.pdf" },
    { label: "Submittal — WUZ-SA36NMZ", category: "Submittal datasheets", file: "/docs/mitsubishi-a2w/Submittal-WUZ-SA36NMZ.pdf" },
  ],
};

export function documentsForProduct(product: { brand: string; equipmentType: string }): ProductDocument[] {
  return BRAND_DOCUMENTS[`${product.equipmentType}:${product.brand}`] ?? [];
}
