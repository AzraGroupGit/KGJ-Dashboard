// app/dashboard/supervisor/personnel/page.tsx

"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/layout/MobileSidebar";
import Header from "@/components/layout/MobileHeader";
import { Search, Trash2, Plus, X, Save } from "lucide-react";

interface PersonnelUser {
  id: string;
  full_name: string;
  username: string | null;
  email: string | null;
  status: string | null;
  role_name: string;
  role_group: string;
  assignments: Assignment[];
}

interface Assignment {
  id: string;
  user_id: string;
  stage: string;
  person_code: string;
  sub_type: string | null;
  sort_order: number;
}

export default function PersonnelPage() {
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userEmail, setUserEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<PersonnelUser[]>([]);
  const [stages, setStages] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const [assignModal, setAssignModal] = useState<{ user: PersonnelUser } | null>(null);
  const [assignStage, setAssignStage] = useState("");
  const [assignSubType, setAssignSubType] = useState("");
  const [assignCode, setAssignCode] = useState("");
  const [saving, setSaving] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/supervisor/personnel");
      const json = await res.json();
      if (json.success) {
        setUsers(json.data.users);
        setStages(json.data.stages);
      }
    } catch {
      setMessage({ type: "error", text: "Gagal memuat data" });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    (async () => {
      const res = await fetch("/api/me");
      if (!res.ok) {
        router.push("/workshop/login");
        return;
      }
      const json = await res.json();
      setUserEmail(json.data.username || json.data.full_name || "");
      fetchData();
    })();
  }, [router, fetchData]);

  const filtered = users.filter((u) =>
    !search ||
    u.full_name.toLowerCase().includes(search.toLowerCase()) ||
    u.role_name.toLowerCase().includes(search.toLowerCase()) ||
    u.assignments.some((a) => a.person_code.toLowerCase().includes(search.toLowerCase()))
  );

  async function handleDelete(id: string) {
    const res = await fetch(`/api/supervisor/personnel?id=${id}`, { method: "DELETE" });
    const json = await res.json();
    if (json.success) {
      setMessage({ type: "success", text: "Berhasil dihapus" });
      fetchData();
    } else {
      setMessage({ type: "error", text: json.error || "Gagal menghapus" });
    }
  }

  async function handleAssign(e: React.FormEvent) {
    e.preventDefault();
    if (!assignModal || !assignStage || !assignCode) return;
    setSaving(true);
    const body: Record<string, any> = { user_id: assignModal.user.id, stage: assignStage, person_code: assignCode };
    if (assignStage === "laser") body.sub_type = assignSubType;
    const res = await fetch("/api/supervisor/personnel", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const json = await res.json();
    if (json.success) {
      setMessage({ type: "success", text: "Person berhasil ditambahkan" });
      setAssignModal(null);
      setAssignStage("");
      setAssignSubType("");
      setAssignCode("");
      fetchData();
    } else {
      setMessage({ type: "error", text: json.error || "Gagal menambahkan" });
    }
    setSaving(false);
  }

  // ── UI ──────────────────────────────────────────────────────────────────

  return (
    <div className="flex h-screen bg-gray-50">
        <Sidebar role="supervisor" isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header
          userEmail={userEmail}
          role="supervisor"
          onMenuClick={() => setSidebarOpen(true)}
        />
        <main className="flex-1 overflow-y-auto p-4 sm:p-6">
          <div className="max-w-6xl mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-xl font-bold text-gray-900">Personnel Management</h1>
                <p className="text-sm text-gray-500 mt-1">Atur penugasan person untuk setiap tahap produksi</p>
              </div>
            </div>

            {/* Alert */}
            {message && (
              <div className={`p-3 rounded-lg mb-4 text-sm flex items-center justify-between ${
                message.type === "success" ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-red-50 text-red-700 border border-red-200"
              }`}>
                <span>{message.text}</span>
                <button onClick={() => setMessage(null)}><X className="w-4 h-4" /></button>
              </div>
            )}

            {/* Search */}
            <div className="relative mb-6 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Cari nama, role, atau kode person..."
                className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            {/* Table */}
            {loading ? (
              <div className="text-center py-12 text-gray-500">Memuat data...</div>
            ) : (
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-200">
                        <th className="text-left px-4 py-3 font-semibold text-gray-600">Nama</th>
                        <th className="text-left px-4 py-3 font-semibold text-gray-600">Role</th>
                        <th className="text-left px-4 py-3 font-semibold text-gray-600">Group</th>
                        <th className="text-left px-4 py-3 font-semibold text-gray-600">Penugasan</th>
                        <th className="text-right px-4 py-3 font-semibold text-gray-600">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {filtered.map((u) => (
                        <tr key={u.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3">
                            <div className="font-medium text-gray-900">{u.full_name}</div>
                            <div className="text-xs text-gray-500">{u.username || u.email}</div>
                          </td>
                          <td className="px-4 py-3">
                            <span className="inline-block px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700">
                              {u.role_name}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                              u.role_group === "production"
                                ? "bg-amber-100 text-amber-700"
                                : "bg-blue-100 text-blue-700"
                            }`}>
                              {u.role_group}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex flex-wrap gap-1.5">
                              {u.assignments.length > 0 ? (
                                u.assignments.map((a) => (
                                  <div key={a.id} className="group relative inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 text-xs border border-indigo-200">
                                    <span className="font-medium">{a.person_code}</span>
                                    <span className="text-indigo-400">—</span>
                                    <span className="text-indigo-500">{a.stage}{a.sub_type ? ` (${a.sub_type})` : ""}</span>
                                    <button
                                      onClick={() => handleDelete(a.id)}
                                      className="ml-0.5 text-indigo-300 hover:text-red-500 transition-colors"
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </button>
                                  </div>
                                ))
                              ) : (
                                <span className="text-xs text-gray-400">Belum ada penugasan</span>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <button
                              onClick={() => setAssignModal({ user: u })}
                              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium text-indigo-600 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 transition-colors"
                            >
                              <Plus className="w-3.5 h-3.5" />
                              Tambah
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {filtered.length === 0 && (
                  <div className="text-center py-12 text-gray-500">
                    Tidak ada data yang sesuai
                  </div>
                )}
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Assign Modal */}
      {assignModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <form onSubmit={handleAssign}>
              <div className="p-6">
                <h2 className="text-lg font-bold text-gray-900 mb-1">Tambah Penugasan</h2>
                <p className="text-sm text-gray-500 mb-4">{assignModal.user.full_name} — {assignModal.user.role_name}</p>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Stage</label>
                    <select
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      value={assignStage}
                      onChange={(e) => setAssignStage(e.target.value)}
                      required
                    >
                      <option value="">Pilih stage</option>
                      {stages.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Kode Person</label>
                    <input
                      type="text"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 uppercase"
                      placeholder="Contoh: PR"
                      value={assignCode}
                      onChange={(e) => setAssignCode(e.target.value.toUpperCase())}
                      maxLength={10}
                      required
                    />
                  </div>

                  {assignStage === "laser" && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Tipe Laser</label>
                      <select
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        value={assignSubType}
                        onChange={(e) => setAssignSubType(e.target.value)}
                        required
                      >
                        <option value="">Pilih tipe</option>
                        <option value="batik">Batik</option>
                        <option value="nama">Nama</option>
                      </select>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 px-6 py-4 bg-gray-50 rounded-b-xl border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setAssignModal(null)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={saving || !assignStage || !assignCode || (assignStage === "laser" && !assignSubType)}
                  className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? "Menyimpan..." : <><Save className="w-4 h-4" /> Simpan</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
