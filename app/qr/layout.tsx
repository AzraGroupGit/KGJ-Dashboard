// app/qr/layout.tsx

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Workshop Access",
  robots: "noindex, nofollow",
};

export default function QRLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-stone-50 font-sans antialiased">
      {/* Subtle texture overlay */}
      <div
        className="fixed inset-0 pointer-events-none opacity-[0.015]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23000000' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }}
      />

      {/* Main content */}
      <main className="relative z-10 flex min-h-screen flex-col items-center justify-center px-4 py-12">
        {children}
      </main>

      {/* Footer branding */}
      <footer className="relative z-10 pb-6 text-center">
        <p className="text-[11px] uppercase tracking-[0.2em] text-stone-300">
          Workshop Management System
        </p>
      </footer>
    </div>
  );
}
