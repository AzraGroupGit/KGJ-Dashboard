"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetcher } from "@/lib/api";
import { STAGE_LABELS } from "@/services/integrated-system/tracking.service";
import { CheckCircle2, ChevronLeft, ChevronRight } from "lucide-react";
import { getClientUser } from "@/lib/auth/session";

interface OrderItem {
  id: string; kode_order: string; nama: string; tgl_order: string | null; tgl_selesai: string | null;
  tracking: { current_stage: string; stage_status: string }[];
}

export default function WorkerHistoryPage() {
  const user = getClientUser();
  const userId = user?.id ?? null;
  const [page, setPage] = useState(1);

  const { data, isFetching } = useQuery<{ data: OrderItem[]; count: number; page: number; limit: number }>({
    queryKey: ["integrated-system", "worker", "history", userId, page],
    queryFn: () => fetcher(`/api/integrated-system/worker/history?page=${page}&limit=20`),
    enabled: !!userId,
  });

  const orders = data?.data ?? [];
  const totalPages = Math.ceil((data?.count ?? 0) / 20);

  return (
    <div className="w-full max-w-[420px] mx-auto">
      <div className="rounded-2xl border border-stone-200/80 bg-white/90 backdrop-blur-sm shadow-sm overflow-hidden">
        {isFetching ? (
          <div className="flex flex-col items-center justify-center gap-3 py-14">
            <div className="h-8 w-8 rounded-full border-2 border-stone-100 border-t-amber-400 animate-spin" />
            <p className="text-[13px] text-stone-400">Memuat riwayat...</p>
          </div>
        ) : orders.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-14 px-6 text-center">
            <CheckCircle2 className="h-10 w-10 text-stone-200" strokeWidth={1.5} />
            <p className="text-[14px] font-medium text-stone-400">Belum ada riwayat</p>
            <p className="text-[12px] text-stone-300">Order yang selesai akan muncul di sini</p>
          </div>
        ) : (
          <ul className="divide-y divide-stone-100">
            {orders.map((order) => {
              const stage = order.tracking?.[0]?.current_stage ?? "selesai";
              return (
                <li key={order.id} className="px-4 py-3.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="font-mono text-[12px] font-semibold text-stone-400">
                          {order.kode_order}
                        </span>
                        <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-600">
                          {STAGE_LABELS[stage as keyof typeof STAGE_LABELS] ?? "Selesai"}
                        </span>
                      </div>
                      <p className="text-[14px] font-medium text-stone-600 truncate">{order.nama}</p>
                      {order.tgl_order && (
                        <p className="mt-0.5 text-[11px] text-stone-400">
                          {new Date(order.tgl_order).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}
                        </p>
                      )}
                    </div>
                    <CheckCircle2 className="h-4 w-4 text-emerald-300 flex-shrink-0 mt-0.5" strokeWidth={2} />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-center gap-2">
          <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="rounded-lg border border-stone-200 px-3 py-1.5 text-[13px] text-stone-500 hover:bg-stone-50 disabled:opacity-30">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="text-[13px] text-stone-400">{page} / {totalPages}</span>
          <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="rounded-lg border border-stone-200 px-3 py-1.5 text-[13px] text-stone-500 hover:bg-stone-50 disabled:opacity-30">
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}
