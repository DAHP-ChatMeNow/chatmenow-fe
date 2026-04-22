"use client";

import {
    useInfiniteQuery,
    useMutation,
    useQuery,
    useQueryClient,
} from "@tanstack/react-query";
import { reelService } from "@/services/reel";

// ─── Feed ────────────────────────────────────────────────────────────────────

export const useReelFeed = () =>
    useInfiniteQuery({
        queryKey: ["reel-feed"],
        queryFn: ({ pageParam }) =>
            reelService.getReelFeed({ pageParam: pageParam as string | null }),
        initialPageParam: null as string | null,
        getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
        staleTime: 30_000,
    });

// ─── My Reels ────────────────────────────────────────────────────────────────

export const useMyReels = () =>
    useInfiniteQuery({
        queryKey: ["my-reels"],
        queryFn: ({ pageParam }) =>
            reelService.getMyReels({ pageParam: pageParam as string | null }),
        initialPageParam: null as string | null,
        getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    });

// ─── Single Reel ─────────────────────────────────────────────────────────────

export const useReelById = (reelId?: string) =>
    useQuery({
        queryKey: ["reel", reelId],
        queryFn: () => reelService.getReelById(reelId!),
        enabled: !!reelId,
    });

// ─── Toggle Like ─────────────────────────────────────────────────────────────

export const useToggleLike = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (reelId: string) => reelService.toggleLike(reelId),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["reel-feed"] });
        },
    });
};

// ─── Comments ────────────────────────────────────────────────────────────────

export const useReelComments = (reelId?: string) =>
    useInfiniteQuery({
        queryKey: ["reel-comments", reelId],
        queryFn: ({ pageParam }) =>
            reelService.getComments(reelId!, {
                pageParam: pageParam as string | null,
            }),
        initialPageParam: null as string | null,
        getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
        enabled: !!reelId,
    });

export const useAddReelComment = (reelId: string) => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (payload: { content: string; replyToCommentId?: string }) =>
            reelService.addComment(reelId, payload),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["reel-comments", reelId] });
            qc.invalidateQueries({ queryKey: ["reel-feed"] });
        },
    });
};

// ─── Delete Reel ─────────────────────────────────────────────────────────────

export const useDeleteReel = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (reelId: string) => reelService.deleteReel(reelId),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["reel-feed"] });
            qc.invalidateQueries({ queryKey: ["my-reels"] });
        },
    });
};
