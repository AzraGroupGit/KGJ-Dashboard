# BMS-OPR-PRD ERP System

**Always confirm before making changes** — do not modify code, schema, or config without proposing and getting approval.

## Project Identity
- **Name:** BMS-OPR-PRD ERP System
- **Stack:** Next.js 16, React 19, TypeScript 5, Tailwind CSS v4, Supabase, Pusher
- **Status:** Production (Live)

## Mandatory on Every New Session

Before working on anything, do these steps in order:

1. Read `memory-bank/PROGRESS.md` — understand the last project state
2. Read `memory-bank/TASK.md` — find active or unfinished tasks
3. Summarize to the developer: "I have read the documents. Last state: [summary]. Next task: [task]. Shall we proceed from here?"
4. Wait for confirmation before starting to code

## Reference Documents

| File | Covers |
|------|--------|
| `memory-bank/ARCHITECTURE.md` | System architecture, data flows, auth design, key decisions |
| `memory-bank/TECH_STACK.md` | Full dependency inventory, versions, config specifics |
| `memory-bank/DATABASE_SCHEMA.md` | All tables, columns, relationships, inferred from code |
| `memory-bank/DESIGN.md` | UI/UX: design system, component patterns, responsive layout |
| `memory-bank/PRD.md` | Product requirements, 90+ features, user roles, priorities |
| `memory-bank/SECURITY.md` | Auth model, secrets, RLS, API security, checklist |
| `memory-bank/PROGRESS.md` | Feature completion status, known gaps, technical debt |
| `memory-bank/TASK.md` | Active tasks, backlog, priorities, known bugs |
| `memory-bank/API_SPEC.md` | All API endpoints, request/response schemas, error codes |

## Mandatory Rules

- Do not start coding before reading `PROGRESS.md` and `TASK.md`
- Work on one small task at a time
- After finishing a task, update `PROGRESS.md` and `TASK.md`
- Do not install new dependencies without informing the developer
- Always use the stack from `TECH_STACK.md` — no improvisation

## Commands

| Command | Purpose |
|---------|---------|
| `npm run dev` | Dev server |
| `npm run build` | Production build |
| `npm run start` | Start production |
| `npm run lint` | ESLint v9 (flat config at `eslint.config.mjs`) |

No typecheck script — run `npx tsc --noEmit` manually.
No test framework — none installed; no test scripts exist.

## Framework & toolchain quirks

- **Tailwind v4**: postcss plugin is `@tailwindcss/postcss` (not `tailwindcss`); CSS entry is `@import "tailwindcss"` (not `@tailwind` directives); no `tailwind.config` — theme via `@theme inline` in `globals.css`
- **ESLint v9 flat config** (`eslint.config.mjs`) imports `defineConfig` from `"eslint/config"` — do NOT create `.eslintrc.*`
- **`proxy.ts`** exports named `proxy` (NOT `middleware`) — matcher excludes `/api/*`, defaults to Node.js runtime
- **Route handler `params`** is `Promise` — must `await` before accessing properties
- **`lib/supabase/server.ts`** `createClient()` is `async` — `cookies()` must be awaited in Next.js 16
- **`@/*` alias** → `./` (no `src/` dir; App Router at root)
