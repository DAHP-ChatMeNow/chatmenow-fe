"use client";
import {
  MessageSquare,
  UserPlus,
  FileText,
  Clapperboard,
  Home,
  CircleUser,
  Settings,
  Bell,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export function Sidebar({ mode = "desktop" }: { mode?: "desktop" | "mobile" }) {
  const pathname = usePathname();
  const isMobile = mode === "mobile";

  const isActive = (path: string) => pathname.startsWith(path);

  const navItems = [
    {
      icon: MessageSquare,
      path: "/messages",
      label: "Nhắn tin",
      badgeCount: 8,
    },
    { icon: FileText, path: "/blog", label: "Bài viết" },
    { icon: Clapperboard, path: "/reels", label: "Reels" },
    { icon: UserPlus, path: "/contacts", label: "Bạn bè" },
    {
      icon: Bell,
      path: "/notifications",
      label: "Thông báo",
      badgeCount: 5,
    },
    {
      icon: CircleUser,
      path: "/profile",
      label: "Cá nhân",
      hideOnMobile: true,
    },
    {
      icon: Settings,
      path: "/settings",
      label: "Cài đặt",
      hideOnMobile: true,
    },
  ];

  const visibleItems = navItems.filter((item) =>
    isMobile ? !item.hideOnMobile : true,
  );

  const orderedItems = isMobile
    ? (() => {
        const mobileOrder = [
          "/blog",
          "/reels",
          "/messages",
          "/contacts",
          "/notifications",
        ];

        return [...visibleItems].sort((left, right) => {
          const leftIndex = mobileOrder.indexOf(left.path);
          const rightIndex = mobileOrder.indexOf(right.path);

          if (leftIndex === -1 && rightIndex === -1) return 0;
          if (leftIndex === -1) return 1;
          if (rightIndex === -1) return -1;
          return leftIndex - rightIndex;
        });
      })()
    : visibleItems;

  const containerClasses =
    mode === "desktop"
      ? "flex flex-col gap-8 items-center"
      : "flex flex-row items-center w-full h-full";

  return (
    <div className={containerClasses}>
      {orderedItems.map((item) => {
        const active = isActive(item.path);
        const MobileIcon = item.path === "/blog" ? Home : item.icon;

        if (isMobile) {
          return (
            <Link
              key={item.path}
              href={item.path}
              aria-label={item.label}
              className={`h-full flex-1 flex items-center justify-center border-b-[3px] transition-colors ${
                active
                  ? "text-blue-600 border-blue-600"
                  : "text-slate-500 dark:text-slate-400 border-transparent"
              }`}
            >
              <div className="relative">
                <MobileIcon className="w-[23px] h-[23px]" />
                {item.badgeCount ? (
                  <span className="absolute -top-2 -right-2 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-semibold leading-[18px] text-center shadow-sm">
                    {item.badgeCount > 99 ? "99+" : item.badgeCount}
                  </span>
                ) : null}
              </div>
              <span className="sr-only">{item.label}</span>
            </Link>
          );
        }

        return (
          <Link key={item.path} href={item.path}>
            <div
              className={`flex flex-col items-center justify-center gap-1 p-2.5 w-[70px] h-[70px] rounded-2xl transition-all duration-200 relative ${
                active
                  ? "text-blue-600 dark:text-blue-400 bg-gradient-to-br from-blue-50 to-blue-100/60 dark:from-blue-500/20 dark:to-blue-600/20 shadow-md shadow-blue-100/50 dark:shadow-blue-500/10"
                  : "text-slate-400 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100/80 dark:hover:bg-slate-700/50"
              }`}
            >
              <item.icon className="w-6 h-6" />
              <span className="text-[10px] font-medium whitespace-nowrap">
                {item.label}
              </span>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
