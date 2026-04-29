// components/layout/MobileHeader.tsx

"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Menu,
  Bell,
  ChevronDown,
  LogOut,
  User,
  Settings,
  RefreshCw,
} from "lucide-react";
import { ROUTES } from "@/lib/routes";
import { clearClientUser } from "@/lib/auth/session";
import ConfirmDialog from "@/components/ui/ConfirmDialog";

interface Notification {
  id: string;
  title: string;
  message: string;
  type: "info" | "success" | "warning" | "error";
  is_read: boolean;
  link: string | null;
  created_at: string;
}

interface HeaderProps {
  userEmail: string;
  role: string;
  logoutPath?: string;
  onMenuClick: () => void;
}

const POLL_INTERVAL = 60_000; // refresh tiap 60 detik

export default function Header({
  userEmail,
  role,
  logoutPath,
  onMenuClick,
}: HeaderProps) {
  const router = useRouter();
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [isLogoutConfirmOpen, setIsLogoutConfirmOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [greeting, setGreeting] = useState("");
  const profileRef = useRef<HTMLDivElement>(null);
  const notificationRef = useRef<HTMLDivElement>(null);

  // ─── Fetch notifications ─────────────────────────────────────────────────

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications?limit=20");
      if (!res.ok) return;
      const json = await res.json();
      setNotifications(json.data ?? []);
      setUnreadCount(json.unread_count ?? 0);
    } catch {
      // silently fail — notifications are non-critical
    }
  }, []);

  useEffect(() => {
    const h = new Date().getHours();
    setGreeting(
      h < 12
        ? "Selamat pagi"
        : h < 15
          ? "Selamat siang"
          : h < 18
            ? "Selamat sore"
            : "Selamat malam",
    );

    // Initial fetch
    fetchNotifications();

    // Poll for new notifications
    const timer = setInterval(fetchNotifications, POLL_INTERVAL);
    return () => clearInterval(timer);
  }, [fetchNotifications]);

  // ─── Click outside to close dropdowns ────────────────────────────────────

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        profileRef.current &&
        !profileRef.current.contains(e.target as Node)
      ) {
        setIsProfileOpen(false);
      }
      if (
        notificationRef.current &&
        !notificationRef.current.contains(e.target as Node)
      ) {
        setIsNotificationOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // ─── Logout ───────────────────────────────────────────────────────────────

  const openLogoutConfirm = () => {
    setIsProfileOpen(false);
    setIsLogoutConfirmOpen(true);
  };

  const handleLogout = async () => {
    if (isLoggingOut) return;
    setIsLoggingOut(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch (err) {
      console.error("Logout request failed:", err);
    }
    // Bersihkan semua data user di localStorage (7 key) via helper terpusat —
    // menggantikan manual removeItem yang sebelumnya incomplete.
    clearClientUser();
    router.push(logoutPath ?? ROUTES.LOGIN);
    router.refresh();
  };

  // ─── Notification actions ─────────────────────────────────────────────────

  const handleMarkAsRead = async (id: string) => {
    // Optimistic update
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)),
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));

    await fetch(`/api/notifications/${id}`, { method: "PATCH" });
  };

  const handleMarkAllAsRead = async () => {
    // Optimistic update
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    setUnreadCount(0);

    await fetch("/api/notifications", { method: "PATCH" });
  };

  const handleNotificationClick = async (notification: Notification) => {
    if (!notification.is_read) {
      await handleMarkAsRead(notification.id);
    }
    if (notification.link) {
      router.push(notification.link);
      setIsNotificationOpen(false);
    }
  };

  // ─── Display helpers ──────────────────────────────────────────────────────

  const getDisplayName = () => {
    if (!userEmail) return "";
    return userEmail
      .split("@")[0]
      .replace(/[._-]/g, " ")
      .split(" ")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join(" ");
  };

  const getUserInitials = () => {
    if (!userEmail) return "??";
    return userEmail.split("@")[0].substring(0, 2).toUpperCase();
  };

  const getRoleBadgeColor = () => {
    switch (role) {
      case "superadmin":
        return "from-purple-600 to-indigo-600";
      case "customer_service":
        return "from-blue-600 to-cyan-600";
      case "marketing":
        return "from-green-600 to-emerald-600";
      case "supervisor":
        return "from-amber-600 to-orange-600";
      default:
        return "from-gray-600 to-gray-600";
    }
  };

  const getRoleLabel = () => {
    switch (role) {
      case "superadmin":
        return "Super Admin";
      case "customer_service":
        return "Customer Service";
      case "marketing":
        return "Marketing";
      case "supervisor":
        return "Supervisor";
      default:
        return role;
    }
  };

  const formatTime = (iso: string) => {
    const date = new Date(iso);
    const diffMs = Date.now() - date.getTime();
    const mins = Math.floor(diffMs / 60_000);
    const hours = Math.floor(diffMs / 3_600_000);
    const days = Math.floor(diffMs / 86_400_000);
    if (mins < 1) return "Baru saja";
    if (mins < 60) return `${mins} menit lalu`;
    if (hours < 24) return `${hours} jam lalu`;
    if (days < 7) return `${days} hari lalu`;
    return date.toLocaleDateString("id-ID");
  };

  const getNotificationIcon = (type: Notification["type"]) => {
    const map = {
      success: {
        bg: "bg-green-100",
        color: "text-green-600",
        path: "M5 13l4 4L19 7",
      },
      warning: {
        bg: "bg-yellow-100",
        color: "text-yellow-600",
        path: "M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z",
      },
      error: {
        bg: "bg-red-100",
        color: "text-red-600",
        path: "M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
      },
      info: {
        bg: "bg-blue-100",
        color: "text-blue-600",
        path: "M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
      },
    };
    const { bg, color, path } = map[type] ?? map.info;
    return (
      <div
        className={`w-8 h-8 ${bg} rounded-full flex items-center justify-center flex-shrink-0`}
      >
        <svg
          className={`w-4 h-4 ${color}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d={path}
          />
        </svg>
      </div>
    );
  };

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <>
      <header className="bg-white border-b border-gray-200 sticky top-0 z-30 h-16 md:h-24">
        {/* Mobile & Desktop Container */}
        <div className="h-full px-4 md:px-6">
          <div className="flex justify-between items-center h-full">
            {/* Left Section */}
            <div className="flex items-center gap-3 min-w-0">
              {/* Hamburger Menu Button - Mobile Only */}
              <button
                onClick={onMenuClick}
                className="p-2 -ml-2 rounded-lg hover:bg-gray-100 transition-colors md:hidden flex-shrink-0"
                aria-label="Buka menu navigasi"
              >
                <Menu className="w-5 h-5 text-gray-700" />
              </button>

              {/* Role & Greeting */}
              <div className="min-w-0">
                <h1 className="text-base md:text-lg font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent truncate">
                  {getRoleLabel()}
                </h1>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500 hidden sm:inline">
                    {greeting}
                  </span>
                  {greeting && getDisplayName() && (
                    <>
                      <span className="text-xs text-gray-300 hidden sm:inline">
                        •
                      </span>
                      <span className="text-xs font-medium text-gray-700 truncate">
                        {getDisplayName()}
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Right Section */}
            <div className="flex items-center gap-2 md:gap-4 flex-shrink-0">
              {/* Notification Bell */}
              <div className="relative" ref={notificationRef}>
                <button
                  onClick={() => {
                    setIsNotificationOpen((o) => !o);
                    setIsProfileOpen(false);
                  }}
                  className="relative p-2 text-gray-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all duration-200"
                  aria-label="Notifikasi"
                >
                  <Bell className="w-5 h-5" />
                  {unreadCount > 0 && (
                    <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center leading-none">
                      {unreadCount > 9 ? "9+" : unreadCount}
                    </span>
                  )}
                </button>

                {/* Notification Dropdown */}
                {isNotificationOpen && (
                  <div className="absolute right-0 mt-2 w-[calc(100vw-2rem)] max-w-96 sm:w-96 bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden z-50 animate-slide-down">
                    <div className="px-4 py-3 border-b border-gray-100 flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-gray-800 text-sm sm:text-base">
                          Notifikasi
                        </h3>
                        {unreadCount > 0 && (
                          <span className="px-1.5 py-0.5 text-[10px] sm:text-xs font-bold bg-red-100 text-red-600 rounded-full">
                            {unreadCount}
                          </span>
                        )}
                      </div>
                      {unreadCount > 0 && (
                        <button
                          onClick={handleMarkAllAsRead}
                          className="text-xs text-indigo-600 hover:text-indigo-700 font-medium"
                        >
                          Tandai semua dibaca
                        </button>
                      )}
                    </div>

                    <div className="max-h-[60vh] sm:max-h-96 overflow-y-auto">
                      {notifications.length === 0 ? (
                        <div className="p-6 sm:p-8 text-center">
                          <Bell className="w-10 h-10 sm:w-12 sm:h-12 text-gray-300 mx-auto mb-3" />
                          <p className="text-sm text-gray-500">
                            Tidak ada notifikasi
                          </p>
                        </div>
                      ) : (
                        notifications.map((n) => (
                          <div
                            key={n.id}
                            onClick={() => handleNotificationClick(n)}
                            className={`p-3 sm:p-4 border-b border-gray-50 cursor-pointer transition-colors hover:bg-gray-50 active:bg-gray-100 ${
                              !n.is_read ? "bg-indigo-50/40" : ""
                            }`}
                          >
                            <div className="flex gap-3">
                              {getNotificationIcon(n.type)}
                              <div className="flex-1 min-w-0">
                                <div className="flex justify-between items-start mb-1">
                                  <p
                                    className={`text-sm font-medium truncate ${
                                      !n.is_read
                                        ? "text-gray-900"
                                        : "text-gray-600"
                                    }`}
                                  >
                                    {n.title}
                                  </p>
                                  <span className="text-[10px] sm:text-xs text-gray-400 whitespace-nowrap ml-2 shrink-0">
                                    {formatTime(n.created_at)}
                                  </span>
                                </div>
                                <p className="text-xs text-gray-500 line-clamp-2">
                                  {n.message}
                                </p>
                              </div>
                              {!n.is_read && (
                                <div className="w-2 h-2 bg-indigo-500 rounded-full mt-1.5 shrink-0" />
                              )}
                            </div>
                          </div>
                        ))
                      )}
                    </div>

                    {notifications.length > 0 && (
                      <div className="px-4 py-2.5 border-t border-gray-100 text-center">
                        <button
                          onClick={() => {
                            fetchNotifications();
                          }}
                          className="text-xs text-gray-400 hover:text-indigo-600 transition-colors inline-flex items-center gap-1"
                        >
                          <RefreshCw className="w-3 h-3" />
                          Refresh notifikasi
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* User Profile */}
              <div className="relative" ref={profileRef}>
                <button
                  onClick={() => {
                    setIsProfileOpen((o) => !o);
                    setIsNotificationOpen(false);
                  }}
                  className="flex items-center gap-2 md:gap-3 p-1.5 rounded-lg hover:bg-gray-50 transition-all duration-200"
                >
                  {/* Avatar */}
                  <div
                    className={`w-8 h-8 md:w-9 md:h-9 bg-gradient-to-br ${getRoleBadgeColor()} rounded-full flex items-center justify-center text-white text-xs md:text-sm font-semibold shadow-md flex-shrink-0`}
                  >
                    {getUserInitials()}
                  </div>

                  {/* Name & Role - Hidden on mobile */}
                  <div className="hidden md:block text-left">
                    <p className="text-sm font-medium text-gray-800 leading-tight">
                      {getDisplayName()}
                    </p>
                    <p className="text-xs text-gray-500">{getRoleLabel()}</p>
                  </div>

                  {/* Chevron - Hidden on mobile */}
                  <ChevronDown className="w-4 h-4 text-gray-400 hidden md:block" />
                </button>

                {/* Profile Dropdown */}
                {isProfileOpen && (
                  <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden z-50 animate-slide-down">
                    {/* User Info Header */}
                    <div
                      className={`px-4 py-3 border-b border-gray-100 bg-gradient-to-r ${getRoleBadgeColor()} bg-opacity-10`}
                    >
                      <p className="text-sm font-semibold text-gray-800 truncate">
                        {userEmail}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        Role: {getRoleLabel()}
                      </p>
                    </div>

                    {/* Menu Items */}
                    <div className="py-2">
                      <button className="w-full px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50 transition-colors flex items-center gap-3 min-h-[44px]">
                        <User className="w-4 h-4 text-gray-400 flex-shrink-0" />
                        <span>Profil Saya</span>
                      </button>
                      <button className="w-full px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50 transition-colors flex items-center gap-3 min-h-[44px]">
                        <Settings className="w-4 h-4 text-gray-400 flex-shrink-0" />
                        <span>Pengaturan</span>
                      </button>
                    </div>

                    {/* Logout */}
                    <div className="border-t border-gray-100 py-2">
                      <button
                        onClick={openLogoutConfirm}
                        className="w-full px-4 py-2.5 text-left text-sm text-red-600 hover:bg-red-50 transition-colors flex items-center gap-3 min-h-[44px]"
                      >
                        <LogOut className="w-4 h-4 flex-shrink-0" />
                        <span>Logout</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <style jsx>{`
          @keyframes slide-down {
            from {
              opacity: 0;
              transform: translateY(-10px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
          .animate-slide-down {
            animation: slide-down 0.2s ease-out;
          }
        `}</style>
      </header>

      <ConfirmDialog
        isOpen={isLogoutConfirmOpen}
        variant="danger"
        title="Logout dari akun?"
        message={`Anda akan keluar dari akun ${getDisplayName() || userEmail}. Silakan login kembali untuk mengakses dashboard.`}
        confirmText="Ya, Logout"
        cancelText="Batal"
        isLoading={isLoggingOut}
        onConfirm={handleLogout}
        onCancel={() => setIsLogoutConfirmOpen(false)}
      />
    </>
  );
}
