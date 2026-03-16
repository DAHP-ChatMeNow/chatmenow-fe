"use client";

import { Sidebar } from "@/components/layout/sidebar";
import { FloatingNotificationButton } from "@/components/layout/floating-notification-button";
import { useAuthStore } from "@/store/use-auth-store";
import { useUserProfile } from "@/hooks/use-user";
import { useRouter, usePathname } from "next/navigation";
import { useEffect } from "react";

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const token = useAuthStore((state) => state.token);
  const router = useRouter();
  const pathname = usePathname();
  const hideFloatingNotification =
    pathname === "/notifications" || pathname.startsWith("/messages");

  // Auto-sync user profile từ server (chạy mỗi 30s và khi focus window)
  useUserProfile();

  useEffect(() => {
    // Client-side route protection fallback
    if (!token) {
      router.push("/login");
    }
  }, [token, router]);

  // Don't render protected content until auth check is complete
  if (!token) {
    return null;
  }

  return (
    <div className="flex h-screen w-full bg-gradient-to-br from-slate-50 via-white to-slate-50/50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950/50 overflow-hidden relative">
      {/* Floating Notification Button - Hide on notifications/messages pages */}
      {!hideFloatingNotification && <FloatingNotificationButton />}

      <aside className="hidden md:flex w-[90px] lg:w-[100px] shrink-0 border-r border-slate-200/60 dark:border-slate-700/50 flex-col items-center py-4 bg-white/80 backdrop-blur-xl dark:bg-slate-900/50 dark:backdrop-blur-xl z-50 shadow-lg dark:shadow-slate-950/50">
        <Sidebar mode="desktop" />
      </aside>

      <main className="flex-1 min-w-0 h-full min-h-0 flex flex-col relative">
        <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden bg-white dark:bg-slate-900/50">
          <div className="h-full min-h-0 w-full">{children}</div>
        </div>

        <nav className="md:hidden h-[65px] border-t border-slate-100 dark:border-slate-700/50 bg-white/80 dark:bg-slate-900/95 backdrop-blur-md px-6 flex items-center justify-around shrink-0 z-50">
          <Sidebar mode="mobile" />
        </nav>
      </main>
    </div>
  );
}
