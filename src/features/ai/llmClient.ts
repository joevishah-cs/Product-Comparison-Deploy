import type { AnswerSectionKind, AdvisorAnswer, AnswerSection } from "./answers";

/**
 * Client-side Azure OpenAI (GPT-5) call. The API key ships in the browser bundle
 * and is visible in network requests -- acceptable for an internal/demo
 * deployment behind auth, not for a public release. Move this behind a
 * server-side function (see supabase/functions/ai-advisor) before that.
 */

const ENDPOINT = import.meta.env.VITE_AZURE_OPENAI_ENDPOINT as string | undefined;
const API_KEY = import.meta.env.VITE_AZURE_OPENAI_API_KEY as string | undefined;
const DEPLOYMENT = (import.meta.env.VITE_AZURE_OPENAI_DEPLOYMENT as string | undefined) ?? "gpt-5";
const API_VERSION = (import.meta.env.VITE_AZURE_OPENAI_API_VERSION as string | undefined) ?? "2024-10-01-preview";

export const isLlmConfigured = Boolean(ENDPOINT && API_KEY);

const SYSTEM_PROMPT = `You are a competitive intelligence advisor for Daikin sales and product marketing.

Hard rules:
- Answer ONLY from the product records supplied in the user message. Never introduce a
  specification, model, brand, price or certification that is not in those records.
- A null value means the source document left the cell blank. Report it as
  "Information unavailable". NEVER interpret a blank as "No", as zero, or as an absence
  of the feature.
- Never claim exclusivity ("only Daikin", "no competitor offers") when any competitor's
  value for that attribute is null.
- Do not rank refrigerants against one another.
- Do not compare products of different equipmentType values as if they were equivalent.
- Every factual statement must carry the citation string supplied with that value.

Return ONLY a JSON object of the form:
{"sections":[{"kind":"...","body":"...","citations":["..."]}]}

Valid kind values, used in this order where applicable:
VERIFIED PRODUCT FACT, CALCULATED COMPARISON, AI ANALYTICAL INSIGHT,
SUGGESTED MARKETING MESSAGE, CLAIM REQUIRING VALIDATION, INFORMATION UNAVAILABLE.

VERIFIED PRODUCT FACT and CALCULATED COMPARISON must be strictly derivable from the
records. You MUST include at least one AI ANALYTICAL INSIGHT section, and it must say
something the deterministic grounding does not already say -- a strategic implication,
a risk, a recommended next step, or a connection between attributes -- not a paraphrase
or restatement of the grounding text. Do not return the grounding sections unchanged;
add genuine analysis on top of them. SUGGESTED MARKETING MESSAGE must be plain enough
for a homeowner.`;

interface LlmProduct {
  id: string;
  name: string;
  isDaikin: boolean;
  equipmentType: string;
  attributes: Record<string, { value: string | null; citation: string }>;
}

/**
 * Asks GPT-5 for an answer grounded in the selected products and the app's own
 * deterministic answer. Falls back to `grounding` unchanged on any failure so
 * the advisor always returns a source-backed answer.
 */
export async function askLlm(
  question: string,
  products: LlmProduct[],
  grounding: AdvisorAnswer,
  view: "internal" | "homeowner",
): Promise<AdvisorAnswer> {
  if (!isLlmConfigured) return grounding;

  try {
    const url = `${ENDPOINT!.replace(/\/+$/, "")}/openai/deployments/${DEPLOYMENT}/chat/completions?api-version=${API_VERSION}`;

    const res = await fetch(url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "api-key": API_KEY!,
      },
      body: JSON.stringify({
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          {
            role: "user",
            content: [
              `AUDIENCE: ${view === "homeowner" ? "homeowner" : "internal sales/marketing"}`,
              `QUESTION: ${question}`,
              "",
              "PRODUCT RECORDS (JSON):",
              JSON.stringify(products),
              "",
              "DETERMINISTIC GROUNDING already computed by the application. Use it as the",
              "factual floor; you may reorganise and add an AI ANALYTICAL INSIGHT section,",
              "but you may not contradict it or add facts beyond the records:",
              JSON.stringify(grounding),
            ].join("\n"),
          },
        ],
        max_completion_tokens: 1600,
        reasoning_effort: "low",
        temperature: 1,
      }),
    });

    if (!res.ok) return grounding;

    const data = await res.json();
    const text: string = data?.choices?.[0]?.message?.content ?? "";
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return grounding;

    const parsed = JSON.parse(match[0]) as { sections?: AnswerSection[] };
    if (!Array.isArray(parsed.sections) || !parsed.sections.length) return grounding;

    const validKinds: AnswerSectionKind[] = [
      "VERIFIED PRODUCT FACT",
      "CALCULATED COMPARISON",
      "REVIEW-BASED INSIGHT",
      "AI ANALYTICAL INSIGHT",
      "HOMEOWNER BENEFIT EXPLANATION",
      "SUGGESTED MARKETING MESSAGE",
      "SALES RECOMMENDATION",
      "CLAIM REQUIRING VALIDATION",
      "INFORMATION UNAVAILABLE",
    ];
    const sections = parsed.sections.filter(
      (s): s is AnswerSection =>
        typeof s?.body === "string" && validKinds.includes(s.kind) && Array.isArray(s.citations),
    );
    if (!sections.length) return grounding;

    return { sections };
  } catch {
    return grounding;
  }
}
