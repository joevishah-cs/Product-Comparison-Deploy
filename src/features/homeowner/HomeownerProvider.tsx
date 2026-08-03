import * as React from "react";
import { RECOMMENDED_PRIORITIES } from "./homeownerEngine";

export type CompareView = "internal" | "homeowner";

/** Sections the sales representative can switch on or off before sharing. */
export const REPORT_SECTIONS = [
  { key: "recommendation", label: "Recommendation" },
  { key: "fit", label: "Why this system fits" },
  { key: "comparison", label: "Simple comparison" },
  { key: "benefits", label: "Comfort benefits" },
  { key: "reviews", label: "What homeowners are saying" },
  { key: "efficiency", label: "Energy and performance" },
  { key: "quiet", label: "Quiet operation" },
  { key: "cold", label: "Cold-weather performance" },
  { key: "warranty", label: "Reliability and warranty" },
  { key: "smart", label: "Smart features and service" },
  { key: "reviewChart", label: "Review comparison chart" },
  { key: "reviewThemes", label: "Positive review themes" },
  { key: "reviewConcerns", label: "Common concerns" },
  { key: "reviewExcerpts", label: "Representative review excerpts" },
  { key: "differences", label: "Important differences to consider" },
  { key: "technical", label: "Technical details" },
  { key: "faq", label: "Frequently asked questions" },
  { key: "plainEnglish", label: "Why this recommendation" },
  { key: "reviewDisclaimer", label: "Review disclaimer" },
] as const;

export type ReportSectionKey = (typeof REPORT_SECTIONS)[number]["key"];

export interface HomeownerReportConfig {
  recommendedProductId: string | null;
  competitorIds: string[];
  homeownerName: string;
  dealerName: string;
  repName: string;
  dealerContact: string;
  repContact: string;
  location: string;
  priorities: string[];
  personalNote: string;
  sections: Record<ReportSectionKey, boolean>;
  generatedAt: string | null;
}

function defaultSections(): Record<ReportSectionKey, boolean> {
  return Object.fromEntries(REPORT_SECTIONS.map((s) => [s.key, true])) as Record<
    ReportSectionKey,
    boolean
  >;
}

const DEFAULT_CONFIG: HomeownerReportConfig = {
  recommendedProductId: null,
  competitorIds: [],
  homeownerName: "",
  dealerName: "",
  repName: "",
  dealerContact: "",
  repContact: "",
  location: "",
  priorities: [...RECOMMENDED_PRIORITIES],
  personalNote: "",
  sections: defaultSections(),
  generatedAt: null,
};

interface HomeownerContextValue {
  view: CompareView;
  setView: (v: CompareView) => void;
  config: HomeownerReportConfig;
  update: (patch: Partial<HomeownerReportConfig>) => void;
  toggleSection: (key: ReportSectionKey) => void;
  togglePriority: (key: string) => void;
  useRecommendedPriorities: () => void;
  reset: () => void;
  generated: boolean;
  markGenerated: () => void;
  presenting: boolean;
  setPresenting: (v: boolean) => void;
}

const HomeownerContext = React.createContext<HomeownerContextValue | null>(null);

const STORAGE_KEY = "dcmi.v1.homeownerReport";

function readStored(): HomeownerReportConfig {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_CONFIG;
    const parsed = JSON.parse(raw) as Partial<HomeownerReportConfig>;
    return {
      ...DEFAULT_CONFIG,
      ...parsed,
      sections: { ...defaultSections(), ...(parsed.sections ?? {}) },
    };
  } catch {
    return DEFAULT_CONFIG;
  }
}

export function HomeownerProvider({ children }: { children: React.ReactNode }) {
  const [view, setView] = React.useState<CompareView>("internal");
  const [config, setConfig] = React.useState<HomeownerReportConfig>(readStored);
  const [presenting, setPresenting] = React.useState(false);

  React.useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
    } catch {
      /* storage unavailable — the report still works for this session */
    }
  }, [config]);

  const update = React.useCallback((patch: Partial<HomeownerReportConfig>) => {
    setConfig((prev) => ({ ...prev, ...patch }));
  }, []);

  const toggleSection = React.useCallback((key: ReportSectionKey) => {
    setConfig((prev) => ({ ...prev, sections: { ...prev.sections, [key]: !prev.sections[key] } }));
  }, []);

  const togglePriority = React.useCallback((key: string) => {
    setConfig((prev) => ({
      ...prev,
      priorities: prev.priorities.includes(key)
        ? prev.priorities.filter((p) => p !== key)
        : [...prev.priorities, key],
    }));
  }, []);

  const useRecommendedPriorities = React.useCallback(() => {
    setConfig((prev) => ({ ...prev, priorities: [...RECOMMENDED_PRIORITIES] }));
  }, []);

  const markGenerated = React.useCallback(() => {
    setConfig((prev) => ({ ...prev, generatedAt: new Date().toISOString() }));
  }, []);

  const reset = React.useCallback(() => setConfig(DEFAULT_CONFIG), []);

  const value = React.useMemo<HomeownerContextValue>(
    () => ({
      view,
      setView,
      config,
      update,
      toggleSection,
      togglePriority,
      useRecommendedPriorities,
      reset,
      generated: Boolean(config.generatedAt),
      markGenerated,
      presenting,
      setPresenting,
    }),
    [view, config, update, toggleSection, togglePriority, useRecommendedPriorities, reset, markGenerated, presenting],
  );

  return <HomeownerContext.Provider value={value}>{children}</HomeownerContext.Provider>;
}

export function useHomeowner(): HomeownerContextValue {
  const ctx = React.useContext(HomeownerContext);
  if (!ctx) throw new Error("useHomeowner must be used inside <HomeownerProvider>");
  return ctx;
}
