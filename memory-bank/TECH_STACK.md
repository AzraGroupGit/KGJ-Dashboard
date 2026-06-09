# Technology Stack

## Core Framework

| Technology | Version | Purpose |
|------------|---------|---------|
| **Next.js** | 16.2.4 | React framework with App Router |
| **React** | 19.2.4 | UI library |
| **TypeScript** | ^5 | Type safety |
| **Node.js** | (implicit) | Runtime |

---

## Frontend

### Styling
| Package | Version | Usage |
|---------|---------|-------|
| **Tailwind CSS** | ^4 | Utility-first CSS framework |
| **@tailwindcss/postcss** | ^4 | Tailwind v4 PostCSS plugin (NOT `tailwindcss` postcss) |
| **lucide-react** | ^1.8.0 | Icon library (used in 8 components) |

### Charts & Visualization
| Package | Version | Usage |
|---------|---------|-------|
| **recharts** | ^3.8.1 | Analytics pages (cycle time, productivity, bottleneck heatmap) |
| **Canvas 2D API** | (native) | `ChartCard` component (dashboard charts, no external dep) |

### PDF
| Package | Version | Usage |
|---------|---------|-------|
| **@react-pdf/renderer** | ^4.5.1 | A5 landscape "Form Tukang" worksheet PDF generation |

---

## Backend / Database

### Database & Auth
| Package | Version | Usage |
|---------|---------|-------|
| **@supabase/supabase-js** | ^2.106.1 | Supabase JS client |
| **@supabase/ssr** | ^0.10.2 | SSR cookie-based auth for server components |
| **@supabase/auth-helpers-nextjs** | ^0.15.0 | (Legacy/deprecated helper) |

**Three Supabase client variants:**

| File | Constructor | Key | Auth |
|------|-------------|-----|------|
| `lib/supabase/client.ts` | `createClient` from `@supabase/supabase-js` | Anon key (publishable) | Browser cookies |
| `lib/supabase/server.ts` | `createServerClient` from `@supabase/ssr` | Anon key | Async SSR cookies via `cookies()` |
| `lib/supabase/admin.ts` | `createClient` from `@supabase/supabase-js` | Service role key (`SUPABASE_SERVICE_ROLE_KEY`) | No session (bypasses RLS) |

### Password Hashing
| Package | Version | Usage |
|---------|---------|-------|
| **bcrypt** | ^6.0.0 | Workshop PIN hashing and verification |

---

## Realtime

| Package | Version | Usage |
|---------|---------|-------|
| **pusher** | ^5.3.3 | Server-side Pusher SDK (trigger events) |
| **pusher-js** | ^8.5.0 | Client-side Pusher SDK (subscribe to channels) |

**Pusher setup:**
- Channel pattern: `private-user-{userId}`
- Event: `"new-notification"`
- Auth endpoint: `/api/pusher/auth`
- TLS enabled

---

## Utilities

| Package | Version | Usage |
|---------|---------|-------|
| **date-holidays** | ^3.30.2 | Indonesian public holiday data for working-day calculations |
| **qrcode** | ^1.5.4 | QR code generation for workstation QR codes |
| **LocationIQ** | (external API) | Address autocomplete (kecamatan/kelurahan level) |

---

## Developer Tooling

| Tool | Version | Config File |
|------|---------|-------------|
| **ESLint** | ^9 | `eslint.config.mjs` (flat config) |
| **eslint-config-next** | 16.2.4 | Next.js ESLint rules (core-web-vitals + typescript) |
| **TypeScript** | ^5 | `tsconfig.json` |
| **Next.js** | 16.2.4 | `next.config.ts` (minimal — empty config) |

## What's NOT in the Stack

- **No test framework** — no Jest, Vitest, Playwright, or any testing deps
- **No state management library** — no Redux, Zustand, Jotai; all state is `useState`/`useReducer`
- **No data fetching library** — no React Query, SWR, Apollo; raw `fetch()` + `useEffect`
- **No UI component library** — no shadcn/ui, Radix, MUI, Chakra, Headless UI, DaisyUI
- **No ORM** — no Prisma, Drizzle, TypeORM; raw Supabase JS client
- **No migration tooling** — no migration files in repository
- **No CI/CD** — no GitHub Actions or other CI in `.github/`
- **No form library** — no React Hook Form, Formik; raw form state management

---

## Runtime Requirements

| Variable | Source |
|----------|--------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project settings |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supabase project settings |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase project settings (secret) |
| `NEXT_PUBLIC_APP_URL` | Deployment URL |
| `NEXT_PUBLIC_PUSHER_KEY` | Pusher dashboard |
| `NEXT_PUBLIC_PUSHER_CLUSTER` | Pusher dashboard |
| `PUSHER_APP_ID` | Pusher dashboard |
| `PUSHER_SECRET` | Pusher dashboard (secret) |

All env vars are required. `.env*` files are in `.gitignore` — not tracked in version control.

## Scripts

| Command | Action |
|---------|--------|
| `npm run dev` | Start dev server |
| `npm run build` | Production build |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |
| `npx tsc --noEmit` | TypeScript type check (no npm script) |

No test, format, or codegen scripts exist.
