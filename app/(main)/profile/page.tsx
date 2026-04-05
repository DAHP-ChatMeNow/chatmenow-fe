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
  usePostAiChat,
} from "@/hooks/use-post";
import {
  AiPostChatPopup,
  type AiPopupMessage,
} from "@/components/post/ai-post-chat-popup";
import { BlogSkeleton } from "@/components/skeletons/blog-skeleton";
import { useLanguage } from "@/contexts/language-context";
import { Post, PostMedia } from "@/types/post";
import { AiSuggestion } from "@/api/post";
import { formatPresenceStatus } from "@/lib/utils";
import { PostMediaLightbox } from "@/components/post/post-media-lightbox";

export default function ProfilePage() {
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
  const [aiSuggestions, setAiSuggestions] = useState<
    Record<string, AiSuggestion>
  >({});
  const [aiPopupOpen, setAiPopupOpen] = useState(false);
  const [aiPopupPostId, setAiPopupPostId] = useState<string | null>(null);
  const [aiPopupConversationId, setAiPopupConversationId] = useState<
    string | undefined
  >(undefined);
  const [aiPopupInput, setAiPopupInput] = useState("");
  const [aiPopupMessages, setAiPopupMessages] = useState<AiPopupMessage[]>([]);
  const [aiPopupOptions, setAiPopupOptions] = useState<string[]>([]);

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
    likePost(
      { postId, isLiked },
      {
        onSuccess: (response: { aiSuggestion?: AiSuggestion }) => {
          if (response.aiSuggestion) {
            setAiSuggestions((prev) => ({
              ...prev,
              [postId]: response.aiSuggestion!,
            }));
          }
        },
      },
    );
  };

  const handleAddComment = (postId: string) => {
    const content = commentInputs[postId]?.trim();
    if (!content) return;

    addComment(
      {
        postId,
        content,
      },
      {
        onSuccess: () => {
          setCommentInputs((prev) => ({ ...prev, [postId]: "" }));
        },
      },
    );
  };

  const allPosts = Array.from(
    new Map(
      (postsData?.pages.flatMap((p) => p.posts) || []).map((p) => [p.id, p]),
    ).values(),
  );

  const { mutate: addComment, isPending: isAddingComment } = useAddComment();
  const { mutateAsync: askAiFromPost, isPending: isAskingAi } = usePostAiChat();

  const sendAiPopupMessage = async (postId: string, content: string) => {
    const text = content.trim();
    if (!text) return;

    setAiPopupMessages((prev) => [...prev, { role: "user", content: text }]);
    setAiPopupInput("");

    try {
      const result = await askAiFromPost({
        postId,
        content: text,
        conversationId: aiPopupConversationId,
      });

      if (result.conversationId) {
        setAiPopupConversationId(result.conversationId);
      }

      if (result.reply) {
        setAiPopupMessages((prev) => [
          ...prev,
          { role: "ai", content: result.reply! },
        ]);
      }

      if (Array.isArray(result.options)) {
        setAiPopupOptions(result.options);
      }
    } catch {
      // Error toast handled in hook.
    }
  };

  const openAiPopupWithSuggestion = async (
    postId: string,
    suggestion?: string,
  ) => {
    const content = (suggestion || aiSuggestions[postId]?.text || "").trim();
    if (!content) return;

    setAiPopupOpen(true);
    setAiPopupPostId(postId);
    setAiPopupConversationId(undefined);
    setAiPopupMessages([]);
    setAiPopupOptions(aiSuggestions[postId]?.options || []);

    await sendAiPopupMessage(postId, content);
  };

  if (!user) return null;

  return (
    <div className="flex flex-col w-full h-full bg-slate-50/50 dark:bg-slate-900">
      <ScrollArea className="flex-1 w-full">
        <div className="w-full max-w-3xl min-w-0 px-0 py-0 pb-8 mx-auto space-y-4 md:max-w-3xl md:py-6 md:px-6 lg:max-w-4xl">
          {/* === FB-style Profile Header Card === */}
          <div className="overflow-hidden bg-white border-0 rounded-none shadow-sm dark:bg-slate-800 md:rounded-2xl md:border border-slate-100 dark:border-slate-700">
            {/* Cover Photo */}
            <div className="relative h-36 md:h-48 bg-gradient-to-br from-blue-400 via-blue-500 to-purple-600" />

            {/* Avatar + Info */}
            <div className="px-4 pb-4 md:px-6">
              {/* Avatar row */}
              <div className="flex items-end justify-between mb-3 -mt-12 md:-mt-16">
                <div className="relative">
                  {previewAvatar ? (
                    <Avatar className="w-24 h-24 border-4 border-white shadow-lg md:h-32 md:w-32 dark:border-slate-800">
                      <AvatarImage src={previewAvatar} alt={user.displayName} />
                      <AvatarFallback className="text-3xl font-bold text-white bg-gradient-to-br from-blue-500 to-purple-500">
                        {user.displayName?.charAt(0).toUpperCase() || "U"}
                      </AvatarFallback>
                    </Avatar>
                  ) : (
                    <PresignedAvatar
                      avatarKey={user.avatar}
                      displayName={user.displayName}
                      className="w-24 h-24 border-4 border-white shadow-lg md:h-32 md:w-32 dark:border-slate-800"
                      fallbackClassName="text-3xl font-bold"
                    />
                  )}
                  {/* Camera Button */}
                  {isUploadingAvatar || isDeletingAvatar ? (
                    <div className="absolute p-2 bg-blue-500 rounded-full shadow-lg bottom-1 right-1">
                      <Loader className="w-4 h-4 text-white animate-spin" />
                    </div>
                  ) : (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button
                          className="absolute p-2 transition-all bg-white border-2 rounded-full shadow-lg bottom-1 right-1 dark:bg-slate-700 hover:bg-gray-100 border-slate-200 dark:border-slate-600 hover:scale-105"
                          aria-label="Chỉnh sửa ảnh đại diện"
                        >
                          <Camera className="w-4 h-4 text-slate-700 dark:text-slate-200" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent
                        align="end"
                        className="bg-white w-52 dark:bg-slate-800"
                      >
                        <DropdownMenuItem
                          onClick={handleAvatarClick}
                          className="gap-3 cursor-pointer"
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
                                className="gap-3 text-red-600 cursor-pointer focus:text-red-600 focus:bg-red-50"
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
                  className="px-5 py-2 mb-1 text-sm font-semibold text-white bg-blue-600 rounded-lg shadow-sm hover:bg-blue-700"
                >
                  {t.editProfile}
                </Button>
              </div>

              {/* Name + bio */}
              <h2 className="text-xl font-bold leading-tight md:text-2xl text-slate-900 dark:text-white">
                {user.displayName || "User"}
              </h2>
              {user.bio && (
                <p className="max-w-lg mt-1 text-sm text-slate-500 dark:text-slate-400">
                  {user.bio}
                </p>
              )}
              <p className="mt-1 text-xs text-slate-400">
                @{user.id?.slice(0, 8)}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                {formatPresenceStatus(
                  user.isOnline,
                  user.lastSeen,
                  user.lastSeenText,
                )}
              </p>

              {/* stats row */}
              <div className="flex gap-5 pt-3 mt-3 border-t border-slate-100 dark:border-slate-700">
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
          <div className="px-0 space-y-4 md:px-0">
            {isLoadingPosts ? (
              <>
                <BlogSkeleton />
                <BlogSkeleton />
              </>
            ) : allPosts.length === 0 ? (
              <div className="flex flex-col items-center gap-3 p-12 mx-4 bg-white border shadow-sm dark:bg-slate-800 rounded-2xl border-slate-100 dark:border-slate-700 text-slate-400 md:mx-0">
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
                    fallbackSuggestion={aiSuggestions[post.id]}
                    onAskAi={(suggestion) =>
                      openAiPopupWithSuggestion(post.id, suggestion)
                    }
                    isAskingAi={isAskingAi}
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
                    className="w-full py-3 mx-4 text-sm font-semibold text-blue-600 transition-colors dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-xl md:mx-0"
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
        <DialogContent className="max-w-md gap-0 p-0 bg-white border-0 shadow-2xl dark:bg-slate-800 rounded-2xl">
          {/* Header with Icon */}
          <div className="px-6 pt-6 pb-4 space-y-3">
            <div className="flex justify-center">
              <div className="flex items-center justify-center w-16 h-16 bg-red-100 rounded-full dark:bg-red-900/30">
                <Trash2 className="w-8 h-8 text-red-600 dark:text-red-400" />
              </div>
            </div>
            <DialogHeader>
              <DialogTitle className="text-xl font-bold text-center text-slate-900 dark:text-white">
                Xóa ảnh đại diện?
              </DialogTitle>
            </DialogHeader>
            <p className="px-2 text-sm leading-relaxed text-center text-slate-600 dark:text-slate-400">
              Bạn có chắc muốn xóa ảnh đại diện của mình không? Ảnh sẽ được thay
              thế bằng avatar mặc định.
            </p>
          </div>

          {/* Divider */}
          <div className="h-px bg-slate-200 dark:bg-slate-700"></div>

          {/* Buttons */}
          <div className="flex gap-3 p-4">
            <Button
              variant="outline"
              onClick={() => setShowDeleteConfirm(false)}
              disabled={isDeletingAvatar}
              className="flex-1 font-semibold transition-all bg-white border-2 h-11 border-slate-200 dark:border-slate-600 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-xl"
            >
              Hủy
            </Button>
            <Button
              onClick={confirmDeleteAvatar}
              disabled={isDeletingAvatar}
              className="flex-1 font-semibold text-white transition-all bg-red-600 shadow-lg h-11 hover:bg-red-700 rounded-xl shadow-red-600/25 hover:shadow-red-600/40"
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

      <AiPostChatPopup
        open={aiPopupOpen}
        onOpenChange={setAiPopupOpen}
        title="Phản hồi"
        messages={aiPopupMessages}
        inputValue={aiPopupInput}
        onInputChange={setAiPopupInput}
        onSend={() => {
          if (!aiPopupPostId) return;
          void sendAiPopupMessage(aiPopupPostId, aiPopupInput);
        }}
        isSending={isAskingAi}
        options={aiPopupOptions}
        onPickOption={(option) => {
          if (!aiPopupPostId) return;
          void sendAiPopupMessage(aiPopupPostId, option);
        }}
      />
    </div>
  );
}

// ===================== PostMediaGrid =====================
function PostMediaGrid({
  media,
  onMediaClick,
}: {
  media: PostMedia[];
  onMediaClick?: (index: number) => void;
}) {
  if (!media || media.length === 0) return null;
  const count = media.length;

  const mediaEl = (item: PostMedia, index: number, cls = "") => {
    if (item.type === "video") {
      return (
        <video
          key={item.url}
          src={item.url}
          controls
          onClick={() => onMediaClick?.(index)}
          className={`w-full h-full object-cover ${cls}`}
        />
      );
    }
    return (
      <img
        key={item.url}
        src={item.url}
        alt=""
        onClick={() => onMediaClick?.(index)}
        className={`w-full h-full object-cover ${cls}`}
      />
    );
  };

  if (count === 1)
    return (
      <div className="h-[500px] overflow-hidden cursor-zoom-in">
        {mediaEl(media[0], 0)}
      </div>
    );

  if (count === 2)
    return (
      <div className="h-[500px] grid grid-cols-2 gap-0.5 overflow-hidden">
        {media.map((m, idx) => (
          <div key={m.url} className="overflow-hidden cursor-zoom-in">
            {mediaEl(m, idx)}
          </div>
        ))}
      </div>
    );

  if (count === 3)
    return (
      <div className="h-[500px] grid grid-cols-2 grid-rows-2 gap-0.5 overflow-hidden">
        <div className="col-span-2 overflow-hidden cursor-zoom-in">
          {mediaEl(media[0], 0)}
        </div>
        <div className="overflow-hidden cursor-zoom-in">
          {mediaEl(media[1], 1)}
        </div>
        <div className="overflow-hidden cursor-zoom-in">
          {mediaEl(media[2], 2)}
        </div>
      </div>
    );

  if (count === 4)
    return (
      <div className="h-[500px] grid grid-cols-2 gap-0.5 overflow-hidden">
        {media.map((m, idx) => (
          <div key={m.url} className="overflow-hidden cursor-zoom-in">
            {mediaEl(m, idx)}
          </div>
        ))}
      </div>
    );

  const remaining = count > 5 ? count - 5 : 0;
  return (
    <div className="h-[500px] flex flex-col gap-0.5 overflow-hidden">
      <div className="grid grid-cols-2 gap-0.5 flex-[3] min-h-0">
        {media.slice(0, 2).map((m, idx) => (
          <div key={m.url} className="overflow-hidden cursor-zoom-in">
            {mediaEl(m, idx)}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-0.5 flex-[2] min-h-0">
        {media.slice(2, 5).map((m, i) => (
          <div key={m.url} className="relative overflow-hidden cursor-zoom-in">
            {mediaEl(m, i + 2)}
            {i === 2 && remaining > 0 && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/60">
                <span className="text-2xl font-bold text-white">
                  +{remaining}
                </span>
              </div>
            )}
          </div>
        ))}
      </div>
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
  fallbackSuggestion?: AiSuggestion;
  onAskAi: (suggestion?: string) => void;
  isAskingAi: boolean;
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
  fallbackSuggestion,
  onAskAi,
  isAskingAi,
  isAddingComment,
}: ProfilePostCardProps) {
  const { data: commentsData } = useComments(isExpanded ? post.id : "");
  const comments = commentsData?.comments || [];
  const aiSuggestion = commentsData?.aiSuggestion || fallbackSuggestion;
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const likesCount = post.likesCount ?? 0;
  const commentsCount = post.commentsCount ?? 0;
  const hasStats = likesCount > 0 || commentsCount > 0;

  return (
    <div className="overflow-hidden bg-white border-0 rounded-none shadow-sm dark:bg-slate-800 md:rounded-none md:border border-slate-100 dark:border-slate-700">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-4 pb-2">
        <div className="flex items-center gap-3">
          <PresignedAvatar
            avatarKey={post.author?.avatar}
            displayName={post.author?.displayName}
            className="w-10 h-10"
          />
          <div>
            <p className="text-sm font-semibold leading-tight text-slate-900 dark:text-white">
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
        <button className="p-2 transition-colors rounded-full hover:bg-slate-100 dark:hover:bg-slate-700">
          <MoreHorizontal className="w-5 h-5 text-slate-500" />
        </button>
      </div>

      {/* Content */}
      {post.content && (
        <p className="px-4 pb-3 text-sm leading-relaxed whitespace-pre-wrap text-slate-800 dark:text-slate-200">
          {post.content}
        </p>
      )}

      {/* Media */}
      {post.media && post.media.length > 0 && (
        <div className="mx-0">
          <PostMediaGrid media={post.media} onMediaClick={setLightboxIndex} />
        </div>
      )}

      {post.media && lightboxIndex !== null && (
        <PostMediaLightbox
          open={lightboxIndex !== null}
          media={post.media}
          initialIndex={lightboxIndex}
          author={{
            displayName: post.author?.displayName,
            avatar: post.author?.avatar,
          }}
          content={post.content}
          createdAt={post.createdAt}
          likesCount={post.likesCount}
          commentsCount={post.commentsCount}
          onClose={() => setLightboxIndex(null)}
        />
      )}

      {/* Stats */}
      {hasStats && (
        <div className="flex items-center justify-between px-4 pt-3 pb-1">
          {likesCount > 0 ? (
            <span className="text-sm text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <Heart className="w-4 h-4 text-red-400 fill-red-400" />
              {likesCount}
            </span>
          ) : (
            <span />
          )}
          {commentsCount > 0 ? (
            <span
              className="text-sm cursor-pointer text-slate-500 dark:text-slate-400 hover:underline"
              onClick={onToggleExpand}
            >
              {commentsCount} bình luận
            </span>
          ) : null}
        </div>
      )}

      {/* Action bar */}
      <div className="flex mx-0 mt-1 border-t border-slate-100 dark:border-slate-700">
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
        <div className="px-4 pt-2 pb-4 space-y-3 border-t border-slate-100 dark:border-slate-700">
          {/* Existing comments */}
          {comments.map((c) => (
            <div key={c.id} className="flex items-start gap-2">
              <PresignedAvatar
                avatarKey={c.user?.avatar}
                displayName={c.user?.displayName}
                className="flex-shrink-0 w-8 h-8"
              />
              <div className="flex-1 px-3 py-2 bg-slate-100 dark:bg-slate-700 rounded-2xl">
                <p className="text-xs font-semibold text-slate-900 dark:text-white">
                  {c.user?.displayName || "User"}
                </p>
                <p className="text-sm text-slate-700 dark:text-slate-300">
                  {c.content}
                </p>
              </div>
            </div>
          ))}

          {aiSuggestion && (
            <div className="rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 dark:border-blue-800 dark:bg-blue-900/20">
              <p className="text-xs font-semibold text-blue-700 dark:text-blue-300">
                Gợi ý AI
              </p>
              <p className="mt-1 text-sm text-blue-900 dark:text-blue-100">
                {aiSuggestion.text}
              </p>
              {aiSuggestion.options.length > 0 ? (
                <div className="mt-2 flex flex-wrap gap-2">
                  {aiSuggestion.options.map((option) => (
                    <button
                      key={option}
                      type="button"
                      onClick={() => onAskAi(option)}
                      disabled={isAskingAi}
                      className="rounded-full border border-blue-200 bg-white px-2.5 py-1 text-xs font-semibold text-blue-700 hover:bg-blue-100 disabled:opacity-60 dark:border-blue-700 dark:bg-slate-800 dark:text-blue-300"
                    >
                      {option}
                    </button>
                  ))}
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => onAskAi(aiSuggestion.text)}
                  disabled={isAskingAi}
                  className="mt-2 text-xs font-semibold text-blue-600 hover:text-blue-700 disabled:opacity-60 dark:text-blue-300"
                >
                  {isAskingAi ? "Dang gui AI chat..." : "Phản hồi ngay"}
                </button>
              )}
            </div>
          )}

          {/* Input */}
          <div className="flex items-center gap-2 pt-1">
            <PresignedAvatar
              avatarKey={currentUserAvatar}
              displayName={currentUserDisplayName}
              className="flex-shrink-0 w-8 h-8"
            />
            <div className="flex-1 flex gap-2 items-center bg-slate-100 dark:bg-slate-700 rounded-full px-4 py-1.5">
              <Input
                value={commentInput}
                onChange={(e) => onCommentInputChange(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && onAddComment()}
                placeholder="Viết bình luận..."
                className="p-0 text-sm bg-transparent border-0 focus-visible:ring-0 dark:text-white placeholder:text-slate-400"
              />
              <button
                onClick={onAddComment}
                disabled={isAddingComment || !commentInput.trim()}
                className="flex-shrink-0 text-blue-600 hover:text-blue-700 disabled:opacity-40"
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
