"use client";

import { useEffect, useState } from "react";
import { LoginPage } from "@/components/auth/login-page";
import { DashboardApp } from "@/components/dashboard/dashboard-app";

export default function Home() {
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);

  async function checkSession() {
    try {
      const res = await fetch("/api/auth/session", { cache: "no-store" });
      const body = (await res.json().catch(() => ({}))) as {
        authenticated?: boolean;
      };
      setAuthenticated(Boolean(body.authenticated));
    } catch {
      setAuthenticated(false);
    }
  }

  useEffect(() => {
    void checkSession();
  }, []);

  async function handleLogout() {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {
      // Ignore
    }
    setAuthenticated(false);
  }

  if (authenticated === null) {
    return (
      <div className="flex h-dvh w-full items-center justify-center bg-[#F7F8FA] text-sm font-medium text-[#757575]">
        Verifying Plainsboro DPW Authorization…
      </div>
    );
  }

  if (!authenticated) {
    return <LoginPage onLoginSuccess={() => setAuthenticated(true)} />;
  }

  return <DashboardApp onLogout={() => void handleLogout()} />;
}
