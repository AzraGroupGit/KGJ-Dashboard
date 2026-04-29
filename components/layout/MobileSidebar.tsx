// components/layout/MobileSidebar.tsx

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import { X } from "lucide-react";
import {
  SUPERADMIN_ROUTES,
  CS_ROUTES,
  MARKETING_ROUTES,
  SUPERVISOR_ROUTES,
} from "@/lib/routes";

// Tipe untuk menu item
interface MenuItem {
  name: string;
  icon: string;
  href?: string;
  submenu?: MenuItem[];
}

// Tipe untuk menu collapse state
interface CollapseState {
  [key: string]: boolean;
}

// Props untuk komponen Sidebar
interface SidebarProps {
  role: string;
  isOpen: boolean;
  onClose: () => void;
}

const menuItems: Record<string, MenuItem[]> = {
  superadmin: [
    {
      name: "Overview",
      icon: "dashboard",
      href: SUPERADMIN_ROUTES.DASHBOARD,
    },
    {
      name: "Kelola Akun & Cabang",
      icon: "users",
      href: SUPERADMIN_ROUTES.KELOLA_AKUN,
    },
    {
      name: "Kelola QR Codes",
      icon: "qrcode",
      href: SUPERADMIN_ROUTES.KELOLA_QR_CODES,
    },
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
          name: "Monitoring Operasional",
          icon: "monitor",
          href: SUPERADMIN_ROUTES.OPRPRD_MONITORING_OPERASI,
        },
        {
          name: "Monitoring Produksi",
          icon: "production",
          href: SUPERADMIN_ROUTES.OPRPRD_MONITORING_PRODUKSI,
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
    { name: "Monitoring", icon: "monitor", href: SUPERVISOR_ROUTES.MONITORING },
    { name: "Persetujuan", icon: "approval", href: SUPERVISOR_ROUTES.APPROVAL },
  ],
};

const iconMap = {
  dashboard: (
    <svg
      className="w-5 h-5"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
      />
    </svg>
  ),
  statistik: (
    <svg
      className="w-5 h-5"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
      />
    </svg>
  ),
  users: (
    <svg
      className="w-5 h-5"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
      />
    </svg>
  ),
  report: (
    <svg
      className="w-5 h-5"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
      />
    </svg>
  ),
  input: (
    <svg
      className="w-5 h-5"
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
  ),
  branch: (
    <svg
      className="w-5 h-5"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
      />
    </svg>
  ),
  analisis: (
    <svg
      className="w-5 h-5"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
      />
    </svg>
  ),
  bms: (
    <svg
      className="w-5 h-5"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
      />
    </svg>
  ),
  oprprd: (
    <svg
      className="w-5 h-5"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9 3v2m6-2v2M9 13v3m6-3v3M5 7h14a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V9a2 2 0 012-2z"
      />
    </svg>
  ),
  monitor: (
    <svg
      className="w-5 h-5"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
      />
    </svg>
  ),
  production: (
    <svg
      className="w-5 h-5"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  ),
  approval: (
    <svg
      className="w-5 h-5"
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
  ),
  chevronDown: (
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
        d="M19 9l-7 7-7-7"
      />
    </svg>
  ),
  chevronRight: (
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
        d="M9 5l7 7-7 7"
      />
    </svg>
  ),
};

export default function Sidebar({ role, isOpen, onClose }: SidebarProps) {
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [collapsedMenus, setCollapsedMenus] = useState<CollapseState>({
    BMS: false,
    OPRPRD: true,
  });

  const items = menuItems[role as keyof typeof menuItems] || [];

  // Always hold the latest onClose without re-triggering effects
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  });

  // Kunci scroll body saat drawer mobile terbuka
  useEffect(() => {
    if (typeof window === "undefined") return;

    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }

    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  // Tutup drawer mobile saat pathname berubah
  useEffect(() => {
    onCloseRef.current();
  }, [pathname]);

  // Tutup drawer mobile saat resize ke desktop
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        onCloseRef.current();
      }
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const getRoleTitle = () => {
    switch (role) {
      case "superadmin": return "Super Admin";
      case "customer_service": return "CS";
      case "marketing": return "Marketing";
      case "supervisor": return "Supervisor";
      default: return "Dashboard";
    }
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

  const toggleMenuCollapse = (menuName: string) => {
    setCollapsedMenus((prev) => ({
      ...prev,
      [menuName]: !prev[menuName],
    }));
  };

  const isSubmenuActive = (submenu: MenuItem[]): boolean => {
    return submenu.some((item) => item.href && pathname === item.href);
  };

  const renderMenuItem = (item: MenuItem, index: number) => {
    const hasSubmenu = item.submenu && item.submenu.length > 0;
    const isExpanded = !collapsedMenus[item.name];
    const submenuActive = hasSubmenu ? isSubmenuActive(item.submenu!) : false;

    if (hasSubmenu) {
      return (
        <div key={index}>
          <button
            onClick={() => toggleMenuCollapse(item.name)}
            className={`
              w-full flex items-center gap-3 px-3 py-3 mb-1 rounded-lg
              transition-all duration-200 group min-h-[44px]
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

          {!isCollapsed && isExpanded && (
            <div className="ml-4 pl-4 border-l-2 border-gray-200 space-y-1 mb-1">
              {item.submenu!.map((subItem, subIndex) => {
                const isSubActive = subItem.href && pathname === subItem.href;
                return (
                  <Link
                    key={subIndex}
                    href={subItem.href || "#"}
                    onClick={onClose}
                    className={`
                      flex items-center gap-3 px-3 py-3 rounded-lg min-h-[44px]
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

    const isActive = pathname === item.href;
    return (
      <Link
        key={index}
        href={item.href || "#"}
        onClick={onClose}
        className={`
          flex items-center gap-3 px-3 py-3 mb-1 rounded-lg min-h-[44px]
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

  const sidebarContent = (
    <>
      {/* Header dengan tombol close (hanya mobile) */}
      <div className="flex items-center justify-between h-16 px-4 border-b border-gray-200 md:hidden">
        <div className="flex items-center gap-3">
          <div
            className={`bg-gradient-to-br ${getRoleBadgeColor()} rounded-xl flex items-center justify-center shadow-lg w-8 h-8`}
          >
            <svg
              className="w-4 h-4 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
              />
            </svg>
          </div>
          <span className="text-sm font-bold text-gray-800">
            {getRoleTitle()} Dashboard
          </span>
        </div>
        <button
          onClick={onClose}
          className="p-2 -mr-2 rounded-lg hover:bg-gray-100 transition-colors"
          aria-label="Tutup menu"
        >
          <X className="w-5 h-5 text-gray-600" />
        </button>
      </div>

      {/* Logo Section - Hidden di mobile, visible di desktop */}
      <div
        className={`hidden md:flex h-24 items-center border-b border-gray-200 ${
          isCollapsed ? "px-4 justify-center" : "px-6"
        }`}
      >
        <div className="flex items-center gap-3 overflow-hidden">
          <div
            className={`bg-gradient-to-br ${getRoleBadgeColor()} rounded-xl flex items-center justify-center shadow-lg w-10 h-10 flex-shrink-0`}
          >
            <svg
              className="w-5 h-5 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
              />
            </svg>
          </div>
          {!isCollapsed && (
            <div className="min-w-0">
              <h2 className="text-base font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent whitespace-nowrap">
                Operational
              </h2>
              <p className="text-sm font-semibold text-gray-600 whitespace-nowrap">
                Dashboard
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Toggle collapse button - Hanya desktop */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="hidden md:flex absolute -right-3 top-24 -translate-y-1/2 w-6 h-6 bg-white border border-gray-200 rounded-full items-center justify-center shadow-md hover:shadow-lg transition-all duration-200 z-40"
        aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
      >
        <svg
          className={`w-3 h-3 text-gray-600 transition-transform duration-300 ${
            isCollapsed ? "rotate-180" : ""
          }`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M11 19l-7-7 7-7m8 14l-7-7 7-7"
          />
        </svg>
      </button>

      {/* Navigation */}
      <nav className="flex-1 mt-4 md:mt-6 px-3 overflow-y-auto">
        {items.map((item, index) => renderMenuItem(item, index))}
      </nav>

      {/* Bottom Section */}
      <div
        className={`p-4 border-t border-gray-100 ${
          isCollapsed &&
          typeof window !== "undefined" &&
          window.innerWidth >= 768
            ? "text-center"
            : ""
        }`}
      >
        <div
          className={`flex items-center ${
            isCollapsed &&
            typeof window !== "undefined" &&
            window.innerWidth >= 768
              ? "justify-center"
              : "gap-3"
          }`}
        >
          <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0">
            <svg
              className="w-4 h-4 text-gray-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
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
    </>
  );

  return (
    <>
      {/* Overlay untuk mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm md:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Sidebar - Drawer di mobile, Static di desktop */}
      <aside
        className={`
          fixed top-0 left-0 z-50 h-full bg-white flex flex-col
          transform transition-transform duration-300 ease-in-out
          md:static md:z-auto md:translate-x-0 md:flex-shrink-0
          ${isCollapsed ? "md:w-20" : "md:w-64"}
          w-72
          ${isOpen ? "translate-x-0" : "-translate-x-full"}
          border-r border-gray-200 shadow-xl md:shadow-none
        `}
      >
        {sidebarContent}
      </aside>
    </>
  );
}
