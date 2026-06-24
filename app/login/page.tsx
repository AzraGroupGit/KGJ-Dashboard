// app/login/page.tsx

"use client";

import { useState, useEffect, startTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
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

  return (
    <div className={styles.loginRoot}>
      <div className={styles.splitLayout}>
        {/* ──────────── LEFT PANEL (30%) — Branding ──────────── */}
        <div className={styles.leftPanel}>
          <div className={`${styles.panelBg} ${styles.facetedGrid}`} />
          <div className={`${styles.panelBg} ${styles.orb} ${styles.orbGold}`} />
          <div className={`${styles.panelBg} ${styles.orb} ${styles.orbAccent}`} />
          <div className={`${styles.panelBg} ${styles.orb} ${styles.orbWarm}`} />

          <div className={styles.monogramRing}>
            <Image
              src="/logo.png"
              alt="KGJ"
              width={84}
              height={84}
              className={styles.monogramLogo}
              priority
            />
          </div>

          <div className={styles.horizontalSep}>
            <div className={styles.horizontalSepLine} />
            <div className={styles.horizontalSepDiamond}>
              <div className={styles.horizontalSepGlow} />
            </div>
            <div className={styles.horizontalSepLine} />
          </div>

          <h1 className={styles.companyTitle}>
            Kotagede
            <br />
            Jewellery
          </h1>
        </div>

        {/* ──────────── Separator ──────────── */}
        <div className={styles.separator} />
        <div className={styles.separatorAccent}>
          <div className={styles.separatorAccentInner} />
        </div>

        {/* ──────────── RIGHT PANEL (70%) — Login Card ──────────── */}
        <div className={styles.rightPanel}>
          <div className={`${styles.panelBg} ${styles.facetedGrid}`} />
          <div className={`${styles.panelBg} ${styles.orb} ${styles.orbGold}`} />
          <div className={`${styles.panelBg} ${styles.orb} ${styles.orbAccent}`} />
          <div className={`${styles.panelBg} ${styles.orb} ${styles.orbWarm}`} />

          <div className={styles.card}>
            <Link href="/" className={styles.backLink}>
              <ArrowLeft className="w-3.5 h-3.5" />
              Kembali ke Beranda
            </Link>

            <h2 className={styles.welcomeTitle}>Selamat Datang</h2>
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

              <button type="submit" className={styles.loginBtn} disabled={isLoading}>
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

            {isLoading && (
              <div className={styles.loadingOverlay}>
                <Loading variant="dots" size="lg" text="Memverifikasi akun..." />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
