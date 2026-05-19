// app/dashboard/cs/input-order/page.tsx

"use client";

import { useState, useEffect, useCallback, useRef } from "react";
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
import AddressAutocomplete from "@/components/order/AddressAutocomplete";

// ── Types ──────────────────────────────────────────────────────────────────

interface OrderFormData {
  tglChat: string;
  tglOrder: string;
  tglAcara: string;
  acara: string;
  kategori: string;
  deadline: string;
  orderVia: string;
  sumber: string;
  sumberMedia: string;
  dariArtis: string;
  dariArtisDetail: string;
  harga: string;
  dpPercent: string;
  dp: string;
  namaLengkap: string;
  alamatPengiriman: string;
  kelurahan: string;
  kecamatan: string;
  kabupatenKota: string;
  provinsi: string;
  kodepos: string;
  noWA: string;
  email: string;
  instagram: string;
  ukuranPria: string;
  ukuranWanita: string;
  alatUkur: string;
  ukiranPria: string;
  ukiranWanita: string;
  font: string;
  laserPosition: string;
  jenisCincinPria: string;
  jenisCincinWanita: string;
  jenisCincinFeatures: string[];
  keteranganPria: string[];
  keteranganWanita: string[];
  pengiriman: string;
  box: string;
  transferKeBank: string;
}

// ── Helpers ────────────────────────────────────────────────────────────────

const today = new Date().toISOString().split("T")[0];

const emptyFormData = (): OrderFormData => ({
  tglChat: today,
  tglOrder: today,
  tglAcara: "",
  kategori: "",
  acara: "",
  deadline: "",
  orderVia: "",
  sumber: "",
  sumberMedia: "",
  dariArtis: "",
  dariArtisDetail: "",
  harga: "",
  dpPercent: "80",
  dp: "",
  namaLengkap: "",
  alamatPengiriman: "",
  kelurahan: "",
  kecamatan: "",
  kabupatenKota: "",
  provinsi: "",
  kodepos: "",
  noWA: "",
  email: "",
  instagram: "",
  ukuranPria: "",
  ukuranWanita: "",
  alatUkur: "",
  ukiranPria: "",
  ukiranWanita: "",
  font: "",
  laserPosition: "",
  jenisCincinPria: "",
  jenisCincinWanita: "",
  jenisCincinFeatures: [],
  keteranganPria: [""],
  keteranganWanita: [""],
  pengiriman: "",
  box: "",
  transferKeBank: "",
});

const LABELS: Record<string, string> = {
  instagram: "Instagram",
  google: "Google",
  tiktok: "TikTok",
  marketplace: "Marketplace",
  recommendation: "Recommendation",
  ots: "OTS",
};

const SOURCE_MAP: Record<string, string> = {
  Instagram: "instagram",
  Google: "google",
  TikTok: "tiktok",
  Marketplace: "marketplace",
  Recommendation: "recommendation",
  OTS: "ots",
};

const SUB_SOURCES: Record<string, { value: string; label: string }[]> = {
  instagram: [
    { value: "sponsored_ads", label: "Sponsored Instagram/Ads" },
    { value: "brand_search", label: "Instagram Brand/Non-Brand Search" },
    { value: "posts", label: "Instagram Posts (Followed/Not Followed)" },
  ],
  google: [
    { value: "maps", label: "Google Maps" },
    { value: "search", label: "Google Search" },
    { value: "website", label: "Website" },
    { value: "youtube", label: "YouTube" },
  ],
  marketplace: [
    { value: "shopee", label: "Shopee" },
    { value: "tokopedia", label: "Tokopedia" },
  ],
  recommendation: [
    { value: "friends", label: "Friends" },
    { value: "family", label: "Family" },
    { value: "others", label: "Others" },
  ],
  ots: [
    { value: "billboards", label: "Billboards" },
    { value: "banners", label: "Banners" },
    { value: "neon_signs", label: "Neon Signs" },
    { value: "posters", label: "Posters" },
    { value: "flags", label: "Flags" },
  ],
};

function normalizeSumber(v: string): string | null {
  return SOURCE_MAP[v] || v.toLowerCase() || null;
}

function formatRupiah(raw: string): string {
  const n = raw.replace(/[^\d]/g, "");
  if (!n) return "";
  return n.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

function csOrderToFormData(o: CsOrder): OrderFormData {
  return {
    tglChat: o.tgl_chat,
    tglOrder: o.tgl_order,
    tglAcara: o.tgl_acara ?? "",
    acara: o.acara ?? o.kebutuhan_acara ?? "",
    kategori: o.kategori ?? "",
    deadline: o.deadline ?? "",
    orderVia: o.order_via ?? "",
    sumber: o.sumber_detail ?? "",
    sumberMedia: o.sumber_media
      ? (LABELS[o.sumber_media] ?? o.sumber_media)
      : "",
    dariArtis:
      o.dari_artis === true ? "Iya" : o.dari_artis === false ? "Tidak" : "",
    dariArtisDetail: o.dari_artis_detail ?? "",
    harga: o.harga != null ? o.harga.toString() : "",
    dpPercent: "80",
    dp: o.dp_amount != null ? o.dp_amount.toString() : "",
    namaLengkap: o.customer_name,
    alamatPengiriman: o.alamat_pengiriman ?? "",
    kelurahan: o.kelurahan ?? "",
    kecamatan: o.kecamatan ?? "",
    kabupatenKota: o.kabupaten_kota ?? "",
    provinsi: o.provinsi ?? "",
    kodepos: o.kodepos ?? "",
    noWA: o.customer_wa ?? "",
    email: o.customer_email ?? "",
    instagram: o.customer_instagram ?? "",
    ukuranPria: o.ukuran_pria ?? "",
    ukuranWanita: o.ukuran_wanita ?? "",
    alatUkur: o.alat_ukur ?? "",
    ukiranPria: o.ukiran_pria ?? "",
    ukiranWanita: o.ukiran_wanita ?? "",
    font: o.font ?? "",
    laserPosition: o.laser_position ?? "",
    jenisCincinPria: o.jenis_cincin_pria ?? "",
    jenisCincinWanita: o.jenis_cincin_wanita ?? "",
    jenisCincinFeatures: o.jenis_cincin_features ?? [],
    keteranganPria: o.keterangan_pria?.length ? o.keterangan_pria : [""],
    keteranganWanita: o.keterangan_wanita?.length ? o.keterangan_wanita : [""],
    pengiriman: o.pengiriman ?? "",
    box: o.box ?? "",
    transferKeBank: o.transfer_ke_bank ?? "",
  };
}

function formDataToPatch(f: OrderFormData) {
  return {
    tgl_chat: f.tglChat,
    tgl_order: f.tglOrder,
    tgl_acara: f.tglAcara || null,
    acara: f.acara || null,
    kategori: f.kategori || null,
    deadline: f.deadline || null,
    order_via: f.orderVia || null,
    sumber_media: normalizeSumber(f.sumberMedia),
    sumber_detail: f.sumber || null,
    dari_artis:
      f.dariArtis === "Iya" ? true : f.dariArtis === "Tidak" ? false : null,
    dari_artis_detail: f.dariArtis === "Iya" ? f.dariArtisDetail || null : null,
    harga: f.harga ? parseInt(f.harga, 10) : null,
    dp_amount: f.dp ? parseInt(f.dp, 10) : null,
    customer_name: f.namaLengkap || undefined,
    customer_wa: f.noWA || null,
    customer_email: f.email || null,
    customer_instagram: f.instagram || null,
    alamat_pengiriman: f.alamatPengiriman || null,
    kelurahan: f.kelurahan || null,
    kecamatan: f.kecamatan || null,
    kabupaten_kota: f.kabupatenKota || null,
    provinsi: f.provinsi || null,
    kodepos: f.kodepos || null,
    alat_ukur: f.alatUkur || null,
    ukuran_pria: f.ukuranPria || null,
    ukiran_pria: f.ukiranPria || null,
    jenis_cincin_pria: f.jenisCincinPria || null,
    keterangan_pria: f.keteranganPria.filter(Boolean),
    ukuran_wanita: f.ukuranWanita || null,
    ukiran_wanita: f.ukuranWanita || null,
    jenis_cincin_wanita: f.jenisCincinWanita || null,
    jenis_cincin_features: f.jenisCincinFeatures,
    keterangan_wanita: f.keteranganWanita.filter(Boolean),
    font: f.font || null,
    laser_position:
      (f.laserPosition as "dalam" | "luar" | "dalam_luar") || null,
    pengiriman: f.pengiriman || null,
    box: f.box || null,
    transfer_ke_bank: f.transferKeBank || null,
  };
}

// ── Component ──────────────────────────────────────────────────────────────

export default function InputOrderPage() {
  const router = useRouter();
  const [user, setUser] = useState<ClientUser | null>(null);
  const [orders, setOrders] = useState<CsOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [workingDays, setWorkingDays] = useState<number | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState<
    "pria" | "wanita" | null
  >(null);

  // modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [showFormModal, setShowFormModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // create step 1
  const [newCustomerName, setNewCustomerName] = useState("");
  const [newTglChat, setNewTglChat] = useState(today);

  // generated link result
  const [generatedOrder, setGeneratedOrder] = useState<CsOrder | null>(null);
  const [linkCopied, setLinkCopied] = useState(false);

  // edit / view
  const [selectedOrder, setSelectedOrder] = useState<CsOrder | null>(null);
  const [formData, setFormData] = useState<OrderFormData>(emptyFormData());
  const [isViewOnly, setIsViewOnly] = useState(false);

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

  // ── Data loading ──────────────────────────────────────────────────────────

  const loadOrders = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/cs/orders");
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Gagal memuat data order");
      }
      const { data } = await res.json();
      setOrders(data || []);
    } catch (e) {
      showAlert("error", e instanceof Error ? e.message : "Gagal memuat data");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const clientUser = getClientUser();
    if (!clientUser) {
      router.push("/login");
      return;
    }
    setUser(clientUser);
    loadOrders();
  }, [router, loadOrders]);

  // ── Stats ──────────────────────────────────────────────────────────────────

  const totalOrders = orders.length;
  const menunggu = orders.filter((o) => o.form_status === "pending").length;
  const perluDireview = orders.filter(
    (o) => o.form_status === "submitted",
  ).length;
  const sudahDireview = orders.filter(
    (o) => o.form_status === "reviewed" || o.form_status === "converted",
  ).length;
  const bulanIni = orders.filter((o) =>
    o.tgl_order.startsWith(today.slice(0, 7)),
  ).length;

  // ── Handlers: Create ──────────────────────────────────────────────────────

  const openCreateModal = () => {
    setNewCustomerName("");
    setNewTglChat(today);
    setShowCreateModal(true);
  };

  const handleCreate = async () => {
    if (!newCustomerName.trim()) {
      showAlert("error", "Nama customer wajib diisi");
      return;
    }
    setIsSaving(true);
    try {
      const res = await fetch("/api/cs/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customer_name: newCustomerName.trim(),
          tgl_chat: newTglChat,
        }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Gagal membuat order");
      await loadOrders();
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

  // ── Handlers: Copy link ────────────────────────────────────────────────────

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

  // ── Handlers: Edit / View ──────────────────────────────────────────────────

  const openForm = (order: CsOrder, viewOnly = false) => {
    setSelectedOrder(order);
    setFormData(csOrderToFormData(order));
    setIsViewOnly(viewOnly);
    setShowFormModal(true);
  };

  const setField = <K extends keyof OrderFormData>(
    key: K,
    value: OrderFormData[K],
  ) => setFormData((prev) => ({ ...prev, [key]: value }));

  const setKetPria = (index: number, value: string) => {
    const arr = [...formData.keteranganPria];
    arr[index] = value;
    setField("keteranganPria", arr);
  };

  const addKetPria = () => {
    setField("keteranganPria", [...formData.keteranganPria, ""]);
  };

  const removeKetPria = (index: number) => {
    const arr = formData.keteranganPria.filter((_, i) => i !== index);
    setField("keteranganPria", arr.length ? arr : [""]);
  };

  const setKetWanita = (index: number, value: string) => {
    const arr = [...formData.keteranganWanita];
    arr[index] = value;
    setField("keteranganWanita", arr);
  };

  const addKetWanita = () => {
    setField("keteranganWanita", [...formData.keteranganWanita, ""]);
  };

  const removeKetWanita = (index: number) => {
    const arr = formData.keteranganWanita.filter((_, i) => i !== index);
    setField("keteranganWanita", arr.length ? arr : [""]);
  };

  const handleHargaChange = (raw: string) => {
    const pct = parseInt(formData.dpPercent || "80", 10);
    setField("harga", raw);
    setField(
      "dp",
      raw ? Math.round((parseInt(raw, 10) * pct) / 100).toString() : "",
    );
  };

  const handleDpPercentChange = (pct: string) => {
    setField("dpPercent", pct);
    const p = parseInt(pct, 10);
    setField(
      "dp",
      formData.harga
        ? Math.round((parseInt(formData.harga, 10) * p) / 100).toString()
        : "",
    );
  };

  useEffect(() => {
    if (formData.tglAcara && formData.deadline) {
      const days = countWorkingDays(formData.deadline, formData.tglAcara);
      setWorkingDays(days);
      const recommended = getRecommendedKategori(days);
      if (formData.kategori) {
        const t = KATEGORI_THRESHOLDS.find(
          (k) => k.value === formData.kategori,
        );
        if (t && days < t.minDays) {
          setField("kategori", recommended ?? "");
        }
      } else if (recommended) {
        setField("kategori", recommended);
      }
    } else {
      setWorkingDays(null);
    }
  }, [formData.tglAcara, formData.deadline]);

  const handleSaveForm = async () => {
    if (!selectedOrder) return;
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
      await loadOrders();
      setShowFormModal(false);
      showAlert("success", "Data order berhasil disimpan");
    } catch (e) {
      showAlert("error", e instanceof Error ? e.message : "Terjadi kesalahan");
    } finally {
      setIsSaving(false);
    }
  };

  // ── Handlers: Delete ──────────────────────────────────────────────────────

  const confirmDelete = (order: CsOrder) => {
    setOrderToDelete(order);
    setShowDeleteConfirm(true);
  };

  const handleDelete = async () => {
    if (!orderToDelete) return;
    setIsSaving(true);
    try {
      const res = await fetch(`/api/cs/orders/${orderToDelete.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error || "Gagal menghapus order");
      }
      await loadOrders();
      setShowDeleteConfirm(false);
      setOrderToDelete(null);
      showAlert("success", "Order berhasil dihapus");
    } catch (e) {
      showAlert("error", e instanceof Error ? e.message : "Terjadi kesalahan");
    } finally {
      setIsSaving(false);
    }
  };

  // ── Handlers: Mark Reviewed ───────────────────────────────────────────────

  const handleMarkReviewed = async () => {
    if (!selectedOrder) return;
    setIsSaving(true);
    try {
      const res = await fetch(`/api/cs/orders/${selectedOrder.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          form_status: "reviewed",
          reviewed_at: new Date().toISOString(),
        }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Gagal menandai review");
      await loadOrders();
      setShowFormModal(false);
      showAlert("success", "Order ditandai sudah direview");
    } catch (e) {
      showAlert("error", e instanceof Error ? e.message : "Terjadi kesalahan");
    } finally {
      setIsSaving(false);
    }
  };

  // ── Handlers: Reference image upload ─────────────────────────────────────

  const handleImageUpload = async (side: "pria" | "wanita", file: File) => {
    if (!selectedOrder) return;
    setIsUploadingImage(side);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("side", side);
      const res = await fetch(`/api/cs/orders/${selectedOrder.id}/image`, {
        method: "POST",
        body: fd,
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Gagal mengunggah");
      const field =
        side === "pria"
          ? "reference_image_pria_url"
          : "reference_image_wanita_url";
      setSelectedOrder((prev) =>
        prev ? { ...prev, [field]: body.url } : prev,
      );
      setOrders((prev) =>
        prev.map((o) =>
          o.id === selectedOrder.id ? { ...o, [field]: body.url } : o,
        ),
      );
      showAlert("success", `Foto referensi ${side} berhasil diunggah`);
    } catch (e) {
      showAlert("error", e instanceof Error ? e.message : "Terjadi kesalahan");
    } finally {
      setIsUploadingImage(null);
    }
  };

  // ── Handlers: Download PDF ────────────────────────────────────────────────

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
      const a = document.createElement("a");
      a.href = url;
      a.download = `Order-${selectedOrder.order_number}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      showAlert("error", "Gagal membuat PDF. Coba lagi.");
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  // ── Loading skeleton ───────────────────────────────────────────────────────

  if (isLoading && !user) {
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

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar role="customer_service" />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header userEmail={user?.email || ""} role="customer_service" />
        <main className="flex-1 overflow-y-auto p-6">
          {/* Alert */}
          {alert && (
            <div className="mb-6 animate-slide-down">
              <Alert
                type={alert.type}
                message={alert.message}
                onClose={() => setAlert(null)}
                autoClose
                duration={3500}
              />
            </div>
          )}

          {/* Page header */}
          <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-4 mb-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-800 mb-1">
                Input Order Cincin
              </h2>
              <p className="text-gray-600">
                Buat order baru dan kirimkan link formulir ke pelanggan
              </p>
            </div>
            <Button
              variant="primary"
              onClick={openCreateModal}
              leftIcon={
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 4v16m8-8H4"
                  />
                </svg>
              }
            >
              Buat Order Baru
            </Button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
            <div className="bg-white rounded-xl shadow-sm p-5 border-l-4 border-indigo-500">
              <p className="text-sm text-gray-500 mb-1">Total Order</p>
              <p className="text-2xl font-bold text-gray-800">{totalOrders}</p>
              <p className="text-xs text-gray-400 mt-1">semua waktu</p>
            </div>
            <div className="bg-white rounded-xl shadow-sm p-5 border-l-4 border-amber-500">
              <p className="text-sm text-gray-500 mb-1">Menunggu Pengisian</p>
              <p className="text-2xl font-bold text-amber-600">{menunggu}</p>
              <p className="text-xs text-gray-400 mt-1">
                belum diisi pelanggan
              </p>
            </div>
            <div className="bg-white rounded-xl shadow-sm p-5 border-l-4 border-orange-500">
              <p className="text-sm text-gray-500 mb-1">Perlu Direview</p>
              <p className="text-2xl font-bold text-orange-600">
                {perluDireview}
              </p>
              <p className="text-xs text-gray-400 mt-1">
                form terisi, belum direview
              </p>
            </div>
            <div className="bg-white rounded-xl shadow-sm p-5 border-l-4 border-green-500">
              <p className="text-sm text-gray-500 mb-1">Sudah Direview</p>
              <p className="text-2xl font-bold text-green-600">
                {sudahDireview}
              </p>
              <p className="text-xs text-gray-400 mt-1">
                sudah direview / dikonversi
              </p>
            </div>
            <div className="bg-white rounded-xl shadow-sm p-5 border-l-4 border-blue-500">
              <p className="text-sm text-gray-500 mb-1">Bulan Ini</p>
              <p className="text-2xl font-bold text-gray-800">{bulanIni}</p>
              <p className="text-xs text-gray-400 mt-1">order baru</p>
            </div>
          </div>

          {/* Table */}
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-800">
                Daftar Order
              </h3>
              <p className="text-sm text-gray-500">
                {orders.length} order · urut dari terbaru
              </p>
            </div>

            {isLoading ? (
              <div className="p-10">
                <Loading variant="dots" text="Memuat order..." />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      {[
                        "No Order",
                        "Nama Customer",
                        "Tgl Order",
                        "Deadline",
                        "Harga",
                        "Status Form",
                        "Aksi",
                      ].map((h) => (
                        <th
                          key={h}
                          className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap"
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {orders.length === 0 ? (
                      <tr>
                        <td
                          colSpan={7}
                          className="px-6 py-12 text-center text-gray-400"
                        >
                          <div className="flex flex-col items-center gap-2">
                            <svg
                              className="w-10 h-10 text-gray-300"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={1.5}
                                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                              />
                            </svg>
                            <p>
                              Belum ada order. Klik{" "}
                              <strong>Buat Order Baru</strong> untuk memulai.
                            </p>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      orders.map((order) => (
                        <tr
                          key={order.id}
                          className="hover:bg-gray-50 transition-colors"
                        >
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span className="font-mono text-sm font-medium text-indigo-600">
                              {order.order_number}
                            </span>
                          </td>
                          <td className="px-4 py-3 font-medium text-gray-800">
                            {order.customer_name}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-gray-600 text-sm">
                            {new Date(order.tgl_order).toLocaleDateString(
                              "id-ID",
                              {
                                day: "2-digit",
                                month: "short",
                                year: "numeric",
                              },
                            )}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-gray-600 text-sm">
                            {order.deadline ? (
                              new Date(order.deadline).toLocaleDateString(
                                "id-ID",
                                {
                                  day: "2-digit",
                                  month: "short",
                                  year: "numeric",
                                },
                              )
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-gray-700 text-sm">
                            {order.harga != null && order.harga > 0 ? (
                              order.harga.toLocaleString("id-ID", {
                                style: "currency",
                                currency: "IDR",
                                maximumFractionDigits: 0,
                              })
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <FormStatusBadge status={order.form_status} />
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => openForm(order, true)}
                                title="Lihat form"
                                className="p-1.5 rounded-lg text-gray-500 hover:bg-indigo-50 hover:text-indigo-600 transition-colors"
                              >
                                <svg
                                  className="w-4 h-4"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                                  />
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                                  />
                                </svg>
                              </button>
                              <button
                                onClick={() => openForm(order, false)}
                                title="Edit form"
                                className="p-1.5 rounded-lg text-gray-500 hover:bg-indigo-50 hover:text-indigo-600 transition-colors"
                              >
                                <svg
                                  className="w-4 h-4"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                                  />
                                </svg>
                              </button>
                              <CopyLinkButton
                                order={order}
                                getFormUrl={getFormUrl}
                              />
                              <button
                                onClick={() => confirmDelete(order)}
                                title="Hapus order"
                                className="p-1.5 rounded-lg text-gray-500 hover:bg-red-50 hover:text-red-600 transition-colors"
                              >
                                <svg
                                  className="w-4 h-4"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                  />
                                </svg>
                              </button>
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

      {/* ── Modal: Create Order ─────────────────────────────────────────── */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => !isSaving && setShowCreateModal(false)}
        title="Buat Order Baru"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-500">
            Masukkan nama pelanggan untuk membuat nomor order dan link formulir
            yang bisa dikirim ke pelanggan.
          </p>
          <Input
            label="Nama Customer"
            value={newCustomerName}
            onChange={(e) => setNewCustomerName(e.target.value)}
            placeholder="Contoh: Budi Santoso"
            disabled={isSaving}
            autoFocus
          />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tanggal Chat
            </label>
            <input
              type="date"
              value={newTglChat}
              onChange={(e) => setNewTglChat(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-700"
              disabled={isSaving}
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button
              variant="secondary"
              onClick={() => setShowCreateModal(false)}
              disabled={isSaving}
            >
              Batal
            </Button>
            <Button
              variant="primary"
              onClick={handleCreate}
              isLoading={isSaving}
              disabled={!newCustomerName.trim()}
            >
              Generate Link
            </Button>
          </div>
        </div>
      </Modal>

      {/* ── Modal: Link Generated ──────────────────────────────────────── */}
      <Modal
        isOpen={showLinkModal}
        onClose={() => setShowLinkModal(false)}
        title="Link Formulir Berhasil Dibuat"
        size="md"
      >
        {generatedOrder && (
          <div className="space-y-4">
            <div className="flex items-start gap-3 bg-green-50 border border-green-200 rounded-lg p-4">
              <svg
                className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
              <div>
                <p className="font-semibold text-green-800">
                  Order berhasil dibuat!
                </p>
                <p className="text-sm text-green-700 mt-0.5">
                  No. Order: <strong>{generatedOrder.order_number}</strong>
                </p>
                <p className="text-sm text-green-700">
                  Customer: <strong>{generatedOrder.customer_name}</strong>
                </p>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Link Formulir (salin & kirim ke pelanggan):
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  readOnly
                  value={getFormUrl(generatedOrder)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-sm text-gray-700 font-mono"
                />
                <button
                  onClick={() => copyLink(generatedOrder)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    linkCopied
                      ? "bg-green-600 text-white"
                      : "bg-indigo-600 hover:bg-indigo-700 text-white"
                  }`}
                >
                  {linkCopied ? "Tersalin!" : "Salin"}
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-1.5">
                Link ini bisa dilihat kembali melalui tombol salin di tabel
                order.
              </p>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-700">
              <strong>Cara penggunaan:</strong> Kirim link di atas ke pelanggan
              melalui WhatsApp. Pelanggan akan mengisi formulir lengkap termasuk
              detail cincin, alamat, dan ukuran.
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button
                variant="outline"
                onClick={() => openForm(generatedOrder, false)}
              >
                Isi Form Sekarang
              </Button>
              <Button variant="primary" onClick={() => setShowLinkModal(false)}>
                Selesai
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* ── Modal: Full Order Form ─────────────────────────────────────── */}
      <Modal
        isOpen={showFormModal}
        onClose={() => !isSaving && setShowFormModal(false)}
        title={
          isViewOnly
            ? `Detail Order — ${selectedOrder?.order_number}`
            : `Edit Order — ${selectedOrder?.order_number}`
        }
        size="xl"
        footer={
          !isViewOnly ? (
            <div className="flex justify-end gap-3">
              <Button
                variant="secondary"
                onClick={() => setShowFormModal(false)}
                disabled={isSaving}
              >
                Batal
              </Button>
              <Button
                variant="primary"
                onClick={handleSaveForm}
                isLoading={isSaving}
              >
                Simpan
              </Button>
            </div>
          ) : (
            <div className="flex justify-between items-center">
              <div className="flex gap-2">
                {selectedOrder?.form_status === "submitted" && (
                  <Button
                    variant="primary"
                    onClick={handleMarkReviewed}
                    isLoading={isSaving}
                    leftIcon={
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                    }
                  >
                    Tandai Sudah Direview
                  </Button>
                )}
                {(selectedOrder?.form_status === "submitted" ||
                  selectedOrder?.form_status === "reviewed" ||
                  selectedOrder?.form_status === "converted") && (
                  <Button
                    variant="outline"
                    onClick={handleDownloadPdf}
                    isLoading={isGeneratingPdf}
                    leftIcon={
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                        />
                      </svg>
                    }
                  >
                    Download PDF
                  </Button>
                )}
              </div>
              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setIsViewOnly(false)}>
                  Edit
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => setShowFormModal(false)}
                >
                  Tutup
                </Button>
              </div>
            </div>
          )
        }
      >
        {/* ── Foto Referensi Cincin ──────────────────────────────────────── */}
        <div className="mb-5">
          <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">
            Foto Referensi Cincin
          </p>
          <div className="grid grid-cols-2 gap-4">
            <RefImageUpload
              label="Cincin Pria"
              side="pria"
              currentUrl={selectedOrder?.reference_image_pria_url ?? null}
              isUploading={isUploadingImage === "pria"}
              onUpload={handleImageUpload}
            />
            <RefImageUpload
              label="Cincin Wanita"
              side="wanita"
              currentUrl={selectedOrder?.reference_image_wanita_url ?? null}
              isUploading={isUploadingImage === "wanita"}
              onUpload={handleImageUpload}
            />
          </div>
        </div>

        <OrderFormFields
          data={formData}
          disabled={isViewOnly || isSaving}
          onChangeField={setField}
          workingDays={workingDays}
          onChangeHarga={handleHargaChange}
          onChangeKetPria={setKetPria}
          onAddKetPria={addKetPria}
          onRemoveKetPria={removeKetPria}
          onChangeKetWanita={setKetWanita}
          onAddKetWanita={addKetWanita}
          onRemoveKetWanita={removeKetWanita}
          orderNumber={selectedOrder?.order_number ?? ""}
        />
      </Modal>

      {/* ── Modal: Confirm Delete ──────────────────────────────────────── */}
      <Modal
        isOpen={showDeleteConfirm}
        onClose={() => !isSaving && setShowDeleteConfirm(false)}
        title="Hapus Order"
        size="sm"
      >
        <div className="space-y-4">
          <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-lg p-4">
            <svg
              className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
            <div>
              <p className="font-semibold text-red-800">
                Yakin ingin menghapus?
              </p>
              <p className="text-sm text-red-700 mt-0.5">
                Order <strong>{orderToDelete?.order_number}</strong> atas nama{" "}
                <strong>{orderToDelete?.customer_name}</strong> akan dihapus
                permanen.
              </p>
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <Button
              variant="secondary"
              onClick={() => setShowDeleteConfirm(false)}
              disabled={isSaving}
            >
              Batal
            </Button>
            <Button
              variant="danger"
              onClick={handleDelete}
              isLoading={isSaving}
            >
              Hapus
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────

function RefImageUpload({
  label,
  side,
  currentUrl,
  isUploading,
  onUpload,
}: {
  label: string;
  side: "pria" | "wanita";
  currentUrl: string | null;
  isUploading: boolean;
  onUpload: (side: "pria" | "wanita", file: File) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onUpload(side, file);
    e.target.value = "";
  };

  return (
    <div className="flex flex-col gap-1.5">
      <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
        {label}
      </p>
      <div
        className="relative border-2 border-dashed border-gray-200 rounded-xl overflow-hidden bg-gray-50 cursor-pointer hover:border-indigo-400 hover:bg-indigo-50 transition-colors"
        style={{ aspectRatio: "4/3" }}
        onClick={() => !isUploading && inputRef.current?.click()}
      >
        {currentUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={currentUrl}
            alt={`Referensi ${label}`}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 text-gray-400">
            <svg
              className="w-8 h-8"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
            <span className="text-xs">Klik untuk upload foto</span>
            <span className="text-[10px] text-gray-300">
              JPG / PNG / WebP · maks 5 MB
            </span>
          </div>
        )}

        {/* Overlay saat uploading */}
        {isUploading && (
          <div className="absolute inset-0 bg-white/80 flex items-center justify-center">
            <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {/* Ganti foto badge (bila sudah ada gambar) */}
        {currentUrl && !isUploading && (
          <div className="absolute bottom-0 inset-x-0 bg-black/50 py-1.5 text-center">
            <span className="text-[10px] text-white font-medium">
              Klik untuk ganti foto
            </span>
          </div>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={handleFileChange}
      />
    </div>
  );
}

function FormStatusBadge({ status }: { status: CsOrder["form_status"] }) {
  const map: Record<
    CsOrder["form_status"],
    { label: string; bg: string; dot: string; text: string }
  > = {
    pending: {
      label: "Menunggu",
      bg: "bg-amber-100",
      dot: "bg-amber-500",
      text: "text-amber-700",
    },
    submitted: {
      label: "Perlu Direview",
      bg: "bg-orange-100",
      dot: "bg-orange-500",
      text: "text-orange-700",
    },
    reviewed: {
      label: "Sudah Direview",
      bg: "bg-green-100",
      dot: "bg-green-500",
      text: "text-green-700",
    },
    converted: {
      label: "Dibuat Order",
      bg: "bg-indigo-100",
      dot: "bg-indigo-500",
      text: "text-indigo-700",
    },
  };
  const s = map[status];
  return (
    <span
      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${s.bg} ${s.text}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
      {s.label}
    </span>
  );
}

function CopyLinkButton({
  order,
  getFormUrl,
}: {
  order: CsOrder;
  getFormUrl: (o: CsOrder) => string;
}) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(getFormUrl(order));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  };
  return (
    <button
      onClick={copy}
      title={copied ? "Tersalin!" : "Salin link form"}
      className={`p-1.5 rounded-lg transition-colors ${copied ? "text-green-600 bg-green-50" : "text-gray-500 hover:bg-indigo-50 hover:text-indigo-600"}`}
    >
      {copied ? (
        <svg
          className="w-4 h-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M5 13l4 4L19 7"
          />
        </svg>
      ) : (
        <svg
          className="w-4 h-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
          />
        </svg>
      )}
    </button>
  );
}

// ── OrderFormFields ────────────────────────────────────────────────────────

interface FormFieldsProps {
  data: OrderFormData;
  disabled: boolean;
  orderNumber: string;
  onChangeField: <K extends keyof OrderFormData>(
    key: K,
    value: OrderFormData[K],
  ) => void;
  workingDays: number | null;
  onChangeHarga: (raw: string) => void;
  onChangeKetPria: (index: number, value: string) => void;
  onAddKetPria: () => void;
  onRemoveKetPria: (index: number) => void;
  onChangeKetWanita: (index: number, value: string) => void;
  onAddKetWanita: () => void;
  onRemoveKetWanita: (index: number) => void;
}

function SectionHeader({ title }: { title: string }) {
  return (
    <div className="flex items-center gap-3 my-5">
      <div className="flex-1 h-px bg-gray-200" />
      <span className="text-xs font-bold tracking-widest text-gray-500 uppercase whitespace-nowrap">
        {title}
      </span>
      <div className="flex-1 h-px bg-gray-200" />
    </div>
  );
}

function FieldRow({
  label,
  children,
  required,
}: {
  label: string;
  children: React.ReactNode;
  required?: boolean;
}) {
  return (
    <div className="grid grid-cols-3 gap-3 items-start">
      <label className="text-sm font-medium text-gray-600 pt-2 col-span-1">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      <div className="col-span-2">{children}</div>
    </div>
  );
}

const inputCls = (disabled: boolean) =>
  `w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-800 focus:ring-2 focus:ring-indigo-500 focus:border-transparent ${disabled ? "bg-gray-50 text-gray-600" : "bg-white"}`;

function OrderFormFields({
  data,
  disabled,
  orderNumber,
  onChangeField,
  workingDays,
  onChangeHarga,
  onChangeKetPria,
  onAddKetPria,
  onRemoveKetPria,
  onChangeKetWanita,
  onAddKetWanita,
  onRemoveKetWanita,
}: FormFieldsProps) {
  const [hargaDisplay, setHargaDisplay] = useState(() =>
    formatRupiah(data.harga),
  );

  useEffect(() => {
    setHargaDisplay(formatRupiah(data.harga));
  }, [data.harga]);

  const handleHargaInput = (val: string) => {
    const raw = val.replace(/[^\d]/g, "");
    setHargaDisplay(raw ? formatRupiah(raw) : "");
    onChangeHarga(raw);
  };

  return (
    <div className="space-y-2">
      {/* Header */}
      <div className="text-center pb-4 border-b border-gray-200">
        <p className="text-xs text-gray-500 uppercase tracking-widest">
          No. Order
        </p>
        <p className="font-mono font-bold text-indigo-700 text-lg">
          {orderNumber || "—"}
        </p>
        <p className="font-bold text-gray-800 mt-1">FORMULIR ORDER CINCIN</p>
        <p className="text-sm text-gray-600">PT. KOTAGEDE JEWELLERY</p>
      </div>

      <SectionHeader title="Informasi Order" />

      <div className="space-y-3">
        <FieldRow label="Tgl Chat">
          <input
            type="date"
            value={data.tglChat}
            onChange={(e) => onChangeField("tglChat", e.target.value)}
            className={inputCls(disabled)}
            disabled={disabled}
          />
        </FieldRow>
        <FieldRow label="Tgl Order">
          <input
            type="date"
            value={data.tglOrder}
            onChange={(e) => onChangeField("tglOrder", e.target.value)}
            className={inputCls(disabled)}
            disabled={disabled}
          />
        </FieldRow>
        <FieldRow label="Tgl Acara">
          <input
            type="date"
            value={data.tglAcara}
            onChange={(e) => onChangeField("tglAcara", e.target.value)}
            className={inputCls(disabled)}
            disabled={disabled}
          />
        </FieldRow>
        <FieldRow label="Deadline">
          <input
            type="date"
            value={data.deadline}
            onChange={(e) => onChangeField("deadline", e.target.value)}
            className={inputCls(disabled)}
            disabled={disabled}
          />
        </FieldRow>
        <FieldRow label="Kategori">
          <select
            value={data.kategori}
            onChange={(e) => onChangeField("kategori", e.target.value)}
            className={inputCls(disabled)}
            disabled={disabled}
          >
            <option value="">Pilih kategori</option>
            {KATEGORI_THRESHOLDS.map((k) => (
              <option
                key={k.value}
                value={k.value}
                disabled={workingDays !== null && workingDays < k.minDays}
              >
                {k.label}
                {workingDays !== null && workingDays < k.minDays
                  ? ` (butuh ${k.minDays} hari)`
                  : ""}
              </option>
            ))}
          </select>
          {workingDays !== null && (
            <p
              className={`text-xs mt-1 ${workingDays < 3 ? "text-red-500 font-medium" : "text-gray-400"}`}
            >
              {workingDays < 3
                ? `Hanya ${workingDays} hari kerja tersedia — tidak cukup untuk paket manapun`
                : `${workingDays} hari kerja tersedia`}
            </p>
          )}
        </FieldRow>
        <FieldRow label="Kebutuhan Acara">
          <select
            value={data.acara}
            onChange={(e) => onChangeField("acara", e.target.value)}
            className={inputCls(disabled)}
            disabled={disabled}
          >
            <option value="">Pilih acara</option>
            {[
              "Lamaran/Tunangan",
              "Pernikahan",
              "Anniversary",
              "Kado",
              "Lain-lain",
            ].map((v) => (
              <option key={v} value={v}>
                {v}
              </option>
            ))}
          </select>
        </FieldRow>
        <FieldRow label="Order Via">
          <select
            value={data.orderVia}
            onChange={(e) => onChangeField("orderVia", e.target.value)}
            className={inputCls(disabled)}
            disabled={disabled}
          >
            <option value="">Pilih cara order</option>
            <option value="Offline">Offline</option>
            <option value="Online+Offline">Online + Offline</option>
            <option value="Online">Online</option>
            <option value="Marketplace">Marketplace</option>
          </select>
        </FieldRow>

        {/* Sumber block */}
        <div className="col-span-3 mt-2">
          <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 space-y-4">
            <p className="text-xs font-bold text-indigo-800 uppercase tracking-wide">
              Dari mana Anda mengetahui tentang Kotagede Jewelry?
            </p>

            <FieldRow label="Sumber informasi">
              <select
                value={data.sumberMedia}
                onChange={(e) => {
                  onChangeField("sumberMedia", e.target.value);
                  onChangeField("sumber", "");
                }}
                className={inputCls(disabled)}
                disabled={disabled}
              >
                <option value="">Pilih sumber</option>
                <option value="Instagram">Instagram</option>
                <option value="Google">Google</option>
                <option value="TikTok">TikTok</option>
                <option value="Marketplace">Marketplace</option>
                <option value="Recommendation">Recommendation</option>
                <option value="OTS">On The Spot (OTS)</option>
              </select>
            </FieldRow>

            {data.sumberMedia && (
              <FieldRow label={data.sumberMedia === "TikTok" ? "" : "Detail"}>
                {data.sumberMedia === "TikTok" ? (
                  <p className="text-sm text-gray-500 py-2">TikTok</p>
                ) : (
                  (() => {
                    const REC_OPTS = ["friends", "family", "others"];
                    const isRecCustom =
                      data.sumberMedia === "Recommendation" &&
                      data.sumber &&
                      !REC_OPTS.includes(data.sumber);
                    return (
                      <>
                        <select
                          value={isRecCustom ? "others" : data.sumber}
                          onChange={(e) =>
                            onChangeField("sumber", e.target.value)
                          }
                          className={inputCls(disabled)}
                          disabled={disabled}
                        >
                          <option value="">Pilih detail</option>
                          {(
                            SUB_SOURCES[data.sumberMedia.toLowerCase()] || []
                          ).map((opt) => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                        {data.sumberMedia === "Recommendation" &&
                          (data.sumber === "others" || isRecCustom) && (
                            <input
                              type="text"
                              value={isRecCustom ? data.sumber : ""}
                              onChange={(e) =>
                                onChangeField("sumber", e.target.value)
                              }
                              placeholder="Tulis siapa yang merekomendasikan..."
                              className={`${inputCls(disabled)} mt-2`}
                              disabled={disabled}
                            />
                          )}
                      </>
                    );
                  })()
                )}
              </FieldRow>
            )}

            <FieldRow label="Dari Artis/Selebgram?">
              <div className="flex gap-4 pt-1">
                {["Iya", "Tidak"].map((v) => (
                  <label
                    key={v}
                    className={`flex items-center gap-2 ${disabled ? "cursor-default" : "cursor-pointer"}`}
                  >
                    <input
                      type="radio"
                      name="dariArtis"
                      value={v}
                      checked={data.dariArtis === v}
                      onChange={() => {
                        if (disabled) return;
                        onChangeField("dariArtis", v);
                        if (v !== "Iya") onChangeField("dariArtisDetail", "");
                      }}
                      disabled={disabled}
                      className="w-4 h-4 accent-indigo-600"
                    />
                    <span className="text-sm text-gray-700">{v}</span>
                  </label>
                ))}
              </div>
              {data.dariArtis === "Iya" && (
                <input
                  type="text"
                  value={data.dariArtisDetail}
                  onChange={(e) =>
                    onChangeField("dariArtisDetail", e.target.value)
                  }
                  placeholder="Tulis nama artis / selebgram..."
                  className={`${inputCls(disabled)} mt-2`}
                  disabled={disabled}
                />
              )}
            </FieldRow>
          </div>
        </div>
      </div>

      <SectionHeader title="Harga" />

      <div className="space-y-3">
        <FieldRow label="Harga (±)">
          <div className="relative">
            <span className="absolute inset-y-0 left-3 flex items-center text-gray-500 text-sm pointer-events-none">
              Rp
            </span>
            <input
              type="text"
              inputMode="numeric"
              value={hargaDisplay}
              onChange={(e) => handleHargaInput(e.target.value)}
              placeholder="0"
              className={`${inputCls(disabled)} pl-9`}
              disabled={disabled}
            />
          </div>
          {hargaDisplay && (
            <p className="text-xs text-gray-400 mt-1">Rp {hargaDisplay}</p>
          )}
        </FieldRow>
        <FieldRow label="DP">
          <div className="flex gap-3 mb-2">
            {["33", "50", "80"].map((pct) => (
              <label
                key={pct}
                className={`flex items-center gap-1.5 ${disabled ? "cursor-default" : "cursor-pointer"}`}
              >
                <input
                  type="radio"
                  name="dpPercent"
                  value={pct}
                  checked={data.dpPercent === pct}
                  onChange={() => {
                    if (disabled) return;
                    onChangeField("dpPercent", pct);
                    const h = parseInt(data.harga, 10);
                    const p = parseInt(pct, 10);
                    onChangeField(
                      "dp",
                      h && p ? Math.round((h * p) / 100).toString() : "",
                    );
                  }}
                  disabled={disabled}
                  className="w-4 h-4 accent-indigo-600"
                />
                <span className="text-sm text-gray-700">{pct}%</span>
              </label>
            ))}
          </div>
          <div className="relative">
            <span className="absolute inset-y-0 left-3 flex items-center text-gray-500 text-sm pointer-events-none">
              Rp
            </span>
            <input
              type="text"
              value={data.dp ? formatRupiah(data.dp) : ""}
              readOnly
              className={`${inputCls(true)} pl-9 text-gray-500`}
            />
          </div>
        </FieldRow>
      </div>

      <SectionHeader title="Data Pelanggan" />

      <div className="space-y-3">
        <FieldRow label="Nama Lengkap" required>
          <input
            type="text"
            value={data.namaLengkap}
            onChange={(e) => onChangeField("namaLengkap", e.target.value)}
            placeholder="Nama lengkap sesuai KTP"
            className={inputCls(disabled)}
            disabled={disabled}
          />
        </FieldRow>
        <div className="col-span-3 bg-indigo-50 border border-indigo-200 rounded-xl p-4 space-y-2">
          <label className="block text-sm font-semibold text-indigo-800">
            Cari Alamat Otomatis
          </label>
          <p className="text-xs text-indigo-600">
            Ketik nama jalan atau area, lalu pilih dari daftar — kolom alamat di
            bawah terisi otomatis.
          </p>
          <AddressAutocomplete
            accentColor="#4f46e5"
            onSelect={(parsed) => {
              onChangeField("alamatPengiriman", parsed.alamatPengiriman);
              onChangeField("kelurahan", parsed.kelurahan);
              onChangeField("kecamatan", parsed.kecamatan);
              onChangeField("kabupatenKota", parsed.kabupatenKota);
              onChangeField("provinsi", parsed.provinsi);
              onChangeField("kodepos", parsed.kodepos);
            }}
          />
        </div>
        <FieldRow label="Alamat Pengiriman">
          <textarea
            value={data.alamatPengiriman}
            onChange={(e) => onChangeField("alamatPengiriman", e.target.value)}
            rows={2}
            placeholder="Nama jalan, nomor rumah, RT/RW"
            className={inputCls(disabled)}
            disabled={disabled}
          />
        </FieldRow>
        <FieldRow label="Kelurahan">
          <input
            type="text"
            value={data.kelurahan}
            onChange={(e) => onChangeField("kelurahan", e.target.value)}
            className={inputCls(disabled)}
            disabled={disabled}
          />
        </FieldRow>
        <FieldRow label="Kecamatan">
          <input
            type="text"
            value={data.kecamatan}
            onChange={(e) => onChangeField("kecamatan", e.target.value)}
            className={inputCls(disabled)}
            disabled={disabled}
          />
        </FieldRow>
        <FieldRow label="Kabupaten/Kota">
          <input
            type="text"
            value={data.kabupatenKota}
            onChange={(e) => onChangeField("kabupatenKota", e.target.value)}
            className={inputCls(disabled)}
            disabled={disabled}
          />
        </FieldRow>
        <FieldRow label="Provinsi">
          <input
            type="text"
            value={data.provinsi}
            onChange={(e) => onChangeField("provinsi", e.target.value)}
            className={inputCls(disabled)}
            disabled={disabled}
          />
        </FieldRow>
        <FieldRow label="Kode Pos">
          <input
            type="text"
            value={data.kodepos}
            onChange={(e) => onChangeField("kodepos", e.target.value)}
            placeholder="12345"
            className={inputCls(disabled)}
            disabled={disabled}
          />
        </FieldRow>
        <FieldRow label="No. WhatsApp" required>
          <input
            type="tel"
            value={data.noWA}
            onChange={(e) => onChangeField("noWA", e.target.value)}
            placeholder="08xxxxxxxxxx"
            className={inputCls(disabled)}
            disabled={disabled}
          />
        </FieldRow>
        <FieldRow label="Email">
          <input
            type="email"
            value={data.email}
            onChange={(e) => onChangeField("email", e.target.value)}
            placeholder="email@contoh.com"
            className={inputCls(disabled)}
            disabled={disabled}
          />
        </FieldRow>
        <FieldRow label="Akun Instagram">
          <input
            type="text"
            value={data.instagram}
            onChange={(e) => onChangeField("instagram", e.target.value)}
            placeholder="@username_pelanggan"
            className={inputCls(disabled)}
            disabled={disabled}
          />
        </FieldRow>
      </div>

      <SectionHeader title="Ukuran Cincin" />

      <div className="space-y-3">
        <FieldRow label="Alat Ukur">
          <input
            type="text"
            value={data.alatUkur}
            onChange={(e) => onChangeField("alatUkur", e.target.value)}
            placeholder="Contoh: cincin referensi, mandrel, dll"
            className={inputCls(disabled)}
            disabled={disabled}
          />
        </FieldRow>
        <FieldRow label="Ukuran Pria">
          <input
            type="text"
            value={data.ukuranPria}
            onChange={(e) => onChangeField("ukuranPria", e.target.value)}
            placeholder="Contoh: 18 / L / 57mm"
            className={inputCls(disabled)}
            disabled={disabled}
          />
        </FieldRow>
        <FieldRow label="Ukuran Wanita">
          <input
            type="text"
            value={data.ukuranWanita}
            onChange={(e) => onChangeField("ukuranWanita", e.target.value)}
            placeholder="Contoh: 15 / M / 52mm"
            className={inputCls(disabled)}
            disabled={disabled}
          />
        </FieldRow>
      </div>

      <SectionHeader title="Ukiran Nama" />

      <p className="text-xs text-gray-500 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
        Maks. 15 karakter termasuk simbol dan spasi
      </p>

      <div className="space-y-3 mt-3">
        <FieldRow label="Cincin Pria">
          <input
            type="text"
            value={data.ukiranPria}
            onChange={(e) =>
              onChangeField("ukiranPria", e.target.value.slice(0, 15))
            }
            placeholder="Maks 15 karakter"
            className={inputCls(disabled)}
            disabled={disabled}
            maxLength={15}
          />
          <p className="text-xs text-gray-400 mt-1">
            {data.ukiranPria.length}/15 karakter
          </p>
        </FieldRow>
        <FieldRow label="Cincin Wanita">
          <input
            type="text"
            value={data.ukiranWanita}
            onChange={(e) =>
              onChangeField("ukiranWanita", e.target.value.slice(0, 15))
            }
            placeholder="Maks 15 karakter"
            className={inputCls(disabled)}
            disabled={disabled}
            maxLength={15}
          />
          <p className="text-xs text-gray-400 mt-1">
            {data.ukiranWanita.length}/15 karakter
          </p>
        </FieldRow>
        <FieldRow label="Font">
          <input
            type="text"
            value={data.font}
            onChange={(e) => onChangeField("font", e.target.value)}
            placeholder="Contoh: Script, Block, Arial"
            className={inputCls(disabled)}
            disabled={disabled}
          />
        </FieldRow>
        <FieldRow label="Posisi Laser">
          <select
            value={data.laserPosition}
            onChange={(e) => onChangeField("laserPosition", e.target.value)}
            className={inputCls(disabled)}
            disabled={disabled}
          >
            <option value="">Pilih posisi</option>
            <option value="dalam">Di dalam cincin</option>
            <option value="luar">Di luar cincin</option>
            <option value="dalam_luar">Dalam & luar</option>
          </select>
        </FieldRow>
      </div>

      <SectionHeader title="Jenis Cincin" />

      <div className="space-y-3">
        <FieldRow label="Jenis Cincin Pria">
          <input
            type="text"
            value={data.jenisCincinPria}
            onChange={(e) => onChangeField("jenisCincinPria", e.target.value)}
            placeholder="Contoh: Polos, Berlian, Permata"
            className={inputCls(disabled)}
            disabled={disabled}
          />
        </FieldRow>
        <FieldRow label="Jenis Cincin Wanita">
          <input
            type="text"
            value={data.jenisCincinWanita}
            onChange={(e) => onChangeField("jenisCincinWanita", e.target.value)}
            placeholder="Contoh: Polos, Berlian, Permata"
            className={inputCls(disabled)}
            disabled={disabled}
          />
        </FieldRow>
      </div>

      <SectionHeader title="Fitur Cincin" />

      <div className="space-y-2">
        <div className="grid grid-cols-2 gap-2">
          {[
            { value: "Laser Batik", label: "Laser Batik" },
            { value: "Micro Finishing", label: "Micro Finishing" },
            { value: "3D Design", label: "3D Design" },
            { value: "Special Model", label: "Special Model" },
          ].map((feat) => (
            <label
              key={feat.value}
              className={`flex items-center gap-2 ${disabled ? "cursor-default" : "cursor-pointer"}`}
            >
              <input
                type="checkbox"
                value={feat.value}
                checked={data.jenisCincinFeatures.includes(feat.value)}
                onChange={() => {
                  if (disabled) return;
                  const arr = data.jenisCincinFeatures.includes(feat.value)
                    ? data.jenisCincinFeatures.filter(
                        (f: string) => f !== feat.value,
                      )
                    : [...data.jenisCincinFeatures, feat.value];
                  onChangeField("jenisCincinFeatures", arr);
                }}
                disabled={disabled}
                className="w-4 h-4 accent-indigo-600"
              />
              <span className="text-sm text-gray-700">{feat.label}</span>
            </label>
          ))}
        </div>
      </div>

      <SectionHeader title="Keterangan" />

      <div className="space-y-5">
        <div>
          <p className="text-sm font-semibold text-gray-700 mb-2">
            Cincin Pria
          </p>
          <div className="space-y-2">
            {data.keteranganPria.map((k, i) => (
              <div key={i} className="flex items-center gap-2">
                <input
                  type="text"
                  value={k}
                  onChange={(e) => onChangeKetPria(i, e.target.value)}
                  placeholder={`Detail ${i + 1}`}
                  className={inputCls(disabled)}
                  disabled={disabled}
                />
                {data.keteranganPria.length > 1 && (
                  <button
                    type="button"
                    onClick={() => onRemoveKetPria(i)}
                    disabled={disabled}
                    className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors disabled:opacity-30"
                  >
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                )}
              </div>
            ))}
            <button
              type="button"
              onClick={onAddKetPria}
              disabled={disabled}
              className="flex items-center gap-1.5 text-sm font-medium mt-1 text-indigo-600 hover:text-indigo-800 transition-colors disabled:opacity-30"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4v16m8-8H4"
                />
              </svg>
              Tambah detail
            </button>
          </div>
        </div>
        <div>
          <p className="text-sm font-semibold text-gray-700 mb-2">
            Cincin Wanita
          </p>
          <div className="space-y-2">
            {data.keteranganWanita.map((k, i) => (
              <div key={i} className="flex items-center gap-2">
                <input
                  type="text"
                  value={k}
                  onChange={(e) => onChangeKetWanita(i, e.target.value)}
                  placeholder={`Detail ${i + 1}`}
                  className={inputCls(disabled)}
                  disabled={disabled}
                />
                {data.keteranganWanita.length > 1 && (
                  <button
                    type="button"
                    onClick={() => onRemoveKetWanita(i)}
                    disabled={disabled}
                    className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors disabled:opacity-30"
                  >
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                )}
              </div>
            ))}
            <button
              type="button"
              onClick={onAddKetWanita}
              disabled={disabled}
              className="flex items-center gap-1.5 text-sm font-medium mt-1 text-indigo-600 hover:text-indigo-800 transition-colors disabled:opacity-30"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4v16m8-8H4"
                />
              </svg>
              Tambah detail
            </button>
          </div>
        </div>
      </div>

      <SectionHeader title="Pengiriman & Kemasan" />

      <div className="space-y-3">
        <FieldRow label="Pengiriman">
          <input
            type="text"
            value={data.pengiriman}
            onChange={(e) => onChangeField("pengiriman", e.target.value)}
            placeholder="Contoh: JNE, J&T, Ambil sendiri"
            className={inputCls(disabled)}
            disabled={disabled}
          />
        </FieldRow>
        <FieldRow label="Box">
          <input
            type="text"
            value={data.box}
            onChange={(e) => onChangeField("box", e.target.value)}
            placeholder="Contoh: Box standar, Box premium"
            className={inputCls(disabled)}
            disabled={disabled}
          />
        </FieldRow>
      </div>

      <SectionHeader title="Pembayaran" />

      <div className="space-y-3">
        <FieldRow label="Transfer ke Bank?">
          <select
            value={
              ["BCA", "Mandiri", "BRI", "BNI"].includes(data.transferKeBank)
                ? data.transferKeBank
                : data.transferKeBank
                  ? "Lainnya"
                  : ""
            }
            onChange={(e) => onChangeField("transferKeBank", e.target.value)}
            className={inputCls(disabled)}
            disabled={disabled}
          >
            <option value="">Pilih bank</option>
            <option value="BCA">BCA</option>
            <option value="Mandiri">Mandiri</option>
            <option value="BRI">BRI</option>
            <option value="BNI">BNI</option>
            <option value="Lainnya">Lainnya</option>
          </select>
          {(data.transferKeBank === "Lainnya" ||
            (data.transferKeBank &&
              !["BCA", "Mandiri", "BRI", "BNI"].includes(
                data.transferKeBank,
              ))) && (
            <input
              type="text"
              value={
                data.transferKeBank === "Lainnya" ? "" : data.transferKeBank
              }
              onChange={(e) => onChangeField("transferKeBank", e.target.value)}
              placeholder="Tulis nama bank..."
              className={`${inputCls(disabled)} mt-2`}
              disabled={disabled}
            />
          )}
        </FieldRow>
      </div>
    </div>
  );
}
