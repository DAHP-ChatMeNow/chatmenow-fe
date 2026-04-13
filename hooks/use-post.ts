"use client";

import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { toast } from "sonner";
import {
  postService,
  AddCommentResult,
  PostAiChatPayload,
  AiSuggestion,
  UpdatePostPrivacyPayload,
} from "@/api/post";
import { Post } from "@/types/post";
import { Comment } from "@/types/comment";

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
      queryClient.setQueryData(["posts", "feed"], (oldData: any) => {
        if (!oldData) {
          return {
            pages: [{ posts: [newPost], hasMore: false }],
            pageParams: [""],
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
      });

      toast.success("Đã đăng bài thành công");
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || "Không thể đăng bài");
    },
  });
};

const updatePostInInfiniteCache = (
  queryClient: ReturnType<typeof useQueryClient>,
  queryKey: unknown[],
  postId: string,
  updater: (post: Post) => Post,
) => {
  queryClient.setQueryData(queryKey, (oldData: any) => {
    if (!oldData?.pages) return oldData;

    return {
      ...oldData,
      pages: oldData.pages.map((page: any) => ({
        ...page,
        posts: page.posts.map((post: Post) =>
          post.id === postId ? updater(post) : post,
        ),
      })),
    };
  });
};

const removePostFromInfiniteCache = (
  queryClient: ReturnType<typeof useQueryClient>,
  queryKey: unknown[],
  postId: string,
) => {
  queryClient.setQueryData(queryKey, (oldData: any) => {
    if (!oldData?.pages) return oldData;

    return {
      ...oldData,
      pages: oldData.pages.map((page: any) => ({
        ...page,
        posts: page.posts.filter((post: Post) => post.id !== postId),
      })),
    };
  });
};

export const useUpdatePostPrivacy = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      postId,
      payload,
    }: {
      postId: string;
      payload: UpdatePostPrivacyPayload;
    }) => postService.updatePostPrivacy(postId, payload),
    onSuccess: (updatedPost) => {
      updatePostInInfiniteCache(
        queryClient,
        ["posts", "feed"],
        updatedPost.id,
        (post) => ({ ...post, ...updatedPost }),
      );
      updatePostInInfiniteCache(
        queryClient,
        ["posts", "me"],
        updatedPost.id,
        (post) => ({ ...post, ...updatedPost }),
      );

      toast.success("Đã cập nhật quyền riêng tư bài viết");
    },
    onError: (error: any) => {
      toast.error(
        error?.response?.data?.message || "Không thể cập nhật quyền riêng tư",
      );
    },
  });
};

export const useDeletePost = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (postId: string) => postService.deletePost(postId),
    onSuccess: (_, postId) => {
      removePostFromInfiniteCache(queryClient, ["posts", "feed"], postId);
      removePostFromInfiniteCache(queryClient, ["posts", "me"], postId);
      queryClient.removeQueries({ queryKey: ["comments", postId] });
      toast.success("Đã xóa bài viết");
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || "Không thể xóa bài viết");
    },
  });
};

export const useLikePost = () => {
  const queryClient = useQueryClient();

  const updatePostLikeState = (
    queryKey: unknown[],
    postId: string,
    isLiked: boolean,
  ) => {
    queryClient.setQueryData(queryKey, (oldData: any) => {
      if (!oldData) return oldData;

      const newPages = oldData.pages.map((page: any) => ({
        ...page,
        posts: page.posts.map((post: Post) => {
          if (post.id !== postId) return post;

          const nextLikesCount = isLiked
            ? (post.likesCount || 0) + 1
            : Math.max((post.likesCount || 0) - 1, 0);

          return {
            ...post,
            likesCount: nextLikesCount,
            isLikedByCurrentUser: isLiked,
          };
        }),
      }));

      return {
        ...oldData,
        pages: newPages,
      };
    });
  };

  return useMutation({
    mutationFn: ({ postId, isLiked }: { postId: string; isLiked: boolean }) => {
      return isLiked
        ? postService.unlikePost(postId)
        : postService.likePost(postId);
    },
    onMutate: async ({ postId, isLiked }) => {
      await Promise.all([
        queryClient.cancelQueries({ queryKey: ["posts", "feed"] }),
        queryClient.cancelQueries({ queryKey: ["posts", "me"] }),
      ]);

      const previousFeedData = queryClient.getQueryData(["posts", "feed"]);
      const previousMyPostsData = queryClient.getQueryData(["posts", "me"]);

      updatePostLikeState(["posts", "feed"], postId, !isLiked);
      updatePostLikeState(["posts", "me"], postId, !isLiked);

      return { previousFeedData, previousMyPostsData };
    },
    onError: (error: any, variables, context) => {
      if (context?.previousFeedData) {
        queryClient.setQueryData(["posts", "feed"], context.previousFeedData);
      }
      if (context?.previousMyPostsData) {
        queryClient.setQueryData(["posts", "me"], context.previousMyPostsData);
      }
      toast.error(error?.response?.data?.message || "Không thể thích bài viết");
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
    mutationFn: ({
      postId,
      content,
      replyToCommentId,
    }: {
      postId: string;
      content: string;
      replyToCommentId?: string;
    }) =>
      postService.addComment(postId, {
        content,
        replyToCommentId,
      }),
    onSuccess: (result: AddCommentResult) => {
      // Optimistically append user comments returned by API.
      queryClient.setQueryData(
        ["comments", result.postId],
        (
          oldData:
            | { comments: Comment[]; aiSuggestion?: AiSuggestion }
            | undefined,
        ) => {
          const merged = [...(oldData?.comments || []), ...result.comments];
          const normalized = Array.from(
            new Map(merged.map((comment) => [comment.id, comment])).values(),
          );
          return {
            comments: normalized,
            aiSuggestion: oldData?.aiSuggestion,
          };
        },
      );

      // Always refetch to receive latest suggestion payload and updated counters.
      queryClient.invalidateQueries({ queryKey: ["comments", result.postId] });
      queryClient.invalidateQueries({ queryKey: ["posts", "feed"] });
      queryClient.invalidateQueries({ queryKey: ["posts", "me"] });

      toast.success("Đã bình luận thành công");
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || "Không thể bình luận");
    },
  });
};

export const usePostAiChat = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      postId,
      ...payload
    }: { postId: string } & PostAiChatPayload) =>
      postService.sendPostAiChat(postId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ai-conversation"] });
    },
    onError: (error: any) => {
      toast.error(
        error?.response?.data?.message || "Không thể gửi câu hỏi tới AI chat",
      );
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

export const useProfilePosts = (userId: string | undefined) => {
  return useInfiniteQuery({
    queryKey: ["posts", "user", userId],
    queryFn: ({ pageParam }) =>
      postService.getUserPosts({ userId: userId!, pageParam }),
    getNextPageParam: (lastPage) =>
      lastPage.hasMore ? lastPage.nextPage : undefined,
    initialPageParam: 1,
    enabled: !!userId,
  });
};
