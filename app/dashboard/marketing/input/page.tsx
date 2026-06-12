// app/dashboard/marketing/input/page.tsx

"use client";

import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { fetcher } from "@/lib/api";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/layout/Sidebar";
import Header from "@/components/layout/Header";
import { getClientUser, type ClientUser } from "@/lib/auth/session";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Modal from "@/components/ui/Modal";
import Loading from "@/components/ui/Loading";
import Alert from "@/components/ui/Alert";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { Plus, Trash2, AlertTriangle } from "lucide-react";
import { MarketingInputSchema } from "@/lib/schemas/marketing-input";

import type { MarketingInput } from "@/types/marketing";

interface Channel {
  id: string;
  name: string;
  description: string;
  is_active: boolean;
}

interface CSUser {
  id: string;
  full_name: string;
  email: string;
  branch_id: string;
  branch_name?: string;
}

interface CSInput {
  id: string;
  user_id: string;
  branch_id: string;
  input_date: string;
  lead_masuk: number;
  closing: number;
  notes: string | null;
  users?: {
    full_name: string;
    email: string;
  };
  branches?: {
    name: string;
    code: string;
  };
}

export default function InputMarketingPage() {
  const router = useRouter();
  const [user, setUser] = useState<ClientUser | null>(null);
  const [selectedCSUser, setSelectedCSUser] = useState("");
  const [selectedCSInputId, setSelectedCSInputId] = useState("");
  const [selectedChannel, setSelectedChannel] = useState("");
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [biayaMarketing, setBiayaMarketing] = useState("");
  const [leadSerius, setLeadSerius] = useState("");
  const [leadAll, setLeadAll] = useState("");
  const [closing, setClosing] = useState("");
  const [notes, setNotes] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);
  const [alert, setAlert] = useState<{
    type: "success" | "error" | "warning" | "info";
    message: string;
  } | null>(null);

  const queryClient = useQueryClient();

  const channelsQuery = useQuery({
    queryKey: ["marketing-channels"],
    queryFn: () => fetcher<{ data: Channel[] }>("/api/marketing/channels"),
  });

  const csUsersQuery = useQuery({
    queryKey: ["cs-users"],
    queryFn: () => fetcher<{ data: CSUser[] }>("/api/cs/users"),
  });

  const marketingInputsQuery = useQuery({
    queryKey: ["marketing-inputs"],
    queryFn: () => fetcher<{ data: MarketingInput[] }>("/api/marketing/inputs?limit=100"),
  });

  const csInputsQuery = useQuery({
    queryKey: ["cs-inputs", selectedCSUser],
    queryFn: () => fetcher<{ data: CSInput[] }>(`/api/cs/inputs?user_id=${selectedCSUser}&limit=50`),
    enabled: !!selectedCSUser,
  });

  const marketingInputs = marketingInputsQuery.data?.data ?? [];
  const channels = channelsQuery.data?.data ?? [];
  const csUsers = csUsersQuery.data?.data ?? [];
  const csInputs = csInputsQuery.data?.data ?? [];
  const isLoading = channelsQuery.isLoading || csUsersQuery.isLoading || marketingInputsQuery.isLoading;

  // Confirm Dialog state
  const [confirmDialog, setConfirmDialog] = useState({
    isOpen: false,
    deleteId: "",
    deleteChannel: "",
    isDeleting: false,
  });

  // Format number with thousand separators
  const formatNumber = (value: string | number) => {
    if (!value) return "";
    const num =
      typeof value === "string" ? value.replace(/\./g, "") : value.toString();
    const parsed = parseInt(num);
    if (isNaN(parsed)) return "";
    return parsed.toLocaleString("id-ID");
  };

  // Handle input with thousand separators
  const handleNumberInput = (value: string, setter: (val: string) => void) => {
    const cleanValue = value.replace(/\./g, "");
    if (cleanValue === "" || /^\d+$/.test(cleanValue)) {
      setter(cleanValue);
    }
  };

  // Handle CS user selection
  const handleCSUserChange = (userId: string) => {
    setSelectedCSUser(userId);
    setSelectedCSInputId("");
    setLeadSerius("");
    setClosing("");
  };

  // Handle CS input selection (auto-fill lead_serius and closing)
  const handleCSInputChange = (inputId: string) => {
    const selectedInput = csInputs.find((item) => item.id === inputId);
    if (selectedInput) {
      setLeadSerius(selectedInput.lead_masuk.toString());
      setClosing(selectedInput.closing.toString());
    }
    setSelectedCSInputId(inputId);
  };

  useEffect(() => {
    const clientUser = getClientUser();
    if (!clientUser) {
      router.push("/login");
      return;
    }
    setUser(clientUser);
  }, [router]);

  const calculateMetrics = (data: MarketingInput) => {
    const crSerius =
      data.lead_serius > 0 ? (data.closing / data.lead_serius) * 100 : 0;
    return { crSerius };
  };

  const handleSave = async () => {
    const result = MarketingInputSchema.safeParse({
      channel: selectedChannel,
      biayaMarketing,
      leadAll,
      leadSerius,
      closing,
      notes,
    });
    if (!result.success) {
      const firstIssue = result.error.issues[0];
      setAlert({
        type: "error",
        message: firstIssue.message,
      });
      setTimeout(() => setAlert(null), 3000);
      return;
    }

    const biayaMarketingNum = parseInt(biayaMarketing) || 0;
    const leadSeriusNum = parseInt(leadSerius) || 0;
    const leadAllNum = parseInt(leadAll) || 0;
    const closingNum = parseInt(closing) || 0;

    setIsSaving(true);

    try {
      const response = await fetch("/api/marketing/inputs", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          channel: selectedChannel,
          biaya_marketing: biayaMarketingNum,
          lead_serius: leadSeriusNum,
          lead_all: leadAllNum,
          closing: closingNum,
          notes: notes || null,
          input_date: selectedDate,
          cs_input_id: selectedCSInputId || null,
          cs_user_id: selectedCSUser || null,
        }),
      });

      const data = await response.json();

      if (response.ok && data.data) {
        setModalError(null);
        setAlert({
          type: "success",
          message: "Data marketing berhasil disimpan!",
        });
        setIsModalOpen(false);
        resetForm();
        queryClient.invalidateQueries({ queryKey: ["marketing-inputs"] });
      } else if (response.status === 409) {
        setModalError(
          data.error || "Data sudah ada untuk channel dan tanggal ini.",
        );
      } else {
        throw new Error(data.error || "Gagal menyimpan data");
      }
    } catch (error) {
      console.error("Error saving data:", error);
      setModalError(
        error instanceof Error ? error.message : "Gagal menyimpan data",
      );
    } finally {
      setIsSaving(false);
    }
  };

  // Handle delete with confirm dialog
  const handleDeleteClick = (id: string, channelName: string) => {
    setConfirmDialog({
      isOpen: true,
      deleteId: id,
      deleteChannel: channelName,
      isDeleting: false,
    });
  };

  const handleConfirmDelete = async () => {
    setConfirmDialog((prev) => ({ ...prev, isDeleting: true }));

    try {
      const response = await fetch(
        `/api/marketing/inputs?id=${confirmDialog.deleteId}`,
        {
          method: "DELETE",
        },
      );

      const data = await response.json();

      if (response.ok && data.success) {
        setAlert({
          type: "success",
          message: `Data ${confirmDialog.deleteChannel} berhasil dihapus`,
        });
        queryClient.invalidateQueries({ queryKey: ["marketing-inputs"] });
      } else {
        throw new Error(data.error || "Gagal menghapus data");
      }
    } catch (error) {
      console.error("Error deleting data:", error);
      setAlert({
        type: "error",
        message:
          error instanceof Error ? error.message : "Gagal menghapus data",
      });
    } finally {
      setConfirmDialog({
        isOpen: false,
        deleteId: "",
        deleteChannel: "",
        isDeleting: false,
      });
      setTimeout(() => setAlert(null), 3000);
    }
  };

  const resetForm = () => {
    setSelectedCSUser("");
    setSelectedCSInputId("");
    setSelectedChannel("");
    setSelectedDate(new Date().toISOString().split("T")[0]);
    setBiayaMarketing("");
    setLeadSerius("");
    setLeadAll("");
    setClosing("");
    setNotes("");
  };

  const formatRupiah = (value: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(value);
  };

  // Hitung statistik
  const today = new Date().toISOString().split("T")[0];
  const currentMonth = today.slice(0, 7);

  const todayInputs = marketingInputs.filter(
    (item) => item.input_date === today,
  );
  const totalBiayaBulanIni = marketingInputs
    .filter((item) => item.input_date.startsWith(currentMonth))
    .reduce((sum, item) => sum + item.biaya_marketing, 0);

  // Validasi real-time untuk UI
  const leadAllNum = parseInt(leadAll) || 0;
  const leadSeriusNum = parseInt(leadSerius) || 0;
  const closingNum = parseInt(closing) || 0;

  const leadSeriusError = leadSeriusNum > leadAllNum;
  const closingError = closingNum > leadSeriusNum;

  if (isLoading) {
    return (
      <div className="flex h-screen bg-gray-50">
        <Sidebar role="marketing" />
        <div className="flex-1 flex flex-col overflow-hidden">
          <Header userEmail={user?.email || ""} role="marketing" />
          <main className="flex-1 overflow-y-auto p-6">
            <Loading variant="skeleton" text="Memuat data marketing..." />
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar role="marketing" />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header userEmail="marketing@company.com" role="marketing" />
        <main className="flex-1 overflow-y-auto p-6">
          {/* Alert */}
          {alert && (
            <div className="mb-6 animate-slide-down">
              <Alert
                type={alert.type}
                message={alert.message}
                onClose={() => setAlert(null)}
                autoClose
                duration={3000}
              />
            </div>
          )}

          {/* Confirm Dialog */}
          <ConfirmDialog
            isOpen={confirmDialog.isOpen}
            title="Hapus Data Marketing"
            message={`Apakah Anda yakin ingin menghapus data marketing untuk channel "${confirmDialog.deleteChannel}"? Data yang sudah dihapus tidak dapat dikembalikan.`}
            confirmText="Hapus"
            cancelText="Batal"
            variant="danger"
            isLoading={confirmDialog.isDeleting}
            onConfirm={handleConfirmDelete}
            onCancel={() =>
              setConfirmDialog((prev) => ({ ...prev, isOpen: false }))
            }
          />

          {/* Header */}
          <div className="flex justify-between items-center mb-8">
            <div>
              <h2 className="text-2xl font-bold text-gray-800 mb-2">
                Input Data Marketing
              </h2>
              <p className="text-gray-600">
                Input data performa channel marketing berdasarkan data CS
              </p>
            </div>
            <Button
              variant="primary"
              onClick={() => {
                setModalError(null);
                setIsModalOpen(true);
              }}
              leftIcon={<Plus className="w-4 h-4" />}
            >
              Input Data Baru
            </Button>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <div className="bg-white rounded-xl shadow-sm p-6 border-l-4 border-blue-500">
              <p className="text-sm text-gray-600 mb-2">Total Input Hari Ini</p>
              <p className="text-2xl font-bold text-gray-800">
                {todayInputs.length}
              </p>
            </div>
            <div className="bg-white rounded-xl shadow-sm p-6 border-l-4 border-green-500">
              <p className="text-sm text-gray-600 mb-2">Total Data Tersimpan</p>
              <p className="text-2xl font-bold text-gray-800">
                {marketingInputs.length}
              </p>
            </div>
            <div className="bg-white rounded-xl shadow-sm p-6 border-l-4 border-orange-500">
              <p className="text-sm text-gray-600 mb-2">
                Total Biaya Marketing (Bulan Ini)
              </p>
              <p className="text-2xl font-bold text-gray-800">
                {formatRupiah(totalBiayaBulanIni)}
              </p>
            </div>
          </div>

          {/* History Table */}
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-800">
                Riwayat Input Data Marketing
              </h3>
              <p className="text-sm text-gray-500 mt-1">
                {marketingInputs.length} data tersimpan
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Tanggal
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Channel
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Biaya Mkt
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Lead Serius
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Lead All
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Closing
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      CR
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Aksi
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {marketingInputs.map((item) => {
                    const metrics = calculateMetrics(item);
                    return (
                      <tr key={item.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-gray-600">
                          {new Date(item.input_date).toLocaleDateString(
                            "id-ID",
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">
                          {item.channel}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-gray-600">
                          {formatRupiah(item.biaya_marketing)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-gray-600">
                          {item.lead_serius.toLocaleString("id-ID")}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-gray-600">
                          {item.lead_all.toLocaleString("id-ID")}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-gray-600">
                          {item.closing.toLocaleString("id-ID")}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`text-sm font-semibold ${
                              metrics.crSerius > 30
                                ? "text-green-600"
                                : metrics.crSerius > 20
                                  ? "text-yellow-600"
                                  : "text-red-600"
                            }`}
                          >
                            {metrics.crSerius.toFixed(1)}%
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <button
                            onClick={() =>
                              handleDeleteClick(item.id, item.channel)
                            }
                            className="text-red-600 hover:text-red-900 transition-colors"
                            title="Hapus data"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                  {marketingInputs.length === 0 && (
                    <tr>
                      <td
                        colSpan={8}
                        className="px-6 py-8 text-center text-gray-500"
                      >
                        Belum ada data input. Klik &ldquo;Input Data Baru&rdquo; untuk
                        mulai.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Modal Input Data */}
          <Modal
            isOpen={isModalOpen}
            onClose={() => {
              if (!isSaving) {
                setIsModalOpen(false);
                setModalError(null);
              }
            }}
            title="Input Data Marketing"
            size="lg"
          >
            <div className="space-y-4">
              {/* Pilih CS User */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Pilih Data CS <span className="text-red-500">*</span>
                </label>
                <select
                  value={selectedCSUser}
                  onChange={(e) => handleCSUserChange(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  disabled={isSaving}
                >
                  <option value="">Pilih CS</option>
                  {csUsers.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.full_name} - {user.email}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  Pilih CS untuk mengambil data lead dan closing dari input CS
                </p>
              </div>

              {/* Pilih Input CS */}
              {selectedCSUser && csInputs.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Pilih Input CS
                  </label>
                  <select
                    value={selectedCSInputId}
                    onChange={(e) => handleCSInputChange(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    disabled={isSaving}
                  >
                    <option value="">Pilih Input CS</option>
                    {csInputs.map((input) => (
                      <option key={input.id} value={input.id}>
                        {new Date(input.input_date).toLocaleDateString("id-ID")}{" "}
                        - Lead: {input.lead_masuk.toLocaleString("id-ID")} |
                        Closing: {input.closing.toLocaleString("id-ID")}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-500 mt-1">
                    Pilih input CS untuk mengisi Lead Serius dan Closing secara
                    otomatis
                  </p>
                </div>
              )}

              {selectedCSUser && csInputs.length === 0 && (
                <div className="text-sm text-yellow-600 bg-yellow-50 p-3 rounded-lg">
                  ⚠️ Belum ada data input untuk CS yang dipilih
                </div>
              )}

              <div className="border-t pt-4 mt-2">
                <p className="text-sm font-medium text-gray-700 mb-3">
                  Data Marketing
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Channel Marketing <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={selectedChannel}
                    onChange={(e) => setSelectedChannel(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    disabled={isSaving}
                    required
                  >
                    <option value="">Pilih Channel</option>
                    {channels.map((channel) => (
                      <option key={channel.id} value={channel.name}>
                        {channel.name}
                      </option>
                    ))}
                  </select>
                </div>
                <Input
                  label="Tanggal"
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  disabled={isSaving}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Biaya Marketing (Rp)"
                  type="text"
                  value={biayaMarketing ? formatNumber(biayaMarketing) : ""}
                  onChange={(e) =>
                    handleNumberInput(e.target.value, setBiayaMarketing)
                  }
                  placeholder="0"
                  disabled={isSaving}
                  helperText="Total biaya yang dikeluarkan"
                  required
                />
              </div>

              {/* Input dengan validasi visual */}
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Lead All <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={leadAll ? formatNumber(leadAll) : ""}
                    onChange={(e) =>
                      handleNumberInput(e.target.value, setLeadAll)
                    }
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent ${
                      leadAllNum > 0 ? "border-gray-300" : "border-red-300"
                    }`}
                    placeholder="Total semua leads"
                    disabled={isSaving}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Total leads dari channel
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Lead Serius
                  </label>
                  <input
                    type="text"
                    value={leadSerius ? formatNumber(leadSerius) : ""}
                    onChange={(e) =>
                      handleNumberInput(e.target.value, setLeadSerius)
                    }
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent ${
                      leadSeriusError
                        ? "border-red-300 bg-red-50"
                        : "border-gray-300"
                    }`}
                    placeholder="0"
                    disabled={isSaving}
                    max={leadAll || undefined}
                  />
                  {leadSeriusError && (
                    <p className="text-xs text-red-500 mt-1">
                      ⚠️ Maksimal {leadAllNum.toLocaleString("id-ID")}
                    </p>
                  )}
                  <p className="text-xs text-gray-500 mt-1">
                    Dari data CS (terisi otomatis)
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Closing
                  </label>
                  <input
                    type="text"
                    value={closing ? formatNumber(closing) : ""}
                    onChange={(e) =>
                      handleNumberInput(e.target.value, setClosing)
                    }
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent ${
                      closingError
                        ? "border-red-300 bg-red-50"
                        : "border-gray-300"
                    }`}
                    placeholder="0"
                    disabled={isSaving}
                    max={leadSerius || undefined}
                  />
                  {closingError && (
                    <p className="text-xs text-red-500 mt-1">
                      ⚠️ Maksimal {leadSeriusNum.toLocaleString("id-ID")}
                    </p>
                  )}
                  <p className="text-xs text-gray-500 mt-1">
                    Dari data CS (terisi otomatis)
                  </p>
                </div>
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
                  placeholder="Tambahkan catatan tentang campaign..."
                  disabled={isSaving}
                />
              </div>

              {/* Error Messages */}
              {leadSeriusError && (
                <div className="text-sm text-red-600 bg-red-50 border border-red-200 p-3 rounded-lg flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <span>
                    Lead Serius ({leadSeriusNum.toLocaleString("id-ID")}) tidak
                    boleh melebihi Lead All (
                    {leadAllNum.toLocaleString("id-ID")})
                  </span>
                </div>
              )}

              {closingError && (
                <div className="text-sm text-red-600 bg-red-50 border border-red-200 p-3 rounded-lg flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <span>
                    Closing ({closingNum.toLocaleString("id-ID")}) tidak boleh
                    melebihi Lead Serius (
                    {leadSeriusNum.toLocaleString("id-ID")})
                  </span>
                </div>
              )}

              {modalError && (
                <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                  <svg
                    className="mt-0.5 h-4 w-4 flex-shrink-0"
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
                  <span>{modalError}</span>
                </div>
              )}

              <div className="flex justify-end space-x-3 mt-6 pt-4 border-t">
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
                    !selectedChannel ||
                    !biayaMarketing ||
                    !leadAll ||
                    leadAllNum <= 0 ||
                    leadSeriusError ||
                    closingError
                  }
                >
                  Simpan Data
                </Button>
              </div>
            </div>
          </Modal>
        </main>
      </div>
    </div>
  );
}
