// app/dashboard/superadmin/kelola-akun/page.tsx

'use client';

import { useEffect, useState, useCallback } from 'react';
import Sidebar from '@/components/layout/Sidebar';
import Header from '@/components/layout/Header';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Modal from '@/components/ui/Modal';
import Alert from '@/components/ui/Alert';
import Loading from '@/components/ui/Loading';
import { getClientUser, type ClientUser } from '@/lib/auth/session';
import ConfirmDialog from '@/components/ui/ConfirmDialog';

// ─── Types ────────────────────────────────────────────────────────────────────

interface BranchRef {
  id: string;
  name: string;
  code: string;
}

interface User {
  id: string;
  email: string;
  full_name: string;
  role: 'superadmin' | 'cs' | 'marketing';
  branch_id: string | null;
  branches: BranchRef | null;
  status: 'active' | 'inactive';
  last_login: string | null;
  created_at: string;
}

interface Branch {
  id: string;
  code: string;
  name: string;
  address: string;
  phone: string | null;
  email: string | null;
  pic: string | null;
  status: 'active' | 'inactive';
  total_leads: number;
  total_closing: number;
  created_at: string;
}

type AlertState = { type: 'success' | 'error' | 'warning' | 'info'; message: string } | null;

// ─── Initial form values ───────────────────────────────────────────────────────

const EMPTY_USER_FORM = {
  full_name: '',
  email: '',
  password: '',
  role: 'cs' as User['role'],
  branch_id: '',
};

const EMPTY_BRANCH_FORM = {
  name: '',
  code: '',
  address: '',
  phone: '',
  email: '',
  pic: '',
  status: 'active' as Branch['status'],
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function KelolaAkunPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [activeTab, setActiveTab] = useState<'users' | 'branches'>('users');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [selectedBranch, setSelectedBranch] = useState<Branch | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [alert, setAlert] = useState<AlertState>(null);
  const [showInactive, setShowInactive] = useState(false);
  const [clientUser, setClientUser] = useState<ClientUser | null>(null);
  const [branchToDelete, setBranchToDelete] = useState<Branch | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [isDeletingUser, setIsDeletingUser] = useState(false);

  const [userFormData, setUserFormData] = useState(EMPTY_USER_FORM);
  const [branchFormData, setBranchFormData] = useState(EMPTY_BRANCH_FORM);

  useEffect(() => { setClientUser(getClientUser()); }, []);

  // ─── Helpers ──────────────────────────────────────────────────────────────

  const showAlert = (type: NonNullable<AlertState>['type'], message: string) => {
    setAlert({ type, message });
    setTimeout(() => setAlert(null), 4000);
  };

  // ─── Data fetching ────────────────────────────────────────────────────────

  const fetchUsers = useCallback(async () => {
    const status = showInactive ? 'inactive' : 'active';
    const res = await fetch(`/api/users?status=${status}&limit=200`);
    const json = await res.json();
    if (!res.ok) {
      showAlert('error', json.error || 'Gagal memuat data user');
      return;
    }
    setUsers(json.data ?? []);
  }, [showInactive]);

  const fetchBranches = useCallback(async () => {
    const res = await fetch('/api/branches');
    const json = await res.json();
    if (!res.ok) {
      showAlert('error', json.error || 'Gagal memuat data cabang');
      return;
    }
    setBranches(json.data ?? []);
  }, []);

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      await Promise.all([fetchUsers(), fetchBranches()]);
      setIsLoading(false);
    };
    load();
  }, [fetchUsers, fetchBranches]);

  // ─── User handlers ────────────────────────────────────────────────────────

  const handleOpenUserModal = (user?: User) => {
    if (user) {
      setIsEditMode(true);
      setSelectedUser(user);
      setUserFormData({
        full_name: user.full_name,
        email: user.email,
        password: '',
        role: user.role,
        branch_id: user.branch_id ?? '',
      });
    } else {
      setIsEditMode(false);
      setSelectedUser(null);
      setUserFormData(EMPTY_USER_FORM);
    }
    setIsModalOpen(true);
  };

  const handleSaveUser = async () => {
    if (!userFormData.full_name.trim() || !userFormData.email.trim()) {
      showAlert('error', 'Nama dan email harus diisi!');
      return;
    }
    if (!isEditMode && !userFormData.password) {
      showAlert('error', 'Password harus diisi untuk akun baru!');
      return;
    }
    if (userFormData.role === 'cs' && !userFormData.branch_id) {
      showAlert('error', 'Cabang harus dipilih untuk role CS!');
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        full_name: userFormData.full_name.trim(),
        email: userFormData.email.trim(),
        role: userFormData.role,
        branch_id: ['cs'].includes(userFormData.role) ? userFormData.branch_id || null : null,
        ...(userFormData.password ? { password: userFormData.password } : {}),
      };

      const res = await fetch(
        isEditMode ? `/api/users/${selectedUser!.id}` : '/api/users',
        {
          method: isEditMode ? 'PUT' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        },
      );
      const json = await res.json();

      if (!res.ok) {
        showAlert('error', json.error || 'Gagal menyimpan akun');
        return;
      }

      showAlert('success', isEditMode ? 'Akun berhasil diperbarui!' : 'Akun baru berhasil dibuat!');
      setIsModalOpen(false);
      await fetchUsers();
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleUserStatus = async (user: User) => {
    const newStatus = user.status === 'active' ? 'inactive' : 'active';
    const res = await fetch(`/api/users/${user.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    });
    const json = await res.json();
    if (!res.ok) {
      showAlert('error', json.error || 'Gagal mengubah status');
      return;
    }
    showAlert('success', `Akun ${newStatus === 'active' ? 'diaktifkan' : 'dinonaktifkan'}!`);
    await fetchUsers();
  };

  const handleDeleteUser = async () => {
    if (!userToDelete) return;
    setIsDeletingUser(true);
    try {
      const res = await fetch(`/api/users/${userToDelete.id}`, { method: 'DELETE' });
      const json = await res.json();
      if (!res.ok) {
        showAlert('error', json.error || 'Gagal menghapus akun');
        return;
      }
      showAlert('success', `Akun ${userToDelete.full_name} berhasil dihapus!`);
      await fetchUsers();
    } finally {
      setIsDeletingUser(false);
      setUserToDelete(null);
    }
  };

  // ─── Branch handlers ──────────────────────────────────────────────────────

  const handleOpenBranchModal = (branch?: Branch) => {
    if (branch) {
      setIsEditMode(true);
      setSelectedBranch(branch);
      setBranchFormData({
        name: branch.name,
        code: branch.code,
        address: branch.address,
        phone: branch.phone ?? '',
        email: branch.email ?? '',
        pic: branch.pic ?? '',
        status: branch.status,
      });
    } else {
      setIsEditMode(false);
      setSelectedBranch(null);
      setBranchFormData(EMPTY_BRANCH_FORM);
    }
    setIsModalOpen(true);
  };

  const handleSaveBranch = async () => {
    if (!branchFormData.name.trim() || !branchFormData.code.trim() || !branchFormData.address.trim()) {
      showAlert('error', 'Nama cabang, kode, dan alamat harus diisi!');
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        name: branchFormData.name.trim(),
        code: branchFormData.code.trim(),
        address: branchFormData.address.trim(),
        phone: branchFormData.phone.trim() || null,
        email: branchFormData.email.trim() || null,
        pic: branchFormData.pic.trim() || null,
        status: branchFormData.status,
      };

      const res = await fetch(
        isEditMode ? `/api/branches/${selectedBranch!.id}` : '/api/branches',
        {
          method: isEditMode ? 'PUT' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        },
      );
      const json = await res.json();

      if (!res.ok) {
        showAlert('error', json.error || 'Gagal menyimpan cabang');
        return;
      }

      showAlert(
        'success',
        isEditMode
          ? `Data ${branchFormData.name} berhasil diperbarui!`
          : `Cabang ${branchFormData.name} berhasil ditambahkan!`,
      );
      setIsModalOpen(false);
      await fetchBranches();
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleBranchStatus = async (branch: Branch) => {
    const newStatus = branch.status === 'active' ? 'inactive' : 'active';
    const res = await fetch(`/api/branches/${branch.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    });
    const json = await res.json();
    if (!res.ok) {
      showAlert('error', json.error || 'Gagal mengubah status cabang');
      return;
    }
    showAlert(
      'success',
      `Cabang ${branch.name} ${newStatus === 'active' ? 'diaktifkan' : 'dinonaktifkan'}!`,
    );
    await fetchBranches();
  };

  const handleDeleteBranch = async () => {
    if (!branchToDelete) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/branches/${branchToDelete.id}`, { method: 'DELETE' });
      const json = await res.json();
      if (!res.ok) {
        showAlert('error', json.error || 'Gagal menghapus cabang');
        return;
      }
      showAlert('success', `Cabang ${branchToDelete.name} berhasil dihapus!`);
      await fetchBranches();
    } finally {
      setIsDeleting(false);
      setBranchToDelete(null);
    }
  };

  // ─── Badge helpers ─────────────────────────────────────────────────────────

  const getRoleBadge = (role: string) => {
    const map: Record<string, { bg: string; label: string }> = {
      superadmin: { bg: 'bg-purple-100 text-purple-800', label: 'Super Admin' },
      cs: { bg: 'bg-blue-100 text-blue-800', label: 'CS' },
      marketing: { bg: 'bg-green-100 text-green-800', label: 'Marketing' },
    };
    const { bg, label } = map[role] ?? { bg: 'bg-gray-100 text-gray-800', label: role };
    return <span className={`px-2 py-1 text-xs font-semibold rounded-full ${bg}`}>{label}</span>;
  };

  const getStatusBadge = (status: 'active' | 'inactive') =>
    status === 'active' ? (
      <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">Aktif</span>
    ) : (
      <span className="px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">Nonaktif</span>
    );

  const formatDate = (iso: string | null) => {
    if (!iso) return '-';
    return new Date(iso).toLocaleString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // ─── Render ────────────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="flex h-screen bg-gray-50">
        <Sidebar role="superadmin" />
        <div className="flex-1 flex flex-col overflow-hidden">
          <Header userEmail={clientUser?.email ?? ''} role="superadmin" />
          <main className="flex-1 overflow-y-auto p-6">
            <Loading variant="skeleton" text="Memuat data..." />
          </main>
        </div>
      </div>
    );
  }

  const activeBranches = branches.filter((b) => b.status === 'active');

  return (
    <>
    <div className="flex h-screen bg-gray-50">
      <Sidebar role="superadmin" />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header userEmail={clientUser?.email ?? ''} role="superadmin" />
        <main className="flex-1 overflow-y-auto p-6">

          {/* Page header */}
          <div className="flex justify-between items-center mb-8">
            <div>
              <h2 className="text-2xl font-bold text-gray-800 mb-2">Kelola Akun & Data Cabang</h2>
              <p className="text-gray-600">Buat, edit, dan kelola akses pengguna serta data cabang</p>
            </div>
            <Button
              variant="primary"
              onClick={() => (activeTab === 'users' ? handleOpenUserModal() : handleOpenBranchModal())}
              leftIcon={
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              }
            >
              {activeTab === 'users' ? 'Buat Akun Baru' : 'Tambah Cabang'}
            </Button>
          </div>

          {/* Alert */}
          {alert && (
            <div className="mb-6 animate-slide-down">
              <Alert type={alert.type} message={alert.message} onClose={() => setAlert(null)} autoClose duration={4000} />
            </div>
          )}

          {/* Tabs */}
          <div className="border-b border-gray-200 mb-8">
            <nav className="flex gap-8">
              {(['users', 'branches'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`pb-4 px-1 font-medium text-sm transition-colors ${
                    activeTab === tab
                      ? 'text-indigo-600 border-b-2 border-indigo-600'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {tab === 'users' ? (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                      </svg>
                    )}
                    {tab === 'users' ? 'Manajemen User' : 'Data Cabang'}
                  </div>
                </button>
              ))}
            </nav>
          </div>

          {/* ── Tab: Users ── */}
          {activeTab === 'users' && (
            <>
              {/* Stats */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
                {[
                  { label: 'Total Pengguna', count: users.length, icon: '👥', bg: 'bg-indigo-100' },
                  { label: 'Super Admin', count: users.filter((u) => u.role === 'superadmin').length, icon: '👑', bg: 'bg-purple-100' },
                  { label: 'CS', count: users.filter((u) => u.role === 'cs').length, icon: '💬', bg: 'bg-blue-100' },
                  { label: 'Marketing', count: users.filter((u) => u.role === 'marketing').length, icon: '📊', bg: 'bg-green-100' },
                ].map(({ label, count, icon, bg }) => (
                  <div key={label} className="bg-white rounded-xl shadow-sm p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600">{label}</p>
                        <p className="text-2xl font-bold text-gray-800">{count}</p>
                      </div>
                      <div className={`w-12 h-12 ${bg} rounded-full flex items-center justify-center`}>
                        <span className="text-xl">{icon}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Filter toggle */}
              <div className="flex justify-end mb-4">
                <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={showInactive}
                    onChange={(e) => setShowInactive(e.target.checked)}
                    className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  Tampilkan akun nonaktif
                </label>
              </div>

              {/* Users Table */}
              <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        {['Nama', 'Email', 'Role', 'Cabang', 'Status', 'Terakhir Login', 'Aksi'].map((h) => (
                          <th key={h} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {users.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="px-6 py-10 text-center text-gray-500 text-sm">
                            Tidak ada data user.
                          </td>
                        </tr>
                      ) : (
                        users.map((user) => (
                          <tr key={user.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="font-medium text-gray-900">{user.full_name}</div>
                              <div className="text-xs text-gray-400 font-mono">{user.id.slice(0, 8)}…</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-gray-600 text-sm">{user.email}</td>
                            <td className="px-6 py-4 whitespace-nowrap">{getRoleBadge(user.role)}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-gray-600 text-sm">
                              {user.branches?.name ?? '-'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">{getStatusBadge(user.status)}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-gray-600 text-sm">
                              {formatDate(user.last_login)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex gap-2">
                                {/* Edit */}
                                <button
                                  onClick={() => handleOpenUserModal(user)}
                                  className="text-indigo-600 hover:text-indigo-900 transition-colors"
                                  title="Edit"
                                >
                                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                  </svg>
                                </button>
                                {/* Toggle status */}
                                <button
                                  onClick={() => handleToggleUserStatus(user)}
                                  className={`${user.status === 'active' ? 'text-yellow-600 hover:text-yellow-900' : 'text-green-600 hover:text-green-900'} transition-colors`}
                                  title={user.status === 'active' ? 'Nonaktifkan' : 'Aktifkan'}
                                >
                                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                                  </svg>
                                </button>
                                {/* Delete */}
                                <button
                                  onClick={() => setUserToDelete(user)}
                                  className="text-red-600 hover:text-red-900 transition-colors"
                                  title="Hapus"
                                >
                                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
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
              </div>
            </>
          )}

          {/* ── Tab: Branches ── */}
          {activeTab === 'branches' && (
            <>
              {/* Stats */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                <div className="bg-white rounded-xl shadow-sm p-6 border-l-4 border-blue-500">
                  <p className="text-sm text-gray-600 mb-2">Total Cabang</p>
                  <p className="text-2xl font-bold text-gray-800">{branches.length}</p>
                </div>
                <div className="bg-white rounded-xl shadow-sm p-6 border-l-4 border-green-500">
                  <p className="text-sm text-gray-600 mb-2">Cabang Aktif</p>
                  <p className="text-2xl font-bold text-gray-800">{activeBranches.length}</p>
                </div>
                <div className="bg-white rounded-xl shadow-sm p-6 border-l-4 border-purple-500">
                  <p className="text-sm text-gray-600 mb-2">Total Lead (All Time)</p>
                  <p className="text-2xl font-bold text-gray-800">
                    {branches.reduce((s, b) => s + b.total_leads, 0).toLocaleString('id-ID')}
                  </p>
                </div>
                <div className="bg-white rounded-xl shadow-sm p-6 border-l-4 border-orange-500">
                  <p className="text-sm text-gray-600 mb-2">Total Closing (All Time)</p>
                  <p className="text-2xl font-bold text-gray-800">
                    {branches.reduce((s, b) => s + b.total_closing, 0).toLocaleString('id-ID')}
                  </p>
                </div>
              </div>

              {/* Branches Grid */}
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
                          {getStatusBadge(branch.status)}
                        </div>
                      </div>
                      <div className="p-6">
                        <div className="space-y-3">
                          <div className="flex items-start gap-3">
                            <svg className="w-5 h-5 text-gray-400 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            <div>
                              <p className="text-xs text-gray-500">Alamat</p>
                              <p className="text-sm text-gray-800">{branch.address}</p>
                            </div>
                          </div>
                          {branch.phone && (
                            <div className="flex items-center gap-3">
                              <svg className="w-5 h-5 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                              </svg>
                              <div>
                                <p className="text-xs text-gray-500">Telepon</p>
                                <p className="text-sm text-gray-800">{branch.phone}</p>
                              </div>
                            </div>
                          )}
                          {branch.pic && (
                            <div className="flex items-center gap-3">
                              <svg className="w-5 h-5 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                              </svg>
                              <div>
                                <p className="text-xs text-gray-500">PIC</p>
                                <p className="text-sm text-gray-800">{branch.pic}</p>
                              </div>
                            </div>
                          )}
                        </div>

                        <div className="mt-4 pt-4 border-t border-gray-200">
                          <div className="flex justify-between text-sm mb-2">
                            <span className="text-gray-600">Total Lead</span>
                            <span className="font-semibold text-gray-800">{branch.total_leads.toLocaleString('id-ID')}</span>
                          </div>
                          <div className="flex justify-between text-sm mb-4">
                            <span className="text-gray-600">Total Closing</span>
                            <span className="font-semibold text-gray-800">{branch.total_closing.toLocaleString('id-ID')}</span>
                          </div>
                          <div className="flex gap-2">
                            <Button size="sm" variant="outline" onClick={() => handleOpenBranchModal(branch)} className="flex-1">
                              Edit
                            </Button>
                            <Button
                              size="sm"
                              variant={branch.status === 'active' ? 'warning' : 'success'}
                              onClick={() => handleToggleBranchStatus(branch)}
                              className="flex-1"
                            >
                              {branch.status === 'active' ? 'Nonaktifkan' : 'Aktifkan'}
                            </Button>
                            <button
                              onClick={() => setBranchToDelete(branch)}
                              className="p-1.5 rounded-lg text-red-500 hover:text-red-700 hover:bg-red-50 transition-colors"
                              title="Hapus cabang"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
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
          <Modal
            isOpen={isModalOpen}
            onClose={() => !isSaving && setIsModalOpen(false)}
            title={
              activeTab === 'users'
                ? isEditMode ? 'Edit Akun Pengguna' : 'Buat Akun Baru'
                : isEditMode ? 'Edit Cabang' : 'Tambah Cabang Baru'
            }
            size={activeTab === 'users' ? 'md' : 'lg'}
          >
            {activeTab === 'users' ? (
              <div className="space-y-4">
                <Input
                  label="Nama Lengkap"
                  value={userFormData.full_name}
                  onChange={(e) => setUserFormData({ ...userFormData, full_name: e.target.value })}
                  placeholder="Masukkan nama lengkap"
                  disabled={isSaving}
                />
                <Input
                  label="Email"
                  type="email"
                  value={userFormData.email}
                  onChange={(e) => setUserFormData({ ...userFormData, email: e.target.value })}
                  placeholder="email@company.com"
                  disabled={isSaving}
                />
                <Input
                  label={isEditMode ? 'Password Baru (kosongkan jika tidak diubah)' : 'Password'}
                  type="password"
                  value={userFormData.password}
                  onChange={(e) => setUserFormData({ ...userFormData, password: e.target.value })}
                  placeholder="Minimal 6 karakter"
                  disabled={isSaving}
                />
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                  <select
                    value={userFormData.role}
                    onChange={(e) =>
                      setUserFormData({ ...userFormData, role: e.target.value as User['role'], branch_id: '' })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 bg-white"
                    disabled={isSaving}
                  >
                    <option value="superadmin">Super Admin</option>
                    <option value="cs">Customer Service</option>
                    <option value="marketing">Marketing</option>
                  </select>
                </div>
                {userFormData.role === 'cs' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Cabang</label>
                    <select
                      value={userFormData.branch_id}
                      onChange={(e) => setUserFormData({ ...userFormData, branch_id: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 bg-white"
                      disabled={isSaving}
                    >
                      <option value="">Pilih Cabang</option>
                      {activeBranches.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.name} ({b.code})
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                <div className="flex justify-end space-x-3 mt-6">
                  <Button variant="secondary" onClick={() => setIsModalOpen(false)} disabled={isSaving}>
                    Batal
                  </Button>
                  <Button variant="primary" onClick={handleSaveUser} isLoading={isSaving}>
                    {isEditMode ? 'Simpan Perubahan' : 'Buat Akun'}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <Input
                    label="Nama Cabang"
                    value={branchFormData.name}
                    onChange={(e) => setBranchFormData({ ...branchFormData, name: e.target.value })}
                    placeholder="Contoh: Cabang Jakarta Barat"
                    disabled={isSaving}
                  />
                  <Input
                    label="Kode Cabang"
                    value={branchFormData.code}
                    onChange={(e) => setBranchFormData({ ...branchFormData, code: e.target.value.toUpperCase() })}
                    placeholder="Contoh: CBG-JKT-B"
                    disabled={isSaving}
                  />
                </div>
                <Input
                  label="Alamat Lengkap"
                  value={branchFormData.address}
                  onChange={(e) => setBranchFormData({ ...branchFormData, address: e.target.value })}
                  placeholder="Jl. Contoh No. 123, Kota"
                  disabled={isSaving}
                />
                <div className="grid grid-cols-2 gap-4">
                  <Input
                    label="Nomor Telepon"
                    value={branchFormData.phone}
                    onChange={(e) => setBranchFormData({ ...branchFormData, phone: e.target.value })}
                    placeholder="(021) 1234567"
                    disabled={isSaving}
                  />
                  <Input
                    label="Email"
                    type="email"
                    value={branchFormData.email}
                    onChange={(e) => setBranchFormData({ ...branchFormData, email: e.target.value })}
                    placeholder="cabang@company.com"
                    disabled={isSaving}
                  />
                </div>
                <Input
                  label="PIC (Person in Charge)"
                  value={branchFormData.pic}
                  onChange={(e) => setBranchFormData({ ...branchFormData, pic: e.target.value })}
                  placeholder="Nama penanggung jawab"
                  disabled={isSaving}
                />
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <select
                    value={branchFormData.status}
                    onChange={(e) =>
                      setBranchFormData({ ...branchFormData, status: e.target.value as Branch['status'] })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 bg-white"
                    disabled={isSaving}
                  >
                    <option value="active">Aktif</option>
                    <option value="inactive">Nonaktif</option>
                  </select>
                </div>
                <div className="flex justify-end space-x-3 mt-6">
                  <Button variant="secondary" onClick={() => setIsModalOpen(false)} disabled={isSaving}>
                    Batal
                  </Button>
                  <Button variant="primary" onClick={handleSaveBranch} isLoading={isSaving}>
                    {isEditMode ? 'Simpan Perubahan' : 'Tambah Cabang'}
                  </Button>
                </div>
              </div>
            )}
          </Modal>

        </main>
      </div>
    </div>

    <ConfirmDialog
      isOpen={!!branchToDelete}
      variant="danger"
      title="Hapus cabang ini?"
      message={
        branchToDelete
          ? `Cabang "${branchToDelete.name}" (${branchToDelete.code}) akan dihapus permanen. Pastikan tidak ada pengguna yang masih terhubung ke cabang ini.`
          : ''
      }
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
      message={
        userToDelete
          ? `Akun "${userToDelete.full_name}" (${userToDelete.email}) akan dihapus permanen beserta akses loginnya. Tindakan ini tidak dapat dibatalkan.`
          : ''
      }
      confirmText="Ya, Hapus"
      cancelText="Batal"
      isLoading={isDeletingUser}
      onConfirm={handleDeleteUser}
      onCancel={() => !isDeletingUser && setUserToDelete(null)}
    />
    </>
  );
}