"use client";

import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import { type AlertState, type Branch } from "./shared";

interface BranchFormState {
  name: string;
  code: string;
  address: string;
  phone: string;
  email: string;
  pic: string;
  status: Branch["status"];
}

interface BranchFormProps {
  isEditMode: boolean;
  isSaving: boolean;
  form: BranchFormState;
  setForm: (f: BranchFormState) => void;
  onSave: () => void;
  onClose: () => void;
  showAlert: (type: NonNullable<AlertState>["type"], message: string) => void;
}

export function BranchForm({
  isEditMode,
  isSaving,
  form,
  setForm,
  onSave,
  onClose,
}: BranchFormProps) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <Input
          label="Nama Cabang"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          placeholder="Contoh: Cabang Jakarta Barat"
          disabled={isSaving}
        />
        <Input
          label="Kode Cabang"
          value={form.code}
          onChange={(e) =>
            setForm({ ...form, code: e.target.value.toUpperCase() })
          }
          placeholder="Contoh: CBG-JKT-B"
          disabled={isSaving}
        />
      </div>
      <Input
        label="Alamat Lengkap"
        value={form.address}
        onChange={(e) => setForm({ ...form, address: e.target.value })}
        placeholder="Jl. Contoh No. 123, Kota"
        disabled={isSaving}
      />
      <div className="grid grid-cols-2 gap-4">
        <Input
          label="Nomor Telepon"
          value={form.phone}
          onChange={(e) => setForm({ ...form, phone: e.target.value })}
          placeholder="(021) 1234567"
          disabled={isSaving}
        />
        <Input
          label="Email"
          type="email"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          placeholder="cabang@company.com"
          disabled={isSaving}
        />
      </div>
      <Input
        label="PIC (Person in Charge)"
        value={form.pic}
        onChange={(e) => setForm({ ...form, pic: e.target.value })}
        placeholder="Nama penanggung jawab"
        disabled={isSaving}
      />
      <div>
        <label className="block text-sm font-medium text-cream mb-1">
          Status
        </label>
        <select
          value={form.status}
          onChange={(e) =>
            setForm({ ...form, status: e.target.value as Branch["status"] })
          }
          className="w-full px-3 py-2 border border-gold/25 rounded-lg focus:ring-2 focus:ring-indigo-500 bg-cocoa"
          disabled={isSaving}
        >
          <option value="active">Aktif</option>
          <option value="inactive">Nonaktif</option>
        </select>
      </div>
      <div className="flex justify-end gap-3 mt-6">
        <Button variant="secondary" onClick={onClose} disabled={isSaving}>
          Batal
        </Button>
        <Button variant="primary" onClick={onSave} isLoading={isSaving}>
          {isEditMode ? "Simpan Perubahan" : "Tambah Cabang"}
        </Button>
      </div>
    </div>
  );
}
