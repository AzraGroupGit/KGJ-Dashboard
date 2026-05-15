// app/dashboard/supervisor/accounts/page.tsx

"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/layout/MobileSidebar";
import Header from "@/components/layout/MobileHeader";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Key,
  Pencil,
  Plus,
  Search,
  Shield,
  ShieldOff,
  Trash2,
  UserPlus,
  Users,
  UserX,
  XCircle,
} from "lucide-react";

// ════════════════════════════════════════════════════════════════════════════
// TYPES
// ════════════════════════════════════════════════════════════════════════════

interface Role {
  id: string;
  name: string;
  role_group: string;
  description: string | null;
}

interface Account {
  id: string;
  full_name: string;
  username: string;
  email: string | null;
  status: "active" | "inactive";
  last_login: string | null;
  created_at: string;
  role_id: string | null;
  role: Role | null;
  branch_name?: string | null;
}

type ModalType =
  | "create"
  | "edit"
  | "password"
  | "deactivate"
  | "delete"
  | null;

type FilterStatus = "all" | "active" | "inactive";

// ════════════════════════════════════════════════════════════════════════════
// HELPERS
// ════════════════════════════════════════════════════════════════════════════

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatRelative(iso: string | null): string {
  if (!iso) return "—";
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "baru saja";
  if (mins < 60) return `${mins} mnt lalu`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} jam lalu`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days} hari lalu`;
  return formatDate(iso);
}

function formatDateTime(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function roleLabel(name: string): string {
  const map: Record<string, string> = {
    // Production
    penerimaan_order: "Penerimaan Order",
    racik_bahan: "Persiapan Bahan",
    lebur_bahan: "Lebur Bahan",
    pembentukan_cincin: "Pembentukan Cincin",
    cek_kadar: "Cek Kadar",
    pemasangan_permata: "Micro Setting",
    pemolesan: "Pemolesan",
    finishing: "Finishing",
    qc_1: "QC Awal",
    qc_2: "QC Akhir",
    laser: "Laser Engraving",
    packing: "Packing",
    pengiriman: "Pengiriman",
    // Operational
    konfirmasi: "Konfirmasi Customer",
    kelengkapan: "Kelengkapan",
    qc_3: "QC Akhir",
    pelunasan: "Pelunasan",
    // Management
    supervisor: "Supervisor",
    superadmin: "Superadmin",
    admin: "Admin",
    // Marketing
    marketing: "Marketing",
    // CS
    cs: "Customer Service",
  };
  return (
    map[name] ??
    name.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
  );
}

function roleGroupLabel(group: string): string {
  const map: Record<string, string> = {
    production: "Produksi",
    operational: "Operasional",
    management: "Manajemen",
    customer_service: "Customer Service",
    marketing: "Marketing",
  };
  return map[group] ?? group;
}

function roleGroupColor(group: string): string {
  const map: Record<string, string> = {
    production: "bg-amber-100 text-amber-800 border-amber-200",
    operational: "bg-blue-100 text-blue-800 border-blue-200",
    management: "bg-purple-100 text-purple-800 border-purple-200",
    customer_service: "bg-emerald-100 text-emerald-800 border-emerald-200",
    marketing: "bg-pink-100 text-pink-800 border-pink-200",
  };
  return map[group] ?? "bg-slate-100 text-slate-700 border-slate-200";
}

// ════════════════════════════════════════════════════════════════════════════
// SMALL COMPONENTS
// ════════════════════════════════════════════════════════════════════════════

function StatusBadge({ status }: { status: "active" | "inactive" }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${
        status === "active"
          ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
          : "bg-stone-100 text-stone-500 ring-1 ring-stone-200"
      }`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${
          status === "active" ? "bg-emerald-500" : "bg-stone-400"
        }`}
      />
      {status === "active" ? "Aktif" : "Nonaktif"}
    </span>
  );
}

function Avatar({ name }: { name: string }) {
  const initials = name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
  return (
    <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-amber-100 text-sm font-semibold text-amber-700 ring-2 ring-amber-200">
      {initials}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// MODAL SHELL
// ════════════════════════════════════════════════════════════════════════════

interface ModalShellProps {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  onClose: () => void;
  children: React.ReactNode;
}

function ModalShell({
  title,
  subtitle,
  icon,
  onClose,
  children,
}: ModalShellProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-stone-100 px-6 py-4">
          <div className="flex items-center gap-3">
            {icon}
            <div>
              <h2 className="text-base font-semibold text-stone-800">
                {title}
              </h2>
              {subtitle && <p className="text-xs text-stone-400">{subtitle}</p>}
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-stone-400 hover:bg-stone-100 hover:text-stone-600 transition-colors"
          >
            <XCircle className="h-5 w-5" />
          </button>
        </div>
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// FORM FIELD
// ════════════════════════════════════════════════════════════════════════════

interface FormFieldProps {
  label: string;
  type?: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  required?: boolean;
  minLength?: number;
  disabled?: boolean;
  hint?: string;
  error?: string | null;
}

function Field({
  label,
  type = "text",
  value,
  onChange,
  placeholder,
  required,
  minLength,
  disabled,
  hint,
  error,
}: FormFieldProps) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-stone-700">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        minLength={minLength}
        disabled={disabled}
        className={`w-full rounded-lg border px-3 py-2.5 text-sm text-stone-800 placeholder-stone-400 transition ${
          disabled
            ? "border-stone-100 bg-stone-50 text-stone-400 cursor-not-allowed"
            : error
              ? "border-red-200 bg-red-50 focus:border-red-400 focus:ring-2 focus:ring-red-200"
              : "border-stone-200 bg-stone-50 focus:border-amber-400 focus:bg-white focus:ring-2 focus:ring-amber-200"
        }`}
      />
      {hint && !error && <p className="mt-1 text-xs text-stone-400">{hint}</p>}
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// CREATE MODAL
// ════════════════════════════════════════════════════════════════════════════

interface CreateModalProps {
  roles: Role[];
  onClose: () => void;
  onCreated: (a: Account) => void;
}

function CreateModal({ roles, onClose, onCreated }: CreateModalProps) {
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [roleId, setRoleId] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [createdAccount, setCreatedAccount] = useState<Account | null>(null);

  // Group roles for better UX
  const groupedRoles = roles.reduce<Record<string, Role[]>>((acc, role) => {
    const group = role.role_group || "other";
    if (!acc[group]) acc[group] = [];
    acc[group].push(role);
    return acc;
  }, {});

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/supervisor/accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          full_name: fullName,
          username,
          password,
          role_id: roleId,
          email: email,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal membuat akun");
      setCreatedAccount(data.account);
      setSuccess(true);
      onCreated(data.account);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan");
    } finally {
      setLoading(false);
    }
  };

  if (success && createdAccount) {
    return (
      <ModalShell
        title="Akun Berhasil Dibuat"
        icon={<CheckCircle2 className="h-5 w-5 text-emerald-600" />}
        onClose={onClose}
      >
        <div className="space-y-4">
          <div className="rounded-xl bg-emerald-50 p-4 text-center">
            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100">
              <UserPlus className="h-7 w-7 text-emerald-600" />
            </div>
            <p className="font-semibold text-emerald-800">
              {createdAccount.full_name}
            </p>
            <p className="text-sm text-emerald-600">
              @{createdAccount.username}
            </p>
            {createdAccount.role && (
              <p className="mt-1 text-xs text-emerald-500">
                {roleLabel(createdAccount.role.name)}
              </p>
            )}
          </div>
          <div className="rounded-lg bg-amber-50 p-3">
            <p className="text-xs font-medium text-amber-800">
              Informasikan username dan password kepada anggota tim yang
              bersangkutan.
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-full rounded-lg bg-amber-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-amber-600 transition-colors"
          >
            Selesai
          </button>
        </div>
      </ModalShell>
    );
  }

  return (
    <ModalShell
      title="Tambah Akun Tim"
      subtitle="Buat akun baru untuk anggota tim"
      icon={<UserPlus className="h-5 w-5 text-amber-600" />}
      onClose={onClose}
    >
      <form onSubmit={submit} className="space-y-4">
        {error && (
          <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 ring-1 ring-red-200 flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}
        <Field
          label="Nama Lengkap"
          value={fullName}
          onChange={setFullName}
          placeholder="Contoh: Budi Santoso"
          required
        />
        <Field
          label="Username"
          value={username}
          onChange={setUsername}
          placeholder="min. 3 karakter"
          required
          minLength={3}
        />
        <Field
          label="Password"
          type="password"
          value={password}
          onChange={setPassword}
          placeholder="min. 6 karakter"
          required
          minLength={6}
        />

        <div>
          <label className="mb-1 block text-sm font-medium text-stone-700">
            Role <span className="text-red-500">*</span>
          </label>
          <select
            value={roleId}
            onChange={(e) => setRoleId(e.target.value)}
            required
            className="w-full rounded-lg border border-stone-200 bg-stone-50 px-3 py-2.5 text-sm text-stone-800 focus:border-amber-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-200 transition"
          >
            <option value="">Pilih role...</option>
            {Object.entries(groupedRoles).map(([group, groupRoles]) => (
              <optgroup key={group} label={roleGroupLabel(group)}>
                {groupRoles.map((r) => (
                  <option key={r.id} value={r.id}>
                    {roleLabel(r.name)}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </div>

        <Field
          label="Email"
          type="email"
          value={email}
          onChange={setEmail}
          placeholder="email@example.com"
        />

        <div className="flex gap-3 pt-1">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-lg border border-stone-200 px-4 py-2.5 text-sm font-medium text-stone-700 hover:bg-stone-50 transition-colors"
          >
            Batal
          </button>
          <button
            type="submit"
            disabled={loading}
            className="flex-1 rounded-lg bg-amber-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-amber-600 disabled:opacity-60 transition-colors"
          >
            {loading ? "Menyimpan..." : "Buat Akun"}
          </button>
        </div>
      </form>
    </ModalShell>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// EDIT MODAL
// ════════════════════════════════════════════════════════════════════════════

interface EditModalProps {
  account: Account;
  roles: Role[];
  onClose: () => void;
  onUpdated: (id: string, changes: Partial<Account>) => void;
}

function EditModal({ account, roles, onClose, onUpdated }: EditModalProps) {
  const [fullName, setFullName] = useState(account.full_name);
  const [roleId, setRoleId] = useState(account.role_id ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const groupedRoles = roles.reduce<Record<string, Role[]>>((acc, role) => {
    const group = role.role_group || "other";
    if (!acc[group]) acc[group] = [];
    acc[group].push(role);
    return acc;
  }, {});

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const body: Record<string, unknown> = {};
      if (fullName.trim() !== account.full_name)
        body.full_name = fullName.trim();
      if (roleId !== (account.role_id ?? "")) body.role_id = roleId;

      if (Object.keys(body).length === 0) {
        onClose();
        return;
      }

      const res = await fetch(`/api/supervisor/accounts/${account.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal memperbarui");

      const newRole = roles.find((r) => r.id === roleId) ?? null;
      onUpdated(account.id, {
        full_name: fullName.trim(),
        role_id: roleId || null,
        role: newRole,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ModalShell
      title="Edit Akun"
      subtitle={account.full_name}
      icon={<Pencil className="h-5 w-5 text-amber-600" />}
      onClose={onClose}
    >
      <form onSubmit={submit} className="space-y-4">
        {error && (
          <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 ring-1 ring-red-200 flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <Field
          label="Nama Lengkap"
          value={fullName}
          onChange={setFullName}
          required
        />

        <Field
          label="Username"
          value={account.username}
          onChange={() => {}}
          disabled
          hint="Username tidak dapat diubah setelah akun dibuat."
        />

        <div>
          <label className="mb-1 block text-sm font-medium text-stone-700">
            Role
          </label>
          <select
            value={roleId}
            onChange={(e) => setRoleId(e.target.value)}
            className="w-full rounded-lg border border-stone-200 bg-stone-50 px-3 py-2.5 text-sm text-stone-800 focus:border-amber-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-200 transition"
          >
            <option value="">Pilih role...</option>
            {Object.entries(groupedRoles).map(([group, groupRoles]) => (
              <optgroup key={group} label={roleGroupLabel(group)}>
                {groupRoles.map((r) => (
                  <option key={r.id} value={r.id}>
                    {roleLabel(r.name)}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </div>

        {/* Quick info */}
        <div className="rounded-lg bg-stone-50 p-3 space-y-1.5">
          <div className="flex justify-between text-xs">
            <span className="text-stone-400">Status</span>
            <StatusBadge status={account.status} />
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-stone-400">Login Terakhir</span>
            <span className="text-stone-600">
              {formatRelative(account.last_login)}
            </span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-stone-400">Dibuat</span>
            <span className="text-stone-600">
              {formatDateTime(account.created_at)}
            </span>
          </div>
        </div>

        <div className="flex gap-3 pt-1">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-lg border border-stone-200 px-4 py-2.5 text-sm font-medium text-stone-700 hover:bg-stone-50 transition-colors"
          >
            Batal
          </button>
          <button
            type="submit"
            disabled={loading}
            className="flex-1 rounded-lg bg-amber-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-amber-600 disabled:opacity-60 transition-colors"
          >
            {loading ? "Menyimpan..." : "Simpan"}
          </button>
        </div>
      </form>
    </ModalShell>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// PASSWORD MODAL
// ════════════════════════════════════════════════════════════════════════════

interface PasswordModalProps {
  account: Account;
  onClose: () => void;
}

function PasswordModal({ account, onClose }: PasswordModalProps) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const passwordError =
    confirm && password !== confirm ? "Password tidak cocok" : null;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) {
      setError("Password tidak cocok");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/supervisor/accounts/${account.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal mengubah password");
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ModalShell
      title="Reset Password"
      subtitle={account.full_name}
      icon={<Key className="h-5 w-5 text-blue-600" />}
      onClose={onClose}
    >
      {success ? (
        <div className="space-y-4">
          <div className="rounded-xl bg-emerald-50 p-4 text-center">
            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100">
              <CheckCircle2 className="h-7 w-7 text-emerald-600" />
            </div>
            <p className="text-sm font-medium text-emerald-800">
              Password berhasil diubah
            </p>
            <p className="mt-1 text-xs text-emerald-600">
              Informasikan password baru kepada{" "}
              <span className="font-semibold">{account.full_name}</span>.
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-full rounded-lg bg-amber-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-amber-600 transition-colors"
          >
            Tutup
          </button>
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-4">
          {error && (
            <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 ring-1 ring-red-200 flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}
          <Field
            label="Password Baru"
            type="password"
            value={password}
            onChange={setPassword}
            placeholder="min. 6 karakter"
            required
            minLength={6}
          />
          <Field
            label="Konfirmasi Password"
            type="password"
            value={confirm}
            onChange={setConfirm}
            placeholder="Ulangi password"
            required
            error={passwordError}
          />
          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-lg border border-stone-200 px-4 py-2.5 text-sm font-medium text-stone-700 hover:bg-stone-50 transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={loading || !password || !confirm || !!passwordError}
              className="flex-1 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60 transition-colors"
            >
              {loading ? "Mengubah..." : "Ubah Password"}
            </button>
          </div>
        </form>
      )}
    </ModalShell>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// DEACTIVATE MODAL
// ════════════════════════════════════════════════════════════════════════════

interface DeactivateModalProps {
  account: Account;
  onClose: () => void;
  onDeactivated: (id: string, changes: Partial<Account>) => void;
}

function DeactivateModal({
  account,
  onClose,
  onDeactivated,
}: DeactivateModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isActivating = account.status === "inactive";
  const action = isActivating ? "mengaktifkan" : "menonaktifkan";
  const actionLabel = isActivating ? "Aktifkan" : "Nonaktifkan";

  const confirm = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/supervisor/accounts/${account.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: isActivating ? "active" : "inactive",
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal memperbarui status");
      onDeactivated(account.id, {
        status: isActivating ? "active" : "inactive",
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ModalShell
      title={`${actionLabel} Akun`}
      subtitle={account.full_name}
      icon={
        isActivating ? (
          <Shield className="h-5 w-5 text-emerald-600" />
        ) : (
          <ShieldOff className="h-5 w-5 text-yellow-600" />
        )
      }
      onClose={onClose}
    >
      <div className="space-y-4">
        {error && (
          <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 ring-1 ring-red-200 flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <div
          className={`rounded-xl p-4 text-center ${
            isActivating ? "bg-emerald-50" : "bg-yellow-50"
          }`}
        >
          <div
            className={`mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full ${
              isActivating ? "bg-emerald-100" : "bg-yellow-100"
            }`}
          >
            {isActivating ? (
              <Shield className="h-7 w-7 text-emerald-600" />
            ) : (
              <ShieldOff className="h-7 w-7 text-yellow-600" />
            )}
          </div>
          <p
            className={`text-sm font-semibold ${
              isActivating ? "text-emerald-800" : "text-yellow-800"
            }`}
          >
            {account.full_name}
          </p>
          <p className="text-xs text-stone-500">@{account.username}</p>
          {account.role && (
            <p className="mt-0.5 text-xs text-stone-400">
              {roleLabel(account.role.name)}
            </p>
          )}
        </div>

        <p className="text-sm text-stone-600">
          {isActivating
            ? "Akun akan diaktifkan kembali dan dapat login ke sistem seperti biasa."
            : "Akun akan dinonaktifkan. Pengguna tidak dapat login sampai akun diaktifkan kembali."}
        </p>

        <div className="flex gap-3 pt-1">
          <button
            onClick={onClose}
            className="flex-1 rounded-lg border border-stone-200 px-4 py-2.5 text-sm font-medium text-stone-700 hover:bg-stone-50 transition-colors"
          >
            Batal
          </button>
          <button
            onClick={confirm}
            disabled={loading}
            className={`flex-1 rounded-lg px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60 transition-colors ${
              isActivating
                ? "bg-emerald-600 hover:bg-emerald-700"
                : "bg-yellow-600 hover:bg-yellow-700"
            }`}
          >
            {loading ? "Memproses..." : `Ya, ${actionLabel}`}
          </button>
        </div>
      </div>
    </ModalShell>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// DELETE MODAL
// ════════════════════════════════════════════════════════════════════════════

interface DeleteModalProps {
  account: Account;
  onClose: () => void;
  onDeleted: (id: string) => void;
}

function DeleteModal({ account, onClose, onDeleted }: DeleteModalProps) {
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

// ════════════════════════════════════════════════════════════════════════════
// SKELETON
// ════════════════════════════════════════════════════════════════════════════

function AccountsSkeleton() {
  return (
    <div className="space-y-4">
      {/* Stats skeleton */}
      <div className="grid grid-cols-3 gap-3">
        {[...Array(3)].map((_, i) => (
          <div
            key={i}
            className="h-20 animate-pulse rounded-xl border border-stone-200 bg-white"
          />
        ))}
      </div>
      {/* Table skeleton */}
      <div className="rounded-xl border border-stone-200 bg-white overflow-hidden">
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-4 px-4 py-3 border-b border-stone-100 last:border-0"
          >
            <div className="h-10 w-10 animate-pulse rounded-full bg-stone-200" />
            <div className="flex-1 space-y-2">
              <div className="h-3 w-32 animate-pulse rounded bg-stone-200" />
              <div className="h-2 w-20 animate-pulse rounded bg-stone-100" />
            </div>
            <div className="h-6 w-20 animate-pulse rounded-full bg-stone-200" />
            <div className="h-6 w-16 animate-pulse rounded-full bg-stone-100" />
          </div>
        ))}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// MAIN PAGE
// ════════════════════════════════════════════════════════════════════════════

type FilterTab = "all" | "production" | "operational";
type SupervisorGroup = "operational" | "production" | "all";

export default function SupervisorAccountsPage() {
  const router = useRouter();

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [scopedGroup, setScopedGroup] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [modal, setModal] = useState<ModalType>(null);
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);

  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<FilterStatus>("all");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userEmail, setUserEmail] = useState("");

  const [filter, setFilter] = useState<FilterTab>("all");
  const [supervisorGroup, setSupervisorGroup] =
    useState<SupervisorGroup>("all");

  // Verify supervisor identity
  useEffect(() => {
    (async () => {
      const res = await fetch("/api/me");
      if (!res.ok) {
        router.push("/workshop/login");
        return;
      }
      const json = await res.json();
      const u = json.data;
      const allowedStages: string[] = u.role?.allowed_stages ?? [];
      const canAccess =
        u.role?.name === "superadmin" ||
        u.role?.role_group === "management" ||
        allowedStages.some((s: string) => s.startsWith("approval_"));
      if (!canAccess) {
        router.push("/workshop/login");
        return;
      }
      setUserEmail(u.username || u.full_name || "");
      if (u.role?.name === "production_supervisor") {
        setSupervisorGroup("production");
        setFilter("production");
      } else if (u.role?.name === "operational_supervisor") {
        setSupervisorGroup("operational");
        setFilter("operational");
      } else {
        setSupervisorGroup("all");
      }
    })();
  }, [router]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/supervisor/accounts");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal memuat data");
      setAccounts(data.accounts ?? []);
      setRoles(data.roles ?? []);
      setScopedGroup(data.supervisor?.scoped_group ?? "");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal memuat data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const closeModal = () => {
    setModal(null);
    setSelectedAccount(null);
  };

  const handleCreated = (account: Account) => {
    setAccounts((prev) => [account, ...prev]);
    // Don't close modal on create — show success state first
  };

  const handleUpdated = (id: string, changes: Partial<Account>) => {
    setAccounts((prev) =>
      prev.map((a) => (a.id === id ? { ...a, ...changes } : a)),
    );
    closeModal();
  };

  const handleDeleted = (id: string) => {
    setAccounts((prev) => prev.filter((a) => a.id !== id));
    closeModal();
  };

  const handleDeactivated = (id: string, changes: Partial<Account>) => {
    setAccounts((prev) =>
      prev.map((a) => (a.id === id ? { ...a, ...changes } : a)),
    );
    closeModal();
  };

  const filtered = accounts.filter((a) => {
    const matchSearch =
      !search ||
      a.full_name.toLowerCase().includes(search.toLowerCase()) ||
      a.username.toLowerCase().includes(search.toLowerCase()) ||
      (a.role?.name ?? "").toLowerCase().includes(search.toLowerCase()) ||
      (a.email ?? "").toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === "all" || a.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const activeCount = accounts.filter((a) => a.status === "active").length;
  const inactiveCount = accounts.filter((a) => a.status === "inactive").length;

  const groupLabel =
    scopedGroup === "operational"
      ? "Tim Operasional"
      : scopedGroup === "production"
        ? "Tim Produksi"
        : "Semua Tim";

  return (
    <div className="flex flex-col md:flex-row h-screen bg-stone-50">
      {/* Sidebar */}
      <Sidebar
        role="supervisor"
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header
          userEmail={userEmail}
          role="supervisor"
          logoutPath="/workshop/login"
          onMenuClick={() => setSidebarOpen(true)}
        />

        <main className="flex-1 overflow-y-auto p-3 sm:p-4 md:p-6">
          {/* Header */}
          <div className="mb-4 sm:mb-6 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-lg sm:text-xl font-bold text-stone-900">
                  Kelola Akun Tim
                </h1>
                {supervisorGroup === "production" && (
                  <span className="rounded-full bg-amber-100 border border-amber-200 px-2 py-0.5 text-[11px] font-semibold text-amber-800">
                    Supervisor Produksi
                  </span>
                )}
                {supervisorGroup === "operational" && (
                  <span className="rounded-full bg-blue-100 border border-blue-200 px-2 py-0.5 text-[11px] font-semibold text-blue-800">
                    Supervisor Operasional
                  </span>
                )}
              </div>
              <p className="mt-0.5 text-xs sm:text-sm text-stone-500">
                {groupLabel} — {accounts.length} akun terdaftar
              </p>
            </div>
            <button
              onClick={() => setModal("create")}
              className="flex items-center justify-center gap-2 rounded-xl bg-amber-500 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-amber-600 active:scale-[0.98] transition-all min-h-[44px]"
            >
              <Plus className="h-4 w-4" />
              Tambah Akun
            </button>
          </div>

          {/* Stats */}
          <div className="mb-4 sm:mb-5 grid grid-cols-3 gap-2 sm:gap-3">
            {[
              {
                label: "Total Akun",
                value: accounts.length,
                icon: Users,
                color: "text-stone-700",
                bg: "bg-stone-100",
              },
              {
                label: "Aktif",
                value: activeCount,
                icon: Shield,
                color: "text-emerald-600",
                bg: "bg-emerald-100",
              },
              {
                label: "Nonaktif",
                value: inactiveCount,
                icon: ShieldOff,
                color: "text-stone-400",
                bg: "bg-stone-100",
              },
            ].map(({ label, value, icon: Icon, color, bg }) => (
              <div
                key={label}
                className="rounded-xl border border-stone-200 bg-white px-3 sm:px-4 py-3 shadow-sm"
              >
                <div className="flex items-center gap-2">
                  <div
                    className={`flex h-7 w-7 items-center justify-center rounded-lg ${bg}`}
                  >
                    <Icon className={`h-3.5 w-3.5 ${color}`} />
                  </div>
                  <p className="text-[11px] sm:text-xs font-medium text-stone-500">
                    {label}
                  </p>
                </div>
                <p className={`mt-1.5 text-xl sm:text-2xl font-bold ${color}`}>
                  {value}
                </p>
              </div>
            ))}
          </div>

          {/* Filters */}
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
              <input
                type="text"
                placeholder="Cari nama, username, email, atau role..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-xl border border-stone-200 bg-white py-2.5 pl-10 pr-4 text-sm text-stone-800 placeholder-stone-400 focus:border-amber-300 focus:outline-none focus:ring-2 focus:ring-amber-100 transition"
              />
            </div>
            <div className="flex gap-1 rounded-xl border border-stone-200 bg-white p-1">
              {(["all", "active", "inactive"] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setFilterStatus(s)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                    filterStatus === s
                      ? "bg-amber-500 text-white shadow-sm"
                      : "text-stone-500 hover:text-stone-700"
                  }`}
                >
                  {s === "all"
                    ? "Semua"
                    : s === "active"
                      ? "Aktif"
                      : "Nonaktif"}
                </button>
              ))}
            </div>
          </div>

          {/* Content */}
          {loading ? (
            <AccountsSkeleton />
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-16 sm:py-20 text-center px-4">
              <AlertTriangle className="mb-3 h-8 w-8 text-rose-400" />
              <p className="text-sm font-medium text-stone-700">{error}</p>
              <button
                onClick={fetchData}
                className="mt-4 rounded-md border border-stone-200 bg-white px-4 py-2.5 text-sm text-stone-700 hover:bg-stone-50 min-h-[44px]"
              >
                Coba lagi
              </button>
            </div>
          ) : filtered.length === 0 ? (
            <div className="rounded-xl border border-stone-100 bg-white py-16 text-center shadow-sm px-4">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-stone-100">
                <Users className="h-8 w-8 text-stone-400" />
              </div>
              <p className="text-sm font-medium text-stone-500">
                {search || filterStatus !== "all"
                  ? "Tidak ada akun yang sesuai filter"
                  : "Belum ada akun dalam tim ini"}
              </p>
              {!search && filterStatus === "all" && (
                <button
                  onClick={() => setModal("create")}
                  className="mt-3 text-sm font-semibold text-amber-600 hover:text-amber-700"
                >
                  + Tambah akun pertama
                </button>
              )}
            </div>
          ) : (
            <div className="overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm">
              {/* Desktop table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-stone-100 bg-stone-50">
                      {[
                        "Nama / Username",
                        "Role",
                        "Status",
                        "Login Terakhir",
                        "Dibuat",
                        "Aksi",
                      ].map((h) => (
                        <th
                          key={h}
                          className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-stone-500"
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {filtered.map((account) => (
                      <tr
                        key={account.id}
                        className="hover:bg-stone-50/60 transition-colors"
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <Avatar name={account.full_name} />
                            <div>
                              <p className="font-medium text-stone-800">
                                {account.full_name}
                              </p>
                              <p className="text-xs text-stone-400">
                                @{account.username}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          {account.role ? (
                            <div className="flex flex-col gap-0.5">
                              <span className="inline-flex rounded-md bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700 ring-1 ring-amber-200">
                                {roleLabel(account.role.name)}
                              </span>
                              <span
                                className={`inline-flex rounded-full border px-1.5 py-0.5 text-[10px] font-semibold ${roleGroupColor(
                                  account.role.role_group,
                                )}`}
                              >
                                {roleGroupLabel(account.role.role_group)}
                              </span>
                            </div>
                          ) : (
                            <span className="text-stone-400">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <StatusBadge status={account.status} />
                        </td>
                        <td className="px-4 py-3 text-xs text-stone-500">
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3 text-stone-400" />
                            {formatRelative(account.last_login)}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-xs text-stone-500">
                          {formatDate(account.created_at)}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1">
                            {/* Edit */}
                            <button
                              onClick={() => {
                                setSelectedAccount(account);
                                setModal("edit");
                              }}
                              title="Edit"
                              className="rounded-lg p-1.5 text-stone-400 hover:bg-amber-50 hover:text-amber-600 transition-colors"
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                            {/* Password */}
                            <button
                              onClick={() => {
                                setSelectedAccount(account);
                                setModal("password");
                              }}
                              title="Reset Password"
                              className="rounded-lg p-1.5 text-stone-400 hover:bg-blue-50 hover:text-blue-600 transition-colors"
                            >
                              <Key className="h-4 w-4" />
                            </button>
                            {/* Deactivate/Activate */}
                            <button
                              onClick={() => {
                                setSelectedAccount(account);
                                setModal("deactivate");
                              }}
                              title={
                                account.status === "active"
                                  ? "Nonaktifkan"
                                  : "Aktifkan"
                              }
                              className={`rounded-lg p-1.5 transition-colors ${
                                account.status === "active"
                                  ? "text-stone-400 hover:bg-yellow-50 hover:text-yellow-600"
                                  : "text-stone-300 hover:bg-emerald-50 hover:text-emerald-600"
                              }`}
                            >
                              {account.status === "active" ? (
                                <ShieldOff className="h-4 w-4" />
                              ) : (
                                <Shield className="h-4 w-4" />
                              )}
                            </button>
                            {/* Delete */}
                            <button
                              onClick={() => {
                                setSelectedAccount(account);
                                setModal("delete");
                              }}
                              title="Hapus Akun"
                              className="rounded-lg p-1.5 text-stone-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile cards */}
              <div className="divide-y divide-stone-100 md:hidden">
                {filtered.map((account) => (
                  <div key={account.id} className="p-4">
                    <div className="flex items-start gap-3">
                      <Avatar name={account.full_name} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p className="truncate font-medium text-stone-800">
                            {account.full_name}
                          </p>
                          <StatusBadge status={account.status} />
                        </div>
                        <p className="text-xs text-stone-400">
                          @{account.username}
                        </p>
                        {account.role && (
                          <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                            <span className="inline-flex rounded-md bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700 ring-1 ring-amber-200">
                              {roleLabel(account.role.name)}
                            </span>
                            <span
                              className={`inline-flex rounded-full border px-1.5 py-0.5 text-[10px] font-semibold ${roleGroupColor(
                                account.role.role_group,
                              )}`}
                            >
                              {roleGroupLabel(account.role.role_group)}
                            </span>
                          </div>
                        )}
                        <div className="mt-1.5 flex items-center gap-3 text-xs text-stone-400">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {formatRelative(account.last_login)}
                          </span>
                          <span>{formatDate(account.created_at)}</span>
                        </div>
                      </div>
                    </div>
                    <div className="mt-3 flex gap-2">
                      <button
                        onClick={() => {
                          setSelectedAccount(account);
                          setModal("edit");
                        }}
                        className="flex-1 rounded-lg border border-stone-200 py-2.5 text-xs font-medium text-stone-700 hover:bg-stone-50 active:bg-stone-100 transition-colors flex items-center justify-center gap-1"
                      >
                        <Pencil className="h-3 w-3" />
                        Edit
                      </button>
                      <button
                        onClick={() => {
                          setSelectedAccount(account);
                          setModal("password");
                        }}
                        className="flex-1 rounded-lg border border-blue-100 py-2.5 text-xs font-medium text-blue-600 hover:bg-blue-50 active:bg-blue-100 transition-colors flex items-center justify-center gap-1"
                      >
                        <Key className="h-3 w-3" />
                        Reset PW
                      </button>
                      <button
                        onClick={() => {
                          setSelectedAccount(account);
                          setModal("deactivate");
                        }}
                        className={`rounded-lg border px-2.5 py-2.5 text-xs font-medium transition-colors flex items-center justify-center ${
                          account.status === "active"
                            ? "border-yellow-200 text-yellow-600 hover:bg-yellow-50 active:bg-yellow-100"
                            : "border-emerald-200 text-emerald-600 hover:bg-emerald-50 active:bg-emerald-100"
                        }`}
                        title={
                          account.status === "active"
                            ? "Nonaktifkan"
                            : "Aktifkan"
                        }
                      >
                        {account.status === "active" ? (
                          <ShieldOff className="h-3.5 w-3.5" />
                        ) : (
                          <Shield className="h-3.5 w-3.5" />
                        )}
                      </button>
                      <button
                        onClick={() => {
                          setSelectedAccount(account);
                          setModal("delete");
                        }}
                        className="rounded-lg border border-red-100 px-2.5 py-2.5 text-xs font-medium text-red-500 hover:bg-red-50 active:bg-red-100 transition-colors flex items-center justify-center"
                        title="Hapus Akun"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Modals */}
      {modal === "create" && (
        <CreateModal
          roles={roles}
          onClose={closeModal}
          onCreated={handleCreated}
        />
      )}
      {modal === "edit" && selectedAccount && (
        <EditModal
          account={selectedAccount}
          roles={roles}
          onClose={closeModal}
          onUpdated={handleUpdated}
        />
      )}
      {modal === "password" && selectedAccount && (
        <PasswordModal account={selectedAccount} onClose={closeModal} />
      )}
      {modal === "deactivate" && selectedAccount && (
        <DeactivateModal
          account={selectedAccount}
          onClose={closeModal}
          onDeactivated={handleDeactivated}
        />
      )}
      {modal === "delete" && selectedAccount && (
        <DeleteModal
          account={selectedAccount}
          onClose={closeModal}
          onDeleted={handleDeleted}
        />
      )}
    </div>
  );
}
