"use client";

import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";

interface DashboardShellProps {
  children: React.ReactNode;
  user?: {
    email?: string;
    fullName?: string;
  };
}

export function DashboardShell({ children, user }: DashboardShellProps) {
  const userLabel = user?.fullName || user?.email;

  return (
    <div className="flex min-h-screen w-full bg-[linear-gradient(165deg,var(--ss-surface-muted)_0%,var(--ss-glacier-50)_48%,var(--ss-surface-muted)_100%)]">
      <div className="hidden md:flex md:shrink-0">
        <Sidebar
          className="fixed inset-y-0 left-0 z-30 shadow-[4px_0_24px_rgb(10_26_46/0.12)]"
          userLabel={userLabel}
        />
      </div>

      <div className="flex min-w-0 flex-1 flex-col md:pl-60">
        <Header user={user} />
        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
