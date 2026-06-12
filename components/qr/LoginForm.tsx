// components/qr/LoginForm.tsx

"use client";

import { useState, FormEvent, useRef, useEffect } from "react";
import { User, Lock, Eye, EyeOff, AlertTriangle, Loader2 } from "lucide-react";

interface LoginFormProps {
  onSubmit: (username: string, password: string) => void;
  isLoading: boolean;
  error: string | null;
}

export default function LoginForm({
  onSubmit,
  isLoading,
  error,
}: LoginFormProps) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const usernameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    usernameRef.current?.focus();
  }, []);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (username.trim() && password.trim()) {
      onSubmit(username.trim(), password);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Username field */}
      <div>
        <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-wider text-stone-400">
          Nama Pengguna
        </label>
        <div className="relative">
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-300">
            <User className="h-4 w-4" />
          </span>
          <input
            ref={usernameRef}
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="username atau email"
            disabled={isLoading}
            className="w-full rounded-xl border border-stone-200 bg-stone-50/50 py-2.5 pl-10 pr-4 text-[15px] text-stone-700 placeholder:text-stone-300 focus:border-amber-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-100 transition-all disabled:opacity-50"
            autoComplete="username"
            autoCapitalize="none"
            autoCorrect="off"
            required
          />
        </div>
      </div>

      {/* Password field */}
      <div>
        <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-wider text-stone-400">
          Kata Sandi
        </label>
        <div className="relative">
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-300">
            <Lock className="h-4 w-4" />
          </span>
          <input
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            disabled={isLoading}
            className="w-full rounded-xl border border-stone-200 bg-stone-50/50 py-2.5 pl-10 pr-12 text-[15px] text-stone-700 placeholder:text-stone-300 focus:border-amber-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-100 transition-all disabled:opacity-50"
            autoComplete="current-password"
            required
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-stone-300 hover:text-stone-500 transition-colors"
            tabIndex={-1}
          >
            {showPassword ? (
              <EyeOff className="h-4 w-4" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
          </button>
        </div>
      </div>

      {/* Error message */}
      {error && (
        <div className="rounded-lg bg-red-50 px-4 py-2.5 text-[13px] text-red-600 border border-red-100">
          <div className="flex items-start gap-2">
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        </div>
      )}

      {/* Submit button */}
      <button
        type="submit"
        disabled={isLoading || !username.trim() || !password.trim()}
        className="mt-2 w-full rounded-xl bg-stone-800 py-2.5 text-[14px] font-medium text-white shadow-sm transition-all hover:bg-stone-900 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
      >
        {isLoading ? (
          <span className="flex items-center justify-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            Memverifikasi...
          </span>
        ) : (
          "Masuk ke Workshop"
        )}
      </button>
    </form>
  );
}
