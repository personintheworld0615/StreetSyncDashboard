"use client";

import { useState } from "react";
import { KeyRound, ShieldAlert, ShieldCheck, User } from "lucide-react";

type Props = {
  onLoginSuccess: () => void;
};

export function LoginPage({ onLoginSuccess }: Props) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const body = (await res.json().catch(() => ({}))) as {
        success?: boolean;
        error?: string;
      };

      if (!res.ok || !body.success) {
        throw new Error(body.error || "Invalid username or password.");
      }

      onLoginSuccess();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Authentication failed. Verify DPW credentials."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-dvh w-full items-center justify-center bg-[#F7F8FA] px-4 py-8">
      <div className="w-full max-w-md space-y-6">
        {/* Header Branding */}
        <div className="text-center">
          <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-[#111827] text-white shadow-md">
            <ShieldCheck className="size-8" />
          </div>
          <h1 className="mt-4 font-display text-[26px] font-bold tracking-tight text-[#111827]">
            StreetSync Operations
          </h1>
          <p className="mt-1 text-sm text-[#757575]">
            Plainsboro Township · Department of Public Works
          </p>
        </div>

        {/* Login Form Card */}
        <div className="rounded-3xl border border-[#E5E7EB] bg-white p-6 shadow-sm sm:p-8">
          <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
            <div>
              <label
                htmlFor="username"
                className="block text-[12px] font-semibold text-[#374151]"
              >
                DPW Operator Username
              </label>
              <div className="relative mt-1.5">
                <User className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-[#9CA3AF]" />
                <input
                  id="username"
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Username"
                  autoComplete="username"
                  className="h-11 w-full rounded-2xl border border-[#E5E7EB] bg-[#F7F8FA] pr-4 pl-9 text-sm text-[#111827] outline-none transition-colors placeholder:text-[#9CA3AF] focus:border-[#111827] focus:bg-white"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-[12px] font-semibold text-[#374151]"
              >
                Password
              </label>
              <div className="relative mt-1.5">
                <KeyRound className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-[#9CA3AF]" />
                <input
                  id="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Password"
                  autoComplete="current-password"
                  className="h-11 w-full rounded-2xl border border-[#E5E7EB] bg-[#F7F8FA] pr-4 pl-9 text-sm text-[#111827] outline-none transition-colors placeholder:text-[#9CA3AF] focus:border-[#111827] focus:bg-white"
                />
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 rounded-2xl border border-[#FCA5A5] bg-[#FEF2F2] p-3 text-[12px] text-[#DC2626]">
                <ShieldAlert className="size-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="mt-2 h-11 w-full rounded-full bg-[#111827] text-sm font-semibold text-white transition-colors hover:bg-[#1f2937] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#111827] focus-visible:ring-offset-2 disabled:opacity-50"
            >
              {loading ? "Authenticating DPW Access…" : "Sign In to Ops Console"}
            </button>
          </form>
        </div>

        <p className="text-center text-[12px] text-[#9CA3AF]">
          StreetSync Municipal Operations Portal · Plainsboro Township, NJ 08536
        </p>
      </div>
    </div>
  );
}
