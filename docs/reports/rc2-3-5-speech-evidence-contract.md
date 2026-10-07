# RC2.3.5 — Speech Evidence Contract

Source: [`src/lib/speechEvidence.ts`](../../src/lib/speechEvidence.ts) · storage `longyu:speech-evidence-v1` (local, last 200 events) · hand-off to RC2.3.6.

```ts
interface SpeechLearningEvidence {
  conceptId: string;            // "contrast:j-q-x", "phrase:你好"
  activityId: string;           // "pinyin-lab:j-q-x:produce", "self-compare:你好"
  mode: "PERCEPTION" | "SELF_COMPARE" | "ASR" | "CONVERSATIONAL_TRANSFER";
  modelHeard: boolean;
  recordingCaptured: boolean;
  selfPlaybackHeard: boolean;   // forced false when nothing was recorded
  recognitionAttempted: boolean;
  recognitionSucceeded?: boolean; // only when attempted; "device transcribed the target"
  perceptionTrials: number;     // identification rounds with CONFIRMED audio
  perceptionCorrect: number;    // ≤ perceptionTrials
  retryCount: number;
  completed: boolean;
  at: number;
}
```

## Distinctions the contract keeps

| This | is not |
|---|---|
| `modelHeard` | discriminated correctly (`perceptionCorrect`) |
| `recordingCaptured` | pronounced correctly |
| `recognitionSucceeded` | tone correct — ASR transcribes text, it does not measure pitch |
| `completed` | concept mastered |

There is **no** field for score, accuracy, tone, transcript, audio URL/blob, pitch or any acoustic feature. `normalizeSpeechEvidence` drops unknown keys; the gate feeds it `transcript`, `audioUrl`, `score`, `toneCorrect` and fails if any survives (mutation 15).

## Not collected

Raw microphone audio · recording file/URL · transcription of personal speech · voiceprint · biometric features · sensitive speech content.

## Who writes it

| Writer | Mode | When |
|---|---|---|
| `PronunciationContrastDrill` | PERCEPTION | end of identify (counts only rounds whose audio was confirmed) |
| `SelfComparePractice` | SELF_COMPARE | Continue (completed) or "Não posso falar agora" (not completed) — once per activity |
| `PronunciationPractice` | ASR | Continue after ≥ 1 recognition attempt |

`perceptionPassed(summary)` (≥ 2 confirmed trials, ≥ 66 % correct) is the only derived signal, and it only unlocks **production practice** for a contrast (`contrastEligibility … PRODUCTION_ELIGIBLE`). No mastery, XP or SRS reads it in this wave.

## Local-first

No schema migration, no cloud sync, no upload. RC2.3.6 decides how (and whether) this joins the learner evidence record.
