// app/dashboard/marketing/page.tsx

"use client";

import { useState, useEffect } from "react";
import Sidebar from "@/components/layout/Sidebar";
import Header from "@/components/layout/Header";
import Loading from "@/components/ui/Loading";
import Alert from "@/components/ui/Alert";

interface MarketingInput {
  id: string;
  channel: string;
  omset: number;
  biaya_marketing: number;
  lead_serius: number;
  lead_all: number;
  closing: number;
  notes: string | null;
  input_date: string;
  created_at: string;
  users?: {
    full_name: string;
    email: string;
  };
}

interface AnalyticsData {
  summary: {
    totalOmset: number;
    totalBiayaMarketing: number;
    totalLeadSerius: number;
    totalLeadAll: number;
    totalClosing: number;
    grossProfit: number;
    roi: number;
    crSerius: number;
    crAll: number;
    cpls: number;
    cpla: number;
    cac: number;
    basketSize: number;
    bmPerOmset: number;
    gpPerBm: number;
    totalInputs: number;
  };
  channelMetrics: Array<{
    channel: string;
    omset: number;
    biayaMarketing: number;
    leadSerius: number;
    leadAll: number;
    closing: number;
    roi: number;
    crSerius: number;
    cac: number;
    gp: number;
    gpPerBm: number;
  }>;
  recommendations: Array<{
    type: "increase" | "decrease" | "warning" | "improve";
    channel: string;
    reason: string;
    action: string;
  }>;
}

export default function MarketingDashboard() {
  const [marketingInputs, setMarketingInputs] = useState<MarketingInput[]>([]);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [alert, setAlert] = useState<{
    type: "success" | "error" | "warning" | "info";
    message: string;
  } | null>(null);
  const [filterDate, setFilterDate] = useState({ from: "", to: "" });

  // Fetch marketing inputs
  const fetchMarketingInputs = async () => {
    try {
      let url = "/api/marketing/inputs?limit=100";
      if (filterDate.from) url += `&from=${filterDate.from}`;
      if (filterDate.to) url += `&to=${filterDate.to}`;

      const response = await fetch(url);
      const data = await response.json();
      if (data.data) {
        setMarketingInputs(data.data);
      }
    } catch (error) {
      console.error("Error fetching marketing inputs:", error);
      setAlert({
        type: "error",
        message: "Gagal memuat data marketing",
      });
    }
  };

  // Fetch analytics
  const fetchAnalytics = async () => {
    try {
      let url = "/api/marketing/analytics?";
      if (filterDate.from) url += `from=${filterDate.from}&`;
      if (filterDate.to) url += `to=${filterDate.to}`;

      const response = await fetch(url);
      const data = await response.json();
      if (data.data) {
        setAnalytics(data.data);
      }
    } catch (error) {
      console.error("Error fetching analytics:", error);
    }
  };

  // Fetch all data
  const fetchAllData = async () => {
    setIsLoading(true);
    await Promise.all([fetchMarketingInputs(), fetchAnalytics()]);
    setIsLoading(false);
  };

  useEffect(() => {
    fetchAllData();
  }, [filterDate]);

  const calculateMetrics = (input: MarketingInput) => {
    const crSerius =
      input.lead_serius > 0 ? (input.closing / input.lead_serius) * 100 : 0;
    const roi =
      input.biaya_marketing > 0
        ? ((input.omset * 0.5 - input.biaya_marketing) /
            input.biaya_marketing) *
          100
        : 0;
    return { crSerius, roi };
  };

  if (isLoading) {
    return (
      <div className="flex h-screen bg-gray-50">
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
    <div className="flex h-screen bg-gray-50">
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

          {/* Header with Date Filters */}
          <div className="flex justify-between items-start mb-8 flex-wrap gap-4">
            <div>
              <h2 className="text-2xl font-bold text-gray-800">
                Marketing Analytics
              </h2>
              <p className="text-gray-600">
                Analisis performa channel marketing & optimasi budget
              </p>
            </div>
            <div className="flex gap-2">
              <input
                type="date"
                value={filterDate.from}
                onChange={(e) =>
                  setFilterDate({ ...filterDate, from: e.target.value })
                }
                className="px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Dari tanggal"
              />
              <input
                type="date"
                value={filterDate.to}
                onChange={(e) =>
                  setFilterDate({ ...filterDate, to: e.target.value })
                }
                className="px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Sampai tanggal"
              />
            </div>
          </div>

          {/* Summary Cards - Row 1 */}
          {summary && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
                <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg p-6 text-white">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-sm opacity-90">Total Omzet</p>
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                  </div>
                  <p className="text-2xl font-bold">
                    Rp {summary.totalOmset.toLocaleString("id-ID")}
                  </p>
                  <p className="text-xs opacity-80 mt-2">
                    Dari {summary.totalInputs} data input
                  </p>
                </div>

                <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl shadow-lg p-6 text-white">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-sm opacity-90">ROI Marketing</p>
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
                      />
                    </svg>
                  </div>
                  <p className="text-2xl font-bold">
                    {summary.roi.toFixed(1)}%
                  </p>
                  <p className="text-xs opacity-80 mt-2">
                    Return on investment
                  </p>
                </div>

                <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl shadow-lg p-6 text-white">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-sm opacity-90">Conversion Rate</p>
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                      />
                    </svg>
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
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                      />
                    </svg>
                  </div>
                  <p className="text-2xl font-bold">
                    Rp {summary.cac.toLocaleString("id-ID")}
                  </p>
                  <p className="text-xs opacity-80 mt-2">Biaya per closing</p>
                </div>
              </div>

              {/* Summary Cards - Row 2 */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-sm text-gray-600">Gross Profit / BM</p>
                    <span className="text-xl">📈</span>
                  </div>
                  <p className="text-2xl font-bold text-gray-800">
                    {summary.gpPerBm.toFixed(2)}x
                  </p>
                  <p className="text-xs text-gray-500 mt-2">
                    Return on marketing spend
                  </p>
                </div>

                <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-sm text-gray-600">Basket Size</p>
                    <span className="text-xl">🛒</span>
                  </div>
                  <p className="text-2xl font-bold text-gray-800">
                    Rp {summary.basketSize.toLocaleString("id-ID")}
                  </p>
                  <p className="text-xs text-gray-500 mt-2">
                    Rata-rata nilai per closing
                  </p>
                </div>

                <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-sm text-gray-600">
                      Marketing Cost / Omzet
                    </p>
                    <span className="text-xl">📊</span>
                  </div>
                  <p className="text-2xl font-bold text-gray-800">
                    {summary.bmPerOmset.toFixed(1)}%
                  </p>
                  <p className="text-xs text-gray-500 mt-2">
                    Target ideal &lt;30%
                  </p>
                </div>
              </div>
            </>
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
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Channel
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Omzet
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Biaya Mkt
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        ROI
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        CR
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        CAC
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        GP/BM
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {channelMetrics.map((channel, idx) => (
                      <tr key={idx} className="hover:bg-gray-50">
                        <td className="px-6 py-4 font-medium text-gray-900">
                          {channel.channel}
                        </td>
                        <td className="px-6 py-4 text-gray-600">
                          Rp {channel.omset.toLocaleString("id-ID")}
                        </td>
                        <td className="px-6 py-4 text-gray-600">
                          Rp {channel.biayaMarketing.toLocaleString("id-ID")}
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`px-2 py-1 rounded-full text-xs font-semibold ${
                              channel.roi > 50
                                ? "bg-green-100 text-green-800"
                                : channel.roi > 0
                                  ? "bg-yellow-100 text-yellow-800"
                                  : "bg-red-100 text-red-800"
                            }`}
                          >
                            {channel.roi.toFixed(1)}%
                          </span>
                        </td>
                        <td className="px-6 py-4 text-gray-600">
                          {channel.crSerius.toFixed(1)}%
                        </td>
                        <td className="px-6 py-4 text-gray-600">
                          Rp {channel.cac.toLocaleString("id-ID")}
                        </td>
                        <td className="px-6 py-4 text-gray-600">
                          {channel.gpPerBm.toFixed(2)}x
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
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Tanggal
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Channel
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Omzet
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
                      ROI
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {marketingInputs.map((input) => {
                    const { roi } = calculateMetrics(input);
                    return (
                      <tr key={input.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 text-gray-600">
                          {new Date(input.input_date).toLocaleDateString(
                            "id-ID",
                          )}
                        </td>
                        <td className="px-6 py-4 font-medium text-gray-900">
                          {input.channel}
                        </td>
                        <td className="px-6 py-4 text-gray-600">
                          Rp {input.omset.toLocaleString("id-ID")}
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
                              roi > 50
                                ? "bg-green-100 text-green-800"
                                : roi > 0
                                  ? "bg-yellow-100 text-yellow-800"
                                  : "bg-red-100 text-red-800"
                            }`}
                          >
                            {roi.toFixed(1)}%
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                  {marketingInputs.length === 0 && (
                    <tr>
                      <td
                        colSpan={7}
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
              <svg
                className="w-5 h-5 text-blue-600 mt-0.5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <div>
                <p className="text-sm text-blue-800 font-medium">
                  Informasi Metrik
                </p>
                <p className="text-sm text-blue-600 mt-1">
                  <strong>ROI</strong> = (Gross Profit - Biaya Marketing) /
                  Biaya Marketing × 100% | <strong>CR Serius</strong> = Closing
                  / Lead Serius × 100% | <strong>CAC</strong> = Biaya Marketing
                  / Closing | <strong>GP/BM</strong> = Gross Profit (50% dari
                  Omzet) / Biaya Marketing
                </p>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
