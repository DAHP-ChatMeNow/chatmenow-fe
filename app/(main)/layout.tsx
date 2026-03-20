"use client";

import { Sidebar } from "@/components/layout/sidebar";
import { FloatingNotificationButton } from "@/components/layout/floating-notification-button";
import { useAuthStore } from "@/store/use-auth-store";
import { useUserProfile } from "@/hooks/use-user";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Search, Menu } from "lucide-react";
import { Archivo_Black } from "next/font/google";

const mobileBrandFont = Archivo_Black({
  weight: "400",
  subsets: ["latin"],
});

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const token = useAuthStore((state) => state.token);
  const router = useRouter();
  const pathname = usePathname();
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const hideFloatingNotification =
    pathname === "/notifications" ||
    pathname.startsWith("/messages") ||
    pathname.startsWith("/reels") ||
    pathname.startsWith("/games");

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
    <div className="relative flex w-full h-screen overflow-hidden bg-gradient-to-br from-slate-50 via-white to-slate-50/50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950/50">
      {/* Floating Notification Button - Hide on notifications/messages pages */}
      {!hideFloatingNotification && (
        <div className="hidden md:block">
          <FloatingNotificationButton />
        </div>
      )}

      <aside className="hidden md:flex w-[90px] lg:w-[100px] shrink-0 border-r border-slate-200/60 dark:border-slate-700/50 flex-col items-center py-4 bg-white/80 backdrop-blur-xl dark:bg-slate-900/50 dark:backdrop-blur-xl z-50 shadow-lg dark:shadow-slate-950/50">
        <Sidebar mode="desktop" />
      </aside>

      <main className="relative flex flex-col flex-1 h-full min-w-0 min-h-0">
        <nav className="md:hidden h-[104px] border-b border-slate-200/80 dark:border-slate-700/60 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md pt-[env(safe-area-inset-top)] shrink-0 z-50 shadow-sm">
          <div className="h-[52px] px-4 flex items-center justify-between">
            {isSearchOpen ? (
              <div className="flex items-center w-full gap-2">
                <div className="flex items-center flex-1 h-10 gap-2 px-4 rounded-full bg-slate-100 dark:bg-slate-800">
                  <Search className="w-4 h-4 text-slate-500" />
                  <input
                    autoFocus
                    type="text"
                    value={searchValue}
                    onChange={(e) => setSearchValue(e.target.value)}
                    placeholder="Tìm kiếm bạn bè, bài viết..."
                    className="w-full bg-transparent outline-none text-[14px] text-slate-800 dark:text-slate-100 placeholder:text-slate-500"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setIsSearchOpen(false);
                    setSearchValue("");
                  }}
                  className="text-sm font-semibold text-blue-600"
                >
                  Hủy
                </button>
              </div>
            ) : (
              <>
                <h1
                  className={`${mobileBrandFont.className} text-[34px] leading-none tracking-[-0.03em] text-blue-600`}
                >
                  Chatmenow
                </h1>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    aria-label="Search"
                    onClick={() => setIsSearchOpen(true)}
                    className="flex items-center justify-center w-10 h-10 rounded-full bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200"
                  >
                    <Search className="w-5 h-5" />
                  </button>
                  <button
                    type="button"
                    aria-label="Menu"
                    onClick={() => router.push("/settings")}
                    className="flex items-center justify-center w-10 h-10 rounded-full bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200"
                  >
                    <Menu className="w-5 h-5" />
                  </button>
                </div>
              </>
            )}
          </div>
          <div className="h-[52px] border-t border-slate-200/80 dark:border-slate-700/60 px-2">
            <Sidebar mode="mobile" />
          </div>
        </nav>

        <div className="flex-1 min-w-0 min-h-0 overflow-x-hidden overflow-y-auto bg-white dark:bg-slate-900/50">
          <div className="w-full min-w-0 h-full min-h-0 overflow-x-hidden">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
