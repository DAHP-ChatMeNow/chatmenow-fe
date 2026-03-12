"use client";

import { useQuery } from "@tanstack/react-query";
import { adminService } from "@/api/admin";
import { Users, FileText, UserCheck, Clock } from "lucide-react";

export default function AdminDashboardPage() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ["admin", "stats"],
    queryFn: adminService.getStats,
  });

  const cards = [
    {
      label: "Tổng người dùng",
      value: stats?.totalUsers ?? 0,
      icon: Users,
      color: "bg-blue-500",
      sub: `+${stats?.newUsersToday ?? 0} hôm nay`,
    },
    {
      label: "Người dùng hoạt động",
      value: stats?.activeUsers ?? 0,
      icon: UserCheck,
      color: "bg-green-500",
      sub: "Đang hoạt động",
    },
    {
      label: "Tổng bài viết",
      value: stats?.totalPosts ?? 0,
      icon: FileText,
      color: "bg-violet-500",
      sub: `+${stats?.newPostsToday ?? 0} hôm nay`,
    },
    {
      label: "Chờ kiểm duyệt",
      value: stats?.pendingPosts ?? 0,
      icon: Clock,
      color: "bg-amber-500",
      sub: "Bài viết pending",
    },
  ];

  return (
    <div className="p-6 md:p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
          Tổng quan
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Thống kê hệ thống ChatMeNow
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {cards.map(({ label, value, icon: Icon, color, sub }) => (
          <div
            key={label}
            className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm p-5 flex items-center gap-4"
          >
            <div className={`${color} p-3 rounded-xl flex-shrink-0`}>
              <Icon className="w-5 h-5 text-white" />
            </div>
            <div>
              {isLoading ? (
                <div className="h-7 w-16 bg-slate-200 dark:bg-slate-700 animate-pulse rounded-lg mb-1" />
              ) : (
                <p className="text-2xl font-bold text-slate-900 dark:text-white leading-none">
                  {value.toLocaleString()}
                </p>
              )}
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                {label}
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">{sub}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
