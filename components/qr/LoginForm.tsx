// components/qr/LoginForm.tsx

"use client";

import { useState, FormEvent, useRef, useEffect } from "react";

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
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.5}
              className="h-4 w-4"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0"
              />
            </svg>
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
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.5}
              className="h-4 w-4"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z"
              />
            </svg>
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
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.5}
                className="h-4 w-4"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88"
                />
              </svg>
            ) : (
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.5}
                className="h-4 w-4"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Error message */}
      {error && (
        <div className="rounded-lg bg-red-50 px-4 py-2.5 text-[13px] text-red-600 border border-red-100">
          <div className="flex items-start gap-2">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              className="mt-0.5 h-3.5 w-3.5 flex-shrink-0"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
              />
            </svg>
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
            <svg
              className="h-4 w-4 animate-spin"
              viewBox="0 0 24 24"
              fill="none"
            >
              <circle
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="3"
                className="opacity-25"
              />
              <path
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                fill="currentColor"
                className="opacity-75"
              />
            </svg>
            Memverifikasi...
          </span>
        ) : (
          "Masuk ke Workshop"
        )}
      </button>
    </form>
  );
}
