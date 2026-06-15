# BMS-OPR-PRD ERP System

**Always confirm before making changes** — do not modify code, schema, or config without proposing and getting approval.

## Project Identity

- **Name:** BMS-OPR-PRD ERP System
- **Stack:** Next.js 16, React 19, TypeScript 5, Tailwind CSS v4, Supabase, Pusher
- **Status:** Production (Live)

> **This is a live production system.** Treat every change as potentially user-facing.
> Be extra cautious with anything that could break existing behavior, affect active
> users, or touch persisted data. When a change is risky, stop and ask before acting.

## Mandatory on Every New Session

Before working on anything, do these steps in order:

1. Read `memory-bank/PROGRESS.md` — understand the last project state
2. Read `memory-bank/TASK.md` — find active or unfinished tasks
3. Summarize to the developer: "I have read the documents. Last state: [summary]. Next task: [task]. Shall we proceed from here?"
4. Wait for confirmation before starting to code

## Reference Documents

| File                             | Covers                                                      |
| -------------------------------- | ----------------------------------------------------------- |
| `memory-bank/ARCHITECTURE.md`    | System architecture, data flows, auth design, key decisions |
| `memory-bank/TECH_STACK.md`      | Full dependency inventory, versions, config specifics       |
| `memory-bank/DATABASE_SCHEMA.md` | All tables, columns, relationships, inferred from code      |
| `memory-bank/DESIGN.md`          | UI/UX: design system, component patterns, responsive layout |
| `memory-bank/PRD.md`             | Product requirements, 90+ features, user roles, priorities  |
| `memory-bank/SECURITY.md`        | Auth model, secrets, RLS, API security, checklist           |
| `memory-bank/PROGRESS.md`        | Feature completion status, known gaps, technical debt       |
| `memory-bank/TASK.md`            | Active tasks, backlog, priorities, known bugs               |
| `memory-bank/API_SPEC.md`        | All API endpoints, request/response schemas, error codes    |

## Mandatory Rules

- Do not start coding before reading `PROGRESS.md` and `TASK.md`
- Work on one small task at a time
- Before considering a task done: run `npm run lint` (type check + ESLint) and the relevant tests (`npm run test`, and `npm run test:e2e` if the change affects user-facing flows). Report the results. Do not declare a task complete while lint or tests are failing.
- After finishing a task, update `PROGRESS.md` and `TASK.md`
- When a sprint or audit closes, archive completed items (✅ Done / ✅ Resolved / ✅ Skipped) from `TASK.md` into `CHANGELOG.md`. Keep `TASK.md` scoped to active, pending, deferred, and buggy items only. Detailed implementation narrative belongs in `CHANGELOG.md` or git history, not in `PROGRESS.md` or `TASK.md`.
- If a change affects a reference document (e.g. you altered an API endpoint, schema usage, or an architectural decision), also update — or propose updating — the relevant file: `API_SPEC.md`, `DATABASE_SCHEMA.md`, `ARCHITECTURE.md`, etc. Keep docs in sync with code.
- Do not install new dependencies without informing the developer
- Always use the stack from `TECH_STACK.md` — no improvisation

## When to Proceed vs Ask First

To avoid both over-asking and unwanted initiative, use this as the default boundary.

**You may proceed without asking:**

- The specific task the developer just approved
- Obvious typo / comment fixes inside the file you're already editing for that task
- Reading, searching, and inspecting any file

**Ask first (propose, then wait for approval):**

- Any change to database schema, migrations, or RLS policies
- Any change outside the scope of the current task (refactors, renames, "while I'm here" cleanups)
- Deleting or moving files, or changing public function/API signatures
- Changes that could break existing behavior or affect active production users
- Adding, removing, or upgrading dependencies
- Anything touching auth, secrets, or environment configuration

When in doubt, ask. One short confirmation is cheaper than an unwanted change in production.

## Database & Schema Safety

- This is a live system — **never modify the production schema directly.**
- Do not write or run migrations without explicit approval. Propose the migration (the exact SQL / change) and wait.
- `DATABASE_SCHEMA.md` reflects the current schema — treat it as read-only reference unless a schema change has been approved and applied, after which update it.
- Be cautious with any query or change that could affect existing rows (destructive updates, deletes, column type changes).

## Secrets & Security

- Never hardcode secrets, API keys, tokens, or credentials in code.
- Never commit `.env` files or print secret values in output.
- Read secrets from environment variables only; follow the patterns in `SECURITY.md`.
- Respect the auth model and RLS rules — do not bypass or weaken them.

## Coding Principles

Apply these to all code you write or modify:

- **No over-engineering (KISS):** simplest solution that works. No speculative abstraction layers, generic configs, or indirection that the current task doesn't need.
- **YAGNI:** implement only what the current task requires. Don't add features, parameters, or abstractions for hypothetical future needs.
- **Clean code:** descriptive names; short single-purpose functions; no duplicated logic (DRY); comments explain _why_, not _what_; follow existing formatting and conventions.
- **Clean architecture:** dependencies point inward toward business logic. Core/domain logic must not depend on framework, Supabase, Pusher, or UI. Keep these replaceable. In practice for this stack: don't put Supabase queries directly inside React components, and keep business logic separate from presentation.
- **Separation of concerns:** one module/component/function = one responsibility. Aim for low coupling, high cohesion.
- **Stay in scope:** do not refactor, rename, or "improve" code outside the requested task. If you spot an improvement, propose it first and wait for approval.

## Commands

| Command              | Purpose                                                  |
| -------------------- | -------------------------------------------------------- |
| `npm run dev`        | Dev server                                               |
| `npm run build`      | Production build                                         |
| `npm run start`      | Start production                                         |
| `npm run lint`       | Type check (`tsc --noEmit`) then ESLint v9 (flat config) |
| `npm run test`       | Unit tests (Vitest, single run)                          |
| `npm run test:watch` | Unit tests in watch mode (Vitest)                        |
| `npm run test:e2e`   | End-to-end tests (Playwright)                            |

There is no dedicated `typecheck` script — `npm run lint` already runs `tsc --noEmit` first. To run a standalone type check without ESLint, use `npx tsc --noEmit` manually.

**Testing:** Vitest (unit) and Playwright (e2e) are installed. Run the relevant tests after changes, and add or update tests when you change tested behavior.

## Framework & toolchain quirks

- **Tailwind v4**: postcss plugin is `@tailwindcss/postcss` (not `tailwindcss`); CSS entry is `@import "tailwindcss"` (not `@tailwind` directives); no `tailwind.config` — theme via `@theme inline` in `globals.css`
- **ESLint v9 flat config** (`eslint.config.mjs`) imports `defineConfig` from `"eslint/config"` — do NOT create `.eslintrc.*`
- **`proxy.ts`** exports named `proxy` (NOT `middleware`) — matcher excludes `/api/*`, defaults to Node.js runtime
- **Route handler `params`** is `Promise` — must `await` before accessing properties
- **`lib/supabase/server.ts`** `createClient()` is `async` — `cookies()` must be awaited in Next.js 16
- **`@/*` alias** → `./` (no `src/` dir; App Router at root)
