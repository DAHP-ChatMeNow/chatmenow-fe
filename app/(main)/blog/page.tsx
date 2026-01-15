"use client";

import { useState, useEffect } from "react";
import { Image as ImageIcon, Heart, MessageCircle, Share2, MoreHorizontal, Loader2, Send } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { useFeed, useCreatePost, useLikePost, useComments, useAddComment } from "@/hooks/use-post";
import { BlogSkeleton } from "@/components/skeletons/blog-skeleton";
import { useAuthStore } from "@/store/use-auth-store";

export default function BlogPage() {
  const [postContent, setPostContent] = useState("");
  const [expandedPostId, setExpandedPostId] = useState<string | null>(null);
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});
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
      }
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
    addComment({ postId, content }, {
      onSuccess: () => {
        setCommentInputs({ ...commentInputs, [postId]: "" });
      }
    });
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

    const scrollArea = document.querySelector('[data-radix-scroll-area-viewport]');
    if (scrollArea) {
      scrollArea.addEventListener('scroll', handleScroll);
      return () => scrollArea.removeEventListener('scroll', handleScroll);
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const allPosts = data?.pages.flatMap((page) => page.posts) || [];

  return (
    <div className="flex flex-col h-full bg-slate-50/50 w-full">
      <ScrollArea className="flex-1 w-full">
        <div className="w-full py-4 md:py-8 px-4 md:px-6 space-y-6">
          {/* Create Post */}
          <div className="bg-white p-4 md:p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4">
            <div className="flex gap-3 md:gap-4">
              <Avatar className="h-10 w-10 md:h-12 md:w-12 shrink-0">
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
            <div className="flex justify-between items-center pt-2 border-t border-slate-50">
              <Button variant="ghost" size="sm" className="text-slate-500 gap-2 h-9 md:h-10 px-2 md:px-4">
                <ImageIcon className="w-4 h-4 md:w-5 md:h-5 text-green-500" />
                <span className="text-xs md:text-sm">Ảnh/Video</span>
              </Button>
              <Button
                onClick={handleCreatePost}
                disabled={!postContent.trim() || isCreatingPost}
                className="bg-blue-600 hover:bg-blue-700 px-4 md:px-8 rounded-full h-9 md:h-10 text-xs md:text-sm font-semibold text-white disabled:opacity-50 disabled:cursor-not-allowed"
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

          {/* Feed */}
          {isLoading ? (
            <>
              <BlogSkeleton key="skeleton-1" />
              <BlogSkeleton key="skeleton-2" />
              <BlogSkeleton key="skeleton-3" />
            </>
          ) : error ? (
            <div className="text-center py-12 text-slate-500">
              Không thể tải bài viết
            </div>
          ) : allPosts.length > 0 ? (
            <>
              {allPosts.map((post) => (
                <PostCard
                  key={post.id}
                  post={post}
                  isExpanded={expandedPostId === post.id}
                  onToggleExpand={() => setExpandedPostId(expandedPostId === post.id ? null : post.id)}
                  onLike={() => handleLike(post.id, post.isLikedByCurrentUser || false)}
                  currentUserId={user?.id || user?._id}
                  commentInput={commentInputs[post.id] || ""}
                  onCommentInputChange={(value) => setCommentInputs({ ...commentInputs, [post.id]: value })}
                  onAddComment={() => handleAddComment(post.id)}
                  isAddingComment={isAddingComment}
                />
              ))}

              {/* Load More Indicator */}
              {isFetchingNextPage && (
                <div className="flex justify-center py-4">
                  <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
                </div>
              )}

              {!hasNextPage && allPosts.length > 0 && (
                <div className="text-center py-4 text-slate-400 text-sm">
                  Bạn đã xem hết bài viết
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-12 text-slate-500">
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
  post: any;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onLike: () => void;
  currentUserId?: string;
  commentInput: string;
  onCommentInputChange: (value: string) => void;
  onAddComment: () => void;
  isAddingComment: boolean;
}) {
  const { data: comments = [], isLoading: isLoadingComments } = useComments(isExpanded ? post.id : "");

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
      {/* Post Header */}
      <div className="p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10 shrink-0">
            {post.author?.avatar ? (
              <img src={post.author.avatar} alt={post.author.displayName} className="w-full h-full object-cover" />
            ) : (
              <AvatarFallback className="bg-slate-100 font-bold text-slate-600">
                {post.author?.displayName?.charAt(0) || 'U'}
              </AvatarFallback>
            )}
          </Avatar>
          <div>
            <p className="font-bold text-sm text-slate-900 leading-none">
              {post.author?.displayName || `User ${post.authorId.slice(0, 8)}`}
            </p>
            <p className="text-[11px] text-slate-400 mt-1.5">
              {new Date(post.createdAt).toLocaleDateString("vi-VN", {
                day: "numeric",
                month: "short",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
          </div>
        </div>
        <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400">
          <MoreHorizontal className="w-5 h-5" />
        </Button>
      </div>

      {/* Post Content */}
      <div className="px-4 pb-3">
        <p className="text-sm md:text-base text-slate-800 leading-relaxed whitespace-pre-wrap">
          {post.content}
        </p>
      </div>

      {/* Post Media */}
      {post.media && post.media.length > 0 && (
        <div className="bg-slate-100 aspect-video w-full overflow-hidden">
          <img
            src={post.media[0].url}
            className="w-full h-full object-cover hover:scale-105 transition-transform duration-500"
            alt="Post content"
          />
        </div>
      )}

      {/* Post Actions */}
      <div className="p-1 md:p-2 flex items-center justify-around border-t border-slate-50">
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
            <Heart className="w-4 h-4 md:w-5 md:h-5 fill-current" />
          ) : (
            <Heart className="w-4 h-4 md:w-5 md:h-5" />
          )}
          Thích {post.likesCount > 0 && `(${post.likesCount})`}
        </Button>
        <Button
          variant="ghost"
          onClick={onToggleExpand}
          className="flex-1 gap-2 text-slate-600 hover:text-blue-600 text-xs md:text-sm h-10"
        >
          <MessageCircle className="w-4 h-4 md:w-5 md:h-5" />
          Bình luận {post.commentsCount > 0 && `(${post.commentsCount})`}
        </Button>
        <Button variant="ghost" className="flex-1 gap-2 text-slate-600 text-xs md:text-sm h-10">
          <Share2 className="w-4 h-4 md:w-5 md:h-5" />
          Chia sẻ
        </Button>
      </div>

      {/* Comments Section */}
      {isExpanded && (
        <div className="border-t border-slate-50 p-4 space-y-4">
          {/* Comment Input */}
          <div className="flex gap-3">
            <Avatar className="h-8 w-8 shrink-0">
              <AvatarImage src={currentUserId} />
              <AvatarFallback>U</AvatarFallback>
            </Avatar>
            <div className="flex-1 flex gap-2">
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
                {isAddingComment ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </Button>
            </div>
          </div>

          {/* Comments List */}
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {isLoadingComments ? (
              <div className="text-sm text-slate-500 text-center py-2">Đang tải bình luận...</div>
            ) : comments.length === 0 ? (
              <div className="text-sm text-slate-500 text-center py-2">Chưa có bình luận nào</div>
            ) : (
              comments.map((comment) => (
                <div key={comment.id} className="flex gap-3">
                  <Avatar className="h-8 w-8 shrink-0">
                    <AvatarImage src={comment.user?.avatar} />
                    <AvatarFallback>{comment.user?.displayName?.[0] || 'U'}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 bg-slate-50 rounded-lg p-2.5">
                    <p className="text-xs font-semibold text-slate-900">
                      {comment.user?.displayName || 'Unknown'}
                    </p>
                    <p className="text-sm text-slate-800 mt-1 leading-relaxed">
                      {comment.content}
                    </p>
                    <p className="text-[11px] text-slate-400 mt-1">
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