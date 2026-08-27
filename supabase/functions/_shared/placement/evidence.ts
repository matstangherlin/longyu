import type { Experience, PlacementAnswerEvidence } from "./types.ts";

const EXPERIENCES = new Set<string>(["zero", "words", "studied", "phrases", "advanced"]);

export function canonicalCountryCode(input: unknown): string {
  const raw = String(input ?? "").trim();
  if (!raw) return "BR";
  if (/^[A-Za-z]{2}$/.test(raw)) return raw.toUpperCase();
  const map: Record<string, string> = {
    brasil: "BR",
    brazil: "BR",
    portugal: "PT",
    china: "CN",
    "estados unidos": "US",
    usa: "US",
    "united states": "US",
  };
  return map[raw.toLowerCase()] ?? "BR";
}

export function parsePlacementEvidence(raw: unknown): {
  placementVersion: number;
  declaredExperience: Experience;
  goal: string | null;
  answers: PlacementAnswerEvidence[];
} | null {
  if (!raw || typeof raw !== "object") return null;
  const body = raw as Record<string, unknown>;
  const declaredExperience = String(body.declaredExperience ?? "") as Experience;
  if (!EXPERIENCES.has(declaredExperience)) return null;
  const answersRaw = Array.isArray(body.answers) ? body.answers : [];
  const answers: PlacementAnswerEvidence[] = answersRaw.map((item) => {
    const row = (item ?? {}) as Record<string, unknown>;
    return {
      questionId: String(row.questionId ?? ""),
      answer: String(row.answer ?? ""),
      hintUsed: Boolean(row.hintUsed),
      responseMode: row.responseMode === "self_report" ? "self_report" : "choice",
    };
  });
  if (answers.length < 1) return null;
  return {
    placementVersion: Number(body.placementVersion ?? 2),
    declaredExperience,
    goal: typeof body.goal === "string" ? body.goal : null,
    answers,
  };
}

export function onboardingIdempotencyKey(userId: string): string {
  return `onboarding-v2:${userId}`;
}
