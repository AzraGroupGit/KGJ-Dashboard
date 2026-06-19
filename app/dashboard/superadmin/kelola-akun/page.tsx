// app/dashboard/superadmin/kelola-akun/page.tsx

"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetcher } from "@/lib/api";
import Sidebar from "@/components/layout/Sidebar";
import Header from "@/components/layout/Header";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import Alert from "@/components/ui/Alert";
import Loading from "@/components/ui/Loading";
import { getClientUser, type ClientUser } from "@/lib/auth/session";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import {
  Building2,
  MapPin,
  Pencil,
  Phone,
  Plus,
  Power,
  Trash2,
  User,
  Users,
  Wrench,
  Shield,
} from "lucide-react";
import {
  SEGMENT_OPTIONS,
  EMPTY_BMS_FORM,
  EMPTY_OPRPRD_FORM,
  EMPTY_SUPERVISOR_FORM,
  EMPTY_BRANCH_FORM,
  EMPTY_MANAGEMENT_FORM,
  parseApiError,
  resolveUserType,
  getRoleBadge,
  getStatusBadge,
  getBranchStatusBadge,
  formatDate,
  currentUserIsActive,
  type UnifiedUser,
  type RoleOPRPRD,
  type Branch,
  type AlertState,
  type UserSegment,
  type NewUserType,
} from "./_components/shared";
import { UserTypePicker } from "./_components/UserTypePicker";
import { BmsUserForm } from "./_components/BmsUserForm";
import { SupervisorUserForm } from "./_components/SupervisorUserForm";
import { OprprdUserForm } from "./_components/OprprdUserForm";
import { BranchForm } from "./_components/BranchForm";
import { ManagementUserForm } from "./_components/ManagementUserForm";
import {
  BmsUserSchema,
  BmsEditUserSchema,
  OprprdUserSchema,
  OprprdEditUserSchema,
  SupervisorUserSchema,
  SupervisorEditUserSchema,
  ManagementUserSchema,
  ManagementEditUserSchema,
} from "@/lib/schemas/kelola-akun";

export default function KelolaAkunPage() {
  const [activeTab, setActiveTab] = useState<"all" | "bms" | "oprprd" | "management" | "branches">("all");
  const [clientUser, setClientUser] = useState<ClientUser | null>(null);
  const [alert, setAlert] = useState<AlertState>(null);

  const [allUsers, setAllUsers] = useState<UnifiedUser[]>([]);
  const [roles, setRoles] = useState<RoleOPRPRD[]>([]);
  const [segment, setSegment] = useState<UserSegment>("all");
  const [showInactive, setShowInactive] = useState(false);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UnifiedUser | null>(null);
  const [newUserType, setNewUserType] = useState<NewUserType>(null);

  const [bmsForm, setBmsForm] = useState(EMPTY_BMS_FORM);
  const [oprprdForm, setOprprdForm] = useState(EMPTY_OPRPRD_FORM);
  const [supervisorForm, setSupervisorForm] = useState(EMPTY_SUPERVISOR_FORM);
  const [managementForm, setManagementForm] = useState(EMPTY_MANAGEMENT_FORM);

  const [userToDelete, setUserToDelete] = useState<UnifiedUser | null>(null);
  const [isDeletingUser, setIsDeletingUser] = useState(false);

  const [userToToggle, setUserToToggle] = useState<UnifiedUser | null>(null);

  const [branches, setBranches] = useState<Branch[]>([]);
  const [selectedBranch, setSelectedBranch] = useState<Branch | null>(null);
  const [branchForm, setBranchForm] = useState(EMPTY_BRANCH_FORM);
  const [branchToDelete, setBranchToDelete] = useState<Branch | null>(null);
  const [branchToToggle, setBranchToToggle] = useState<Branch | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    setClientUser(getClientUser());
  }, []);

  const showAlert = (
    type: NonNullable<AlertState>["type"],
    message: string,
  ) => {
    setAlert({ type, message });
    setTimeout(() => setAlert(null), 5000);
  };

  // ─── Data fetching ─────────────────────────────────────────────

  interface UsersResponse { data: Record<string, unknown>[]; }
  interface RolesResponse { data: Record<string, unknown>[]; }
  interface BranchesResponse { data: Record<string, unknown>[]; }

  const { data: usersData, isLoading: usersLoading, refetch: refetchUsers } = useQuery<UsersResponse>({
    queryKey: ["users", showInactive],
    queryFn: () => {
      const params = new URLSearchParams({ limit: "500" });
      if (!showInactive) params.append("status", "active");
      return fetcher(`/api/users?${params.toString()}`);
    },
  });

  const { data: rolesData, isLoading: rolesLoading } = useQuery<RolesResponse>({
    queryKey: ["roles"],
    queryFn: () => fetcher("/api/roles"),
  });

  const { data: branchesData, isLoading: branchesLoading, refetch: refetchBranches } = useQuery<BranchesResponse>({
    queryKey: ["branches"],
    queryFn: () => fetcher("/api/branches"),
  });

  const isQueriesLoading = usersLoading || rolesLoading || branchesLoading;

  useEffect(() => {
    if (usersData?.data) {
      setAllUsers(
        ((usersData.data ?? []) as unknown as UnifiedUser[]).map((u) => ({
          ...u,
          userType: resolveUserType(u as unknown as Parameters<typeof resolveUserType>[0]),
        })),
      );
    }
  }, [usersData]);

  useEffect(() => {
    if (rolesData?.data) {
      const BMS_NAMES = new Set(["superadmin", "customer_service", "marketing"]);
      setRoles(
        ((rolesData.data ?? []) as unknown as RoleOPRPRD[]).filter(
          (r: RoleOPRPRD) => !BMS_NAMES.has(r.name),
        ),
      );
    }
  }, [rolesData]);

  useEffect(() => {
    if (branchesData?.data) {
      setBranches((branchesData.data ?? []) as unknown as Branch[]);
    }
  }, [branchesData]);

  // ─── Filtered & stats ──────────────────────────────────────────

  const filteredUsers = allUsers.filter((u) => {
    if (segment === "all") return true;
    if (segment === "bms") return u.userType === "bms";
    return u.roles?.role_group === segment;
  });

  const stats = {
    total: allUsers.length,
    bms: allUsers.filter((u) => u.userType === "bms").length,
    management: allUsers.filter((u) => u.roles?.role_group === "management").length,
    operational: allUsers.filter((u) => u.roles?.role_group === "operational").length,
    production: allUsers.filter((u) => u.roles?.role_group === "production").length,
    active: allUsers.filter((u) =>
      u.userType === "bms" ? u.status === "active" : u.is_active,
    ).length,
  };

  const displayUsers = (() => {
    if (activeTab === "all") return filteredUsers;
    if (activeTab === "bms") return allUsers.filter((u) => u.userType === "bms");
    if (activeTab === "oprprd") return allUsers.filter((u) => u.userType === "oprprd");
    if (activeTab === "management") return allUsers.filter((u) => u.userType === "supervisor" || u.userType === "management");
    return [];
  })();

  // ─── Modal handlers ────────────────────────────────────────────

  const handleOpenCreateModal = () => {
    setIsEditMode(false);
    setSelectedUser(null);
    setNewUserType(
      activeTab === "bms" ? "bms" :
      activeTab === "oprprd" ? "oprprd" :
      activeTab === "management" ? "management" :
      null
    );
    setBmsForm(EMPTY_BMS_FORM);
    setOprprdForm(EMPTY_OPRPRD_FORM);
    setSupervisorForm(EMPTY_SUPERVISOR_FORM);
    setManagementForm(EMPTY_MANAGEMENT_FORM);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (user: UnifiedUser) => {
    setIsEditMode(true);
    setSelectedUser(user);
    setNewUserType(user.userType);
    if (user.userType === "bms") {
      setBmsForm({
        full_name: user.full_name,
        email: user.email ?? "",
        password: "",
        role: (user.role as typeof EMPTY_BMS_FORM.role) ?? "customer_service",
        branch_id: user.branch_id ?? "",
      });
    } else if (user.userType === "supervisor") {
      setSupervisorForm({
        username: user.username ?? "",
        full_name: user.full_name,
        email: user.email?.endsWith("@noreply.kodagede.id") ? "" : (user.email ?? ""),
        password: "",
        role: (user.roles?.name as "operational_supervisor" | "production_supervisor") ?? "operational_supervisor",
      });
    } else if (user.userType === "management") {
      setManagementForm({
        username: user.username ?? "",
        full_name: user.full_name,
        email: user.email?.endsWith("@noreply.kodagede.id") ? "" : (user.email ?? ""),
        password: "",
        role: user.roles?.name ?? "leader_operational",
      });
    } else {
      setOprprdForm({
        username: user.username ?? "",
        full_name: user.full_name,
        email: user.email?.endsWith("@internal.local") ? "" : (user.email ?? ""),
        phone: user.phone ?? "",
        password: "",
        role_id: user.role_id ?? "",
      });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    if (isSaving) return;
    setIsModalOpen(false);
  };

  // ─── Save BMS ──────────────────────────────────────────────────

  const handleSaveBmsUser = async () => {
    const schema = isEditMode ? BmsEditUserSchema : BmsUserSchema;
    const validation = schema.safeParse({
      full_name: bmsForm.full_name,
      email: bmsForm.email,
      password: bmsForm.password,
      role: bmsForm.role,
      branch_id: bmsForm.branch_id || undefined,
    });
    if (!validation.success) {
      showAlert("error", validation.error.issues[0]?.message ?? "Validasi gagal");
      return;
    }
    if (!bmsForm.full_name.trim() || !bmsForm.email.trim()) {
      showAlert("error", "Nama lengkap dan email wajib diisi.");
      return;
    }
    if (!isEditMode && !bmsForm.password) {
      showAlert("error", "Password wajib diisi untuk akun baru.");
      return;
    }
    if (bmsForm.password && bmsForm.password.length < 6) {
      showAlert("error", "Password terlalu pendek, minimal 6 karakter.");
      return;
    }
    if (bmsForm.role === "customer_service" && !bmsForm.branch_id) {
      showAlert("error", "Pilih cabang terlebih dahulu untuk role Customer Service.");
      return;
    }
    setIsSaving(true);
    try {
      const payload = {
        full_name: bmsForm.full_name.trim(),
        email: bmsForm.email.trim(),
        role: bmsForm.role,
        branch_id: bmsForm.role === "customer_service" ? bmsForm.branch_id || null : null,
        ...(bmsForm.password ? { password: bmsForm.password } : {}),
      };
      const res = await fetch(
        isEditMode ? `/api/users/${selectedUser!.id}` : "/api/users",
        { method: isEditMode ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) },
      );
      const json = await res.json();
      if (!res.ok) { showAlert("error", parseApiError(json.error, res.status)); return; }
      showAlert("success", isEditMode ? "Akun berhasil diperbarui!" : "Akun BMS baru berhasil dibuat!");
      setIsModalOpen(false);
      setTimeout(() => { refetchUsers(); }, 500);
    } finally {
      setIsSaving(false);
    }
  };

  // ─── Save OPRPRD ───────────────────────────────────────────────

  const handleSaveOprprdUser = async () => {
    const schema = isEditMode ? OprprdEditUserSchema : OprprdUserSchema;
    const validation = schema.safeParse({
      username: oprprdForm.username,
      full_name: oprprdForm.full_name,
      password: oprprdForm.password,
      role_id: oprprdForm.role_id,
      email: oprprdForm.email || undefined,
      phone: oprprdForm.phone || undefined,
    });
    if (!validation.success) {
      showAlert("error", validation.error.issues[0]?.message ?? "Validasi gagal");
      return;
    }
    if (!oprprdForm.username.trim() || !oprprdForm.full_name.trim()) {
      showAlert("error", "Username dan nama lengkap wajib diisi.");
      return;
    }
    if (oprprdForm.username.trim().length < 3) {
      showAlert("error", "Username terlalu pendek, minimal 3 karakter.");
      return;
    }
    if (!oprprdForm.role_id) { showAlert("error", "Role wajib dipilih."); return; }
    if (!isEditMode && !oprprdForm.password) {
      showAlert("error", "Password wajib diisi untuk akun baru.");
      return;
    }
    if (oprprdForm.password && oprprdForm.password.length < 6) {
      showAlert("error", "Password terlalu pendek, minimal 6 karakter.");
      return;
    }
    setIsSaving(true);
    try {
      const payload: Record<string, string | null> = {
        username: oprprdForm.username.trim(),
        full_name: oprprdForm.full_name.trim(),
        email: oprprdForm.email.trim() || null,
        phone: oprprdForm.phone.trim() || null,
        role_id: oprprdForm.role_id,
      };
      if (oprprdForm.password) payload.password = oprprdForm.password;
      const res = await fetch(
        isEditMode ? `/api/users/${selectedUser!.id}` : "/api/users",
        { method: isEditMode ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) },
      );
      const json = await res.json();
      if (!res.ok) { showAlert("error", parseApiError(json.error, res.status)); return; }
      showAlert("success", isEditMode ? "Akun berhasil diperbarui!" : "Akun Operasional/Produksi baru berhasil dibuat!");
      setIsModalOpen(false);
      setTimeout(() => { refetchUsers(); }, 500);
    } finally {
      setIsSaving(false);
    }
  };

  // ─── Save Supervisor ───────────────────────────────────────────

  const handleSaveSupervisorUser = async () => {
    const schema = isEditMode ? SupervisorEditUserSchema : SupervisorUserSchema;
    const validation = schema.safeParse({
      username: supervisorForm.username,
      full_name: supervisorForm.full_name,
      email: supervisorForm.email,
      password: supervisorForm.password,
      role: supervisorForm.role,
    });
    if (!validation.success) {
      showAlert("error", validation.error.issues[0]?.message ?? "Validasi gagal");
      return;
    }
    if (!supervisorForm.full_name.trim()) { showAlert("error", "Nama lengkap wajib diisi."); return; }
    if (!isEditMode && !supervisorForm.username.trim()) { showAlert("error", "Username wajib diisi."); return; }
    if (!supervisorForm.email.trim()) { showAlert("error", "Email wajib diisi untuk akun supervisor."); return; }
    if (!isEditMode && !supervisorForm.password) { showAlert("error", "Password wajib diisi untuk akun baru."); return; }
    if (supervisorForm.password && supervisorForm.password.length < 6) {
      showAlert("error", "Password terlalu pendek, minimal 6 karakter.");
      return;
    }
    setIsSaving(true);
    try {
      const payload: Record<string, string> = {
        full_name: supervisorForm.full_name.trim(),
        email: supervisorForm.email.trim().toLowerCase(),
        role: supervisorForm.role,
      };
      if (!isEditMode) payload.username = supervisorForm.username.trim();
      if (supervisorForm.password) payload.password = supervisorForm.password;
      const res = await fetch(
        isEditMode ? `/api/users/${selectedUser!.id}` : "/api/users",
        { method: isEditMode ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) },
      );
      const json = await res.json();
      if (!res.ok) { showAlert("error", parseApiError(json.error, res.status)); return; }
      showAlert("success", isEditMode ? "Akun supervisor berhasil diperbarui!" : "Akun supervisor baru berhasil dibuat!");
      setIsModalOpen(false);
      setTimeout(() => refetchUsers(), 500);
    } finally {
      setIsSaving(false);
    }
  };

  // ─── Save Management ───────────────────────────────────────────

  const handleSaveManagementUser = async () => {
    const schema = isEditMode ? ManagementEditUserSchema : ManagementUserSchema;
    const validation = schema.safeParse({
      username: managementForm.username,
      full_name: managementForm.full_name,
      email: managementForm.email,
      password: managementForm.password,
      role: managementForm.role,
    });
    if (!validation.success) {
      showAlert("error", validation.error.issues[0]?.message ?? "Validasi gagal");
      return;
    }
    if (!managementForm.full_name.trim()) { showAlert("error", "Nama lengkap wajib diisi."); return; }
    if (!isEditMode && !managementForm.username.trim()) { showAlert("error", "Username wajib diisi."); return; }
    if (!managementForm.email.trim()) { showAlert("error", "Email wajib diisi."); return; }
    if (!isEditMode && !managementForm.password) { showAlert("error", "Password wajib diisi untuk akun baru."); return; }
    if (managementForm.password && managementForm.password.length < 6) { showAlert("error", "Password terlalu pendek."); return; }
    if (!managementForm.role) { showAlert("error", "Leader role wajib dipilih."); return; }

    setIsSaving(true);
    try {
      const payload: Record<string, string> = {
        full_name: managementForm.full_name.trim(),
        email: managementForm.email.trim().toLowerCase(),
        role: managementForm.role,
      };
      if (!isEditMode) payload.username = managementForm.username.trim();
      if (managementForm.password) payload.password = managementForm.password;

      const res = await fetch(
        isEditMode ? `/api/users/${selectedUser!.id}` : "/api/users",
        { method: isEditMode ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) },
      );
      const json = await res.json();
      if (!res.ok) { showAlert("error", parseApiError(json.error, res.status)); return; }
      showAlert("success", isEditMode ? "Akun management berhasil diperbarui!" : "Akun management baru berhasil dibuat!");
      setIsModalOpen(false);
      setTimeout(() => refetchUsers(), 500);
    } finally {
      setIsSaving(false);
    }
  };

  // ─── Toggle / Delete user ─────────────────────────────────────

  const handleToggleUserStatus = async (user: UnifiedUser) => {
    const body =
      user.userType === "bms"
        ? { status: user.status === "active" ? "inactive" : "active" }
        : { is_active: !user.is_active };
    const res = await fetch(`/api/users/${user.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
    });
    const json = await res.json();
    if (!res.ok) { showAlert("error", parseApiError(json.error, res.status)); return; }
    const isNowActive = user.userType === "bms" ? user.status !== "active" : !user.is_active;
    showAlert("success", `Akun ${user.full_name} berhasil ${isNowActive ? "diaktifkan" : "dinonaktifkan"}.`);
    await refetchUsers();
  };

  const handleDeleteUser = async () => {
    if (!userToDelete) return;
    setIsDeletingUser(true);
    try {
      const res = await fetch(`/api/users/${userToDelete.id}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok) { showAlert("error", parseApiError(json.error, res.status)); return; }
      showAlert("success", `Akun ${userToDelete.full_name} berhasil dihapus.`);
      await refetchUsers();
    } finally {
      setIsDeletingUser(false);
      setUserToDelete(null);
    }
  };

  // ─── Branch handlers ───────────────────────────────────────────

  const handleOpenBranchModal = (branch?: Branch) => {
    if (branch) {
      setIsEditMode(true);
      setSelectedBranch(branch);
      setBranchForm({
        name: branch.name, code: branch.code, address: branch.address,
        phone: branch.phone ?? "", email: branch.email ?? "",
        pic: branch.pic ?? "", status: branch.status,
      });
    } else {
      setIsEditMode(false);
      setSelectedBranch(null);
      setBranchForm(EMPTY_BRANCH_FORM);
    }
    setIsModalOpen(true);
  };

  const handleSaveBranch = async () => {
    if (!branchForm.name.trim() || !branchForm.code.trim() || !branchForm.address.trim()) {
      showAlert("error", "Nama cabang, kode, dan alamat wajib diisi.");
      return;
    }
    setIsSaving(true);
    try {
      const payload = {
        name: branchForm.name.trim(), code: branchForm.code.trim(),
        address: branchForm.address.trim(),
        phone: branchForm.phone.trim() || null, email: branchForm.email.trim() || null,
        pic: branchForm.pic.trim() || null, status: branchForm.status,
      };
      const res = await fetch(
        isEditMode ? `/api/branches/${selectedBranch!.id}` : "/api/branches",
        { method: isEditMode ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) },
      );
      const json = await res.json();
      if (!res.ok) { showAlert("error", parseApiError(json.error, res.status)); return; }
      showAlert("success", isEditMode ? `Data ${branchForm.name} berhasil diperbarui.` : `Cabang ${branchForm.name} berhasil ditambahkan.`);
      setIsModalOpen(false);
      setTimeout(() => { refetchBranches(); }, 500);
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleBranchStatus = async (branch: Branch) => {
    const newStatus = branch.status === "active" ? "inactive" : "active";
    const res = await fetch(`/api/branches/${branch.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: newStatus }),
    });
    const json = await res.json();
    if (!res.ok) { showAlert("error", parseApiError(json.error, res.status)); return; }
    showAlert("success", `Cabang ${branch.name} berhasil ${newStatus === "active" ? "diaktifkan" : "dinonaktifkan"}.`);
    await refetchBranches();
  };

  const handleDeleteBranch = async () => {
    if (!branchToDelete) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/branches/${branchToDelete.id}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok) { showAlert("error", parseApiError(json.error, res.status)); return; }
      showAlert("success", `Cabang ${branchToDelete.name} berhasil dihapus.`);
      await refetchBranches();
    } finally {
      setIsDeleting(false);
      setBranchToDelete(null);
    }
  };

  const activeBranches = branches.filter((b) => b.status === "active");

  // ─── Render ────────────────────────────────────────────────────

  const modalTitle = (() => {
    if (activeTab === "branches") return isEditMode ? "Edit Cabang" : "Tambah Cabang Baru";
    if (isEditMode) {
      const prefix = `Edit Akun — `;
      if (selectedUser?.userType === "bms") return prefix + "BMS";
      if (selectedUser?.userType === "supervisor")
        return prefix + (selectedUser.roles?.name === "production_supervisor" ? "Supervisor Produksi" : "Supervisor Operasional");
      if (selectedUser?.userType === "management")
        return prefix + "Management";
      return prefix + "Operasional & Produksi";
    }
    if (newUserType === null) return "Pilih Tipe Akun";
    if (newUserType === "bms") return "Buat Akun BMS";
    if (newUserType === "supervisor") return "Buat Akun Supervisor";
    if (newUserType === "management") return "Buat Akun Management";
    return "Buat Akun Operasional / Produksi";
  })();

  if (isQueriesLoading) {
    return (
      <div className="flex h-screen bg-gray-50">
        <Sidebar role="superadmin" />
        <div className="flex-1 flex flex-col overflow-hidden">
          <Header userEmail={clientUser?.email ?? ""} role="superadmin" />
          <main className="flex-1 overflow-y-auto p-6">
            <Loading variant="skeleton" text="Memuat data..." />
          </main>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="flex h-screen bg-gray-50">
        <Sidebar role="superadmin" />
        <div className="flex-1 flex flex-col overflow-hidden">
          <Header userEmail={clientUser?.email ?? ""} role="superadmin" />
          <main className="flex-1 overflow-y-auto p-6">
            {/* Page header */}
            <div className="flex justify-between items-center mb-8">
              <div>
                <h2 className="text-2xl font-bold text-gray-800 mb-2">Kelola Akun & Data Cabang</h2>
                <p className="text-gray-600">Buat, edit, dan kelola akses pengguna serta data cabang</p>
              </div>
              <Button
                variant="primary"
                onClick={() => activeTab === "branches" ? handleOpenBranchModal() : handleOpenCreateModal()}
                leftIcon={<Plus className="w-4 h-4" />}
              >
                {activeTab === "branches" ? "Tambah Cabang" : "Buat Akun Baru"}
              </Button>
            </div>

            {/* Page alert */}
            {alert && (
              <div className="mb-6 animate-slide-down">
                <Alert type={alert.type} message={alert.message} onClose={() => setAlert(null)} autoClose duration={5000} />
              </div>
            )}

            {/* Tabs */}
            <div className="border-b border-gray-200 mb-8">
              <nav className="flex gap-6 overflow-x-auto">
                {([
                  { key: "all" as const, label: "Semua User", icon: Users },
                  { key: "bms" as const, label: "BMS", icon: Building2 },
                  { key: "oprprd" as const, label: "OPRPRD", icon: Wrench },
                  { key: "management" as const, label: "Manajemen", icon: Shield },
                  { key: "branches" as const, label: "Cabang", icon: MapPin },
                ]).map(({ key, label, icon: Icon }) => (
                  <button
                    key={key}
                    onClick={() => setActiveTab(key)}
                    className={`flex items-center gap-1.5 pb-4 px-1 font-medium text-sm transition-colors whitespace-nowrap ${activeTab === key ? "text-indigo-600 border-b-2 border-indigo-600" : "text-gray-500 hover:text-gray-700"}`}
                  >
                    <Icon className="w-4 h-4" />
                    {label}
                  </button>
                ))}
              </nav>
            </div>

            {/* ── Tab: Users ── */}
            {activeTab !== "branches" && (
              <>
                {/* Stats */}
                {activeTab === "all" ? (
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
                    {[
                      { label: "Total", value: stats.total, color: "border-indigo-400", text: "text-indigo-700" },
                      { label: "BMS", value: stats.bms, color: "border-purple-400", text: "text-purple-700" },
                      { label: "Manajemen", value: stats.management, color: "border-orange-400", text: "text-orange-700" },
                      { label: "Operasional", value: stats.operational, color: "border-blue-400", text: "text-blue-700" },
                      { label: "Produksi", value: stats.production, color: "border-amber-400", text: "text-amber-700" },
                      { label: "Aktif", value: stats.active, color: "border-green-400", text: "text-green-700" },
                    ].map(({ label, value, color, text }) => (
                      <div key={label} className={`bg-white rounded-xl shadow-sm p-4 border-t-2 ${color}`}>
                        <p className="text-xs text-gray-500">{label}</p>
                        <p className={`text-xl font-bold ${text}`}>{value}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex gap-4 mb-6">
                    <div className="bg-white rounded-xl shadow-sm p-4 border-t-2 border-indigo-400 flex-1">
                      <p className="text-xs text-gray-500">Total</p>
                      <p className="text-xl font-bold text-indigo-700">{displayUsers.length}</p>
                    </div>
                    <div className="bg-white rounded-xl shadow-sm p-4 border-t-2 border-green-400 flex-1">
                      <p className="text-xs text-gray-500">Aktif</p>
                      <p className="text-xl font-bold text-green-700">
                        {displayUsers.filter((u) => u.userType === "bms" ? u.status === "active" : u.is_active).length}
                      </p>
                    </div>
                  </div>
                )}

                {/* Filter bar — only on "all" tab */}
                {activeTab === "all" && (
                  <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                    <div className="flex flex-wrap gap-2">
                      {SEGMENT_OPTIONS.map((opt) => (
                        <button
                          key={opt.value}
                          onClick={() => setSegment(opt.value)}
                          className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${segment === opt.value ? "bg-indigo-600 text-white" : "bg-white text-gray-600 border border-gray-200 hover:border-indigo-300"}`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                    <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer select-none">
                      <input type="checkbox" checked={showInactive} onChange={(e) => setShowInactive(e.target.checked)} className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" />
                      Tampilkan nonaktif
                    </label>
                  </div>
                )}

                {/* Table */}
                <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          {["Nama / Identitas", "Email / Username", "Role", "Status", "Terakhir Login", "Aksi"].map((h) => (
                            <th key={h} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {displayUsers.length === 0 ? (
                          <tr><td colSpan={6} className="px-6 py-10 text-center text-gray-500 text-sm">Tidak ada data user.</td></tr>
                        ) : (
                          displayUsers.map((user) => (
                            <tr key={user.id} className="hover:bg-gray-50">
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="font-medium text-gray-900">{user.full_name}</div>
                                <div className="text-xs text-gray-400 font-mono">{user.id.slice(0, 8)}…</div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                                {user.userType === "bms" ? (user.email ?? "-") : (
                                  <div>
                                    <div className="font-medium text-gray-800">{user.username ?? "-"}</div>
                                    {user.email && !user.email.endsWith("@internal.local") && <div className="text-xs text-gray-400">{user.email}</div>}
                                  </div>
                                )}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">{getRoleBadge(user)}</td>
                              <td className="px-6 py-4 whitespace-nowrap">{getStatusBadge(user)}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{formatDate(user.last_login ?? user.last_login_at)}</td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="flex gap-2">
                                  <button onClick={() => handleOpenEditModal(user)} className="text-indigo-600 hover:text-indigo-900 transition-colors" title="Edit"><Pencil className="w-5 h-5" /></button>
                                  <button onClick={() => setUserToToggle(user)} className={`${currentUserIsActive(user) ? "text-yellow-600 hover:text-yellow-900" : "text-green-600 hover:text-green-900"} transition-colors`} title={currentUserIsActive(user) ? "Nonaktifkan" : "Aktifkan"}><Power className="w-5 h-5" /></button>
                                  <button onClick={() => setUserToDelete(user)} className="text-red-600 hover:text-red-900 transition-colors" title="Hapus"><Trash2 className="w-5 h-5" /></button>
                                </div>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}

            {/* ── Tab: Branches ── */}
            {activeTab === "branches" && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                  {[
                    { label: "Total Cabang", value: branches.length, color: "border-blue-500" },
                    { label: "Cabang Aktif", value: activeBranches.length, color: "border-green-500" },
                    { label: "Total Lead (All Time)", value: branches.reduce((s, b) => s + b.total_leads, 0).toLocaleString("id-ID"), color: "border-purple-500" },
                    { label: "Total Closing (All Time)", value: branches.reduce((s, b) => s + b.total_closing, 0).toLocaleString("id-ID"), color: "border-orange-500" },
                  ].map(({ label, value, color }) => (
                    <div key={label} className={`bg-white rounded-xl shadow-sm p-6 border-l-4 ${color}`}>
                      <p className="text-sm text-gray-600 mb-2">{label}</p>
                      <p className="text-2xl font-bold text-gray-800">{value}</p>
                    </div>
                  ))}
                </div>

                {branches.length === 0 ? (
                  <div className="text-center py-20 text-gray-500 text-sm">Belum ada data cabang.</div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {branches.map((branch) => (
                      <div key={branch.id} className="bg-white rounded-xl shadow-sm overflow-hidden hover:shadow-md transition-shadow">
                        <div className="bg-gradient-to-r from-indigo-500 to-purple-600 px-6 py-4">
                          <div className="flex justify-between items-center">
                            <div>
                              <h3 className="text-lg font-bold text-white">{branch.name}</h3>
                              <p className="text-sm text-indigo-100">{branch.code}</p>
                            </div>
                            {getBranchStatusBadge(branch.status)}
                          </div>
                        </div>
                        <div className="p-6">
                          <div className="space-y-3">
                            <div className="flex items-start gap-3">
                              <MapPin className="w-5 h-5 text-gray-400 mt-0.5 shrink-0" />
                              <div><p className="text-xs text-gray-500">Alamat</p><p className="text-sm text-gray-800">{branch.address}</p></div>
                            </div>
                            {branch.phone && (
                              <div className="flex items-center gap-3">
                                <Phone className="w-5 h-5 text-gray-400 shrink-0" />
                                <div><p className="text-xs text-gray-500">Telepon</p><p className="text-sm text-gray-800">{branch.phone}</p></div>
                              </div>
                            )}
                            {branch.pic && (
                              <div className="flex items-center gap-3">
                                <User className="w-5 h-5 text-gray-400 shrink-0" />
                                <div><p className="text-xs text-gray-500">PIC</p><p className="text-sm text-gray-800">{branch.pic}</p></div>
                              </div>
                            )}
                          </div>
                          <div className="mt-4 pt-4 border-t border-gray-200">
                            <div className="flex justify-between text-sm mb-2">
                              <span className="text-gray-600">Total Lead</span>
                              <span className="font-semibold text-gray-800">{branch.total_leads.toLocaleString("id-ID")}</span>
                            </div>
                            <div className="flex justify-between text-sm mb-4">
                              <span className="text-gray-600">Total Closing</span>
                              <span className="font-semibold text-gray-800">{branch.total_closing.toLocaleString("id-ID")}</span>
                            </div>
                            <div className="flex gap-2">
                              <Button size="sm" variant="outline" onClick={() => handleOpenBranchModal(branch)} className="flex-1">Edit</Button>
                              <Button size="sm" variant={branch.status === "active" ? "warning" : "success"} onClick={() => setBranchToToggle(branch)} className="flex-1">
                                {branch.status === "active" ? "Nonaktifkan" : "Aktifkan"}
                              </Button>
                              <button onClick={() => setBranchToDelete(branch)} className="p-1.5 rounded-lg text-red-500 hover:text-red-700 hover:bg-red-50 transition-colors" title="Hapus cabang">
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}

            {/* ── Modal ── */}
            <Modal isOpen={isModalOpen} onClose={handleCloseModal} title={modalTitle} size="md">
              {alert && (
                <div className="mb-4">
                  <Alert type={alert.type} message={alert.message} onClose={() => setAlert(null)} autoClose duration={3000} />
                </div>
              )}

              {/* Branch Form */}
              {activeTab === "branches" && (
                <BranchForm
                  isEditMode={isEditMode}
                  isSaving={isSaving}
                  form={branchForm}
                  setForm={setBranchForm}
                  onSave={handleSaveBranch}
                  onClose={handleCloseModal}
                  showAlert={showAlert}
                />
              )}

              {/* User Type Picker */}
              {activeTab !== "branches" && !isEditMode && newUserType === null && (
                <UserTypePicker onSelect={setNewUserType} />
              )}

              {/* BMS Form */}
              {activeTab !== "branches" && (isEditMode ? selectedUser?.userType === "bms" : newUserType === "bms") && (
                <BmsUserForm
                  isEditMode={isEditMode}
                  isSaving={isSaving}
                  form={bmsForm}
                  setForm={setBmsForm}
                  activeBranches={activeBranches}
                  onSave={handleSaveBmsUser}
                  onClose={handleCloseModal}
                  onBack={() => setNewUserType(null)}
                  showAlert={showAlert}
                />
              )}

              {/* Supervisor Form */}
              {activeTab !== "branches" && (isEditMode ? selectedUser?.userType === "supervisor" : newUserType === "supervisor") && (
                <SupervisorUserForm
                  isEditMode={isEditMode}
                  isSaving={isSaving}
                  form={supervisorForm}
                  setForm={setSupervisorForm}
                  onSave={handleSaveSupervisorUser}
                  onClose={handleCloseModal}
                  onBack={() => setNewUserType(null)}
                  showAlert={showAlert}
                />
              )}

              {/* OPRPRD Form */}
              {activeTab !== "branches" && (isEditMode ? selectedUser?.userType === "oprprd" : newUserType === "oprprd") && (
                <OprprdUserForm
                  isEditMode={isEditMode}
                  isSaving={isSaving}
                  form={oprprdForm}
                  setForm={setOprprdForm}
                  roles={roles}
                  onSave={handleSaveOprprdUser}
                  onClose={handleCloseModal}
                  onBack={() => setNewUserType(null)}
                  showAlert={showAlert}
                />
              )}

              {/* Management Form */}
              {activeTab !== "branches" && (isEditMode ? selectedUser?.userType === "management" : newUserType === "management") && (
                <ManagementUserForm
                  isEditMode={isEditMode}
                  isSaving={isSaving}
                  form={managementForm}
                  setForm={setManagementForm}
                  onSave={handleSaveManagementUser}
                  onClose={handleCloseModal}
                  onBack={() => setNewUserType(null)}
                  showAlert={showAlert}
                />
              )}
            </Modal>
          </main>
        </div>
      </div>

      {/* Confirm Dialogs */}
      <ConfirmDialog
        isOpen={!!branchToDelete}
        variant="danger"
        title="Hapus cabang ini?"
        message={branchToDelete ? `Cabang "${branchToDelete.name}" (${branchToDelete.code}) akan dihapus permanen. Pastikan tidak ada pengguna yang masih terhubung ke cabang ini.` : ""}
        confirmText="Ya, Hapus"
        cancelText="Batal"
        isLoading={isDeleting}
        onConfirm={handleDeleteBranch}
        onCancel={() => !isDeleting && setBranchToDelete(null)}
      />
      <ConfirmDialog
        isOpen={!!userToDelete}
        variant="danger"
        title="Hapus akun ini?"
        message={userToDelete ? `Akun "${userToDelete.full_name}" (${userToDelete.userType === "bms" ? userToDelete.email : userToDelete.username}) akan dihapus permanen beserta akses loginnya. Tindakan ini tidak dapat dibatalkan.` : ""}
        confirmText="Ya, Hapus"
        cancelText="Batal"
        isLoading={isDeletingUser}
        onConfirm={handleDeleteUser}
        onCancel={() => !isDeletingUser && setUserToDelete(null)}
      />
      <ConfirmDialog
        isOpen={!!userToToggle}
        variant="warning"
        title={userToToggle?.status === "active" ? "Nonaktifkan akun?" : "Aktifkan akun?"}
        message={userToToggle ? (userToToggle.status === "active" ? `Akun "${userToToggle.full_name}" akan dinonaktifkan. Pengguna tidak dapat login sampai diaktifkan kembali.` : `Akun "${userToToggle.full_name}" akan diaktifkan kembali. Pengguna dapat login seperti biasa.`) : ""}
        confirmText={userToToggle?.status === "active" ? "Ya, Nonaktifkan" : "Ya, Aktifkan"}
        cancelText="Batal"
        onConfirm={() => { handleToggleUserStatus(userToToggle!); setUserToToggle(null); }}
        onCancel={() => setUserToToggle(null)}
      />
      <ConfirmDialog
        isOpen={!!branchToToggle}
        variant="warning"
        title={branchToToggle?.status === "active" ? "Nonaktifkan cabang?" : "Aktifkan cabang?"}
        message={branchToToggle ? (branchToToggle.status === "active" ? `Cabang "${branchToToggle.name}" akan dinonaktifkan. Data cabang tetap tersimpan.` : `Cabang "${branchToToggle.name}" akan diaktifkan kembali.`) : ""}
        confirmText={branchToToggle?.status === "active" ? "Ya, Nonaktifkan" : "Ya, Aktifkan"}
        cancelText="Batal"
        onConfirm={() => { handleToggleBranchStatus(branchToToggle!); setBranchToToggle(null); }}
        onCancel={() => setBranchToToggle(null)}
      />
    </>
  );
}
