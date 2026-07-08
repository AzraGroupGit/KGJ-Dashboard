// app/dashboard/marketing/page.tsx

"use client";

import { useState, useEffect, startTransition } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetcher } from "@/lib/api";
import Sidebar from "@/components/layout/Sidebar";
import Header from "@/components/layout/Header";
import Loading from "@/components/ui/Loading";
import Alert from "@/components/ui/Alert";
import { BarChart3, Users, FileText, Info } from "lucide-react";

import type { MarketingInput, AnalyticsData } from "@/types/marketing";

export default function MarketingDashboard() {
  const today = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  const fmt = (d: Date) =>
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const monthStart = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-01`;
  const todayStr = fmt(today);

  const [alert, setAlert] = useState<{
    type: "success" | "error" | "warning" | "info";
    message: string;
  } | null>(null);
  const [filterDate, setFilterDate] = useState({ from: monthStart, to: todayStr });
  const [activePreset, setActivePreset] = useState("bulan-ini");
  const [showCustomRange, setShowCustomRange] = useState(false);

  const applyPreset = (preset: string) => {
    const today = new Date();
    const pad = (n: number) => String(n).padStart(2, "0");
    const fmt = (d: Date) =>
      `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

    setActivePreset(preset);
    setShowCustomRange(false);

    if (preset === "hari-ini") {
      const t = fmt(today);
      setFilterDate({ from: t, to: t });
    } else if (preset === "minggu-ini") {
      const day = today.getDay();
      const mon = new Date(today);
      mon.setDate(today.getDate() - ((day + 6) % 7));
      setFilterDate({ from: fmt(mon), to: fmt(today) });
    } else if (preset === "bulan-ini") {
      const from = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-01`;
      setFilterDate({ from, to: fmt(today) });
    } else if (preset === "bulan-lalu") {
      const y = today.getMonth() === 0 ? today.getFullYear() - 1 : today.getFullYear();
      const m = today.getMonth() === 0 ? 12 : today.getMonth();
      const last = new Date(y, m, 0).getDate();
      setFilterDate({
        from: `${y}-${pad(m)}-01`,
        to: `${y}-${pad(m)}-${pad(last)}`,
      });
    } else if (preset === "semua") {
      setFilterDate({ from: "", to: "" });
    } else if (preset === "custom") {
      setShowCustomRange(true);
    }
  };

  const filterParams = new URLSearchParams();
  if (filterDate.from) filterParams.set("from", filterDate.from);
  if (filterDate.to) filterParams.set("to", filterDate.to);

  const marketingInputsUrl = `/api/marketing/inputs?limit=100&${filterParams.toString()}`;
  const analyticsUrl = `/api/marketing/analytics?${filterParams.toString()}`;

  const {
    data: marketingInputsRes,
    isLoading: inputsLoading,
    error: inputsError,
  } = useQuery<{ data: MarketingInput[] }>({
    queryKey: ["marketing-inputs", filterDate],
    queryFn: () => fetcher<{ data: MarketingInput[] }>(marketingInputsUrl),
  });

  const {
    data: analyticsRes,
    isLoading: analyticsLoading,
  } = useQuery<{ data: AnalyticsData }>({
    queryKey: ["marketing-analytics", filterDate],
    queryFn: () => fetcher<{ data: AnalyticsData }>(analyticsUrl),
  });

  const marketingInputs = marketingInputsRes?.data ?? [];
  const analytics = analyticsRes?.data ?? null;
  const isLoading = inputsLoading || analyticsLoading;

  useEffect(() => {
    if (inputsError) {
      startTransition(() => {
        setAlert({
          type: "error",
          message: "Gagal memuat data marketing",
        });
      });
    }
  }, [inputsError]);

  const calculateMetrics = (input: MarketingInput) => {
    const crSerius =
      input.lead_serius > 0 ? (input.closing / input.lead_serius) * 100 : 0;
    return { crSerius };
  };

  if (isLoading) {
    return (
      <div className="flex h-screen bg-[#26211c]">
        <Sidebar role="marketing" />
        <div className="flex-1 flex flex-col overflow-hidden">
          <Header userEmail="marketing@company.com" role="marketing" />
          <main className="flex-1 overflow-y-auto p-6">
            <Loading variant="skeleton" text="Memuat data marketing..." />
          </main>
        </div>
      </div>
    );
  }

  const summary = analytics?.summary;
  const recommendations = analytics?.recommendations || [];
  const channelMetrics = analytics?.channelMetrics || [];

  return (
    <div className="flex h-screen bg-[#26211c]">
      <Sidebar role="marketing" />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header userEmail="marketing@company.com" role="marketing" />
        <main className="flex-1 overflow-y-auto p-6">
          {/* Alert Notification */}
          {alert && (
            <div className="mb-6 animate-slide-down">
              <Alert
                type={alert.type}
                message={alert.message}
                onClose={() => setAlert(null)}
                autoClose={true}
                duration={3000}
              />
            </div>
          )}

          {/* Header with Filters */}
          <div className="mb-8">
            <div className="flex justify-between items-start flex-wrap gap-4 mb-4">
              <div>
                <h2 className="text-2xl font-bold text-gray-800">
                  Marketing Analytics
                </h2>
                <p className="text-gray-600">
                  Analisis performa channel marketing & optimasi budget
                </p>
              </div>
            </div>

            {/* Filter Bar */}
            <div className="flex flex-wrap items-center gap-2">
              {(
                [
                  { key: "hari-ini", label: "Hari Ini" },
                  { key: "minggu-ini", label: "Minggu Ini" },
                  { key: "bulan-ini", label: "Bulan Ini" },
                  { key: "bulan-lalu", label: "Bulan Lalu" },
                  { key: "semua", label: "Semua" },
                  { key: "custom", label: "Custom" },
                ] as const
              ).map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => applyPreset(key)}
                  className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                    activePreset === key
                      ? "bg-blue-600 text-white border-blue-600"
                      : "bg-white text-gray-600 border-gray-300 hover:border-blue-400 hover:text-blue-600"
                  }`}
                >
                  {label}
                </button>
              ))}

              {/* Active range label */}
              {(filterDate.from || filterDate.to) && activePreset !== "custom" && (
                <span className="text-xs text-gray-400 ml-1">
                  {filterDate.from} — {filterDate.to}
                </span>
              )}
            </div>

            {/* Custom date range */}
            {showCustomRange && (
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <input
                  type="date"
                  value={filterDate.from}
                  onChange={(e) =>
                    setFilterDate({ ...filterDate, from: e.target.value })
                  }
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <span className="text-gray-400 text-sm">—</span>
                <input
                  type="date"
                  value={filterDate.to}
                  onChange={(e) =>
                    setFilterDate({ ...filterDate, to: e.target.value })
                  }
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            )}
          </div>

          {/* Summary Cards */}
          {summary && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
              <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl shadow-lg p-6 text-white">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm opacity-90">Conversion Rate</p>
                  <BarChart3 className="w-5 h-5" />
                </div>
                <p className="text-2xl font-bold">
                  {summary.crSerius.toFixed(1)}%
                </p>
                <p className="text-xs opacity-80 mt-2">
                  Closing / Lead Serius
                </p>
              </div>

              <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl shadow-lg p-6 text-white">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm opacity-90">
                    Customer Acquisition Cost
                  </p>
                  <Users className="w-5 h-5" />
                </div>
                <p className="text-2xl font-bold">
                  Rp {summary.cac.toLocaleString("id-ID")}
                </p>
                <p className="text-xs opacity-80 mt-2">Biaya per closing</p>
              </div>

              <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg p-6 text-white">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm opacity-90">Total Data Input</p>
                  <FileText className="w-5 h-5" />
                </div>
                <p className="text-2xl font-bold">{summary.totalInputs}</p>
                <p className="text-xs opacity-80 mt-2">Data marketing tercatat</p>
              </div>
            </div>
          )}

          {/* Optimization Recommendations */}
          {recommendations.length > 0 && (
            <div className="mb-8 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <h4 className="font-semibold text-yellow-800 mb-3">
                📊 Rekomendasi Optimasi Budget
              </h4>
              <div className="space-y-2">
                {recommendations.map((rec, idx) => (
                  <div key={idx} className="text-sm">
                    <span className="font-medium text-yellow-800">
                      {rec.channel}:
                    </span>{" "}
                    <span className="text-yellow-700">{rec.reason}</span>
                    <br />
                    <span className="text-yellow-600 text-xs">
                      → {rec.action}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Channel Performance Table */}
          {channelMetrics.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm overflow-hidden mb-8">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-800">
                  Performa per Channel
                </h3>
                <p className="text-sm text-gray-500 mt-1">
                  {channelMetrics.length} channel aktif
                </p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-[#26211c]">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Channel
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Biaya Mkt
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        CR
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        CAC
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {channelMetrics.map((channel, idx) => (
                      <tr key={idx} className="hover:bg-[#26211c]">
                        <td className="px-6 py-4 font-medium text-gray-900">
                          {channel.channel}
                        </td>
                        <td className="px-6 py-4 text-gray-600">
                          Rp {channel.biayaMarketing.toLocaleString("id-ID")}
                        </td>
                        <td className="px-6 py-4 text-gray-600">
                          {channel.crSerius.toFixed(1)}%
                        </td>
                        <td className="px-6 py-4 text-gray-600">
                          Rp {channel.cac.toLocaleString("id-ID")}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* All Inputs Table */}
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-800">
                Riwayat Input Marketing
              </h3>
              <p className="text-sm text-gray-500 mt-1">
                {marketingInputs.length} data
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-[#26211c]">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Tanggal
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Channel
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Biaya Mkt
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Lead Serius
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Closing
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      CR
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {marketingInputs.map((input) => {
                    const { crSerius } = calculateMetrics(input);
                    return (
                      <tr key={input.id} className="hover:bg-[#26211c]">
                        <td className="px-6 py-4 text-gray-600">
                          {new Date(input.input_date).toLocaleDateString(
                            "id-ID",
                          )}
                        </td>
                        <td className="px-6 py-4 font-medium text-gray-900">
                          {input.channel}
                        </td>
                        <td className="px-6 py-4 text-gray-600">
                          Rp {input.biaya_marketing.toLocaleString("id-ID")}
                        </td>
                        <td className="px-6 py-4 text-gray-600">
                          {input.lead_serius}
                        </td>
                        <td className="px-6 py-4 text-gray-600">
                          {input.closing}
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`px-2 py-1 rounded-full text-xs font-semibold ${
                              crSerius > 30
                                ? "bg-green-100 text-green-800"
                                : crSerius > 15
                                  ? "bg-yellow-100 text-yellow-800"
                                  : "bg-red-100 text-red-800"
                            }`}
                          >
                            {crSerius.toFixed(1)}%
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                  {marketingInputs.length === 0 && (
                    <tr>
                      <td
                        colSpan={6}
                        className="px-6 py-8 text-center text-gray-500"
                      >
                        Belum ada data. Silakan input data melalui halaman{" "}
                        <a
                          href="/dashboard/marketing/input"
                          className="text-blue-600 hover:underline"
                        >
                          Input Data Marketing
                        </a>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Info Section */}
          <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <Info className="w-5 h-5 text-blue-600 mt-0.5" />
              <div>
                <p className="text-sm text-blue-800 font-medium">
                  Informasi Metrik
                </p>
                <p className="text-sm text-blue-600 mt-1">
                  <strong>CR Serius</strong> = Closing / Lead Serius × 100% |{" "}
                  <strong>CAC</strong> = Biaya Marketing / Closing |{" "}
                  <strong>CPLS</strong> = Biaya Marketing / Lead Serius
                </p>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
