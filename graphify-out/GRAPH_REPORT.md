# Graph Report - erp-system  (2026-07-14)

## Corpus Check
- 262 files · ~207,624 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1419 nodes · 2745 edges · 101 communities (83 shown, 18 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 11 edges (avg confidence: 0.64)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `c3189ab1`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- [[_COMMUNITY_Supervisor API Routes|Supervisor API Routes]]
- [[_COMMUNITY_User and Branch Forms|User and Branch Forms]]
- [[_COMMUNITY_Custom Form Fields|Custom Form Fields]]
- [[_COMMUNITY_Dashboard UI Components|Dashboard UI Components]]
- [[_COMMUNITY_Account Management Modals|Account Management Modals]]
- [[_COMMUNITY_Workshop Login Pages|Workshop Login Pages]]
- [[_COMMUNITY_Client Session Management|Client Session Management]]
- [[_COMMUNITY_Database Schema Definitions|Database Schema Definitions]]
- [[_COMMUNITY_Data Normalization Utilities|Data Normalization Utilities]]
- [[_COMMUNITY_Superadmin QR API|Superadmin QR API]]
- [[_COMMUNITY_Expert Performance Analytics|Expert Performance Analytics]]
- [[_COMMUNITY_User Administration API|User Administration API]]
- [[_COMMUNITY_Production Reporting API|Production Reporting API]]
- [[_COMMUNITY_BMS Role Management|BMS Role Management]]
- [[_COMMUNITY_Manager Task Monitoring|Manager Task Monitoring]]
- [[_COMMUNITY_Branch Statistics Dashboard|Branch Statistics Dashboard]]
- [[_COMMUNITY_Order Detail Views|Order Detail Views]]
- [[_COMMUNITY_Daily Analysis Dashboard|Daily Analysis Dashboard]]
- [[_COMMUNITY_Management History Dashboard|Management History Dashboard]]
- [[_COMMUNITY_TypeScript Configuration|TypeScript Configuration]]
- [[_COMMUNITY_Marketing Channel Dashboard|Marketing Channel Dashboard]]
- [[_COMMUNITY_Data Viewer Utilities|Data Viewer Utilities]]
- [[_COMMUNITY_Order Form Helpers|Order Form Helpers]]
- [[_COMMUNITY_Owner KPI Dashboard|Owner KPI Dashboard]]
- [[_COMMUNITY_Order Action Handlers|Order Action Handlers]]
- [[_COMMUNITY_Customer Stage Progress|Customer Stage Progress]]
- [[_COMMUNITY_Dashboard Activity Feed|Dashboard Activity Feed]]
- [[_COMMUNITY_Stage Timeline Visualization|Stage Timeline Visualization]]
- [[_COMMUNITY_Project Dependencies|Project Dependencies]]
- [[_COMMUNITY_Lead Input Management|Lead Input Management]]
- [[_COMMUNITY_Order Entry Page|Order Entry Page]]
- [[_COMMUNITY_WhatsApp Template Integration|WhatsApp Template Integration]]
- [[_COMMUNITY_Order Field Components|Order Field Components]]
- [[_COMMUNITY_QR Code Management|QR Code Management]]
- [[_COMMUNITY_Supervisor Order Monitoring|Supervisor Order Monitoring]]
- [[_COMMUNITY_Development Dependencies|Development Dependencies]]
- [[_COMMUNITY_Order Creation API|Order Creation API]]
- [[_COMMUNITY_Management Task List|Management Task List]]
- [[_COMMUNITY_Order Status Lookup|Order Status Lookup]]
- [[_COMMUNITY_Scan Event Analytics|Scan Event Analytics]]
- [[_COMMUNITY_Management Navigation Sidebar|Management Navigation Sidebar]]
- [[_COMMUNITY_Stage Configuration API|Stage Configuration API]]
- [[_COMMUNITY_Root Layout Configuration|Root Layout Configuration]]
- [[_COMMUNITY_KPI Data Fetching|KPI Data Fetching]]
- [[_COMMUNITY_Order Detail API|Order Detail API]]
- [[_COMMUNITY_User Auth API|User Auth API]]
- [[_COMMUNITY_PIN Settings Page|PIN Settings Page]]
- [[_COMMUNITY_User Profile Modals|User Profile Modals]]
- [[_COMMUNITY_CICD Test Workflow|CI/CD Test Workflow]]
- [[_COMMUNITY_NPM Scripts|NPM Scripts]]
- [[_COMMUNITY_Monthly Insights API|Monthly Insights API]]
- [[_COMMUNITY_CSV Export Utilities|CSV Export Utilities]]
- [[_COMMUNITY_Report Generation Page|Report Generation Page]]
- [[_COMMUNITY_Mobile Navigation Sidebar|Mobile Navigation Sidebar]]
- [[_COMMUNITY_Order Detail Popup|Order Detail Popup]]
- [[_COMMUNITY_Cycle Time Analytics|Cycle Time Analytics]]
- [[_COMMUNITY_Report Selection Page|Report Selection Page]]
- [[_COMMUNITY_Bottleneck Monitoring Page|Bottleneck Monitoring Page]]
- [[_COMMUNITY_Supervisor QR Codes|Supervisor QR Codes]]
- [[_COMMUNITY_Stage Deadline Tracking|Stage Deadline Tracking]]
- [[_COMMUNITY_Item Detail Components|Item Detail Components]]
- [[_COMMUNITY_Working Day Calculations|Working Day Calculations]]
- [[_COMMUNITY_Weekly Activity API|Weekly Activity API]]
- [[_COMMUNITY_Financial Formatting API|Financial Formatting API]]
- [[_COMMUNITY_Customer Order History|Customer Order History]]
- [[_COMMUNITY_Production Loss API|Production Loss API]]
- [[_COMMUNITY_ItemRow.tsx|ItemRow.tsx]]
- [[_COMMUNITY_Order Timeline Logic|Order Timeline Logic]]
- [[_COMMUNITY_Order PDF Generation|Order PDF Generation]]
- [[_COMMUNITY_page.tsx|page.tsx]]
- [[_COMMUNITY_Module Activity API|Module Activity API]]
- [[_COMMUNITY_Account Mapping API|Account Mapping API]]
- [[_COMMUNITY_route.ts|route.ts]]
- [[_COMMUNITY_route.ts|route.ts]]
- [[_COMMUNITY_page.tsx|page.tsx]]
- [[_COMMUNITY_Address Autocomplete Utility|Address Autocomplete Utility]]
- [[_COMMUNITY_Auth Proxy Middleware|Auth Proxy Middleware]]
- [[_COMMUNITY_page.tsx|page.tsx]]
- [[_COMMUNITY_Worker Selection Component|Worker Selection Component]]
- [[_COMMUNITY_Slot Availability Logic|Slot Availability Logic]]
- [[_COMMUNITY_Package Metadata|Package Metadata]]
- [[_COMMUNITY_FilterPresets.tsx|FilterPresets.tsx]]
- [[_COMMUNITY_Workshop Layout Wrapper|Workshop Layout Wrapper]]
- [[_COMMUNITY_Loading Splash Screen|Loading Splash Screen]]
- [[_COMMUNITY_Login Form Component|Login Form Component]]
- [[_COMMUNITY_Numpad Input Component|Numpad Input Component]]
- [[_COMMUNITY_client.ts|client.ts]]
- [[_COMMUNITY_Select Input Component|Select Input Component]]
- [[_COMMUNITY_ESLint Configuration|ESLint Configuration]]
- [[_COMMUNITY_Next.js Configuration|Next.js Configuration]]
- [[_COMMUNITY_PostCSS Configuration|PostCSS Configuration]]
- [[_COMMUNITY_route.ts|route.ts]]
- [[_COMMUNITY_working-days.ts|working-days.ts]]
- [[_COMMUNITY_layout.ts|layout.ts]]

## God Nodes (most connected - your core abstractions)
1. `createClient()` - 138 edges
2. `createAdminClient()` - 107 edges
3. `getRoleProps()` - 50 edges
4. `fetcher()` - 43 edges
5. `Loading()` - 23 edges
6. `getClientUser()` - 23 edges
7. `ClientUser` - 21 edges
8. `compilerOptions` - 17 edges
9. `Button` - 15 edges
10. `getStageLabel()` - 14 edges

## Surprising Connections (you probably didn't know these)
- `GET()` --calls--> `createClient()`  [EXTRACTED]
  app/api/branches/route.ts → lib/supabase/server.ts
- `GET()` --calls--> `createClient()`  [EXTRACTED]
  app/api/qr-scan/route.ts → lib/supabase/server.ts
- `StageProgressBar()` --calls--> `getStageIndex()`  [EXTRACTED]
  components/orders/StageTimeline.tsx → lib/stages.ts
- `GET()` --calls--> `legacyToOrderDetail()`  [EXTRACTED]
  app/api/order-detail/route.ts → lib/legacy/adapter.ts
- `GET()` --calls--> `createClient()`  [EXTRACTED]
  app/api/analytics/cycle-time/route.ts → lib/supabase/server.ts

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **CI Pipeline Stages** — github_workflows_ci_job_typecheck, github_workflows_ci_job_lint, github_workflows_ci_job_test, github_workflows_ci_job_e2e [EXTRACTED 1.00]

## Communities (101 total, 18 thin omitted)

### Community 0 - "Supervisor API Routes"
Cohesion: 0.08
Nodes (31): GET(), GET(), GET(), POST(), mapStatusToStage(), POST(), POST(), POST() (+23 more)

### Community 1 - "User and Branch Forms"
Cohesion: 0.07
Nodes (48): BmsFormState, BmsUserForm(), BmsUserFormProps, BranchForm(), BranchFormProps, BranchFormState, MANAGEMENT_ROLE_LABELS, ManagementFormState (+40 more)

### Community 2 - "Custom Form Fields"
Cohesion: 0.10
Nodes (11): FormConfig, ConfirmationFormField(), PackagingFormField(), CertRow, Field, PaymentRow, COMPLEX_ARRAY_TYPES, COMPLEX_OBJ_TYPES (+3 more)

### Community 3 - "Dashboard UI Components"
Cohesion: 0.07
Nodes (35): CollapsibleSection(), AdminTask, Badge(), BnRow(), DELIVERY_LABELS, DeliveryOrder, EmptyState(), Expert (+27 more)

### Community 4 - "Account Management Modals"
Cohesion: 0.12
Nodes (34): CreateModal(), CreateModalProps, DeactivateModal(), DeactivateModalProps, DeleteModal(), DeleteModalProps, EditModal(), EditModalProps (+26 more)

### Community 5 - "Workshop Login Pages"
Cohesion: 0.14
Nodes (9): ALL_ROLES, AllRole, AppRole, AUTH_ONLY_PATHS, MANAGEMENT_ROUTES, PROTECTED_PREFIXES, PUBLIC_PREFIXES, WORKSHOP_ROUTES (+1 more)

### Community 6 - "Client Session Management"
Cohesion: 0.06
Nodes (34): POST(), POST(), POST(), GET(), POST(), GET(), POST(), GET() (+26 more)

### Community 7 - "Database Schema Definitions"
Cohesion: 0.06
Nodes (31): ActivityLogRow, ApprovalRow, ApprovalWithUser, AttachmentRow, BranchRow, CsInputRow, CsOrderRow, CsOrderWithUser (+23 more)

### Community 8 - "Data Normalization Utilities"
Cohesion: 0.27
Nodes (10): filterArr(), normalizeDariArtis(), normalizeLaser(), normalizeSumber(), PUBLIC_SELECT, PUT(), SOURCE_MAP, strOrNull() (+2 more)

### Community 9 - "Superadmin QR API"
Cohesion: 0.07
Nodes (33): POST(), DELETE(), GET(), POST(), SKIP_NOTIFY_STATUSES, GET(), GET(), DELETE() (+25 more)

### Community 10 - "Expert Performance Analytics"
Cohesion: 0.09
Nodes (13): AnalisisPage(), AnalystData, currentPeriod(), ExpertPerformance, OrderFlowPoint, QC_LABELS, QCMetric, ROLE_CONFIG (+5 more)

### Community 11 - "User Administration API"
Cohesion: 0.17
Nodes (17): SortKey, ROLE_DISPLAY, Manager, ManagerCard(), ProgressRow, Task, TaskItem, Manager (+9 more)

### Community 12 - "Production Reporting API"
Cohesion: 0.10
Nodes (20): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+12 more)

### Community 13 - "BMS Role Management"
Cohesion: 0.14
Nodes (23): admin, BMS_ROLE_NAMES, BmsRoleName, DELETE(), GET(), isBmsRoleName(), isManagementRoleName(), MANAGEMENT_ROLE_NAMES (+15 more)

### Community 14 - "Manager Task Monitoring"
Cohesion: 0.39
Nodes (6): formatCurrency(), formatNumber(), formatPercentage(), GET(), toCSV(), InputMarketingPage()

### Community 15 - "Branch Statistics Dashboard"
Cohesion: 0.10
Nodes (19): BMSStatsData, BranchRow, ChannelRow, ComparisonMode, DailyStaff, DailyStats, fmtRp(), fmtRpShort() (+11 more)

### Community 16 - "Order Detail Views"
Cohesion: 0.08
Nodes (18): formatDate(), getTheme(), GROUP_THEME, OrderDetailData, Phase, ROLE_STAGE_MAP, STAGE_LABELS, Theme (+10 more)

### Community 17 - "Daily Analysis Dashboard"
Cohesion: 0.10
Nodes (10): DailyAnalysisPage(), DailyData, DailyStaffRow, DailyTotals, DailyTrend, fmtRpShort(), HeroBanner(), P (+2 more)

### Community 18 - "Management History Dashboard"
Cohesion: 0.13
Nodes (19): FilterTab, formatDate(), ManagementTasksPage(), ManagementDashboardPage(), DashboardStats, HistoryEntry, InsightCardData, ManagerData (+11 more)

### Community 19 - "TypeScript Configuration"
Cohesion: 0.12
Nodes (18): ACTION_LABELS, ApprovalEvent, formatDateTime(), getKonfirmasiInfo(), getKonfirmasiPhotos(), getTukangInfo(), getUserName(), MOTIF_LABELS (+10 more)

### Community 20 - "Marketing Channel Dashboard"
Cohesion: 0.18
Nodes (6): BANKS, RecentInput, StatsData, iconMap, menuItems, CS_ROUTES

### Community 21 - "Data Viewer Utilities"
Cohesion: 0.06
Nodes (17): ActionState, CHECKLIST_LABELS, FilterTab, formatRelative(), KEY_LABELS, PendingCard(), PendingItem, VALUE_LABELS (+9 more)

### Community 22 - "Order Form Helpers"
Cohesion: 0.14
Nodes (18): CopyLinkButton(), FormStatusBadge(), RefImageUpload(), BANKS, csOrderToFormData(), draftKey(), emptyFormData(), formDataToPatch() (+10 more)

### Community 23 - "Owner KPI Dashboard"
Cohesion: 0.11
Nodes (7): QRCodeCard(), ACTIVITY_ICON, ActivityRow(), DashboardData, formatRelativeTime(), STAGE_BAR_CLASS, STAGE_LABELS

### Community 24 - "Order Action Handlers"
Cohesion: 0.16
Nodes (16): GET(), getClientIP(), handleDeleteOrder(), handleEditWork(), handleReadOrder(), handleRejectOrder(), handleStartWork(), isValidAction() (+8 more)

### Community 25 - "Customer Stage Progress"
Cohesion: 0.36
Nodes (9): CUSTOMER_STAGE_SEQUENCE, getProgressPercent(), getStageGroup(), getStageIndex(), isStageActive(), isStageCompleted(), isStageUpcoming(), STAGE_GROUP (+1 more)

### Community 26 - "Dashboard Activity Feed"
Cohesion: 0.12
Nodes (6): ActivityItem, AlertItem, DashboardSnapshot, fmtRpShort(), formatFullDate(), SuperadminDashboard()

### Community 27 - "Stage Timeline Visualization"
Cohesion: 0.40
Nodes (5): EstimatedCompletion(), EstimatedCompletionProps, fmtDuration(), StageStat, STAGE_SEQUENCE

### Community 28 - "Project Dependencies"
Cohesion: 0.11
Nodes (18): dependencies, bcrypt, date-holidays, @hello-pangea/dnd, lucide-react, next, pusher, pusher-js (+10 more)

### Community 29 - "Lead Input Management"
Cohesion: 0.09
Nodes (17): LeadInput, MarketingChannel, Channel, CSInput, CSUser, AlertProps, Button, ButtonProps (+9 more)

### Community 30 - "Order Entry Page"
Cohesion: 0.13
Nodes (13): BANKS, emptyFormData(), formatRupiah(), LABELS, OrderFormPage(), PageState, paymentCategory(), SUB_SOURCES (+5 more)

### Community 31 - "WhatsApp Template Integration"
Cohesion: 0.21
Nodes (11): buildRequest(), getCredentials(), normalizeWa(), parseErrorResponse(), parseSuccessResponse(), sendTemplate(), SendTemplateParams, SendTemplateResult (+3 more)

### Community 33 - "QR Code Management"
Cohesion: 0.13
Nodes (8): ACTION_STYLES, AlertState, EMPTY_GENERATE_FORM, KelolaQRPage(), QRCodeCardProps, ROLE_GROUP_STYLES, ScanEvent, STAGE_LABELS

### Community 34 - "Supervisor Order Monitoring"
Cohesion: 0.30
Nodes (7): ALL_MAT_TYPES, ALL_TX_TYPES, MAT_TYPE_LABELS, MaterialRow, MaterialType, TransactionType, TX_TYPE_LABELS

### Community 35 - "Development Dependencies"
Cohesion: 0.13
Nodes (15): devDependencies, eslint, eslint-config-next, jsdom, @supabase/supabase-js, tailwindcss, @tailwindcss/postcss, @types/bcrypt (+7 more)

### Community 36 - "Order Creation API"
Cohesion: 0.23
Nodes (12): ALLOWED_TYPES, POST(), ALLOWED_FORM_FIELDS, DELETE(), PUT(), generateOrderNumber(), GET(), POST() (+4 more)

### Community 37 - "Management Task List"
Cohesion: 0.28
Nodes (5): formatCurrency(), formatDate(), OrderDetail, OrderDetailPopup(), STAGE_COLORS

### Community 38 - "Order Status Lookup"
Cohesion: 0.31
Nodes (7): GET(), verifyBearerToken(), CekatOrderStatus, computePaymentStatus(), lookupByCustomerWa(), lookupByOrderNumber(), normalizeWa()

### Community 39 - "Scan Event Analytics"
Cohesion: 0.24
Nodes (11): ACTION_LABELS, GET(), getDateRange(), isValidAction(), isValidStage(), POST(), ScanEventStats, ScanEventWithRelations (+3 more)

### Community 40 - "Management Navigation Sidebar"
Cohesion: 0.36
Nodes (9): canAccessPath(), getDashboardPath(), isAuthOnlyPath(), isProtectedPath(), isWorkshopRole(), config, fetchUserRoleName(), proxy() (+1 more)

### Community 41 - "Stage Configuration API"
Cohesion: 0.20
Nodes (11): enrichTukangOptions(), FieldConfig, FieldType, GET(), hasAccess(), NOTES, ROLE_STAGES, STAGE_CONFIGS (+3 more)

### Community 42 - "Root Layout Configuration"
Cohesion: 0.18
Nodes (9): cormorantGaramond, dmSans, dmSerifDisplay, geistMono, geistSans, inter, metadata, playfairDisplay (+1 more)

### Community 43 - "KPI Data Fetching"
Cohesion: 0.10
Nodes (9): PATCH(), GET(), DELETE(), GET(), POST(), pusher, STAGE_LABELS, SupervisorInfo (+1 more)

### Community 44 - "Order Detail API"
Cohesion: 0.24
Nodes (9): CurrentUserWithRole, DELETE(), GET(), isValidUUID(), OrderWithCustomer, Role, ScanEventDetail, StageResult (+1 more)

### Community 45 - "User Auth API"
Cohesion: 0.29
Nodes (9): ALLOWED_ROLES, checkAuth(), DELETE(), GET(), PATCH(), POST(), QRCode, Role (+1 more)

### Community 46 - "PIN Settings Page"
Cohesion: 0.20
Nodes (4): Mode, Step, UserProfile, BrandHeaderProps

### Community 47 - "User Profile Modals"
Cohesion: 0.17
Nodes (6): HeaderProps, ProfileData, ProfileData, SettingsModalProps, clearClientUser(), ROUTES

### Community 48 - "CI/CD Test Workflow"
Cohesion: 0.22
Nodes (9): ESLint, E2E Tests Job, Lint Job, Tests Job, Type Check Job, CI Workflow, @playwright/test, Playwright Tests (+1 more)

### Community 49 - "NPM Scripts"
Cohesion: 0.20
Nodes (10): scripts, build, dev, lint, postinstall, start, test, test:e2e (+2 more)

### Community 50 - "Monthly Insights API"
Cohesion: 0.44
Nodes (8): formatCurrency(), generateInsights(), GET(), getDayName(), getDaysInMonth(), getDaysRemainingInMonth(), getLast7DaysHistory(), getMonthName()

### Community 51 - "CSV Export Utilities"
Cohesion: 0.43
Nodes (5): DAY_ABBR, GET(), last7Days(), prevDay(), sumField()

### Community 52 - "Report Generation Page"
Cohesion: 0.15
Nodes (9): AlertState, buildTitle(), LaporanPage(), MONTH_NAMES, Report, ReportType, ConfirmDialogProps, ConfirmVariant (+1 more)

### Community 53 - "Mobile Navigation Sidebar"
Cohesion: 0.20
Nodes (13): advanceOrder(), APPROVAL_GATE_MAP, getAttemptNumber(), hasAccess(), nextInSequence(), POST(), pushStageToYii2(), recordSubmission() (+5 more)

### Community 54 - "Order Detail Popup"
Cohesion: 0.14
Nodes (9): ActiveTab, SlotCategory, SlotOverride, UserInfo, KpiApiResponse, fetcher(), handleUnauthorized(), mutator() (+1 more)

### Community 55 - "Cycle Time Analytics"
Cohesion: 0.32
Nodes (6): calculateAverageCycleTime(), DailyStatsResponse, estimateWipValue(), GET(), PRODUCTION_ROLES, STAGE_ORDER

### Community 56 - "Report Selection Page"
Cohesion: 0.09
Nodes (21): formatRupiah(), PelangganGroup, PelangganOrder, PelangganPage(), HistoryEntry, Task, TaskItem, Task (+13 more)

### Community 57 - "Bottleneck Monitoring Page"
Cohesion: 0.20
Nodes (8): BottleneckTableRow(), formatHours(), getStatusInfo(), BottleneckHeatmap(), fmtCount(), HeatmapData, CustomerTimeline(), getStageLabel()

### Community 58 - "Supervisor QR Codes"
Cohesion: 0.13
Nodes (18): ACTIVE_STAGES, StageBottleneck, GET(), APPROVAL_STAGES, APPROVAL_TO_PRODUCTION_STAGE, GET(), OPERATIONAL_APPROVAL_STAGES, PRODUCTION_APPROVAL_STAGES (+10 more)

### Community 59 - "Stage Deadline Tracking"
Cohesion: 0.33
Nodes (5): CycleStageData, CycleTimeData, CycleTimeTab(), fmtHours(), MonthlyTrend

### Community 60 - "Item Detail Components"
Cohesion: 0.28
Nodes (4): escapeCSV(), GET(), PRODUCTION_ROLES, toCSV()

### Community 61 - "Working Day Calculations"
Cohesion: 0.29
Nodes (3): ComplRow, FieldItem, QualityRow

### Community 62 - "Weekly Activity API"
Cohesion: 0.53
Nodes (5): DELETE(), Params, PATCH(), PUT(), requireSuperadmin()

### Community 63 - "Financial Formatting API"
Cohesion: 0.80
Nodes (4): GET(), mapAccount(), POST(), verifySupervisorScope()

### Community 67 - "Production Loss API"
Cohesion: 0.33
Nodes (3): PRODUCTION_ROLES, QC_STAGES, SUSUT_STAGES

### Community 68 - "ItemRow.tsx"
Cohesion: 0.28
Nodes (7): C, Diamond(), getStatusLabel(), ItemRow(), ItemRowProps, Segment, SEGMENTS

### Community 69 - "Order Timeline Logic"
Cohesion: 0.73
Nodes (4): CustomerTimelineProps, Delivery, StageResult, Transition

### Community 70 - "Order PDF Generation"
Cohesion: 0.40
Nodes (5): fmtDate(), FONT_SRC, OrderFormPDF(), PDF_CACHE_BUST, s

### Community 71 - "page.tsx"
Cohesion: 0.32
Nodes (4): ROLE_GROUP_STYLES, STAGE_LABELS, QRCode, Role

### Community 73 - "Account Mapping API"
Cohesion: 0.28
Nodes (6): POST(), ROLE_CONFIGS, RoleConfig, isLoginRole(), isAppRole(), queryParamToAppRole()

### Community 75 - "route.ts"
Cohesion: 0.40
Nodes (3): APPROVAL_STAGES, PRODUCTION_TO_APPROVAL_STAGE, SUPERVISOR_ALLOWED_STAGES

### Community 76 - "page.tsx"
Cohesion: 0.40
Nodes (3): Assignment, PersonnelResponse, PersonnelUser

### Community 81 - "Slot Availability Logic"
Cohesion: 0.15
Nodes (9): FormFieldsProps, inputCls(), OrderFormFields(), formatRupiah(), paymentCategory(), FONT_OPTIONS, GROUPS, MaterialSelect() (+1 more)

### Community 82 - "Package Metadata"
Cohesion: 0.50
Nodes (3): name, private, version

### Community 102 - "route.ts"
Cohesion: 0.29
Nodes (5): APPROVAL_STAGES, APPROVAL_STAGES_ARRAY, APPROVAL_TO_PRODUCTION_STAGE, PRODUCTION_TO_APPROVAL_STAGE, SUPERVISOR_VISIBLE_STAGES

### Community 104 - "working-days.ts"
Cohesion: 0.21
Nodes (13): StageDeadlineBadge(), getScaleFactor(), getStageDeadline(), getStageDeadlineStatus(), STAGE_H_DAYS, StageDeadlineStatus, subtractWorkingDays(), addWorkingDays() (+5 more)

### Community 114 - "layout.ts"
Cohesion: 0.20
Nodes (9): iconMap, menuItems, SidebarProps, MARKETING_ROUTES, SUPERADMIN_ROUTES, SUPERVISOR_ROUTES, CollapseState, MenuItem (+1 more)

## Knowledge Gaps
- **443 isolated node(s):** `SyncResult`, `PRODUCTION_ROLES`, `SUSUT_STAGES`, `QC_STAGES`, `ACTIVE_STAGES` (+438 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **18 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `fetcher()` connect `Order Detail Popup` to `User and Branch Forms`, `Account Management Modals`, `Expert Performance Analytics`, `User Administration API`, `Branch Statistics Dashboard`, `Order Detail Views`, `Daily Analysis Dashboard`, `Management History Dashboard`, `Marketing Channel Dashboard`, `Data Viewer Utilities`, `Order Form Helpers`, `Owner KPI Dashboard`, `Dashboard Activity Feed`, `Stage Timeline Visualization`, `Lead Input Management`, `Order Entry Page`, `QR Code Management`, `Management Task List`, `PIN Settings Page`, `User Profile Modals`, `Report Generation Page`, `Report Selection Page`, `Bottleneck Monitoring Page`, `Stage Deadline Tracking`, `page.tsx`, `page.tsx`, `page.tsx`?**
  _High betweenness centrality (0.103) - this node is a cross-community bridge._
- **Why does `createClient()` connect `Superadmin QR API` to `Supervisor API Routes`, `Order Creation API`, `Client Session Management`, `Scan Event Analytics`, `Account Mapping API`, `KPI Data Fetching`, `Order Detail API`, `User Auth API`, `Manager Task Monitoring`, `BMS Role Management`, `Monthly Insights API`, `CSV Export Utilities`, `Order Action Handlers`, `Weekly Activity API`, `Financial Formatting API`?**
  _High betweenness centrality (0.083) - this node is a cross-community bridge._
- **Why does `createAdminClient()` connect `Supervisor API Routes` to `Order Creation API`, `Client Session Management`, `Scan Event Analytics`, `Order Status Lookup`, `Superadmin QR API`, `KPI Data Fetching`, `User Auth API`, `BMS Role Management`, `Financial Formatting API`?**
  _High betweenness centrality (0.045) - this node is a cross-community bridge._
- **What connects `SyncResult`, `PRODUCTION_ROLES`, `SUSUT_STAGES` to the rest of the system?**
  _443 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Supervisor API Routes` be split into smaller, more focused modules?**
  _Cohesion score 0.07607843137254902 - nodes in this community are weakly interconnected._
- **Should `User and Branch Forms` be split into smaller, more focused modules?**
  _Cohesion score 0.06957047791893527 - nodes in this community are weakly interconnected._
- **Should `Custom Form Fields` be split into smaller, more focused modules?**
  _Cohesion score 0.10144927536231885 - nodes in this community are weakly interconnected._