"use client";

import { useState, useEffect, useRef } from "react";
import {
  Image as ImageIcon,
  Heart,
  MessageCircle,
  Share2,
  MoreHorizontal,
  Loader2,
  Send,
  Plus,
  X,
  Play,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { PresignedAvatar } from "@/components/ui/presigned-avatar";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  useFeed,
  useCreatePost,
  useLikePost,
  useComments,
  useAddComment,
} from "@/hooks/use-post";
import { BlogSkeleton } from "@/components/skeletons/blog-skeleton";
import { useAuthStore } from "@/store/use-auth-store";
import { Post, PostMedia } from "@/types/post";
import { toast } from "sonner";
import { PostMediaLightbox } from "@/components/post/post-media-lightbox";
import { useRouter } from "next/navigation";

type MediaPreview = {
  url: string;
  type: "image" | "video";
  name: string;
};

const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_VIDEO_SIZE = 50 * 1024 * 1024; // 50MB
const MAX_VIDEO_DURATION = 300; // 5 phút
const MAX_FILES = 10;

const getVideoDuration = (file: File): Promise<number> =>
  new Promise((resolve) => {
    const video = document.createElement("video");
    video.preload = "metadata";
    const url = URL.createObjectURL(file);
    video.src = url;
    video.onloadedmetadata = () => {
      URL.revokeObjectURL(url);
      resolve(Math.floor(video.duration));
    };
    video.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(0);
    };
  });

export default function BlogPage() {
  const router = useRouter();
  const [postContent, setPostContent] = useState("");
  const [mediaFiles, setMediaFiles] = useState<File[]>([]);
  const [mediaPreviews, setMediaPreviews] = useState<MediaPreview[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [expandedPostId, setExpandedPostId] = useState<string | null>(null);
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>(
    {},
  );
  const user = useAuthStore((state) => state.user);

  const {
    data,
    isLoading,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useFeed();

  const { mutate: createPost, isPending: isCreatingPost } = useCreatePost();
  const { mutate: likePost } = useLikePost();
  const { mutate: addComment, isPending: isAddingComment } = useAddComment();

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files || []);
    if (!selected.length) return;

    if (mediaFiles.length + selected.length > MAX_FILES) {
      toast.error(`Tối đa ${MAX_FILES} file mỗi bài đăng`);
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    const validFiles: File[] = [];
    const newPreviews: MediaPreview[] = [];

    for (const file of selected) {
      const isImage = file.type.startsWith("image/");
      const isVideo = file.type.startsWith("video/");

      if (!isImage && !isVideo) {
        toast.error(`"${file.name}" không được hỗ trợ`);
        continue;
      }
      if (isImage && file.size > MAX_IMAGE_SIZE) {
        toast.error(`Ảnh "${file.name}" vượt quá 10MB`);
        continue;
      }
      if (isVideo && file.size > MAX_VIDEO_SIZE) {
        toast.error(`Video "${file.name}" vượt quá 50MB`);
        continue;
      }
      if (isVideo) {
        const duration = await getVideoDuration(file);
        if (duration > MAX_VIDEO_DURATION) {
          toast.error(`Video "${file.name}" vượt quá 5 phút`);
          continue;
        }
      }
      validFiles.push(file);
      newPreviews.push({
        url: URL.createObjectURL(file),
        type: isImage ? "image" : "video",
        name: file.name,
      });
    }

    setMediaFiles((prev) => [...prev, ...validFiles]);
    setMediaPreviews((prev) => [...prev, ...newPreviews]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removeMedia = (index: number) => {
    URL.revokeObjectURL(mediaPreviews[index].url);
    setMediaFiles((prev) => prev.filter((_, i) => i !== index));
    setMediaPreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const handleCreatePost = async () => {
    if (!postContent.trim() && mediaFiles.length === 0) return;

    const videoDurations: number[] = [];
    for (const file of mediaFiles) {
      if (file.type.startsWith("video/")) {
        videoDurations.push(await getVideoDuration(file));
      }
    }

    createPost(
      { content: postContent, privacy: "public", mediaFiles, videoDurations },
      {
        onSuccess: () => {
          setPostContent("");
          mediaPreviews.forEach((p) => URL.revokeObjectURL(p.url));
          setMediaFiles([]);
          setMediaPreviews([]);
        },
      },
    );
  };

  const handleLike = (postId: string, isLiked: boolean) => {
    if (!isLiked) {
      likePost({ postId });
    }
  };

  const handleAddComment = (postId: string) => {
    const content = commentInputs[postId]?.trim();
    if (!content) return;
    addComment(
      { postId, content },
      {
        onSuccess: () => {
          setCommentInputs({ ...commentInputs, [postId]: "" });
        },
      },
    );
  };

  // Infinite scroll logic
  useEffect(() => {
    const handleScroll = (e: Event) => {
      const target = e.target as HTMLDivElement;
      if (!target) return;

      const { scrollTop, scrollHeight, clientHeight } = target;
      const threshold = 300; // Load more when 300px from bottom

      if (
        scrollHeight - scrollTop - clientHeight < threshold &&
        hasNextPage &&
        !isFetchingNextPage
      ) {
        fetchNextPage();
      }
    };

    const scrollArea = document.querySelector(
      "[data-radix-scroll-area-viewport]",
    );
    if (scrollArea) {
      scrollArea.addEventListener("scroll", handleScroll);
      return () => scrollArea.removeEventListener("scroll", handleScroll);
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const allPosts = Array.from(
    new Map(
      (data?.pages.flatMap((page) => page.posts) || []).map((p) => [p.id, p]),
    ).values(),
  );

  return (
    <div className="flex flex-col w-full h-full max-w-full overflow-x-hidden bg-slate-50/50">
      <ScrollArea className="flex-1 w-full min-w-0">
        <div className="w-full max-w-3xl min-w-0 px-0 py-0 pb-8 mx-auto space-y-4 overflow-x-hidden md:max-w-3xl md:py-6 md:px-6 lg:max-w-4xl">
          {/* Create Post */}
          <div className="p-4 space-y-4 bg-white border-0 rounded-none shadow-sm md:p-6 md:rounded-2xl md:border border-slate-100">
            <div className="flex min-w-0 gap-3 md:gap-4">
              <button
                type="button"
                onClick={() => router.push("/profile")}
                aria-label="Mở trang cá nhân"
                className="shrink-0 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
              >
                <PresignedAvatar
                  avatarKey={user?.avatar}
                  displayName={user?.displayName}
                  className="w-10 h-10 md:h-12 md:w-12 shrink-0"
                  fallbackClassName="text-sm md:text-base"
                />
              </button>
              <Textarea
                placeholder="Bạn đang nghĩ gì thế?"
                value={postContent}
                onChange={(e) => setPostContent(e.target.value)}
                disabled={isCreatingPost}
                className="flex-1 min-w-0 border-none bg-slate-50 rounded-xl resize-none focus-visible:ring-0 min-h-[80px] md:min-h-[100px] text-sm md:text-base p-3"
              />
            </div>
            {/* Media Previews */}
            {mediaPreviews.length > 0 && (
              <div className="grid grid-cols-3 gap-2">
                {mediaPreviews.map((preview, idx) => (
                  <div
                    key={idx}
                    className="relative overflow-hidden rounded-xl aspect-square bg-slate-100 group"
                  >
                    {preview.type === "image" ? (
                      <img
                        src={preview.url}
                        alt={preview.name}
                        className="object-cover w-full h-full"
                      />
                    ) : (
                      <div className="relative w-full h-full">
                        <video
                          src={preview.url}
                          className="object-cover w-full h-full"
                        />
                        <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                          <Play className="w-8 h-8 text-white fill-white" />
                        </div>
                      </div>
                    )}
                    <button
                      onClick={() => removeMedia(idx)}
                      className="absolute flex items-center justify-center w-6 h-6 transition-colors rounded-full top-1 right-1 bg-black/60 hover:bg-black/80"
                    >
                      <X className="w-3.5 h-3.5 text-white" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="flex items-center justify-between pt-2 border-t border-slate-50">
              <Button
                variant="ghost"
                size="sm"
                className="gap-2 px-2 text-slate-500 h-9 md:h-10 md:px-4"
                onClick={() => fileInputRef.current?.click()}
                disabled={isCreatingPost || mediaFiles.length >= MAX_FILES}
              >
                <ImageIcon className="w-4 h-4 text-green-500 md:w-5 md:h-5" />
                <span className="text-xs md:text-sm">
                  Ảnh/Video
                  {mediaFiles.length > 0 && (
                    <span className="ml-1 font-semibold text-blue-500">
                      ({mediaFiles.length})
                    </span>
                  )}
                </span>
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/jpeg,image/png,image/gif,image/webp,video/mp4,video/mpeg,video/quicktime,video/avi"
                className="hidden"
                onChange={handleFileSelect}
              />
              <Button
                onClick={handleCreatePost}
                disabled={
                  (!postContent.trim() && mediaFiles.length === 0) ||
                  isCreatingPost
                }
                className="px-4 text-xs font-semibold text-white bg-blue-600 rounded-full hover:bg-blue-700 md:px-8 h-9 md:h-10 md:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isCreatingPost ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Đang đăng...
                  </>
                ) : (
                  "Đăng bài"
                )}
              </Button>
            </div>
          </div>

          {/* Stories */}
          <div className="p-2 min-w-0 bg-white border shadow-sm rounded-2xl border-slate-100 md:p-4">
            <div className="flex w-full min-w-0 gap-2 pb-2 overflow-x-auto scrollbar-hide">
              {/* Create Story */}
              <button className="relative flex-shrink-0 w-[110px] h-[190px] md:w-[120px] md:h-[200px] rounded-xl overflow-hidden group bg-gradient-to-b from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-900 hover:scale-[1.02] transition-transform">
                <div className="absolute inset-0 flex flex-col items-center justify-end pb-4">
                  <div className="flex items-center justify-center w-10 h-10 mb-2 bg-white rounded-full shadow-lg dark:bg-slate-800">
                    <div className="flex items-center justify-center w-8 h-8 transition-colors bg-blue-600 rounded-full group-hover:bg-blue-700">
                      <Plus className="w-5 h-5 text-white" />
                    </div>
                  </div>
                  <span className="text-xs font-semibold text-slate-900 dark:text-white">
                    Tạo tin
                  </span>
                </div>
              </button>

              {/* Sample Stories - Replace with real data */}
              {[
                {
                  id: 1,
                  name: "Ngọc Bích",
                  avatar: "https://i.pravatar.cc/150?img=1",
                  image:
                    "https://images.unsplash.com/photo-1516726817505-f5ed825624d8?w=400&h=600&fit=crop",
                },
                {
                  id: 2,
                  name: "Thanh Thảo",
                  avatar: "https://i.pravatar.cc/150?img=2",
                  image:
                    "https://images.unsplash.com/photo-1506748686214-e9df14d4d9d0?w=400&h=600&fit=crop",
                },
                {
                  id: 3,
                  name: "Trần Lê Văn Hùng",
                  avatar: "https://i.pravatar.cc/150?img=3",
                  image:
                    "https://images.unsplash.com/photo-1511988617509-a57c8a288659?w=400&h=600&fit=crop",
                },
                {
                  id: 4,
                  name: "Thu Thủy",
                  avatar: "https://i.pravatar.cc/150?img=4",
                  image:
                    "https://images.unsplash.com/photo-1500462918059-b1a0cb512f1d?w=400&h=600&fit=crop",
                },
                {
                  id: 5,
                  name: "Thanh Nhàn",
                  avatar: "https://i.pravatar.cc/150?img=5",
                  image:
                    "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=400&h=600&fit=crop",
                },
              ].map((story) => (
                <button
                  key={story.id}
                  className="relative flex-shrink-0 w-[110px] h-[190px] md:w-[120px] md:h-[200px] rounded-xl overflow-hidden group hover:scale-[1.02] transition-transform"
                >
                  {/* Background Image */}
                  <div
                    className="absolute inset-0 bg-center bg-cover"
                    style={{ backgroundImage: `url(${story.image})` }}
                  >
                    {/* Dark Overlay at bottom for text readability */}
                    <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/60" />
                  </div>

                  {/* Avatar with blue ring at top-left */}
                  <div className="absolute top-3 left-3">
                    <div className="p-0.5 bg-blue-500 rounded-full">
                      <Avatar className="border-2 border-white w-9 h-9">
                        <AvatarImage src={story.avatar} />
                        <AvatarFallback>{story.name[0]}</AvatarFallback>
                      </Avatar>
                    </div>
                  </div>

                  {/* Name at bottom */}
                  <div className="absolute bottom-0 left-0 right-0 p-3">
                    <span className="text-xs font-semibold text-white drop-shadow-lg line-clamp-2">
                      {story.name}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Feed */}
          {isLoading ? (
            <>
              <BlogSkeleton key="skeleton-1" />
              <BlogSkeleton key="skeleton-2" />
              <BlogSkeleton key="skeleton-3" />
            </>
          ) : error ? (
            <div className="py-12 text-center text-slate-500">
              Không thể tải bài viết
            </div>
          ) : allPosts.length > 0 ? (
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
                  onCommentInputChange={(value) =>
                    setCommentInputs({ ...commentInputs, [post.id]: value })
                  }
                  onAddComment={() => handleAddComment(post.id)}
                  isAddingComment={isAddingComment}
                />
              ))}

              {/* Load More Indicator */}
              {isFetchingNextPage && (
                <div className="flex justify-center py-4">
                  <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
                </div>
              )}

              {!hasNextPage && allPosts.length > 0 && (
                <div className="py-4 text-sm text-center text-slate-400">
                  Bạn đã xem hết bài viết
                </div>
              )}
            </>
          ) : (
            <div className="py-12 text-center text-slate-500">
              Chưa có bài viết nào. Hãy đăng bài đầu tiên!
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

interface ProfilePostCardProps {
  post: Post;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onLike: () => void;
  currentUserAvatar?: string | null;
  currentUserDisplayName?: string;
  commentInput: string;
  onCommentInputChange: (val: string) => void;
  onAddComment: () => void;
  isAddingComment: boolean;
}

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

  if (count === 1) {
    return (
      <div className="h-[500px] overflow-hidden cursor-zoom-in">
        {mediaEl(media[0], 0)}
      </div>
    );
  }

  if (count === 2) {
    return (
      <div className="h-[500px] grid grid-cols-2 gap-0.5 overflow-hidden">
        {media.map((m, idx) => (
          <div key={m.url} className="overflow-hidden cursor-zoom-in">
            {mediaEl(m, idx)}
          </div>
        ))}
      </div>
    );
  }

  if (count === 3) {
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
  }

  if (count === 4) {
    return (
      <div className="h-[500px] grid grid-cols-2 gap-0.5 overflow-hidden">
        {media.map((m, idx) => (
          <div key={m.url} className="overflow-hidden cursor-zoom-in">
            {mediaEl(m, idx)}
          </div>
        ))}
      </div>
    );
  }

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
  const comments = commentsData || [];
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const likesCount = post.likesCount ?? 0;
  const commentsCount = post.commentsCount ?? 0;
  const hasStats = likesCount > 0 || commentsCount > 0;

  return (
    <div className="w-full min-w-0 overflow-hidden bg-white border-0 rounded-none shadow-sm md:rounded-2xl md:border border-slate-100">
      <div className="flex items-center justify-between px-4 pt-4 pb-2">
        <div className="flex items-center flex-1 min-w-0 gap-3">
          <PresignedAvatar
            avatarKey={post.author?.avatar}
            displayName={post.author?.displayName}
            className="w-10 h-10"
          />
          <div className="min-w-0">
            <p className="text-sm font-semibold leading-tight truncate text-slate-900">
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
        <button className="p-2 transition-colors rounded-full hover:bg-slate-100">
          <MoreHorizontal className="w-5 h-5 text-slate-500" />
        </button>
      </div>

      {post.content && (
        <p className="px-4 pb-3 text-sm leading-relaxed break-words whitespace-pre-wrap text-slate-800">
          {post.content}
        </p>
      )}

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

      {hasStats && (
        <div className="flex items-center justify-between min-w-0 px-4 pt-3 pb-1">
          {likesCount > 0 ? (
            <span className="text-sm text-slate-500 flex items-center gap-1.5">
              <Heart className="w-4 h-4 text-red-400 fill-red-400" />
              {likesCount}
            </span>
          ) : (
            <span />
          )}
          {commentsCount > 0 ? (
            <span
              className="text-sm cursor-pointer text-slate-500 hover:underline"
              onClick={onToggleExpand}
            >
              {commentsCount} bình luận
            </span>
          ) : null}
        </div>
      )}

      <div className="flex mx-0 mt-1 border-t border-slate-100">
        <button
          onClick={onLike}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-semibold rounded-none hover:bg-slate-50 transition-colors ${
            post.isLikedByCurrentUser ? "text-red-500" : "text-slate-500"
          }`}
        >
          <Heart
            className={`w-4 h-4 ${post.isLikedByCurrentUser ? "fill-red-500" : ""}`}
          />
          Thích
        </button>
        <button
          onClick={onToggleExpand}
          className="flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-semibold text-slate-500 hover:bg-slate-50 transition-colors rounded-none"
        >
          <MessageCircle className="w-4 h-4" />
          Bình luận
        </button>
        <button className="flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-semibold text-slate-500 hover:bg-slate-50 transition-colors rounded-none">
          <Share2 className="w-4 h-4" />
          Chia sẻ
        </button>
      </div>

      {isExpanded && (
        <div className="min-w-0 px-4 pt-2 pb-4 space-y-3 border-t border-slate-100">
          {comments.map((c) => (
            <div key={c.id} className="flex items-start gap-2">
              <PresignedAvatar
                avatarKey={c.user?.avatar}
                displayName={c.user?.displayName}
                className="flex-shrink-0 w-8 h-8"
              />
              <div className="flex-1 min-w-0 px-3 py-2 rounded-2xl bg-slate-100">
                <p className="text-xs font-semibold text-slate-900">
                  {c.user?.displayName}
                </p>
                <p className="text-sm break-words text-slate-700">
                  {c.content}
                </p>
              </div>
            </div>
          ))}

          <div className="flex items-center min-w-0 gap-2 pt-1">
            <PresignedAvatar
              avatarKey={currentUserAvatar}
              displayName={currentUserDisplayName}
              className="flex-shrink-0 w-8 h-8"
            />
            <div className="flex min-w-0 items-center flex-1 gap-2 px-4 py-1.5 rounded-full bg-slate-100">
              <Input
                value={commentInput}
                onChange={(e) => onCommentInputChange(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && onAddComment()}
                placeholder="Viết bình luận..."
                className="w-full min-w-0 p-0 text-sm bg-transparent border-0 focus-visible:ring-0 placeholder:text-slate-400"
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
