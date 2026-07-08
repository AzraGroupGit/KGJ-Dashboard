"use client";

import { use } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetcher } from "@/lib/api";
import Loading from "@/components/ui/Loading";
import StageProgressBar from "@/components/integrated-system/stage-progress";
import Timeline from "@/components/integrated-system/timeline";
import { STAGE_LABELS } from "@/services/integrated-system/tracking.service";
import { Calendar, Mail, Phone, MapPin, AlertTriangle } from "lucide-react";
import Link from "next/link";

interface TrackingData {
  data: {
    order: {
      id: string;
      kode_order: string;
      nama: string;
      email: string | null;
      no_hp: string | null;
      alamat: string | null;
      tgl_order: string | null;
      tgl_selesai: string | null;
      id_status: number | null;
      catatan: string | null;
      created_at: string;
    };
    tracking: {
      current_stage: string;
      stage_status: string;
    } | null;
    history: Array<{
      id: string;
      stage: string;
      status: string;
      note: string | null;
      changed_by: string | null;
      created_at: string;
      changed_by_user?: {
        id: string;
        full_name: string;
      } | null;
    }>;
  };
}

export default function OrderTrackingDetailPage({
  params,
}: {
  params: Promise<{ orderId: string }>;
}) {
  const { orderId } = use(params);

  const { data, isLoading, error } = useQuery<TrackingData>({
    queryKey: ["integrated-system", "tracking", orderId],
    queryFn: () =>
      fetcher<TrackingData>(`/api/integrated-system/tracking/${orderId}`),
    refetchInterval: 30_000,
  });

  if (isLoading) {
    return <Loading variant="skeleton" text="Memuat detail order..." />;
  }

  if (error || !data?.data) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <AlertTriangle className="mx-auto h-8 w-8 text-amber-500" />
          <p className="mt-2 text-sm text-gray-600">Order tidak ditemukan</p>
          <Link
            href="/integrated-system/orders"
            className="mt-3 inline-block text-sm text-indigo-600 hover:underline"
          >
            ← Kembali ke daftar order
          </Link>
        </div>
      </div>
    );
  }

  const { order, tracking, history } = data.data;
  const currentStage = tracking?.current_stage ?? "order_diterima";
  const stageLabel =
    STAGE_LABELS[currentStage as keyof typeof STAGE_LABELS] ?? currentStage;

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto">
      <Link
        href="/integrated-system/orders"
        className="mb-4 inline-flex items-center gap-1 text-sm text-gray-500 hover:text-indigo-600"
      >
        ← Kembali ke daftar order
      </Link>

      <div className="mb-6 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <span className="rounded bg-indigo-50 px-3 py-1 text-xs font-mono font-semibold text-indigo-700">
            {order.kode_order}
          </span>
          <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-700">
            {stageLabel}
          </span>
          {tracking && (
            <span
              className={`rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${
                tracking.stage_status === "completed"
                  ? "bg-emerald-50 text-emerald-700"
                  : tracking.stage_status === "rework"
                    ? "bg-amber-50 text-amber-700"
                    : "bg-blue-50 text-blue-700"
              }`}
            >
              {tracking.stage_status.replace(/_/g, " ")}
            </span>
          )}
        </div>

        <h1 className="text-lg font-semibold text-gray-900 mb-3">
          {order.nama}
        </h1>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
          {order.email && (
            <div className="flex items-center gap-2 text-gray-600">
              <Mail className="h-4 w-4 text-gray-400" />
              {order.email}
            </div>
          )}
          {order.no_hp && (
            <div className="flex items-center gap-2 text-gray-600">
              <Phone className="h-4 w-4 text-gray-400" />
              {order.no_hp}
            </div>
          )}
          {order.alamat && (
            <div className="flex items-center gap-2 text-gray-600 sm:col-span-2">
              <MapPin className="h-4 w-4 text-gray-400 flex-shrink-0" />
              <span className="line-clamp-2">{order.alamat}</span>
            </div>
          )}
        </div>

        <div className="mt-4 flex flex-wrap gap-4 text-xs text-gray-400">
          {order.tgl_order && (
            <div className="flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5" />
              Order:{" "}
              {new Date(order.tgl_order).toLocaleDateString("id-ID", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </div>
          )}
          {order.tgl_selesai && (
            <div className="flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5" />
              Selesai:{" "}
              {new Date(order.tgl_selesai).toLocaleDateString("id-ID", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </div>
          )}
        </div>

        {order.catatan && (
          <div className="mt-4 rounded-lg bg-gray-50 px-4 py-3 text-sm text-gray-600">
            {order.catatan}
          </div>
        )}
      </div>

      <div className="mb-6 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-sm font-semibold text-gray-700">
          Progress Stage
        </h2>
        <StageProgressBar
          currentStage={currentStage}
          stageStatus={tracking?.stage_status ?? "in_progress"}
        />
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-sm font-semibold text-gray-700">
          Riwayat Stage
        </h2>
        <Timeline history={history} />
      </div>
    </div>
  );
}
