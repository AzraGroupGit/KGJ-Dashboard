"use client";

import { useState } from "react";
import { AlertTriangle, Trash2, UserX } from "lucide-react";
import {
  ModalShell,
  roleLabel,
  type Account,
} from "./shared";

interface DeleteModalProps {
  account: Account;
  onClose: () => void;
  onDeleted: (id: string) => void;
}

export function DeleteModal({ account, onClose, onDeleted }: DeleteModalProps) {
  const [confirmText, setConfirmText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canConfirm = confirmText === account.username;

  const confirm = async () => {
    if (!canConfirm) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/supervisor/accounts/${account.id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal menghapus akun");
      onDeleted(account.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ModalShell
      title="Hapus Akun"
      subtitle="Tindakan permanen"
      icon={<Trash2 className="h-5 w-5 text-red-600" />}
      onClose={onClose}
    >
      <div className="space-y-4">
        {error && (
          <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 ring-1 ring-red-200 flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <div className="rounded-xl bg-red-50 p-4 text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-red-100">
            <UserX className="h-7 w-7 text-red-600" />
          </div>
          <p className="text-sm font-semibold text-red-800">
            {account.full_name}
          </p>
          <p className="text-xs text-red-600">@{account.username}</p>
          {account.role && (
            <p className="mt-0.5 text-xs text-red-500">
              {roleLabel(account.role.name)}
            </p>
          )}
        </div>

        <div className="rounded-lg border border-red-100 bg-red-50/50 p-3">
          <p className="text-xs text-red-700">
            <span className="font-semibold">Peringatan:</span> Akun ini akan
            dihapus secara permanen. Semua data terkait akan tetap ada di
            sistem, tetapi akun tidak dapat digunakan lagi. Tindakan ini{" "}
            <span className="font-semibold">tidak dapat dibatalkan</span>.
          </p>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-stone-700">
            Ketik{" "}
            <span className="font-mono font-semibold text-red-600">
              {account.username}
            </span>{" "}
            untuk mengonfirmasi
          </label>
          <input
            type="text"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder={account.username}
            className="w-full rounded-lg border border-stone-200 bg-stone-50 px-3 py-2.5 text-sm text-stone-800 placeholder-stone-400 focus:border-red-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-200 transition"
          />
        </div>

        <div className="flex gap-3 pt-1">
          <button
            onClick={onClose}
            className="flex-1 rounded-lg border border-stone-200 px-4 py-2.5 text-sm font-medium text-stone-700 hover:bg-stone-50 transition-colors"
          >
            Batal
          </button>
          <button
            onClick={confirm}
            disabled={loading || !canConfirm}
            className="flex-1 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? "Menghapus..." : "Ya, Hapus Permanen"}
          </button>
        </div>
      </div>
    </ModalShell>
  );
}
