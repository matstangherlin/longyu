const BLOCKED_KEYS = new Set([
  "password",
  "senha",
  "token",
  "secret",
  "email",
  "answer",
  "response",
  "text",
  "feedback",
  "speech",
  "utterance",
  "transcript",
  "typed",
  "input",
  "phrase",
  "sentence",
  "user_answer",
  "student_answer",
]);

const SENSITIVE_PATTERNS = [
  /bearer\s+\S+/gi,
  /eyJ[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+/g,
  /@[a-z0-9.-]+\.[a-z]{2,}/gi,
];

const STEP_MISTAKE_ALLOWED = new Set(["task_type", "skill", "is_review", "attempt_number", "step_index"]);

function scrubValue(value: unknown): unknown {
  if (typeof value === "string") {
    let text = value.slice(0, 200);
    for (const pattern of SENSITIVE_PATTERNS) text = text.replace(pattern, "[redacted]");
    if (text.includes("@")) return "[redacted]";
    return text;
  }
  if (Array.isArray(value)) return value.slice(0, 10).map(scrubValue);
  if (value && typeof value === "object") return sanitizeMetadata(value as Record<string, unknown>);
  return value;
}

export function sanitizeMetadata(
  metadata: Record<string, unknown> = {},
  options: { stepMistakeOnly?: boolean } = {}
): Record<string, unknown> {
  const clean: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(metadata)) {
    const normalized = key.toLowerCase();
    if (BLOCKED_KEYS.has(normalized)) continue;
    if (options.stepMistakeOnly && !STEP_MISTAKE_ALLOWED.has(normalized)) continue;
    clean[key] = scrubValue(value);
  }

  return clean;
}

export function sanitizeStepMistakeMetadata(metadata: {
  taskType?: string;
  skill?: string;
  isReview?: boolean;
  attemptNumber?: number;
  stepIndex?: number;
}): Record<string, unknown> {
  return sanitizeMetadata(
    {
      task_type: metadata.taskType,
      skill: metadata.skill,
      is_review: metadata.isReview ?? false,
      attempt_number: metadata.attemptNumber,
      step_index: metadata.stepIndex,
    },
    { stepMistakeOnly: true }
  );
}

export function metadataLooksPrivate(metadata: Record<string, unknown>): boolean {
  for (const key of Object.keys(metadata)) {
    if (BLOCKED_KEYS.has(key.toLowerCase())) return true;
  }
  const serialized = JSON.stringify(metadata).toLowerCase();
  return Array.from(BLOCKED_KEYS).some((blocked) => serialized.includes(`"${blocked}"`));
}
