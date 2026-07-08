"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetcher } from "@/lib/api";
import { STAGE_LABELS } from "@/services/integrated-system/tracking.service";
import { Download } from "lucide-react";

interface OrderItem {
  id: string; kode_order: string; nama: string; tgl_order: string | null; tgl_selesai: string | null;
  tracking: { current_stage: string; stage_status: string }[];
}

export default function AdminOprPrdLaporanPage() {
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const params = new URLSearchParams();
  if (dateFrom) params.set("from", dateFrom);
  if (dateTo) params.set("to", dateTo);

  const { data, isLoading } = useQuery<{ data: OrderItem[]; count: number }>({
    queryKey: ["integrated-system", "admin", "oprprd", "laporan", dateFrom, dateTo],
    queryFn: () => fetcher(`/api/integrated-system/admin/oprprd/laporan?${params}`),
  });

  const orders = data?.data ?? [];
  const count = data?.count ?? 0;

  const handleExportCSV = () => {
    if (orders.length === 0) return;
    const headers = ["Kode Order", "Pelanggan", "Tanggal Order", "Deadline", "Stage", "Status"];
    const rows = orders.map((o) => [
      o.kode_order,
      o.nama,
      o.tgl_order ?? "-",
      o.tgl_selesai ?? "-",
      STAGE_LABELS[o.tracking?.[0]?.current_stage as keyof typeof STAGE_LABELS] ?? "-",
      (o.tracking?.[0]?.stage_status ?? "-").replace(/_/g, " "),
    ]);
    const csv = [headers.join(","), ...rows.map((r) => r.map((c) => `"${c}"`).join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `laporan-integrated-${new Date().toISOString().split("T")[0]}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  if (isLoading) {
    return <div className="p-4 sm:p-6 animate-pulse"><div className="h-7 w-48 rounded bg-gray-200 mb-6" /><div className="space-y-3">{[...Array(5)].map((_, i) => <div key={i} className="h-12 rounded-xl bg-gray-100" />)}</div></div>;
  }

  return (
    <div className="p-4 sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Laporan</h1>
          <p className="mt-1 text-sm text-gray-500">Laporan order dari sistem live</p>
        </div>
        <button onClick={handleExportCSV} disabled={orders.length === 0} className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-2 text-xs font-medium text-white hover:bg-indigo-700 disabled:opacity-50 transition-colors">
          <Download className="h-3.5 w-3.5" />Export CSV
        </button>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <label className="text-xs text-gray-500">Dari</label>
          <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100" />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs text-gray-500">Sampai</label>
          <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100" />
        </div>
      </div>

      <p className="mb-3 text-xs text-gray-500">{count} order ditemukan</p>

      <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Kode Order</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Pelanggan</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Tgl Order</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Deadline</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Stage</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {orders.map((o) => (
                <tr key={o.id} className="hover:bg-gray-50/50">
                  <td className="px-4 py-3 text-xs font-mono text-indigo-600">{o.kode_order}</td>
                  <td className="px-4 py-3 text-sm text-gray-800">{o.nama}</td>
                  <td className="px-4 py-3 text-xs text-gray-500">{o.tgl_order ?? "-"}</td>
                  <td className="px-4 py-3 text-xs text-gray-500">{o.tgl_selesai ? new Date(o.tgl_selesai).toLocaleDateString("id-ID") : "-"}</td>
                  <td className="px-4 py-3"><span className="rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-medium text-indigo-700">{STAGE_LABELS[o.tracking?.[0]?.current_stage as keyof typeof STAGE_LABELS] ?? "-"}</span></td>
                  <td className="px-4 py-3"><span className={`rounded-full px-2 py-0.5 text-[10px] font-medium capitalize ${o.tracking?.[0]?.stage_status === "completed" ? "bg-emerald-50 text-emerald-700" : o.tracking?.[0]?.stage_status === "rework" ? "bg-amber-50 text-amber-700" : "bg-blue-50 text-blue-700"}`}>{(o.tracking?.[0]?.stage_status ?? "-").replace(/_/g, " ")}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {orders.length === 0 && <div className="py-12 text-center text-sm text-gray-400">Tidak ada data untuk periode ini</div>}
      </div>
    </div>
  );
}
