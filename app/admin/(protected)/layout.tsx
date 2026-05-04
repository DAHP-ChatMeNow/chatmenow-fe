"use client";

import { useAuthStore } from "@/store/use-auth-store";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, useState, type ComponentType, type ReactNode } from "react";
import { Bot, LogOut, ShieldCheck, BarChart3, Crown, ChevronDown } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

type NavChild = {
  label: string;
  path: string;
  exactMatch?: boolean;
};

type NavItem = {
  icon: ComponentType<{ className?: string }>;
  label: string;
  path?: string;
  exactMatch?: boolean;
  children?: NavChild[];
};

const navItems: NavItem[] = [
  {
    icon: BarChart3,
    label: "Thống kê",
    children: [
      { label: "Tổng quan", path: "/admin/dashboard", exactMatch: true },
      { label: "Thống kê bài viết", path: "/admin/posts" },
      { label: "Thống kê khách hàng", path: "/admin/users" },
    ],
  },
  { icon: Crown, label: "Premium", path: "/admin/premium" },
  { icon: Bot, label: "AI Chat", path: "/admin/ai" },
];

export default function AdminProtectedLayout({
  children,
}: {
  children: ReactNode;
}) {
  const { user, role, logout } = useAuthStore();
  const router = useRouter();
  const pathname = usePathname();
  const [openMenus, setOpenMenus] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!user || role !== "admin") {
      router.replace("/admin/login");
    }
  }, [user, role, router]);

  const isPathActive = (path: string, exactMatch?: boolean) =>
    exactMatch ? pathname === path : pathname.startsWith(path);

  const handleLogout = () => {
    logout();
    router.push("/admin/login");
  };

  return (
    <div className="flex h-screen bg-white">
      {/* Sidebar */}
      <aside className="flex flex-col bg-white border-r w-60 dark:bg-slate-800 border-slate-200 dark:border-slate-700">
        {/* Logo */}
        <div className="flex items-center gap-2.5 px-5 py-5 border-b border-slate-200 dark:border-slate-700">
          <div className="flex items-center justify-center w-8 h-8 bg-blue-600 rounded-lg">
            <ShieldCheck className="w-5 h-5 text-white" />
          </div>
          <span className="text-base font-bold text-slate-900 dark:text-white">
            Quản Trị Viên
          </span>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {navItems.map(({ icon: Icon, label, path, exactMatch, children }) => {
            const parentActive = Boolean(path && isPathActive(path, exactMatch));
            const childActive = Boolean(
              children?.some((child) => isPathActive(child.path, child.exactMatch)),
            );
            const active = parentActive || childActive;
            const menuKey = path || label;
            const expanded = openMenus[menuKey] ?? childActive;

            if (children?.length) {
              return (
                <div key={menuKey}>
                  <button
                    type="button"
                    onClick={() =>
                      setOpenMenus((prev) => ({
                        ...prev,
                        [menuKey]: !(prev[menuKey] ?? childActive),
                      }))
                    }
                    className={cn(
                      "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors",
                      active
                        ? "bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400"
                        : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-white",
                    )}
                  >
                    <Icon className="w-4 h-4" />
                    {label}
                    <ChevronDown
                      className={cn(
                        "w-4 h-4 ml-auto transition-transform",
                        expanded ? "rotate-180" : "",
                      )}
                    />
                  </button>

                  {expanded ? (
                    <div className="mt-1 ml-4 space-y-1 border-l border-slate-200 pl-3 dark:border-slate-700">
                      {children.map((child) => {
                        const childIsActive = isPathActive(child.path, child.exactMatch);
                        return (
                          <Link
                            key={child.path}
                            href={child.path}
                            className={cn(
                              "block px-3 py-2 rounded-lg text-sm transition-colors",
                              childIsActive
                                ? "bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                                : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-white",
                            )}
                          >
                            {child.label}
                          </Link>
                        );
                      })}
                    </div>
                  ) : null}
                </div>
              );
            }

            return (
              <Link
                key={menuKey}
                href={path || "#"}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors",
                  active
                    ? "bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400"
                    : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-white",
                )}
              >
                <Icon className="w-4 h-4" />
                {label}
              </Link>
            );
          })}
        </nav>

        {/* User + logout */}
        <div className="px-3 py-4 space-y-1 border-t border-slate-200 dark:border-slate-700">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Đăng xuất
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-auto bg-white">{children}</main>
    </div>
  );
}
