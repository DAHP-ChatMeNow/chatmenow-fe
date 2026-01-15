"use client"
import { MessageSquare, Users, Bell, LayoutDashboard, User } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useNotifications } from "@/hooks/use-notification";

export function Sidebar({ mode = "desktop" }: { mode?: "desktop" | "mobile" }) {
  const pathname = usePathname();
  const { data: notificationsData } = useNotifications();
  const unreadCount = notificationsData?.notifications?.filter(n => !n.isRead).length || 0;
  
  const isActive = (path: string) => pathname.startsWith(path);

  const navItems = [
    { icon: MessageSquare, path: "/messages" },
    { icon: LayoutDashboard, path: "/blog" },
    { icon: Users, path: "/contacts" },
    { icon: Bell, path: "/notifications" },
    { icon: User, path: "/profile" },
  ];

  const containerClasses = mode === "desktop" 
    ? "flex flex-col gap-8 items-center" 
    : "flex flex-row justify-around items-center w-full";

  return (
    <div className={containerClasses}>
      {navItems.map((item) => (
        <Link key={item.path} href={item.path}>
          <div className={`p-3 rounded-2xl transition-all duration-200 relative ${
            isActive(item.path) 
              ? "text-blue-600 dark:text-blue-400 bg-gradient-to-br from-blue-50 to-blue-100/50 dark:bg-blue-900/30 scale-110 shadow-lg shadow-blue-100/50" 
              : "text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-100/80 hover:scale-105"
          }`}>
            <item.icon className={mode === "desktop" ? "w-6 h-6" : "w-7 h-7"} />
            
            {item.path === "/notifications" && unreadCount > 0 && (
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full border border-white dark:border-slate-800" />
            )}
          </div>
        </Link>
      ))}
    </div>
  );
}