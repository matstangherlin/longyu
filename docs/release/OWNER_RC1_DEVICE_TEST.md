# Owner RC1 device test — only what you must do on a phone

Install the APK marked **THIS IS THE RC TO TEST** in `docs/release/OWNER_DOWNLOAD.md` (after artifacts land). Confirm RC ID / SHA / version on `/qa/device` (or about) before scoring.

**STOP if QA Release Truth does not match:** RC ID `RC2.3.12-RC1` · version `0.2.0-rc.1` · versionCode `570` · artifactSourceSha `2d64f0d7…` · fingerprint `5a64821d0b7d`. Certification HEAD `aca759cb…` is orchestration-only — not the APK source.

Target: **20 checkpoints**. Mark PASS / FAIL. Agent already ran hosted CI, hashes, and gates — do not re-run npm.

1. **Identity** — RC ID, version `0.2.0-rc.1`, versionCode `570`, artifactSourceSha + fingerprint match download package  
2. **Fresh open** — cold start → Journey without crash  
3. **First lesson** — start → interact → complete  
4. **Audio ×20** — play/stop/navigate; no stuck arbiter  
5. **Speech ×5** — record → playback → retry → fallback OK  
6. **Mic deny** — deny once + permanent; Settings recovery path  
7. **Hànzì** — trace + memory on 人 口 木 水 火 中  
8. **Hànzì UX** — undo/clear; Continue not blocked  
9. **Culture** — moment → deep → return  
10. **Seu Domínio** — readable; no technical score leak  
11. **Praticar o que preciso** — targets known gaps only  
12. **Email auth** — login or signup you will use in beta  
13. **Google OAuth** (if configured) — cold + cancel  
14. **Microsoft OAuth** (if configured) — cold + cancel  
15. **Sync** — close app → reopen → progress survives  
16. **Offline** — one activity offline → online; no double reward  
17. **Account switch** — A → B; B cannot see A  
18. **Settings** — sound OFF / haptic OFF mean OFF  
19. **Upgrade** — from older APK if you still have one; progress survives  
20. **Physical accept** — sign: “I would give this APK to 10 real testers”

Record: device model · Android version · date · FAIL notes only.

When all PASS → tell agent to set `OWNER_RC_PHYSICAL_ACCEPTANCE=PASS` (agent updates criteria from your message; no JSON editing by hand for security rows).
