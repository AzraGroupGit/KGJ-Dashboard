"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetcher } from "@/lib/api";
import Loading from "@/components/ui/Loading";
import OrderCard from "@/components/integrated-system/order-card";
import { Search } from "lucide-react";

interface OrderItem {
  id: string;
  kode_order: string;
  nama: string;
  tgl_order: string | null;
  tracking: {
    current_stage: string;
    stage_status: string;
  }[];
}

interface OrdersResponse {
  data: OrderItem[];
  count: number;
  page: number;
  limit: number;
}

export default function OrdersPage() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const { data, isLoading, error } = useQuery<OrdersResponse>({
    queryKey: ["integrated-system", "orders", search, page],
    queryFn: () =>
      fetcher<OrdersResponse>(
        `/api/integrated-system/orders?search=${encodeURIComponent(search)}&page=${page}&limit=20`,
      ),
    refetchInterval: 30_000,
  });

  const totalPages = data ? Math.ceil(data.count / data.limit) : 1;

  return (
    <div className="p-4 sm:p-6">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900">Daftar Order</h1>
        <p className="mt-1 text-sm text-gray-500">
          Semua order yang telah diimpor dari sistem live
        </p>
      </div>

      <div className="mb-4">
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Cari kode order atau nama..."
            className="w-full rounded-lg border border-gray-200 py-2 pl-10 pr-4 text-sm text-gray-800 placeholder:text-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
          />
        </div>
      </div>

      {isLoading ? (
        <Loading variant="skeleton" text="Memuat order..." />
      ) : error ? (
        <div className="flex items-center justify-center py-12">
          <p className="text-red-500">Gagal memuat data order</p>
        </div>
      ) : (
        <>
          <div className="mb-2 text-xs text-gray-500">
            {data?.count ?? 0} order ditemukan
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {(data?.data ?? []).map((order) => (
              <OrderCard
                key={order.id}
                id={order.id}
                kode_order={order.kode_order}
                nama={order.nama}
                tgl_order={order.tgl_order}
                current_stage={order.tracking?.[0]?.current_stage ?? "order_diterima"}
                stage_status={order.tracking?.[0]?.stage_status ?? "in_progress"}
              />
            ))}
          </div>

          {totalPages > 1 && (
            <div className="mt-6 flex items-center justify-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-600 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Sebelumnya
              </button>
              <span className="text-sm text-gray-500">
                {page} / {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-600 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Selanjutnya
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
