// app/page.tsx

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getDashboardPath } from "@/lib/routes";

export default function Home() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const userRole = localStorage.getItem("userRole");
    const userEmail = localStorage.getItem("userEmail");

    if (userRole && userEmail) {
      const path = getDashboardPath(userRole);
      // Only redirect to actual dashboards — workshop roles map to /workshop/login
      // which is not relevant from the BMS landing page.
      if (path && path.startsWith("/dashboard")) {
        router.replace(path);
        return;
      }
    }
    setIsLoading(false);
  }, [router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0f1623]">
        <div className="text-center">
          <div className="w-12 h-12 border-2 border-[#1a2d4a] border-t-[#4f8ef7] rounded-full animate-spin mx-auto mb-4" />
          <p className="text-sm text-[rgba(200,210,240,0.45)] font-light tracking-wide">
            Memuat dashboard...
          </p>
        </div>
      </div>
    );
  }

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

        .page-root {
          font-family: 'DM Sans', sans-serif;
          background: #0f1623;
          color: #f0f4ff;
          width: 100vw;
          height: 100vh;
          overflow: hidden;
          position: relative;
          display: grid;
          grid-template-columns: 1fr 1fr;
        }

        .grid-lines {
          position: absolute; inset: 0; pointer-events: none; z-index: 0;
          background-image:
            linear-gradient(rgba(79,142,247,0.04) 1px, transparent 1px),
            linear-gradient(90deg, rgba(79,142,247,0.04) 1px, transparent 1px);
          background-size: 60px 60px;
        }

        .orb {
          position: absolute; border-radius: 50%; filter: blur(80px);
          pointer-events: none; animation: orbFloat 8s ease-in-out infinite;
        }
        .orb-1 { width: 400px; height: 400px; background: rgba(79,142,247,0.12); top: -100px; right: -80px; animation-delay: 0s; }
        .orb-2 { width: 300px; height: 300px; background: rgba(240,201,107,0.07); bottom: -60px; left: 30%; animation-delay: 3s; }
        .orb-3 { width: 200px; height: 200px; background: rgba(79,142,247,0.08); top: 40%; left: 8%; animation-delay: 5s; }

        @keyframes orbFloat {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-24px); }
        }

        .panel-divider {
          position: absolute; top: 8%; bottom: 8%; left: 50%; width: 0.5px;
          background: linear-gradient(to bottom, transparent, rgba(255,255,255,0.07) 30%, rgba(255,255,255,0.07) 70%, transparent);
          z-index: 3;
        }

        /* LEFT PANEL */
        .left-panel {
          display: flex; flex-direction: column; justify-content: center;
          padding: 48px 52px; position: relative; z-index: 2;
        }

        .brand-chip {
          display: inline-flex; align-items: center; gap: 8px;
          background: rgba(79,142,247,0.1); border: 0.5px solid rgba(79,142,247,0.25);
          border-radius: 100px; padding: 5px 14px 5px 8px;
          margin-bottom: 28px; width: fit-content;
          animation: fadeUp 0.5s ease both;
        }
        .brand-chip-dot {
          width: 7px; height: 7px; border-radius: 50%; background: #4f8ef7;
          box-shadow: 0 0 8px rgba(79,142,247,0.8);
          animation: pulse 2s ease-in-out infinite;
        }
        .brand-chip span { font-size: 12px; font-weight: 500; color: #4f8ef7; letter-spacing: 0.04em; }

        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }

        .headline {
          font-family: 'DM Serif Display', serif;
          font-size: clamp(32px, 3.5vw, 46px);
          line-height: 1.1; letter-spacing: -0.02em;
          color: #f0f4ff; margin-bottom: 16px;
          animation: fadeUp 0.5s 0.1s ease both;
        }
        .headline em { font-style: italic; color: #f0c96b; }

        .sub {
          font-size: 15px; font-weight: 300;
          color: rgba(200,210,240,0.55); line-height: 1.65;
          max-width: 380px; margin-bottom: 36px;
          animation: fadeUp 0.5s 0.2s ease both;
        }

        .cta-group {
          display: flex; align-items: center; gap: 14px;
          animation: fadeUp 0.5s 0.3s ease both;
        }

        .btn-primary {
          display: inline-flex; align-items: center; gap: 8px;
          background: #4f8ef7; color: white;
          padding: 12px 24px; border-radius: 10px;
          font-family: 'DM Sans', sans-serif; font-size: 14px; font-weight: 500;
          border: none; cursor: pointer; transition: all 0.2s ease;
          text-decoration: none; letter-spacing: 0.01em;
        }
        .btn-primary:hover {
          background: #5a9af8; transform: translateY(-1px);
          box-shadow: 0 8px 24px rgba(79,142,247,0.3);
        }
        .btn-primary:active { transform: scale(0.98); }

        .btn-ghost {
          display: inline-flex; align-items: center; gap: 6px;
          color: rgba(200,210,240,0.55);
          font-family: 'DM Sans', sans-serif; font-size: 14px; font-weight: 400;
          background: none; border: 0.5px solid rgba(255,255,255,0.07);
          border-radius: 10px; padding: 12px 20px;
          cursor: pointer; transition: all 0.2s ease; text-decoration: none;
        }
        .btn-ghost:hover {
          color: #f0f4ff; border-color: rgba(255,255,255,0.15);
          background: rgba(255,255,255,0.035);
        }

        .stats-row {
          display: flex; gap: 28px; margin-top: 44px;
          animation: fadeUp 0.5s 0.4s ease both;
        }
        .stat-num {
          font-family: 'DM Serif Display', serif; font-size: 26px;
          color: #f0f4ff; letter-spacing: -0.02em;
        }
        .stat-label { font-size: 12px; color: rgba(200,210,240,0.38); font-weight: 400; margin-top: 2px; letter-spacing: 0.02em; }
        .stat-div { width: 0.5px; background: rgba(255,255,255,0.07); align-self: stretch; }

        /* RIGHT PANEL */
        .right-panel {
          display: flex; flex-direction: column; justify-content: center;
          padding: 48px 48px 48px 40px; position: relative; z-index: 2; gap: 12px;
        }

        .panel-label {
          font-size: 11px; font-weight: 500; letter-spacing: 0.1em; text-transform: uppercase;
          color: rgba(200,210,240,0.38); margin-bottom: 4px;
          animation: fadeRight 0.5s 0.05s ease both;
        }

        .role-card {
          background: rgba(255,255,255,0.035);
          border: 0.5px solid rgba(255,255,255,0.07);
          border-radius: 14px; padding: 18px 22px;
          display: flex; align-items: flex-start; gap: 16px;
          cursor: pointer; transition: all 0.25s ease; text-decoration: none;
        }
        .role-card:nth-child(2) { animation: fadeRight 0.5s 0.15s ease both; }
        .role-card:nth-child(3) { animation: fadeRight 0.5s 0.25s ease both; }
        .role-card:nth-child(4) { animation: fadeRight 0.5s 0.35s ease both; }
        .role-card:hover {
          background: rgba(255,255,255,0.065);
          border-color: rgba(79,142,247,0.3);
          transform: translateX(-4px);
        }

        .role-icon {
          width: 40px; height: 40px; border-radius: 10px;
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0;
        }
        .icon-admin { background: rgba(240,201,107,0.12); border: 0.5px solid rgba(240,201,107,0.2); }
        .icon-cs    { background: rgba(79,142,247,0.12);  border: 0.5px solid rgba(79,142,247,0.2); }
        .icon-mkt   { background: rgba(130,200,130,0.10); border: 0.5px solid rgba(130,200,130,0.2); }

        .role-icon svg {
          width: 20px;
          height: 20px;
          stroke-width: 1.8;
        }
        .icon-admin svg { stroke: #f0c96b; }
        .icon-cs svg { stroke: #4f8ef7; }
        .icon-mkt svg { stroke: #82c882; }

        .role-content { flex: 1; }
        .role-title { font-size: 14px; font-weight: 500; color: #f0f4ff; margin-bottom: 3px; }
        .role-desc { font-size: 12.5px; color: rgba(200,210,240,0.55); line-height: 1.5; font-weight: 300; }
        .role-features { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 10px; }
        .feat-tag {
          font-size: 11px; padding: 3px 10px; border-radius: 100px;
          background: rgba(255,255,255,0.05); border: 0.5px solid rgba(255,255,255,0.08);
          color: rgba(200,210,240,0.55); font-weight: 400;
        }
        .role-arrow {
          color: rgba(200,210,240,0.3); font-size: 18px;
          flex-shrink: 0; align-self: center; transition: all 0.2s;
        }
        .role-card:hover .role-arrow { transform: translateX(4px); color: #4f8ef7; }

        /* BOTTOM BAR */
        .bottom-bar {
          position: absolute; bottom: 0; left: 0; right: 0; z-index: 4;
          border-top: 0.5px solid rgba(255,255,255,0.06);
          display: flex; align-items: center; justify-content: space-between;
          padding: 12px 52px;
          background: rgba(15,22,35,0.6); backdrop-filter: blur(10px);
        }
        .bottom-info { font-size: 12px; color: rgba(200,210,240,0.3); }
        .status-wrap { display: flex; align-items: center; gap: 8px; }
        .status-dots { display: flex; align-items: center; gap: 5px; }
        .sdot { width: 6px; height: 6px; border-radius: 50%; }
        .sdot-1 { background: #4ade80; box-shadow: 0 0 6px rgba(74,222,128,0.6); animation: pulse 2s ease-in-out infinite; }
        .sdot-2 { background: rgba(74,222,128,0.4); }
        .sdot-3 { background: rgba(74,222,128,0.15); }
        .status-label { font-size: 12px; color: rgba(74,222,128,0.7); }

        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(16px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeRight {
          from { opacity: 0; transform: translateX(20px); }
          to { opacity: 1; transform: translateX(0); }
        }
      `}</style>

      <div className="page-root">
        {/* Background effects */}
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
            cx="900"
            cy="120"
            r="180"
            fill="none"
            stroke="rgba(79,142,247,0.06)"
            strokeWidth="1"
          />
          <circle
            cx="900"
            cy="120"
            r="280"
            fill="none"
            stroke="rgba(79,142,247,0.04)"
            strokeWidth="1"
          />
          <circle
            cx="900"
            cy="120"
            r="380"
            fill="none"
            stroke="rgba(79,142,247,0.025)"
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

        <div className="panel-divider" />

        {/* ───── LEFT PANEL ───── */}
        <div className="left-panel">
          <div className="brand-chip">
            <div className="brand-chip-dot" />
            <span>Sistem Aktif · 6 Cabang</span>
          </div>

          <h1 className="headline">
            Operational
            <br />
            <em>Intelligence</em>
            <br />
            Dashboard
          </h1>

          <p className="sub">
            Platform terpadu untuk tim CS, Marketing, dan Leadership — data
            real-time, satu tampilan, keputusan lebih cepat.
          </p>

          <div className="cta-group">
            <Link href="/login" className="btn-primary">
              <svg
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
                <polyline points="10 17 15 12 10 7" />
                <line x1="15" y1="12" x2="3" y2="12" />
              </svg>
              Masuk ke Dashboard
            </Link>
            <Link href="/login" className="btn-ghost">
              Login akun lama ↗
            </Link>
          </div>

          <div className="stats-row">
            <div>
              <div className="stat-num">6</div>
              <div className="stat-label">Cabang</div>
            </div>
            <div className="stat-div" />
            <div>
              <div className="stat-num">3</div>
              <div className="stat-label">Role Pengguna</div>
            </div>
            <div className="stat-div" />
            <div>
              <div className="stat-num">12+</div>
              <div className="stat-label">Metrik Utama</div>
            </div>
            <div className="stat-div" />
            <div>
              <div
                className="stat-num"
                style={{ fontSize: 18, lineHeight: "1.5" }}
              >
                Live
              </div>
              <div className="stat-label">Update Data</div>
            </div>
          </div>
        </div>

        {/* ───── RIGHT PANEL ───── */}
        <div className="right-panel">
          <div className="panel-label">Pilih role Anda</div>

          <Link href="/login?role=admin" className="role-card">
            <div className="role-icon icon-admin">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M12 15L12 18"
                  stroke="currentColor"
                  strokeLinecap="round"
                />
                <path
                  d="M8 11L8 14"
                  stroke="currentColor"
                  strokeLinecap="round"
                />
                <path
                  d="M16 11L16 14"
                  stroke="currentColor"
                  strokeLinecap="round"
                />
                <path
                  d="M4 20L7 20"
                  stroke="currentColor"
                  strokeLinecap="round"
                />
                <path
                  d="M17 20L20 20"
                  stroke="currentColor"
                  strokeLinecap="round"
                />
                <rect
                  x="3"
                  y="8"
                  width="18"
                  height="12"
                  rx="2"
                  stroke="currentColor"
                />
                <path
                  d="M7 5L7 8"
                  stroke="currentColor"
                  strokeLinecap="round"
                />
                <path
                  d="M12 3L12 8"
                  stroke="currentColor"
                  strokeLinecap="round"
                />
                <path
                  d="M17 5L17 8"
                  stroke="currentColor"
                  strokeLinecap="round"
                />
                <circle cx="7" cy="5" r="1.5" stroke="currentColor" />
                <circle cx="12" cy="3" r="1.5" stroke="currentColor" />
                <circle cx="17" cy="5" r="1.5" stroke="currentColor" />
              </svg>
            </div>
            <div className="role-content">
              <div className="role-title">Super Admin</div>
              <div className="role-desc">
                Akses penuh ke seluruh data, laporan lintas cabang, dan
                manajemen akun pengguna.
              </div>
              <div className="role-features">
                <span className="feat-tag">Dashboard komprehensif</span>
                <span className="feat-tag">Manajemen user</span>
                <span className="feat-tag">Laporan real-time</span>
              </div>
            </div>
            <div className="role-arrow">→</div>
          </Link>

          <Link href="/login?role=cs" className="role-card">
            <div className="role-icon icon-cs">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M3 10C3 7.79086 4.79086 6 7 6H17C19.2091 6 21 7.79086 21 10V14C21 16.2091 19.2091 18 17 18H7C4.79086 18 3 16.2091 3 14V10Z"
                  stroke="currentColor"
                />
                <circle
                  cx="8"
                  cy="12"
                  r="2"
                  fill="currentColor"
                  fillOpacity="0.2"
                  stroke="currentColor"
                />
                <circle
                  cx="16"
                  cy="12"
                  r="2"
                  fill="currentColor"
                  fillOpacity="0.2"
                  stroke="currentColor"
                />
                <path
                  d="M8 12L10 13.5L8 15"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M16 12L14 13.5L16 15"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <div className="role-content">
              <div className="role-title">Customer Service</div>
              <div className="role-desc">
                Kelola data lead dan closing per cabang dengan antarmuka yang
                intuitif dan cepat.
              </div>
              <div className="role-features">
                <span className="feat-tag">Input per cabang</span>
                <span className="feat-tag">Tracking performa</span>
                <span className="feat-tag">Update instan</span>
              </div>
            </div>
            <div className="role-arrow">→</div>
          </Link>

          <Link href="/login?role=marketing" className="role-card">
            <div className="role-icon icon-mkt">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <rect
                  x="3"
                  y="15"
                  width="4"
                  height="6"
                  rx="1"
                  stroke="currentColor"
                />
                <rect
                  x="10"
                  y="9"
                  width="4"
                  height="12"
                  rx="1"
                  stroke="currentColor"
                />
                <rect
                  x="17"
                  y="5"
                  width="4"
                  height="16"
                  rx="1"
                  stroke="currentColor"
                />
                <path
                  d="M3 15L10 9"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeDasharray="2 2"
                />
                <path
                  d="M14 9L17 5"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeDasharray="2 2"
                />
              </svg>
            </div>
            <div className="role-content">
              <div className="role-title">Marketing</div>
              <div className="role-desc">
                Analisis channel, kalkulasi ROI, dan optimalkan strategi
                berdasarkan data aktual.
              </div>
              <div className="role-features">
                <span className="feat-tag">Analisis channel</span>
                <span className="feat-tag">Kalkulasi ROI</span>
                <span className="feat-tag">Optimasi budget</span>
              </div>
            </div>
            <div className="role-arrow">→</div>
          </Link>
        </div>

        {/* ───── BOTTOM BAR ───── */}
        <div className="bottom-bar">
          <div className="bottom-info">
            © 2025 Operational Dashboard · Trial Version
          </div>
          <div className="status-wrap">
            <div className="status-dots">
              <div className="sdot sdot-1" />
              <div className="sdot sdot-2" />
              <div className="sdot sdot-3" />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
