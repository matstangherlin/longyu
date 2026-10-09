/**
 * Pure System One answer schema checks — shared by Edge `jev.ts` and Node gates.
 * No Deno / fetch / secrets here.
 */

export type JevQuestion =
  | { type: "choice"; instructions: string; criteria: Record<string, string> }
  | { type: "score"; instructions: string; criteria: string[] }
  | { type: "noul"; instructions: string; criteria?: { true: string; false: string } };

export type JevAnswer =
  | { type: "choice"; choice: string; probabilities: Record<string, number>; confidence: number }
  | { type: "score"; score: number; probabilities: Record<string, number>; confidence: number }
  | { type: "noul"; noul: number };

/**
 * Reject malformed System One answers (wrong type / missing fields).
 * Fail-open at the triage row level (caller catches).
 */
export function validateJevAnswers(
  questions: Record<string, JevQuestion>,
  answers: unknown,
): asserts answers is Record<string, JevAnswer> {
  if (!answers || typeof answers !== "object" || Array.isArray(answers)) {
    throw new Error("jev_bad_response");
  }
  const map = answers as Record<string, unknown>;
  for (const [id, question] of Object.entries(questions)) {
    const answer = map[id];
    if (!answer || typeof answer !== "object" || Array.isArray(answer)) throw new Error(`jev_bad_answer:${id}`);
    const a = answer as Record<string, unknown>;
    if (question.type === "choice") {
      if (a.type !== "choice" || typeof a.choice !== "string" || !(a.choice in question.criteria)) {
        throw new Error(`jev_bad_choice:${id}`);
      }
    } else if (question.type === "score") {
      if (a.type !== "score" || typeof a.score !== "number" || !Number.isFinite(a.score)) {
        throw new Error(`jev_bad_score:${id}`);
      }
    } else if (question.type === "noul") {
      if (a.type !== "noul" || typeof a.noul !== "number" || !Number.isFinite(a.noul)) {
        throw new Error(`jev_bad_noul:${id}`);
      }
    }
  }
}
