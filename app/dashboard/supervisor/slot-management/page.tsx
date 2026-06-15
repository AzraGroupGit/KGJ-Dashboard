"use client";

import { useEffect, useState, useRef, startTransition } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetcher } from "@/lib/api";
import Sidebar from "@/components/layout/MobileSidebar";
import Header from "@/components/layout/Header";
import { Loader2, Plus, Trash2, Calendar, AlertTriangle, Pencil } from "lucide-react";

interface SlotCategory {
  id: string;
  key: string;
  label: string;
  lead_time_min: number;
  lead_time_max: number | null;
  max_slots: number;
  is_active: boolean;
  sort_order: number;
  used: number;
  overrides: number;
  total_slots: number;
  available: number;
}

interface SlotOverride {
  id: string;
  category_id: string;
  date: string;
  note: string | null;
  added_by: { full_name: string } | null;
  created_at: string;
}

interface UserInfo {
  id: string;
  full_name: string;
  roleName: string;
}

export default function SlotManagementPage() {
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userEmail, setUserEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<SlotCategory[]>([]);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);
  const [editModal, setEditModal] = useState<SlotCategory | null>(null);
  const [editLeadMin, setEditLeadMin] = useState(0);
  const [editLeadMax, setEditLeadMax] = useState(0);
  const [editMaxSlots, setEditMaxSlots] = useState(0);
  const [saving, setSaving] = useState(false);
  const [forceModal, setForceModal] = useState<{ category: SlotCategory } | null>(null);
  const [forceNote, setForceNote] = useState("");
  const [overrides, setOverrides] = useState<SlotOverride[]>([]);
  const [showOverrides, setShowOverrides] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const hasAutoSwitched = useRef(false);

  useEffect(() => {
    async function init() {
      try {
      const meRes = await fetch("/api/me");
      const meJson = await meRes.json();
      if (meJson.success && meJson.data) {
        setUserInfo({
          id: meJson.data.id,
          full_name: meJson.data.full_name,
          roleName: meJson.data.role?.name ?? "",
        });
        setUserEmail(meJson.data.username || "");
      }
      } catch (err) {
        console.error(err);
      }
      setLoading(false);
    }
    init();
  }, []);

  interface CategoriesResponse { success: boolean; data: Record<string, unknown>[]; nearest_date?: string; }
  interface OverridesResponse { success: boolean; data: Record<string, unknown>[]; }

  const {
    data: categoriesData,
    refetch: refetchCategories,
  } = useQuery<CategoriesResponse>({
    queryKey: ["slot-categories", selectedDate],
    queryFn: () => fetcher(`/api/slots/slot-categories?date=${selectedDate}`),
    enabled: !!userInfo,
  });

  const {
    data: overridesData,
    refetch: refetchOverrides,
  } = useQuery<OverridesResponse>({
    queryKey: ["slot-overrides", selectedDate],
    queryFn: () => fetcher(`/api/slots/slot-overrides?date=${selectedDate}`),
    enabled: !!userInfo,
  });

  useEffect(() => {
    if (categoriesData?.success) {
      startTransition(() => {
        setCategories(categoriesData.data as unknown as SlotCategory[]);
        if (categoriesData.nearest_date && !hasAutoSwitched.current && categoriesData.nearest_date !== selectedDate) {
          hasAutoSwitched.current = true;
          setSelectedDate(categoriesData.nearest_date);
          setMessage({
            type: "success",
            text: `Menampilkan slot untuk tanggal ${new Date(categoriesData.nearest_date).toLocaleDateString("id-ID")} (tanggal order terdekat)`,
          });
        }
      });
    }
  }, [categoriesData, selectedDate]);

  useEffect(() => {
    if (overridesData?.success) {
      startTransition(() => {
        setOverrides(overridesData.data as unknown as SlotOverride[]);
      });
    }
  }, [overridesData]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-50">
        <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
      </div>
    );
  }

  if (!userInfo) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-50">
        <p className="text-red-500">Gagal memuat data user.</p>
      </div>
    );
  }

  if (userInfo.roleName !== "operational_supervisor") {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-50">
        <div className="text-center max-w-md p-8">
          <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-800 mb-2">Akses Terbatas</h2>
          <p className="text-gray-500">Halaman ini hanya untuk Operational Supervisor.</p>
        </div>
      </div>
    );
  }

  async function handleEditSave() {
    if (!editModal) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/slots/slot-categories/${editModal.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lead_time_min: editLeadMin,
          lead_time_max: editLeadMax,
          max_slots: editMaxSlots,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setMessage({ type: "success", text: "Kategori berhasil diperbarui" });
        setEditModal(null);
        refetchCategories();
      } else {
        setMessage({ type: "error", text: json.error || "Gagal menyimpan" });
      }
    } catch {
      setMessage({ type: "error", text: "Gagal menyimpan" });
    }
    setSaving(false);
  }

  async function handleForceAdd() {
    if (!forceModal) return;
    setSaving(true);
    try {
      const res = await fetch("/api/slots/slot-overrides", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category_id: forceModal.category.id,
          date: selectedDate,
          note: forceNote || null,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setMessage({ type: "success", text: `Slot tambahan berhasil ditambahkan` });
        setForceModal(null);
        setForceNote("");
        refetchCategories();
        refetchOverrides();
      } else {
        setMessage({ type: "error", text: json.error || "Gagal menambah slot" });
      }
    } catch {
      setMessage({ type: "error", text: "Gagal menambah slot" });
    }
    setSaving(false);
  }

  async function handleDeleteOverride(id: string) {
    try {
      const res = await fetch(`/api/slots/slot-overrides/${id}`, { method: "DELETE" });
      const json = await res.json();
      if (json.success) {
        setMessage({ type: "success", text: "Override berhasil dihapus" });
        refetchCategories();
        refetchOverrides();
      }
    } catch {
      setMessage({ type: "error", text: "Gagal menghapus override" });
    }
  }

  return (
    <div className="flex flex-col md:flex-row h-screen bg-slate-50">
      <Sidebar role="supervisor" isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header
          userEmail={userEmail}
          role="supervisor"
          logoutPath="/workshop/login"
          onMenuClick={() => setSidebarOpen(true)}
        />

        <div className="flex-1 overflow-y-auto p-4 md:p-6">
          {/* Message */}
          {message && (
            <div
              className={`mb-4 p-3 rounded-lg text-sm ${
                message.type === "success"
                  ? "bg-green-50 text-green-700 border border-green-200"
                  : "bg-red-50 text-red-700 border border-red-200"
              }`}
            >
              {message.text}
              <button className="float-right font-bold" onClick={() => setMessage(null)}>×</button>
            </div>
          )}

          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <div>
              <h1 className="text-xl font-bold text-gray-800">Slot Management</h1>
              <p className="text-sm text-gray-500 mt-1">Kelola kapasitas produksi per kategori</p>
            </div>
            <div className="flex items-center gap-3">
              <Calendar className="w-4 h-4 text-gray-400" />
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white"
              />
            </div>
          </div>

          {/* Kategori Table */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden mb-6">
            <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-gray-700">Daftar Kategori</h2>
              <button
                onClick={() => setShowOverrides(!showOverrides)}
                className="text-xs text-indigo-600 hover:underline"
              >
                {showOverrides ? "Sembunyikan Override" : `Lihat Override (${overrides.length})`}
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    <th className="text-left px-4 py-3 font-medium text-gray-500 text-xs uppercase tracking-wider">Kategori</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-500 text-xs uppercase tracking-wider">Lead Time (hari)</th>
                    <th className="text-center px-4 py-3 font-medium text-gray-500 text-xs uppercase tracking-wider">Max Slot</th>
                    <th className="text-center px-4 py-3 font-medium text-gray-500 text-xs uppercase tracking-wider">Terpakai</th>
                    <th className="text-center px-4 py-3 font-medium text-gray-500 text-xs uppercase tracking-wider">Tersedia</th>
                    <th className="text-center px-4 py-3 font-medium text-gray-500 text-xs uppercase tracking-wider">Usage</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-500 text-xs uppercase tracking-wider">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {categories.map((cat) => {
                    const usagePct = cat.max_slots > 0 ? Math.round((cat.used / cat.total_slots) * 100) : 0;
                    const barColor =
                      usagePct >= 100 ? "bg-red-500" : usagePct >= 80 ? "bg-amber-500" : "bg-emerald-500";
                    return (
                      <tr key={cat.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                        <td className="px-4 py-3">
                          <span className="font-medium text-gray-800">{cat.label}</span>
                          <span className="ml-2 text-[11px] text-gray-400 uppercase">{cat.key}</span>
                        </td>
                        <td className="px-4 py-3 text-gray-600">
                          {cat.lead_time_max && cat.lead_time_max !== cat.lead_time_min
                            ? `${cat.lead_time_min} - ${cat.lead_time_max}`
                            : cat.lead_time_min}
                        </td>
                        <td className="px-4 py-3 text-center text-gray-800 font-medium">{cat.max_slots}</td>
                        <td className="px-4 py-3 text-center">
                          <span className={`font-medium ${cat.used >= cat.total_slots ? "text-red-600" : "text-gray-700"}`}>
                            {cat.used}
                          </span>
                          {cat.overrides > 0 && (
                            <span className="text-[11px] text-amber-500 ml-1">(+{cat.overrides})</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={`font-medium ${cat.available <= 0 ? "text-red-600" : cat.available <= 2 ? "text-amber-600" : "text-emerald-600"}`}>
                            {cat.available}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all ${barColor}`}
                                style={{ width: `${Math.min(usagePct, 100)}%` }}
                              />
                            </div>
                            <span className="text-[11px] text-gray-500 w-8 text-right">{usagePct}%</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => {
                                setEditModal(cat);
                                setEditLeadMin(cat.lead_time_min);
                                setEditLeadMax(cat.lead_time_max ?? cat.lead_time_min);
                                setEditMaxSlots(cat.max_slots);
                              }}
                              className="p-1.5 rounded-lg hover:bg-indigo-50 text-gray-400 hover:text-indigo-600 transition-colors"
                              title="Edit kategori"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setForceModal({ category: cat })}
                              className="p-1.5 rounded-lg hover:bg-amber-50 text-gray-400 hover:text-amber-600 transition-colors"
                              title="Tambah slot (override)"
                            >
                              <Plus className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Override List */}
          {showOverrides && overrides.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden mb-6">
              <div className="px-4 py-3 border-b border-gray-100">
                <h2 className="text-sm font-semibold text-gray-700">Daftar Override</h2>
              </div>
              <div className="divide-y divide-gray-50">
                {overrides.map((ov) => (
                  <div key={ov.id} className="px-4 py-2.5 flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-700">
                        {categories.find((c) => c.id === ov.category_id)?.label || ov.category_id}
                      </p>
                      <p className="text-xs text-gray-400">
                        {ov.note || "Tanpa catatan"} — oleh {ov.added_by?.full_name || "—"}
                      </p>
                    </div>
                    <button
                      onClick={() => handleDeleteOverride(ov.id)}
                      className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-600 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Keterangan */}
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
            <p className="font-medium mb-1">Informasi</p>
            <ul className="list-disc list-inside space-y-1 text-amber-700">
              <li>Slot terhitung berdasarkan <strong>deadline</strong> order, bukan tanggal order</li>
              <li>Jika slot penuh, CS akan mendapat peringatan lunak — order tetap bisa diproses</li>
              <li>Override digunakan untuk menambah slot secara manual oleh supervisor</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Edit Modal */}
      {editModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => !saving && setEditModal(null)}>
          <div className="bg-white rounded-xl shadow-xl border border-gray-200 w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-gray-800 mb-1">Edit Kategori</h3>
            <p className="text-sm text-gray-500 mb-4">{editModal.label}</p>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Lead Time Min (hari kerja)</label>
                <input type="number" min={1} value={editLeadMin} onChange={(e) => setEditLeadMin(Number(e.target.value))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Lead Time Max (hari kerja)</label>
                <input type="number" min={1} value={editLeadMax} onChange={(e) => setEditLeadMax(Number(e.target.value))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Max Slot per Hari</label>
                <input type="number" min={1} value={editMaxSlots} onChange={(e) => setEditMaxSlots(Number(e.target.value))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setEditModal(null)} disabled={saving}
                className="flex-1 px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50">
                Batal
              </button>
              <button onClick={handleEditSave} disabled={saving}
                className="flex-1 px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                Simpan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Force Add Modal */}
      {forceModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => !saving && setForceModal(null)}>
          <div className="bg-white rounded-xl shadow-xl border border-gray-200 w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-gray-800 mb-1">Tambah Slot (Override)</h3>
            <p className="text-sm text-gray-500 mb-4">
              {forceModal.category.label} — {new Date(selectedDate).toLocaleDateString("id-ID")}
            </p>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Catatan (opsional)</label>
              <textarea value={forceNote} onChange={(e) => setForceNote(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm resize-none h-20"
                placeholder="Misal: VIP customer, event khusus..." />
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => { setForceModal(null); setForceNote(""); }} disabled={saving}
                className="flex-1 px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50">
                Batal
              </button>
              <button onClick={handleForceAdd} disabled={saving}
                className="flex-1 px-4 py-2 text-sm bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                Tambah Slot
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
