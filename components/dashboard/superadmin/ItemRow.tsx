"use client";

import { useState, useEffect } from "react";
import { Check, StickyNote, Trash2, MessageSquare } from "lucide-react";
import type { TaskItem } from "@/app/dashboard/superadmin/management/_shared/types";
import { C } from "@/app/dashboard/superadmin/management/_shared/constants";
import { Diamond } from "@/components/dashboard/superadmin/Diamond";

function getStatusStyle(status: string | null) {
  switch (status) {
    case "selesai": return { background: C.sage, borderColor: C.sage, color: "#fff" };
    case "proses": return { background: C.amber, borderColor: C.amber, color: "#fff" };
    default: return { background: "#fff", borderColor: C.terra };
  }
}

function getStatusLabel(status: string | null) {
  switch (status) { case "selesai": return "Selesai"; case "proses": return "Proses"; default: return "Belum"; }
}

interface ItemRowProps {
  variant: "inline" | "panel";
  item: TaskItem;
  notesOpen: boolean;
  isCycling: boolean;
  isSaving: boolean;
  isFlashing?: boolean;
  notesValue: string;
  kendalaValue: string;
  onCycleStatus: (itemId: string, currentStatus: string | null) => void;
  onToggleNotes: (itemId: string) => void;
  onNotesChange: (itemId: string, value: string) => void;
  onKendalaChange: (itemId: string, value: string) => void;
  onSaveNote: (itemId: string, field: "notes" | "kendala", value: string) => void;
  onDelete: (itemId: string, title: string) => void;
}

export function ItemRow({
  variant,
  item,
  notesOpen,
  isCycling,
  isSaving,
  isFlashing = false,
  notesValue,
  kendalaValue,
  onCycleStatus,
  onToggleNotes,
  onNotesChange,
  onKendalaChange,
  onSaveNote,
  onDelete,
}: ItemRowProps) {
  const status = item.progress?.[0]?.status ?? null;
  const statusStyle = getStatusStyle(status);
  const statusLabel = getStatusLabel(status);
  const isDisabled = isCycling;
  const [bounce, setBounce] = useState(false);
  useEffect(() => {
    if (isCycling) { setBounce(true); const t = setTimeout(() => setBounce(false), 300); return () => clearTimeout(t); }
  }, [isCycling]);

  const statusButton = (
    <button
      onClick={(e) => { e.stopPropagation(); onCycleStatus(item.id, status); }}
      disabled={isDisabled}
      className={`w-6 h-6 rounded border-2 flex items-center justify-center shrink-0 text-[10px] font-bold transition-colors disabled:opacity-50 ${bounce ? "animate-checkbox-pop" : ""}`}
      style={{ background: statusStyle.background, borderColor: statusStyle.borderColor, color: statusStyle.color }}
      tabIndex={-1}
    >
      {status === "selesai" ? <Check className="w-3 h-3" /> : status === "proses" ? "…" : ""}
    </button>
  );

  const titleSpan = variant === "inline" ? (
    <span
      className="text-sm"
      style={{
        color: status === "selesai" ? C.faded : C.sepia,
        textDecoration: status === "selesai" ? "line-through" : "none",
      }}
    >
      {item.title}
    </span>
  ) : null;

  const labelSpan = (
    <span className="text-[10px] font-medium shrink-0" style={{ color: status === "selesai" ? C.sage : status === "proses" ? C.amber : C.terra }}>
      {statusLabel}
    </span>
  );

  const notesButton = (
    <button
      onClick={(e) => { e.stopPropagation(); onToggleNotes(item.id); }}
      className="p-1 rounded transition-colors shrink-0"
      style={{ color: notesOpen ? C.gold : C.ghost, background: notesOpen ? C.raised : "transparent" }}
      tabIndex={-1}
    >
      <StickyNote className="w-3.5 h-3.5" />
    </button>
  );

  const deleteButton = (
    <button
      onClick={(e) => { e.stopPropagation(); onDelete(item.id, item.title); }}
      className={variant === "inline" ? "opacity-0 group-hover:opacity-100 transition-opacity shrink-0" : "shrink-0"}
      style={{ color: C.ghost }}
      tabIndex={-1}
    >
      <Trash2 className="w-3.5 h-3.5" />
    </button>
  );

  const notesInputs = notesOpen && (
    <div className={variant === "inline" ? "flex gap-2 ml-0 sm:ml-7 flex-wrap sm:flex-nowrap" : "space-y-2"}>
      <input
        type="text"
        value={notesValue}
        onChange={(e) => onNotesChange(item.id, e.target.value)}
        onBlur={() => onSaveNote(item.id, "notes", notesValue)}
        placeholder="Catatan..."
        disabled={isSaving}
        className={variant === "inline" ? "flex-1 min-w-0 rounded-md border px-2 py-1 text-[11px] bg-white focus:outline-none" : "w-full rounded-md border px-2 py-1.5 text-xs bg-white focus:outline-none"}
        style={{ borderColor: C.border, color: C.sepia }}
      />
      <input
        type="text"
        value={kendalaValue}
        onChange={(e) => onKendalaChange(item.id, e.target.value)}
        onBlur={() => onSaveNote(item.id, "kendala", kendalaValue)}
        placeholder="Kendala..."
        disabled={isSaving}
        className={variant === "inline" ? "flex-1 min-w-0 rounded-md border px-2 py-1 text-[11px] bg-white focus:outline-none" : "w-full rounded-md border px-2 py-1.5 text-xs bg-white focus:outline-none"}
        style={{ borderColor: C.border, color: C.terra }}
      />
    </div>
  );

  const adminNotes = item.progress?.[0]?.admin_notes && (
    <p
      className={variant === "inline" ? "text-xs ml-0 sm:ml-7 mt-1 flex items-center gap-1" : "text-[10px] flex items-center gap-1"}
      style={{ color: variant === "panel" ? C.gold : C.faded }}
    >
      {variant === "panel" && <Diamond />}
      {variant === "inline" && <MessageSquare className="w-3 h-3 shrink-0" />}
      Admin: {item.progress?.[0]!.admin_notes}
    </p>
  );

  if (variant === "inline") {
    return (
      <div className="space-y-2">
        <div className={`flex items-center gap-2 transition-opacity duration-300 ${isFlashing ? "opacity-50" : ""}`}>
          {statusButton}
          <div className="flex-1 min-w-0 flex items-center gap-2">
            {titleSpan}
            {labelSpan}
          </div>
          {notesButton}
          {deleteButton}
        </div>
        {notesInputs}
        {adminNotes}
      </div>
    );
  }

  return (
    <div className="rounded-lg border p-3 space-y-2" style={{ background: C.card, borderColor: C.border }}>
      <div className="flex items-center gap-2">
        {statusButton}
        <span className="text-sm flex-1" style={{ color: status === "selesai" ? C.faded : C.ink, textDecoration: status === "selesai" ? "line-through" : "none" }}>{item.title}</span>
        {labelSpan}
        {notesButton}
        {deleteButton}
      </div>
      {notesInputs}
      {adminNotes}
    </div>
  );
}
