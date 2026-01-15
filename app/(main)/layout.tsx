"use client";

import { Sidebar } from "@/components/layout/sidebar";
import { useAuthStore } from "@/store/use-auth-store";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function MainLayout({ children }: { children: React.ReactNode }) {
  const token = useAuthStore((state) => state.token);
  const router = useRouter();

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
    <div className="flex h-screen w-full bg-gradient-to-br from-slate-50 via-white to-slate-50/50 dark:bg-slate-900 overflow-hidden relative">
      
      <aside className="hidden md:flex w-[70px] lg:w-[80px] shrink-0 border-r border-slate-200/60 dark:border-slate-800 flex-col items-center py-4 bg-white/80 backdrop-blur-xl dark:bg-slate-950 z-50 shadow-lg">
        <Sidebar mode="desktop" />
      </aside>

      
      <main className="flex-1 min-w-0 h-full flex flex-col relative">
        
        
        

        
        <div className="flex-1 overflow-y-auto overflow-x-hidden bg-white dark:bg-slate-900">
          
          <div className="h-full w-full">
            {children}
          </div>
        </div>

        
        <nav className="md:hidden h-[65px] border-t border-slate-100 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md px-6 flex items-center justify-around shrink-0 z-50">
          <Sidebar mode="mobile" />
        </nav>
      </main>
    </div>
  );
}