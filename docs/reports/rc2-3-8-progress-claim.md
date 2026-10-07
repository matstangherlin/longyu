# RC2.3.8 — Local progress claim

Prompt copy: **"Encontramos progresso neste dispositivo."** / **"Salvar este progresso na sua conta?"** →
**"Salvar na conta"** / **"Agora não"**.

## Classification (`classifyClaim`)

| Case | Local | Cloud | Decision |
|---|---|---|---|
| NO_LOCAL_NO_CLOUD | empty | empty | NONE |
| LOCAL_ONLY | progress | empty | CLAIM_SILENT (merge, record ledger) |
| CLOUD_ONLY | empty | progress | RESTORE_CLOUD |
| SAME | = | = | NONE |
| LOCAL_AHEAD | more | less | ASK |
| DIVERGENT | different | different | ASK |

"Agora não" parks local progress under `longyu:parked-local-progress:v1`; the cloud is restored, nothing is lost.

## Idempotency

`claimId(localAccountId, userId, localFingerprint)` recorded in `longyu:progress-claims:v1`. A second
callback / reload / double tap does not re-merge. Never last-write-wins.

## Per-field economy policy (`ECONOMY_MERGE_POLICY`)

| Field | Policy |
|---|---|
| xp, points, pearls, streak | MAX (no blind sums) |
| completedLessons, learnedChars, achievements | UNION_BY_ID |
| serverIsPro, subscriptions, playEntitlement | SERVER (never taken from local) |

## Evidence

`claimAnonymousEvidence(cloud:<uid>)`: Learner Evidence Record merged by stable event id (`mergeRecords`);
speech union by `activity|mode|at`; Hànzì per-channel max; celebrated union. Local namespace removed afterwards
and recorder memo reset → Personal Mastery is re-derived from the merged record.

Tests: `gate:rc2-3-8-auth-identity` (AI checks for classification, idempotency, no blind sums, SERVER fields).
