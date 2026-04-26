// app/api/reports-oprprd/route.ts

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const PRODUCTION_ROLES = [
  "jewelry_expert_lebur_bahan",
  "jewelry_expert_pembentukan_awal",
  "jewelry_expert_finishing",
  "micro_setting",
];

const STAGE_LABELS: Record<string, string> = {
  racik_bahan: "Racik Bahan",
  lebur_bahan: "Lebur Bahan",
  pembentukan_cincin: "Pembentukan Cincin",
  pemasangan_permata: "Pemasangan Permata",
  pemolesan: "Pemolesan",
  laser: "Laser",
  finishing: "Finishing",
  qc_awal: "QC Awal",
  qc_1: "QC 1",
  qc_2: "QC 2",
  qc_3: "QC 3",
  pelunasan: "Pelunasan",
  kelengkapan: "Kelengkapan",
  packing: "Packing",
  pengiriman: "Pengiriman",
};

function fmtDate(iso: string | null): string {
  if (!iso) return "-";
  return new Date(iso).toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function fmtDuration(startedAt: string | null, finishedAt: string | null): string {
  if (!startedAt || !finishedAt) return "-";
  const mins =
    (new Date(finishedAt).getTime() - new Date(startedAt).getTime()) / 60_000;
  if (mins < 60) return `${Math.round(mins)} mnt`;
  const hrs = Math.floor(mins / 60);
  const rem = Math.round(mins % 60);
  return rem > 0 ? `${hrs}j ${rem}m` : `${hrs} jam`;
}

function fmtNum(n: number | null | undefined): string {
  if (n == null || isNaN(n)) return "-";
  return n.toLocaleString("id-ID");
}

function fmtPct(n: number | null | undefined): string {
  if (n == null || isNaN(n)) return "-";
  return `${n.toFixed(2).replace(".", ",")}%`;
}

function toCSV(headers: string[], rows: (string | number | null)[][]): string {
  const esc = (v: string | number | null) => {
    if (v == null) return "";
    const s = String(v);
    return s.includes(",") || s.includes('"') || s.includes("\n")
      ? `"${s.replace(/"/g, '""')}"`
      : s;
  };
  return [headers, ...rows].map((row) => row.map(esc).join(",")).join("\r\n");
}

export async function GET(request: Request) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: profile } = await supabase
      .from("users")
      .select("id, role:roles!users_role_id_fkey(name)")
      .eq("id", user.id)
      .single();

    if ((profile?.role as any)?.name !== "superadmin")
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type") ?? "complete";
    const period = searchParams.get("period");

    let fromDate: Date;
    let toDate: Date;

    if (period && /^\d{4}-\d{2}$/.test(period)) {
      const [yr, mo] = period.split("-").map(Number);
      fromDate = new Date(yr, mo - 1, 1);
      toDate = new Date(yr, mo, 0, 23, 59, 59, 999);
    } else {
      toDate = new Date();
      fromDate = new Date(toDate);
      fromDate.setDate(fromDate.getDate() - 30);
    }

    const fromISO = fromDate.toISOString();
    const toISO = toDate.toISOString();
    const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, "-");
    const BOM = "﻿";

    // ── PRODUCTION REPORT ─────────────────────────────────────────────────────
    if (type === "production") {
      const { data, error } = await supabase
        .from("stage_results")
        .select(
          `
          stage,
          started_at,
          finished_at,
          attempt_number,
          data,
          orders ( order_number, product_name ),
          users ( full_name, role:roles!users_role_id_fkey(name) )
        `,
        )
        .in("stage", [
          "racik_bahan",
          "lebur_bahan",
          "pembentukan_cincin",
          "pemasangan_permata",
          "pemolesan",
          "laser",
          "finishing",
        ])
        .gte("started_at", fromISO)
        .lte("started_at", toISO)
        .not("finished_at", "is", null)
        .order("started_at", { ascending: false });

      if (error) {
        console.error("[reports-oprprd] production:", error.message);
        return NextResponse.json(
          { error: "Gagal mengambil data produksi" },
          { status: 500 },
        );
      }

      const rows = (data ?? []).map((r: any, i: number) => {
        const susut = (() => {
          if (r.stage === "lebur_bahan")
            return r.data?.shrinkage_percent != null
              ? fmtPct(parseFloat(r.data.shrinkage_percent))
              : "-";
          if (r.stage === "pembentukan_cincin") {
            const lost = parseFloat(r.data?.weight_lost);
            const inp = parseFloat(r.data?.weight_input);
            return !isNaN(lost) && !isNaN(inp) && inp > 0
              ? fmtPct((lost / inp) * 100)
              : "-";
          }
          if (r.stage === "pemolesan") {
            const lost = parseFloat(r.data?.weight_lost);
            const bef = parseFloat(r.data?.weight_before_polish);
            return !isNaN(lost) && !isNaN(bef) && bef > 0
              ? fmtPct((lost / bef) * 100)
              : "-";
          }
          return "-";
        })();

        return [
          i + 1,
          fmtDate(r.started_at),
          r.orders?.order_number ?? "-",
          r.orders?.product_name ?? "-",
          STAGE_LABELS[r.stage] ?? r.stage,
          r.users?.full_name ?? "-",
          (r.users?.role as any)?.name ?? "-",
          fmtDuration(r.started_at, r.finished_at),
          r.attempt_number ?? 1,
          susut,
        ];
      });

      const csv = toCSV(
        [
          "No",
          "Tanggal",
          "No Order",
          "Produk",
          "Tahap",
          "Staff",
          "Role",
          "Durasi",
          "Attempt",
          "Susut",
        ],
        rows,
      );

      return new Response(BOM + csv, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="Laporan_Produksi${period ? "_" + period : ""}_${timestamp}.csv"`,
        },
      });
    }

    // ── QUALITY REPORT ────────────────────────────────────────────────────────
    if (type === "quality") {
      const { data, error } = await supabase
        .from("stage_results")
        .select(
          `
          stage,
          started_at,
          finished_at,
          notes,
          data,
          orders ( order_number, product_name ),
          users ( full_name )
        `,
        )
        .in("stage", ["qc_awal", "qc_1", "qc_2", "qc_3"])
        .gte("started_at", fromISO)
        .lte("started_at", toISO)
        .not("finished_at", "is", null)
        .order("finished_at", { ascending: false });

      if (error) {
        console.error("[reports-oprprd] quality:", error.message);
        return NextResponse.json(
          { error: "Gagal mengambil data QC" },
          { status: 500 },
        );
      }

      const rows = (data ?? []).map((r: any, i: number) => [
        i + 1,
        fmtDate(r.finished_at),
        r.orders?.order_number ?? "-",
        r.orders?.product_name ?? "-",
        STAGE_LABELS[r.stage] ?? r.stage,
        r.users?.full_name ?? "-",
        r.data?.overall_result ?? r.data?.result ?? "-",
        r.notes ?? "-",
        fmtDuration(r.started_at, r.finished_at),
      ]);

      // Summary per QC type
      const stageSummary: Record<
        string,
        { total: number; passed: number }
      > = {};
      (data ?? []).forEach((r: any) => {
        const acc = stageSummary[r.stage] ?? { total: 0, passed: 0 };
        acc.total += 1;
        const res = r.data?.overall_result ?? r.data?.result;
        if (res === "passed" || res === "lulus") acc.passed += 1;
        stageSummary[r.stage] = acc;
      });

      const summaryRows: (string | number | null)[][] = [
        [],
        ["=== RINGKASAN QC ==="],
        ["Tahap", "Total", "Lulus", "Gagal", "Pass Rate"],
      ];
      Object.entries(stageSummary).forEach(([stage, acc]) => {
        const failed = acc.total - acc.passed;
        summaryRows.push([
          STAGE_LABELS[stage] ?? stage,
          fmtNum(acc.total),
          fmtNum(acc.passed),
          fmtNum(failed),
          acc.total > 0 ? fmtPct((acc.passed / acc.total) * 100) : "-",
        ]);
      });

      const detail = toCSV(
        ["No", "Tanggal", "No Order", "Produk", "Tahap QC", "Inspektor", "Hasil", "Catatan", "Durasi"],
        rows,
      );

      const summarySection = summaryRows
        .map((r) => r.map((v) => (v == null ? "" : String(v))).join(","))
        .join("\r\n");

      return new Response(BOM + detail + "\r\n" + summarySection, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="Laporan_QC${period ? "_" + period : ""}_${timestamp}.csv"`,
        },
      });
    }

    // ── STAFF REPORT ──────────────────────────────────────────────────────────
    if (type === "staff") {
      const [staffRes, stageRes, scanRes] = await Promise.all([
        supabase
          .from("users")
          .select(
            "id, full_name, status, role:roles!users_role_id_fkey(name, role_group)",
          )
          .eq("status", "active")
          .is("deleted_at", null),

        supabase
          .from("stage_results")
          .select("user_id, stage, data, started_at, finished_at")
          .gte("started_at", fromISO)
          .lte("started_at", toISO)
          .not("finished_at", "is", null),

        supabase
          .from("scan_events")
          .select("user_id, order_id")
          .gte("scanned_at", fromISO)
          .lte("scanned_at", toISO),
      ]);

      const allStaff = staffRes.data ?? [];
      const allStages = stageRes.data ?? [];
      const allScans = scanRes.data ?? [];

      const productionStaff = (allStaff as any[]).filter((u) =>
        PRODUCTION_ROLES.includes((u.role as any)?.name),
      );

      const scanMap = new Map<string, { scans: number; orders: Set<string> }>();
      (allScans as any[]).forEach((s) => {
        const e = scanMap.get(s.user_id) ?? { scans: 0, orders: new Set<string>() };
        e.scans += 1;
        if (s.order_id) e.orders.add(s.order_id);
        scanMap.set(s.user_id, e);
      });

      const stagesMap = new Map<string, number>();
      const susutMap = new Map<string, { sum: number; count: number }>();
      (allStages as any[]).forEach((sr: any) => {
        stagesMap.set(sr.user_id, (stagesMap.get(sr.user_id) ?? 0) + 1);
        if (["lebur_bahan", "pembentukan_cincin", "pemolesan"].includes(sr.stage)) {
          let susut: number | null = null;
          if (sr.stage === "lebur_bahan") {
            const v = parseFloat(sr.data?.shrinkage_percent);
            if (!isNaN(v)) susut = v;
          } else if (sr.stage === "pembentukan_cincin") {
            const l = parseFloat(sr.data?.weight_lost);
            const inp = parseFloat(sr.data?.weight_input);
            if (!isNaN(l) && !isNaN(inp) && inp > 0) susut = (l / inp) * 100;
          } else if (sr.stage === "pemolesan") {
            const l = parseFloat(sr.data?.weight_lost);
            const b = parseFloat(sr.data?.weight_before_polish);
            if (!isNaN(l) && !isNaN(b) && b > 0) susut = (l / b) * 100;
          }
          if (susut != null) {
            const acc = susutMap.get(sr.user_id) ?? { sum: 0, count: 0 };
            acc.sum += susut;
            acc.count += 1;
            susutMap.set(sr.user_id, acc);
          }
        }
      });

      const rows = productionStaff.map((u: any, i: number) => {
        const scan = scanMap.get(u.id);
        const susutAcc = susutMap.get(u.id);
        const avgSusut =
          susutAcc && susutAcc.count > 0 ? susutAcc.sum / susutAcc.count : null;
        return [
          i + 1,
          u.full_name,
          (u.role as any)?.name ?? "-",
          fmtNum(scan?.scans ?? 0),
          fmtNum(scan?.orders.size ?? 0),
          fmtNum(stagesMap.get(u.id) ?? 0),
          avgSusut != null ? fmtPct(avgSusut) : "-",
        ];
      });

      const csv = toCSV(
        ["No", "Nama Staff", "Role", "Total Scan", "Total Order", "Tahap Selesai", "Rata Susut"],
        rows,
      );

      return new Response(BOM + csv, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="Laporan_Staff_Produksi${period ? "_" + period : ""}_${timestamp}.csv"`,
        },
      });
    }

    // ── COMPLETE REPORT ───────────────────────────────────────────────────────
    const [prodRes, qcRes, staffAll, scanAll, stageAll] = await Promise.all([
      supabase
        .from("stage_results")
        .select(
          "stage, started_at, finished_at, data, orders(order_number), users(full_name, role:roles!users_role_id_fkey(name))",
        )
        .in("stage", ["racik_bahan", "lebur_bahan", "pembentukan_cincin", "pemasangan_permata", "pemolesan", "laser", "finishing"])
        .gte("started_at", fromISO)
        .lte("started_at", toISO)
        .not("finished_at", "is", null)
        .order("started_at", { ascending: false }),

      supabase
        .from("stage_results")
        .select(
          "stage, finished_at, data, notes, orders(order_number), users(full_name)",
        )
        .in("stage", ["qc_awal", "qc_1", "qc_2", "qc_3"])
        .gte("started_at", fromISO)
        .lte("started_at", toISO)
        .not("finished_at", "is", null)
        .order("finished_at", { ascending: false }),

      supabase
        .from("users")
        .select("id, full_name, role:roles!users_role_id_fkey(name)")
        .eq("status", "active")
        .is("deleted_at", null),

      supabase
        .from("scan_events")
        .select("user_id, order_id")
        .gte("scanned_at", fromISO)
        .lte("scanned_at", toISO),

      supabase
        .from("stage_results")
        .select("user_id, stage, data")
        .gte("started_at", fromISO)
        .lte("started_at", toISO)
        .not("finished_at", "is", null),
    ]);

    const exportDate = new Date().toLocaleDateString("id-ID", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    const prodRows = (prodRes.data ?? []).map((r: any, i: number) => [
      i + 1,
      fmtDate(r.started_at),
      r.orders?.order_number ?? "-",
      STAGE_LABELS[r.stage] ?? r.stage,
      r.users?.full_name ?? "-",
      (r.users?.role as any)?.name ?? "-",
      fmtDuration(r.started_at, r.finished_at),
    ]);

    const qcRows = (qcRes.data ?? []).map((r: any, i: number) => [
      i + 1,
      fmtDate(r.finished_at),
      r.orders?.order_number ?? "-",
      STAGE_LABELS[r.stage] ?? r.stage,
      r.users?.full_name ?? "-",
      r.data?.overall_result ?? r.data?.result ?? "-",
      r.notes ?? "-",
    ]);

    // Staff summary
    const productionStaff = (staffAll.data ?? [] as any[]).filter((u: any) =>
      PRODUCTION_ROLES.includes((u.role as any)?.name),
    );
    const scanMap2 = new Map<string, { scans: number; orders: Set<string> }>();
    (scanAll.data ?? []).forEach((s: any) => {
      const e = scanMap2.get(s.user_id) ?? { scans: 0, orders: new Set<string>() };
      e.scans += 1;
      if (s.order_id) e.orders.add(s.order_id);
      scanMap2.set(s.user_id, e);
    });
    const stageMap2 = new Map<string, number>();
    (stageAll.data ?? []).forEach((s: any) => {
      stageMap2.set(s.user_id, (stageMap2.get(s.user_id) ?? 0) + 1);
    });

    const staffRows = productionStaff.map((u: any, i: number) => {
      const sc = scanMap2.get(u.id);
      return [
        i + 1,
        u.full_name,
        (u.role as any)?.name ?? "-",
        fmtNum(sc?.scans ?? 0),
        fmtNum(sc?.orders.size ?? 0),
        fmtNum(stageMap2.get(u.id) ?? 0),
      ];
    });

    const prodCSV = toCSV(
      ["No", "Tanggal", "No Order", "Tahap", "Staff", "Role", "Durasi"],
      prodRows,
    );
    const qcCSV = toCSV(
      ["No", "Tanggal", "No Order", "Tahap QC", "Inspektor", "Hasil", "Catatan"],
      qcRows,
    );
    const staffCSV = toCSV(
      ["No", "Nama Staff", "Role", "Total Scan", "Total Order", "Tahap Selesai"],
      staffRows,
    );

    const content =
      `LAPORAN LENGKAP OPR-PRD - DIEKSPOR: ${exportDate}\r\n` +
      `================================================================\r\n\r\n` +
      `=== DATA PRODUKSI ===\r\n` +
      prodCSV +
      `\r\n\r\n=== DATA QC ===\r\n` +
      qcCSV +
      `\r\n\r\n=== PERFORMA STAFF PRODUKSI ===\r\n` +
      staffCSV;

    return new Response(BOM + content, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="Laporan_Lengkap_OPRPRD${period ? "_" + period : ""}_${timestamp}.csv"`,
      },
    });
  } catch (error) {
    console.error("[GET /api/reports-oprprd] unexpected:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan server" },
      { status: 500 },
    );
  }
}
