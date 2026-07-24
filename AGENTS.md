# AGENTS.md

## Cursor Cloud specific instructions

Longyu is a single Vite + React + TypeScript PWA (package manager: **npm**, Node >= 20). There is no monorepo, no docker-compose, and no local backend service to run for normal development.

### Running / building / testing
Standard commands live in `package.json` and `README.md`; use them directly:
- Dev server: `npm run dev` (Vite, defaults to port **5173**). Use `npm run dev -- --host` to expose it.
- Build: `npm run build` (runs `scripts/typecheck.mjs` then `scripts/vite-build.mjs`; output in `dist/`).
- Preview built app: `npm run preview` (port **4173**).
- Lint/validate gate: `npm run validate:beta` (typecheck + all content/encoding validators). This is the closest thing to a lint suite.
- E2E: `npm run test:e2e` (Playwright; auto-runs `build` + `preview` on 4173 via `playwright.config.ts`).

### Non-obvious notes
- The app runs in **local mode by default** (`VITE_BACKEND_MODE=local`), storing progress in `localStorage`. No Supabase, database, or account is required to run, test lessons, or complete the core learning loop.
- Supabase/Stripe are **optional** and only needed for cloud auth, progress sync, leagues server state, and Pro billing. They target a **hosted** Supabase project (configured via `.env.local`, copy from `.env.example`); there is no local Supabase stack in the documented workflow. Do not attempt to run these to test core lesson functionality.
- Build intentionally invokes TypeScript/Vite through `node scripts/*.mjs` (not the `.bin` binaries) to avoid Linux permission issues. If you hit Rollup platform errors (e.g. `Cannot find module @rollup/rollup-linux-x64-gnu`), delete `node_modules` and re-run `npm install` so npm installs platform `optionalDependencies`.
