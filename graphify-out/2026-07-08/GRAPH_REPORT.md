# Graph Report - erp-system  (2026-07-03)

## Corpus Check
- 253 files · ~203,721 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1387 nodes · 2359 edges · 98 communities (80 shown, 18 thin omitted)
- Extraction: 89% EXTRACTED · 11% INFERRED · 0% AMBIGUOUS · INFERRED: 258 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `d3848f42`
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
- [[_COMMUNITY_Stage Visibility API|Stage Visibility API]]
- [[_COMMUNITY_Customer Order History|Customer Order History]]
- [[_COMMUNITY_Worker History Cards|Worker History Cards]]
- [[_COMMUNITY_Production Loss API|Production Loss API]]
- [[_COMMUNITY_Order Grouping API|Order Grouping API]]
- [[_COMMUNITY_Order Timeline Logic|Order Timeline Logic]]
- [[_COMMUNITY_Order PDF Generation|Order PDF Generation]]
- [[_COMMUNITY_Order Validation Schemas|Order Validation Schemas]]
- [[_COMMUNITY_Module Activity API|Module Activity API]]
- [[_COMMUNITY_Account Mapping API|Account Mapping API]]
- [[_COMMUNITY_Personnel Management Page|Personnel Management Page]]
- [[_COMMUNITY_Slot Management Page|Slot Management Page]]
- [[_COMMUNITY_Completion Estimation Component|Completion Estimation Component]]
- [[_COMMUNITY_Address Autocomplete Utility|Address Autocomplete Utility]]
- [[_COMMUNITY_Auth Proxy Middleware|Auth Proxy Middleware]]
- [[_COMMUNITY_Worker Selection Component|Worker Selection Component]]
- [[_COMMUNITY_Slot Availability Logic|Slot Availability Logic]]
- [[_COMMUNITY_Package Metadata|Package Metadata]]
- [[_COMMUNITY_Workshop Layout Wrapper|Workshop Layout Wrapper]]
- [[_COMMUNITY_Font Selection Component|Font Selection Component]]
- [[_COMMUNITY_Loading Splash Screen|Loading Splash Screen]]
- [[_COMMUNITY_Login Form Component|Login Form Component]]
- [[_COMMUNITY_Numpad Input Component|Numpad Input Component]]
- [[_COMMUNITY_Generic Loading Component|Generic Loading Component]]
- [[_COMMUNITY_Select Input Component|Select Input Component]]
- [[_COMMUNITY_ESLint Configuration|ESLint Configuration]]
- [[_COMMUNITY_Supabase Client Setup|Supabase Client Setup]]
- [[_COMMUNITY_Next.js Configuration|Next.js Configuration]]
- [[_COMMUNITY_PostCSS Configuration|PostCSS Configuration]]

## God Nodes (most connected - your core abstractions)
1. `createClient()` - 104 edges
2. `createAdminClient()` - 86 edges
3. `getRoleProps()` - 42 edges
4. `compilerOptions` - 17 edges
5. `AlertState` - 12 edges
6. `Account` - 12 edges
7. `POST()` - 11 edges
8. `requireCsOrAdmin()` - 10 edges
9. `PUT()` - 10 edges
10. `scripts` - 10 edges

## Surprising Connections (you probably didn't know these)
- `POST()` --calls--> `createClient()`  [INFERRED]
  app/api/auth/logout/route.ts → lib/supabase/server.ts
- `GET()` --calls--> `createClient()`  [INFERRED]
  app/api/marketing/analytics/route.ts → lib/supabase/server.ts
- `GET()` --calls--> `createClient()`  [INFERRED]
  app/api/marketing/channels/route.ts → lib/supabase/server.ts
- `PATCH()` --calls--> `createClient()`  [INFERRED]
  app/api/notifications/[id]/route.ts → lib/supabase/server.ts
- `GET()` --calls--> `createAdminClient()`  [INFERRED]
  app/api/order-form/[token]/route.ts → lib/supabase/admin.ts

## Import Cycles
- 1-file cycle: `app/loading.tsx -> app/loading.tsx`

## Hyperedges (group relationships)
- **CI Pipeline Stages** — github_workflows_ci_job_typecheck, github_workflows_ci_job_lint, github_workflows_ci_job_test, github_workflows_ci_job_e2e [EXTRACTED 1.00]

## Communities (98 total, 18 thin omitted)

### Community 0 - "Supervisor API Routes"
Cohesion: 0.04
Nodes (36): GET(), GET(), POST(), POST(), POST(), POST(), POST(), DELETE() (+28 more)

### Community 1 - "User and Branch Forms"
Cohesion: 0.06
Nodes (52): BmsFormState, BmsUserForm(), BmsUserFormProps, BranchForm(), BranchFormProps, BranchFormState, MANAGEMENT_ROLE_LABELS, ManagementFormState (+44 more)

### Community 2 - "Custom Form Fields"
Cohesion: 0.07
Nodes (19): ALL_MAT_TYPES, ALL_TX_TYPES, CertRow, ComplRow, Field, FieldItem, FieldOption, MAT_TYPE_LABELS (+11 more)

### Community 3 - "Dashboard UI Components"
Cohesion: 0.07
Nodes (43): CollapsibleSection(), FilterPresets(), Preset, OperasionalTab(), OverviewTab(), ProduksiTab(), AdminTask, Badge() (+35 more)

### Community 4 - "Account Management Modals"
Cohesion: 0.11
Nodes (34): CreateModal(), CreateModalProps, DeactivateModal(), DeactivateModalProps, DeleteModal(), DeleteModalProps, EditModal(), EditModalProps (+26 more)

### Community 5 - "Workshop Login Pages"
Cohesion: 0.07
Nodes (21): Step, WorkerInfo, ALL_ROLES, AllRole, AppRole, AUTH_ONLY_PATHS, canAccessPath(), CS_ROUTES (+13 more)

### Community 6 - "Client Session Management"
Cohesion: 0.04
Nodes (44): GET(), POST(), POST(), ACTIVE_STAGES, GET(), StageBottleneck, GET(), POST() (+36 more)

### Community 7 - "Database Schema Definitions"
Cohesion: 0.06
Nodes (31): ActivityLogRow, ApprovalRow, ApprovalWithUser, AttachmentRow, BranchRow, CsInputRow, CsOrderRow, CsOrderWithUser (+23 more)

### Community 8 - "Data Normalization Utilities"
Cohesion: 0.13
Nodes (19): filterArr(), GET(), normalizeDariArtis(), normalizeLaser(), normalizeSumber(), PUBLIC_SELECT, PUT(), SOURCE_MAP (+11 more)

### Community 9 - "Superadmin QR API"
Cohesion: 0.09
Nodes (27): DELETE(), Params, PATCH(), PUT(), requireSuperadmin(), GET(), POST(), ALLOWED_TYPES (+19 more)

### Community 10 - "Expert Performance Analytics"
Cohesion: 0.07
Nodes (18): AnalisisPage(), AnalystData, currentPeriod(), ExpertPerformance, OrderFlowPoint, QC_LABELS, QCMetric, ROLE_CONFIG (+10 more)

### Community 11 - "User Administration API"
Cohesion: 0.12
Nodes (24): DELETE(), PATCH(), DELETE(), GET(), POST(), SKIP_NOTIFY_STATUSES, GET(), PUT() (+16 more)

### Community 12 - "Production Reporting API"
Cohesion: 0.33
Nodes (6): APPROVAL_STAGES, APPROVAL_TO_PRODUCTION_STAGE, GET(), OPERATIONAL_APPROVAL_STAGES, PRODUCTION_APPROVAL_STAGES, verifySupervisor()

### Community 13 - "BMS Role Management"
Cohesion: 0.13
Nodes (22): admin, BMS_ROLE_NAMES, BmsRoleName, DELETE(), GET(), isBmsRoleName(), isManagementRoleName(), MANAGEMENT_ROLE_NAMES (+14 more)

### Community 14 - "Manager Task Monitoring"
Cohesion: 0.10
Nodes (14): SortKey, C, ROLE_DISPLAY, Manager, ManagerCard(), ProgressRow, Task, TaskItem (+6 more)

### Community 15 - "Branch Statistics Dashboard"
Cohesion: 0.09
Nodes (19): BMSStatsData, BranchRow, ChannelRow, ComparisonMode, DailyStaff, DailyStats, fmtRp(), fmtRpShort() (+11 more)

### Community 16 - "Order Detail Views"
Cohesion: 0.09
Nodes (13): FormConfig, getTheme(), GROUP_THEME, OrderDetailData, Phase, ROLE_STAGE_MAP, STAGE_LABELS, Theme (+5 more)

### Community 17 - "Daily Analysis Dashboard"
Cohesion: 0.10
Nodes (10): DailyAnalysisPage(), DailyData, DailyStaffRow, DailyTotals, DailyTrend, fmtRpShort(), HeroBanner(), P (+2 more)

### Community 18 - "Management History Dashboard"
Cohesion: 0.17
Nodes (15): ManagementDashboardPage(), DashboardStats, HistoryEntry, InsightCardData, ManagerData, ManagerStats, ProgressRow, Task (+7 more)

### Community 19 - "TypeScript Configuration"
Cohesion: 0.10
Nodes (20): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+12 more)

### Community 20 - "Marketing Channel Dashboard"
Cohesion: 0.12
Nodes (7): BANKS, RecentInput, StatsData, MarketingChannel, AlertProps, AnalyticsData, MarketingInput

### Community 21 - "Data Viewer Utilities"
Cohesion: 0.11
Nodes (9): ActionState, CHECKLIST_LABELS, FilterTab, formatRelative(), KEY_LABELS, PendingCard(), PendingItem, VALUE_LABELS (+1 more)

### Community 22 - "Order Form Helpers"
Cohesion: 0.18
Nodes (13): CopyLinkButton(), FormStatusBadge(), RefImageUpload(), BANKS, csOrderToFormData(), draftKey(), emptyFormData(), formDataToPatch() (+5 more)

### Community 23 - "Owner KPI Dashboard"
Cohesion: 0.11
Nodes (7): QRCodeCard(), ACTIVITY_ICON, ActivityRow(), DashboardData, formatRelativeTime(), STAGE_BAR_CLASS, STAGE_LABELS

### Community 24 - "Order Action Handlers"
Cohesion: 0.16
Nodes (16): GET(), getClientIP(), handleDeleteOrder(), handleEditWork(), handleReadOrder(), handleRejectOrder(), handleStartWork(), isValidAction() (+8 more)

### Community 25 - "Customer Stage Progress"
Cohesion: 0.12
Nodes (15): GET(), _prevInSequence(), CustomerTimeline(), StageProgressBar(), CUSTOMER_STAGE_SEQUENCE, getProgressPercent(), getStageIndex(), getStageLabel() (+7 more)

### Community 26 - "Dashboard Activity Feed"
Cohesion: 0.12
Nodes (6): ActivityItem, AlertItem, DashboardSnapshot, fmtRpShort(), formatFullDate(), SuperadminDashboard()

### Community 27 - "Stage Timeline Visualization"
Cohesion: 0.14
Nodes (15): ACTION_LABELS, ApprovalEvent, formatDateTime(), getKonfirmasiInfo(), getKonfirmasiPhotos(), getTukangInfo(), getUserName(), MOTIF_LABELS (+7 more)

### Community 28 - "Project Dependencies"
Cohesion: 0.11
Nodes (18): dependencies, bcrypt, date-holidays, @hello-pangea/dnd, lucide-react, next, pusher, pusher-js (+10 more)

### Community 29 - "Lead Input Management"
Cohesion: 0.12
Nodes (10): LeadInput, Channel, CSInput, CSUser, InputMarketingPage(), ModalProps, LeadInputData, LeadInputSchema (+2 more)

### Community 30 - "Order Entry Page"
Cohesion: 0.14
Nodes (9): BANKS, emptyFormData(), formatRupiah(), LABELS, OrderFormPage(), PageState, paymentCategory(), SUB_SOURCES (+1 more)

### Community 31 - "WhatsApp Template Integration"
Cohesion: 0.20
Nodes (11): buildRequest(), getCredentials(), normalizeWa(), parseErrorResponse(), parseSuccessResponse(), sendTemplate(), SendTemplateParams, SendTemplateResult (+3 more)

### Community 32 - "Order Field Components"
Cohesion: 0.16
Nodes (8): FormFieldsProps, inputCls(), OrderFormFields(), formatRupiah(), paymentCategory(), SUB_SOURCES, OPTIONS, GROUPS

### Community 33 - "QR Code Management"
Cohesion: 0.13
Nodes (8): ACTION_STYLES, AlertState, EMPTY_GENERATE_FORM, KelolaQRPage(), QRCodeCardProps, ROLE_GROUP_STYLES, ScanEvent, STAGE_LABELS

### Community 34 - "Supervisor Order Monitoring"
Cohesion: 0.17
Nodes (6): APPROVAL_STAGES, FilterTab, MonitoringData, MonitoringStats, OrderRow, STAGE_COLORS

### Community 35 - "Development Dependencies"
Cohesion: 0.13
Nodes (15): devDependencies, eslint, eslint-config-next, jsdom, @supabase/supabase-js, tailwindcss, @tailwindcss/postcss, @types/bcrypt (+7 more)

### Community 36 - "Order Creation API"
Cohesion: 0.23
Nodes (11): ALLOWED_TYPES, POST(), ALLOWED_FORM_FIELDS, DELETE(), PUT(), generateOrderNumber(), GET(), POST() (+3 more)

### Community 37 - "Management Task List"
Cohesion: 0.16
Nodes (6): FilterTab, formatDate(), ManagementTasksPage(), ConfirmDialogProps, ConfirmVariant, variantConfig

### Community 38 - "Order Status Lookup"
Cohesion: 0.23
Nodes (7): GET(), verifyBearerToken(), CekatOrderStatus, computePaymentStatus(), lookupByCustomerWa(), lookupByOrderNumber(), normalizeWa()

### Community 39 - "Scan Event Analytics"
Cohesion: 0.23
Nodes (12): ACTION_LABELS, GET(), GET_STATS(), getDateRange(), isValidAction(), isValidStage(), POST(), ScanEventStats (+4 more)

### Community 40 - "Management Navigation Sidebar"
Cohesion: 0.15
Nodes (7): HistoryEntry, Task, TaskItem, Task, TaskItem, iconMap, menuItems

### Community 41 - "Stage Configuration API"
Cohesion: 0.20
Nodes (11): enrichTukangOptions(), FieldConfig, FieldType, GET(), hasAccess(), NOTES, ROLE_STAGES, STAGE_CONFIGS (+3 more)

### Community 42 - "Root Layout Configuration"
Cohesion: 0.18
Nodes (9): cormorantGaramond, dmSans, dmSerifDisplay, geistMono, geistSans, inter, metadata, playfairDisplay (+1 more)

### Community 43 - "KPI Data Fetching"
Cohesion: 0.18
Nodes (3): KpiApiResponse, ApiError, MutatorMethod

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
Cohesion: 0.20
Nodes (5): HeaderProps, ProfileData, CollapseState, MenuItem, Notification

### Community 48 - "CI/CD Test Workflow"
Cohesion: 0.20
Nodes (10): ESLint, E2E Tests Job, Lint Job, Tests Job, Type Check Job, CI Workflow, npm test, @playwright/test (+2 more)

### Community 49 - "NPM Scripts"
Cohesion: 0.20
Nodes (10): scripts, build, dev, lint, postinstall, start, test, test:e2e (+2 more)

### Community 50 - "Monthly Insights API"
Cohesion: 0.44
Nodes (8): formatCurrency(), generateInsights(), GET(), getDayName(), getDaysInMonth(), getDaysRemainingInMonth(), getLast7DaysHistory(), getMonthName()

### Community 51 - "CSV Export Utilities"
Cohesion: 0.25
Nodes (3): GET(), PRODUCTION_ROLES, toCSV()

### Community 52 - "Report Generation Page"
Cohesion: 0.25
Nodes (6): AlertState, buildTitle(), LaporanPage(), MONTH_NAMES, Report, ReportType

### Community 53 - "Mobile Navigation Sidebar"
Cohesion: 0.20
Nodes (6): SlotCategory, SlotOverride, UserInfo, iconMap, menuItems, SidebarProps

### Community 54 - "Order Detail Popup"
Cohesion: 0.28
Nodes (5): formatCurrency(), formatDate(), OrderDetail, OrderDetailPopup(), STAGE_COLORS

### Community 55 - "Cycle Time Analytics"
Cohesion: 0.32
Nodes (6): calculateAverageCycleTime(), DailyStatsResponse, estimateWipValue(), GET(), PRODUCTION_ROLES, STAGE_ORDER

### Community 56 - "Report Selection Page"
Cohesion: 0.32
Nodes (7): currentPeriod(), LaporanPage(), periodLabel(), ReportCard, REPORTS, ReportType, TONE_MAP

### Community 57 - "Bottleneck Monitoring Page"
Cohesion: 0.21
Nodes (6): BottleneckTableRow(), formatHours(), getStatusInfo(), BottleneckHeatmap(), fmtCount(), HeatmapData

### Community 58 - "Supervisor QR Codes"
Cohesion: 0.25
Nodes (4): ROLE_GROUP_STYLES, STAGE_LABELS, QRCode, Role

### Community 59 - "Stage Deadline Tracking"
Cohesion: 0.39
Nodes (7): StageDeadlineBadge(), getScaleFactor(), getStageDeadline(), getStageDeadlineStatus(), STAGE_H_DAYS, StageDeadlineStatus, subtractWorkingDays()

### Community 60 - "Item Detail Components"
Cohesion: 0.29
Nodes (5): getStatusLabel(), ItemRow(), ItemRowProps, Segment, SEGMENTS

### Community 61 - "Working Day Calculations"
Cohesion: 0.32
Nodes (5): addWorkingDays(), countWorkingDays(), getIndonesianHolidays(), indonesiaHolidays, KATEGORI_THRESHOLDS

### Community 62 - "Weekly Activity API"
Cohesion: 0.43
Nodes (5): DAY_ABBR, GET(), last7Days(), prevDay(), sumField()

### Community 63 - "Financial Formatting API"
Cohesion: 0.48
Nodes (5): formatCurrency(), formatNumber(), formatPercentage(), GET(), toCSV()

### Community 64 - "Stage Visibility API"
Cohesion: 0.33
Nodes (8): advanceOrder(), APPROVAL_GATE_MAP, getAttemptNumber(), hasAccess(), nextInSequence(), POST(), ROLE_STAGES, WORKER_STAGES

### Community 65 - "Customer Order History"
Cohesion: 0.33
Nodes (4): formatRupiah(), PelangganGroup, PelangganOrder, PelangganPage()

### Community 66 - "Worker History Cards"
Cohesion: 0.29
Nodes (5): formatDate(), WorkerHistorySection(), WorkshopWorkOrderCard(), formatAddsOnList(), LABEL_MAP

### Community 67 - "Production Loss API"
Cohesion: 0.33
Nodes (4): GET(), PRODUCTION_ROLES, QC_STAGES, SUSUT_STAGES

### Community 68 - "Order Grouping API"
Cohesion: 0.40
Nodes (4): GET(), groupOrders(), DELETE(), Params

### Community 69 - "Order Timeline Logic"
Cohesion: 0.33
Nodes (4): CustomerTimelineProps, Delivery, StageResult, Transition

### Community 70 - "Order PDF Generation"
Cohesion: 0.40
Nodes (5): fmtDate(), FONT_SRC, OrderFormPDF(), PDF_CACHE_BUST, s

### Community 71 - "Order Validation Schemas"
Cohesion: 0.33
Nodes (4): OrderFormData, OrderFormDataPublic, OrderFormDataPublicSchema, OrderFormDataSchema

### Community 74 - "Personnel Management Page"
Cohesion: 0.40
Nodes (3): Assignment, PersonnelResponse, PersonnelUser

### Community 76 - "Completion Estimation Component"
Cohesion: 0.50
Nodes (4): EstimatedCompletion(), EstimatedCompletionProps, fmtDuration(), StageStat

### Community 82 - "Package Metadata"
Cohesion: 0.50
Nodes (3): name, private, version

## Knowledge Gaps
- **494 isolated node(s):** `RoleConfig`, `ROLE_CONFIGS`, `PRODUCTION_ROLES`, `SUSUT_STAGES`, `QC_STAGES` (+489 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **18 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `createClient()` connect `Superadmin QR API` to `Supervisor API Routes`, `Client Session Management`, `Data Normalization Utilities`, `User Administration API`, `Production Reporting API`, `BMS Role Management`, `Order Action Handlers`, `Customer Stage Progress`, `Order Creation API`, `Scan Event Analytics`, `Stage Configuration API`, `Order Detail API`, `User Auth API`, `Monthly Insights API`, `CSV Export Utilities`, `Cycle Time Analytics`, `Weekly Activity API`, `Financial Formatting API`, `Stage Visibility API`, `Production Loss API`, `Order Grouping API`, `Module Activity API`?**
  _High betweenness centrality (0.048) - this node is a cross-community bridge._
- **Why does `getRoleProps()` connect `Client Session Management` to `Supervisor API Routes`, `Stage Visibility API`, `Production Loss API`, `Order Creation API`, `Order Grouping API`, `Module Activity API`, `Superadmin QR API`, `Stage Configuration API`, `User Administration API`, `Data Normalization Utilities`, `Production Reporting API`, `BMS Role Management`, `CSV Export Utilities`, `Cycle Time Analytics`, `Weekly Activity API`, `Financial Formatting API`?**
  _High betweenness centrality (0.032) - this node is a cross-community bridge._
- **Why does `createAdminClient()` connect `User Administration API` to `Supervisor API Routes`, `Stage Visibility API`, `Production Loss API`, `Order Creation API`, `Order Grouping API`, `Client Session Management`, `Scan Event Analytics`, `Data Normalization Utilities`, `Superadmin QR API`, `Module Activity API`, `Stage Configuration API`, `Production Reporting API`, `User Auth API`, `BMS Role Management`, `Order Status Lookup`, `CSV Export Utilities`, `Cycle Time Analytics`, `Customer Stage Progress`?**
  _High betweenness centrality (0.019) - this node is a cross-community bridge._
- **Are the 103 inferred relationships involving `createClient()` (e.g. with `GET()` and `GET()`) actually correct?**
  _`createClient()` has 103 INFERRED edges - model-reasoned connections that need verification._
- **Are the 85 inferred relationships involving `createAdminClient()` (e.g. with `GET()` and `GET()`) actually correct?**
  _`createAdminClient()` has 85 INFERRED edges - model-reasoned connections that need verification._
- **Are the 41 inferred relationships involving `getRoleProps()` (e.g. with `GET()` and `POST()`) actually correct?**
  _`getRoleProps()` has 41 INFERRED edges - model-reasoned connections that need verification._
- **What connects `RoleConfig`, `ROLE_CONFIGS`, `PRODUCTION_ROLES` to the rest of the system?**
  _494 weakly-connected nodes found - possible documentation gaps or missing edges._