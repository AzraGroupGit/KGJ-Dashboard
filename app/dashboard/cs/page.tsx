// app/dashboard/cs/page.tsx

"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/layout/Sidebar";
import Header from "@/components/layout/Header";
import Loading from "@/components/ui/Loading";
import Alert from "@/components/ui/Alert";
import Button from "@/components/ui/Button";
import { getClientUser, type ClientUser } from "@/lib/auth/session";
import { CS_ROUTES } from "@/lib/routes";

interface StatsData {
  branch: { id: string; name: string; code: string } | null;
  month: {
    totalLeadMasuk: number;
    totalClosing: number;
    averageCR: number;
    totalDays: number;
  };
  today: {
    hasInput: boolean;
    leadMasuk: number | null;
    closing: number | null;
  };
}

interface RecentInput {
  id: string;
  input_date: string;
  lead_masuk: number;
  closing: number;
  notes: string | null;
}

export default function CSDashboard() {
  const router = useRouter();
  const [user, setUser] = useState<ClientUser | null>(null);
  const [stats, setStats] = useState<StatsData | null>(null);
  const [recentInputs, setRecentInputs] = useState<RecentInput[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const clientUser = getClientUser();
    if (!clientUser) {
      router.push("/login");
      return;
    }
    setUser(clientUser);

    const loadData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const [statsRes, inputsRes] = await Promise.all([
          fetch("/api/cs/stats"),
          fetch("/api/cs/inputs?limit=5"),
        ]);

        if (!statsRes.ok) {
          const err = await statsRes.json();
          throw new Error(err.error || "Gagal memuat stats");
        }
        if (!inputsRes.ok) {
          const err = await inputsRes.json();
          throw new Error(err.error || "Gagal memuat riwayat");
        }

        const statsData = await statsRes.json();
        const inputsData = await inputsRes.json();

        setStats(statsData.data);
        setRecentInputs(inputsData.data || []);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Terjadi kesalahan");
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [router]);

  const renderTodayStatus = () => {
    if (!stats) return null;
    if (!stats.today.hasInput) {
      return (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 flex items-start gap-4">
          <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center flex-shrink-0">
            <svg
              className="w-5 h-5 text-amber-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <div className="flex-1">
            <p className="font-semibold text-gray-900">
              Belum input data hari ini
            </p>
            <p className="text-sm text-gray-600 mt-0.5">
              Silakan input data leads & closing {stats.branch?.name} untuk hari
              ini.
            </p>
          </div>
          <Button
            variant="primary"
            size="sm"
            onClick={() => router.push(CS_ROUTES.INPUT_LEADS)}
          >
            Input Sekarang
          </Button>
        </div>
      );
    }

    return (
      <div className="bg-green-50 border border-green-200 rounded-xl p-5 flex items-start gap-4">
        <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
          <svg
            className="w-5 h-5 text-green-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 13l4 4L19 7"
            />
          </svg>
        </div>
        <div className="flex-1">
          <p className="font-semibold text-gray-900">
            Data hari ini sudah diinput
          </p>
          <p className="text-sm text-gray-600 mt-0.5">
            Lead Masuk: <strong>{stats.today.leadMasuk}</strong> · Closing:{" "}
            <strong>{stats.today.closing}</strong> · Masih bisa diedit sampai
            tengah malam
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => router.push(CS_ROUTES.INPUT_LEADS)}
        >
          Edit Data
        </Button>
      </div>
    );
  };

  if (isLoading || !user) {
    return (
      <div className="flex h-screen bg-gray-50">
        <Sidebar role="cs" />
        <div className="flex-1 flex flex-col overflow-hidden">
          <Header userEmail={user?.email || ""} role="cs" />
          <main className="flex-1 overflow-y-auto p-6">
            <Loading variant="skeleton" text="Memuat dashboard..." />
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar role="cs" />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header userEmail={user.email} role="cs" />
        <main className="flex-1 overflow-y-auto p-6">
          {error && (
            <div className="mb-6">
              <Alert
                type="error"
                message={error}
                onClose={() => setError(null)}
              />
            </div>
          )}

          <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-1">
              Dashboard {stats?.branch?.name ?? "Cabang"}
            </h2>
            <p className="text-gray-600">
              Ringkasan performa leads & closing bulan ini
            </p>
          </div>

          <div className="mb-6">{renderTodayStatus()}</div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg p-6 text-white">
              <p className="text-sm opacity-90 mb-2">Total Lead Masuk</p>
              <p className="text-3xl font-bold">
                {stats?.month.totalLeadMasuk.toLocaleString("id-ID") ?? 0}
              </p>
              <p className="text-xs opacity-75 mt-2">bulan ini</p>
            </div>

            <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl shadow-lg p-6 text-white">
              <p className="text-sm opacity-90 mb-2">Total Closing</p>
              <p className="text-3xl font-bold">
                {stats?.month.totalClosing.toLocaleString("id-ID") ?? 0}
              </p>
              <p className="text-xs opacity-75 mt-2">bulan ini</p>
            </div>

            <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl shadow-lg p-6 text-white">
              <p className="text-sm opacity-90 mb-2">CR Rata-rata</p>
              <p className="text-3xl font-bold">
                {(stats?.month.averageCR ?? 0).toFixed(1)}%
              </p>
              <p className="text-xs opacity-75 mt-2">konversi leads</p>
            </div>

            <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl shadow-lg p-6 text-white">
              <p className="text-sm opacity-90 mb-2">Hari Input</p>
              <p className="text-3xl font-bold">
                {stats?.month.totalDays ?? 0}
              </p>
              <p className="text-xs opacity-75 mt-2">hari tercatat bulan ini</p>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
              <div>
                <h3 className="text-lg font-semibold text-gray-800">
                  5 Input Terakhir
                </h3>
                <p className="text-sm text-gray-500">
                  Riwayat data terbaru cabang {stats?.branch?.name}
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.push(CS_ROUTES.INPUT_LEADS)}
              >
                Lihat Semua
              </Button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Tanggal
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Lead Masuk
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Closing
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      CR
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Catatan
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {recentInputs.length === 0 ? (
                    <tr>
                      <td
                        colSpan={5}
                        className="px-6 py-10 text-center text-gray-500"
                      >
                        Belum ada data input. Mulai input data pertama di
                        halaman Input Leads.
                      </td>
                    </tr>
                  ) : (
                    recentInputs.map((item) => {
                      const cr =
                        item.lead_masuk > 0
                          ? (item.closing / item.lead_masuk) * 100
                          : 0;
                      return (
                        <tr
                          key={item.id}
                          className="hover:bg-gray-50 transition-colors"
                        >
                          <td className="px-6 py-4 whitespace-nowrap text-gray-700">
                            {new Date(item.input_date).toLocaleDateString(
                              "id-ID",
                              {
                                day: "2-digit",
                                month: "short",
                                year: "numeric",
                              },
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-gray-700">
                            {item.lead_masuk.toLocaleString("id-ID")}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-gray-700">
                            {item.closing.toLocaleString("id-ID")}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span
                              className={`font-semibold ${
                                cr > 30
                                  ? "text-green-600"
                                  : cr > 20
                                    ? "text-yellow-600"
                                    : "text-red-600"
                              }`}
                            >
                              {cr.toFixed(1)}%
                            </span>
                          </td>
                          <td className="px-6 py-4 text-gray-500 max-w-xs truncate">
                            {item.notes || "-"}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
