// app/dashboard/cs/input-order/page.tsx

"use client";

import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { fetcher } from "@/lib/api";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/layout/Sidebar";
import Header from "@/components/layout/Header";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Modal from "@/components/ui/Modal";
import Loading from "@/components/ui/Loading";
import Alert from "@/components/ui/Alert";
import { getClientUser, type ClientUser } from "@/lib/auth/session";
import type { CsOrder } from "@/types/cs-orders";
import {
  countWorkingDays,
  getRecommendedKategori,
  KATEGORI_THRESHOLDS,
} from "@/lib/working-days";
import { Plus, ClipboardList, Eye, Pencil, Trash2, CheckCircle, Download, Check, AlertTriangle } from "lucide-react";
import { OrderFormDataSchema, type OrderFormData, getOrderFormErrors } from "@/lib/schemas/cs-order";
import {
  DRAFT_INTERVAL,
  draftKey,
  today,
  emptyFormData,
  paymentCategory,
  csOrderToFormData,
  formDataToPatch,
} from "./_components/shared";
import { RefImageUpload } from "./_components/RefImageUpload";
import { FormStatusBadge } from "./_components/FormStatusBadge";
import { CopyLinkButton } from "./_components/CopyLinkButton";
import { OrderFormFields } from "./_components/OrderFormFields";

export default function InputOrderPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [user, setUser] = useState<ClientUser | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [workingDays, setWorkingDays] = useState<number | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState<"pria" | "wanita" | null>(null);

  // modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [showFormModal, setShowFormModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showClearDraftConfirm, setShowClearDraftConfirm] = useState(false);

  // create step 1
  const [newCustomerName, setNewCustomerName] = useState("");
  const [newTglChat, setNewTglChat] = useState(today);
  const [newTipePembayaran, setNewTipePembayaran] = useState("");

  // generated link result
  const [generatedOrder, setGeneratedOrder] = useState<CsOrder | null>(null);
  const [linkCopied, setLinkCopied] = useState(false);

  // edit / view
  const [selectedOrder, setSelectedOrder] = useState<CsOrder | null>(null);
  const [formData, setFormData] = useState<OrderFormData>(emptyFormData());
  const [isViewOnly, setIsViewOnly] = useState(false);
  const [draftRestored, setDraftRestored] = useState(false);
  const [draftSavedAt, setDraftSavedAt] = useState<string | null>(null);

  // delete
  const [orderToDelete, setOrderToDelete] = useState<CsOrder | null>(null);

  const [alert, setAlert] = useState<{
    type: "success" | "error" | "warning" | "info";
    message: string;
  } | null>(null);

  const showAlert = (
    type: "success" | "error" | "warning" | "info",
    message: string,
  ) => {
    setAlert({ type, message });
    setTimeout(() => setAlert(null), 3500);
  };

  // ── Data loading ─────────────────────────────────────────────

  useEffect(() => {
    const clientUser = getClientUser();
    if (!clientUser) {
      router.push("/login");
      return;
    }
    setUser(clientUser);
  }, [router]);

  const { data: orders = [], isLoading } = useQuery<CsOrder[]>({
    queryKey: ["cs-orders", "input-order"],
    queryFn: async () => {
      const res = await fetcher<{ data: CsOrder[] }>("/api/cs/orders");
      return res.data ?? [];
    },
  });

  const invalidateOrders = () => queryClient.invalidateQueries({ queryKey: ["cs-orders"] });

  const _orders = Array.isArray(orders) ? orders : [];

  // ── Stats ─────────────────────────────────────────────────────

  const totalOrders = _orders.length;
  const menunggu = _orders.filter((o) => o.form_status === "pending").length;
  const perluDireview = _orders.filter((o) => o.form_status === "submitted").length;
  const sudahDireview = _orders.filter((o) => o.form_status === "reviewed" || o.form_status === "converted").length;
  const bulanIni = _orders.filter((o) => o.tgl_order.startsWith(today.slice(0, 7))).length;

  // ── Handlers: Create ──────────────────────────────────────────

  const openCreateModal = () => {
    setNewCustomerName("");
    setNewTglChat(today);
    setNewTipePembayaran("");
    setShowCreateModal(true);
  };

  const handleCreate = async () => {
    if (!newCustomerName.trim()) { showAlert("error", "Nama customer wajib diisi"); return; }
    setIsSaving(true);
    try {
      const res = await fetch("/api/cs/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customer_name: newCustomerName.trim(), tgl_chat: newTglChat, transfer_ke_bank: newTipePembayaran || null }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Gagal membuat order");
      await invalidateOrders();
      setShowCreateModal(false);
      setGeneratedOrder(body.data);
      setLinkCopied(false);
      setShowLinkModal(true);
    } catch (e) {
      showAlert("error", e instanceof Error ? e.message : "Terjadi kesalahan");
    } finally {
      setIsSaving(false);
    }
  };

  // ── Handlers: Copy link ────────────────────────────────────────

  const getFormUrl = (order: CsOrder) =>
    `${typeof window !== "undefined" ? window.location.origin : ""}/order-form/${order.form_token}`;

  const copyLink = async (order: CsOrder) => {
    try {
      await navigator.clipboard.writeText(getFormUrl(order));
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    } catch {
      showAlert("error", "Gagal menyalin link");
    }
  };

  // ── Handlers: Edit / View ──────────────────────────────────────

  const openForm = (order: CsOrder, viewOnly = false) => {
    localStorage.removeItem(draftKey(order.id));
    setSelectedOrder(order);
    setFormData(csOrderToFormData(order));
    setIsViewOnly(viewOnly);
    setDraftRestored(false);
    setDraftSavedAt(null);
    setShowFormModal(true);
  };

  const setField = <K extends keyof OrderFormData>(key: K, value: OrderFormData[K]) =>
    setFormData((prev) => ({ ...prev, [key]: value }));

  const handleHargaChange = (raw: string) => {
    const pct = parseInt(formData.dpPercent || "80", 10);
    setField("harga", raw);
    setField("dp", raw ? Math.round((parseInt(raw, 10) * pct) / 100).toString() : "");
  };

  useEffect(() => {
    if (formData.tglOrder && formData.deadline) {
      const days = countWorkingDays(formData.tglOrder, formData.deadline);
      setWorkingDays(days);
      const recommended = getRecommendedKategori(days);
      if (formData.kategori) {
        const t = KATEGORI_THRESHOLDS.find((k) => k.value === formData.kategori);
        if (t && days < t.minDays) setField("kategori", recommended ?? "");
      } else if (recommended) {
        setField("kategori", recommended);
      }
    } else {
      setWorkingDays(null);
    }
  }, [formData.tglOrder, formData.deadline, formData.kategori]);

  // ── Draft auto-save ──────────────────────────────────────────

  useEffect(() => {
    if (!showFormModal || !selectedOrder || isViewOnly) return;
    const key = draftKey(selectedOrder.id);
    const id = setInterval(() => {
      localStorage.setItem(key, JSON.stringify(formData));
      setDraftSavedAt(new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }));
    }, DRAFT_INTERVAL);
    return () => clearInterval(id);
  }, [showFormModal, selectedOrder, isViewOnly, formData]);

  useEffect(() => {
    if (!showFormModal || !selectedOrder || draftRestored) return;
    if (selectedOrder.form_status !== "pending") return;
    const raw = localStorage.getItem(draftKey(selectedOrder.id));
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as OrderFormData;
        setFormData(parsed);
        setDraftRestored(true);
      } catch { /* ignore corrupted draft */ }
    }
  }, [showFormModal, selectedOrder, draftRestored]);

  const clearDraft = () => {
    if (!selectedOrder) return;
    localStorage.removeItem(draftKey(selectedOrder.id));
    setDraftRestored(false);
    setDraftSavedAt(null);
  };

  const handleSaveForm = async () => {
    if (!selectedOrder) return;
    const result = OrderFormDataSchema.safeParse(formData);
    if (!result.success) {
      const errors = getOrderFormErrors(result.error);
      const firstError = Object.values(errors).find(Boolean);
      showAlert("error", firstError || "Lengkapi data yang wajib diisi");
      return;
    }
    setIsSaving(true);
    try {
      const patch: Record<string, unknown> = formDataToPatch(formData);
      if (selectedOrder.form_status === "pending" || selectedOrder.form_status === "submitted") {
        patch.form_status = "reviewed";
        patch.reviewed_at = new Date().toISOString();
      }
      const res = await fetch(`/api/cs/orders/${selectedOrder.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Gagal menyimpan");
      await invalidateOrders();
      clearDraft();
      setShowFormModal(false);
      showAlert("success", "Data order berhasil disimpan");
    } catch (e) {
      showAlert("error", e instanceof Error ? e.message : "Terjadi kesalahan");
    } finally {
      setIsSaving(false);
    }
  };

  // ── Handlers: Delete ──────────────────────────────────────────

  const confirmDelete = (order: CsOrder) => { setOrderToDelete(order); setShowDeleteConfirm(true); };

  const handleDelete = async () => {
    if (!orderToDelete) return;
    setIsSaving(true);
    try {
      const res = await fetch(`/api/cs/orders/${orderToDelete.id}`, { method: "DELETE" });
      if (!res.ok) { const body = await res.json(); throw new Error(body.error || "Gagal menghapus order"); }
      await invalidateOrders();
      setShowDeleteConfirm(false);
      setOrderToDelete(null);
      showAlert("success", "Order berhasil dihapus");
    } catch (e) {
      showAlert("error", e instanceof Error ? e.message : "Terjadi kesalahan");
    } finally { setIsSaving(false); }
  };

  // ── Handlers: Mark Reviewed ───────────────────────────────────

  const handleMarkReviewed = async () => {
    if (!selectedOrder) return;
    setIsSaving(true);
    try {
      const res = await fetch(`/api/cs/orders/${selectedOrder.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ form_status: "reviewed", reviewed_at: new Date().toISOString() }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Gagal menandai review");
      await invalidateOrders();
      setShowFormModal(false);
      showAlert("success", "Order ditandai sudah direview");
    } catch (e) {
      showAlert("error", e instanceof Error ? e.message : "Terjadi kesalahan");
    } finally { setIsSaving(false); }
  };

  // ── Handlers: Reference image upload ─────────────────────────

  const handleImageUpload = async (side: "pria" | "wanita", file: File) => {
    if (!selectedOrder) return;
    setIsUploadingImage(side);
    try {
      const fd = new FormData(); fd.append("file", file); fd.append("side", side);
      const res = await fetch(`/api/cs/orders/${selectedOrder.id}/image`, { method: "POST", body: fd });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Gagal mengunggah");
      const field = side === "pria" ? "reference_image_pria_url" : "reference_image_wanita_url";
      setSelectedOrder((prev) => prev ? { ...prev, [field]: body.url } : prev);
      invalidateOrders();
      showAlert("success", `Foto referensi ${side} berhasil diunggah`);
    } catch (e) {
      showAlert("error", e instanceof Error ? e.message : "Terjadi kesalahan");
    } finally { setIsUploadingImage(null); }
  };

  // ── Handlers: Download PDF ────────────────────────────────────

  const handleDownloadPdf = async () => {
    if (!selectedOrder) return;
    setIsGeneratingPdf(true);
    try {
      const [{ pdf }, { OrderFormPDF }] = await Promise.all([
        import("@react-pdf/renderer"),
        import("@/components/pdf/OrderFormPDF"),
      ]);
      const blob = await pdf(<OrderFormPDF order={selectedOrder} />).toBlob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a"); a.href = url; a.download = `Order-${selectedOrder.order_number}.pdf`;
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch { showAlert("error", "Gagal membuat PDF. Coba lagi."); }
    finally { setIsGeneratingPdf(false); }
  };

  // ── Loading skeleton ───────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="flex h-screen bg-gray-50">
        <Sidebar role="customer_service" />
        <div className="flex-1 flex flex-col overflow-hidden">
          <Header userEmail="" role="customer_service" />
          <main className="flex-1 overflow-y-auto p-6">
            <Loading variant="skeleton" text="Memuat data order..." />
          </main>
        </div>
      </div>
    );
  }

  // ── Render ─────────────────────────────────────────────────────

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar role="customer_service" />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header userEmail={user?.email || ""} role="customer_service" />
        <main className="flex-1 overflow-y-auto p-6">
          {alert && (
            <div className="mb-6 animate-slide-down">
              <Alert type={alert.type} message={alert.message} onClose={() => setAlert(null)} autoClose duration={3500} />
            </div>
          )}

          {/* Page header */}
          <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-4 mb-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-800 mb-1">Input Order Cincin</h2>
              <p className="text-gray-600">Buat order baru dan kirimkan link formulir ke pelanggan</p>
            </div>
            <Button variant="primary" onClick={openCreateModal} leftIcon={<Plus className="w-4 h-4" />}>Buat Order Baru</Button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
            {[
              { label: "Total Order", value: totalOrders, accent: "border-indigo-500", color: "text-gray-800", sub: "semua waktu" },
              { label: "Menunggu Pengisian", value: menunggu, accent: "border-amber-500", color: "text-amber-600", sub: "belum diisi pelanggan" },
              { label: "Perlu Direview", value: perluDireview, accent: "border-orange-500", color: "text-orange-600", sub: "form terisi, belum direview" },
              { label: "Sudah Direview", value: sudahDireview, accent: "border-green-500", color: "text-green-600", sub: "sudah direview / dikonversi" },
              { label: "Bulan Ini", value: bulanIni, accent: "border-blue-500", color: "text-gray-800", sub: "order baru" },
            ].map(({ label, value, accent, color, sub }) => (
              <div key={label} className={`bg-white rounded-xl shadow-sm p-5 border-l-4 ${accent}`}>
                <p className="text-sm text-gray-500 mb-1">{label}</p>
                <p className={`text-2xl font-bold ${color}`}>{value}</p>
                <p className="text-xs text-gray-400 mt-1">{sub}</p>
              </div>
            ))}
          </div>

          {/* Table */}
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-800">Daftar Order</h3>
              <p className="text-sm text-gray-500">{_orders.length} order · urut dari terbaru</p>
            </div>
            {isLoading ? (
              <div className="p-10"><Loading variant="dots" text="Memuat order..." /></div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      {["No Order", "Nama Customer", "Tgl Order", "Deadline", "Harga", "Status Form", "Aksi"].map((h) => (
                        <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {_orders.length === 0 ? (
                      <tr><td colSpan={7} className="px-6 py-12 text-center text-gray-400">
                        <div className="flex flex-col items-center gap-2"><ClipboardList className="w-10 h-10 text-gray-300" /><p>Belum ada order. Klik <strong>Buat Order Baru</strong> untuk memulai.</p></div>
                      </td></tr>
                    ) : (
                      orders.map((order) => (
                        <tr key={order.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span className="font-mono text-sm font-medium text-indigo-600">{order.order_number}</span>
                            {order.transfer_ke_bank && (
                              <span className={`ml-1.5 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium ${paymentCategory(order.transfer_ke_bank) === "ke_pt" ? "bg-blue-100 text-blue-700" : "bg-green-100 text-green-700"}`}>
                                {paymentCategory(order.transfer_ke_bank) === "ke_pt" ? "Ke PT" : "Non PT / Cash"}
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 font-medium text-gray-800">{order.customer_name}</td>
                          <td className="px-4 py-3 whitespace-nowrap text-gray-600 text-sm">{new Date(order.tgl_order).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" })}</td>
                          <td className="px-4 py-3 whitespace-nowrap text-gray-600 text-sm">{order.deadline ? new Date(order.deadline).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" }) : <span className="text-gray-400">-</span>}</td>
                          <td className="px-4 py-3 whitespace-nowrap text-gray-700 text-sm">{order.harga != null && order.harga > 0 ? order.harga.toLocaleString("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }) : <span className="text-gray-400">-</span>}</td>
                          <td className="px-4 py-3 whitespace-nowrap"><FormStatusBadge status={order.form_status} /></td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div className="flex items-center gap-1">
                              <button onClick={() => openForm(order, true)} title="Lihat form" className="p-1.5 rounded-lg text-gray-500 hover:bg-indigo-50 hover:text-indigo-600 transition-colors"><Eye className="w-4 h-4" /></button>
                              <button onClick={() => openForm(order, false)} title="Edit form" className="p-1.5 rounded-lg text-gray-500 hover:bg-indigo-50 hover:text-indigo-600 transition-colors"><Pencil className="w-4 h-4" /></button>
                              <CopyLinkButton order={order} getFormUrl={getFormUrl} />
                              <button onClick={() => confirmDelete(order)} title="Hapus order" className="p-1.5 rounded-lg text-gray-500 hover:bg-red-50 hover:text-red-600 transition-colors"><Trash2 className="w-4 h-4" /></button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* ── Modal: Create Order ──────────────────────────── */}
      <Modal isOpen={showCreateModal} onClose={() => !isSaving && setShowCreateModal(false)} title="Buat Order Baru" size="sm">
        <div className="space-y-4">
          <p className="text-sm text-gray-500">Masukkan nama pelanggan, tanggal chat, dan tipe pembayaran untuk membuat nomor order dan link formulir.</p>
          <Input label="Nama Customer" value={newCustomerName} onChange={(e) => setNewCustomerName(e.target.value)} placeholder="Contoh: Budi Santoso" disabled={isSaving} autoFocus />
          <div><label className="block text-sm font-medium text-gray-700 mb-1">Tanggal Chat</label><input type="date" value={newTglChat} onChange={(e) => setNewTglChat(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-700" disabled={isSaving} /></div>
          <div><label className="block text-sm font-medium text-gray-700 mb-1">Tipe Pembayaran</label>
            <select value={newTipePembayaran} onChange={(e) => setNewTipePembayaran(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-700" disabled={isSaving}>
              <option value="">Pilih tipe pembayaran</option>
              <option value="Ke PT">Ke PT</option>
              <option value="Non PT / Cash">Non PT / Cash</option>
            </select>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={() => setShowCreateModal(false)} disabled={isSaving}>Batal</Button>
            <Button variant="primary" onClick={handleCreate} isLoading={isSaving} disabled={!newCustomerName.trim()}>Generate Link</Button>
          </div>
        </div>
      </Modal>

      {/* ── Modal: Link Generated ───────────────────────── */}
      <Modal isOpen={showLinkModal} onClose={() => setShowLinkModal(false)} title="Link Formulir Berhasil Dibuat" size="md">
        {generatedOrder && (
          <div className="space-y-4">
            <div className="flex items-start gap-3 bg-green-50 border border-green-200 rounded-lg p-4">
              <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-green-800">Order berhasil dibuat!</p>
                <p className="text-sm text-green-700 mt-0.5">No. Order: <strong>{generatedOrder.order_number}</strong></p>
                <p className="text-sm text-green-700">Customer: <strong>{generatedOrder.customer_name}</strong></p>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Link Formulir (salin & kirim ke pelanggan):</label>
              <div className="flex gap-2">
                <input type="text" readOnly value={getFormUrl(generatedOrder)} className="flex-1 px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-sm text-gray-700 font-mono" />
                <button onClick={() => copyLink(generatedOrder)} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${linkCopied ? "bg-green-600 text-white" : "bg-indigo-600 hover:bg-indigo-700 text-white"}`}>{linkCopied ? "Tersalin!" : "Salin"}</button>
              </div>
              <p className="text-xs text-gray-500 mt-1.5">Link ini bisa dilihat kembali melalui tombol salin di tabel order.</p>
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-700"><strong>Cara penggunaan:</strong> Kirim link di atas ke pelanggan melalui WhatsApp. Pelanggan akan mengisi formulir lengkap termasuk detail cincin, alamat, dan ukuran.</div>
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" onClick={() => openForm(generatedOrder, false)}>Isi Form Sekarang</Button>
              <Button variant="primary" onClick={() => setShowLinkModal(false)}>Selesai</Button>
            </div>
          </div>
        )}
      </Modal>

      {/* ── Modal: Full Order Form ───────────────────────── */}
      <Modal
        isOpen={showFormModal}
        onClose={() => !isSaving && setShowFormModal(false)}
        title={isViewOnly ? `Detail Order — ${selectedOrder?.order_number}` : `Edit Order — ${selectedOrder?.order_number}`}
        size="xl"
        footer={
          !isViewOnly ? (
            <div className="flex justify-end gap-3">
              <Button variant="secondary" onClick={() => setShowFormModal(false)} disabled={isSaving}>Batal</Button>
              <Button variant="primary" onClick={handleSaveForm} isLoading={isSaving}>Simpan</Button>
            </div>
          ) : (
            <div className="flex justify-between items-center">
              <div className="flex gap-2">
                {selectedOrder?.form_status === "submitted" && (
                  <Button variant="primary" onClick={handleMarkReviewed} isLoading={isSaving} leftIcon={<CheckCircle className="w-4 h-4" />}>Tandai Sudah Direview</Button>
                )}
                {(selectedOrder?.form_status === "submitted" || selectedOrder?.form_status === "reviewed" || selectedOrder?.form_status === "converted") && (
                  <Button variant="outline" onClick={handleDownloadPdf} isLoading={isGeneratingPdf} leftIcon={<Download className="w-4 h-4" />}>Download PDF</Button>
                )}
              </div>
              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setIsViewOnly(false)}>Edit</Button>
                <Button variant="secondary" onClick={() => setShowFormModal(false)}>Tutup</Button>
              </div>
            </div>
          )
        }
      >
        {/* ── Foto Referensi Cincin ─── */}
        <div className="mb-5">
          <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">Foto Referensi Cincin</p>
          <div className="grid grid-cols-2 gap-4">
            <RefImageUpload label="Cincin Pria" side="pria" currentUrl={selectedOrder?.reference_image_pria_url ?? null} isUploading={isUploadingImage === "pria"} onUpload={handleImageUpload} />
            <RefImageUpload label="Cincin Wanita" side="wanita" currentUrl={selectedOrder?.reference_image_wanita_url ?? null} isUploading={isUploadingImage === "wanita"} onUpload={handleImageUpload} />
          </div>
        </div>

        {!isViewOnly && draftSavedAt && !showClearDraftConfirm && (
          <div className="mb-4 flex items-center justify-between rounded-lg border border-sky-200 bg-sky-50 px-4 py-2.5">
            <div className="flex items-center gap-2 text-xs text-sky-700"><Check className="h-3.5 w-3.5" />Draft tersimpan otomatis pukul {draftSavedAt}</div>
            <button onClick={() => setShowClearDraftConfirm(true)} className="rounded px-2 py-1 text-[11px] font-medium text-sky-600 hover:bg-sky-100 transition-colors">Hapus draft</button>
          </div>
        )}

        {showClearDraftConfirm && (
          <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 space-y-2.5">
            <p className="text-xs text-amber-800">Yakin hapus draft? Semua perubahan yang belum disimpan akan hilang.</p>
            <div className="flex gap-2">
              <button onClick={() => { clearDraft(); setShowClearDraftConfirm(false); }} className="rounded px-3 py-1.5 text-[11px] font-medium bg-red-600 text-white hover:bg-red-700 transition-colors">Ya, Hapus</button>
              <button onClick={() => setShowClearDraftConfirm(false)} className="rounded px-3 py-1.5 text-[11px] font-medium border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 transition-colors">Batal</button>
            </div>
          </div>
        )}

        <OrderFormFields data={formData} disabled={isViewOnly || isSaving} onChangeField={setField} workingDays={workingDays} onChangeHarga={handleHargaChange} orderNumber={selectedOrder?.order_number ?? ""} />
      </Modal>

      {/* ── Modal: Confirm Delete ───────────────────────── */}
      <Modal isOpen={showDeleteConfirm} onClose={() => !isSaving && setShowDeleteConfirm(false)} title="Hapus Order" size="sm">
        <div className="space-y-4">
          <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-lg p-4">
            <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-red-800">Yakin ingin menghapus?</p>
              <p className="text-sm text-red-700 mt-0.5">Order <strong>{orderToDelete?.order_number}</strong> atas nama <strong>{orderToDelete?.customer_name}</strong> akan dihapus permanen.</p>
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setShowDeleteConfirm(false)} disabled={isSaving}>Batal</Button>
            <Button variant="danger" onClick={handleDelete} isLoading={isSaving}>Hapus</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
