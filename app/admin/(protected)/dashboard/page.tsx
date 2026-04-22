"use client";

import { useQuery } from "@tanstack/react-query";
import { adminService } from "@/services/admin";
import {
  TrendingUp,
  Eye,
  Heart,
  MessageCircle,
  Lock,
  Users,
  Loader2,
  Calendar,
  Filter,
  AlertCircle,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useState } from "react";

export default function PostsAnalyticsPage() {
  const [days, setDays] = useState("30");

  const { data: stats, isLoading, error } = useQuery({
    queryKey: ["admin", "posts", "analytics", days],
    queryFn: () => adminService.getPostStats(parseInt(days)),
    refetchInterval: 60000,
  });

  const daysNum = parseInt(days);
  const postsPerDay = stats?.postsPerDay || [];
  const maxPostsInDay = Math.max(...(postsPerDay.map((p) => p.count) || [0]));

  return (
    <div className="flex-1 overflow-auto">
      <div className="p-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
                Phân tích bài viết
              </h1>
              <p className="text-slate-600 dark:text-slate-400 mt-1">
                Xem chi tiết thống kê bài viết trên hệ thống
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-slate-500" />
              <Select value={days} onValueChange={setDays}>
                <SelectTrigger className="w-40 dark:border-slate-700 dark:bg-slate-800">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">7 ngày qua</SelectItem>
                  <SelectItem value="14">14 ngày qua</SelectItem>
                  <SelectItem value="30">30 ngày qua</SelectItem>
                  <SelectItem value="90">90 ngày qua</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Error State */}
        {error && (
          <Alert className="mb-8 border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-800">
            <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
            <AlertDescription className="text-red-600 dark:text-red-400">
              Không thể tải dữ liệu phân tích. Vui lòng thử lại sau.
            </AlertDescription>
          </Alert>
        )}

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {isLoading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <Card
                key={i}
                className="border-slate-200 dark:border-slate-700"
              >
                <CardHeader>
                  <Skeleton className="h-4 w-24" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-8 w-16" />
                </CardContent>
              </Card>
            ))
          ) : (
            <>
              <Card className="border-slate-200 dark:border-slate-700 bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-900/10">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-300">
                    Tổng bài viết ({stats?.rangeDays || 0} ngày)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-end justify-between">
                    <p className="text-4xl font-bold text-purple-600 dark:text-purple-400">
                      {stats?.totalPosts || 0}
                    </p>
                    <TrendingUp className="w-5 h-5 text-purple-600 dark:text-purple-400 mb-1" />
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-2">
                    {stats?.postsInRange || 0} bài trong{" "}
                    {stats?.rangeDays || 0} ngày
                  </p>
                </CardContent>
              </Card>

              <Card className="border-slate-200 dark:border-slate-700 bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-900/10">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-300">
                    Tổng lượt thích
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-end justify-between">
                    <p className="text-4xl font-bold text-red-600 dark:text-red-400">
                      {stats?.totalLikes || 0}
                    </p>
                    <Heart className="w-5 h-5 text-red-600 dark:text-red-400 mb-1" />
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-2">
                    Trung bình:{" "}
                    {(stats?.avgLikesPerPost || 0).toFixed(1)} /bài
                  </p>
                </CardContent>
              </Card>

              <Card className="border-slate-200 dark:border-slate-700 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-900/10">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-300">
                    Tổng bình luận
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-end justify-between">
                    <p className="text-4xl font-bold text-blue-600 dark:text-blue-400">
                      {stats?.totalComments || 0}
                    </p>
                    <MessageCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 mb-1" />
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-2">
                    Trung bình:{" "}
                    {(stats?.avgCommentsPerPost || 0).toFixed(1)} /bài
                  </p>
                </CardContent>
              </Card>
            </>
          )}
        </div>

        {/* Privacy Distribution */}
        {isLoading ? (
          <Card className="border-slate-200 dark:border-slate-700 mb-8">
            <CardHeader>
              <Skeleton className="h-5 w-32" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-32 w-full" />
            </CardContent>
          </Card>
        ) : (
          <Card className="border-slate-200 dark:border-slate-700 mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lock className="w-5 h-5" />
                Phân bố quyền riêng tư
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[
                  {
                    label: "Công khai",
                    count: stats?.privacyStats?.public || 0,
                    color: "bg-green-500",
                  },
                  {
                    label: "Bạn bè",
                    count: stats?.privacyStats?.friends || 0,
                    color: "bg-blue-500",
                  },
                  {
                    label: "Riêng tư",
                    count: stats?.privacyStats?.private || 0,
                    color: "bg-purple-500",
                  },
                ].map(({ label, count, color }) => {
                  const total = stats?.totalPosts || 1;
                  const percentage = ((count / total) * 100).toFixed(1);
                  return (
                    <div key={label}>
                      <div className="flex items-center justify-between text-sm mb-1">
                        <p className="font-medium text-slate-700 dark:text-slate-200">
                          {label}
                        </p>
                        <p className="text-slate-600 dark:text-slate-400">
                          {count} ({percentage}%)
                        </p>
                      </div>
                      <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
                        <div
                          className={`${color} h-2 rounded-full transition-all`}
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Posts Timeline */}
        {isLoading ? (
          <Card className="border-slate-200 dark:border-slate-700">
            <CardHeader>
              <Skeleton className="h-5 w-32" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-64 w-full" />
            </CardContent>
          </Card>
        ) : (
          <Card className="border-slate-200 dark:border-slate-700">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Bài viết theo ngày ({stats?.rangeDays || 0} ngày)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {postsPerDay.length > 0 ? (
                  postsPerDay.map((day) => (
                    <div key={day.date} className="flex items-center gap-3">
                      <p className="text-sm text-slate-600 dark:text-slate-400 w-24">
                        {new Date(day.date).toLocaleDateString("vi-VN")}
                      </p>
                      <div className="flex-1 bg-slate-200 dark:bg-slate-700 rounded-full h-6 overflow-hidden">
                        <div
                          className="bg-gradient-to-r from-purple-400 to-purple-600 h-6 rounded-full transition-all flex items-center justify-end pr-2"
                          style={{
                            width: `${((day.count / maxPostsInDay) * 100).toFixed(1)}%`,
                          }}
                        >
                          {day.count > 0 && (
                            <p className="text-xs font-bold text-white">
                              {day.count}
                            </p>
                          )}
                        </div>
                      </div>
                      <p className="text-sm text-slate-600 dark:text-slate-400 w-12">
                        {day.count}
                      </p>
                    </div>
                  ))
                ) : (
                  <p className="text-center text-slate-600 dark:text-slate-400 py-4">
                    Không có dữ liệu
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
