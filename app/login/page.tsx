// app/login/page.tsx

"use client";

import { useState, useEffect, startTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Loading from "@/components/ui/Loading";
import { getDashboardPath, queryParamToAppRole } from "@/lib/routes";
import { setClientUser, type LoginRole } from "@/lib/auth/session";
import {
  Shield,
  Headphones,
  BarChart3,
  ArrowLeft,
  AlertCircle,
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
} from "lucide-react";

// ════════════════════════════════════════════════════════════════════════════
// ROLE CONFIGS & ICONS
// ════════════════════════════════════════════════════════════════════════════

interface RoleConfig {
  value: LoginRole;
  label: string;
  colors: { border: string; bg: string; text: string };
  icon: React.ReactNode;
}

const ROLE_CONFIGS: RoleConfig[] = [
  {
    value: "superadmin",
    label: "Super Admin",
    colors: {
      border: "#f0c96b",
      bg: "rgba(240,201,107,0.1)",
      text: "#b8860b",
    },
    icon: <Shield className="w-full h-full" />,
  },
  {
    value: "customer_service",
    label: "CS",
    colors: {
      border: "#4f8ef7",
      bg: "rgba(79,142,247,0.1)",
      text: "#2563eb",
    },
    icon: <Headphones className="w-full h-full" />,
  },
  {
    value: "marketing",
    label: "Marketing",
    colors: {
      border: "#82c882",
      bg: "rgba(130,200,130,0.1)",
      text: "#16a34a",
    },
    icon: <BarChart3 className="w-full h-full" />,
  },
];

// ════════════════════════════════════════════════════════════════════════════
// COMPONENT
// ════════════════════════════════════════════════════════════════════════════

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [role, setRole] = useState<LoginRole>("superadmin");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  // Set role from URL query parameter
  useEffect(() => {
    const roleFromParam = queryParamToAppRole(searchParams.get("role"));
    if (roleFromParam) {
      startTransition(() => {
        setRole(roleFromParam);
      });
    }
  }, [searchParams]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    if (!email || !password) {
      setError("Email dan password harus diisi!");
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, role }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Login gagal!");
        setIsLoading(false);
        return;
      }

      // Simpan data user via setter terpusat — lebih type-safe dan konsisten
      setClientUser({
        id: data.user.id,
        email: data.user.email,
        fullName: data.user.fullName,
        role: data.user.role,
        username: data.user.username ?? null,
        roleDetail: data.user.roleDetail ?? null,
        branch: data.user.branch ?? null,
      });

      const targetPath = getDashboardPath(data.user.role);

      if (!targetPath) {
        setError(`Role tidak dikenali: ${data.user.role}`);
        setIsLoading(false);
        return;
      }

      router.push(targetPath);
      router.refresh();
    } catch (err) {
      console.error("Login error:", err);
      setError("Terjadi kesalahan pada server!");
      setIsLoading(false);
    }
  };

  // Warna aktif berdasarkan role yang dipilih — dipakai di CSS variable
  const activeConfig =
    ROLE_CONFIGS.find((c) => c.value === role) ?? ROLE_CONFIGS[0];
  const roleColor = activeConfig.colors;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500&family=DM+Serif+Display:ital@0;1&display=swap');

        * { 
          box-sizing: border-box; 
          margin: 0;
          padding: 0;
        }

        html, body {
          margin: 0;
          padding: 0;
          background: #0f1623;
          overflow: hidden;
          height: 100vh;
          width: 100vw;
        }

        .login-root {
          font-family: 'DM Sans', sans-serif;
          background: #0f1623;
          color: #f0f4ff;
          width: 100vw;
          height: 100vh;
          overflow: hidden;
          display: flex;
          align-items: center;
          justify-content: center;
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
        }

        /* === BACKGROUND EFFECTS === */
        .grid-lines {
          position: absolute; 
          inset: 0; 
          pointer-events: none; 
          z-index: 0;
          background-image:
            linear-gradient(rgba(79,142,247,0.04) 1px, transparent 1px),
            linear-gradient(90deg, rgba(79,142,247,0.04) 1px, transparent 1px);
          background-size: 60px 60px;
        }

        .orb {
          position: absolute; 
          border-radius: 50%; 
          filter: blur(80px);
          pointer-events: none; 
          animation: orbFloat 8s ease-in-out infinite;
        }
        .orb-1 { 
          width: 400px; 
          height: 400px; 
          background: rgba(79,142,247,0.12); 
          top: -100px; 
          right: -80px; 
          animation-delay: 0s; 
        }
        .orb-2 { 
          width: 300px; 
          height: 300px; 
          background: rgba(240,201,107,0.07); 
          bottom: -60px; 
          left: 30%; 
          animation-delay: 3s; 
        }
        .orb-3 { 
          width: 200px; 
          height: 200px; 
          background: rgba(79,142,247,0.08); 
          top: 40%; 
          left: 8%; 
          animation-delay: 5s; 
        }

        @keyframes orbFloat {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-24px); }
        }

        /* === CARD STYLES === */
        .login-card {
          background: #ffffff;
          border-radius: 24px;
          padding: 24px 28px;
          width: 100%;
          max-width: 440px;
          position: relative;
          z-index: 10;
          animation: fadeUp 0.4s ease both;
          box-shadow: 
            0 20px 40px -8px rgba(0,0,0,0.3),
            0 0 0 1px rgba(255,255,255,0.05) inset;
          max-height: calc(100vh - 40px);
          overflow-y: auto;
          scrollbar-width: none;
          -ms-overflow-style: none;
        }
        .login-card::-webkit-scrollbar {
          display: none;
        }

        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(16px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .back-link {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          color: #9ca3af;
          font-size: 12px;
          text-decoration: none;
          margin-bottom: 16px;
          transition: color 0.2s;
        }
        .back-link:hover {
          color: #6b7280;
        }

        .logo-wrapper {
          display: flex;
          justify-content: center;
          margin-bottom: 16px;
        }
        .logo-icon {
          width: 44px;
          height: 44px;
          background: linear-gradient(135deg, #4f8ef7 0%, #3b7ad7 100%);
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 6px 12px -4px rgba(79,142,247,0.25);
        }

        .welcome-title {
          font-family: 'DM Serif Display', serif;
          font-size: 22px;
          color: #1f2937;
          text-align: center;
          margin-bottom: 4px;
          letter-spacing: -0.02em;
        }
        .welcome-sub {
          font-size: 13px;
          color: #9ca3af;
          text-align: center;
          margin-bottom: 16px;
          font-weight: 400;
        }

        .role-label {
          font-size: 11px;
          font-weight: 500;
          color: #6b7280;
          margin-bottom: 8px;
          text-align: center;
          letter-spacing: 0.04em;
          text-transform: uppercase;
        }

        /* Role Selector — grid 3 kolom × 2 baris untuk 6 role */
        .role-selector {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 6px;
          margin-bottom: 18px;
        }
        .role-btn {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
          padding: 8px 4px;
          background: #f9fafb;
          border: 1px solid #e5e7eb;
          border-radius: 10px;
          cursor: pointer;
          transition: all 0.15s ease;
          color: #9ca3af;
          min-height: 56px;
        }
        .role-btn svg {
          width: 18px;
          height: 18px;
          flex-shrink: 0;
        }
        .role-btn span {
          font-size: 10.5px;
          font-weight: 500;
          text-align: center;
          line-height: 1.2;
          white-space: nowrap;
        }
        .role-btn.active {
          border-color: ${roleColor.border};
          background: ${roleColor.bg};
          color: ${roleColor.text};
          box-shadow: 0 2px 6px rgba(0,0,0,0.04);
        }
        .role-btn:hover:not(.active):not(:disabled) {
          background: #f3f4f6;
          border-color: #d1d5db;
          color: #6b7280;
        }
        .role-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        /* Input Fields */
        .input-group {
          margin-bottom: 14px;
        }
        .input-label {
          display: block;
          font-size: 12px;
          font-weight: 500;
          color: #4b5563;
          margin-bottom: 5px;
          letter-spacing: 0.01em;
        }
        .input-wrapper {
          position: relative;
        }
        .input-icon {
          position: absolute;
          left: 12px;
          top: 50%;
          transform: translateY(-50%);
          color: #9ca3af;
        }
        .input-field {
          width: 100%;
          padding: 10px 12px 10px 40px;
          background: #f9fafb;
          border: 1px solid #e5e7eb;
          border-radius: 10px;
          font-size: 13px;
          color: #1f2937;
          font-family: 'DM Sans', sans-serif;
          transition: all 0.15s ease;
          outline: none;
        }
        .input-field::placeholder {
          color: #cbd5e1;
          font-weight: 300;
        }
        .input-field:focus {
          border-color: #4f8ef7;
          background: #ffffff;
          box-shadow: 0 0 0 3px rgba(79,142,247,0.08);
        }
        .input-field:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .password-toggle {
          position: absolute;
          right: 12px;
          top: 50%;
          transform: translateY(-50%);
          background: none;
          border: none;
          color: #9ca3af;
          cursor: pointer;
          padding: 4px;
          transition: color 0.2s;
        }
        .password-toggle:hover {
          color: #6b7280;
        }

        /* Login Button */
        .login-btn {
          width: 100%;
          padding: 11px;
          background: #4f8ef7;
          border: none;
          border-radius: 10px;
          color: white;
          font-size: 14px;
          font-weight: 500;
          font-family: 'DM Sans', sans-serif;
          cursor: pointer;
          transition: all 0.15s ease;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          margin-top: 18px;
          box-shadow: 0 3px 10px rgba(79,142,247,0.25);
        }
        .login-btn:hover:not(:disabled) {
          background: #3b7ad7;
          transform: translateY(-1px);
          box-shadow: 0 6px 16px rgba(79,142,247,0.3);
        }
        .login-btn:active:not(:disabled) {
          transform: scale(0.98);
        }
        .login-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
          box-shadow: none;
        }

        /* Demo Section */
        .demo-section {
          margin-top: 16px;
          padding-top: 14px;
          border-top: 1px solid #f0f0f0;
        }
        .demo-title {
          font-size: 10px;
          font-weight: 600;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: #cbd5e1;
          text-align: center;
          margin-bottom: 10px;
        }
        .demo-accounts {
          display: flex;
          flex-direction: column;
          gap: 5px;
        }
        .demo-account {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 11px;
          color: #9ca3af;
          padding: 6px 10px;
          background: #f9fafb;
          border-radius: 6px;
          cursor: pointer;
          transition: all 0.15s;
          border: 1px solid transparent;
        }
        .demo-account:hover {
          background: #f3f4f6;
          border-color: #e5e7eb;
          color: #6b7280;
        }
        .demo-dot {
          width: 5px;
          height: 5px;
          border-radius: 50%;
          flex-shrink: 0;
        }
        .demo-dot.admin { background: #f0c96b; }
        .demo-dot.cs { background: #4f8ef7; }
        .demo-dot.marketing { background: #82c882; }

        /* Loading Overlay */
        .loading-overlay {
          position: absolute;
          inset: 0;
          background: rgba(255,255,255,0.95);
          backdrop-filter: blur(3px);
          border-radius: 24px;
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 20;
        }

        .spinner {
          width: 14px;
          height: 14px;
          border: 2px solid rgba(79,142,247,0.2);
          border-top-color: #4f8ef7;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        /* Alert Error */
        .alert-error {
          background: #fef2f2;
          border: 1px solid #fecaca;
          border-radius: 8px;
          padding: 10px 12px;
          margin-bottom: 16px;
          display: flex;
          align-items: center;
          gap: 8px;
          color: #dc2626;
          font-size: 12px;
          animation: slideDown 0.25s ease;
        }

        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-8px); }
          to { opacity: 1; transform: translateY(0); }
        }

        /* Responsive untuk layar kecil */
        @media (max-height: 640px) {
          .login-card {
            padding: 18px 22px;
          }
          .welcome-title {
            font-size: 20px;
          }
          .welcome-sub {
            font-size: 12px;
            margin-bottom: 12px;
          }
          .role-btn {
            padding: 6px 3px;
            min-height: 48px;
          }
          .role-btn svg {
            width: 16px;
            height: 16px;
          }
          .role-btn span {
            font-size: 9.5px;
          }
          .input-field {
            padding: 8px 10px 8px 36px;
          }
        }
      `}</style>

      <div className="login-root">
        {/* === BACKGROUND EFFECTS === */}
        <div className="grid-lines" />
        <div className="orb orb-1" />
        <div className="orb orb-2" />
        <div className="orb orb-3" />

        {/* Decorative SVG */}
        <svg
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            pointerEvents: "none",
            zIndex: 0,
          }}
          viewBox="0 0 1200 800"
          preserveAspectRatio="xMidYMid slice"
          xmlns="http://www.w3.org/2000/svg"
        >
          <circle
            cx="200"
            cy="600"
            r="180"
            fill="none"
            stroke="rgba(79,142,247,0.06)"
            strokeWidth="1"
          />
          <circle
            cx="200"
            cy="600"
            r="280"
            fill="none"
            stroke="rgba(79,142,247,0.04)"
            strokeWidth="1"
          />
          <circle
            cx="1000"
            cy="200"
            r="150"
            fill="none"
            stroke="rgba(240,201,107,0.05)"
            strokeWidth="1"
          />
          <line
            x1="600"
            y1="0"
            x2="600"
            y2="800"
            stroke="rgba(79,142,247,0.05)"
            strokeWidth="0.5"
          />
          <polygon
            points="120,680 240,460 360,600 200,720"
            fill="none"
            stroke="rgba(240,201,107,0.06)"
            strokeWidth="1"
          />
          <polygon
            points="50,400 170,280 250,380 130,500"
            fill="none"
            stroke="rgba(79,142,247,0.05)"
            strokeWidth="0.5"
          />
        </svg>

        {/* === LOGIN CARD === */}
        <div className="login-card">
          <Link href="/" className="back-link">
            <ArrowLeft className="w-3.5 h-3.5" />
            Kembali ke Beranda
          </Link>

          <div className="logo-wrapper">
            <div className="logo-icon">
              <svg
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#ffffff"
                strokeWidth="1.8"
              >
                <path
                  d="M3 10L12 5L21 10V18L12 22L3 18V10Z"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M12 14L16 12V8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M8 14L12 16V12"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
          </div>

          <h1 className="welcome-title">Selamat Datang</h1>
          <p className="welcome-sub">Login untuk mengakses dashboard</p>

          {error && (
            <div className="alert-error">
              <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
              {error}
            </div>
          )}

          <form onSubmit={handleLogin}>
            <div className="role-label">Pilih Role</div>
            <div className="role-selector">
              {ROLE_CONFIGS.map((config) => (
                <button
                  key={config.value}
                  type="button"
                  className={`role-btn ${role === config.value ? "active" : ""}`}
                  onClick={() => setRole(config.value)}
                  disabled={isLoading}
                >
                  {config.icon}
                  <span>{config.label}</span>
                </button>
              ))}
            </div>

            <div className="input-group">
              <label className="input-label">Email</label>
              <div className="input-wrapper">
                <span className="input-icon">
                  <Mail className="w-3.5 h-3.5" />
                </span>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input-field"
                  placeholder="nama@email.com"
                  required
                  disabled={isLoading}
                />
              </div>
            </div>

            <div className="input-group">
              <label className="input-label">Password</label>
              <div className="input-wrapper">
                <span className="input-icon">
                  <Lock className="w-3.5 h-3.5" />
                </span>
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input-field"
                  placeholder="••••••••"
                  required
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="password-toggle"
                  disabled={isLoading}
                >
                  {showPassword ? (
                    <EyeOff className="w-3.5 h-3.5" />
                  ) : (
                    <Eye className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>
            </div>

            <button type="submit" className="login-btn" disabled={isLoading}>
              {isLoading ? (
                <>
                  <span className="spinner"></span>
                  <span>Memverifikasi...</span>
                </>
              ) : (
                <>
                  <span>Masuk ke Dashboard</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </form>

          <div className="demo-section">
            <div className="demo-title">Akun Demo</div>
            <div className="demo-accounts">
              <div
                className="demo-account"
                onClick={() => {
                  setRole("superadmin");
                  setEmail("admin@company.com");
                  setPassword("password123");
                }}
              >
                <span className="demo-dot admin"></span>
                <span>Super Admin: admin@company.com / password123</span>
              </div>
              <div
                className="demo-account"
                onClick={() => {
                  setRole("customer_service");
                  setEmail("cs.jogja@company.com");
                  setPassword("password123");
                }}
              >
                <span className="demo-dot cs"></span>
                <span>CS: cs.jogja@company.com / password123</span>
              </div>
              <div
                className="demo-account"
                onClick={() => {
                  setRole("marketing");
                  setEmail("marketing@company.com");
                  setPassword("password123");
                }}
              >
                <span className="demo-dot marketing"></span>
                <span>Marketing: marketing@company.com / password123</span>
              </div>
            </div>
          </div>

          {isLoading && (
            <div className="loading-overlay">
              <Loading variant="dots" size="lg" text="Memverifikasi akun..." />
            </div>
          )}
        </div>
      </div>
    </>
  );
}
