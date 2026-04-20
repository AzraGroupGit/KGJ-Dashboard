// app/login/page.tsx

"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Loading from "@/components/ui/Loading";
import Alert from "@/components/ui/Alert";
import { getDashboardPath } from "@/lib/routes";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [role, setRole] = useState<"superadmin" | "cs" | "marketing">(
    "superadmin",
  );
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  // Set role from URL query parameter
  useEffect(() => {
    const roleParam = searchParams.get("role");
    if (roleParam === "admin") {
      setRole("superadmin");
    } else if (roleParam === "cs" || roleParam === "marketing") {
      setRole(roleParam);
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
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password, role }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Login gagal!");
        setIsLoading(false);
        return;
      }

      localStorage.setItem("userRole", data.user.role);
      localStorage.setItem("userEmail", data.user.email);
      localStorage.setItem("userName", data.user.fullName);
      localStorage.setItem("userId", data.user.id);

      if (data.user.branch) {
        localStorage.setItem("userBranch", JSON.stringify(data.user.branch));
      }

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

  const getRoleColor = () => {
    switch (role) {
      case "superadmin":
        return {
          border: "#f0c96b",
          bg: "rgba(240,201,107,0.1)",
          text: "#b8860b",
        };
      case "cs":
        return {
          border: "#4f8ef7",
          bg: "rgba(79,142,247,0.1)",
          text: "#2563eb",
        };
      case "marketing":
        return {
          border: "#82c882",
          bg: "rgba(130,200,130,0.1)",
          text: "#16a34a",
        };
    }
  };

  const roleColor = getRoleColor();

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500&family=DM+Serif+Display:ital@0;1&display=swap');

        * { box-sizing: border-box; }

        body {
          margin: 0;
          background: #0f1623;
          overflow: hidden;
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
          position: relative;
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

        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }

        /* === CARD STYLES - TERANG === */
        .login-card {
          background: #ffffff;
          border: 1px solid rgba(0,0,0,0.05);
          border-radius: 28px;
          padding: 36px 40px;
          width: 100%;
          max-width: 460px;
          position: relative;
          z-index: 10;
          animation: fadeUp 0.5s ease both;
          box-shadow: 
            0 25px 50px -12px rgba(0,0,0,0.25),
            0 0 0 1px rgba(255,255,255,0.05) inset;
        }

        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .back-link {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          color: #9ca3af;
          font-size: 13px;
          text-decoration: none;
          margin-bottom: 24px;
          transition: color 0.2s;
        }
        .back-link:hover {
          color: #6b7280;
        }

        .logo-wrapper {
          display: flex;
          justify-content: center;
          margin-bottom: 24px;
        }
        .logo-icon {
          width: 52px;
          height: 52px;
          background: linear-gradient(135deg, #4f8ef7 0%, #3b7ad7 100%);
          border-radius: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 8px 16px -4px rgba(79,142,247,0.25);
        }

        .welcome-title {
          font-family: 'DM Serif Display', serif;
          font-size: 26px;
          color: #1f2937;
          text-align: center;
          margin-bottom: 6px;
          letter-spacing: -0.02em;
        }
        .welcome-sub {
          font-size: 14px;
          color: #9ca3af;
          text-align: center;
          margin-bottom: 28px;
          font-weight: 400;
        }

        /* Role Selector */
        .role-selector {
          display: flex;
          gap: 8px;
          margin-bottom: 28px;
        }
        .role-btn {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 6px;
          padding: 12px 8px;
          background: #f9fafb;
          border: 1px solid #e5e7eb;
          border-radius: 12px;
          cursor: pointer;
          transition: all 0.2s ease;
          color: #9ca3af;
        }
        .role-btn svg {
          width: 22px;
          height: 22px;
        }
        .role-btn span {
          font-size: 12px;
          font-weight: 500;
        }
        .role-btn.active {
          border-color: ${roleColor.border};
          background: ${roleColor.bg};
          color: ${roleColor.text};
          box-shadow: 0 2px 8px rgba(0,0,0,0.04);
        }
        .role-btn:hover:not(.active) {
          background: #f3f4f6;
          border-color: #d1d5db;
          color: #6b7280;
        }

        /* Input Fields */
        .input-group {
          margin-bottom: 18px;
        }
        .input-label {
          display: block;
          font-size: 13px;
          font-weight: 500;
          color: #4b5563;
          margin-bottom: 6px;
          letter-spacing: 0.01em;
        }
        .input-wrapper {
          position: relative;
        }
        .input-icon {
          position: absolute;
          left: 14px;
          top: 50%;
          transform: translateY(-50%);
          color: #9ca3af;
        }
        .input-field {
          width: 100%;
          padding: 12px 14px 12px 44px;
          background: #f9fafb;
          border: 1px solid #e5e7eb;
          border-radius: 12px;
          font-size: 14px;
          color: #1f2937;
          font-family: 'DM Sans', sans-serif;
          transition: all 0.2s ease;
          outline: none;
        }
        .input-field::placeholder {
          color: #cbd5e1;
          font-weight: 300;
        }
        .input-field:focus {
          border-color: #4f8ef7;
          background: #ffffff;
          box-shadow: 0 0 0 3px rgba(79,142,247,0.1);
        }
        .input-field:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .password-toggle {
          position: absolute;
          right: 14px;
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
          padding: 13px;
          background: #4f8ef7;
          border: none;
          border-radius: 12px;
          color: white;
          font-size: 15px;
          font-weight: 500;
          font-family: 'DM Sans', sans-serif;
          cursor: pointer;
          transition: all 0.2s ease;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          margin-top: 24px;
          box-shadow: 0 4px 12px rgba(79,142,247,0.3);
        }
        .login-btn:hover:not(:disabled) {
          background: #3b7ad7;
          transform: translateY(-1px);
          box-shadow: 0 8px 20px rgba(79,142,247,0.35);
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
          margin-top: 24px;
          padding-top: 20px;
          border-top: 1px solid #f0f0f0;
        }
        .demo-title {
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: #cbd5e1;
          text-align: center;
          margin-bottom: 14px;
        }
        .demo-accounts {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .demo-account {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 12px;
          color: #9ca3af;
          padding: 8px 12px;
          background: #f9fafb;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.2s;
          border: 1px solid transparent;
        }
        .demo-account:hover {
          background: #f3f4f6;
          border-color: #e5e7eb;
          color: #6b7280;
        }
        .demo-dot {
          width: 6px;
          height: 6px;
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
          background: rgba(255,255,255,0.9);
          backdrop-filter: blur(4px);
          border-radius: 28px;
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 20;
        }

        .spinner {
          width: 16px;
          height: 16px;
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
          border-radius: 10px;
          padding: 12px 14px;
          margin-bottom: 20px;
          display: flex;
          align-items: center;
          gap: 10px;
          color: #dc2626;
          font-size: 13px;
          animation: slideDown 0.3s ease;
        }

        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
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

        {/* === LOGIN CARD (TERANG) === */}
        <div className="login-card">
          <Link href="/" className="back-link">
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path
                d="M19 12H5M12 19l-7-7 7-7"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            Kembali ke Beranda
          </Link>

          <div className="logo-wrapper">
            <div className="logo-icon">
              <svg
                width="26"
                height="26"
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
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              {error}
            </div>
          )}

          <form onSubmit={handleLogin}>
            <div className="role-selector">
              <button
                type="button"
                className={`role-btn ${role === "superadmin" ? "active" : ""}`}
                onClick={() => setRole("superadmin")}
                disabled={isLoading}
              >
                <svg viewBox="0 0 24 24" fill="none">
                  <path
                    d="M12 15L12 18"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                  />
                  <path
                    d="M8 11L8 14"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                  />
                  <path
                    d="M16 11L16 14"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                  />
                  <path
                    d="M4 20L7 20"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                  />
                  <path
                    d="M17 20L20 20"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                  />
                  <rect
                    x="3"
                    y="8"
                    width="18"
                    height="12"
                    rx="2"
                    stroke="currentColor"
                    strokeWidth="1.8"
                  />
                  <path
                    d="M7 5L7 8"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                  />
                  <path
                    d="M12 3L12 8"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                  />
                  <path
                    d="M17 5L17 8"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                  />
                </svg>
                <span>Super Admin</span>
              </button>
              <button
                type="button"
                className={`role-btn ${role === "cs" ? "active" : ""}`}
                onClick={() => setRole("cs")}
                disabled={isLoading}
              >
                <svg viewBox="0 0 24 24" fill="none">
                  <path
                    d="M3 10C3 7.79086 4.79086 6 7 6H17C19.2091 6 21 7.79086 21 10V14C21 16.2091 19.2091 18 17 18H7C4.79086 18 3 16.2091 3 14V10Z"
                    stroke="currentColor"
                    strokeWidth="1.8"
                  />
                  <circle
                    cx="8"
                    cy="12"
                    r="2"
                    fill="currentColor"
                    fillOpacity="0.15"
                    stroke="currentColor"
                    strokeWidth="1.8"
                  />
                  <circle
                    cx="16"
                    cy="12"
                    r="2"
                    fill="currentColor"
                    fillOpacity="0.15"
                    stroke="currentColor"
                    strokeWidth="1.8"
                  />
                </svg>
                <span>CS</span>
              </button>
              <button
                type="button"
                className={`role-btn ${role === "marketing" ? "active" : ""}`}
                onClick={() => setRole("marketing")}
                disabled={isLoading}
              >
                <svg viewBox="0 0 24 24" fill="none">
                  <rect
                    x="3"
                    y="15"
                    width="4"
                    height="6"
                    rx="1"
                    stroke="currentColor"
                    strokeWidth="1.8"
                  />
                  <rect
                    x="10"
                    y="9"
                    width="4"
                    height="12"
                    rx="1"
                    stroke="currentColor"
                    strokeWidth="1.8"
                  />
                  <rect
                    x="17"
                    y="5"
                    width="4"
                    height="16"
                    rx="1"
                    stroke="currentColor"
                    strokeWidth="1.8"
                  />
                </svg>
                <span>Marketing</span>
              </button>
            </div>

            <div className="input-group">
              <label className="input-label">Email</label>
              <div className="input-wrapper">
                <span className="input-icon">
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                    <polyline points="22,6 12,13 2,6" />
                  </svg>
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
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
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
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                      <line x1="1" y1="1" x2="23" y2="23" />
                    </svg>
                  ) : (
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
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
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                  >
                    <path
                      d="M5 12h14M12 5l7 7-7 7"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
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
                  setRole("cs");
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
