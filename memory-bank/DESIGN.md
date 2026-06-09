# UI/UX Design Documentation

## Overview

The system uses **Tailwind CSS v4** for all styling with a hand-crafted component library (no third-party UI kit). All 33 components in `components/` are `"use client"` with local state management via `useState`/`useEffect`.

---

## Design System

### Color Palette

| Role | Primary Gradient | Usage |
|------|-----------------|-------|
| Superadmin | `from-purple-600 to-indigo-600` | Badges, nav highlights |
| Customer Service | `from-blue-600 to-cyan-600` | Badges, nav highlights |
| Marketing | `from-green-600 to-emerald-600` | Badges, nav highlights |
| Supervisor | `from-amber-600 to-orange-600` | Badges, nav highlights |

**Functional colors:**
- **Indigo**: Primary actions (buttons, focus rings, active nav)
- **Amber**: Warnings, progress indicators, workshop branding
- **Emerald**: Success, completed states, confirmation
- **Rose/Red**: Errors, danger, rejection
- **Stone/Slate**: Neutral backgrounds, borders, secondary text

### Typography

- **Font**: Geist Sans (body) + Geist Mono (monospace) via `next/font/google`
- **Base**: `text-sm` (14px) for body, `text-xs` (12px) for labels
- **Headings**: `text-lg` to `text-3xl` with `font-semibold` or `font-bold`
- **Custom sizes**: `text-[7px]`, `text-[10px]`, `text-[11px]`, `text-[13px]`, `text-[15px]` used for fine-grained control
- **Uppercase tracking**: `text-[11px] uppercase tracking-[0.2em]` for section labels
- **Engraving fonts** (8 custom fonts loaded via `@font-face` in `globals.css`):
  - Faradisa Script, Kingsman Demo, Alex Brush, Brush Script, Pristina, Palatino Linotype, Gabriola, Constantia

### Component Primitives (`components/ui/`)

**Button** — 7 variants, 5 sizes, loading spinner, icon slots
- Variants: `primary`, `secondary`, `success`, `danger`, `warning`, `outline`, `ghost`
- Sizes: `xs`, `sm`, `md`, `lg`, `xl`
- Uses `forwardRef`

**Input** — Label, error state (red border), helper text, `fullWidth`, `forwardRef`

**Select** — Native `<select>` wrapper, typed options, label, error, `forwardRef`

**Modal** — Overlay dialog, backdrop, Escape/click-outside dismiss, sizes `sm`/`md`/`lg`/`xl`, scrollable body (max 90vh), configurable footer

**Alert** — Toast notification, 4 types (success/error/warning/info), auto-dismiss (5s), slide-down animation

**ConfirmDialog** — Confirmation modal with 3 variants (danger/warning/info), loading button, backdrop blur, Indonesian labels ("Konfirmasi", "Batal", "Memproses")

**Loading** — 3 variants: `spinner` (rotating ring), `dots` (bouncing), `skeleton` (shapes), configurable size/text/fullScreen

---

## Layout Patterns

### Dashboard Layout (All Dashboards)

```
┌─────────────────────────────────────────────────┐
│  Sidebar (sticky)  │  ┌───────────────────────┐ │
│                    │  │  Header (sticky)       │ │
│  ┌─────────────┐  │  │  ┌─────┐ ┌───────┐    │ │
│  │ Role Badge  │  │  │  │ Greet│ │ Notif │    │ │
│  ├─────────────┤  │  │  └─────┘ └───────┘    │ │
│  │ Nav Items   │  │  ├───────────────────────┤ │
│  │ (role-based)│  │  │                       │ │
│  │             │  │  │  Main Content Area    │ │
│  │ • Menu 1   │  │  │  (scrollable overflow)│ │
│  │ • Menu 2   │  │  │                       │ │
│  │ • Submenu  │  │  │                       │ │
│  │   - Item   │  │  │                       │ │
│  └─────────────┘  │  └───────────────────────┘ │
└─────────────────────────────────────────────────┘
```

- `flex h-screen bg-gray-50` container
- Sidebar: fixed width (`w-60` or `w-64`), sticky with `md:sticky`, collapsible submenus
- Header: sticky top, time-based greeting ("Selamat pagi/siang/sore/malam"), notification bell (Pusher + polling), profile dropdown
- Mobile: hamburger toggle opens `MobileSidebar` drawer, `MobileHeader` with compact layout

### Workshop Layout

```
┌──────────────────────────────────────────────┐
│  (Stone-50 background with subtle texture)   │
│                                              │
│        ┌──────────────────────────┐          │
│        │                          │          │
│        │   Centered Content       │          │
│        │   (responsive padding)   │          │
│        │                          │          │
│        └──────────────────────────┘          │
│                                              │
│   "Workshop Management System" footer         │
└──────────────────────────────────────────────┘
```

- Stone-50 background with SVG texture overlay (`opacity-[0.015]`)
- Centered, vertically stacked content
- Footer: `text-[11px] uppercase tracking-[0.2em] text-stone-300`

### Landing/Public Layout

- Dark theme (`#0f1623` backgrounds)
- Used for `/` landing page and `/order-form/[token]`
- Minimal layout, full-screen branding

---

## Responsive Design

- **Breakpoint**: `md:` (768px) is primary
- Mobile-first approach: `grid-cols-1 sm:grid-cols-2 lg:grid-cols-4`
- Sidebar: Desktop = sticky sidebar, Mobile = slide-in drawer
- Tables: `overflow-x-auto` for horizontal scroll on small screens
- Toggle visibility: `hidden md:block` / `md:hidden`
- Touch-friendly: `active:scale-[0.98]` press effects on workshop components

---

## Component Architecture

### Data Fetching Pattern

```typescript
useEffect(() => {
  (async () => {
    setIsLoading(true);
    const res = await fetch("/api/...");
    const json = await res.json();
    if (json.success) setData(json.data);
    setIsLoading(false);
  })();
}, []);
```

- Manual `fetch()` + `useEffect` — no React Query, SWR, or similar
- Auto-refresh intervals: 30s (KpiCards), 60s (notifications)
- Loading: skeleton states for data views
- Error: retry buttons with error messages

### Component Patterns

- **Interface-first**: Every component defines dedicated props interface
- **Default exports**: 27 of 33 components use `export default function`
- **`forwardRef`**: Used on `Button`, `Input`, `Select`
- **Sub-components**: Co-located in same file (e.g., `StageProgressBar` in `StageTimeline.tsx`)
- **Display name**: Set manually on `forwardRef` components
- **No server components**: All 33 components in `components/` are `"use client"`

---

## Key Pages & Their Components

| Page | Key Components | Features |
|------|---------------|----------|
| `/login` | — | Role dropdown, email/password, demo quick-fill, dark theme |
| `/dashboard/cs/input-order` | `MaterialSelect`, `FontPicker`, `EngravingSelect`, `AddsOnAccordion`, `AddressAutocomplete` | ~2673 lines, auto-save drafts, working-day calc, slot check |
| `/dashboard/supervisor/approval` | — | Approve/reject flow, per-stage verification popup, QC checklists |
| `/dashboard/superadmin/oprprd/monitoring` | — | ~3016 lines, expert/tukang tracking, scan history, live status |
| `/workshop/input` | `StageInputForm` (2183 lines, 22+ field types) | Dynamic form renderer, stage-specific fields, deadline timer |
| `/workshop/login` | `LoginForm`, `WorkerSelect`, `PinPad` | QR scan + PIN numpad, role detection |
| `/order-form/[token]` | Same as input-order | Public no-auth form, customer-facing |

---

## Icons

- **`lucide-react`**: Used in 8 components (newer components)
- **Inline SVGs**: Used in older components (Sidebar, Header)
- Transition in progress from inline SVGs to `lucide-react`

---

## Charts & Data Visualization

- **`ChartCard`** (`components/dashboard/ChartCard.tsx`): Raw Canvas 2D API, bar and line charts, HiDPI-aware (`devicePixelRatio`)
- **`recharts`**: Used in analytics pages (BMS Statistics, OPRPRD Analysis) for BarChart, ResponsiveContainer, Tooltip
- **Analytics components** (`components/analytics/`): WorkerProductivityTab, CycleTimeTab, BottleneckHeatmap, EstimatedCompletion — all use `recharts` + `lucide-react`

---

## Notifications UI

- Real-time Pusher subscription on `private-user-{userId}` channel
- Polling fallback every 60s
- Notification dropdown in Header/MobileHeader with:
  - Read/unread visual states
  - Mark-all-read action
  - Deep link navigation
  - Auto-dismiss toast on new notification

---

## Stage Timeline UI

Two timeline components in `components/orders/`:

**StageTimeline** (supervisor/internal view):
- Merges transitions, submissions, scan events, approvals into chronological feed
- Distinct icon per event type (colored dot/icon in ring via `lucide-react`)
- Includes `StageProgressBar` (two-row dot progression of all 20 stages)

**CustomerTimeline** (public/client-facing):
- Simplified view with progress percentage
- Status badge, labeled stage list with checkmarks/active dots/dates
- Reference images for pria/wanita rings
- Delivery info card

---

## PDF Generation

- **`OrderFormPDF.tsx`** using `@react-pdf/renderer`
- A5 landscape "Form Tukang" (craftsman worksheet)
- Two-column layout: ring photos + engraving + specs on left, measurements on right
- Registers 8 engraving fonts from `/public/fonts/`
- Pinned footer

---

## Accessibility & UX Details

- Keyboard support: PinPad accepts digit keys, Backspace, Enter, Escape
- Escape key closes Modal, ConfirmDialog
- Click-outside-to-close on Modal
- Body scroll lock when MobileSidebar open
- Autocomplete debounced at 450ms with minimum 4 characters
- Form validation with error messages in Indonesian
- Skeleton loading states for data-heavy pages
