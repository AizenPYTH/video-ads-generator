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
  return (
    <div className="flex min-h-screen w-full bg-gradient-to-br from-background via-background to-glacier-100/25">
      <div className="hidden md:flex md:shrink-0">
        <Sidebar className="fixed inset-y-0 left-0 z-30" />
      </div>

      <div className="min-w-0 flex flex-1 flex-col md:pl-60">
        <Header user={user} />
        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto w-full max-w-7xl px-4 py-5 sm:px-6 sm:py-6 lg:px-8 lg:py-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
