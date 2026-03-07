"use client";

import { useState, useRef } from "react";
import {
  Camera,
  Loader,
  Loader2,
  Trash2,
  Upload,
  Heart,
  MessageCircle,
  Share2,
  Send,
  MoreHorizontal,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { PresignedAvatar } from "@/components/ui/presigned-avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { useAuthStore } from "@/store/use-auth-store";
import {
  useUpdateProfile,
  useUpdateAvatar,
  useDeleteAvatar,
} from "@/hooks/use-profile";
import {
  useUserPosts,
  useLikePost,
  useComments,
  useAddComment,
} from "@/hooks/use-post";
import { BlogSkeleton } from "@/components/skeletons/blog-skeleton";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/contexts/language-context";
import { Post, PostMedia } from "@/types/post";

export default function ProfilePage() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const { t, language } = useLanguage();

  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [displayName, setDisplayName] = useState(user?.displayName || "");
  const [bio, setBio] = useState(user?.bio || "");
  const [previewAvatar, setPreviewAvatar] = useState<string | null>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const currentUserId = user?.id || user?._id;

  const { mutate: updateProfile, isPending: isUpdating } = useUpdateProfile();
  const { mutate: updateAvatar, isPending: isUploadingAvatar } =
    useUpdateAvatar();
  const { mutate: deleteAvatar, isPending: isDeletingAvatar } =
    useDeleteAvatar();
  const { mutate: likePost } = useLikePost();
  const {
    data: postsData,
    isLoading: isLoadingPosts,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useUserPosts(currentUserId);

  const [expandedPostId, setExpandedPostId] = useState<string | null>(null);
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>(
    {},
  );

  const handleAvatarClick = () => {
    avatarInputRef.current?.click();
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Show preview
      const reader = new FileReader();
      reader.onload = (event) => {
        setPreviewAvatar(event.target?.result as string);
      };
      reader.readAsDataURL(file);

      // Upload to backend
      updateAvatar(file, {
        onSuccess: () => {
          // Clear preview after successful upload so S3 URL is used
          setTimeout(() => setPreviewAvatar(null), 1000);
        },
        onError: () => {
          // Clear preview on error too
          setPreviewAvatar(null);
        },
      });
    }
  };

  const handleDeleteAvatar = () => {
    setShowDeleteConfirm(true);
  };

  const confirmDeleteAvatar = () => {
    deleteAvatar(undefined, {
      onSettled: () => {
        setShowDeleteConfirm(false);
      },
    });
  };

  const handleSaveProfile = () => {
    updateProfile(
      { displayName, bio },
      { onSuccess: () => setShowEditDialog(false) },
    );
  };

  const handleLike = (postId: string, isLiked: boolean) => {
    if (!isLiked) likePost({ postId });
  };

  const handleAddComment = (postId: string) => {
    const content = commentInputs[postId]?.trim();
    if (!content) return;
    addComment(
      { postId, content },
      {
        onSuccess: () =>
          setCommentInputs((prev) => ({ ...prev, [postId]: "" })),
      },
    );
  };

  const allPosts = Array.from(
    new Map(
      (postsData?.pages.flatMap((p) => p.posts) || []).map((p) => [p.id, p]),
    ).values(),
  );

  const { mutate: addComment, isPending: isAddingComment } = useAddComment();

  if (!user) return null;

  return (
    <div className="flex flex-col h-full bg-slate-50/50 dark:bg-slate-900 w-full">
      <ScrollArea className="flex-1 w-full">
        <div className="max-w-3xl mx-auto py-0 md:py-6 px-0 md:px-6 space-y-4 pb-8">
          {/* === FB-style Profile Header Card === */}
          <div className="bg-white dark:bg-slate-800 rounded-none md:rounded-2xl border-0 md:border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden">
            {/* Cover Photo */}
            <div className="h-36 md:h-48 bg-gradient-to-br from-blue-400 via-blue-500 to-purple-600 relative" />

            {/* Avatar + Info */}
            <div className="px-4 md:px-6 pb-4">
              {/* Avatar row */}
              <div className="flex items-end justify-between -mt-12 md:-mt-16 mb-3">
                <div className="relative">
                  {previewAvatar ? (
                    <Avatar className="h-24 w-24 md:h-32 md:w-32 border-4 border-white dark:border-slate-800 shadow-lg">
                      <AvatarImage src={previewAvatar} alt={user.displayName} />
                      <AvatarFallback className="text-3xl font-bold bg-gradient-to-br from-blue-500 to-purple-500 text-white">
                        {user.displayName?.charAt(0).toUpperCase() || "U"}
                      </AvatarFallback>
                    </Avatar>
                  ) : (
                    <PresignedAvatar
                      avatarKey={user.avatar}
                      displayName={user.displayName}
                      className="h-24 w-24 md:h-32 md:w-32 border-4 border-white dark:border-slate-800 shadow-lg"
                      fallbackClassName="text-3xl font-bold"
                    />
                  )}
                  {/* Camera Button */}
                  {isUploadingAvatar || isDeletingAvatar ? (
                    <div className="absolute bottom-1 right-1 bg-blue-500 p-2 rounded-full shadow-lg">
                      <Loader className="text-white w-4 h-4 animate-spin" />
                    </div>
                  ) : (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button
                          className="absolute bottom-1 right-1 bg-white dark:bg-slate-700 hover:bg-gray-100 p-2 rounded-full shadow-lg border-2 border-slate-200 dark:border-slate-600 transition-all hover:scale-105"
                          aria-label="Chỉnh sửa ảnh đại diện"
                        >
                          <Camera className="text-slate-700 dark:text-slate-200 w-4 h-4" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent
                        align="end"
                        className="w-52 bg-white dark:bg-slate-800"
                      >
                        <DropdownMenuItem
                          onClick={handleAvatarClick}
                          className="cursor-pointer gap-3"
                        >
                          <Upload className="w-4 h-4 text-blue-600" />
                          <span className="font-medium">Tải ảnh lên</span>
                        </DropdownMenuItem>
                        {user.avatar &&
                          !user.avatar.includes("ui-avatars.com") && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={handleDeleteAvatar}
                                className="cursor-pointer gap-3 text-red-600 focus:text-red-600 focus:bg-red-50"
                              >
                                <Trash2 className="w-4 h-4" />
                                <span className="font-medium">Xóa ảnh</span>
                              </DropdownMenuItem>
                            </>
                          )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                  <input
                    ref={avatarInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarChange}
                    className="hidden"
                    disabled={isUploadingAvatar || isDeletingAvatar}
                  />
                </div>

                {/* Edit button top-right */}
                <Button
                  onClick={() => setShowEditDialog(true)}
                  className="mb-1 px-5 py-2 rounded-lg text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
                >
                  {t.editProfile}
                </Button>
              </div>

              {/* Name + bio */}
              <h2 className="text-xl md:text-2xl font-bold text-slate-900 dark:text-white leading-tight">
                {user.displayName || "User"}
              </h2>
              {user.bio && (
                <p className="text-slate-500 dark:text-slate-400 text-sm mt-1 max-w-lg">
                  {user.bio}
                </p>
              )}
              <p className="text-slate-400 text-xs mt-1">
                @{user.id?.slice(0, 8)}
              </p>

              {/* stats row */}
              <div className="flex gap-5 mt-3 pt-3 border-t border-slate-100 dark:border-slate-700">
                <div className="text-center">
                  <p className="text-base font-bold text-slate-900 dark:text-white">
                    {allPosts.length}
                  </p>
                  <p className="text-[11px] text-slate-400">
                    {language === "vi" ? "bài viết" : "posts"}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* === Posts Feed === */}
          <div className="px-0 md:px-0 space-y-4">
            {isLoadingPosts ? (
              <>
                <BlogSkeleton />
                <BlogSkeleton />
              </>
            ) : allPosts.length === 0 ? (
              <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm p-12 flex flex-col items-center gap-3 text-slate-400 mx-4 md:mx-0">
                <MessageCircle className="w-10 h-10 opacity-30" />
                <p className="text-sm font-medium">
                  {language === "vi" ? "Chưa có bài viết nào" : "No posts yet"}
                </p>
              </div>
            ) : (
              <>
                {allPosts.map((post) => (
                  <ProfilePostCard
                    key={post.id}
                    post={post}
                    isExpanded={expandedPostId === post.id}
                    onToggleExpand={() =>
                      setExpandedPostId(
                        expandedPostId === post.id ? null : post.id,
                      )
                    }
                    onLike={() =>
                      handleLike(post.id, post.isLikedByCurrentUser || false)
                    }
                    currentUserAvatar={user?.avatar}
                    currentUserDisplayName={user?.displayName}
                    commentInput={commentInputs[post.id] || ""}
                    onCommentInputChange={(val) =>
                      setCommentInputs((prev) => ({ ...prev, [post.id]: val }))
                    }
                    onAddComment={() => handleAddComment(post.id)}
                    isAddingComment={isAddingComment}
                  />
                ))}

                {isFetchingNextPage && (
                  <div className="flex justify-center py-4">
                    <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
                  </div>
                )}
                {hasNextPage && !isFetchingNextPage && (
                  <button
                    onClick={() => fetchNextPage()}
                    className="w-full py-3 text-sm font-semibold text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-xl transition-colors mx-4 md:mx-0"
                  >
                    {language === "vi" ? "Xem thêm" : "Load more"}
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </ScrollArea>

      {/* Edit Profile Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-md bg-white dark:bg-slate-800">
          <DialogHeader>
            <DialogTitle className="dark:text-white">
              {t.editProfile}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Display Name */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-900 dark:text-slate-200">
                {t.displayName}
              </label>
              <Input
                placeholder={
                  language === "vi" ? "Nhập tên của bạn" : "Enter your name"
                }
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                disabled={isUpdating}
                className="dark:bg-slate-700 dark:text-white dark:border-slate-600"
              />
            </div>

            {/* Bio */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-900 dark:text-slate-200">
                {t.bio}
              </label>
              <Textarea
                placeholder={
                  language === "vi"
                    ? "Kể về bạn..."
                    : "Tell us about yourself..."
                }
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                disabled={isUpdating}
                className="min-h-[100px] dark:bg-slate-700 dark:text-white dark:border-slate-600"
              />
              <p className="text-xs text-slate-400">{bio.length}/160</p>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4">
              <Button
                variant="outline"
                onClick={() => setShowEditDialog(false)}
                disabled={isUpdating}
                className="flex-1 dark:border-slate-600 dark:text-white dark:hover:bg-slate-700"
              >
                {t.cancel}
              </Button>
              <Button
                onClick={handleSaveProfile}
                disabled={isUpdating}
                className="flex-1 bg-blue-600 hover:bg-blue-700"
              >
                {isUpdating ? (
                  <>
                    <Loader className="w-4 h-4 mr-2 animate-spin" />
                    {language === "vi" ? "Đang lưu..." : "Saving..."}
                  </>
                ) : (
                  t.save
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Avatar Confirmation Dialog - Facebook Style */}
      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent className="max-w-md bg-white dark:bg-slate-800 p-0 gap-0 rounded-2xl shadow-2xl border-0">
          {/* Header with Icon */}
          <div className="px-6 pt-6 pb-4 space-y-3">
            <div className="flex justify-center">
              <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                <Trash2 className="w-8 h-8 text-red-600 dark:text-red-400" />
              </div>
            </div>
            <DialogHeader>
              <DialogTitle className="text-xl font-bold text-slate-900 dark:text-white text-center">
                Xóa ảnh đại diện?
              </DialogTitle>
            </DialogHeader>
            <p className="text-center text-sm text-slate-600 dark:text-slate-400 leading-relaxed px-2">
              Bạn có chắc muốn xóa ảnh đại diện của mình không? Ảnh sẽ được thay
              thế bằng avatar mặc định.
            </p>
          </div>

          {/* Divider */}
          <div className="h-px bg-slate-200 dark:bg-slate-700"></div>

          {/* Buttons */}
          <div className="p-4 flex gap-3">
            <Button
              variant="outline"
              onClick={() => setShowDeleteConfirm(false)}
              disabled={isDeletingAvatar}
              className="flex-1 h-11 border-2 border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 font-semibold rounded-xl transition-all"
            >
              Hủy
            </Button>
            <Button
              onClick={confirmDeleteAvatar}
              disabled={isDeletingAvatar}
              className="flex-1 h-11 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-xl transition-all shadow-lg shadow-red-600/25 hover:shadow-red-600/40"
            >
              {isDeletingAvatar ? (
                <>
                  <Loader className="w-4 h-4 mr-2 animate-spin" />
                  Đang xóa...
                </>
              ) : (
                "Xóa"
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ===================== PostMediaGrid =====================
function PostMediaGrid({ media }: { media: PostMedia[] }) {
  if (!media || media.length === 0) return null;
  const count = media.length;

  const mediaEl = (item: PostMedia, cls = "") => {
    if (item.type === "video") {
      return (
        <video
          key={item.url}
          src={item.url}
          controls
          className={`w-full h-full object-cover ${cls}`}
        />
      );
    }
    return (
      <img
        key={item.url}
        src={item.url}
        alt=""
        className={`w-full h-full object-cover ${cls}`}
      />
    );
  };

  if (count === 1)
    return (
      <div className="h-[500px] overflow-hidden rounded-xl">
        {mediaEl(media[0], "rounded-xl")}
      </div>
    );

  if (count === 2)
    return (
      <div className="h-[500px] grid grid-cols-2 gap-0.5 overflow-hidden rounded-xl">
        {media.map((m) => (
          <div key={m.url} className="overflow-hidden">
            {mediaEl(m)}
          </div>
        ))}
      </div>
    );

  if (count === 3)
    return (
      <div className="h-[500px] grid grid-cols-2 gap-0.5 overflow-hidden rounded-xl">
        <div className="row-span-2 overflow-hidden">{mediaEl(media[0])}</div>
        <div className="overflow-hidden">{mediaEl(media[1])}</div>
        <div className="overflow-hidden">{mediaEl(media[2])}</div>
      </div>
    );

  if (count === 4)
    return (
      <div className="h-[500px] grid grid-cols-2 gap-0.5 overflow-hidden rounded-xl">
        {media.map((m) => (
          <div key={m.url} className="overflow-hidden">
            {mediaEl(m)}
          </div>
        ))}
      </div>
    );

  // 5+
  const remaining = count - 5;
  return (
    <div className="h-[500px] grid grid-cols-3 grid-rows-2 gap-0.5 overflow-hidden rounded-xl">
      {media.slice(0, 2).map((m) => (
        <div key={m.url} className="col-span-1 row-span-1 overflow-hidden">
          {mediaEl(m)}
        </div>
      ))}
      {media.slice(2, 5).map((m, i) => (
        <div
          key={m.url}
          className="col-span-1 row-span-1 relative overflow-hidden"
        >
          {mediaEl(m)}
          {i === 2 && remaining > 0 && (
            <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
              <span className="text-white text-2xl font-bold">
                +{remaining}
              </span>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ===================== ProfilePostCard =====================
interface ProfilePostCardProps {
  post: Post;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onLike: () => void;
  currentUserAvatar?: string;
  currentUserDisplayName?: string;
  commentInput: string;
  onCommentInputChange: (val: string) => void;
  onAddComment: () => void;
  isAddingComment: boolean;
}

function ProfilePostCard({
  post,
  isExpanded,
  onToggleExpand,
  onLike,
  currentUserAvatar,
  currentUserDisplayName,
  commentInput,
  onCommentInputChange,
  onAddComment,
  isAddingComment,
}: ProfilePostCardProps) {
  const { data: commentsData } = useComments(isExpanded ? post.id : "");
  const comments = commentsData?.comments || [];

  return (
    <div className="bg-white dark:bg-slate-800 rounded-none md:rounded-2xl border-0 md:border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-4 pb-2">
        <div className="flex items-center gap-3">
          <PresignedAvatar
            avatarKey={post.author?.avatar}
            displayName={post.author?.displayName}
            className="h-10 w-10"
          />
          <div>
            <p className="font-semibold text-slate-900 dark:text-white text-sm leading-tight">
              {post.author?.displayName || "User"}
            </p>
            <p className="text-[11px] text-slate-400">
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
        <button className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
          <MoreHorizontal className="w-5 h-5 text-slate-500" />
        </button>
      </div>

      {/* Content */}
      {post.content && (
        <p className="px-4 pb-3 text-slate-800 dark:text-slate-200 text-sm leading-relaxed whitespace-pre-wrap">
          {post.content}
        </p>
      )}

      {/* Media */}
      {post.media && post.media.length > 0 && (
        <div className="mx-0">
          <PostMediaGrid media={post.media} />
        </div>
      )}

      {/* Stats */}
      <div className="flex items-center justify-between px-4 pt-3 pb-1">
        <span className="text-sm text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
          <Heart className="w-4 h-4 fill-red-400 text-red-400" />
          {post.likesCount ?? 0}
        </span>
        <span
          className="text-sm text-slate-500 dark:text-slate-400 cursor-pointer hover:underline"
          onClick={onToggleExpand}
        >
          {post.commentsCount ?? 0} bình luận
        </span>
      </div>

      {/* Action bar */}
      <div className="flex border-t border-slate-100 dark:border-slate-700 mx-0 mt-1">
        <button
          onClick={onLike}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-semibold rounded-none hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors ${
            post.isLikedByCurrentUser
              ? "text-red-500"
              : "text-slate-500 dark:text-slate-400"
          }`}
        >
          <Heart
            className={`w-4 h-4 ${post.isLikedByCurrentUser ? "fill-red-500" : ""}`}
          />
          Thích
        </button>
        <button
          onClick={onToggleExpand}
          className="flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-semibold text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors rounded-none"
        >
          <MessageCircle className="w-4 h-4" />
          Bình luận
        </button>
        <button className="flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-semibold text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors rounded-none">
          <Share2 className="w-4 h-4" />
          Chia sẻ
        </button>
      </div>

      {/* Comments section */}
      {isExpanded && (
        <div className="px-4 pb-4 pt-2 space-y-3 border-t border-slate-100 dark:border-slate-700">
          {/* Existing comments */}
          {comments.map((c) => (
            <div key={c.id} className="flex gap-2 items-start">
              <PresignedAvatar
                avatarKey={c.author?.avatar}
                displayName={c.author?.displayName}
                className="h-8 w-8 flex-shrink-0"
              />
              <div className="bg-slate-100 dark:bg-slate-700 rounded-2xl px-3 py-2 flex-1">
                <p className="text-xs font-semibold text-slate-900 dark:text-white">
                  {c.author?.displayName}
                </p>
                <p className="text-sm text-slate-700 dark:text-slate-300">
                  {c.content}
                </p>
              </div>
            </div>
          ))}

          {/* Input */}
          <div className="flex gap-2 items-center pt-1">
            <PresignedAvatar
              avatarKey={currentUserAvatar}
              displayName={currentUserDisplayName}
              className="h-8 w-8 flex-shrink-0"
            />
            <div className="flex-1 flex gap-2 items-center bg-slate-100 dark:bg-slate-700 rounded-full px-4 py-1.5">
              <Input
                value={commentInput}
                onChange={(e) => onCommentInputChange(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && onAddComment()}
                placeholder="Viết bình luận..."
                className="border-0 bg-transparent p-0 text-sm focus-visible:ring-0 dark:text-white placeholder:text-slate-400"
              />
              <button
                onClick={onAddComment}
                disabled={isAddingComment || !commentInput.trim()}
                className="text-blue-600 hover:text-blue-700 disabled:opacity-40 flex-shrink-0"
              >
                {isAddingComment ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
