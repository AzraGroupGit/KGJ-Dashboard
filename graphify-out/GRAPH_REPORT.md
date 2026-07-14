# Graph Report - erp-system  (2026-07-14)

## Corpus Check
- 263 files · ~208,429 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1417 nodes · 2965 edges · 91 communities (75 shown, 16 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 11 edges (avg confidence: 0.64)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `cfebd4f0`
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
- [[_COMMUNITY_page.tsx|page.tsx]]
- [[_COMMUNITY_Supervisor QR Codes|Supervisor QR Codes]]
- [[_COMMUNITY_MobileSidebar.tsx|MobileSidebar.tsx]]
- [[_COMMUNITY_Item Detail Components|Item Detail Components]]
- [[_COMMUNITY_cs-order.ts|cs-order.ts]]
- [[_COMMUNITY_Weekly Activity API|Weekly Activity API]]
- [[_COMMUNITY_Financial Formatting API|Financial Formatting API]]
- [[_COMMUNITY_CustomerTimeline.tsx|CustomerTimeline.tsx]]
- [[_COMMUNITY_working-days.ts|working-days.ts]]
- [[_COMMUNITY_page.tsx|page.tsx]]
- [[_COMMUNITY_Production Loss API|Production Loss API]]
- [[_COMMUNITY_ItemRow.tsx|ItemRow.tsx]]
- [[_COMMUNITY_SettingsModal.tsx|SettingsModal.tsx]]
- [[_COMMUNITY_Order PDF Generation|Order PDF Generation]]
- [[_COMMUNITY_Address Autocomplete Utility|Address Autocomplete Utility]]
- [[_COMMUNITY_Worker Selection Component|Worker Selection Component]]
- [[_COMMUNITY_Slot Availability Logic|Slot Availability Logic]]
- [[_COMMUNITY_Package Metadata|Package Metadata]]
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

## God Nodes (most connected - your core abstractions)
1. `createClient()` - 175 edges
2. `createAdminClient()` - 148 edges
3. `getRoleProps()` - 81 edges
4. `fetcher()` - 43 edges
5. `getClientUser()` - 24 edges
6. `ClientUser` - 22 edges
7. `STAGE_SEQUENCE` - 17 edges
8. `compilerOptions` - 17 edges
9. `getStageLabel()` - 16 edges
10. `Button` - 15 edges

## Surprising Connections (you probably didn't know these)
- `GET()` --calls--> `createAdminClient()`  [EXTRACTED]
  app/api/order-form/[token]/route.ts → lib/supabase/admin.ts
- `GET()` --calls--> `createClient()`  [EXTRACTED]
  app/api/qr-scan/route.ts → lib/supabase/server.ts
- `_prevInSequence()` --calls--> `getStageIndex()`  [EXTRACTED]
  app/api/stages/submit/route.ts → lib/stages.ts
- `GET()` --calls--> `getRoleProps()`  [EXTRACTED]
  app/api/analyst-oprprd/route.ts → lib/auth/session.ts
- `GET()` --calls--> `createAdminClient()`  [EXTRACTED]
  app/api/analyst-oprprd/route.ts → lib/supabase/admin.ts

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **CI Pipeline Stages** — github_workflows_ci_job_typecheck, github_workflows_ci_job_lint, github_workflows_ci_job_test, github_workflows_ci_job_e2e [EXTRACTED 1.00]

## Communities (91 total, 16 thin omitted)

### Community 0 - "Supervisor API Routes"
Cohesion: 0.09
Nodes (31): GET(), POST(), POST(), DELETE(), DELETE(), PATCH(), DELETE(), GET() (+23 more)

### Community 1 - "User and Branch Forms"
Cohesion: 0.06
Nodes (56): AlertState, buildTitle(), LaporanPage(), MONTH_NAMES, Report, ReportType, BmsFormState, BmsUserForm() (+48 more)

### Community 2 - "Custom Form Fields"
Cohesion: 0.07
Nodes (22): FormConfig, ConfirmationFormField(), PackagingFormField(), ALL_MAT_TYPES, ALL_TX_TYPES, CertRow, ComplRow, Field (+14 more)

### Community 3 - "Dashboard UI Components"
Cohesion: 0.07
Nodes (43): CollapsibleSection(), FilterPresets(), Preset, OperasionalTab(), OverviewTab(), ProduksiTab(), AdminTask, Badge() (+35 more)

### Community 4 - "Account Management Modals"
Cohesion: 0.12
Nodes (34): CreateModal(), CreateModalProps, DeactivateModal(), DeactivateModalProps, DeleteModal(), DeleteModalProps, EditModal(), EditModalProps (+26 more)

### Community 5 - "Workshop Login Pages"
Cohesion: 0.13
Nodes (10): LOGIN_ROLES, ALL_ROLES, AllRole, AppRole, AUTH_ONLY_PATHS, MANAGEMENT_ROUTES, PROTECTED_PREFIXES, PUBLIC_PREFIXES (+2 more)

### Community 6 - "Client Session Management"
Cohesion: 0.07
Nodes (31): POST(), POST(), POST(), POST(), GET(), POST(), GET(), GET() (+23 more)

### Community 7 - "Database Schema Definitions"
Cohesion: 0.06
Nodes (31): ActivityLogRow, ApprovalRow, ApprovalWithUser, AttachmentRow, BranchRow, CsInputRow, CsOrderRow, CsOrderWithUser (+23 more)

### Community 8 - "Data Normalization Utilities"
Cohesion: 0.10
Nodes (20): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+12 more)

### Community 9 - "Superadmin QR API"
Cohesion: 0.07
Nodes (36): GET(), GET(), POST(), GET(), POST(), POST(), DELETE(), ALLOWED_TYPES (+28 more)

### Community 10 - "Expert Performance Analytics"
Cohesion: 0.07
Nodes (18): AnalisisPage(), AnalystData, currentPeriod(), ExpertPerformance, OrderFlowPoint, QC_LABELS, QCMetric, ROLE_CONFIG (+10 more)

### Community 11 - "User Administration API"
Cohesion: 0.17
Nodes (17): SortKey, ROLE_DISPLAY, Manager, ManagerCard(), ProgressRow, Task, TaskItem, Manager (+9 more)

### Community 12 - "Production Reporting API"
Cohesion: 0.14
Nodes (8): APPROVAL_STAGES, FilterTab, MonitoringData, MonitoringStats, OrderRow, STAGE_COLORS, FilterTab, SupervisorGroup

### Community 13 - "BMS Role Management"
Cohesion: 0.14
Nodes (22): admin, BMS_ROLE_NAMES, BmsRoleName, GET(), isBmsRoleName(), isManagementRoleName(), MANAGEMENT_ROLE_NAMES, PATCH() (+14 more)

### Community 14 - "Manager Task Monitoring"
Cohesion: 0.39
Nodes (6): formatCurrency(), formatNumber(), formatPercentage(), GET(), toCSV(), InputMarketingPage()

### Community 15 - "Branch Statistics Dashboard"
Cohesion: 0.10
Nodes (19): BMSStatsData, BranchRow, ChannelRow, ComparisonMode, DailyStaff, DailyStats, fmtRp(), fmtRpShort() (+11 more)

### Community 16 - "Order Detail Views"
Cohesion: 0.09
Nodes (14): formatDate(), getTheme(), GROUP_THEME, OrderDetailData, Phase, ROLE_STAGE_MAP, STAGE_LABELS, Theme (+6 more)

### Community 17 - "Daily Analysis Dashboard"
Cohesion: 0.10
Nodes (10): DailyAnalysisPage(), DailyData, DailyStaffRow, DailyTotals, DailyTrend, fmtRpShort(), HeroBanner(), P (+2 more)

### Community 18 - "Management History Dashboard"
Cohesion: 0.17
Nodes (15): ManagementDashboardPage(), DashboardStats, HistoryEntry, InsightCardData, ManagerData, ManagerStats, ProgressRow, Task (+7 more)

### Community 19 - "TypeScript Configuration"
Cohesion: 0.09
Nodes (29): EstimatedCompletion(), EstimatedCompletionProps, fmtDuration(), StageStat, ACTION_LABELS, ApprovalEvent, formatDateTime(), getKonfirmasiInfo() (+21 more)

### Community 20 - "Marketing Channel Dashboard"
Cohesion: 0.08
Nodes (21): LeadInput, BANKS, RecentInput, StatsData, HistoryEntry, Task, TaskItem, currentPeriod() (+13 more)

### Community 21 - "Data Viewer Utilities"
Cohesion: 0.10
Nodes (9): ActionState, CHECKLIST_LABELS, FilterTab, formatRelative(), KEY_LABELS, PendingCard(), PendingItem, VALUE_LABELS (+1 more)

### Community 22 - "Order Form Helpers"
Cohesion: 0.35
Nodes (6): CopyLinkButton(), FormStatusBadge(), RefImageUpload(), emptyFormData(), InputOrderPage(), CsOrder

### Community 23 - "Owner KPI Dashboard"
Cohesion: 0.11
Nodes (7): QRCodeCard(), ACTIVITY_ICON, ActivityRow(), DashboardData, formatRelativeTime(), STAGE_BAR_CLASS, STAGE_LABELS

### Community 24 - "Order Action Handlers"
Cohesion: 0.16
Nodes (16): GET(), getClientIP(), handleDeleteOrder(), handleEditWork(), handleReadOrder(), handleRejectOrder(), handleStartWork(), isValidAction() (+8 more)

### Community 25 - "Customer Stage Progress"
Cohesion: 0.33
Nodes (5): ROLE_CONFIGS, RoleConfig, LoginRole, setClientUser(), queryParamToAppRole()

### Community 26 - "Dashboard Activity Feed"
Cohesion: 0.12
Nodes (6): ActivityItem, AlertItem, DashboardSnapshot, fmtRpShort(), formatFullDate(), SuperadminDashboard()

### Community 27 - "Stage Timeline Visualization"
Cohesion: 0.20
Nodes (9): WorkshopWorkOrderCard(), formatCurrency(), formatDate(), OrderDetail, OrderDetailPopup(), STAGE_COLORS, formatAddsOn(), formatAddsOnList() (+1 more)

### Community 28 - "Project Dependencies"
Cohesion: 0.11
Nodes (18): dependencies, bcrypt, date-holidays, @hello-pangea/dnd, lucide-react, next, pusher, pusher-js (+10 more)

### Community 29 - "Lead Input Management"
Cohesion: 0.17
Nodes (8): Channel, CSInput, CSUser, Input, InputProps, ModalProps, MarketingInput, MarketingInputSchema

### Community 30 - "Order Entry Page"
Cohesion: 0.11
Nodes (13): BANKS, emptyFormData(), formatRupiah(), LABELS, OrderFormPage(), PageState, paymentCategory(), SUB_SOURCES (+5 more)

### Community 31 - "WhatsApp Template Integration"
Cohesion: 0.21
Nodes (11): buildRequest(), getCredentials(), normalizeWa(), parseErrorResponse(), parseSuccessResponse(), sendTemplate(), SendTemplateParams, SendTemplateResult (+3 more)

### Community 33 - "QR Code Management"
Cohesion: 0.10
Nodes (12): ACTION_STYLES, AlertState, EMPTY_GENERATE_FORM, KelolaQRPage(), QRCodeCardProps, ROLE_GROUP_STYLES, ScanEvent, STAGE_LABELS (+4 more)

### Community 34 - "Supervisor Order Monitoring"
Cohesion: 0.48
Nodes (6): DELETE(), GET(), GROUP_STAGES, POST(), PUT(), verifySupervisor()

### Community 35 - "Development Dependencies"
Cohesion: 0.13
Nodes (15): devDependencies, eslint, eslint-config-next, jsdom, @supabase/supabase-js, tailwindcss, @tailwindcss/postcss, @types/bcrypt (+7 more)

### Community 36 - "Order Creation API"
Cohesion: 0.24
Nodes (11): ALLOWED_TYPES, POST(), ALLOWED_FORM_FIELDS, DELETE(), PUT(), generateOrderNumber(), GET(), POST() (+3 more)

### Community 38 - "Order Status Lookup"
Cohesion: 0.31
Nodes (7): GET(), verifyBearerToken(), CekatOrderStatus, computePaymentStatus(), lookupByCustomerWa(), lookupByOrderNumber(), normalizeWa()

### Community 39 - "Scan Event Analytics"
Cohesion: 0.24
Nodes (11): ACTION_LABELS, GET(), getDateRange(), isValidAction(), isValidStage(), POST(), ScanEventStats, ScanEventWithRelations (+3 more)

### Community 40 - "Management Navigation Sidebar"
Cohesion: 0.22
Nodes (7): BottleneckTableRow(), formatHours(), getStatusInfo(), BottleneckHeatmap(), fmtCount(), HeatmapData, getStageLabel()

### Community 41 - "Stage Configuration API"
Cohesion: 0.20
Nodes (11): enrichTukangOptions(), FieldConfig, FieldType, GET(), hasAccess(), NOTES, ROLE_STAGES, STAGE_CONFIGS (+3 more)

### Community 42 - "Root Layout Configuration"
Cohesion: 0.18
Nodes (9): cormorantGaramond, dmSans, dmSerifDisplay, geistMono, geistSans, inter, metadata, playfairDisplay (+1 more)

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
Nodes (6): HeaderProps, ProfileData, clearClientUser(), ROUTES, CollapseState, Notification

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
Cohesion: 0.33
Nodes (10): canAccessPath(), getDashboardPath(), isAppRole(), isAuthOnlyPath(), isProtectedPath(), isWorkshopRole(), config, fetchUserRoleName() (+2 more)

### Community 53 - "Mobile Navigation Sidebar"
Cohesion: 0.08
Nodes (43): APPROVAL_GATE_MAP, POST(), resolveIngestionStage(), filterArr(), GET(), normalizeDariArtis(), normalizeLaser(), normalizeSumber() (+35 more)

### Community 54 - "Order Detail Popup"
Cohesion: 0.13
Nodes (11): Task, TaskItem, SlotCategory, SlotOverride, UserInfo, KpiApiResponse, fetcher(), handleUnauthorized() (+3 more)

### Community 55 - "Cycle Time Analytics"
Cohesion: 0.32
Nodes (6): calculateAverageCycleTime(), DailyStatsResponse, estimateWipValue(), GET(), PRODUCTION_ROLES, STAGE_ORDER

### Community 56 - "Report Selection Page"
Cohesion: 0.11
Nodes (9): formatRupiah(), PelangganGroup, PelangganOrder, PelangganPage(), MarketingChannel, AlertProps, LoadingProps, AnalyticsData (+1 more)

### Community 58 - "Supervisor QR Codes"
Cohesion: 0.13
Nodes (20): ACTIVE_STAGES, GET(), StageBottleneck, GET(), APPROVAL_STAGES, APPROVAL_TO_PRODUCTION_STAGE, GET(), OPERATIONAL_APPROVAL_STAGES (+12 more)

### Community 59 - "MobileSidebar.tsx"
Cohesion: 0.22
Nodes (7): iconMap, menuItems, SidebarProps, MARKETING_ROUTES, SUPERADMIN_ROUTES, SUPERVISOR_ROUTES, MenuItem

### Community 60 - "Item Detail Components"
Cohesion: 0.28
Nodes (4): escapeCSV(), GET(), PRODUCTION_ROLES, toCSV()

### Community 61 - "cs-order.ts"
Cohesion: 0.29
Nodes (6): FormFieldsProps, getOrderFormErrors(), OrderFormData, OrderFormDataPublic, OrderFormDataPublicSchema, OrderFormDataSchema

### Community 62 - "Weekly Activity API"
Cohesion: 0.53
Nodes (5): DELETE(), Params, PATCH(), PUT(), requireSuperadmin()

### Community 63 - "Financial Formatting API"
Cohesion: 0.80
Nodes (4): GET(), mapAccount(), POST(), verifySupervisorScope()

### Community 64 - "CustomerTimeline.tsx"
Cohesion: 0.57
Nodes (5): CustomerTimeline(), CustomerTimelineProps, Delivery, StageResult, Transition

### Community 65 - "working-days.ts"
Cohesion: 0.33
Nodes (4): addWorkingDays(), getRecommendedKategori(), indonesiaHolidays, KATEGORI_THRESHOLDS

### Community 66 - "page.tsx"
Cohesion: 0.40
Nodes (3): Assignment, PersonnelResponse, PersonnelUser

### Community 67 - "Production Loss API"
Cohesion: 0.33
Nodes (4): GET(), PRODUCTION_ROLES, QC_STAGES, SUSUT_STAGES

### Community 68 - "ItemRow.tsx"
Cohesion: 0.12
Nodes (14): FilterTab, formatDate(), ManagementTasksPage(), C, Diamond(), getStatusLabel(), ItemRow(), ItemRowProps (+6 more)

### Community 70 - "Order PDF Generation"
Cohesion: 0.40
Nodes (5): fmtDate(), FONT_SRC, OrderFormPDF(), PDF_CACHE_BUST, s

### Community 81 - "Slot Availability Logic"
Cohesion: 0.16
Nodes (14): inputCls(), OrderFormFields(), BANKS, csOrderToFormData(), draftKey(), formatRupiah(), formDataToPatch(), LABELS (+6 more)

### Community 82 - "Package Metadata"
Cohesion: 0.50
Nodes (3): name, private, version

### Community 102 - "route.ts"
Cohesion: 0.11
Nodes (14): GET(), GET(), prevDay(), APPROVAL_STAGES, POST(), PRODUCTION_TO_APPROVAL_STAGE, SUPERVISOR_ALLOWED_STAGES, APPROVAL_STAGES (+6 more)

### Community 104 - "working-days.ts"
Cohesion: 0.36
Nodes (9): StageDeadlineBadge(), getScaleFactor(), getStageDeadline(), getStageDeadlineStatus(), STAGE_H_DAYS, StageDeadlineStatus, subtractWorkingDays(), countWorkingDays() (+1 more)

## Knowledge Gaps
- **440 isolated node(s):** `PRODUCTION_ROLES`, `SUSUT_STAGES`, `QC_STAGES`, `ACTIVE_STAGES`, `StageBottleneck` (+435 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **16 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `fetcher()` connect `Order Detail Popup` to `User and Branch Forms`, `Dashboard UI Components`, `Account Management Modals`, `Expert Performance Analytics`, `User Administration API`, `Production Reporting API`, `Branch Statistics Dashboard`, `Order Detail Views`, `Daily Analysis Dashboard`, `Management History Dashboard`, `TypeScript Configuration`, `Marketing Channel Dashboard`, `Data Viewer Utilities`, `Order Form Helpers`, `Owner KPI Dashboard`, `Dashboard Activity Feed`, `Stage Timeline Visualization`, `Lead Input Management`, `Order Entry Page`, `QR Code Management`, `Management Navigation Sidebar`, `PIN Settings Page`, `User Profile Modals`, `Report Selection Page`, `page.tsx`, `page.tsx`, `ItemRow.tsx`?**
  _High betweenness centrality (0.105) - this node is a cross-community bridge._
- **Why does `createClient()` connect `Superadmin QR API` to `Supervisor API Routes`, `Client Session Management`, `BMS Role Management`, `Manager Task Monitoring`, `Order Action Handlers`, `Supervisor Order Monitoring`, `Order Creation API`, `Scan Event Analytics`, `Stage Configuration API`, `Order Detail API`, `User Auth API`, `Monthly Insights API`, `CSV Export Utilities`, `Mobile Navigation Sidebar`, `Cycle Time Analytics`, `Supervisor QR Codes`, `Item Detail Components`, `Weekly Activity API`, `Financial Formatting API`, `Production Loss API`, `route.ts`?**
  _High betweenness centrality (0.096) - this node is a cross-community bridge._
- **Why does `createAdminClient()` connect `Supervisor API Routes` to `Supervisor Order Monitoring`, `Production Loss API`, `Order Creation API`, `route.ts`, `Client Session Management`, `Scan Event Analytics`, `Superadmin QR API`, `Stage Configuration API`, `Order Status Lookup`, `User Auth API`, `BMS Role Management`, `Mobile Navigation Sidebar`, `Cycle Time Analytics`, `Supervisor QR Codes`, `Item Detail Components`, `Financial Formatting API`?**
  _High betweenness centrality (0.065) - this node is a cross-community bridge._
- **What connects `PRODUCTION_ROLES`, `SUSUT_STAGES`, `QC_STAGES` to the rest of the system?**
  _440 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Supervisor API Routes` be split into smaller, more focused modules?**
  _Cohesion score 0.09013605442176871 - nodes in this community are weakly interconnected._
- **Should `User and Branch Forms` be split into smaller, more focused modules?**
  _Cohesion score 0.057971014492753624 - nodes in this community are weakly interconnected._
- **Should `Custom Form Fields` be split into smaller, more focused modules?**
  _Cohesion score 0.07337526205450734 - nodes in this community are weakly interconnected._