"use client";

import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { toast } from "sonner";
import { postService } from "@/api/post";
import { Post } from "@/types/post";
import { Comment } from "@/types/comment";

type FeedPage = {
  posts: Post[];
  hasMore?: boolean;
  nextPage?: number;
  [key: string]: unknown;
};

type FeedQueryData = {
  pages: FeedPage[];
  pageParams: unknown[];
  [key: string]: unknown;
};

const getErrorMessage = (error: unknown, fallback: string) => {
  const message = (error as { response?: { data?: { message?: string } } })
    ?.response?.data?.message;
  return message || fallback;
};

const updatePostLikeInFeed = (
  oldData: FeedQueryData | undefined,
  postId: string,
  nextLikedState: boolean,
) => {
  if (!oldData) return oldData;

  const newPages = oldData.pages.map((page) => ({
    ...page,
    posts: page.posts.map((post) => {
      if (post.id !== postId) return post;

      const likesCount = post.likesCount || 0;

      if (post.isLikedByCurrentUser === nextLikedState) {
        return post;
      }

      return {
        ...post,
        isLikedByCurrentUser: nextLikedState,
        likesCount: nextLikedState
          ? likesCount + 1
          : Math.max(likesCount - 1, 0),
      };
    }),
  }));

  return {
    ...oldData,
    pages: newPages,
  };
};

export const useFeed = () => {
  return useInfiniteQuery({
    queryKey: ["posts", "feed"],
    queryFn: ({ pageParam }) => postService.getFeed({ pageParam }),
    getNextPageParam: (lastPage) => {
      return lastPage.hasMore ? lastPage.nextPage : undefined;
    },
    initialPageParam: 1, // Start from page 1
  });
};

export const useCreatePost = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: postService.createPost,
    onSuccess: (newPost) => {
      queryClient.setQueryData<FeedQueryData | undefined>(
        ["posts", "feed"],
        (oldData) => {
          if (!oldData) {
            return {
              pages: [{ posts: [newPost], hasMore: false }],
              pageParams: [""],
            };
          }

          if (!oldData.pages.length) {
            return {
              ...oldData,
              pages: [{ posts: [newPost], hasMore: false }],
            };
          }

          const newPages = [...oldData.pages];
          newPages[0] = {
            ...newPages[0],
            posts: [newPost, ...newPages[0].posts],
          };

          return {
            ...oldData,
            pages: newPages,
          };
        },
      );

      toast.success("Đã đăng bài thành công");
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, "Không thể đăng bài"));
    },
  });
};

export const useLikePost = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ postId }: { postId: string }) => {
      return postService.likePost(postId);
    },
    onMutate: async ({ postId }) => {
      await queryClient.cancelQueries({ queryKey: ["posts", "feed"] });

      const previousData = queryClient.getQueryData<FeedQueryData>([
        "posts",
        "feed",
      ]);

      queryClient.setQueryData<FeedQueryData | undefined>(
        ["posts", "feed"],
        (oldData) => updatePostLikeInFeed(oldData, postId, true),
      );

      return { previousData };
    },
    onError: (error, _variables, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(["posts", "feed"], context.previousData);
      }

      toast.error(getErrorMessage(error, "Không thể thích bài viết"));
    },
  });
};

export const useToggleLikePost = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ postId, isLiked }: { postId: string; isLiked: boolean }) => {
      return isLiked ? postService.unlikePost(postId) : postService.likePost(postId);
    },
    onMutate: async ({ postId, isLiked }) => {
      await queryClient.cancelQueries({ queryKey: ["posts", "feed"] });

      const previousData = queryClient.getQueryData<FeedQueryData>([
        "posts",
        "feed",
      ]);

      queryClient.setQueryData<FeedQueryData | undefined>(
        ["posts", "feed"],
        (oldData) => updatePostLikeInFeed(oldData, postId, !isLiked),
      );

      return { previousData, isLiked };
    },
    onError: (error, _variables, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(["posts", "feed"], context.previousData);
      }

      toast.error(
        getErrorMessage(
          error,
          context?.isLiked
            ? "Không thể bỏ thích bài viết"
            : "Không thể thích bài viết",
        ),
      );
    },
  });
};

export const useComments = (postId: string) => {
  return useQuery({
    queryKey: ["comments", postId],
    queryFn: () => postService.getComments(postId),
    enabled: !!postId,
  });
};

export const useAddComment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ postId, content }: { postId: string; content: string }) => {
      return postService.addComment(postId, content);
    },
    onSuccess: (newComment) => {
      // Update comments list
      queryClient.setQueryData(
        ["comments", newComment.postId],
        (oldData: Comment[] | undefined) => {
          return [...(oldData || []), newComment];
        },
      );

      // Update post comments count in feed
      queryClient.setQueryData<FeedQueryData | undefined>(
        ["posts", "feed"],
        (oldData) => {
          if (!oldData) return oldData;

          const newPages = oldData.pages.map((page) => ({
            ...page,
            posts: page.posts.map((post) => {
              if (post.id === newComment.postId) {
                return {
                  ...post,
                  commentsCount: post.commentsCount + 1,
                };
              }
              return post;
            }),
          }));

          return {
            ...oldData,
            pages: newPages,
          };
        },
      );

      toast.success("Đã bình luận thành công");
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, "Không thể bình luận"));
    },
  });
};

export const useUserPosts = (userId: string | undefined) => {
  return useInfiniteQuery({
    queryKey: ["posts", "me"],
    queryFn: ({ pageParam }) => postService.getMyPosts({ pageParam }),
    getNextPageParam: (lastPage) =>
      lastPage.hasMore ? lastPage.nextPage : undefined,
    initialPageParam: 1,
    enabled: !!userId,
  });
};
