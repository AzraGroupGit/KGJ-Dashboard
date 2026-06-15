"use client";

import { Shield, Settings, Users } from "lucide-react";
import type { NewUserType } from "./shared";

interface UserTypePickerProps {
  onSelect: (type: NewUserType) => void;
}

export function UserTypePicker({ onSelect }: UserTypePickerProps) {
  return (
    <div className="space-y-3 py-2">
      <p className="text-sm text-gray-500 mb-4">
        Pilih tipe akun yang ingin dibuat:
      </p>
      <button
        onClick={() => onSelect("bms")}
        className="w-full flex items-start gap-4 p-4 rounded-xl border-2 border-gray-200 hover:border-indigo-400 hover:bg-indigo-50 transition-all text-left"
      >
        <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center shrink-0">
          <Shield className="w-5 h-5 text-purple-600" />
        </div>
        <div>
          <p className="font-semibold text-gray-800">Akun BMS</p>
          <p className="text-xs text-gray-500 mt-0.5">
            Super Admin, Customer Service, Marketing — login dengan email
          </p>
        </div>
      </button>
      <button
        onClick={() => onSelect("supervisor")}
        className="w-full flex items-start gap-4 p-4 rounded-xl border-2 border-gray-200 hover:border-rose-400 hover:bg-rose-50 transition-all text-left"
      >
        <div className="w-10 h-10 rounded-lg bg-rose-100 flex items-center justify-center shrink-0">
          <Settings className="w-5 h-5 text-rose-600" />
        </div>
        <div>
          <p className="font-semibold text-gray-800">Akun Supervisor</p>
          <p className="text-xs text-gray-500 mt-0.5">
            Supervisor Operasional atau Produksi — satu per tipe, login dengan username
          </p>
        </div>
      </button>
      <button
        onClick={() => onSelect("oprprd")}
        className="w-full flex items-start gap-4 p-4 rounded-xl border-2 border-gray-200 hover:border-orange-400 hover:bg-orange-50 transition-all text-left"
      >
        <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center shrink-0">
          <Users className="w-5 h-5 text-orange-600" />
        </div>
        <div>
          <p className="font-semibold text-gray-800">Akun Operasional / Produksi</p>
          <p className="text-xs text-gray-500 mt-0.5">
            Tim Operasional & Produksi — login dengan username
          </p>
        </div>
      </button>
    </div>
  );
}
