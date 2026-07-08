"use client";

import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetcher } from "@/lib/api";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/layout/Sidebar";
import Header from "@/components/layout/Header";
import Loading from "@/components/ui/Loading";
import Alert from "@/components/ui/Alert";
import { getClientUser, type ClientUser } from "@/lib/auth/session";
import { ChevronDown } from "lucide-react";

interface PelangganOrder {
  id: string;
  order_number: string;
  tgl_order: string;
  tgl_acara: string | null;
  acara: string | null;
  kategori: string | null;
  harga: number | null;
  status: string | null;
  current_stage: string | null;
  created_at: string;
  transfer_ke_bank: string | null;
}

interface PelangganGroup {
  customer_wa: string | null;
  customer_name: string;
  customer_email: string | null;
  customer_instagram: string | null;
  alamat_pengiriman: string | null;
  kelurahan: string | null;
  kecamatan: string | null;
  kabupaten_kota: string | null;
  provinsi: string | null;
  kodepos: string | null;
  total_orders: number;
  total_spent: number;
  first_order_at: string | null;
  last_order_at: string | null;
  orders: PelangganOrder[];
}

function formatRupiah(n: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n);
}

function formatDate(iso: string | null): string {
  if (!iso) return "-";
  const d = new Date(iso);
  return d.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function StatusBadge({ status }: { status: string | null }) {
  const styles: Record<string, string> = {
    in_progress: "bg-blue-50 text-blue-600",
    waiting_approval: "bg-yellow-50 text-yellow-600",
    rework: "bg-orange-50 text-orange-600",
    selesai: "bg-green-50 text-green-600",
  };

  const labels: Record<string, string> = {
    in_progress: "Proses",
    waiting_approval: "Menunggu",
    rework: "Rework",
    selesai: "Selesai",
  };

  const s = status || "";
  return (
    <span
      className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
        styles[s] || "bg-[#26211c] text-gray-500"
      }`}
    >
      {labels[s] || s}
    </span>
  );
}

export default function PelangganPage() {
  const router = useRouter();
  const [user] = useState<ClientUser | null>(() => getClientUser() ?? null);
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!user) {
      router.push("/login");
    }
  }, [user, router]);

  const { data: allData = [], isLoading, isFetching, error: queryError } = useQuery<PelangganGroup[]>({
    queryKey: ["cs-pelanggan", debouncedQuery],
    queryFn: async () => {
      const url = debouncedQuery.trim()
        ? `/api/cs/pelanggan?q=${encodeURIComponent(debouncedQuery.trim())}`
        : "/api/cs/pelanggan";
      const res = await fetcher<{ data: PelangganGroup[] }>(url);
      return res.data ?? [];
    },
    enabled: !!user,
  });

  function handleQueryChange(value: string) {
    setQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setDebouncedQuery(value), 400);
  }

  function toggleExpand(key: string) {
    setExpandedId((prev) => (prev === key ? null : key));
  }

  const totalPelanggan = allData.length;
  const totalOrders = allData.reduce((s, g) => s + g.total_orders, 0);
  const totalSpent = allData.reduce((s, g) => s + g.total_spent, 0);
  const repeatCount = allData.filter((g) => g.total_orders > 1).length;

  if (!user) {
    return (
      <div className="flex h-screen bg-[#26211c]">
        <Sidebar role="customer_service" />
        <div className="flex-1 flex flex-col overflow-hidden">
          <Header userEmail="" role="customer_service" />
          <main className="flex-1 overflow-y-auto p-6">
            <Loading variant="skeleton" text="Memuat..." />
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-[#26211c]">
      <Sidebar role="customer_service" />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header userEmail={user.email} role="customer_service" />
        <main className="flex-1 overflow-y-auto p-6 space-y-5">
          {queryError && (
            <Alert
              type="error"
              message={queryError instanceof Error ? queryError.message : "Terjadi kesalahan"}
              onClose={() => {}}
            />
          )}

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h1 className="text-xl font-semibold text-gray-800">
                Pelanggan
              </h1>
              <p className="text-sm text-gray-400 mt-0.5">
                Data pelanggan dan riwayat pesanan
              </p>
            </div>
            <input
              type="text"
              placeholder="Cari nama atau nomor WA..."
              value={query}
              onChange={(e) => handleQueryChange(e.target.value)}
              className="w-full sm:w-72 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-gray-400 focus:ring-0 placeholder:text-gray-300"
            />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl shadow-sm p-5 border-l-4 border-indigo-500">
              <p className="text-xs text-gray-500 uppercase tracking-wider font-medium">
                Total Pelanggan
              </p>
              <p className="text-2xl font-semibold text-gray-800 mt-1">
                {totalPelanggan}
              </p>
            </div>
            <div className="bg-white rounded-xl shadow-sm p-5 border-l-4 border-blue-500">
              <p className="text-xs text-gray-500 uppercase tracking-wider font-medium">
                Total Pesanan
              </p>
              <p className="text-2xl font-semibold text-gray-800 mt-1">
                {totalOrders}
              </p>
            </div>
            <div className="bg-white rounded-xl shadow-sm p-5 border-l-4 border-emerald-500">
              <p className="text-xs text-gray-500 uppercase tracking-wider font-medium">
                Total Belanja
              </p>
              <p className="text-2xl font-semibold text-gray-800 mt-1">
                {formatRupiah(totalSpent)}
              </p>
            </div>
            <div className="bg-white rounded-xl shadow-sm p-5 border-l-4 border-amber-500">
              <p className="text-xs text-gray-500 uppercase tracking-wider font-medium">
                Repeat Order
              </p>
              <p className="text-2xl font-semibold text-gray-800 mt-1">
                {repeatCount}
              </p>
              <p className="text-xs text-gray-400 mt-0.5">
                dari {totalPelanggan} pelanggan
              </p>
            </div>
          </div>

          {(isLoading || isFetching) && (
            <div className="flex justify-center py-12">
              <Loading variant="spinner" text="Mencari..." size="md" />
            </div>
          )}

          {!(isLoading || isFetching) && allData.length === 0 && (
            <div className="bg-white rounded-xl shadow-sm p-12 text-center">
              <p className="text-sm text-gray-400">
                {query.trim()
                  ? "Tidak ada pelanggan yang cocok"
                  : "Belum ada data pelanggan"}
              </p>
            </div>
          )}

          {!(isLoading || isFetching) && allData.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100">
                <span className="text-sm font-medium text-gray-700">
                  Semua Pelanggan
                </span>
                <span className="text-sm text-gray-400 ml-2">
                  ({totalPelanggan})
                </span>
              </div>

              {allData.map((group) => {
                const key = group.customer_wa || `no-wa-${group.customer_name}`;
                const open = expandedId === key;

                return (
                  <div key={key}>
                    <button
                      onClick={() => toggleExpand(key)}
                      className="w-full flex items-center justify-between px-6 py-4 text-left hover:bg-[#26211c] transition-colors border-t border-gray-50 first:border-t-0"
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className="w-9 h-9 rounded-full bg-indigo-50 flex items-center justify-center flex-shrink-0">
                          <span className="text-indigo-500 font-medium text-sm">
                            {group.customer_name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div className="min-w-0">
                          <div className="text-sm font-medium text-gray-800 truncate">
                            {group.customer_name}
                          </div>
                          <div className="text-xs text-gray-400">
                            {group.customer_wa || "-"}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-6 flex-shrink-0 ml-4">
                        <div className="text-right">
                          <div className="text-sm text-gray-600">
                            {group.total_orders} pesanan
                          </div>
                          <div className="text-xs text-gray-400">
                            {formatRupiah(group.total_spent)}
                          </div>
                        </div>
                        <div className="text-right hidden sm:block">
                          <div className="text-xs text-gray-400">Terakhir</div>
                          <div className="text-sm text-gray-500">
                            {formatDate(group.last_order_at)}
                          </div>
                        </div>
                        {group.total_orders > 1 && (
                          <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-600 border border-amber-200">
                            Repeat
                          </span>
                        )}
                        <ChevronDown
                          className={`w-4 h-4 text-gray-300 transition-transform ${
                            open ? "rotate-180" : ""
                          }`}
                        />
                      </div>
                    </button>

                    <div className="flex items-center gap-3 px-6 pb-1 -mt-1 sm:hidden">
                      <span className="text-xs text-gray-400">
                        {formatDate(group.last_order_at)}
                      </span>
                      {group.total_orders > 1 && (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-amber-50 text-amber-600">
                          Repeat
                        </span>
                      )}
                    </div>

                    {open && (
                      <div className="border-t border-gray-50 bg-[#26211c]/30">
                        <div className="px-6 py-3 flex flex-wrap gap-x-6 gap-y-1 text-xs text-gray-400">
                          {group.customer_email && (
                            <span>{group.customer_email}</span>
                          )}
                          {group.customer_instagram && (
                            <span>{group.customer_instagram}</span>
                          )}
                          {group.kabupaten_kota && (
                            <span>{group.kabupaten_kota}</span>
                          )}
                        </div>

                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="border-y border-gray-100">
                                <th className="text-left px-6 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">
                                  No. Order
                                </th>
                                <th className="text-left px-6 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">
                                  Tgl Order
                                </th>
                                <th className="text-left px-6 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider hidden sm:table-cell">
                                  Acara
                                </th>
                                <th className="text-left px-6 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider hidden sm:table-cell">
                                  Status
                                </th>
                                <th className="text-right px-6 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">
                                  Harga
                                </th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                              {group.orders.map((order) => (
                                <tr
                                  key={order.id}
                                  className="hover:bg-white transition-colors"
                                >
                                  <td className="px-6 py-3 text-gray-800 font-medium">
                                    {order.order_number}
                                    {order.transfer_ke_bank && (
                                      <span
                                        className={`ml-1.5 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium ${
                                          ["BCA", "Mandiri", "BNI", "BRI"].includes(order.transfer_ke_bank) || order.transfer_ke_bank === "Ke PT"
                                            ? "bg-blue-100 text-blue-700"
                                            : "bg-green-100 text-green-700"
                                        }`}
                                      >
                                        {["BCA", "Mandiri", "BNI", "BRI"].includes(order.transfer_ke_bank) || order.transfer_ke_bank === "Ke PT"
                                          ? "Ke PT"
                                          : "Non PT / Cash"}
                                      </span>
                                    )}
                                  </td>
                                  <td className="px-6 py-3 text-gray-500">
                                    {formatDate(order.tgl_order)}
                                  </td>
                                  <td className="px-6 py-3 text-gray-500 hidden sm:table-cell">
                                    {order.acara || "-"}
                                  </td>
                                  <td className="px-6 py-3 hidden sm:table-cell">
                                    <StatusBadge status={order.status} />
                                  </td>
                                  <td className="px-6 py-3 text-right text-gray-700">
                                    {order.harga
                                      ? formatRupiah(order.harga)
                                      : "-"}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
