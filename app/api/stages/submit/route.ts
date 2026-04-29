// app/api/stages/submit/route.ts

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// ─── Stage constants ──────────────────────────────────────────────────────────

export const STAGE_SEQUENCE = [
  "penerimaan_order",
  "approval_penerimaan_order",
  "racik_bahan",
  "lebur_bahan",
  "pembentukan_cincin",
  "pemasangan_permata",
  "pemolesan",
  "qc_1",
  "approval_qc_1",
  "finishing",
  "laser",
  "qc_2",
  "approval_qc_2",
  "kelengkapan",
  "qc_3",
  "approval_qc_3",
  "packing",
  "pelunasan",
  "approval_pelunasan",
  "pengiriman",
] as const;

// Stages that require supervisor approval before advancing
const APPROVAL_REQUIRED = new Set([
  "penerimaan_order",
  "qc_1",
  "qc_2",
  "qc_3",
  "pelunasan",
]);

// Approval stage mapping: production stage → its approval stage key
const APPROVAL_STAGE_MAP: Record<string, string> = {
  penerimaan_order: "approval_penerimaan_order",
  qc_1: "approval_qc_1",
  qc_2: "approval_qc_2",
  qc_3: "approval_qc_3",
  pelunasan: "approval_pelunasan",
};

// SOP document numbers per stage (from official work instructions)
const STAGE_WORK_INSTRUCTIONS: Record<string, string> = {
  racik_bahan: "001-KGJ/OPR-PRD/I/2026",
  lebur_bahan: "002-KGJ/OPR-PRD/I/2026",
  pembentukan_cincin: "003-KGJ/OPR-PRD/I/2026",
  qc_1: "004-KGJ/OPR-PRD/I/2026",
  kelengkapan: "005-KGJ/OPR-PRD/I/2026",
  pelunasan: "006-KGJ/OPR-PRD/I/2026",
};

const ROLE_STAGE_ACCESS: Record<string, string[]> = {
  // Production roles
  racik: ["racik_bahan"],
  jewelry_expert_lebur_bahan: ["lebur_bahan"],
  jewelry_expert_pembentukan_awal: ["pembentukan_cincin"],
  micro_setting: ["pemasangan_permata"],
  jewelry_expert_finishing: ["pemolesan", "finishing"],
  laser: ["laser"],

  // QC roles
  qc_1: ["qc_1"],
  qc_2: ["qc_2"],
  qc_3: ["qc_3"],

  // Support roles
  kelengkapan: ["kelengkapan"],
  packing: ["packing", "pengiriman"],
  after_sales: ["pelunasan"],

  // Customer-facing roles
  customer_service: ["penerimaan_order"],

  // Supervisor / Management (approval gates)
  supervisor: [
    "approval_penerimaan_order",
    "approval_qc_1",
    "approval_qc_2",
    "approval_qc_3",
    "approval_pelunasan",
  ],
};

// ─── Shared helpers ───────────────────────────────────────────────────────────

function toValidIso(value: string | undefined, fallback: string): string {
  if (!value) return fallback;
  let d = new Date(value);
  if (isNaN(d.getTime()) && /^\d{2}:\d{2}(:\d{2})?$/.test(value)) {
    const today = new Date().toISOString().split("T")[0];
    d = new Date(`${today}T${value}`);
  }
  return isNaN(d.getTime()) ? fallback : d.toISOString();
}

async function getWorkInstructionId(
  admin: ReturnType<typeof createAdminClient>,
  docNumber: string,
): Promise<string | null> {
  const { data } = await admin
    .from("work_instructions")
    .select("id")
    .eq("document_number", docNumber)
    .eq("is_active", true)
    .maybeSingle();
  return data?.id ?? null;
}

async function insertStageResult(
  admin: ReturnType<typeof createAdminClient>,
  params: {
    order_id: string;
    user_id: string;
    stage: string;
    data: Record<string, unknown>;
    notes?: string | null;
    work_instruction_id?: string | null;
    started_at?: string;
    finished_at?: string;
  },
): Promise<string> {
  const { data: last } = await admin
    .from("stage_results")
    .select("attempt_number")
    .eq("order_id", params.order_id)
    .eq("stage", params.stage)
    .order("attempt_number", { ascending: false })
    .limit(1)
    .maybeSingle();

  const attemptNumber = (last?.attempt_number ?? 0) + 1;
  const now = new Date().toISOString();

  const { data: sr, error } = await admin
    .from("stage_results")
    .insert({
      order_id: params.order_id,
      user_id: params.user_id,
      stage: params.stage,
      attempt_number: attemptNumber,
      data: params.data,
      notes: params.notes ?? null,
      work_instruction_id: params.work_instruction_id ?? null,
      started_at: toValidIso(params.started_at, now),
      finished_at: toValidIso(params.finished_at, now),
    })
    .select("id")
    .single();

  if (error || !sr)
    throw new Error(`stage_results insert failed: ${error?.message}`);
  return sr.id;
}

async function insertMaterialTransactions(
  admin: ReturnType<typeof createAdminClient>,
  orderId: string,
  stageResultId: string,
  stage: string,
  transactions: Array<{
    transaction_type: string;
    material_type: string;
    karat?: number | null;
    weight_grams: number;
    supplier?: string | null;
    notes?: string | null;
  }>,
  userId: string,
) {
  if (!transactions?.length) return;
  const rows = transactions.map((t) => ({
    order_id: orderId,
    stage_result_id: stageResultId,
    stage,
    transaction_type: t.transaction_type,
    material_type: t.material_type,
    karat: t.karat ?? null,
    weight_grams: t.weight_grams,
    supplier: t.supplier ?? null,
    notes: t.notes ?? null,
    recorded_by: userId,
  }));
  await admin.from("material_transactions").insert(rows);
}

async function insertQualityChecklist(
  admin: ReturnType<typeof createAdminClient>,
  orderId: string,
  stageResultId: string,
  items: Array<{ check_key: string; passed: boolean; notes?: string | null }>,
  userId: string,
) {
  if (!items?.length) return;
  const rows = items.map((i) => ({
    order_id: orderId,
    stage_result_id: stageResultId,
    check_key: i.check_key,
    passed: i.passed,
    notes: i.notes ?? null,
    recorded_by: userId,
  }));
  await admin.from("quality_checklist_results").insert(rows);
}

async function insertAttachments(
  admin: ReturnType<typeof createAdminClient>,
  orderId: string,
  stage: string,
  items: Array<{
    file_type: string;
    file_path: string;
    file_name?: string | null;
    file_size_bytes?: number | null;
    mime_type?: string | null;
  }>,
  userId: string,
) {
  if (!items?.length) return;
  const rows = items.map((a) => ({
    order_id: orderId,
    stage,
    file_type: a.file_type,
    file_path: a.file_path,
    file_name: a.file_name ?? null,
    file_size_bytes: a.file_size_bytes ?? null,
    mime_type: a.mime_type ?? null,
    uploaded_by: userId,
  }));
  await admin.from("attachments").insert(rows);
}

async function insertTransition(
  admin: ReturnType<typeof createAdminClient>,
  orderId: string,
  fromStage: string | null,
  toStage: string,
  userId: string,
  reason?: string | null,
) {
  await admin.from("order_stage_transitions").insert({
    order_id: orderId,
    from_stage: fromStage,
    to_stage: toStage,
    transitioned_by: userId,
    reason: reason ?? null,
  });
}

async function logActivity(
  admin: ReturnType<typeof createAdminClient>,
  userId: string,
  action: string,
  entityType: string,
  entityId: string,
  newData?: Record<string, unknown>,
) {
  await admin.from("activity_logs").insert({
    user_id: userId,
    action,
    entity_type: entityType,
    entity_id: entityId,
    new_data: newData ?? null,
  });
}

/** Advance order to the next stage, or mark waiting_approval. */
async function finalizeStage(
  admin: ReturnType<typeof createAdminClient>,
  orderId: string,
  stage: string,
  userId: string,
) {
  // If this stage requires approval, mark waiting and advance to approval stage
  if (APPROVAL_REQUIRED.has(stage)) {
    const approvalStage = APPROVAL_STAGE_MAP[stage];
    if (approvalStage) {
      await admin
        .from("orders")
        .update({
          current_stage: approvalStage,
          status: "waiting_approval",
          updated_at: new Date().toISOString(),
        })
        .eq("id", orderId);
      await insertTransition(admin, orderId, stage, approvalStage, userId);
      return approvalStage;
    }
    // Fallback: just mark waiting_approval without advancing
    await admin
      .from("orders")
      .update({
        status: "waiting_approval",
        updated_at: new Date().toISOString(),
      })
      .eq("id", orderId);
    return null;
  }

  // No approval needed — advance to next production stage
  const idx = STAGE_SEQUENCE.indexOf(stage as (typeof STAGE_SEQUENCE)[number]);
  const nextStage =
    idx >= 0 && idx < STAGE_SEQUENCE.length - 1
      ? STAGE_SEQUENCE[idx + 1]
      : null;

  if (nextStage) {
    await admin
      .from("orders")
      .update({
        current_stage: nextStage,
        status: "in_progress",
        updated_at: new Date().toISOString(),
      })
      .eq("id", orderId);
    await insertTransition(admin, orderId, stage, nextStage, userId);
  }
  return nextStage;
}

// ─── Stage handlers ───────────────────────────────────────────────────────────

async function handlePenerimaanOrder(
  admin: ReturnType<typeof createAdminClient>,
  userId: string,
  data: Record<string, unknown>,
) {
  const {
    customer_id,
    new_customer,
    product_name,
    target_weight,
    target_karat,
    ring_size,
    model_description,
    special_notes,
    engraved_text,
    delivery_method,
    order_date,
    deadline,
    total_price,
    dp_amount,
    gemstone_list,
    form_order_path,
    form_order_name,
  } = data as Record<string, any>;

  if (!product_name?.trim())
    throw Object.assign(new Error("product_name wajib diisi"), { status: 400 });
  if (!target_weight || Number(target_weight) <= 0)
    throw Object.assign(new Error("target_weight harus > 0"), { status: 400 });
  if (
    target_karat === undefined ||
    target_karat === null ||
    target_karat === ""
  )
    throw Object.assign(new Error("target_karat wajib diisi"), { status: 400 });

  // Resolve customer
  let customerId: string;
  if (customer_id) {
    const { data: c, error } = await admin
      .from("customers")
      .select("id")
      .eq("id", customer_id)
      .is("deleted_at", null)
      .single();
    if (error || !c)
      throw Object.assign(new Error("Customer tidak ditemukan"), {
        status: 404,
      });
    customerId = c.id;
  } else {
    const nc = new_customer as Record<string, any> | undefined;
    if (!nc?.name?.trim())
      throw Object.assign(new Error("Nama customer wajib diisi"), {
        status: 400,
      });

    if (nc.phone?.trim()) {
      const { data: existing } = await admin
        .from("customers")
        .select("id")
        .eq("phone", nc.phone.trim())
        .is("deleted_at", null)
        .maybeSingle();
      if (existing) {
        customerId = existing.id;
      } else {
        const { data: created, error: ce } = await admin
          .from("customers")
          .insert({
            name: nc.name.trim(),
            phone: nc.phone.trim(),
            wa_contact: nc.wa_contact?.trim() ?? null,
          })
          .select("id")
          .single();
        if (ce || !created) throw new Error("Gagal membuat customer");
        customerId = created.id;
      }
    } else {
      const { data: created, error: ce } = await admin
        .from("customers")
        .insert({
          name: nc.name.trim(),
          wa_contact: nc.wa_contact?.trim() ?? null,
        })
        .select("id")
        .single();
      if (ce || !created) throw new Error("Gagal membuat customer");
      customerId = created.id;
    }
  }

  // Create order
  const { data: order, error: oe } = await admin
    .from("orders")
    .insert({
      customer_id: customerId,
      product_name: String(product_name).trim(),
      target_weight: Number(target_weight),
      target_karat: Number(target_karat),
      ring_size: ring_size?.trim() ?? null,
      model_description: model_description?.trim() ?? null,
      special_notes: special_notes?.trim() ?? null,
      engraved_text: engraved_text?.trim() ?? null,
      delivery_method: delivery_method ?? "pickup_store",
      order_date: order_date ?? new Date().toISOString().split("T")[0],
      deadline: deadline ?? null,
      total_price: total_price ? Number(total_price) : null,
      dp_amount: dp_amount ? Number(dp_amount) : null,
      current_stage: "penerimaan_order",
      status: "in_progress",
      created_by: userId,
    })
    .select("id, order_number")
    .single();

  if (oe || !order) throw new Error(`Gagal membuat order: ${oe?.message}`);

  // Transition
  await insertTransition(admin, order.id, null, "penerimaan_order", userId);

  // Gemstones
  const gems = Array.isArray(gemstone_list) ? gemstone_list : [];
  if (gems.length > 0) {
    const gemRows = gems.map((g: Record<string, any>) => ({
      order_id: order.id,
      gemstone_type: g.gemstone_type,
      shape: g.shape ?? null,
      weight_ct: g.weight_ct ? Number(g.weight_ct) : null,
      weight_grams: g.weight_grams ? Number(g.weight_grams) : null,
      clarity: g.clarity ?? null,
      color: g.color ?? null,
      quantity: g.quantity ? Number(g.quantity) : 1,
      source: g.source ?? "customer",
      certificate_no: g.certificate_no ?? null,
      notes: g.notes ?? null,
    }));
    await admin.from("order_gemstones").insert(gemRows);
  }

  // Optional form_order attachment
  if (form_order_path) {
    await insertAttachments(
      admin,
      order.id,
      "penerimaan_order",
      [
        {
          file_type: "form_order",
          file_path: form_order_path,
          file_name: form_order_name ?? null,
        },
      ],
      userId,
    );
  }

  // DP payment record
  if (dp_amount && Number(dp_amount) > 0) {
    await admin.from("payments").insert({
      order_id: order.id,
      type: "dp",
      amount: Number(dp_amount),
      method: (data as any).dp_method ?? "cash",
      reference_no: (data as any).dp_reference_no ?? null,
      received_by: userId,
    });
  }

  // Move to approval
  const nextStage = await finalizeStage(
    admin,
    order.id,
    "penerimaan_order",
    userId,
  );

  await logActivity(admin, userId, "CREATE_ORDER", "orders", order.id, {
    order_number: order.order_number,
    customer_id: customerId,
  });

  return {
    order_id: order.id,
    order_number: order.order_number,
    customer_id: customerId,
    next_stage: nextStage,
  };
}

async function handleApproval(
  admin: ReturnType<typeof createAdminClient>,
  userId: string,
  orderId: string,
  stage: string,
  data: Record<string, unknown>,
) {
  const { decision, remarks } = data as Record<string, any>;

  if (!decision || !["approved", "rejected"].includes(decision)) {
    throw Object.assign(new Error("decision harus approved atau rejected"), {
      status: 400,
    });
  }

  // Find the production stage this approval belongs to
  const productionStage = Object.entries(APPROVAL_STAGE_MAP).find(
    ([, approvalStage]) => approvalStage === stage,
  )?.[0];

  if (!productionStage) {
    throw Object.assign(
      new Error(`Tidak dapat menentukan production stage untuk ${stage}`),
      { status: 500 },
    );
  }

  // Find the latest stage_result for the production stage
  const { data: lastResult } = await admin
    .from("stage_results")
    .select("id")
    .eq("order_id", orderId)
    .eq("stage", productionStage)
    .order("attempt_number", { ascending: false })
    .limit(1)
    .maybeSingle();

  // Insert approval record
  await admin.from("approvals").insert({
    order_id: orderId,
    approver_id: userId,
    stage,
    decision,
    remarks: remarks ?? null,
    stage_result_id: lastResult?.id ?? null,
    decided_at: new Date().toISOString(),
  });

  if (decision === "rejected") {
    // Send back to the production stage for rework
    await admin
      .from("orders")
      .update({
        current_stage: productionStage,
        status: "rework",
        updated_at: new Date().toISOString(),
      })
      .eq("id", orderId);
    await insertTransition(
      admin,
      orderId,
      stage,
      productionStage,
      userId,
      remarks,
    );

    await logActivity(admin, userId, "REJECT_APPROVAL", "orders", orderId, {
      stage,
      production_stage: productionStage,
      remarks,
    });

    return {
      decision: "rejected",
      next_stage: productionStage,
    };
  }

  // Approved — advance to the next stage after this approval
  const idx = STAGE_SEQUENCE.indexOf(stage as (typeof STAGE_SEQUENCE)[number]);
  const nextStage =
    idx >= 0 && idx < STAGE_SEQUENCE.length - 1
      ? STAGE_SEQUENCE[idx + 1]
      : null;

  if (nextStage) {
    await admin
      .from("orders")
      .update({
        current_stage: nextStage,
        status: "in_progress",
        updated_at: new Date().toISOString(),
      })
      .eq("id", orderId);
    await insertTransition(admin, orderId, stage, nextStage, userId);
  }

  await logActivity(admin, userId, "APPROVE_STAGE", "orders", orderId, {
    stage,
    next_stage: nextStage,
  });

  return {
    decision: "approved",
    next_stage: nextStage,
  };
}

async function handleMaterialStage(
  admin: ReturnType<typeof createAdminClient>,
  userId: string,
  orderId: string,
  stage: string,
  data: Record<string, unknown>,
  extraOrderUpdate?: Record<string, unknown>,
) {
  const docNum =
    (data as any).work_instruction_number ?? STAGE_WORK_INSTRUCTIONS[stage];
  const wiId = docNum ? await getWorkInstructionId(admin, docNum) : null;

  const { material_transactions, notes, started_at, ...stageData } =
    data as Record<string, any>;

  const srId = await insertStageResult(admin, {
    order_id: orderId,
    user_id: userId,
    stage,
    data: {
      ...stageData,
      material_transactions: Array.isArray(material_transactions)
        ? material_transactions
        : [],
    },
    notes: notes ?? null,
    work_instruction_id: wiId,
    started_at: started_at ?? undefined,
  });

  await insertMaterialTransactions(
    admin,
    orderId,
    srId,
    stage,
    Array.isArray(material_transactions) ? material_transactions : [],
    userId,
  );

  if (extraOrderUpdate) {
    await admin.from("orders").update(extraOrderUpdate).eq("id", orderId);
  }

  const nextStage = await finalizeStage(admin, orderId, stage, userId);

  await logActivity(admin, userId, "SUBMIT_STAGE", "stage_results", srId, {
    order_id: orderId,
    stage,
  });

  return { stage_result_id: srId, next_stage: nextStage };
}

async function handleQc1(
  admin: ReturnType<typeof createAdminClient>,
  userId: string,
  orderId: string,
  data: Record<string, unknown>,
) {
  const {
    quality_checklist,
    certificate_logs,
    attachments,
    notes,
    started_at,
    ...stageData
  } = data as Record<string, any>;

  const docNum =
    stageData.work_instruction_number ?? STAGE_WORK_INSTRUCTIONS.qc_1;
  const wiId = docNum ? await getWorkInstructionId(admin, docNum) : null;

  const srId = await insertStageResult(admin, {
    order_id: orderId,
    user_id: userId,
    stage: "qc_1",
    data: stageData,
    notes: notes ?? null,
    work_instruction_id: wiId,
    started_at: started_at ?? undefined,
  });

  await insertQualityChecklist(
    admin,
    orderId,
    srId,
    Array.isArray(quality_checklist) ? quality_checklist : [],
    userId,
  );

  if (Array.isArray(certificate_logs) && certificate_logs.length > 0) {
    await admin.from("certificate_logs").insert(
      certificate_logs.map((c: Record<string, any>) => ({
        order_id: orderId,
        stage_result_id: srId,
        certificate_type: c.certificate_type,
        certificate_number: c.certificate_number ?? null,
        issuing_body: c.issuing_body ?? null,
        is_verified: c.is_verified ?? false,
        notes: c.notes ?? null,
      })),
    );
  }

  await insertAttachments(
    admin,
    orderId,
    "qc_1",
    Array.isArray(attachments) ? attachments : [],
    userId,
  );

  // qc_1 now requires supervisor approval → moves to approval_qc_1
  const nextStage = await finalizeStage(admin, orderId, "qc_1", userId);
  await logActivity(admin, userId, "SUBMIT_STAGE", "stage_results", srId, {
    order_id: orderId,
    stage: "qc_1",
  });

  return { stage_result_id: srId, next_stage: nextStage };
}

async function handleQc2(
  admin: ReturnType<typeof createAdminClient>,
  userId: string,
  orderId: string,
  data: Record<string, unknown>,
) {
  const { quality_checklist, attachments, notes, started_at, ...stageData } =
    data as Record<string, any>;

  const srId = await insertStageResult(admin, {
    order_id: orderId,
    user_id: userId,
    stage: "qc_2",
    data: stageData,
    notes: notes ?? null,
    started_at: started_at ?? undefined,
  });

  await insertQualityChecklist(
    admin,
    orderId,
    srId,
    Array.isArray(quality_checklist) ? quality_checklist : [],
    userId,
  );
  await insertAttachments(
    admin,
    orderId,
    "qc_2",
    Array.isArray(attachments) ? attachments : [],
    userId,
  );

  // qc_2 requires supervisor approval → moves to approval_qc_2
  const nextStage = await finalizeStage(admin, orderId, "qc_2", userId);
  await logActivity(admin, userId, "SUBMIT_STAGE", "stage_results", srId, {
    order_id: orderId,
    stage: "qc_2",
  });

  return { stage_result_id: srId, next_stage: nextStage };
}

async function handleKelengkapan(
  admin: ReturnType<typeof createAdminClient>,
  userId: string,
  orderId: string,
  data: Record<string, unknown>,
) {
  const {
    completeness_checklist,
    packaging_log,
    attachments,
    notes,
    started_at,
    ...stageData
  } = data as Record<string, any>;

  const docNum =
    stageData.work_instruction_number ?? STAGE_WORK_INSTRUCTIONS.kelengkapan;
  const wiId = docNum ? await getWorkInstructionId(admin, docNum) : null;

  const srId = await insertStageResult(admin, {
    order_id: orderId,
    user_id: userId,
    stage: "kelengkapan",
    data: stageData,
    notes: notes ?? null,
    work_instruction_id: wiId,
    started_at: started_at ?? undefined,
  });

  if (
    Array.isArray(completeness_checklist) &&
    completeness_checklist.length > 0
  ) {
    await admin.from("completeness_checklist").insert(
      completeness_checklist.map((item: Record<string, any>) => ({
        order_id: orderId,
        stage_result_id: srId,
        item_key: item.item_key,
        checked: item.checked ?? false,
        notes: item.notes ?? null,
        recorded_by: userId,
      })),
    );
  }

  if (packaging_log) {
    await admin.from("packaging_logs").insert({
      order_id: orderId,
      stage_result_id: srId,
      box_type: packaging_log.box_type ?? null,
      gift_type: packaging_log.gift_type ?? null,
      price_list_version: packaging_log.price_list_version ?? null,
      notes: packaging_log.notes ?? null,
    });
  }

  await insertAttachments(
    admin,
    orderId,
    "kelengkapan",
    Array.isArray(attachments) ? attachments : [],
    userId,
  );

  const nextStage = await finalizeStage(admin, orderId, "kelengkapan", userId);
  await logActivity(admin, userId, "SUBMIT_STAGE", "stage_results", srId, {
    order_id: orderId,
    stage: "kelengkapan",
  });

  return { stage_result_id: srId, next_stage: nextStage };
}

async function handleQc3(
  admin: ReturnType<typeof createAdminClient>,
  userId: string,
  orderId: string,
  data: Record<string, unknown>,
) {
  const { quality_checklist, attachments, notes, started_at, ...stageData } =
    data as Record<string, any>;

  const srId = await insertStageResult(admin, {
    order_id: orderId,
    user_id: userId,
    stage: "qc_3",
    data: stageData,
    notes: notes ?? null,
    started_at: started_at ?? undefined,
  });

  await insertQualityChecklist(
    admin,
    orderId,
    srId,
    Array.isArray(quality_checklist) ? quality_checklist : [],
    userId,
  );
  await insertAttachments(
    admin,
    orderId,
    "qc_3",
    Array.isArray(attachments) ? attachments : [],
    userId,
  );

  // qc_3 requires supervisor approval → moves to approval_qc_3
  const nextStage = await finalizeStage(admin, orderId, "qc_3", userId);
  await logActivity(admin, userId, "SUBMIT_STAGE", "stage_results", srId, {
    order_id: orderId,
    stage: "qc_3",
  });

  return { stage_result_id: srId, next_stage: nextStage };
}

async function handleLaser(
  admin: ReturnType<typeof createAdminClient>,
  userId: string,
  orderId: string,
  data: Record<string, unknown>,
) {
  const { attachments, notes, started_at, ...stageData } = data as Record<
    string,
    any
  >;

  const srId = await insertStageResult(admin, {
    order_id: orderId,
    user_id: userId,
    stage: "laser",
    data: stageData,
    notes: notes ?? null,
    started_at: started_at ?? undefined,
  });

  await insertAttachments(
    admin,
    orderId,
    "laser",
    Array.isArray(attachments) ? attachments : [],
    userId,
  );

  const nextStage = await finalizeStage(admin, orderId, "laser", userId);
  await logActivity(admin, userId, "SUBMIT_STAGE", "stage_results", srId, {
    order_id: orderId,
    stage: "laser",
  });

  return { stage_result_id: srId, next_stage: nextStage };
}

async function handlePacking(
  admin: ReturnType<typeof createAdminClient>,
  userId: string,
  orderId: string,
  data: Record<string, unknown>,
) {
  const { delivery, attachments, notes, started_at, ...stageData } =
    data as Record<string, any>;

  const srId = await insertStageResult(admin, {
    order_id: orderId,
    user_id: userId,
    stage: "packing",
    data: stageData,
    notes: notes ?? null,
    started_at: started_at ?? undefined,
  });

  await insertAttachments(
    admin,
    orderId,
    "packing",
    Array.isArray(attachments) ? attachments : [],
    userId,
  );

  // Create the deliveries record
  if (delivery) {
    await admin.from("deliveries").insert({
      order_id: orderId,
      delivery_method: delivery.delivery_method ?? "pickup_store",
      status: "pending",
      courier_name: delivery.courier_name ?? null,
      recipient_name: delivery.recipient_name ?? null,
      recipient_phone: delivery.recipient_phone ?? null,
      delivery_address: delivery.delivery_address ?? null,
      notes: delivery.notes ?? null,
      prepared_by: userId,
    });
  }

  const nextStage = await finalizeStage(admin, orderId, "packing", userId);
  await logActivity(admin, userId, "SUBMIT_STAGE", "stage_results", srId, {
    order_id: orderId,
    stage: "packing",
  });

  return { stage_result_id: srId, next_stage: nextStage };
}

async function handlePelunasan(
  admin: ReturnType<typeof createAdminClient>,
  userId: string,
  orderId: string,
  data: Record<string, unknown>,
) {
  const {
    payments,
    attachments,
    notes,
    started_at,
    update_total_price,
    update_dp_amount,
    ...stageData
  } = data as Record<string, any>;

  const docNum =
    stageData.work_instruction_number ?? STAGE_WORK_INSTRUCTIONS.pelunasan;
  const wiId = docNum ? await getWorkInstructionId(admin, docNum) : null;

  const srId = await insertStageResult(admin, {
    order_id: orderId,
    user_id: userId,
    stage: "pelunasan",
    data: stageData,
    notes: notes ?? null,
    work_instruction_id: wiId,
    started_at: started_at ?? undefined,
  });

  // Update order price totals if provided
  const priceUpdate: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };
  if (update_total_price != null)
    priceUpdate.total_price = Number(update_total_price);
  if (update_dp_amount != null)
    priceUpdate.dp_amount = Number(update_dp_amount);
  if (Object.keys(priceUpdate).length > 1)
    await admin.from("orders").update(priceUpdate).eq("id", orderId);

  // Insert payment records
  if (Array.isArray(payments)) {
    for (const p of payments as Record<string, any>[]) {
      await admin.from("payments").insert({
        order_id: orderId,
        type: p.type ?? "pelunasan",
        amount: Number(p.amount),
        method: p.method ?? "cash",
        reference_no: p.reference_no ?? null,
        paid_at: p.paid_at ?? new Date().toISOString(),
        received_by: userId,
        notes: p.notes ?? null,
      });
    }
  }

  await insertAttachments(
    admin,
    orderId,
    "pelunasan",
    Array.isArray(attachments) ? attachments : [],
    userId,
  );

  // pelunasan requires supervisor approval → moves to approval_pelunasan
  const nextStage = await finalizeStage(admin, orderId, "pelunasan", userId);
  await logActivity(admin, userId, "SUBMIT_STAGE", "stage_results", srId, {
    order_id: orderId,
    stage: "pelunasan",
  });

  return { stage_result_id: srId, next_stage: nextStage };
}

async function handlePengiriman(
  admin: ReturnType<typeof createAdminClient>,
  userId: string,
  orderId: string,
  data: Record<string, unknown>,
) {
  const {
    delivery_update,
    handover,
    order_update,
    attachments,
    notes,
    started_at,
    ...stageData
  } = data as Record<string, any>;

  const srId = await insertStageResult(admin, {
    order_id: orderId,
    user_id: userId,
    stage: "pengiriman",
    data: stageData,
    notes: notes ?? null,
    started_at: started_at ?? undefined,
  });

  // Update delivery record
  if (delivery_update) {
    const { data: delivery } = await admin
      .from("deliveries")
      .select("id")
      .eq("order_id", orderId)
      .eq("status", "pending")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (delivery) {
      await admin
        .from("deliveries")
        .update({
          status: delivery_update.status ?? "dispatched",
          tracking_number: delivery_update.tracking_number ?? null,
          dispatched_at: delivery_update.dispatched_at ?? null,
          delivered_at: delivery_update.delivered_at ?? null,
          confirmed_by: userId,
          updated_at: new Date().toISOString(),
        })
        .eq("id", delivery.id);
    }
  }

  // Handover log
  if (handover) {
    const attachmentRows = Array.isArray(attachments) ? attachments : [];
    let handoverAttachmentId: string | null = null;
    const handoverForm = attachmentRows.find(
      (a: Record<string, any>) => a.file_type === "handover_form",
    );
    if (handoverForm) {
      const { data: att } = await admin
        .from("attachments")
        .insert({
          order_id: orderId,
          stage: "pengiriman",
          file_type: "handover_form",
          file_path: handoverForm.file_path,
          file_name: handoverForm.file_name ?? null,
          uploaded_by: userId,
        })
        .select("id")
        .single();
      handoverAttachmentId = att?.id ?? null;
    }

    await admin.from("handover_logs").insert({
      order_id: orderId,
      handover_type: handover.handover_type ?? "store_to_customer",
      from_user_id: handover.from_user_id ?? userId,
      to_user_id: handover.to_user_id ?? null,
      handover_form_attachment_id: handoverAttachmentId,
      notes: handover.notes ?? null,
    });
  }

  // Remaining attachments
  const otherAttachments = (
    Array.isArray(attachments) ? attachments : []
  ).filter((a: Record<string, any>) => a.file_type !== "handover_form");
  await insertAttachments(
    admin,
    orderId,
    "pengiriman",
    otherAttachments,
    userId,
  );

  // Complete the order
  const now = new Date().toISOString();
  const ou = order_update ?? {};
  await admin
    .from("orders")
    .update({
      current_stage: "selesai",
      status: "completed",
      completed_at: now,
      store_arrival_date: (ou as any).store_arrival_date ?? null,
      customer_notified_at: (ou as any).customer_notified_at ?? null,
      picked_up_at: (ou as any).picked_up_at ?? null,
      updated_at: now,
    })
    .eq("id", orderId);

  await insertTransition(admin, orderId, "pengiriman", "selesai", userId);

  await logActivity(admin, userId, "SUBMIT_STAGE", "stage_results", srId, {
    order_id: orderId,
    stage: "pengiriman",
  });

  return { stage_result_id: srId, next_stage: "selesai" };
}

// ─── Main POST handler ────────────────────────────────────────────────────────

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user: authUser },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !authUser)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const admin = createAdminClient();

    const { order_id: rawOrderId, stage, data } = await request.json();
    if (!stage || !data)
      return NextResponse.json(
        { error: "stage dan data wajib diisi" },
        { status: 400 },
      );

    const orderId = rawOrderId as string | null;

    // penerimaan_order doesn't need an existing order
    if (!orderId && stage !== "penerimaan_order")
      return NextResponse.json(
        { error: "order_id wajib diisi" },
        { status: 400 },
      );

    // Fetch user profile
    const { data: userData } = await admin
      .from("users")
      .select(
        "id, full_name, role:roles!users_role_id_fkey(id, name, role_group, allowed_stages, permissions)",
      )
      .eq("id", authUser.id)
      .is("deleted_at", null)
      .single();

    if (!userData)
      return NextResponse.json(
        { error: "User tidak ditemukan" },
        { status: 404 },
      );

    const roleName: string = (userData.role as any)?.name ?? "";
    const roleGroup: string = (userData.role as any)?.role_group ?? "";
    const allowedStages: string[] =
      (userData.role as any)?.allowed_stages ?? [];
    const roleStages = ROLE_STAGE_ACCESS[roleName];
    const workshopGroups = ["production", "operational", "management"];

    const hasAccess =
      roleName === "superadmin" ||
      (allowedStages.length > 0
        ? allowedStages.includes(stage)
        : roleStages
          ? roleStages.includes(stage)
          : workshopGroups.includes(roleGroup));

    if (!hasAccess)
      return NextResponse.json(
        { error: "Anda tidak memiliki akses ke tahap ini" },
        { status: 403 },
      );

    // For non-penerimaan stages, validate order state
    if (orderId && stage !== "penerimaan_order") {
      const { data: order, error: oe } = await admin
        .from("orders")
        .select("id, current_stage, status")
        .eq("id", orderId)
        .is("deleted_at", null)
        .single();

      if (oe || !order)
        return NextResponse.json(
          { error: "Order tidak ditemukan" },
          { status: 404 },
        );

      if (order.status === "completed" || order.status === "cancelled")
        return NextResponse.json(
          { error: "Order sudah selesai atau dibatalkan" },
          { status: 422 },
        );

      if (order.current_stage !== stage)
        return NextResponse.json(
          {
            error: `Order saat ini di tahap '${order.current_stage}', bukan '${stage}'`,
          },
          { status: 409 },
        );
    }

    let result: Record<string, unknown>;

    switch (stage) {
      case "penerimaan_order":
        result = await handlePenerimaanOrder(admin, authUser.id, data);
        break;

      // Approval gates
      case "approval_penerimaan_order":
      case "approval_qc_1":
      case "approval_qc_2":
      case "approval_qc_3":
      case "approval_pelunasan":
        result = await handleApproval(
          admin,
          authUser.id,
          orderId!,
          stage,
          data,
        );
        break;

      // Material stages (no approval, auto-advance)
      case "racik_bahan":
      case "lebur_bahan":
      case "pembentukan_cincin":
      case "pemasangan_permata":
      case "pemolesan":
      case "finishing":
        result = await handleMaterialStage(
          admin,
          authUser.id,
          orderId!,
          stage,
          data,
          stage === "finishing" && (data as any).rhodium_specification
            ? { rhodium_specification: (data as any).rhodium_specification }
            : undefined,
        );
        break;

      // QC stages (require approval after)
      case "qc_1":
        result = await handleQc1(admin, authUser.id, orderId!, data);
        break;

      case "qc_2":
        result = await handleQc2(admin, authUser.id, orderId!, data);
        break;

      case "qc_3":
        result = await handleQc3(admin, authUser.id, orderId!, data);
        break;

      // Other stages
      case "laser":
        result = await handleLaser(admin, authUser.id, orderId!, data);
        break;

      case "kelengkapan":
        result = await handleKelengkapan(admin, authUser.id, orderId!, data);
        break;

      case "packing":
        result = await handlePacking(admin, authUser.id, orderId!, data);
        break;

      case "pelunasan":
        result = await handlePelunasan(admin, authUser.id, orderId!, data);
        break;

      case "pengiriman":
        result = await handlePengiriman(admin, authUser.id, orderId!, data);
        break;

      default:
        return NextResponse.json(
          { error: `Stage '${stage}' tidak dikenali` },
          { status: 400 },
        );
    }

    const isApproval = stage.startsWith("approval_");
    const waitingApproval = APPROVAL_REQUIRED.has(stage);

    return NextResponse.json({
      success: true,
      message: isApproval
        ? result.decision === "approved"
          ? "Order disetujui. Melanjutkan ke tahap berikutnya."
          : "Order ditolak. Dikembalikan untuk perbaikan."
        : waitingApproval
          ? "Data tersimpan. Menunggu persetujuan supervisor."
          : "Data berhasil disimpan.",
      data: result,
    });
  } catch (err: any) {
    const status = err?.status ?? 500;
    console.error("[Submit] Error:", err);
    return NextResponse.json(
      { error: err?.message ?? "Terjadi kesalahan server" },
      { status },
    );
  }
}
