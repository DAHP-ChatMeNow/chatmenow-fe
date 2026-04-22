"use client";

import { useQuery } from "@tanstack/react-query";
import { adminService } from "@/services/admin";
import {
  Users,
  Newspaper,
  TrendingUp,
  Activity,
  Brain,
  AlertCircle,
  UserPlus,
  MessageSquare,
  Eye,
  Clock,
  Loader2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import Link from "next/link";
import { Button } from "@/components/ui/button";

interface StatCard {
  title: string;
  value: number | string;
  icon: React.ReactNode;
  color: "blue" | "purple" | "green" | "orange" | "red";
  link?: string;
}

const colorClasses = {
  blue: "bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800",
  purple:
    "bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 border-purple-200 dark:border-purple-800",
  green:
    "bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 border-green-200 dark:border-green-800",
  orange:
    "bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 border-orange-200 dark:border-orange-800",
  red: "bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border-red-200 dark:border-red-800",
};

const iconBgClasses = {
  blue: "bg-blue-100 dark:bg-blue-900/40",
  purple: "bg-purple-100 dark:bg-purple-900/40",
  green: "bg-green-100 dark:bg-green-900/40",
  orange: "bg-orange-100 dark:bg-orange-900/40",
  red: "bg-red-100 dark:bg-red-900/40",
};

function StatCardComponent({ stat }: { stat: StatCard }) {
  const content = (
    <div className={`border rounded-xl p-6 transition-shadow hover:shadow-md ${colorClasses[stat.color]}`}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium opacity-75">{stat.title}</p>
          <p className="text-3xl font-bold mt-2">{stat.value}</p>
        </div>
        <div className={`p-3 rounded-lg ${iconBgClasses[stat.color]}`}>
          {stat.icon}
        </div>
      </div>
    </div>
  );

  if (stat.link) {
    return <Link href={stat.link}>{content}</Link>;
  }

  return content;
}

export default function AdminDashboardHome() {
  const { data: stats, isLoading, error } = useQuery({
    queryKey: ["admin-stats"],
    queryFn: () => adminService.getStats(),
    refetchInterval: 30000,
  });

  const statCards: StatCard[] = stats
    ? [
        {
          title: "Tổng người dùng",
          value: stats.totalUsers || 0,
          icon: <Users className="w-6 h-6" />,
          color: "blue",
          link: "/admin/users",
        },
        {
          title: "Người dùng hoạt động",
          value: stats.activeUsers || 0,
          icon: <Activity className="w-6 h-6" />,
          color: "green",
        },
        {
          title: "Tổng bài viết",
          value: stats.totalPosts || 0,
          icon: <Newspaper className="w-6 h-6" />,
          color: "purple",
          link: "/admin/posts",
        },
        {
          title: "Bài viết chờ duyệt",
          value: stats.pendingPosts || 0,
          icon: <AlertCircle className="w-6 h-6" />,
          color: "orange",
        },
        {
          title: "Người dùng mới hôm nay",
          value: stats.newUsersToday || 0,
          icon: <UserPlus className="w-6 h-6" />,
          color: "blue",
        },
        {
          title: "Bài viết mới hôm nay",
          value: stats.newPostsToday || 0,
          icon: <MessageSquare className="w-6 h-6" />,
          color: "purple",
        },
      ]
    : [];

  return (
    <div className="flex-1 overflow-auto">
      <div className="p-8">
        <div className="mb-8 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
              Bảng điều khiển
            </h1>
            <p className="text-slate-600 dark:text-slate-400 mt-1">
              Tổng quan nhanh tình trạng hệ thống và điều hướng quản trị.
            </p>
          </div>
        </div>

        {error && (
          <Alert className="mb-8 border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-800">
            <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
            <AlertDescription className="text-red-600 dark:text-red-400">
              Không thể tải dữ liệu thống kê. Vui lòng thử lại sau.
            </AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {isLoading
            ? Array.from({ length: 6 }).map((_, index) => (
                <div key={index} className="border rounded-xl p-6 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
                  <Skeleton className="h-4 w-24 mb-3" />
                  <Skeleton className="h-8 w-16" />
                </div>
              ))
            : statCards.map((stat) => (
                <StatCardComponent key={stat.title} stat={stat} />
              ))}
        </div>

        <Card className="border-slate-200 dark:border-slate-700 mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Hành động nhanh
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Link href="/admin/users">
                <Button variant="outline" className="w-full justify-start dark:border-slate-700 dark:hover:bg-slate-800">
                  <Users className="w-4 h-4 mr-2" />
                  Quản lý người dùng
                </Button>
              </Link>
              <Link href="/admin/posts">
                <Button variant="outline" className="w-full justify-start dark:border-slate-700 dark:hover:bg-slate-800">
                  <Newspaper className="w-4 h-4 mr-2" />
                  Quản lý bài viết
                </Button>
              </Link>
              <Link href="/admin/ai">
                <Button variant="outline" className="w-full justify-start dark:border-slate-700 dark:hover:bg-slate-800">
                  <Brain className="w-4 h-4 mr-2" />
                  Quản lý AI Chat
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 dark:border-slate-700">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Eye className="w-5 h-5" />
              Thông tin hệ thống
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="flex items-start gap-3">
                <Clock className="w-5 h-5 text-slate-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
                    Lần cập nhật cuối
                  </p>
                  <p className="text-slate-900 dark:text-white mt-1">
                    {new Date().toLocaleString("vi-VN", {
                      year: "numeric",
                      month: "2-digit",
                      day: "2-digit",
                      hour: "2-digit",
                      minute: "2-digit",
                      second: "2-digit",
                    })}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Activity className="w-5 h-5 text-slate-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
                    Trạng thái hệ thống
                  </p>
                  <p className="text-green-600 dark:text-green-400 mt-1 font-medium">
                    ● Bình thường
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
