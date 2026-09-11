#!/usr/bin/env node
import assert from "node:assert/strict";
import { validateLessonUiConsistency } from "./lib/v498b2-gates.mjs";

assert.equal(validateLessonUiConsistency().failures.length, 0, "positive control");

function killed(label, data, code) {
  const failures = validateLessonUiConsistency(data).failures;
  assert(
    failures.some((item) => item.code === code),
    `${label} survived (expected ${code}); ${JSON.stringify(failures)}`
  );
  console.log(`KILLED ${label}: ${code}`);
}

killed("speak as tiny link", { freeAnswerSource: `orSpeakAnswer\nunderline decoration-line` }, "SPEAK_LINK");
killed("missing tokens", { lessonTokensSource: "export const LESSON_UI = {}" }, "TOKENS");
killed("no shared label", { lessonKindLabelSource: "export function LessonKindLabel(){return null}" }, "KIND_LABEL");

console.log("PASS test:lesson-ui-consistency");
