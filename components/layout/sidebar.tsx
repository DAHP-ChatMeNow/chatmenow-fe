"use client";
import { MessageSquare, Users, Newspaper, User, Settings } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export function Sidebar({ mode = "desktop" }: { mode?: "desktop" | "mobile" }) {
  const pathname = usePathname();

  const isActive = (path: string) => pathname.startsWith(path);

  const navItems = [
    { icon: MessageSquare, path: "/messages", label: "Nhắn tin" },
    { icon: Newspaper, path: "/blog", label: "Bài viết" },
    { icon: Users, path: "/contacts", label: "Bạn bè" },
    { icon: User, path: "/profile", label: "Cá nhân" },
    { icon: Settings, path: "/settings", label: "Cài đặt" },
  ];

  const containerClasses =
    mode === "desktop"
      ? "flex flex-col gap-8 items-center"
      : "flex flex-row justify-around items-center w-full";

  return (
    <div className={containerClasses}>
      {navItems.map((item) => (
        <Link key={item.path} href={item.path}>
          <div
            className={`flex flex-col items-center justify-center ${
              mode === "desktop"
                ? "gap-1 p-2.5 w-[70px] h-[70px]"
                : "gap-0.5 p-2 min-w-[60px]"
            } rounded-2xl transition-all duration-200 relative ${
              isActive(item.path)
                ? "text-blue-600 dark:text-blue-400 bg-gradient-to-br from-blue-50 to-blue-100/50 dark:from-blue-500/20 dark:to-blue-600/20 scale-110 shadow-lg shadow-blue-100/50 dark:shadow-blue-500/10"
                : "text-slate-400 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100/80 dark:hover:bg-slate-700/50 hover:scale-105"
            }`}
          >
            <item.icon className={mode === "desktop" ? "w-6 h-6" : "w-7 h-7"} />
            <span
              className={`${mode === "desktop" ? "text-[10px]" : "text-[9px]"} font-medium whitespace-nowrap`}
            >
              {item.label}
            </span>
          </div>
        </Link>
      ))}
    </div>
  );
}
