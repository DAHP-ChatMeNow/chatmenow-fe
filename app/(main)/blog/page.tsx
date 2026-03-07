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
  ChevronLeft,
  ChevronRight,
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

function formatPostTime(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const diffMs = Date.now() - d.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  if (diffSec < 60) return "Vừa xong";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin} phút trước`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour} giờ trước`;
  const diffDay = Math.floor(diffHour / 24);
  if (diffDay < 7) return `${diffDay} ngày trước`;
  // older → dd/MM/yyyy HH:mm
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const mo = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${hh}:${mm} ${dd}/${mo}/${yyyy}`;
}

export default function BlogPage() {
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
    <div className="flex flex-col w-full h-full bg-slate-50/50">
      <ScrollArea className="flex-1 w-full">
        <div className="max-w-3xl mx-auto px-4 py-4 space-y-6 md:py-8 md:px-6">
          {/* Create Post */}
          <div className="p-4 space-y-4 bg-white border shadow-sm md:p-6 rounded-2xl border-slate-100">
            <div className="flex gap-3 md:gap-4">
              <PresignedAvatar
                avatarKey={user?.avatar}
                displayName={user?.displayName}
                className="w-10 h-10 md:h-12 md:w-12 shrink-0"
                fallbackClassName="text-sm md:text-base"
              />
              <Textarea
                placeholder="Bạn đang nghĩ gì thế?"
                value={postContent}
                onChange={(e) => setPostContent(e.target.value)}
                disabled={isCreatingPost}
                className="flex-1 border-none bg-slate-50 rounded-xl resize-none focus-visible:ring-0 min-h-[80px] md:min-h-[100px] text-sm md:text-base p-3"
              />
            </div>
            {/* Media Previews */}
            {mediaPreviews.length > 0 && (
              <div className="grid grid-cols-3 gap-2">
                {mediaPreviews.map((preview, idx) => (
                  <div
                    key={idx}
                    className="relative rounded-xl overflow-hidden aspect-square bg-slate-100 group"
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
                      className="absolute top-1 right-1 w-6 h-6 bg-black/60 hover:bg-black/80 rounded-full flex items-center justify-center transition-colors"
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
                    <span className="ml-1 text-blue-500 font-semibold">
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
          <div className="bg-white border shadow-sm rounded-2xl border-slate-100 p-2 md:p-4">
            <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-2">
              {/* Create Story */}
              <button className="relative flex-shrink-0 w-[110px] h-[190px] md:w-[120px] md:h-[200px] rounded-xl overflow-hidden group bg-gradient-to-b from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-900 hover:scale-[1.02] transition-transform">
                <div className="absolute inset-0 flex flex-col items-center justify-end pb-4">
                  <div className="flex items-center justify-center w-10 h-10 bg-white dark:bg-slate-800 rounded-full mb-2 shadow-lg">
                    <div className="flex items-center justify-center w-8 h-8 bg-blue-600 rounded-full group-hover:bg-blue-700 transition-colors">
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
                    className="absolute inset-0 bg-cover bg-center"
                    style={{ backgroundImage: `url(${story.image})` }}
                  >
                    {/* Dark Overlay at bottom for text readability */}
                    <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/60" />
                  </div>

                  {/* Avatar with blue ring at top-left */}
                  <div className="absolute top-3 left-3">
                    <div className="p-0.5 bg-blue-500 rounded-full">
                      <Avatar className="w-9 h-9 border-2 border-white">
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
                <PostCard
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

function PostCard({
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
}: {
  post: Post;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onLike: () => void;
  currentUserAvatar?: string | null;
  currentUserDisplayName?: string;
  commentInput: string;
  onCommentInputChange: (value: string) => void;
  onAddComment: () => void;
  isAddingComment: boolean;
}) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const { data: comments = [], isLoading: isLoadingComments } = useComments(
    isExpanded ? post.id : "",
  );

  return (
    <div className="overflow-hidden bg-white border shadow-sm rounded-2xl border-slate-100">
      {/* Post Header */}
      <div className="flex items-center justify-between p-4">
        <div className="flex items-center gap-3">
          <PresignedAvatar
            avatarKey={post.author?.avatar}
            displayName={post.author?.displayName}
            className="w-10 h-10 shrink-0"
            fallbackClassName="font-bold bg-slate-100 text-slate-600"
          />
          <div>
            <p className="text-sm font-bold leading-none text-slate-900">
              {post.author?.displayName || `User ${post.authorId.slice(0, 8)}`}
            </p>
            <p
              className="text-[11px] text-slate-400 mt-1.5"
              suppressHydrationWarning
            >
              {formatPostTime(post.createdAt)}
            </p>
          </div>
        </div>
        <Button variant="ghost" size="icon" className="w-8 h-8 text-slate-400">
          <MoreHorizontal className="w-5 h-5" />
        </Button>
      </div>

      {/* Post Content */}
      <div className="px-4 pb-3">
        <p className="text-sm leading-relaxed whitespace-pre-wrap md:text-base text-slate-800">
          {post.content}
        </p>
      </div>

      {/* Post Media */}
      {post.media && post.media.length > 0 && (
        <PostMediaGrid
          media={post.media}
          onMediaClick={(idx) => setLightboxIndex(idx)}
        />
      )}

      {/* Lightbox */}
      {lightboxIndex !== null && post.media && (
        <ImageLightbox
          post={post}
          media={post.media}
          initialIndex={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
          currentUserAvatar={currentUserAvatar}
          currentUserDisplayName={currentUserDisplayName}
          commentInput={commentInput}
          onCommentInputChange={onCommentInputChange}
          onAddComment={onAddComment}
          isAddingComment={isAddingComment}
          onLike={onLike}
        />
      )}

      {/* Post Actions */}
      <div className="flex items-center justify-around p-1 border-t md:p-2 border-slate-50">
        <Button
          variant="ghost"
          onClick={onLike}
          disabled={post.isLikedByCurrentUser}
          className={`flex-1 gap-2 text-xs md:text-sm h-10 ${
            post.isLikedByCurrentUser
              ? "text-red-500 cursor-not-allowed"
              : "text-slate-600 hover:text-red-500"
          }`}
        >
          {post.isLikedByCurrentUser ? (
            <Heart className="w-4 h-4 fill-current md:w-5 md:h-5" />
          ) : (
            <Heart className="w-4 h-4 md:w-5 md:h-5" />
          )}
          Thích {post.likesCount > 0 && `(${post.likesCount})`}
        </Button>
        <Button
          variant="ghost"
          onClick={onToggleExpand}
          className="flex-1 h-10 gap-2 text-xs text-slate-600 hover:text-blue-600 md:text-sm"
        >
          <MessageCircle className="w-4 h-4 md:w-5 md:h-5" />
          Bình luận {post.commentsCount > 0 && `(${post.commentsCount})`}
        </Button>
        <Button
          variant="ghost"
          className="flex-1 h-10 gap-2 text-xs text-slate-600 md:text-sm"
        >
          <Share2 className="w-4 h-4 md:w-5 md:h-5" />
          Chia sẻ
        </Button>
      </div>

      {/* Comments Section */}
      {isExpanded && (
        <div className="p-4 space-y-4 border-t border-slate-50">
          {/* Comment Input */}
          <div className="flex gap-3">
            <PresignedAvatar
              avatarKey={currentUserAvatar}
              displayName={currentUserDisplayName}
              className="w-8 h-8 shrink-0"
            />
            <div className="flex flex-1 gap-2">
              <Input
                placeholder="Viết bình luận..."
                value={commentInput}
                onChange={(e) => onCommentInputChange(e.target.value)}
                disabled={isAddingComment}
                className="text-sm h-9"
              />
              <Button
                size="sm"
                onClick={onAddComment}
                disabled={!commentInput.trim() || isAddingComment}
                className="px-3"
              >
                {isAddingComment ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </Button>
            </div>
          </div>

          {/* Comments List */}
          <div className="space-y-3 overflow-y-auto max-h-96">
            {isLoadingComments ? (
              <div className="py-2 text-sm text-center text-slate-500">
                Đang tải bình luận...
              </div>
            ) : comments.length === 0 ? (
              <div className="py-2 text-sm text-center text-slate-500">
                Chưa có bình luận nào
              </div>
            ) : (
              comments.map((comment) => (
                <div key={comment.id} className="flex gap-3">
                  <PresignedAvatar
                    avatarKey={comment.user?.avatar}
                    displayName={comment.user?.displayName}
                    className="w-8 h-8 shrink-0"
                  />
                  <div className="flex-1 bg-slate-50 rounded-lg p-2.5">
                    <p className="text-xs font-semibold text-slate-900">
                      {comment.user?.displayName || "Unknown"}
                    </p>
                    <p className="mt-1 text-sm leading-relaxed text-slate-800">
                      {comment.content}
                    </p>
                    <p
                      className="text-[11px] text-slate-400 mt-1"
                      suppressHydrationWarning
                    >
                      {formatPostTime(comment.createdAt)}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Video card in feed ──────────────────────────────────────────────────────
function VideoMediaItem({
  src,
  onClick,
}: {
  src: string;
  onClick?: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(true);
  const [hovering, setHovering] = useState(false);
  const hoverTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Pause when scrolled out of view ──────────────────────────────────────
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) {
          videoRef.current?.pause();
          // clear pending autoplay timer too
          if (hoverTimerRef.current) {
            clearTimeout(hoverTimerRef.current);
            hoverTimerRef.current = null;
          }
        }
      },
      { threshold: 0.2 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // ── Hover-delay autoplay (1.5 s) ─────────────────────────────────────────
  const handleMouseEnter = () => {
    setHovering(true);
    if (!playing) {
      hoverTimerRef.current = setTimeout(() => {
        videoRef.current?.play();
      }, 1500);
    }
  };

  const handleMouseLeave = () => {
    setHovering(false);
    // Cancel pending autoplay – do NOT pause if already playing
    if (hoverTimerRef.current) {
      clearTimeout(hoverTimerRef.current);
      hoverTimerRef.current = null;
    }
  };

  // ── Play / Pause toggle ───────────────────────────────────────────────────
  const togglePlay = (e: React.MouseEvent) => {
    e.stopPropagation();
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) {
      v.play();
    } else {
      v.pause();
    }
  };

  // ── Seek ±10 s ────────────────────────────────────────────────────────────
  const seek = (e: React.MouseEvent, delta: number) => {
    e.stopPropagation();
    const v = videoRef.current;
    if (!v) return;
    v.currentTime = Math.max(
      0,
      Math.min(v.duration || 0, v.currentTime + delta),
    );
  };

  // ── Mute toggle ───────────────────────────────────────────────────────────
  const toggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    const v = videoRef.current;
    if (!v) return;
    v.muted = !v.muted;
    setMuted(v.muted);
  };

  const controlsVisible = !playing || hovering;

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full overflow-hidden bg-black cursor-pointer"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={onClick}
    >
      <video
        ref={videoRef}
        src={src}
        className="object-contain w-full h-full"
        muted={muted}
        playsInline
        loop
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onClick={(e) => e.stopPropagation()}
      />

      {/* ── Centre play/pause overlay (when paused or hovering) ── */}
      <div
        className={`absolute inset-0 flex items-center justify-center transition-opacity duration-200 pointer-events-none ${
          controlsVisible ? "opacity-100" : "opacity-0"
        }`}
      >
        <button
          className="w-14 h-14 rounded-full bg-black/50 hover:bg-black/70 flex items-center justify-center transition-colors backdrop-blur-sm pointer-events-auto"
          onClick={togglePlay}
          aria-label={playing ? "Dừng video" : "Phát video"}
        >
          {playing ? (
            <svg className="w-6 h-6 text-white fill-white" viewBox="0 0 24 24">
              <rect x="6" y="4" width="4" height="16" rx="1" />
              <rect x="14" y="4" width="4" height="16" rx="1" />
            </svg>
          ) : (
            <Play className="w-7 h-7 text-white fill-white translate-x-0.5" />
          )}
        </button>
      </div>

      {/* ── Bottom control bar (visible when paused or hovering) ── */}
      <div
        className={`absolute bottom-0 left-0 right-0 flex items-center justify-between px-3 py-2 bg-gradient-to-t from-black/70 to-transparent transition-opacity duration-200 ${
          controlsVisible ? "opacity-100" : "opacity-0"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Rewind 10s */}
        <button
          className="flex items-center justify-center w-10 h-10 rounded-full hover:bg-white/20 transition-colors text-white"
          onClick={(e) => seek(e, -10)}
          aria-label="Tua lùi 10 giây"
        >
          <svg viewBox="0 0 24 24" className="w-7 h-7 fill-white">
            <path d="M11.99 5V1l-5 5 5 5V7c3.31 0 6 2.69 6 6s-2.69 6-6 6-6-2.69-6-6h-2c0 4.42 3.58 8 8 8s8-3.58 8-8-3.58-8-8-8z" />
            <text
              x="6.5"
              y="15.5"
              fontSize="7"
              fontWeight="bold"
              fill="white"
              fontFamily="sans-serif"
            >
              10
            </text>
          </svg>
        </button>

        {/* Forward 10s */}
        <button
          className="flex items-center justify-center w-10 h-10 rounded-full hover:bg-white/20 transition-colors text-white"
          onClick={(e) => seek(e, 10)}
          aria-label="Tua tới 10 giây"
        >
          <svg viewBox="0 0 24 24" className="w-7 h-7 fill-white">
            <path d="M18 13c0 3.31-2.69 6-6 6s-6-2.69-6-6 2.69-6 6-6v4l5-5-5-5v4c-4.42 0-8 3.58-8 8s3.58 8 8 8 8-3.58 8-8h-2z" />
            <text
              x="6.5"
              y="15.5"
              fontSize="7"
              fontWeight="bold"
              fill="white"
              fontFamily="sans-serif"
            >
              10
            </text>
          </svg>
        </button>

        {/* Mute / Unmute */}
        <button
          className="flex items-center justify-center w-8 h-8 rounded-full hover:bg-white/20 transition-colors text-white ml-auto"
          onClick={toggleMute}
          aria-label={muted ? "Bật âm thanh" : "Tắt âm thanh"}
        >
          {muted ? (
            // muted icon
            <svg viewBox="0 0 24 24" className="w-5 h-5 fill-white">
              <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z" />
            </svg>
          ) : (
            // unmuted icon
            <svg viewBox="0 0 24 24" className="w-5 h-5 fill-white">
              <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" />
            </svg>
          )}
        </button>
      </div>
    </div>
  );
}

function PostMediaGrid({
  media,
  onMediaClick,
}: {
  media: PostMedia[];
  onMediaClick?: (index: number) => void;
}) {
  const count = media.length;
  // Max 5 visible, rest hidden behind "+N" overlay
  const maxVisible = 5;
  const visible = media.slice(0, maxVisible);
  const extra = count - maxVisible;

  const MediaItem = ({
    item,
    index,
    extraCount,
  }: {
    item: PostMedia;
    index: number;
    extraCount?: number;
  }) => {
    const isVideo = item.type?.startsWith("video");
    return (
      <div className="relative w-full h-full overflow-hidden bg-slate-100 cursor-pointer">
        {isVideo ? (
          <VideoMediaItem
            src={item.url}
            onClick={() => onMediaClick?.(index)}
          />
        ) : (
          <img
            src={item.url}
            className="object-cover w-full h-full hover:brightness-90 transition-all duration-200"
            alt="media"
            onClick={() => onMediaClick?.(index)}
          />
        )}
        {extraCount != null && extraCount > 0 && (
          <div
            className="absolute inset-0 bg-black/55 flex items-center justify-center cursor-pointer"
            onClick={() => onMediaClick?.(index)}
          >
            <span className="text-white text-3xl font-bold">+{extraCount}</span>
          </div>
        )}
      </div>
    );
  };

  // Fixed height wrapper: 500px always
  const H = "h-[500px]";

  // 1 photo — full
  if (count === 1) {
    return (
      <div className={`w-full ${H}`}>
        <MediaItem item={visible[0]} index={0} />
      </div>
    );
  }

  // 2 photos — two equal columns
  if (count === 2) {
    return (
      <div className={`w-full ${H} flex gap-0.5`}>
        <div className="flex-1 h-full">
          <MediaItem item={visible[0]} index={0} />
        </div>
        <div className="flex-1 h-full">
          <MediaItem item={visible[1]} index={1} />
        </div>
      </div>
    );
  }

  // 3 photos — 1 large left (full height) + 2 stacked right
  if (count === 3) {
    return (
      <div className={`w-full ${H} flex gap-0.5`}>
        <div className="flex-1 h-full">
          <MediaItem item={visible[0]} index={0} />
        </div>
        <div className="flex-1 h-full flex flex-col gap-0.5">
          <div className="flex-1">
            <MediaItem item={visible[1]} index={1} />
          </div>
          <div className="flex-1">
            <MediaItem item={visible[2]} index={2} />
          </div>
        </div>
      </div>
    );
  }

  // 4 photos — 1 large left (full height) + 3 stacked right
  if (count === 4) {
    return (
      <div className={`w-full ${H} flex gap-0.5`}>
        <div className="flex-1 h-full">
          <MediaItem item={visible[0]} index={0} />
        </div>
        <div className="flex-1 h-full flex flex-col gap-0.5">
          <div className="flex-1">
            <MediaItem item={visible[1]} index={1} />
          </div>
          <div className="flex-1">
            <MediaItem item={visible[2]} index={2} />
          </div>
          <div className="flex-1">
            <MediaItem item={visible[3]} index={3} />
          </div>
        </div>
      </div>
    );
  }

  // 5+ photos — top row 2 cols, bottom row 3 cols; last cell has +N overlay
  return (
    <div className={`w-full ${H} flex flex-col gap-0.5`}>
      {/* Top row — 2 photos, 60% height */}
      <div className="flex gap-0.5" style={{ flex: "3" }}>
        <div className="flex-1 h-full">
          <MediaItem item={visible[0]} index={0} />
        </div>
        <div className="flex-1 h-full">
          <MediaItem item={visible[1]} index={1} />
        </div>
      </div>
      {/* Bottom row — 3 photos, 40% height */}
      <div className="flex gap-0.5" style={{ flex: "2" }}>
        <div className="flex-1 h-full">
          <MediaItem item={visible[2]} index={2} />
        </div>
        <div className="flex-1 h-full">
          <MediaItem item={visible[3]} index={3} />
        </div>
        <div className="flex-1 h-full">
          <MediaItem
            item={visible[4]}
            index={4}
            extraCount={extra > 0 ? extra : undefined}
          />
        </div>
      </div>
    </div>
  );
}

function ImageLightbox({
  post,
  media,
  initialIndex,
  onClose,
  currentUserAvatar,
  currentUserDisplayName,
  commentInput,
  onCommentInputChange,
  onAddComment,
  isAddingComment,
  onLike,
}: {
  post: Post;
  media: PostMedia[];
  initialIndex: number;
  onClose: () => void;
  currentUserAvatar?: string | null;
  currentUserDisplayName?: string;
  commentInput: string;
  onCommentInputChange: (value: string) => void;
  onAddComment: () => void;
  isAddingComment: boolean;
  onLike: () => void;
}) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const { data: comments = [], isLoading: isLoadingComments } = useComments(
    post.id,
  );
  const { mutate: addComment } = useAddComment();

  const current = media[currentIndex];
  const isVideo = current?.type?.startsWith("video");

  const goPrev = () => setCurrentIndex((i) => Math.max(0, i - 1));
  const goNext = () =>
    setCurrentIndex((i) => Math.min(media.length - 1, i + 1));

  // Close on backdrop click
  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) onClose();
  };

  // Keyboard navigation
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") goPrev();
      if (e.key === "ArrowRight") goNext();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div
      className="fixed inset-0 z-50 flex bg-black/90"
      onClick={handleBackdropClick}
    >
      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-3 right-3 z-10 w-9 h-9 flex items-center justify-center rounded-full bg-black/60 hover:bg-black/80 text-white transition-colors"
      >
        <X className="w-5 h-5" />
      </button>

      {/* Left panel — image/video */}
      <div className="flex-1 relative flex items-center justify-center min-w-0">
        {isVideo ? (
          <video
            key={currentIndex}
            src={current.url}
            className="max-h-full max-w-full object-contain"
            controls
            autoPlay
          />
        ) : (
          <img
            key={currentIndex}
            src={current.url}
            alt="media"
            className="max-h-full max-w-full object-contain select-none"
          />
        )}

        {/* Prev arrow */}
        {currentIndex > 0 && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              goPrev();
            }}
            className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center rounded-full bg-black/60 hover:bg-black/80 text-white transition-colors"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
        )}

        {/* Next arrow */}
        {currentIndex < media.length - 1 && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              goNext();
            }}
            className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center rounded-full bg-black/60 hover:bg-black/80 text-white transition-colors"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        )}

        {/* Index indicator */}
        {media.length > 1 && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5">
            {media.map((_, i) => (
              <button
                key={i}
                onClick={(e) => {
                  e.stopPropagation();
                  setCurrentIndex(i);
                }}
                className={`w-2 h-2 rounded-full transition-colors ${
                  i === currentIndex ? "bg-white" : "bg-white/40"
                }`}
              />
            ))}
          </div>
        )}
      </div>

      {/* Right panel — post info + comments */}
      <div
        className="w-[360px] shrink-0 bg-white dark:bg-slate-900 flex flex-col h-full"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Post header */}
        <div className="flex items-center gap-3 p-4 border-b border-slate-100 dark:border-slate-800">
          <PresignedAvatar
            avatarKey={post.author?.avatar}
            displayName={post.author?.displayName}
            className="w-10 h-10 shrink-0"
            fallbackClassName="font-bold bg-slate-100 text-slate-600"
          />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-slate-900 dark:text-white truncate">
              {post.author?.displayName || `User ${post.authorId.slice(0, 8)}`}
            </p>
            <p
              className="text-[11px] text-slate-400 mt-0.5"
              suppressHydrationWarning
            >
              {formatPostTime(post.createdAt)}
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="w-8 h-8 text-slate-400 shrink-0"
          >
            <MoreHorizontal className="w-5 h-5" />
          </Button>
        </div>

        {/* Post content */}
        {post.content && (
          <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800">
            <p className="text-sm leading-relaxed text-slate-800 dark:text-slate-200 whitespace-pre-wrap">
              {post.content}
            </p>
          </div>
        )}

        {/* Likes count */}
        {post.likesCount > 0 && (
          <div className="px-4 py-2 flex items-center gap-1.5 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center justify-center w-5 h-5 bg-red-500 rounded-full">
              <Heart className="w-3 h-3 text-white fill-white" />
            </div>
            <span className="text-sm text-slate-500">{post.likesCount}</span>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center border-b border-slate-100 dark:border-slate-800">
          <button
            onClick={onLike}
            disabled={post.isLikedByCurrentUser}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium transition-colors ${
              post.isLikedByCurrentUser
                ? "text-red-500 cursor-not-allowed"
                : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-red-500"
            }`}
          >
            <Heart
              className={`w-4 h-4 ${post.isLikedByCurrentUser ? "fill-current" : ""}`}
            />
            Thích
          </button>
          <button className="flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
            <MessageCircle className="w-4 h-4" />
            Bình luận
          </button>
          <button className="flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
            <Share2 className="w-4 h-4" />
            Chia sẻ
          </button>
        </div>

        {/* Comments list */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
          {isLoadingComments ? (
            <div className="py-4 text-sm text-center text-slate-400">
              Đang tải bình luận...
            </div>
          ) : comments.length === 0 ? (
            <div className="py-4 text-sm text-center text-slate-400">
              Chưa có bình luận nào
            </div>
          ) : (
            comments.map((comment) => (
              <div key={comment.id} className="flex gap-2.5">
                <PresignedAvatar
                  avatarKey={comment.user?.avatar}
                  displayName={comment.user?.displayName}
                  className="w-8 h-8 shrink-0"
                />
                <div className="flex-1 bg-slate-50 dark:bg-slate-800 rounded-lg px-3 py-2">
                  <p className="text-xs font-semibold text-slate-900 dark:text-white">
                    {comment.user?.displayName || "Unknown"}
                  </p>
                  <p className="mt-0.5 text-sm text-slate-800 dark:text-slate-200 leading-relaxed">
                    {comment.content}
                  </p>
                  <p
                    className="text-[11px] text-slate-400 mt-1"
                    suppressHydrationWarning
                  >
                    {formatPostTime(comment.createdAt)}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Comment input */}
        <div className="p-3 border-t border-slate-100 dark:border-slate-800 flex gap-2 items-center">
          <PresignedAvatar
            avatarKey={currentUserAvatar}
            displayName={currentUserDisplayName}
            className="w-8 h-8 shrink-0"
          />
          <div className="flex flex-1 gap-2">
            <Input
              placeholder="Viết bình luận..."
              value={commentInput}
              onChange={(e) => onCommentInputChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  onAddComment();
                }
              }}
              disabled={isAddingComment}
              className="text-sm h-9 rounded-full bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700"
            />
            <Button
              size="sm"
              onClick={onAddComment}
              disabled={!commentInput.trim() || isAddingComment}
              className="px-3 h-9 rounded-full"
            >
              {isAddingComment ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
