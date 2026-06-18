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
  Gem,
} from "lucide-react";
import styles from "./login.module.css";

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
  {
    value: "management",
    label: "Management",
    colors: {
      border: "#c084fc",
      bg: "rgba(192,132,252,0.1)",
      text: "#9333ea",
    },
    icon: <Shield className="w-full h-full" />,
  },
];

// ════════════════════════════════════════════════════════════════════════════
// DEMO ACCOUNTS
// ════════════════════════════════════════════════════════════════════════════

interface DemoAccount {
  role: LoginRole;
  email: string;
  password: string;
  label: string;
  dotClass: string;
}

const DEMO_ACCOUNTS: DemoAccount[] = [
  {
    role: "superadmin",
    email: "admin@company.com",
    password: "password123",
    label: "Super Admin: admin@company.com / password123",
    dotClass: styles.demoDotSuperadmin,
  },
  {
    role: "customer_service",
    email: "cs.jogja@company.com",
    password: "password123",
    label: "CS: cs.jogja@company.com / password123",
    dotClass: styles.demoDotCs,
  },
  {
    role: "marketing",
    email: "marketing@company.com",
    password: "password123",
    label: "Marketing: marketing@company.com / password123",
    dotClass: styles.demoDotMarketing,
  },
  {
    role: "management",
    email: "leader_marketing@company.com",
    password: "password123",
    label: "Management: leader_marketing@company.com / password123",
    dotClass: styles.demoDotManagement,
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

  const handleDemoClick = (account: DemoAccount) => {
    setRole(account.role);
    setEmail(account.email);
    setPassword(account.password);
  };

  return (
    <div className={styles.loginRoot}>
      {/* Background effects */}
      <div className={styles.facetedGrid} />
      <div className={`${styles.orb} ${styles.orbGold}`} />
      <div className={`${styles.orb} ${styles.orbBlue}`} />
      <div className={`${styles.orb} ${styles.orbWarm}`} />

      {/* Decorative SVG — jewellery ring motifs */}
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
        {/* Concentric ring motif — top-left */}
        <circle
          cx="180"
          cy="200"
          r="100"
          fill="none"
          stroke="rgba(212,168,67,0.08)"
          strokeWidth="0.8"
        />
        <circle
          cx="180"
          cy="200"
          r="130"
          fill="none"
          stroke="rgba(212,168,67,0.05)"
          strokeWidth="0.6"
        />
        <circle
          cx="180"
          cy="200"
          r="160"
          fill="none"
          stroke="rgba(212,168,67,0.03)"
          strokeWidth="0.4"
        />

        {/* Faceted diamond shape */}
        <polygon
          points="1050,180 1100,120 1150,180 1100,240"
          fill="none"
          stroke="rgba(79,142,247,0.07)"
          strokeWidth="1"
        />
        <polygon
          points="1000,180 1100,60 1200,180 1100,300"
          fill="none"
          stroke="rgba(79,142,247,0.04)"
          strokeWidth="0.6"
        />

        {/* Ring arc — bottom-right */}
        <path
          d="M 780 600 A 200 200 0 0 1 1180 600"
          fill="none"
          stroke="rgba(212,168,67,0.06)"
          strokeWidth="1.2"
          strokeLinecap="round"
        />
        <path
          d="M 800 600 A 180 180 0 0 1 1160 600"
          fill="none"
          stroke="rgba(212,168,67,0.04)"
          strokeWidth="0.8"
          strokeLinecap="round"
        />

        {/* Vertical gold accent line */}
        <line
          x1="600"
          y1="0"
          x2="600"
          y2="800"
          stroke="rgba(212,168,67,0.04)"
          strokeWidth="0.5"
        />

        {/* Jewel facet — bottom-left */}
        <polygon
          points="80,560 200,380 320,560 200,740"
          fill="none"
          stroke="rgba(240,201,107,0.05)"
          strokeWidth="1"
        />
      </svg>

      {/* Login card */}
      <div className={styles.card}>
        <Link href="/" className={styles.backLink}>
          <ArrowLeft className="w-3.5 h-3.5" />
          Kembali ke Beranda
        </Link>

        <h1 className={styles.welcomeTitle}>Selamat Datang</h1>
        <p className={styles.welcomeSub}>Login untuk mengakses dashboard</p>

        {error && (
          <div className={styles.alertError}>
            <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
            {error}
          </div>
        )}

        <form onSubmit={handleLogin}>
          <div className={styles.roleLabel}>Pilih Role</div>
          <div className={styles.roleGrid}>
            {ROLE_CONFIGS.map((config) => (
              <button
                key={config.value}
                type="button"
                className={`${styles.roleGroup} ${role === config.value ? styles.roleGroupActive : ""} ${isLoading ? styles.roleGroupDisabled : ""}`}
                style={
                  role === config.value
                    ? {
                        ["--role-border" as string]: config.colors.border,
                        ["--role-bg" as string]: config.colors.bg,
                        ["--role-text" as string]: config.colors.text,
                      }
                    : undefined
                }
                onClick={() => setRole(config.value)}
                disabled={isLoading}
              >
                <div className={styles.roleBtnIcon}>{config.icon}</div>
                <span className={styles.roleBtnLabel}>{config.label}</span>
              </button>
            ))}
          </div>

          <div className={styles.inputGroup}>
            <label className={styles.inputLabel}>Email</label>
            <div className={styles.inputWrapper}>
              <span className={styles.inputIcon}>
                <Mail className="w-3.5 h-3.5" />
              </span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={styles.inputField}
                placeholder="nama@email.com"
                required
                disabled={isLoading}
              />
            </div>
          </div>

          <div className={styles.inputGroup}>
            <label className={styles.inputLabel}>Password</label>
            <div className={styles.inputWrapper}>
              <span className={styles.inputIcon}>
                <Lock className="w-3.5 h-3.5" />
              </span>
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={styles.inputField}
                placeholder="••••••••"
                required
                disabled={isLoading}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className={styles.passwordToggle}
                disabled={isLoading}
              >
                {showPassword ? (
                  <EyeOff className="w-3.5 h-3.5" />
                ) : (
                  <Eye className="w-3.5 h-3.5" />
                )}
              </button>
            </div>
            <div className={styles.forgotLink}>
              <Link href="/forgot-password">Lupa password?</Link>
            </div>
          </div>

          <button
            type="submit"
            className={styles.loginBtn}
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <span className={styles.spinner}></span>
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

        <div className={styles.demoSection}>
          <div className={styles.demoTitle}>Akun Demo</div>
          <div className={styles.demoAccounts}>
            {DEMO_ACCOUNTS.map((account) => (
              <div
                key={account.email}
                className={styles.demoAccount}
                onClick={() => handleDemoClick(account)}
              >
                <span
                  className={`${styles.demoDot} ${account.dotClass}`}
                ></span>
                <span>{account.label}</span>
              </div>
            ))}
          </div>
        </div>

        {isLoading && (
          <div className={styles.loadingOverlay}>
            <Loading variant="dots" size="lg" text="Memverifikasi akun..." />
          </div>
        )}
      </div>
    </div>
  );
}
