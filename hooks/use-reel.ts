"use client";

import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { toast } from "sonner";
import { reelApiService } from "@/api/reel";
import { Reel, ReelFeedPage } from "@/types/reel";

// ─── Query keys ──────────────────────────────────────────────────────────────

export const reelKeys = {
  all:      ["reels"] as const,
  feed:     () => [...reelKeys.all, "feed"] as const,
  user:     (userId: string) => [...reelKeys.all, "user", userId] as const,
};

// ─── Types ───────────────────────────────────────────────────────────────────

type ReelFeedData = {
  pages:      ReelFeedPage[];
  pageParams: unknown[];
};

const getErrorMessage = (error: unknown, fallback: string) => {
  const message = (error as { response?: { data?: { message?: string } } })
    ?.response?.data?.message;
  return message || fallback;
};

// ─── Optimistic updater helpers ──────────────────────────────────────────────

/**
 * Immutably update a single reel inside the infinite feed cache.
 */
const patchReelInFeed = (
  oldData: ReelFeedData | undefined,
  reelId:  string,
  updater: (reel: Reel) => Reel
): ReelFeedData | undefined => {
  if (!oldData) return oldData;
  return {
    ...oldData,
    pages: oldData.pages.map((page) => ({
      ...page,
      reels: page.reels.map((reel) =>
        reel.id === reelId ? updater(reel) : reel
      ),
    })),
  };
};

// ─── Hooks ───────────────────────────────────────────────────────────────────

/**
 * Infinite-scroll reel feed using cursor pagination.
 * cursor = nextCursor from the previous page (base64 string).
 */
export const useReelFeed = () => {
  return useInfiniteQuery({
    queryKey: reelKeys.feed(),
    queryFn:  ({ pageParam }) =>
      reelApiService.getReelFeed({ pageParam: pageParam as string | undefined }),
    getNextPageParam: (lastPage) =>
      lastPage.hasMore && lastPage.nextCursor ? lastPage.nextCursor : undefined,
    initialPageParam: undefined as string | undefined,
  });
};

/**
 * Create (upload) a new reel.
 * On success, prepends the new reel to the feed cache.
 */
export const useCreateReel = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: reelApiService.createReel,
    onSuccess: (newReel) => {
      queryClient.setQueryData<ReelFeedData | undefined>(
        reelKeys.feed(),
        (oldData) => {
          const firstPage: ReelFeedPage = {
            reels:      [newReel],
            nextCursor: null,
            hasMore:    false,
          };

          if (!oldData) {
            return { pages: [firstPage], pageParams: [undefined] };
          }

          if (!oldData.pages.length) {
            return { ...oldData, pages: [firstPage] };
          }

          const newPages = [...oldData.pages];
          newPages[0] = {
            ...newPages[0],
            reels: [newReel, ...newPages[0].reels],
          };
          return { ...oldData, pages: newPages };
        }
      );

      toast.success("Đã đăng reel thành công 🎬");
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, "Không thể đăng reel"));
    },
  });
};

/**
 * Delete own reel.
 * Removes the reel from the feed cache immediately.
 */
export const useDeleteReel = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: reelApiService.deleteReel,
    onSuccess: (_data, reelId) => {
      queryClient.setQueryData<ReelFeedData | undefined>(
        reelKeys.feed(),
        (oldData) => {
          if (!oldData) return oldData;
          return {
            ...oldData,
            pages: oldData.pages.map((page) => ({
              ...page,
              reels: page.reels.filter((r) => r.id !== reelId),
            })),
          };
        }
      );
      toast.success("Đã xoá reel");
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, "Không thể xoá reel"));
    },
  });
};

/**
 * Toggle like / unlike with **optimistic UI**.
 * Immediately updates the local cache, rolls back on API error.
 */
export const useToggleLikeReel = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ reelId, isLiked }: { reelId: string; isLiked: boolean }) =>
      isLiked
        ? reelApiService.unlikeReel(reelId)
        : reelApiService.likeReel(reelId),

    onMutate: async ({ reelId, isLiked }) => {
      // Cancel any outgoing refetches to avoid overwriting our optimistic update
      await queryClient.cancelQueries({ queryKey: reelKeys.feed() });

      const previousData = queryClient.getQueryData<ReelFeedData>(reelKeys.feed());

      // Optimistic update
      queryClient.setQueryData<ReelFeedData | undefined>(
        reelKeys.feed(),
        (oldData) =>
          patchReelInFeed(oldData, reelId, (reel) => ({
            ...reel,
            isLikedByCurrentUser: !isLiked,
            likesCount:           isLiked
              ? Math.max(reel.likesCount - 1, 0)
              : reel.likesCount + 1,
            stats: {
              ...reel.stats,
              likesCount: isLiked
                ? Math.max(reel.stats.likesCount - 1, 0)
                : reel.stats.likesCount + 1,
            },
          }))
      );

      return { previousData, isLiked };
    },

    onError: (error, _variables, context) => {
      // Roll back on error
      if (context?.previousData) {
        queryClient.setQueryData(reelKeys.feed(), context.previousData);
      }
      toast.error(
        getErrorMessage(
          error,
          context?.isLiked ? "Không thể bỏ thích reel" : "Không thể thích reel"
        )
      );
    },

    // Sync with server response (overwrite optimistic with real likesCount)
    onSuccess: (serverData, { reelId }) => {
      queryClient.setQueryData<ReelFeedData | undefined>(
        reelKeys.feed(),
        (oldData) =>
          patchReelInFeed(oldData, reelId, (reel) => ({
            ...reel,
            isLikedByCurrentUser: serverData.isLikedByCurrentUser,
            likesCount:           serverData.likesCount,
            stats: {
              ...reel.stats,
              likesCount: serverData.likesCount,
            },
          }))
      );
    },
  });
};

/**
 * Record a view when user swipes to a reel.
 * Fire-and-forget – no UI feedback needed.
 */
export const useAddReelView = () => {
  return useMutation({
    mutationFn: ({ reelId, watchSeconds }: { reelId: string; watchSeconds?: number }) =>
      reelApiService.addReelView(reelId, watchSeconds),
    // Silently fail – views are non-critical
    onError: () => {},
  });
};

/**
 * Fetch reels by a specific user.
 */
export const useUserReels = (userId: string | undefined) => {
  return useQuery({
    queryKey: reelKeys.user(userId ?? ""),
    queryFn:  () => reelApiService.getUserReels(userId!),
    enabled:  !!userId,
  });
};
