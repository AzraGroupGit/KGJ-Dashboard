// app/dashboard/superadmin/oprprd/monitoring/page.tsx

"use client";

import { useEffect, useState } from "react";
import { useQueries, useQueryClient } from "@tanstack/react-query";
import { fetcher } from "@/lib/api";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/layout/Sidebar";
import Header from "@/components/layout/Header";
import Loading from "@/components/ui/Loading";
import { getClientUser, type ClientUser } from "@/lib/auth/session";
import OrderDetailPopup from "@/components/orders/OrderDetailPopup";
import type { BottleneckData } from "@/types/bottleneck";
import { Search } from "lucide-react";
import type { Channel } from "pusher-js";
import {
  buildUrl,
  ErrorState,
  type ProduksiData,
  type OperasionalData,
  type ReworkData,
} from "./_components/shared";
import { OverviewTab } from "./_components/OverviewTab";
import { ProduksiTab } from "./_components/ProduksiTab";
import { OperasionalTab } from "./_components/OperasionalTab";
import { FilterPresets } from "./_components/FilterPresets";

type ActiveTab = "overview" | "produksi" | "operasional";

export const dynamic = "force-dynamic";

export default function MonitoringPage() {
  const router = useRouter();
  const [clientUser, setClientUser] = useState<ClientUser | null>(null);
  const [activeTab, setActiveTab] = useState<ActiveTab>("overview");
  const [bnFilter, setBnFilter] = useState<
    "all" | "production" | "operational" | "completed"
  >("all");
  const [detailOrderId, setDetailOrderId] = useState<string | null>(null);
  const [detailOrderNumber, setDetailOrderNumber] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const queryClient = useQueryClient();

  const [refetchInterval, setRefetchInterval] = useState<number | false>(60_000);

  const queries = useQueries({
    queries: [
      {
        queryKey: ["monitoring", "prod", dateFrom, dateTo],
        queryFn: () => fetcher<{ data: ProduksiData }>(buildUrl("/api/production", dateFrom, dateTo)),
        refetchInterval,
      },
      {
        queryKey: ["monitoring", "op", dateFrom, dateTo],
        queryFn: () => fetcher<{ data: OperasionalData }>(buildUrl("/api/operational", dateFrom, dateTo)),
        refetchInterval,
      },
      {
        queryKey: ["monitoring", "bn", dateFrom, dateTo],
        queryFn: () => fetcher<{ data: BottleneckData }>(buildUrl("/api/bottleneck", dateFrom, dateTo)),
        refetchInterval,
      },
      {
        queryKey: ["monitoring", "supervisor", dateFrom, dateTo],
        queryFn: () => fetcher<{ data: { completedOrders: Array<{ id: string; order_number: string; customer_name: string; completed_at: string }> } }>(buildUrl("/api/supervisor", dateFrom, dateTo)),
        refetchInterval,
      },
      {
        queryKey: ["monitoring", "rework", dateFrom, dateTo],
        queryFn: () => fetcher<{ data: ReworkData }>(buildUrl("/api/rework-overview", dateFrom, dateTo)),
        refetchInterval,
      },
    ],
  });

  const [prodQuery, opQuery, bnQuery, supervisorQuery, reworkQuery] = queries;

  const prodData: ProduksiData | null =
    (prodQuery.data as { data: ProduksiData } | undefined)?.data ?? null;
  const opData: OperasionalData | null =
    (opQuery.data as { data: OperasionalData } | undefined)?.data ?? null;
  const bnData: BottleneckData | null =
    (bnQuery.data as { data: BottleneckData } | undefined)?.data ?? null;
  const completedOrders: Array<{ id: string; order_number: string; customer_name: string; completed_at: string }> =
    (supervisorQuery.data as { data: { completedOrders: Array<{ id: string; order_number: string; customer_name: string; completed_at: string }> } } | undefined)?.data?.completedOrders ?? [];
  const reworkData: ReworkData | null =
    (reworkQuery.data as { data: ReworkData } | undefined)?.data ?? null;

  const initialLoading = queries.some((q) => q.isLoading);
  const hasData = queries.some((q) => !!q.data);
  const anyError = queries.find((q) => q.error);
  const error = !initialLoading && !hasData && anyError ? (anyError.error instanceof Error ? anyError.error.message : "Terjadi kesalahan") : null;

  const refreshAll = () => { queries.forEach((q) => { q.refetch(); }); };

  useEffect(() => {
    const cu = getClientUser();
    if (!cu) {
      router.push("/login");
      return;
    }
    setClientUser(cu);
  }, [router]);

  // Pusher real-time (refetchInterval handles polling fallback)
  useEffect(() => {
    const userId = clientUser?.id;
    let channel: Channel | null = null;

    async function initPusher() {
      if (!userId) return;
      try {
        const { default: Pusher } = await import("pusher-js");
        const pusher = new Pusher(process.env.NEXT_PUBLIC_PUSHER_KEY!, {
          cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
          authEndpoint: "/api/pusher/auth",
        });

        pusher.connection.bind("state_change", (states: { current: string }) => {
          setRefetchInterval(states.current === "connected" ? false : 60_000);
        });

        channel = pusher.subscribe(`private-user-${userId}`);
        channel.bind("new-notification", () => {
          queryClient.invalidateQueries({ queryKey: ["monitoring"] });
        });
      } catch {
        console.warn("[monitoring] Pusher unavailable, using polling fallback");
      }
    }

    initPusher();

    return () => {
      if (channel) channel.unsubscribe();
    };
  }, [clientUser?.id, queryClient]);

  // Derived summary metrics
  const activeExperts =
    prodData?.experts.filter((e) => e.activeOrder).length ?? 0;
  const avgYield = (() => {
    const rows =
      prodData?.yieldData.filter((r) => r.actual && r.target && r.target > 0) ??
      [];
    if (!rows.length) return 0;
    return (
      rows.reduce((acc, r) => acc + (r.actual! / r.target!) * 100, 0) /
      rows.length
    );
  })();
  const urgentCount =
    opData?.afterSales.konfirmasi.filter((o) => o.hours_elapsed > 48).length ??
    0;
  const qcPassRate = (() => {
    const rows = opData?.qc.summary ?? [];
    if (!rows.length) return null;
    return (
      rows.reduce((acc, r) => acc + Number(r.pass_rate ?? 0), 0) / rows.length
    );
  })();
  const criticalBn =
    bnData?.bottlenecks.filter((b) => b.avg_hours && b.avg_hours > 24).length ??
    0;
  const filteredBn =
    bnFilter === "completed" ? [] :
    bnData?.bottlenecks
      .filter((b) => bnFilter === "all" ? true : b.stage_group === bnFilter)
      .map((b) => ({
        ...b,
        orders: !searchQuery ? b.orders : b.orders.filter(
          (o) =>
            o.order_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (o.customer_name ?? "").toLowerCase().includes(searchQuery.toLowerCase())
        ),
      }))
      .filter((b) => searchQuery ? b.orders.length > 0 : true) ?? [];
  const prodBnCount =
    bnData?.bottlenecks.filter((b) => b.stage_group === "production").length ??
    0;
  const opBnCount =
    bnData?.bottlenecks.filter((b) => b.stage_group === "operational").length ??
    0;

  const TABS: { key: ActiveTab; label: string; desc: string }[] = [
    { key: "overview", label: "Overview", desc: "KPI & Bottleneck" },
    {
      key: "produksi",
      label: "Produksi",
      desc: "Tukang, Micro Setting, Yield",
    },
    {
      key: "operasional",
      label: "Operasional",
      desc: "After Sales, QC, Racik/Laser",
    },
  ];

  return (
    <div className="flex h-screen bg-slate-50">
      <Sidebar role="superadmin" />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header userEmail={clientUser?.email ?? ""} role="superadmin" />
        <main className="flex-1 overflow-y-auto p-6">
          {/* Page Header */}
          <div className="flex items-start justify-between gap-4 mb-5">
            <div>
              <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
                Monitoring OPR-PRD
              </h2>
              <p className="text-sm text-slate-400 mt-0.5">
                Pantau operasional & produksi secara terpadu
              </p>
            </div>
            <div className="flex flex-col items-end gap-1.5 shrink-0">
              <div className="relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Cari order / customer..."
                  className="w-52 rounded-md border border-slate-200 bg-white px-3 py-1.5 pl-8 text-xs text-slate-700 shadow-sm placeholder:text-slate-400 focus:border-slate-400 focus:outline-none"
                />
                <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="w-36 rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-700 shadow-sm focus:border-slate-400 focus:outline-none"
                  title="Dari tanggal"
                />
                <span className="text-xs text-slate-400">—</span>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="w-36 rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-700 shadow-sm focus:border-slate-400 focus:outline-none"
                  title="Sampai tanggal"
                />
                <FilterPresets
                  searchQuery={searchQuery}
                  setSearchQuery={setSearchQuery}
                  dateFrom={dateFrom}
                  setDateFrom={setDateFrom}
                  dateTo={dateTo}
                  setDateTo={setDateTo}
                  activeTab={activeTab}
                  setActiveTab={(v) => setActiveTab(v as ActiveTab)}
                  bnFilter={bnFilter}
                  setBnFilter={(v) => setBnFilter(v as "all" | "production" | "operational" | "completed")}
                />
              </div>
            </div>
          </div>

          {/* Tab Bar */}
          <div className="flex items-end border-b border-slate-200 mb-6 gap-0">
            {TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`group flex flex-col items-start px-5 py-3 text-left transition-colors border-b-2 -mb-px ${
                  activeTab === tab.key
                    ? "border-slate-900 text-slate-900"
                    : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
                }`}
              >
                <span className="text-sm font-semibold">{tab.label}</span>
                <span
                  className={`text-[10px] mt-0.5 transition-colors ${activeTab === tab.key ? "text-slate-500" : "text-slate-400"}`}
                >
                  {tab.desc}
                </span>
              </button>
            ))}
          </div>

          {/* Content */}
          {initialLoading ? (
            <Loading variant="skeleton" text="Memuat data monitoring..." />
          ) : error ? (
            <ErrorState error={error} onRetry={refreshAll} />
          ) : (
            <>
              {activeTab === "overview" && (
                <OverviewTab
                  prodData={prodData}
                  opData={opData}
                  bnData={bnData}
                  activeExperts={activeExperts}
                  avgYield={avgYield}
                  urgentCount={urgentCount}
                  qcPassRate={qcPassRate}
                  criticalBn={criticalBn}
                  bnFilter={bnFilter}
                  setBnFilter={setBnFilter}
                  filteredBn={filteredBn}
                  prodBnCount={prodBnCount}
                  opBnCount={opBnCount}
                  completedOrders={completedOrders}
                  reworkData={reworkData}
                  onOrderClick={(orderId, orderNumber) => {
                    setDetailOrderId(orderId);
                    setDetailOrderNumber(orderNumber);
                  }}
                />
              )}
              {activeTab === "produksi" && <ProduksiTab data={prodData} searchQuery={searchQuery} />}
              {activeTab === "operasional" && <OperasionalTab data={opData} searchQuery={searchQuery} />}
            </>
          )}
        </main>
        {detailOrderId && (
          <OrderDetailPopup
            orderId={detailOrderId}
            orderNumber={detailOrderNumber}
            onClose={() => setDetailOrderId(null)}
          />
        )}
      </div>
    </div>
  );
}
