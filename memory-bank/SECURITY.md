# Security Documentation

## Overview

This document covers the security architecture, authentication model, authorization rules, and data protection measures for the BMS-OPR-PRD ERP system.

---

## Authentication

### Dual Session Model

The system uses **two independent session mechanisms**:

| Mechanism | Storage | Purpose | Managed By |
|-----------|---------|---------|------------|
| Supabase Auth Session | HTTP cookies (SSR) | Server-side auth verification, API route protection | `@supabase/ssr` SDK |
| Dashboard Session | `localStorage` | Client-side UI rendering decisions | `lib/auth/session.ts` |

**Security implications:**
- `localStorage` session is for display purposes only — it is NEVER trusted for server-side authorization
- All API routes verify the Supabase cookie session before processing requests
- The `proxy.ts` middleware validates the server-side session on every page navigation

### Login Methods

#### Form Login (Dashboard)
- **Endpoint**: `POST /api/auth/login`
- **Credentials**: Email + password + role selection
- **Auth provider**: Supabase Auth (`supabase.auth.signInWithPassword`)
- **Rate limiting**: Handled by Supabase Auth (returns rate limit errors)
- **Validation**: Role must be a valid `AppRole` (`superadmin`, `customer_service`, `marketing`)
- **Session**: Supabase sets HTTP cookies; client stores user data in `localStorage`

#### PIN Login (Workshop)
- **Endpoint**: `POST /api/auth/pin-login`
- **Credentials**: Username + 6-digit PIN
- **Password hashing**: bcrypt (via `bcrypt` npm package)
- **Flow**:
  1. User selects name from dropdown (fetched via QR token or direct)
  2. User enters 6-digit PIN via numpad UI
  3. Server looks up user by username, verifies bcrypt hash
  4. On success: Supabase `signInWithPassword` with generated credential
- **Security**: PIN is never stored in plaintext; bcrypt comparison on server

#### QR Login (Workshop)
- **Endpoint**: `POST /api/auth/qr-login`
- **Credential**: QR token (printed workstation QR code)
- **Flow**:
  1. User scans QR code → camera captures token
  2. Token identifies workstation + role
  3. User selects name from worker list for that role
  4. PIN entry follows (same as PIN login)
- **Limitation**: QR code itself does not authenticate — it only identifies the workstation/role. PIN is still required.

### Password Policy

- Dashboard users: managed by Supabase Auth (email-based password reset available)
- Workshop PINs: 6-digit numeric, bcrypt-hashed, changeable via `/workshop/settings/pin`
- PIN change requires current PIN verification

---

## Authorization

### Proxy Middleware (`proxy.ts`)

The Next.js middleware runs on every non-API, non-static request and enforces:

1. **Authentication check**: Redirects unauthenticated users to `/login`
2. **Role resolution**: Fetches user role from `users` table via Supabase
3. **Access control**: Validates role can access the requested path
4. **Invalid session handling**: Force-logout if role is unknown or user is inactive/deleted

### Role-Based Access Control

| Role | Can Access | Cannot Access |
|------|-----------|---------------|
| `superadmin` | All except `/dashboard/supervisor/*` | Supervisor dashboard |
| `customer_service` | `/dashboard/cs/*`, `/api/*` | Other dashboards |
| `marketing` | `/dashboard/marketing/*`, `/api/*` | Other dashboards |
| `operational_supervisor` | `/dashboard/supervisor/*`, `/api/*` | Other dashboards |
| `production_supervisor` | `/dashboard/supervisor/*`, `/api/*` | Other dashboards |
| Workshop roles (any other string) | `/workshop/*`, `/api/*` | Dashboard pages |

### API-Level Authorization

Route handlers enforce authorization at two levels:

1. **Authentication**: `createClient()` → `supabase.auth.getUser()` — verifies valid session
2. **Role authorization**: Additional checks per endpoint:
   - CS endpoints: checks `customer_service` or `superadmin` role
   - Supervisor endpoints: checks supervisor/management role group + allowed stages
   - Workshop endpoints: validates worker's allowed stages match the requested stage
   - Admin endpoints: checks `superadmin` role

**Dual-client pattern** for route handlers:
```typescript
const supabase = await createClient();  // Step 1: Auth check (RLS-enforced)
const admin = createAdminClient();       // Step 2: DB write (bypasses RLS — authorized only)
```

---

## Secrets & Environment Variables

### Sensitive Variables

| Variable | Sensitivity | Exposure |
|----------|-------------|----------|
| `SUPABASE_SERVICE_ROLE_KEY` | 🔴 CRITICAL | Server-side only (`lib/supabase/admin.ts`) |
| `PUSHER_SECRET` | 🔴 CRITICAL | Server-side only (`lib/pusher/server.ts`) |
| `PUSHER_APP_ID` | 🟡 Medium | Server-side only |
| `NEXT_PUBLIC_SUPABASE_URL` | 🟢 Low | Exposed to client (required by Supabase) |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | 🟢 Low | Exposed to client (anon key, RLS-enforced) |
| `NEXT_PUBLIC_PUSHER_KEY` | 🟢 Low | Exposed to client (required by Pusher) |
| `NEXT_PUBLIC_PUSHER_CLUSTER` | 🟢 Low | Exposed to client |
| `NEXT_PUBLIC_APP_URL` | 🟢 Low | Exposed to client |

### Protection Measures

- All `.env*` files are in `.gitignore` — **never committed**
- Service role key is only used server-side, never exposed to browser
- Admin client has `autoRefreshToken: false` and `persistSession: false`
- Public keys prefixed with `NEXT_PUBLIC_` are intended for client-side exposure

---

## Database Security

### Row Level Security (RLS)

- Supabase RLS is **enabled** on tables
- `lib/supabase/client.ts` (anon key) and `lib/supabase/server.ts` (anon key) are subject to RLS
- `lib/supabase/admin.ts` (service role key) **bypasses RLS** — used only in authorized server contexts

### Soft Deletes

- `users` table: `deleted_at` timestamptz column — soft-deleted users are rejected by auth checks
- `cs_orders`: `deleted_at` timestamptz column (inferred from queries filtering `.is("deleted_at", null)`)
- Soft-deleted records are filtered out in queries, not physically deleted

### Query Patterns

- All queries filter `.is("deleted_at", null)` to exclude soft-deleted records
- User status checked: `.eq("status", "active")` in auth resolution
- Single-record queries use `.single()` or `.maybeSingle()` — `.single()` throws if no match

---

## Realtime Security (Pusher)

### Channel Authorization

- Channel pattern: `private-user-{userId}`
- **Private channels** require server-side authentication before subscription
- Auth endpoint: `/api/pusher/auth` — validates user session before granting channel access
- Users can only subscribe to their own channel (`{userId}` must match authenticated user)

### Data in Transit

- Pusher uses TLS (enabled via `useTLS: true` in server config)
- All Supabase API calls use HTTPS
- LocationIQ address API calls use HTTPS

---

## API Security

### Authentication

- All non-public API routes call `supabase.auth.getUser()` first
- Returns `401 Unauthorized` if no valid session
- Returns `403 Forbidden` if role lacks permission

### Input Validation

- Role parameters validated against known `LoginRole` union
- Order data validated against `CsOrder` TypeScript interface
- Stage values validated against `STAGE_SEQUENCE`
- Action values restricted to `"approve"` | `"reject"` for approval endpoints
- Stage submission validates worker's allowed stages match requested stage

### Rate Limiting

- No application-level rate limiting implemented
- Supabase Auth has built-in rate limiting for login attempts
- Pusher has platform-level rate limits

---

## Security Checklist

| Item | Status | Notes |
|------|--------|-------|
| Service role key never exposed client-side | ✅ | Only used in `lib/supabase/admin.ts` |
| .env* in .gitignore | ✅ | |
| bcrypt for PIN hashing | ✅ | Workshop PINs |
| RLS enabled on tables | ✅ | Anon key subject to RLS |
| Soft delete pattern | ✅ | `deleted_at` column |
| Server-side auth on all API routes | ✅ | `supabase.auth.getUser()` |
| Private Pusher channels with auth | ✅ | `private-user-{userId}` pattern |
| Role-based path protection | ✅ | `proxy.ts` middleware |
| Stage-scoped authorization | ✅ | Supervisor + worker stage access |
| HTTPS for all external API calls | ✅ | |
| No secrets in client bundle | ✅ | Service role + Pusher secret server-only |
| No hardcoded credentials in code | ✅ | All via env vars |
| Form input validation | ✅ | TypeScript + runtime checks |
| Concurrent request safety | ✅ | No shared mutable state |
| SQL injection protection | ✅ | Supabase JS client uses parameterized queries |
