// app/api/reports-oprprd/route.ts

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const PRODUCTION_ROLES = [
  "jewelry_expert_lebur_bahan",
  "jewelry_expert_pembentukan_awal",
  "jewelry_expert_finishing",
  "micro_setting",
  "laser",
];

const STAGE_LABELS: Record<string, string> = {
  racik_bahan: "Racik Bahan",
  lebur_bahan: "Lebur Bahan",
  pembentukan_cincin: "Pembentukan Cincin",
  pemasangan_permata: "Pemasangan Permata",
  pemolesan: "Pemolesan",
  laser: "Laser",
  finishing: "Finishing",
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

function fmtDuration(
  startedAt: string | null,
  finishedAt: string | null,
): string {
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

function escapeCSV(v: string | number | null): string {
  if (v == null) return "";
  const s = String(v);
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function toCSV(headers: string[], rows: (string | number | null)[][]): string {
  const headerLine = headers.map(escapeCSV).join(",");
  const dataLines = rows.map((row) => row.map(escapeCSV).join(","));
  return [headerLine, ...dataLines].join("\r\n");
}

// ─── Main handler ─────────────────────────────────────────────────────────────

export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const admin = createAdminClient();

    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from("users")
      .select("id, role:roles!users_role_id_fkey(name)")
      .eq("id", authData.user.id)
      .single();

    if ((profile?.role as any)?.name !== "superadmin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type") ?? "complete";
    const period = searchParams.get("period");

    let fromDate: Date;
    let toDate: Date;

    if (period && /^\d{4}-\d{2}$/.test(period)) {
      const parts = period.split("-").map(Number);
      fromDate = new Date(parts[0], parts[1] - 1, 1);
      toDate = new Date(parts[0], parts[1], 0, 23, 59, 59, 999);
    } else {
      toDate = new Date();
      fromDate = new Date(toDate);
      fromDate.setDate(fromDate.getDate() - 30);
    }

    const fromISO = fromDate.toISOString();
    const toISO = toDate.toISOString();
    const now = new Date();
    const timestamp = now.toISOString().slice(0, 19).replace(/:/g, "-");
    const BOM = "\uFEFF";

    // ── PRODUCTION REPORT ─────────────────────────────────────────────────
    if (type === "production") {
      const { data, error } = await admin
        .from("stage_results")
        .select(
          "stage, started_at, finished_at, attempt_number, data, orders!stage_results_order_id_fkey(order_number, product_name), users!stage_results_user_id_fkey(full_name, role:roles!users_role_id_fkey(name))",
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
        return NextResponse.json(
          { error: "Gagal mengambil data produksi" },
          { status: 500 },
        );
      }

      const rows = (data ?? []).map((r: any, i: number) => {
        let susut = "-";
        if (r.stage === "lebur_bahan") {
          const sp = parseFloat(r.data?.shrinkage_percent);
          if (!isNaN(sp)) susut = fmtPct(sp);
        } else if (r.stage === "pembentukan_cincin") {
          const lost = parseFloat(r.data?.weight_lost);
          const inp = parseFloat(r.data?.weight_input);
          if (!isNaN(lost) && !isNaN(inp) && inp > 0)
            susut = fmtPct((lost / inp) * 100);
        } else if (r.stage === "pemolesan") {
          const lost = parseFloat(r.data?.weight_lost);
          const bef = parseFloat(r.data?.weight_before_polish);
          if (!isNaN(lost) && !isNaN(bef) && bef > 0)
            susut = fmtPct((lost / bef) * 100);
        }

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
          "Content-Disposition": `attachment; filename="Laporan_Produksi_${timestamp}.csv"`,
        },
      });
    }

    // ── QUALITY REPORT ────────────────────────────────────────────────────
    if (type === "quality") {
      const { data, error } = await admin
        .from("stage_results")
        .select(
          "stage, started_at, finished_at, notes, data, orders!stage_results_order_id_fkey(order_number, product_name), users!stage_results_user_id_fkey(full_name)",
        )
        .in("stage", ["qc_1", "qc_2", "qc_3"])
        .gte("started_at", fromISO)
        .lte("started_at", toISO)
        .not("finished_at", "is", null)
        .order("finished_at", { ascending: false });

      if (error) {
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

      const stageSummary: Record<string, { total: number; passed: number }> =
        {};
      (data ?? []).forEach((r: any) => {
        const acc = stageSummary[r.stage] ?? { total: 0, passed: 0 };
        acc.total += 1;
        const res = r.data?.overall_result ?? r.data?.result;
        if (res === "passed" || res === "lulus") acc.passed += 1;
        stageSummary[r.stage] = acc;
      });

      const summaryLines: string[] = [
        "",
        "=== RINGKASAN QC ===",
        "Tahap,Total,Lulus,Gagal,Pass Rate",
      ];
      Object.entries(stageSummary).forEach(([stage, acc]) => {
        const failed = acc.total - acc.passed;
        const rate =
          acc.total > 0 ? fmtPct((acc.passed / acc.total) * 100) : "-";
        summaryLines.push(
          [
            STAGE_LABELS[stage] ?? stage,
            fmtNum(acc.total),
            fmtNum(acc.passed),
            fmtNum(failed),
            rate,
          ]
            .map(escapeCSV)
            .join(","),
        );
      });

      const detail = toCSV(
        [
          "No",
          "Tanggal",
          "No Order",
          "Produk",
          "Tahap QC",
          "Inspektor",
          "Hasil",
          "Catatan",
          "Durasi",
        ],
        rows,
      );

      return new Response(BOM + detail + "\r\n" + summaryLines.join("\r\n"), {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="Laporan_QC_${timestamp}.csv"`,
        },
      });
    }

    // ── STAFF REPORT ──────────────────────────────────────────────────────
    if (type === "staff") {
      const [staffRes, stageRes, scanRes] = await Promise.all([
        admin
          .from("users")
          .select("id, full_name, role:roles!users_role_id_fkey(name)")
          .eq("status", "active")
          .is("deleted_at", null),
        admin
          .from("stage_results")
          .select("user_id, stage, data")
          .gte("started_at", fromISO)
          .lte("started_at", toISO)
          .not("finished_at", "is", null),
        admin
          .from("scan_events")
          .select("user_id, order_id")
          .gte("scanned_at", fromISO)
          .lte("scanned_at", toISO),
      ]);

      const allStaff: any[] = staffRes.data ?? [];
      const allStages: any[] = stageRes.data ?? [];
      const allScans: any[] = scanRes.data ?? [];

      const productionStaff = allStaff.filter((u: any) =>
        PRODUCTION_ROLES.includes((u.role as any)?.name),
      );

      const scanMap = new Map<
        string,
        { scans: number; orderSet: Set<string> }
      >();
      allScans.forEach((s: any) => {
        const e = scanMap.get(s.user_id) ?? {
          scans: 0,
          orderSet: new Set<string>(),
        };
        e.scans += 1;
        if (s.order_id) e.orderSet.add(s.order_id);
        scanMap.set(s.user_id, e);
      });

      const stagesMap = new Map<string, number>();
      const susutMap = new Map<string, { sum: number; count: number }>();

      allStages.forEach((sr: any) => {
        stagesMap.set(sr.user_id, (stagesMap.get(sr.user_id) ?? 0) + 1);
        if (
          ["lebur_bahan", "pembentukan_cincin", "pemolesan"].includes(sr.stage)
        ) {
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
          fmtNum(scan?.orderSet.size ?? 0),
          fmtNum(stagesMap.get(u.id) ?? 0),
          avgSusut != null ? fmtPct(avgSusut) : "-",
        ];
      });

      const csv = toCSV(
        [
          "No",
          "Nama Staff",
          "Role",
          "Total Scan",
          "Total Order",
          "Tahap Selesai",
          "Rata Susut",
        ],
        rows,
      );

      return new Response(BOM + csv, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="Laporan_Staff_${timestamp}.csv"`,
        },
      });
    }

    // ── COMPLETE REPORT ───────────────────────────────────────────────────
    const [prodRes, qcRes, staffAll, scanAll, stageAll] = await Promise.all([
      admin
        .from("stage_results")
        .select(
          "stage, started_at, finished_at, data, orders!stage_results_order_id_fkey(order_number), users!stage_results_user_id_fkey(full_name, role:roles!users_role_id_fkey(name))",
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
        .order("started_at", { ascending: false }),

      admin
        .from("stage_results")
        .select(
          "stage, finished_at, data, notes, orders!stage_results_order_id_fkey(order_number), users!stage_results_user_id_fkey(full_name)",
        )
        .in("stage", ["qc_1", "qc_2", "qc_3"])
        .gte("started_at", fromISO)
        .lte("started_at", toISO)
        .not("finished_at", "is", null)
        .order("finished_at", { ascending: false }),

      admin
        .from("users")
        .select("id, full_name, role:roles!users_role_id_fkey(name)")
        .eq("status", "active")
        .is("deleted_at", null),

      admin
        .from("scan_events")
        .select("user_id, order_id")
        .gte("scanned_at", fromISO)
        .lte("scanned_at", toISO),

      admin
        .from("stage_results")
        .select("user_id, stage, data")
        .gte("started_at", fromISO)
        .lte("started_at", toISO)
        .not("finished_at", "is", null),
    ]);

    const exportDate = now.toLocaleDateString("id-ID", {
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

    const prodStaff: any[] = (staffAll.data ?? []).filter((u: any) =>
      PRODUCTION_ROLES.includes((u.role as any)?.name),
    );

    const scanMap2 = new Map<
      string,
      { scans: number; orderSet: Set<string> }
    >();
    (scanAll.data ?? []).forEach((s: any) => {
      const e = scanMap2.get(s.user_id) ?? {
        scans: 0,
        orderSet: new Set<string>(),
      };
      e.scans += 1;
      if (s.order_id) e.orderSet.add(s.order_id);
      scanMap2.set(s.user_id, e);
    });

    const stageMap2 = new Map<string, number>();
    (stageAll.data ?? []).forEach((s: any) => {
      stageMap2.set(s.user_id, (stageMap2.get(s.user_id) ?? 0) + 1);
    });

    const staffRows = prodStaff.map((u: any, i: number) => {
      const sc = scanMap2.get(u.id);
      return [
        i + 1,
        u.full_name,
        (u.role as any)?.name ?? "-",
        fmtNum(sc?.scans ?? 0),
        fmtNum(sc?.orderSet.size ?? 0),
        fmtNum(stageMap2.get(u.id) ?? 0),
      ];
    });

    const content = [
      `LAPORAN LENGKAP OPR-PRD - DIEKSPOR: ${exportDate}`,
      `================================================================`,
      ``,
      `=== DATA PRODUKSI ===`,
      toCSV(
        ["No", "Tanggal", "No Order", "Tahap", "Staff", "Role", "Durasi"],
        prodRows,
      ),
      ``,
      `=== DATA QC ===`,
      toCSV(
        [
          "No",
          "Tanggal",
          "No Order",
          "Tahap QC",
          "Inspektor",
          "Hasil",
          "Catatan",
        ],
        qcRows,
      ),
      ``,
      `=== PERFORMA STAFF PRODUKSI ===`,
      toCSV(
        [
          "No",
          "Nama Staff",
          "Role",
          "Total Scan",
          "Total Order",
          "Tahap Selesai",
        ],
        staffRows,
      ),
    ].join("\r\n");

    return new Response(BOM + content, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="Laporan_Lengkap_${timestamp}.csv"`,
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
