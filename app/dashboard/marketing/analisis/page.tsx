// app/dashboard/marketing/analisis/page.tsx

"use client";

import { useState, useEffect } from "react";
import Sidebar from "@/components/layout/Sidebar";
import Header from "@/components/layout/Header";
import Button from "@/components/ui/Button";
import Loading from "@/components/ui/Loading";
import Alert from "@/components/ui/Alert";

interface ChannelAnalysis {
  channel: string;
  omset: number;
  biayaMarketing: number;
  leadSerius: number;
  leadAll: number;
  closing: number;
  roi: number;
  crSerius: number;
  cac: number;
  gpPerBm: number;
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
  channelMetrics: ChannelAnalysis[];
  recommendations: Array<{
    type: "increase" | "decrease" | "warning" | "improve";
    channel: string;
    reason: string;
    action: string;
  }>;
}

export default function AnalisisChannelPage() {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState("monthly");
  const [selectedChannel, setSelectedChannel] = useState<string>("all");
  const [isLoading, setIsLoading] = useState(true);
  const [alert, setAlert] = useState<{
    type: "success" | "error" | "warning" | "info";
    message: string;
  } | null>(null);

  // Fetch analytics data
  const fetchAnalytics = async () => {
    setIsLoading(true);
    try {
      // Hitung tanggal berdasarkan periode
      const today = new Date();
      let fromDate = "";

      if (selectedPeriod === "monthly") {
        const firstDayOfMonth = new Date(
          today.getFullYear(),
          today.getMonth(),
          1,
        );
        fromDate = firstDayOfMonth.toISOString().split("T")[0];
      } else if (selectedPeriod === "quarterly") {
        const currentQuarter = Math.floor(today.getMonth() / 3);
        const firstDayOfQuarter = new Date(
          today.getFullYear(),
          currentQuarter * 3,
          1,
        );
        fromDate = firstDayOfQuarter.toISOString().split("T")[0];
      } else if (selectedPeriod === "yearly") {
        fromDate = `${today.getFullYear()}-01-01`;
      }

      const toDate = today.toISOString().split("T")[0];
      const url = `/api/marketing/analytics?from=${fromDate}&to=${toDate}`;

      const response = await fetch(url);
      const data = await response.json();

      if (data.data) {
        setAnalytics(data.data);
      } else {
        throw new Error(data.error || "Gagal memuat data analisis");
      }
    } catch (error) {
      console.error("Error fetching analytics:", error);
      setAlert({
        type: "error",
        message: "Gagal memuat data analisis",
      });
      setTimeout(() => setAlert(null), 3000);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, [selectedPeriod]);

  const formatRupiah = (value: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(value);
  };

  const getPerformanceBadge = (roi: number) => {
    if (roi > 300) {
      return (
        <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
          Excellent
        </span>
      );
    } else if (roi > 200) {
      return (
        <span className="px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
          Good
        </span>
      );
    } else if (roi > 100) {
      return (
        <span className="px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">
          Average
        </span>
      );
    } else if (roi > 0) {
      return (
        <span className="px-2 py-1 text-xs font-semibold rounded-full bg-orange-100 text-orange-800">
          Low
        </span>
      );
    }
    return (
      <span className="px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">
        Poor
      </span>
    );
  };

  const handleExport = async () => {
    try {
      // Hitung tanggal berdasarkan periode
      const today = new Date();
      let fromDate = "";

      if (selectedPeriod === "monthly") {
        const firstDayOfMonth = new Date(
          today.getFullYear(),
          today.getMonth(),
          1,
        );
        fromDate = firstDayOfMonth.toISOString().split("T")[0];
      } else if (selectedPeriod === "quarterly") {
        const currentQuarter = Math.floor(today.getMonth() / 3);
        const firstDayOfQuarter = new Date(
          today.getFullYear(),
          currentQuarter * 3,
          1,
        );
        fromDate = firstDayOfQuarter.toISOString().split("T")[0];
      } else if (selectedPeriod === "yearly") {
        fromDate = `${today.getFullYear()}-01-01`;
      }

      const toDate = today.toISOString().split("T")[0];

      // Fetch data untuk export
      const response = await fetch(
        `/api/marketing/inputs?from=${fromDate}&to=${toDate}&limit=1000`,
      );
      const data = await response.json();

      if (data.data && data.data.length > 0) {
        // Convert to CSV
        const headers = [
          "Tanggal",
          "Channel",
          "Omzet",
          "Biaya Marketing",
          "Lead Serius",
          "Lead All",
          "Closing",
          "ROI (%)",
          "CR Serius (%)",
        ];
        const csvData = data.data.map((item: any) => {
          const gp = item.omset * 0.5;
          const roi =
            item.biaya_marketing > 0
              ? ((gp - item.biaya_marketing) / item.biaya_marketing) * 100
              : 0;
          const crSerius =
            item.lead_serius > 0 ? (item.closing / item.lead_serius) * 100 : 0;

          return [
            item.input_date,
            item.channel,
            item.omset,
            item.biaya_marketing,
            item.lead_serius,
            item.lead_all,
            item.closing,
            roi.toFixed(2),
            crSerius.toFixed(2),
          ];
        });

        const csvRows = [headers, ...csvData];
        const csvContent = csvRows.map((row) => row.join(",")).join("\n");

        // Download file
        const blob = new Blob([csvContent], { type: "text/csv" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `marketing_analytics_${selectedPeriod}_${new Date().toISOString().split("T")[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        setAlert({
          type: "success",
          message: "Laporan berhasil diekspor!",
        });
      } else {
        setAlert({
          type: "warning",
          message: "Tidak ada data untuk diekspor",
        });
      }
    } catch (error) {
      console.error("Error exporting data:", error);
      setAlert({
        type: "error",
        message: "Gagal mengekspor laporan",
      });
    } finally {
      setTimeout(() => setAlert(null), 3000);
    }
  };

  const channelMetrics = analytics?.channelMetrics || [];
  const summary = analytics?.summary;
  const recommendations = analytics?.recommendations || [];

  const filteredAnalysis =
    selectedChannel === "all"
      ? channelMetrics
      : channelMetrics.filter((item) => item.channel === selectedChannel);

  if (isLoading) {
    return (
      <div className="flex h-screen bg-gray-50">
        <Sidebar role="marketing" />
        <div className="flex-1 flex flex-col overflow-hidden">
          <Header userEmail="marketing@company.com" role="marketing" />
          <main className="flex-1 overflow-y-auto p-6">
            <Loading variant="skeleton" text="Memuat data analisis..." />
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar role="marketing" />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header userEmail="marketing@company.com" role="marketing" />
        <main className="flex-1 overflow-y-auto p-6">
          {/* Alert */}
          {alert && (
            <div className="mb-6 animate-slide-down">
              <Alert
                type={alert.type}
                message={alert.message}
                onClose={() => setAlert(null)}
                autoClose
                duration={3000}
              />
            </div>
          )}

          {/* Header */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-800 mb-2">
              Analisis Channel Marketing
            </h2>
            <p className="text-gray-600">
              Analisis performa dan perbandingan antar channel marketing
            </p>
          </div>

          {/* Filter Section */}
          <div className="bg-white rounded-xl shadow-sm p-4 mb-6 flex flex-wrap gap-4 items-center">
            <div>
              <label className="text-sm text-gray-600 mr-2">Periode:</label>
              <select
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(e.target.value)}
                className="px-3 py-1 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="monthly">Bulan Ini</option>
                <option value="quarterly">Triwulan Ini</option>
                <option value="yearly">Tahun Ini</option>
              </select>
            </div>
            <div>
              <label className="text-sm text-gray-600 mr-2">Channel:</label>
              <select
                value={selectedChannel}
                onChange={(e) => setSelectedChannel(e.target.value)}
                className="px-3 py-1 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">Semua Channel</option>
                {channelMetrics.map((item) => (
                  <option key={item.channel} value={item.channel}>
                    {item.channel}
                  </option>
                ))}
              </select>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExport}
              leftIcon={
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                  />
                </svg>
              }
            >
              Ekspor Laporan
            </Button>
          </div>

          {/* Overall Summary */}
          {summary && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg p-6 text-white">
                <p className="text-sm opacity-90">Total Omzet</p>
                <p className="text-2xl font-bold mt-2">
                  {formatRupiah(summary.totalOmset)}
                </p>
                <p className="text-xs opacity-80 mt-2">
                  {summary.totalInputs} data input
                </p>
              </div>
              <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl shadow-lg p-6 text-white">
                <p className="text-sm opacity-90">Total Biaya Marketing</p>
                <p className="text-2xl font-bold mt-2">
                  {formatRupiah(summary.totalBiayaMarketing)}
                </p>
                <p className="text-xs opacity-80 mt-2">
                  {(
                    (summary.totalBiayaMarketing / summary.totalOmset) *
                    100
                  ).toFixed(1)}
                  % dari omzet
                </p>
              </div>
              <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl shadow-lg p-6 text-white">
                <p className="text-sm opacity-90">ROI Marketing</p>
                <p className="text-2xl font-bold mt-2">
                  {summary.roi.toFixed(1)}%
                </p>
                <p className="text-xs opacity-80 mt-2">Return on investment</p>
              </div>
              <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl shadow-lg p-6 text-white">
                <p className="text-sm opacity-90">Conversion Rate (Serius)</p>
                <p className="text-2xl font-bold mt-2">
                  {summary.crSerius.toFixed(1)}%
                </p>
                <p className="text-xs opacity-80 mt-2">
                  {summary.totalClosing} closing dari {summary.totalLeadSerius}{" "}
                  lead serius
                </p>
              </div>
            </div>
          )}

          {/* Channel Performance Table */}
          <div className="bg-white rounded-xl shadow-sm overflow-hidden mb-8">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-800">
                Performa Channel Marketing
              </h3>
              <p className="text-sm text-gray-500 mt-1">
                {filteredAnalysis.length} channel aktif
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
                      Lead Serius
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Closing
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      CR Serius
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      CAC
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      GP/BM
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      ROI
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Performa
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredAnalysis.map((item) => (
                    <tr key={item.channel} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">
                        {item.channel}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-600">
                        {formatRupiah(item.omset)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-600">
                        {formatRupiah(item.biayaMarketing)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-600">
                        {item.leadSerius.toLocaleString("id-ID")}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-600">
                        {item.closing.toLocaleString("id-ID")}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`font-semibold ${
                            item.crSerius > 35
                              ? "text-green-600"
                              : item.crSerius > 25
                                ? "text-yellow-600"
                                : "text-red-600"
                          }`}
                        >
                          {item.crSerius.toFixed(1)}%
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-600">
                        {formatRupiah(item.cac)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-600">
                        {item.gpPerBm.toFixed(2)}x
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`font-semibold ${
                            item.roi > 300
                              ? "text-green-600"
                              : item.roi > 200
                                ? "text-blue-600"
                                : item.roi > 100
                                  ? "text-yellow-600"
                                  : item.roi > 0
                                    ? "text-orange-600"
                                    : "text-red-600"
                          }`}
                        >
                          {item.roi.toFixed(1)}%
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getPerformanceBadge(item.roi)}
                      </td>
                    </tr>
                  ))}
                  {filteredAnalysis.length === 0 && (
                    <tr>
                      <td
                        colSpan={10}
                        className="px-6 py-8 text-center text-gray-500"
                      >
                        Belum ada data channel untuk periode yang dipilih
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Recommendations Section */}
          {recommendations.length > 0 && (
            <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl p-6">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <svg
                    className="w-6 h-6 text-indigo-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                    />
                  </svg>
                </div>
                <div className="flex-1">
                  <h4 className="text-lg font-semibold text-gray-800 mb-3">
                    Rekomendasi Strategi Marketing
                  </h4>
                  <div className="space-y-3">
                    {recommendations.map((rec, idx) => (
                      <div
                        key={idx}
                        className="border-b border-indigo-100 last:border-0 pb-2 last:pb-0"
                      >
                        <p className="text-gray-800">
                          <span className="font-semibold">
                            {rec.type === "increase" && "📈 "}
                            {rec.type === "decrease" && "📉 "}
                            {rec.type === "warning" && "⚠️ "}
                            {rec.type === "improve" && "🎯 "}
                            {rec.channel}:
                          </span>{" "}
                          {rec.reason}
                        </p>
                        <p className="text-sm text-gray-600 mt-1">
                          → {rec.action}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Info Box when no data */}
          {channelMetrics.length === 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 text-center">
              <svg
                className="w-12 h-12 text-blue-400 mx-auto mb-3"
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
              <h3 className="text-lg font-semibold text-gray-800 mb-2">
                Belum Ada Data
              </h3>
              <p className="text-gray-600">
                Silakan input data marketing terlebih dahulu melalui halaman{" "}
                <a
                  href="/dashboard/marketing/input"
                  className="text-blue-600 hover:underline"
                >
                  Input Data Marketing
                </a>
              </p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
