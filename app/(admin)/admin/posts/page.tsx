"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { adminService, AdminPost } from "@/api/admin";
import { toast } from "sonner";
import {
  CheckCircle,
  XCircle,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Image as ImageIcon,
  Heart,
  MessageCircle,
  MoreHorizontal,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

const STATUS_TABS = [
  { label: "Tất cả", value: "" },
  { label: "Chờ duyệt", value: "pending" },
  { label: "Đã duyệt", value: "approved" },
  { label: "Từ chối", value: "rejected" },
];

export default function AdminPostsPage() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "posts", page, status],
    queryFn: () => adminService.getPosts(page, 15, status),
  });

  const { mutate: approvePost, isPending: isApproving } = useMutation({
    mutationFn: adminService.approvePost,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "posts"] });
      toast.success("Đã duyệt bài viết");
    },
    onError: () => toast.error("Thao tác thất bại"),
  });

  const { mutate: rejectPost, isPending: isRejecting } = useMutation({
    mutationFn: ({ id }: { id: string }) => adminService.rejectPost(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "posts"] });
      toast.success("Đã từ chối bài viết");
    },
    onError: () => toast.error("Thao tác thất bại"),
  });

  const { mutate: deletePost, isPending: isDeleting } = useMutation({
    mutationFn: adminService.deletePost,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "posts"] });
      toast.success("Đã xóa bài viết");
    },
    onError: () => toast.error("Xóa thất bại"),
  });

  const posts: AdminPost[] = data?.posts || [];
  const totalPages = data?.totalPages || 1;

  const statusBadge = (s?: string) => {
    switch (s) {
      case "pending":
        return (
          <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400">
            Chờ duyệt
          </span>
        );
      case "approved":
        return (
          <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400">
            Đã duyệt
          </span>
        );
      case "rejected":
        return (
          <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-400">
            Từ chối
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="p-6 md:p-8 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
          Kiểm duyệt bài viết
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          {data?.total ?? 0} bài viết
        </p>
      </div>

      {/* Status tabs */}
      <div className="flex gap-1 bg-slate-100 dark:bg-slate-800 rounded-xl p-1 w-fit">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => {
              setStatus(tab.value);
              setPage(1);
            }}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              status === tab.value
                ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm"
                : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Posts list */}
      <div className="space-y-3">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
          </div>
        ) : posts.length === 0 ? (
          <div className="flex items-center justify-center py-20 text-slate-400 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700">
            Không có bài viết nào
          </div>
        ) : (
          posts.map((post) => (
            <div
              key={post._id || post.id}
              className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm p-4 md:p-5"
            >
              {/* Author row */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                    {post.author?.displayName?.charAt(0).toUpperCase() || "U"}
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900 dark:text-white text-sm leading-tight">
                      {post.author?.displayName}
                    </p>
                    <p className="text-[11px] text-slate-400">
                      {post.author?.email} ·{" "}
                      {new Date(post.createdAt).toLocaleDateString("vi-VN", {
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {statusBadge(post.status)}
                  {/* Actions */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors ml-1">
                        <MoreHorizontal className="w-4 h-4 text-slate-500" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                      align="end"
                      className="bg-white dark:bg-slate-800"
                    >
                      {post.status !== "approved" && (
                        <DropdownMenuItem
                          onClick={() => approvePost(post._id || post.id)}
                          disabled={isApproving}
                          className="cursor-pointer gap-2 text-green-600 focus:text-green-600 focus:bg-green-50"
                        >
                          <CheckCircle className="w-4 h-4" />
                          Duyệt bài
                        </DropdownMenuItem>
                      )}
                      {post.status !== "rejected" && (
                        <DropdownMenuItem
                          onClick={() =>
                            rejectPost({ id: post._id || post.id })
                          }
                          disabled={isRejecting}
                          className="cursor-pointer gap-2 text-orange-600 focus:text-orange-600 focus:bg-orange-50"
                        >
                          <XCircle className="w-4 h-4" />
                          Từ chối
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => {
                          if (confirm("Xóa bài viết này?")) {
                            deletePost(post._id || post.id);
                          }
                        }}
                        disabled={isDeleting}
                        className="cursor-pointer gap-2 text-red-600 focus:text-red-600 focus:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4" />
                        Xóa bài
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>

              {/* Content */}
              {post.content && (
                <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed mb-3 line-clamp-4">
                  {post.content}
                </p>
              )}

              {/* Media thumbnails */}
              {post.media && post.media.length > 0 && (
                <div className="flex gap-2 mb-3 flex-wrap">
                  {post.media.slice(0, 4).map((m, i) => (
                    <div
                      key={i}
                      className="relative w-20 h-20 rounded-lg overflow-hidden bg-slate-100 dark:bg-slate-700 flex-shrink-0"
                    >
                      {m.type === "image" ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={m.url}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <ImageIcon className="w-6 h-6 text-slate-400" />
                        </div>
                      )}
                      {i === 3 && post.media!.length > 4 && (
                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                          <span className="text-white text-sm font-bold">
                            +{post.media!.length - 4}
                          </span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Stats + quick actions */}
              <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-700">
                <div className="flex items-center gap-4 text-xs text-slate-400">
                  <span className="flex items-center gap-1">
                    <Heart className="w-3.5 h-3.5 fill-red-400 text-red-400" />
                    {post.likesCount}
                  </span>
                  <span className="flex items-center gap-1">
                    <MessageCircle className="w-3.5 h-3.5 text-slate-400" />
                    {post.commentsCount}
                  </span>
                </div>

                {/* Quick approve/reject inline buttons for pending */}
                {post.status === "pending" && (
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => rejectPost({ id: post._id || post.id })}
                      disabled={isRejecting}
                      className="h-7 px-3 text-xs bg-red-100 hover:bg-red-200 text-red-700 dark:bg-red-900/30 dark:text-red-400 dark:hover:bg-red-900/50"
                      variant="ghost"
                    >
                      <XCircle className="w-3.5 h-3.5 mr-1" />
                      Từ chối
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => approvePost(post._id || post.id)}
                      disabled={isApproving}
                      className="h-7 px-3 text-xs bg-green-600 hover:bg-green-700 text-white"
                    >
                      <CheckCircle className="w-3.5 h-3.5 mr-1" />
                      Duyệt
                    </Button>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Trang {page} / {totalPages}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="dark:border-slate-600 dark:text-white"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="dark:border-slate-600 dark:text-white"
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
