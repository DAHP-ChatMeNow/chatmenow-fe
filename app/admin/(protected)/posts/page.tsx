"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  adminService,
  AdminPost,
  AdminPostPrivacy,
  AdminPostSortBy,
  AdminPostSortOrder,
} from "@/services/admin";
import { toast } from "sonner";
import {
  Trash2,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Image as ImageIcon,
  BarChart3,
  CalendarDays,
  Play,
  Heart,
  MessageCircle,
  MoreHorizontal,
  Search,
  TrendingUp,
  FileText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { PostMediaLightbox } from "@/components/post/post-media-lightbox";
import { PresignedAvatar } from "@/components/ui/presigned-avatar";

const PRIVACY_TABS: Array<{ label: string; value: "" | AdminPostPrivacy }> = [
  { label: "Tất cả", value: "" },
  { label: "Công khai", value: "public" },
  { label: "Bạn bè", value: "friends" },
  { label: "Tùy chọn", value: "custom" },
  { label: "Riêng tư", value: "private" },
];

export default function AdminPostsPage() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [privacy, setPrivacy] = useState<"" | AdminPostPrivacy>("");
  const [q, setQ] = useState("");
  const [sortBy, setSortBy] = useState<AdminPostSortBy>("createdAt");
  const [sortOrder, setSortOrder] = useState<AdminPostSortOrder>("desc");
  const [statsDays, setStatsDays] = useState(30);
  const [lightboxData, setLightboxData] = useState<{
    media: NonNullable<AdminPost["media"]>;
    initialIndex: number;
    author?: { displayName?: string | null; avatar?: string | null };
    content?: string;
    createdAt?: string;
    likesCount?: number;
    commentsCount?: number;
  } | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "posts", page, privacy, q, sortBy, sortOrder],
    queryFn: () =>
      adminService.getPosts({
        page,
        limit: 15,
        privacy,
        q,
        sortBy,
        sortOrder,
      }),
  });

  const { data: postStats, isLoading: isLoadingStats } = useQuery({
    queryKey: ["admin", "posts", "stats", statsDays],
    queryFn: () => adminService.getPostStats(statsDays),
  });

  const { mutate: updatePrivacy, isPending: isUpdatingPrivacy } = useMutation({
    mutationFn: ({
      id,
      nextPrivacy,
    }: {
      id: string;
      nextPrivacy: AdminPostPrivacy;
    }) => adminService.updatePostPrivacy(id, nextPrivacy),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "posts"] });
      toast.success("Đã cập nhật quyền riêng tư");
    },
    onError: () => toast.error("Không thể cập nhật quyền riêng tư"),
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
  const privacyStats = postStats?.privacyStats || {};

  const avgLikes = Number(postStats?.avgLikesPerPost || 0).toFixed(1);
  const avgComments = Number(postStats?.avgCommentsPerPost || 0).toFixed(1);

  const topPosts = (postStats?.topPosts || []).slice(0, 5);

  const privacyBadge = (value?: string) => {
    switch (value) {
      case "public":
        return (
          <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400">
            Công khai
          </span>
        );
      case "friends":
        return (
          <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-400">
            Bạn bè
          </span>
        );
      case "custom":
        return (
          <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
            Tùy chọn
          </span>
        );
      case "private":
        return (
          <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200">
            Riêng tư
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
          Quản lý bài viết
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          {data?.total ?? 0} bài viết
        </p>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-slate-800 dark:text-slate-200">
            <BarChart3 className="h-4 w-4 text-blue-500" />
            <p className="text-sm font-semibold">Thống kê bài viết</p>
          </div>
          <div className="flex items-center gap-1 rounded-lg bg-slate-100 p-1 dark:bg-slate-700">
            {[7, 30, 90].map((days) => (
              <button
                key={days}
                type="button"
                onClick={() => setStatsDays(days)}
                className={`rounded-md px-3 py-1 text-xs font-semibold transition-colors ${
                  statsDays === days
                    ? "bg-white text-slate-900 shadow-sm dark:bg-slate-800 dark:text-white"
                    : "text-slate-500 hover:text-slate-700 dark:text-slate-300 dark:hover:text-white"
                }`}
              >
                {days} ngày
              </button>
            ))}
          </div>
        </div>

        {isLoadingStats ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
              <div className="rounded-xl border border-slate-200 p-3 dark:border-slate-600">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-slate-500">Tổng bài viết</p>
                  <FileText className="h-4 w-4 text-slate-400" />
                </div>
                <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">
                  {postStats?.totalPosts || 0}
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 p-3 dark:border-slate-600">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-slate-500">
                    Bài viết trong {postStats?.rangeDays || statsDays} ngày
                  </p>
                  <CalendarDays className="h-4 w-4 text-blue-500" />
                </div>
                <p className="mt-1 text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {postStats?.postsInRange || 0}
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 p-3 dark:border-slate-600">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-slate-500">Tổng lượt thích</p>
                  <Heart className="h-4 w-4 text-rose-500" />
                </div>
                <p className="mt-1 text-2xl font-bold text-rose-600 dark:text-rose-400">
                  {postStats?.totalLikes || 0}
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 p-3 dark:border-slate-600">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-slate-500">Tổng bình luận</p>
                  <MessageCircle className="h-4 w-4 text-amber-500" />
                </div>
                <p className="mt-1 text-2xl font-bold text-amber-600 dark:text-amber-400">
                  {postStats?.totalComments || 0}
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 p-3 dark:border-slate-600">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-slate-500">TB like/bài</p>
                  <TrendingUp className="h-4 w-4 text-emerald-500" />
                </div>
                <p className="mt-1 text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                  {avgLikes}
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 p-3 dark:border-slate-600">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-slate-500">TB comment/bài</p>
                  <TrendingUp className="h-4 w-4 text-violet-500" />
                </div>
                <p className="mt-1 text-2xl font-bold text-violet-600 dark:text-violet-400">
                  {avgComments}
                </p>
              </div>
            </div>

            <div className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-2">
              <div className="rounded-xl border border-slate-200 p-3 dark:border-slate-600">
                <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                  Phân bổ quyền riêng tư
                </p>
                <div className="mt-2 flex flex-wrap gap-2 text-xs">
                  <span className="rounded-full bg-emerald-100 px-2.5 py-1 font-semibold text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400">
                    Công khai: {privacyStats.public || 0}
                  </span>
                  <span className="rounded-full bg-sky-100 px-2.5 py-1 font-semibold text-sky-700 dark:bg-sky-900/40 dark:text-sky-400">
                    Bạn bè: {privacyStats.friends || 0}
                  </span>
                  <span className="rounded-full bg-amber-100 px-2.5 py-1 font-semibold text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
                    Tùy chọn: {privacyStats.custom || 0}
                  </span>
                  <span className="rounded-full bg-slate-200 px-2.5 py-1 font-semibold text-slate-700 dark:bg-slate-700 dark:text-slate-200">
                    Riêng tư: {privacyStats.private || 0}
                  </span>
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 p-3 dark:border-slate-600">
                <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                  Top 5 bài tương tác cao
                </p>
                {topPosts.length === 0 ? (
                  <p className="mt-2 text-xs text-slate-400">Chưa có dữ liệu</p>
                ) : (
                  <div className="mt-2 space-y-1.5">
                    {topPosts.map((item, index) => {
                      const author = item.author || item.authorId;
                      const title = (
                        item.content || "(Không có nội dung)"
                      ).trim();
                      return (
                        <div
                          key={item._id || index}
                          className="flex items-center justify-between rounded-lg bg-slate-50 px-2.5 py-1.5 text-xs dark:bg-slate-700/50"
                        >
                          <div className="min-w-0">
                            <p className="truncate font-medium text-slate-700 dark:text-slate-200">
                              {title}
                            </p>
                            <p className="truncate text-slate-500 dark:text-slate-400">
                              {author?.displayName || "Unknown"}
                            </p>
                          </div>
                          <div className="ml-3 shrink-0 text-right text-slate-500 dark:text-slate-400">
                            <p>❤ {item.likesCount || 0}</p>
                            <p>💬 {item.commentsCount || 0}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative w-full md:w-[320px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            value={q}
            onChange={(event) => {
              setQ(event.target.value);
              setPage(1);
            }}
            placeholder="Tìm theo nội dung bài viết"
            className="pl-9"
          />
        </div>

        <div className="flex gap-1 bg-slate-100 dark:bg-slate-800 rounded-xl p-1 w-fit">
          {PRIVACY_TABS.map((tab) => (
            <button
              key={tab.value || "all"}
              onClick={() => {
                setPrivacy(tab.value);
                setPage(1);
              }}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                privacy === tab.value
                  ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm"
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="ml-auto">
              Sắp xếp
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            <DropdownMenuItem
              onClick={() => {
                setSortBy("createdAt");
                setSortOrder("desc");
                setPage(1);
              }}
            >
              Mới nhất
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => {
                setSortBy("createdAt");
                setSortOrder("asc");
                setPage(1);
              }}
            >
              Cũ nhất
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => {
                setSortBy("likesCount");
                setSortOrder("desc");
                setPage(1);
              }}
            >
              Nhiều lượt thích
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => {
                setSortBy("commentsCount");
                setSortOrder("desc");
                setPage(1);
              }}
            >
              Nhiều bình luận
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
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
                  <PresignedAvatar
                    avatarKey={post.author?.avatar}
                    displayName={post.author?.displayName}
                    className="w-9 h-9 flex-shrink-0"
                    fallbackClassName="bg-gradient-to-br from-blue-500 to-purple-500 text-white text-sm font-bold"
                  />
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
                  {privacyBadge(post.privacy)}
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
                      {post.privacy !== "public" && (
                        <DropdownMenuItem
                          onClick={() =>
                            updatePrivacy({
                              id: post._id || post.id,
                              nextPrivacy: "public",
                            })
                          }
                          disabled={isUpdatingPrivacy}
                          className="cursor-pointer"
                        >
                          Đặt công khai
                        </DropdownMenuItem>
                      )}
                      {post.privacy !== "friends" && (
                        <DropdownMenuItem
                          onClick={() =>
                            updatePrivacy({
                              id: post._id || post.id,
                              nextPrivacy: "friends",
                            })
                          }
                          disabled={isUpdatingPrivacy}
                          className="cursor-pointer"
                        >
                          Đặt bạn bè
                        </DropdownMenuItem>
                      )}
                      {post.privacy !== "private" && (
                        <DropdownMenuItem
                          onClick={() =>
                            updatePrivacy({
                              id: post._id || post.id,
                              nextPrivacy: "private",
                            })
                          }
                          disabled={isUpdatingPrivacy}
                          className="cursor-pointer"
                        >
                          Đặt riêng tư
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
                <div className="mb-3 flex flex-wrap gap-3">
                  {post.media.slice(0, 4).map((m, i) =>
                    (() => {
                      const mediaCount = post.media?.length || 0;
                      const mediaType = String(m.type || "").toLowerCase();
                      const mediaUrl = String(m.url || "").toLowerCase();
                      const isImage =
                        mediaType === "image" ||
                        mediaType.startsWith("image/") ||
                        /\.(png|jpe?g|gif|webp|bmp|svg)(\?|#|$)/i.test(
                          mediaUrl,
                        );
                      const isVideo =
                        mediaType === "video" ||
                        mediaType.startsWith("video/") ||
                        /\.(mp4|mov|avi|mkv|webm|m4v)(\?|#|$)/i.test(mediaUrl);
                      const mediaLabel = isVideo
                        ? "Video"
                        : isImage
                          ? "Ảnh"
                          : "Tệp";
                      const thumbSizeClass =
                        mediaCount === 1
                          ? "w-full max-w-[380px] h-[240px]"
                          : mediaCount === 2
                            ? "w-[220px] h-[150px]"
                            : "w-[170px] h-[120px]";

                      return (
                        <div
                          key={i}
                          onClick={() => {
                            if (!post.media?.length) return;
                            setLightboxData({
                              media: post.media,
                              initialIndex: i,
                              author: {
                                displayName: post.author?.displayName,
                                avatar: post.author?.avatar,
                              },
                              content: post.content,
                              createdAt: post.createdAt,
                              likesCount: post.likesCount,
                              commentsCount: post.commentsCount,
                            });
                          }}
                          className={`relative ${thumbSizeClass} rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-700 flex-shrink-0 cursor-zoom-in border border-slate-200/70 dark:border-slate-600`}
                        >
                          {isImage ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={m.url}
                              alt=""
                              className="w-full h-full object-cover"
                            />
                          ) : isVideo ? (
                            <video
                              src={m.url}
                              muted
                              playsInline
                              preload="metadata"
                              className="w-full h-full object-cover pointer-events-none"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <ImageIcon className="w-6 h-6 text-slate-400" />
                            </div>
                          )}

                          <span className="absolute left-1.5 top-1.5 rounded-md bg-black/60 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                            {mediaLabel}
                          </span>

                          {isVideo && (
                            <span className="absolute inset-0 flex items-center justify-center pointer-events-none">
                              <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-black/50 text-white">
                                <Play className="h-4 w-4 fill-white" />
                              </span>
                            </span>
                          )}

                          {i === 3 && post.media!.length > 4 && (
                            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                              <span className="text-white text-sm font-bold">
                                +{post.media!.length - 4}
                              </span>
                            </div>
                          )}
                        </div>
                      );
                    })(),
                  )}
                </div>
              )}

              {/* Stats + quick actions */}
              <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-700">
                <div className="flex items-center gap-4 text-xs text-slate-400">
                  <span className="flex items-center gap-1">
                    <Heart className="w-3.5 h-3.5 fill-red-400 text-red-400" />
                    {post.likesCount || 0}
                  </span>
                  <span className="flex items-center gap-1">
                    <MessageCircle className="w-3.5 h-3.5 text-slate-400" />
                    {post.commentsCount || 0}
                  </span>
                </div>
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

      {lightboxData && (
        <PostMediaLightbox
          open={Boolean(lightboxData)}
          media={lightboxData.media}
          initialIndex={lightboxData.initialIndex}
          author={lightboxData.author}
          content={lightboxData.content}
          createdAt={lightboxData.createdAt}
          likesCount={lightboxData.likesCount}
          commentsCount={lightboxData.commentsCount}
          onClose={() => setLightboxData(null)}
        />
      )}
    </div>
  );
}
