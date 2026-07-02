# Graph Report - .  (2026-07-02)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 1293 nodes · 2275 edges · 84 communities (73 shown, 11 thin omitted)
- Extraction: 89% EXTRACTED · 11% INFERRED · 0% AMBIGUOUS · INFERRED: 258 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `e1ee8233`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- [[_COMMUNITY_Community 0|Community 0]]
- [[_COMMUNITY_Community 1|Community 1]]
- [[_COMMUNITY_Community 2|Community 2]]
- [[_COMMUNITY_Community 3|Community 3]]
- [[_COMMUNITY_Community 4|Community 4]]
- [[_COMMUNITY_Community 5|Community 5]]
- [[_COMMUNITY_Community 6|Community 6]]
- [[_COMMUNITY_Community 7|Community 7]]
- [[_COMMUNITY_Community 8|Community 8]]
- [[_COMMUNITY_Community 9|Community 9]]
- [[_COMMUNITY_Community 10|Community 10]]
- [[_COMMUNITY_Community 11|Community 11]]
- [[_COMMUNITY_Community 12|Community 12]]
- [[_COMMUNITY_Community 13|Community 13]]
- [[_COMMUNITY_Community 14|Community 14]]
- [[_COMMUNITY_Community 15|Community 15]]
- [[_COMMUNITY_Community 16|Community 16]]
- [[_COMMUNITY_Community 17|Community 17]]
- [[_COMMUNITY_Community 18|Community 18]]
- [[_COMMUNITY_Community 19|Community 19]]
- [[_COMMUNITY_Community 20|Community 20]]
- [[_COMMUNITY_Community 21|Community 21]]
- [[_COMMUNITY_Community 22|Community 22]]
- [[_COMMUNITY_Community 23|Community 23]]
- [[_COMMUNITY_Community 24|Community 24]]
- [[_COMMUNITY_Community 25|Community 25]]
- [[_COMMUNITY_Community 26|Community 26]]
- [[_COMMUNITY_Community 27|Community 27]]
- [[_COMMUNITY_Community 28|Community 28]]
- [[_COMMUNITY_Community 29|Community 29]]
- [[_COMMUNITY_Community 30|Community 30]]
- [[_COMMUNITY_Community 31|Community 31]]
- [[_COMMUNITY_Community 32|Community 32]]
- [[_COMMUNITY_Community 33|Community 33]]
- [[_COMMUNITY_Community 34|Community 34]]
- [[_COMMUNITY_Community 35|Community 35]]
- [[_COMMUNITY_Community 36|Community 36]]
- [[_COMMUNITY_Community 37|Community 37]]
- [[_COMMUNITY_Community 38|Community 38]]
- [[_COMMUNITY_Community 39|Community 39]]
- [[_COMMUNITY_Community 40|Community 40]]
- [[_COMMUNITY_Community 41|Community 41]]
- [[_COMMUNITY_Community 42|Community 42]]
- [[_COMMUNITY_Community 43|Community 43]]
- [[_COMMUNITY_Community 44|Community 44]]
- [[_COMMUNITY_Community 45|Community 45]]
- [[_COMMUNITY_Community 46|Community 46]]
- [[_COMMUNITY_Community 47|Community 47]]
- [[_COMMUNITY_Community 48|Community 48]]
- [[_COMMUNITY_Community 49|Community 49]]
- [[_COMMUNITY_Community 50|Community 50]]
- [[_COMMUNITY_Community 51|Community 51]]
- [[_COMMUNITY_Community 52|Community 52]]
- [[_COMMUNITY_Community 53|Community 53]]
- [[_COMMUNITY_Community 54|Community 54]]
- [[_COMMUNITY_Community 55|Community 55]]
- [[_COMMUNITY_Community 56|Community 56]]
- [[_COMMUNITY_Community 57|Community 57]]
- [[_COMMUNITY_Community 58|Community 58]]
- [[_COMMUNITY_Community 59|Community 59]]
- [[_COMMUNITY_Community 60|Community 60]]
- [[_COMMUNITY_Community 61|Community 61]]
- [[_COMMUNITY_Community 62|Community 62]]
- [[_COMMUNITY_Community 63|Community 63]]
- [[_COMMUNITY_Community 64|Community 64]]
- [[_COMMUNITY_Community 65|Community 65]]
- [[_COMMUNITY_Community 66|Community 66]]
- [[_COMMUNITY_Community 67|Community 67]]
- [[_COMMUNITY_Community 68|Community 68]]
- [[_COMMUNITY_Community 69|Community 69]]
- [[_COMMUNITY_Community 70|Community 70]]
- [[_COMMUNITY_Community 71|Community 71]]
- [[_COMMUNITY_Community 72|Community 72]]
- [[_COMMUNITY_Community 73|Community 73]]
- [[_COMMUNITY_Community 74|Community 74]]
- [[_COMMUNITY_Community 75|Community 75]]
- [[_COMMUNITY_Community 76|Community 76]]
- [[_COMMUNITY_Community 77|Community 77]]
- [[_COMMUNITY_Community 78|Community 78]]
- [[_COMMUNITY_Community 79|Community 79]]
- [[_COMMUNITY_Community 80|Community 80]]
- [[_COMMUNITY_Community 81|Community 81]]
- [[_COMMUNITY_Community 83|Community 83]]

## God Nodes (most connected - your core abstractions)
1. `createClient()` - 104 edges
2. `createAdminClient()` - 86 edges
3. `getRoleProps()` - 42 edges
4. `AlertState` - 12 edges
5. `Account` - 12 edges
6. `POST()` - 11 edges
7. `requireCsOrAdmin()` - 10 edges
8. `PUT()` - 10 edges
9. `GET()` - 9 edges
10. `POST()` - 9 edges

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

## Communities (84 total, 11 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.04
Nodes (35): GET(), GET(), GET(), GET(), POST(), POST(), POST(), DELETE() (+27 more)

### Community 1 - "Community 1"
Cohesion: 0.06
Nodes (52): BmsFormState, BmsUserForm(), BmsUserFormProps, BranchForm(), BranchFormProps, BranchFormState, MANAGEMENT_ROLE_LABELS, ManagementFormState (+44 more)

### Community 2 - "Community 2"
Cohesion: 0.07
Nodes (19): ALL_MAT_TYPES, ALL_TX_TYPES, CertRow, ComplRow, Field, FieldItem, FieldOption, MAT_TYPE_LABELS (+11 more)

### Community 3 - "Community 3"
Cohesion: 0.07
Nodes (43): CollapsibleSection(), FilterPresets(), Preset, OperasionalTab(), OverviewTab(), ProduksiTab(), AdminTask, Badge() (+35 more)

### Community 4 - "Community 4"
Cohesion: 0.11
Nodes (34): CreateModal(), CreateModalProps, DeactivateModal(), DeactivateModalProps, DeleteModal(), DeleteModalProps, EditModal(), EditModalProps (+26 more)

### Community 5 - "Community 5"
Cohesion: 0.06
Nodes (23): ROLE_CONFIGS, RoleConfig, Step, WorkerInfo, ALL_ROLES, AllRole, AppRole, AUTH_ONLY_PATHS (+15 more)

### Community 6 - "Community 6"
Cohesion: 0.07
Nodes (20): POST(), POST(), POST(), GET(), GET(), GET(), MONTH_NAMES, ClientUser (+12 more)

### Community 7 - "Community 7"
Cohesion: 0.09
Nodes (26): DELETE(), Params, PATCH(), PUT(), requireSuperadmin(), GET(), POST(), DELETE() (+18 more)

### Community 8 - "Community 8"
Cohesion: 0.10
Nodes (28): filterArr(), GET(), normalizeDariArtis(), normalizeLaser(), normalizeSumber(), PUBLIC_SELECT, PUT(), SOURCE_MAP (+20 more)

### Community 9 - "Community 9"
Cohesion: 0.06
Nodes (31): ActivityLogRow, ApprovalRow, ApprovalWithUser, AttachmentRow, BranchRow, CsInputRow, CsOrderRow, CsOrderWithUser (+23 more)

### Community 10 - "Community 10"
Cohesion: 0.12
Nodes (25): ALLOWED_TYPES, GET(), POST(), DELETE(), PATCH(), DELETE(), GET(), POST() (+17 more)

### Community 11 - "Community 11"
Cohesion: 0.07
Nodes (18): AnalisisPage(), AnalystData, currentPeriod(), ExpertPerformance, OrderFlowPoint, QC_LABELS, QCMetric, ROLE_CONFIG (+10 more)

### Community 12 - "Community 12"
Cohesion: 0.09
Nodes (21): POST(), GET(), POST(), GET(), EXPERT_ROLES, EXPERT_STAGES, GET(), ROLE_DEFAULT_STAGE (+13 more)

### Community 13 - "Community 13"
Cohesion: 0.13
Nodes (22): admin, BMS_ROLE_NAMES, BmsRoleName, DELETE(), GET(), isBmsRoleName(), isManagementRoleName(), MANAGEMENT_ROLE_NAMES (+14 more)

### Community 14 - "Community 14"
Cohesion: 0.10
Nodes (14): SortKey, C, ROLE_DISPLAY, Manager, ManagerCard(), ProgressRow, Task, TaskItem (+6 more)

### Community 15 - "Community 15"
Cohesion: 0.09
Nodes (19): BMSStatsData, BranchRow, ChannelRow, ComparisonMode, DailyStaff, DailyStats, fmtRp(), fmtRpShort() (+11 more)

### Community 16 - "Community 16"
Cohesion: 0.09
Nodes (13): FormConfig, getTheme(), GROUP_THEME, OrderDetailData, Phase, ROLE_STAGE_MAP, STAGE_LABELS, Theme (+5 more)

### Community 17 - "Community 17"
Cohesion: 0.12
Nodes (7): BANKS, RecentInput, StatsData, MarketingChannel, AlertProps, AnalyticsData, MarketingInput

### Community 18 - "Community 18"
Cohesion: 0.10
Nodes (10): DailyAnalysisPage(), DailyData, DailyStaffRow, DailyTotals, DailyTrend, fmtRpShort(), HeroBanner(), P (+2 more)

### Community 19 - "Community 19"
Cohesion: 0.17
Nodes (15): ManagementDashboardPage(), DashboardStats, HistoryEntry, InsightCardData, ManagerData, ManagerStats, ProgressRow, Task (+7 more)

### Community 20 - "Community 20"
Cohesion: 0.11
Nodes (9): ActionState, CHECKLIST_LABELS, FilterTab, formatRelative(), KEY_LABELS, PendingCard(), PendingItem, VALUE_LABELS (+1 more)

### Community 21 - "Community 21"
Cohesion: 0.13
Nodes (15): nextInSequence(), _prevInSequence(), CustomerTimeline(), StageProgressBar(), CUSTOMER_STAGE_SEQUENCE, getProgressPercent(), getStageIndex(), getStageLabel() (+7 more)

### Community 22 - "Community 22"
Cohesion: 0.18
Nodes (13): CopyLinkButton(), FormStatusBadge(), RefImageUpload(), BANKS, csOrderToFormData(), draftKey(), emptyFormData(), formDataToPatch() (+5 more)

### Community 23 - "Community 23"
Cohesion: 0.11
Nodes (7): QRCodeCard(), ACTIVITY_ICON, ActivityRow(), DashboardData, formatRelativeTime(), STAGE_BAR_CLASS, STAGE_LABELS

### Community 24 - "Community 24"
Cohesion: 0.16
Nodes (16): GET(), getClientIP(), handleDeleteOrder(), handleEditWork(), handleReadOrder(), handleRejectOrder(), handleStartWork(), isValidAction() (+8 more)

### Community 25 - "Community 25"
Cohesion: 0.12
Nodes (6): ActivityItem, AlertItem, DashboardSnapshot, fmtRpShort(), formatFullDate(), SuperadminDashboard()

### Community 26 - "Community 26"
Cohesion: 0.14
Nodes (15): ACTION_LABELS, ApprovalEvent, formatDateTime(), getKonfirmasiInfo(), getKonfirmasiPhotos(), getTukangInfo(), getUserName(), MOTIF_LABELS (+7 more)

### Community 27 - "Community 27"
Cohesion: 0.14
Nodes (9): BANKS, emptyFormData(), formatRupiah(), LABELS, OrderFormPage(), PageState, paymentCategory(), SUB_SOURCES (+1 more)

### Community 28 - "Community 28"
Cohesion: 0.18
Nodes (3): KpiApiResponse, ApiError, MutatorMethod

### Community 29 - "Community 29"
Cohesion: 0.20
Nodes (11): buildRequest(), getCredentials(), normalizeWa(), parseErrorResponse(), parseSuccessResponse(), sendTemplate(), SendTemplateParams, SendTemplateResult (+3 more)

### Community 30 - "Community 30"
Cohesion: 0.16
Nodes (8): FormFieldsProps, inputCls(), OrderFormFields(), formatRupiah(), paymentCategory(), SUB_SOURCES, OPTIONS, GROUPS

### Community 31 - "Community 31"
Cohesion: 0.13
Nodes (8): ACTION_STYLES, AlertState, EMPTY_GENERATE_FORM, KelolaQRPage(), QRCodeCardProps, ROLE_GROUP_STYLES, ScanEvent, STAGE_LABELS

### Community 32 - "Community 32"
Cohesion: 0.13
Nodes (8): APPROVAL_STAGES, FilterTab, MonitoringData, MonitoringStats, OrderRow, STAGE_COLORS, FilterTab, SupervisorGroup

### Community 33 - "Community 33"
Cohesion: 0.16
Nodes (6): FilterTab, formatDate(), ManagementTasksPage(), ConfirmDialogProps, ConfirmVariant, variantConfig

### Community 34 - "Community 34"
Cohesion: 0.23
Nodes (7): GET(), verifyBearerToken(), CekatOrderStatus, computePaymentStatus(), lookupByCustomerWa(), lookupByOrderNumber(), normalizeWa()

### Community 35 - "Community 35"
Cohesion: 0.23
Nodes (12): ACTION_LABELS, GET(), GET_STATS(), getDateRange(), isValidAction(), isValidStage(), POST(), ScanEventStats (+4 more)

### Community 36 - "Community 36"
Cohesion: 0.15
Nodes (7): HistoryEntry, Task, TaskItem, Task, TaskItem, iconMap, menuItems

### Community 37 - "Community 37"
Cohesion: 0.29
Nodes (9): ALLOWED_TYPES, POST(), ALLOWED_FORM_FIELDS, DELETE(), PUT(), generateOrderNumber(), GET(), POST() (+1 more)

### Community 38 - "Community 38"
Cohesion: 0.20
Nodes (11): enrichTukangOptions(), FieldConfig, FieldType, GET(), hasAccess(), NOTES, ROLE_STAGES, STAGE_CONFIGS (+3 more)

### Community 39 - "Community 39"
Cohesion: 0.18
Nodes (9): cormorantGaramond, dmSans, dmSerifDisplay, geistMono, geistSans, inter, metadata, playfairDisplay (+1 more)

### Community 40 - "Community 40"
Cohesion: 0.24
Nodes (9): CurrentUserWithRole, DELETE(), GET(), isValidUUID(), OrderWithCustomer, Role, ScanEventDetail, StageResult (+1 more)

### Community 41 - "Community 41"
Cohesion: 0.29
Nodes (9): ALLOWED_ROLES, checkAuth(), DELETE(), GET(), PATCH(), POST(), QRCode, Role (+1 more)

### Community 42 - "Community 42"
Cohesion: 0.20
Nodes (4): Mode, Step, UserProfile, BrandHeaderProps

### Community 43 - "Community 43"
Cohesion: 0.20
Nodes (4): HeaderProps, ProfileData, ProfileData, SettingsModalProps

### Community 44 - "Community 44"
Cohesion: 0.44
Nodes (8): formatCurrency(), generateInsights(), GET(), getDayName(), getDaysInMonth(), getDaysRemainingInMonth(), getLast7DaysHistory(), getMonthName()

### Community 45 - "Community 45"
Cohesion: 0.25
Nodes (3): GET(), PRODUCTION_ROLES, toCSV()

### Community 46 - "Community 46"
Cohesion: 0.12
Nodes (10): LeadInput, Channel, CSInput, CSUser, InputMarketingPage(), ModalProps, LeadInputData, LeadInputSchema (+2 more)

### Community 47 - "Community 47"
Cohesion: 0.25
Nodes (6): AlertState, buildTitle(), LaporanPage(), MONTH_NAMES, Report, ReportType

### Community 48 - "Community 48"
Cohesion: 0.22
Nodes (6): iconMap, menuItems, SidebarProps, CollapseState, MenuItem, Notification

### Community 49 - "Community 49"
Cohesion: 0.28
Nodes (5): formatCurrency(), formatDate(), OrderDetail, OrderDetailPopup(), STAGE_COLORS

### Community 50 - "Community 50"
Cohesion: 0.32
Nodes (6): calculateAverageCycleTime(), DailyStatsResponse, estimateWipValue(), GET(), PRODUCTION_ROLES, STAGE_ORDER

### Community 51 - "Community 51"
Cohesion: 0.32
Nodes (7): currentPeriod(), LaporanPage(), periodLabel(), ReportCard, REPORTS, ReportType, TONE_MAP

### Community 52 - "Community 52"
Cohesion: 0.32
Nodes (3): BottleneckTableRow(), formatHours(), getStatusInfo()

### Community 53 - "Community 53"
Cohesion: 0.25
Nodes (4): ROLE_GROUP_STYLES, STAGE_LABELS, QRCode, Role

### Community 54 - "Community 54"
Cohesion: 0.39
Nodes (7): StageDeadlineBadge(), getScaleFactor(), getStageDeadline(), getStageDeadlineStatus(), STAGE_H_DAYS, StageDeadlineStatus, subtractWorkingDays()

### Community 55 - "Community 55"
Cohesion: 0.29
Nodes (5): getStatusLabel(), ItemRow(), ItemRowProps, Segment, SEGMENTS

### Community 56 - "Community 56"
Cohesion: 0.32
Nodes (5): addWorkingDays(), countWorkingDays(), getIndonesianHolidays(), indonesiaHolidays, KATEGORI_THRESHOLDS

### Community 57 - "Community 57"
Cohesion: 0.43
Nodes (5): DAY_ABBR, GET(), last7Days(), prevDay(), sumField()

### Community 58 - "Community 58"
Cohesion: 0.48
Nodes (5): formatCurrency(), formatNumber(), formatPercentage(), GET(), toCSV()

### Community 59 - "Community 59"
Cohesion: 0.29
Nodes (6): APPROVAL_STAGES, APPROVAL_STAGES_ARRAY, APPROVAL_TO_PRODUCTION_STAGE, GET(), PRODUCTION_TO_APPROVAL_STAGE, SUPERVISOR_VISIBLE_STAGES

### Community 60 - "Community 60"
Cohesion: 0.33
Nodes (4): formatRupiah(), PelangganGroup, PelangganOrder, PelangganPage()

### Community 61 - "Community 61"
Cohesion: 0.29
Nodes (5): formatDate(), WorkerHistorySection(), WorkshopWorkOrderCard(), formatAddsOnList(), LABEL_MAP

### Community 62 - "Community 62"
Cohesion: 0.33
Nodes (4): GET(), PRODUCTION_ROLES, QC_STAGES, SUSUT_STAGES

### Community 63 - "Community 63"
Cohesion: 0.40
Nodes (4): GET(), groupOrders(), DELETE(), Params

### Community 64 - "Community 64"
Cohesion: 0.33
Nodes (4): CustomerTimelineProps, Delivery, StageResult, Transition

### Community 65 - "Community 65"
Cohesion: 0.40
Nodes (5): fmtDate(), FONT_SRC, OrderFormPDF(), PDF_CACHE_BUST, s

### Community 66 - "Community 66"
Cohesion: 0.33
Nodes (4): OrderFormData, OrderFormDataPublic, OrderFormDataPublicSchema, OrderFormDataSchema

### Community 67 - "Community 67"
Cohesion: 0.40
Nodes (3): Assignment, PersonnelResponse, PersonnelUser

### Community 68 - "Community 68"
Cohesion: 0.40
Nodes (3): SlotCategory, SlotOverride, UserInfo

### Community 69 - "Community 69"
Cohesion: 0.50
Nodes (4): EstimatedCompletion(), EstimatedCompletionProps, fmtDuration(), StageStat

### Community 71 - "Community 71"
Cohesion: 0.50
Nodes (3): ACTIVE_STAGES, GET(), StageBottleneck

### Community 72 - "Community 72"
Cohesion: 0.67
Nodes (3): BottleneckHeatmap(), fmtCount(), HeatmapData

## Knowledge Gaps
- **428 isolated node(s):** `PRODUCTION_ROLES`, `SUSUT_STAGES`, `QC_STAGES`, `ACTIVE_STAGES`, `StageBottleneck` (+423 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **11 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `createClient()` connect `Community 7` to `Community 0`, `Community 6`, `Community 8`, `Community 10`, `Community 12`, `Community 13`, `Community 24`, `Community 35`, `Community 37`, `Community 38`, `Community 40`, `Community 41`, `Community 44`, `Community 45`, `Community 50`, `Community 57`, `Community 58`, `Community 59`, `Community 62`, `Community 63`, `Community 71`?**
  _High betweenness centrality (0.049) - this node is a cross-community bridge._
- **Why does `getRoleProps()` connect `Community 12` to `Community 0`, `Community 37`, `Community 6`, `Community 71`, `Community 7`, `Community 38`, `Community 8`, `Community 10`, `Community 45`, `Community 13`, `Community 50`, `Community 57`, `Community 58`, `Community 59`, `Community 62`, `Community 63`?**
  _High betweenness centrality (0.038) - this node is a cross-community bridge._
- **Why does `createAdminClient()` connect `Community 10` to `Community 0`, `Community 34`, `Community 35`, `Community 37`, `Community 6`, `Community 71`, `Community 8`, `Community 7`, `Community 38`, `Community 41`, `Community 12`, `Community 45`, `Community 13`, `Community 50`, `Community 59`, `Community 62`, `Community 63`?**
  _High betweenness centrality (0.017) - this node is a cross-community bridge._
- **Are the 103 inferred relationships involving `createClient()` (e.g. with `GET()` and `GET()`) actually correct?**
  _`createClient()` has 103 INFERRED edges - model-reasoned connections that need verification._
- **Are the 85 inferred relationships involving `createAdminClient()` (e.g. with `GET()` and `GET()`) actually correct?**
  _`createAdminClient()` has 85 INFERRED edges - model-reasoned connections that need verification._
- **Are the 41 inferred relationships involving `getRoleProps()` (e.g. with `GET()` and `POST()`) actually correct?**
  _`getRoleProps()` has 41 INFERRED edges - model-reasoned connections that need verification._
- **What connects `PRODUCTION_ROLES`, `SUSUT_STAGES`, `QC_STAGES` to the rest of the system?**
  _428 weakly-connected nodes found - possible documentation gaps or missing edges._