/** Consumer-brochure capabilities for the air-to-water lineup.
 *
 *  The A2WHP comparison spreadsheet records only measured performance and
 *  electrical data. It has no column for quiet operation, installation
 *  flexibility or smart controls, which is why those homeowner-facing sections
 *  previously rendered as "Information Not Available" for every A2W product.
 *
 *  The claims below are transcribed from the consumer brochures already shipped
 *  in `public/docs/` (see `BRAND_DOCUMENTS` in ./documents.ts) and registered per
 *  brand, matching how that literature is scoped. Each entry keeps the brochure
 *  page it came from so the UI can cite it the same way a spreadsheet cell is
 *  cited. Wording stays close to the source; nothing here is inferred.
 */

export interface BrochureFeature {
  /** Short label shown as the card heading. */
  label: string;
  /** Homeowner-facing description, transcribed from the brochure. */
  detail: string;
  /** Brochure page the claim appears on. */
  page: number;
}

export interface BrochureCapabilities {
  documentLabel: string;
  file: string;
  quiet: BrochureFeature[];
  installation: BrochureFeature[];
  smartControls: BrochureFeature[];
}

/** Keyed by brand, matching the `air_to_water_hp:<brand>` document scoping. */
export const A2W_BROCHURE_FEATURES: Record<string, BrochureCapabilities> = {
  Daikin: {
    documentLabel: "Daikin Altherma 3 H HT consumer brochure",
    file: "/docs/daikin-a2w/Consumer-Brochure.pdf",
    quiet: [
      {
        label: "Standard sound mode",
        detail:
          "The outdoor unit produces a sound pressure of 41 dBA at about 10 ft in standard sound mode.",
        page: 5,
      },
      {
        label: "Low sound mode",
        detail:
          "An additional low sound mode reduces sound pressure further to 35 dBA — a reduction of half the perceived sound level.",
        page: 5,
      },
      {
        label: "Double sound insulation",
        detail:
          "The compressor benefits from a double sound insulation jacket to reduce compressor sound power.",
        page: 7,
      },
      {
        label: "Hidden, larger fan",
        detail:
          "The fan is hidden and slightly larger, increasing the contact surface with air and lowering the sound level.",
        page: 6,
      },
    ],
    installation: [
      {
        label: "Plumb-and-Play packaged solution",
        detail:
          "Supplied as a packaged solution with “Plumb-and-Play” installation to reduce field work.",
        page: 5,
      },
      {
        label: "Application flexibility",
        detail:
          "Designed for flexibility with different indoor emitters for heating and cooling — radiators, hydronic air handlers and in-floor radiant loops. Ideal for retrofit and new-build applications.",
        page: 5,
      },
      {
        label: "Compact dimensions",
        detail:
          "Compact dimensions allow for a small installation space, as almost no side clearance is required.",
        page: 17,
      },
      {
        label: "Guided commissioning",
        detail:
          "Commissioning runs through a guided interface in 9 steps, easing installation and minimising field setup.",
        page: 17,
      },
    ],
    smartControls: [
      {
        label: "Wi-Fi connectivity",
        detail:
          "Wi-Fi enabled, allowing homeowners to control the system remotely, with voice control compatible with both iOS and Android assistants.",
        page: 18,
      },
      {
        label: "Remote monitoring",
        detail:
          "From a smart device, homeowners can monitor and control not only indoor temperature but domestic hot water as well.",
        page: 18,
      },
      {
        label: "Scheduling",
        detail: "The thermostat can be programmed on a schedule to match the household routine.",
        page: 18,
      },
      {
        label: "Integrated controller",
        detail:
          "Integrated thermostat and on-board fully modulating controller, with the D2271 connected thermostat available via the SkyportHome app.",
        page: 18,
      },
    ],
  },

  Mitsubishi: {
    documentLabel: "Mitsubishi ecodan brochure",
    file: "/docs/mitsubishi-a2w/Ecodan-Brochure.pdf",
    quiet: [
      {
        label: "Water-based distribution",
        detail:
          "Heated or cooled water is distributed through pipes instead of air ducts, for a quiet and comfortable experience.",
        page: 5,
      },
      {
        label: "Low outdoor sound levels",
        detail:
          "The outdoor units have an elegant, compact design with a small footprint and low sound levels.",
        page: 5,
      },
    ],
    installation: [
      {
        label: "All-in-one Hydrobox",
        detail:
          "An all-in-one indoor Hydrobox has the key components built in, for streamlined installation and simple maintenance.",
        page: 5,
      },
      {
        label: "Small footprint",
        detail:
          "Compact outdoor units with a small footprint give maximum installation flexibility.",
        page: 5,
      },
      {
        label: "Boiler interlock",
        detail:
          "Capable of interlocking with a boiler, which suits both new construction and retrofit applications.",
        page: 5,
      },
    ],
    smartControls: [
      {
        label: "Connected control",
        detail:
          "The ecodan system is designed to be monitored and controlled remotely through Mitsubishi Electric's connected control platform.",
        page: 5,
      },
    ],
  },

  Samsung: {
    documentLabel: "Samsung EHS technical catalog",
    file: "/docs/samsung-a2w/Technical-Catalog.pdf",
    quiet: [
      {
        label: "Quiet on demand",
        detail:
          "Quiet mode can be set directly on the display, without the need for installer support, whenever it is needed.",
        page: 8,
      },
      {
        label: "High temperature and quiet operation",
        detail:
          "The EHS Mono HT outdoor unit applies advanced technologies for comfort and quiet operation while delivering stable, high-temperature heating.",
        page: 10,
      },
    ],
    installation: [
      {
        label: "Fast installation",
        detail:
          "Designed to be installed quickly — even in a single day — saving time and effort on installation and maintenance.",
        page: 9,
      },
      {
        label: "Hinged control box",
        detail:
          "A hinged control box swings out rather than needing removal, allowing easy access and reducing service time.",
        page: 9,
      },
      {
        label: "No buffer tank required",
        detail:
          "Listed as requiring no buffer tank, with 2-zone parts, a molded bracket and quick connectors among the key components.",
        page: 7,
      },
      {
        label: "Slim fit, compact size",
        detail: "A slim-fit, compact outdoor cabinet with a slanted grille.",
        page: 10,
      },
    ],
    smartControls: [
      {
        label: "SmartThings",
        detail:
          "SmartThings connectivity, with the app available by scanning the QR code in the literature.",
        page: 8,
      },
      {
        label: "Touch display",
        detail: "A 7-inch touch display provides on-unit zone overview and control.",
        page: 8,
      },
      {
        label: "AI Energy Mode and Water Law",
        detail:
          "Listed features include AI Energy Mode and Water Law compensation, plus Away mode and Quiet mode.",
        page: 7,
      },
    ],
  },
};

export function brochureFeaturesFor(product: {
  brand: string;
  equipmentType: string;
}): BrochureCapabilities | null {
  if (product.equipmentType !== "air_to_water_hp") return null;
  return A2W_BROCHURE_FEATURES[product.brand] ?? null;
}
