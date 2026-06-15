// app/dashboard/cs/input-leads/page.tsx

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
import { LeadInputSchema } from "@/lib/schemas/lead-input";
import { Plus, Pencil, AlertTriangle } from "lucide-react";

interface LeadInput {
  id: string;
  branch_id: string;
  input_date: string;
  lead_masuk: number;
  closing: number;
  omset: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
  branches: { id: string; name: string; code: string } | null;
}

export default function InputLeadsPage() {
  const router = useRouter();
  const [user, setUser] = useState<ClientUser | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [leadMasuk, setLeadMasuk] = useState("");
  const [closing, setClosing] = useState("");
  const [omset, setOmset] = useState("");
  const [omsetDisplay, setOmsetDisplay] = useState("");
  const [notes, setNotes] = useState("");

  const [alert, setAlert] = useState<{
    type: "success" | "error" | "warning" | "info";
    message: string;
  } | null>(null);

  const queryClient = useQueryClient();

  const { data: leadInputsData, isLoading } = useQuery({
    queryKey: ["cs-inputs"],
    queryFn: () => fetcher<{ data: LeadInput[] }>("/api/cs/inputs?limit=100"),
  });

  const leadInputs = leadInputsData?.data ?? [];

  const showAlert = (
    type: "success" | "error" | "warning" | "info",
    message: string,
  ) => {
    setAlert({ type, message });
    setTimeout(() => setAlert(null), 3500);
  };

  // Fungsi untuk format Rupiah dengan titik
  const formatRupiah = (value: string): string => {
    // Hapus semua karakter selain angka
    const numberString = value.replace(/[^\d]/g, "");

    if (numberString === "") return "";

    // Format dengan titik setiap 3 digit
    return numberString.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  };

  // Fungsi untuk parse Rupiah ke number
  const parseRupiah = (value: string): string => {
    return value.replace(/\./g, "");
  };

  // Handler untuk input omset
  const handleOmsetChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    const rawValue = parseRupiah(inputValue);

    // Validasi hanya angka
    if (rawValue === "" || /^\d+$/.test(rawValue)) {
      setOmset(rawValue);
      setOmsetDisplay(formatRupiah(rawValue));
    }
  };

  useEffect(() => {
    const clientUser = getClientUser();
    if (!clientUser) {
      router.push("/login");
      return;
    }
    setUser(clientUser);
  }, [router]);

  const today = new Date().toISOString().split("T")[0];
  const todayInput = leadInputs.find((i) => i.input_date === today);
  const modeLabel = todayInput ? "Edit Data Hari Ini" : "Input Data Hari Ini";

  const openInputModal = () => {
    if (todayInput) {
      setLeadMasuk(todayInput.lead_masuk.toString());
      setClosing(todayInput.closing.toString());
      const omsetValue = todayInput.omset.toString();
      setOmset(omsetValue);
      setOmsetDisplay(formatRupiah(omsetValue));
      setNotes(todayInput.notes || "");
    } else {
      setLeadMasuk("");
      setClosing("");
      setOmset("");
      setOmsetDisplay("");
      setNotes("");
    }
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    const leadMasukNum = parseInt(leadMasuk, 10);
    const closingNum = parseInt(closing, 10);
    const omsetNum = parseInt(omset || "0", 10);

    const validation = LeadInputSchema.safeParse({
      lead_masuk: leadMasukNum,
      closing: closingNum,
      omset: omsetNum,
      notes: notes || null,
    });
    if (!validation.success) {
      showAlert("error", validation.error.issues[0]?.message ?? "Validasi gagal");
      return;
    }

    if (isNaN(leadMasukNum) || leadMasukNum < 0) {
      showAlert("error", "Lead Masuk harus berupa angka positif");
      return;
    }
    if (isNaN(closingNum) || closingNum < 0) {
      showAlert("error", "Closing harus berupa angka positif");
      return;
    }
    if (closingNum > leadMasukNum) {
      showAlert("error", "Closing tidak boleh melebihi Lead Masuk");
      return;
    }
    if (isNaN(omsetNum) || omsetNum < 0) {
      showAlert("error", "Omset harus berupa angka positif");
      return;
    }

    setIsSaving(true);
    try {
      const res = await fetch("/api/cs/inputs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lead_masuk: leadMasukNum,
          closing: closingNum,
          omset: omsetNum,
          notes: notes || null,
        }),
      });

      const body = await res.json();
      if (!res.ok) {
        throw new Error(body.error || "Gagal menyimpan data");
      }

      queryClient.invalidateQueries({ queryKey: ["cs-inputs"] });
      setIsModalOpen(false);
      showAlert(
        "success",
        body.action === "updated"
          ? "Data hari ini berhasil diperbarui!"
          : "Data hari ini berhasil disimpan!",
      );
    } catch (e) {
      showAlert(
        "error",
        e instanceof Error ? e.message : "Terjadi kesalahan server",
      );
    } finally {
      setIsSaving(false);
    }
  };

  // Stats untuk ringkasan
  const monthStart = today.slice(0, 7);
  const monthInputs = leadInputs.filter((i) =>
    i.input_date.startsWith(monthStart),
  );
  const totalLeadsMonth = monthInputs.reduce((sum, i) => sum + i.lead_masuk, 0);
  const totalClosingMonth = monthInputs.reduce((sum, i) => sum + i.closing, 0);
  const totalOmsetMonth = monthInputs.reduce(
    (sum, i) => sum + (i.omset ?? 0),
    0,
  );

  if (isLoading && !user) {
    return (
      <div className="flex h-screen bg-gray-50">
        <Sidebar role="customer_service" />
        <div className="flex-1 flex flex-col overflow-hidden">
          <Header userEmail="" role="customer_service" />
          <main className="flex-1 overflow-y-auto p-6">
            <Loading variant="skeleton" text="Memuat data input leads..." />
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar role="customer_service" />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header userEmail={user?.email || ""} role="customer_service" />
        <main className="flex-1 overflow-y-auto p-6">
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

          <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-4 mb-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-800 mb-1">
                Input Data Leads & Closing
              </h2>
              <p className="text-gray-600">
                Cabang {user?.branch?.name ?? "Anda"} · data hari ini bisa
                diedit sampai tengah malam
              </p>
            </div>
            <Button
              variant="primary"
              onClick={openInputModal}
              leftIcon={todayInput ? <Pencil className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            >
              {modeLabel}
            </Button>
          </div>

          {/* Ringkasan bulan ini */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 mb-8">
            <div className="bg-white rounded-xl shadow-sm p-5 border-l-4 border-blue-500">
              <p className="text-sm text-gray-600 mb-2">Total Input</p>
              <p className="text-2xl font-bold text-gray-800">
                {monthInputs.length}
              </p>
              <p className="text-xs text-gray-500 mt-1">hari bulan ini</p>
            </div>
            <div className="bg-white rounded-xl shadow-sm p-6 border-l-4 border-green-500">
              <p className="text-sm text-gray-600 mb-2">Total Lead Masuk</p>
              <p className="text-2xl font-bold text-gray-800">
                {totalLeadsMonth.toLocaleString("id-ID")}
              </p>
              <p className="text-xs text-gray-500 mt-1">bulan ini</p>
            </div>
            <div className="bg-white rounded-xl shadow-sm p-6 border-l-4 border-purple-500">
              <p className="text-sm text-gray-600 mb-2">Total Closing</p>
              <p className="text-2xl font-bold text-gray-800">
                {totalClosingMonth.toLocaleString("id-ID")}
              </p>
              <p className="text-xs text-gray-500 mt-1">bulan ini</p>
            </div>
            <div className="bg-white rounded-xl shadow-sm p-6 border-l-4 border-amber-500">
              <p className="text-sm text-gray-600 mb-2">Total Omset</p>
              <p className="text-2xl font-bold text-gray-800">
                {totalOmsetMonth.toLocaleString("id-ID", {
                  style: "currency",
                  currency: "IDR",
                  maximumFractionDigits: 0,
                })}
              </p>
              <p className="text-xs text-gray-500 mt-1">bulan ini</p>
            </div>
          </div>

          {/* Tabel */}
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-800">
                Riwayat Input Data
              </h3>
              <p className="text-sm text-gray-500">
                {leadInputs.length} entri · urut dari terbaru
              </p>
            </div>

            {isLoading ? (
              <div className="p-10">
                <Loading variant="dots" text="Memuat riwayat..." />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Tanggal
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Lead Masuk
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Closing
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        CR
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Omset
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Catatan
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {leadInputs.length === 0 ? (
                      <tr>
                        <td
                          colSpan={6}
                          className="px-6 py-10 text-center text-gray-500"
                        >
                          Belum ada data input.
                        </td>
                      </tr>
                    ) : (
                      leadInputs.map((item) => {
                        const cr =
                          item.lead_masuk > 0
                            ? (item.closing / item.lead_masuk) * 100
                            : 0;
                        const isToday = item.input_date === today;
                        return (
                          <tr
                            key={item.id}
                            className={`hover:bg-gray-50 transition-colors ${isToday ? "bg-indigo-50/40" : ""}`}
                          >
                            <td className="px-6 py-4 whitespace-nowrap text-gray-700">
                              {new Date(item.input_date).toLocaleDateString(
                                "id-ID",
                                {
                                  day: "2-digit",
                                  month: "short",
                                  year: "numeric",
                                },
                              )}
                              {isToday && (
                                <span className="ml-2 text-xs text-indigo-600 font-medium">
                                  (hari ini · bisa diedit)
                                </span>
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-gray-700">
                              {item.lead_masuk.toLocaleString("id-ID")}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-gray-700">
                              {item.closing.toLocaleString("id-ID")}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span
                                className={`text-sm font-semibold ${
                                  cr > 30
                                    ? "text-green-600"
                                    : cr > 20
                                      ? "text-yellow-600"
                                      : "text-red-600"
                                }`}
                              >
                                {cr.toFixed(1)}%
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-gray-700">
                              {(item.omset ?? 0).toLocaleString("id-ID", {
                                style: "currency",
                                currency: "IDR",
                                maximumFractionDigits: 0,
                              })}
                            </td>
                            <td className="px-6 py-4 text-gray-500 max-w-xs truncate">
                              {item.notes || "-"}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Modal Input / Edit */}
          <Modal
            isOpen={isModalOpen}
            onClose={() => !isSaving && setIsModalOpen(false)}
            title={todayInput ? "Edit Data Hari Ini" : "Input Data Hari Ini"}
            size="md"
          >
            <div className="space-y-4">
              <div className="bg-gray-50 rounded-lg p-3 mb-2">
                <p className="text-xs text-gray-500 uppercase tracking-wide">
                  Cabang & Tanggal
                </p>
                <p className="font-semibold text-gray-800">
                  {user?.branch?.name ?? "-"} ·{" "}
                  {new Date(today).toLocaleDateString("id-ID", {
                    weekday: "long",
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </p>
              </div>

              <Input
                label="Lead Masuk"
                type="number"
                value={leadMasuk}
                onChange={(e) => setLeadMasuk(e.target.value)}
                placeholder="Jumlah lead masuk"
                disabled={isSaving}
                helperText="Total lead yang masuk hari ini"
                min="0"
              />

              <Input
                label="Closing"
                type="number"
                value={closing}
                onChange={(e) => setClosing(e.target.value)}
                placeholder="Jumlah closing"
                disabled={isSaving}
                helperText="Jumlah lead yang berhasil closing hari ini"
                min="0"
              />

              {/* Input Omset dengan format Rupiah */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Omset (Rp)
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <span className="text-gray-500 sm:text-sm">Rp</span>
                  </div>
                  <input
                    type="text"
                    value={omsetDisplay}
                    onChange={handleOmsetChange}
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    placeholder="Contoh: 1.000.000"
                    disabled={isSaving}
                  />
                </div>
                {omsetDisplay && (
                  <p className="mt-1 text-xs text-gray-500">
                    Nilai: Rp {omsetDisplay}
                  </p>
                )}
                <p className="mt-1 text-xs text-gray-500">
                  Total nilai transaksi / penjualan hari ini
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Catatan (Opsional)
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  rows={3}
                  placeholder="Contoh: Lead dari event offline, campaign baru, dsb."
                  disabled={isSaving}
                />
              </div>

              {leadMasuk !== "" &&
                closing !== "" &&
                parseInt(closing) > parseInt(leadMasuk) && (
                  <div className="text-sm text-red-600 bg-red-50 border border-red-200 p-3 rounded-lg flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    Closing tidak boleh melebihi Lead Masuk
                  </div>
                )}

              <div className="flex justify-end gap-3 pt-2">
                <Button
                  variant="secondary"
                  onClick={() => setIsModalOpen(false)}
                  disabled={isSaving}
                >
                  Batal
                </Button>
                <Button
                  variant="primary"
                  onClick={handleSave}
                  isLoading={isSaving}
                  disabled={
                    !leadMasuk ||
                    !closing ||
                    !omset ||
                    parseInt(closing) > parseInt(leadMasuk)
                  }
                >
                  {todayInput ? "Simpan Perubahan" : "Simpan Data"}
                </Button>
              </div>
            </div>
          </Modal>
        </main>
      </div>
    </div>
  );
}
