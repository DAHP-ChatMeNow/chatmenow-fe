"use client";

import { useState, useEffect } from "react";
import {
  Image as ImageIcon,
  Heart,
  MessageCircle,
  Share2,
  MoreHorizontal,
  Loader2,
  Send,
  Plus,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
import { Post } from "@/types/post";

export default function BlogPage() {
  const [postContent, setPostContent] = useState("");
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

  const handleCreatePost = () => {
    if (!postContent.trim()) return;

    createPost(
      { content: postContent, privacy: "public" },
      {
        onSuccess: () => {
          setPostContent("");
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

  const allPosts = data?.pages.flatMap((page) => page.posts) || [];

  return (
    <div className="flex flex-col w-full h-full bg-slate-50/50">
      <ScrollArea className="flex-1 w-full">
        <div className="max-w-3xl mx-auto px-4 py-4 space-y-6 md:py-8 md:px-6">
          {/* Create Post */}
          <div className="p-4 space-y-4 bg-white border shadow-sm md:p-6 rounded-2xl border-slate-100">
            <div className="flex gap-3 md:gap-4">
              <Avatar className="w-10 h-10 md:h-12 md:w-12 shrink-0">
                <AvatarImage src={user?.avatar} />
                <AvatarFallback>{user?.displayName?.[0] || "U"}</AvatarFallback>
              </Avatar>
              <Textarea
                placeholder="Bạn đang nghĩ gì thế?"
                value={postContent}
                onChange={(e) => setPostContent(e.target.value)}
                disabled={isCreatingPost}
                className="flex-1 border-none bg-slate-50 rounded-xl resize-none focus-visible:ring-0 min-h-[80px] md:min-h-[100px] text-sm md:text-base p-3"
              />
            </div>
            <div className="flex items-center justify-between pt-2 border-t border-slate-50">
              <Button
                variant="ghost"
                size="sm"
                className="gap-2 px-2 text-slate-500 h-9 md:h-10 md:px-4"
              >
                <ImageIcon className="w-4 h-4 text-green-500 md:w-5 md:h-5" />
                <span className="text-xs md:text-sm">Ảnh/Video</span>
              </Button>
              <Button
                onClick={handleCreatePost}
                disabled={!postContent.trim() || isCreatingPost}
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
                  currentUserId={user?.id || user?._id}
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
  currentUserId,
  commentInput,
  onCommentInputChange,
  onAddComment,
  isAddingComment,
}: {
  post: Post;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onLike: () => void;
  currentUserId?: string;
  commentInput: string;
  onCommentInputChange: (value: string) => void;
  onAddComment: () => void;
  isAddingComment: boolean;
}) {
  const { data: comments = [], isLoading: isLoadingComments } = useComments(
    isExpanded ? post.id : "",
  );

  return (
    <div className="overflow-hidden bg-white border shadow-sm rounded-2xl border-slate-100">
      {/* Post Header */}
      <div className="flex items-center justify-between p-4">
        <div className="flex items-center gap-3">
          <Avatar className="w-10 h-10 shrink-0">
            {post.author?.avatar ? (
              <img
                src={post.author.avatar}
                alt={post.author.displayName}
                className="object-cover w-full h-full"
              />
            ) : (
              <AvatarFallback className="font-bold bg-slate-100 text-slate-600">
                {post.author?.displayName?.charAt(0) || "U"}
              </AvatarFallback>
            )}
          </Avatar>
          <div>
            <p className="text-sm font-bold leading-none text-slate-900">
              {post.author?.displayName || `User ${post.authorId.slice(0, 8)}`}
            </p>
            <p
              className="text-[11px] text-slate-400 mt-1.5"
              suppressHydrationWarning
            >
              {new Date(post.createdAt).toLocaleDateString("vi-VN", {
                day: "numeric",
                month: "short",
                hour: "2-digit",
                minute: "2-digit",
              })}
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
        <div className="w-full overflow-hidden bg-slate-100 aspect-video">
          <img
            src={post.media[0].url}
            className="object-cover w-full h-full transition-transform duration-500 hover:scale-105"
            alt="Post content"
          />
        </div>
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
            <Avatar className="w-8 h-8 shrink-0">
              <AvatarImage src={currentUserId} />
              <AvatarFallback>U</AvatarFallback>
            </Avatar>
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
                  <Avatar className="w-8 h-8 shrink-0">
                    <AvatarImage src={comment.user?.avatar} />
                    <AvatarFallback>
                      {comment.user?.displayName?.[0] || "U"}
                    </AvatarFallback>
                  </Avatar>
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
                      {new Date(comment.createdAt).toLocaleDateString("vi-VN", {
                        day: "numeric",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
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
