// components/layout/Sidebar.tsx

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect, useRef, startTransition } from "react";
import {
  SUPERADMIN_ROUTES,
  CS_ROUTES,
  MARKETING_ROUTES,
  SUPERVISOR_ROUTES,
  MANAGEMENT_ROUTES,
} from "@/lib/routes";
import {
  LayoutDashboard,
  BarChart3,
  Users,
  FileText,
  Edit3,
  Building2,
  Package,
  CalendarDays,
  Activity,
  DollarSign,
  CheckCircle,
  ClipboardList,
  UserPlus,
  ChevronDown,
  ChevronRight,
  QrCode,
  Info,
  X,
  Menu,
  ChevronLeft,
  ScanEye,
} from "lucide-react";

import type { MenuItem, CollapseState } from "@/types/layout";

const menuItems: Record<string, MenuItem[]> = {
  superadmin: [
    // Kelola seluruh akun dan cabang
    {
      name: "Overview",
      icon: "dashboard",
      href: SUPERADMIN_ROUTES.DASHBOARD,
    },

    // Kelola seluruh akun dan cabang
    {
      name: "Kelola Akun & Cabang",
      icon: "users",
      href: SUPERADMIN_ROUTES.KELOLA_AKUN,
    },

    // Kelola qr codes
    {
      name: "Kelola QR Codes",
      icon: "qrcode",
      href: SUPERADMIN_ROUTES.KELOLA_QR_CODES,
    },

    // Monitoring Manajemen
    {
      name: "Management",
      icon: "checklist",
      submenu: [
        {
          name: "Dashboard",
          icon: "dashboard",
          href: SUPERADMIN_ROUTES.MANAGEMENT_DASHBOARD,
        },
        {
          name: "Monitoring",
          icon: "monitor",
          href: SUPERADMIN_ROUTES.MONITORING_MANAJEMEN,
        },
        {
          name: "History",
          icon: "order",
          href: SUPERADMIN_ROUTES.MANAGEMENT_HISTORY,
        },
      ],
    },

    // Menu besar BMS - berisi menu utama sebelumnya
    {
      name: "BMS",
      icon: "bms",
      submenu: [
        {
          name: "Dashboard",
          icon: "dashboard",
          href: SUPERADMIN_ROUTES.BMS_DASHBOARD,
        },
        {
          name: "Data Statistik",
          icon: "statistik",
          href: SUPERADMIN_ROUTES.STATISTIK,
        },
        { name: "Laporan", icon: "report", href: SUPERADMIN_ROUTES.LAPORAN },
      ],
    },

    // Menu besar OPRPRD
    {
      name: "OPR-PRD",
      icon: "oprprd",
      submenu: [
        {
          name: "Dashboard",
          icon: "dashboard",
          href: SUPERADMIN_ROUTES.OPRPRD_DASHBOARD,
        },
        {
          name: "Monitoring OPR-PRD",
          icon: "monitor",
          href: SUPERADMIN_ROUTES.OPRPRD_MONITORING,
        },
        {
          name: "Analisis Kinerja",
          icon: "analisis",
          href: SUPERADMIN_ROUTES.OPRPRD_ANALISIS,
        },
        {
          name: "Laporan",
          icon: "report",
          href: SUPERADMIN_ROUTES.OPRPRD_LAPORAN,
        },
      ],
    },
  ],
  customer_service: [
    { name: "Dashboard", icon: "dashboard", href: CS_ROUTES.DASHBOARD },
    { name: "Input Leads", icon: "input", href: CS_ROUTES.INPUT_LEADS },
    { name: "Input Order", icon: "order", href: CS_ROUTES.INPUT_ORDER },
    { name: "Pelanggan", icon: "users", href: CS_ROUTES.PELANGGAN },
  ],
  marketing: [
    { name: "Dashboard", icon: "dashboard", href: MARKETING_ROUTES.DASHBOARD },
    { name: "Input Marketing", icon: "input", href: MARKETING_ROUTES.INPUT },
    {
      name: "Analisis Channel",
      icon: "analisis",
      href: MARKETING_ROUTES.ANALISIS,
    },
  ],
  supervisor: [
    { name: "Dashboard", icon: "dashboard", href: SUPERVISOR_ROUTES.DASHBOARD },
    { name: "Monitoring", icon: "scan", href: SUPERVISOR_ROUTES.MONITORING },
    { name: "Persetujuan", icon: "approval", href: SUPERVISOR_ROUTES.APPROVAL },
    {
      name: "Kelola Akun Tim",
      icon: "users",
      href: SUPERVISOR_ROUTES.ACCOUNTS,
    },
    { name: "Personnel", icon: "personnel", href: SUPERVISOR_ROUTES.PERSONNEL },
    {
      name: "Slot Management",
      icon: "slot",
      href: SUPERVISOR_ROUTES.SLOT_MANAGEMENT,
    },
    { name: "QR Code", icon: "qr", href: SUPERVISOR_ROUTES.QR_CODES },
  ],
  management: [
    { name: "Dashboard", icon: "dashboard", href: MANAGEMENT_ROUTES.DASHBOARD },
    { name: "Tugas", icon: "checklist", href: MANAGEMENT_ROUTES.TASKS },
    { name: "Riwayat", icon: "order", href: MANAGEMENT_ROUTES.HISTORY },
  ],
};

const iconMap: Record<string, React.ReactNode> = {
  dashboard: <LayoutDashboard className="w-5 h-5" />,
  statistik: <BarChart3 className="w-5 h-5" />,
  users: <Users className="w-5 h-5" />,
  report: <FileText className="w-5 h-5" />,
  input: <Edit3 className="w-5 h-5" />,
  branch: <Building2 className="w-5 h-5" />,
  analisis: <BarChart3 className="w-5 h-5" />,
  bms: <Package className="w-5 h-5" />,
  oprprd: <CalendarDays className="w-5 h-5" />,
  monitor: <Activity className="w-5 h-5" />,
  scan: <ScanEye className="w-5 h-5" />,
  production: <DollarSign className="w-5 h-5" />,
  approval: <CheckCircle className="w-5 h-5" />,
  order: <ClipboardList className="w-5 h-5" />,
  slot: <CalendarDays className="w-5 h-5" />,
  personnel: <UserPlus className="w-5 h-5" />,
  chevronDown: <ChevronDown className="w-4 h-4" />,
  chevronRight: <ChevronRight className="w-4 h-4" />,
  qr: <QrCode className="w-5 h-5" />,
  checklist: <ClipboardList className="w-5 h-5" />,
};

export default function Sidebar({ role }: { role: string }) {
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [actualRole, setActualRole] = useState<string | null>(null);
  const [collapsedMenus, setCollapsedMenus] = useState<CollapseState>({
    BMS: false,
    OPRPRD: true,
  });

  const sidebarRef = useRef<HTMLElement>(null);
  const [buttonLeft, setButtonLeft] = useState<number | null>(null);
  const [headerBottom, setHeaderBottom] = useState<number | null>(null);

  useEffect(() => {
    const sidebar = sidebarRef.current;
    if (!sidebar) return;
    const observer = new ResizeObserver(() => {
      const rect = sidebar.getBoundingClientRect();
      setButtonLeft(rect.right - 11);
    });
    observer.observe(sidebar);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const header = document.getElementById("dashboard-header");
    if (!header) return;
    const observer = new ResizeObserver(() => {
      setHeaderBottom(header.getBoundingClientRect().bottom);
    });
    observer.observe(header);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    startTransition(() => {
      setMobileOpen(false);
    });
  }, [pathname]);

  useEffect(() => {
    if (role !== "supervisor" && role !== "management") return;
    fetch("/api/me")
      .then((r) => r.json())
      .then((j) => setActualRole(j.data?.role?.name ?? null))
      .catch(() => {});
  }, [role]);

  let items = menuItems[role as keyof typeof menuItems] || [];
  if (actualRole === "production_supervisor") {
    items = items.filter((i) => i.name !== "Slot Management");
  }

  const toggleMenuCollapse = (menuName: string) => {
    setCollapsedMenus((prev) => ({
      ...prev,
      [menuName]: !prev[menuName],
    }));
  };

  // Fungsi untuk mengecek apakah submenu memiliki item yang aktif
  const isSubmenuActive = (submenu: MenuItem[]): boolean => {
    return submenu.some((item) => item.href && pathname === item.href);
  };

  // Render menu item (bisa regular link atau menu dengan submenu)
  const renderMenuItem = (item: MenuItem, index: number) => {
    const hasSubmenu = item.submenu && item.submenu.length > 0;
    const isExpanded = !collapsedMenus[item.name];
    const submenuActive = hasSubmenu ? isSubmenuActive(item.submenu!) : false;

    if (hasSubmenu) {
      return (
        <div key={index}>
          {/* Header Menu Collapsible */}
          <button
            onClick={() => toggleMenuCollapse(item.name)}
            className={`
              w-full flex items-center gap-3 px-3 py-2.5 mb-1 rounded-lg
              transition-all duration-200 group
              ${
                submenuActive
                  ? "bg-gradient-to-r from-indigo-50 to-purple-50 text-indigo-600"
                  : "text-gray-600 hover:bg-gray-50 hover:text-indigo-600"
              }
              ${isCollapsed ? "justify-center" : ""}
            `}
            title={isCollapsed ? item.name : ""}
          >
            <span
              className={`${
                submenuActive
                  ? "text-indigo-600"
                  : "text-gray-500 group-hover:text-indigo-600"
              } transition-colors flex-shrink-0`}
            >
              {iconMap[item.icon as keyof typeof iconMap] || iconMap.dashboard}
            </span>
            {!isCollapsed && (
              <>
                <span className="text-sm font-medium whitespace-nowrap flex-1 text-left">
                  {item.name}
                </span>
                <span className="flex-shrink-0 text-gray-400">
                  {isExpanded ? iconMap.chevronDown : iconMap.chevronRight}
                </span>
              </>
            )}
            {submenuActive && !isCollapsed && (
              <div className="ml-auto w-1.5 h-1.5 bg-indigo-600 rounded-full"></div>
            )}
          </button>

          {/* Submenu Items */}
          {!isCollapsed && isExpanded && (
            <div className="ml-4 pl-4 border-l-2 border-gray-200 space-y-1 mb-1">
              {item.submenu!.map((subItem, subIndex) => {
                const isSubActive = subItem.href && pathname === subItem.href;
                return (
                  <Link
                    key={subIndex}
                    href={subItem.href || "#"}
                    className={`
                      flex items-center gap-3 px-3 py-2 rounded-lg
                      transition-all duration-200 group
                      ${
                        isSubActive
                          ? "bg-gradient-to-r from-indigo-50 to-purple-50 text-indigo-600 shadow-sm"
                          : "text-gray-500 hover:bg-gray-50 hover:text-indigo-600"
                      }
                    `}
                  >
                    <span
                      className={`${
                        isSubActive
                          ? "text-indigo-600"
                          : "text-gray-400 group-hover:text-indigo-600"
                      } transition-colors flex-shrink-0`}
                    >
                      {iconMap[subItem.icon as keyof typeof iconMap] ||
                        iconMap.dashboard}
                    </span>
                    <span className="text-sm font-medium whitespace-nowrap">
                      {subItem.name}
                    </span>
                    {isSubActive && (
                      <div className="ml-auto w-1.5 h-1.5 bg-indigo-600 rounded-full"></div>
                    )}
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      );
    }

    // Regular menu item (tanpa submenu)
    const isActive = pathname === item.href;
    return (
      <Link
        key={index}
        href={item.href || "#"}
        className={`
          flex items-center gap-3 px-3 py-2.5 mb-1 rounded-lg
          transition-all duration-200 group
          ${
            isActive
              ? "bg-gradient-to-r from-indigo-50 to-purple-50 text-indigo-600 shadow-sm"
              : "text-gray-600 hover:bg-gray-50 hover:text-indigo-600"
          }
          ${isCollapsed ? "justify-center" : ""}
        `}
        title={isCollapsed ? item.name : ""}
      >
        <span
          className={`${
            isActive
              ? "text-indigo-600"
              : "text-gray-500 group-hover:text-indigo-600"
          } transition-colors flex-shrink-0`}
        >
          {iconMap[item.icon as keyof typeof iconMap] || iconMap.dashboard}
        </span>
        {!isCollapsed && (
          <span className="text-sm font-medium whitespace-nowrap">
            {item.name}
          </span>
        )}
        {isActive && !isCollapsed && (
          <div className="ml-auto w-1.5 h-1.5 bg-indigo-600 rounded-full"></div>
        )}
      </Link>
    );
  };

  return (
    <>
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile hamburger */}
      <button
        onClick={() => setMobileOpen(true)}
        className="fixed top-3 left-3 z-50 md:hidden h-10 w-10 bg-white border border-gray-200 rounded-xl flex items-center justify-center shadow-md"
        aria-label="Buka menu"
      >
        <Menu className="w-5 h-5 text-gray-600" />
      </button>

      <aside
        ref={sidebarRef}
        className={`
          fixed top-0 left-0 z-50 h-full bg-white flex flex-col overflow-hidden
          transform transition-transform duration-300 ease-in-out
          md:sticky md:top-0 md:translate-x-0 md:flex-shrink-0
          ${isCollapsed ? "md:w-20" : "md:w-64"}
          w-72
          ${mobileOpen ? "translate-x-0" : "-translate-x-full"}
          border-r border-gray-200 shadow-xl md:shadow-none
        `}
      >
        {/* Mobile close */}
        <div className="flex items-center justify-between h-16 px-4 border-b border-gray-200 md:hidden">
          <span className="text-sm font-bold text-gray-800">Menu</span>
          <button
            onClick={() => setMobileOpen(false)}
            className="p-2 -mr-2 rounded-lg hover:bg-gray-100"
          >
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        {/* Logo Section */}
        <div
          className={`h-24 flex items-center border-b border-gray-200 ${
            isCollapsed ? "px-4 justify-center" : "px-6"
          }`}
        >
          <div className="flex items-center gap-3 overflow-hidden">
            <div
              className={`${isCollapsed ? "w-10 h-10" : "w-10 h-10"} flex-shrink-0 rounded-xl overflow-hidden`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/logo.png"
                alt="KGJ"
                className="w-full h-full object-contain"
              />
            </div>
            {!isCollapsed && (
              <div className="min-w-0">
                <h2 className="text-base font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent whitespace-nowrap">
                  KGJ Dashboard
                </h2>
                <p className="text-sm font-semibold text-gray-600 whitespace-nowrap">
                  ERP System
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto mt-6 px-3">
          {items.map((item, index) => renderMenuItem(item, index))}
        </nav>

        {/* Bottom Section */}
        <div className={`p-4 ${isCollapsed ? "text-center" : ""}`}>
          <div
            className={`flex items-center ${
              isCollapsed ? "justify-center" : "gap-3"
            }`}
          >
            <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0">
              <Info className="w-4 h-4 text-gray-500" />
            </div>
            {!isCollapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-xs text-gray-500">Need help?</p>
                <p className="text-xs font-medium text-gray-700">
                  Support Center
                </p>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Collapse toggle — outside aside to avoid sticky stacking context */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="hidden md:flex fixed z-50 w-8 h-8 bg-white border border-gray-200 rounded-full items-center justify-center shadow-md hover:shadow-lg transition-all duration-200"
        style={{
          left: buttonLeft ?? (isCollapsed ? 67 : 243),
          top: headerBottom != null ? headerBottom - 14 : 84,
        }}
        aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
      >
        <ChevronLeft
          className={`w-5 h-5 text-gray-600 transition-transform duration-300 ${isCollapsed ? "rotate-180" : ""}`}
        />
      </button>
    </>
  );
}
