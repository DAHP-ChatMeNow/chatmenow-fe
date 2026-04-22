import api from "@/lib/axios";
import {
    Reel,
    ReelComment,
    ReelFeedResult,
    ReelCommentsResult,
    CreateReelPayload,
} from "@/types/reel";
import { User } from "@/types/user";

// ─── Helpers ────────────────────────────────────────────────────────────────

interface BackendReel {
    _id: string;
    userId: User | string;
    videoUrl: string;
    caption?: string;
    hashtags?: string[];
    musicUrl?: string | null;
    musicTitle?: string | null;
    musicArtist?: string | null;
    viewCount: number;
    likeCount: number;
    commentCount: number;
    isDeleted?: boolean;
    isLikedByCurrentUser: boolean;
    createdAt: Date | string;
    updatedAt?: Date | string;
}

interface BackendReelComment {
    _id: string;
    reelId: string;
    userId: User | string;
    content: string;
    replyToCommentId?: string | null;
    isDeleted?: boolean;
    createdAt: Date | string;
}

const mapReel = (r: BackendReel): Reel => ({
    _id: r._id,
    id: r._id,
    userId: typeof r.userId === "string" ? r.userId : (r.userId as User)?._id || "",
    user: typeof r.userId === "object" ? (r.userId as User) : undefined,
    videoUrl: r.videoUrl,
    caption: r.caption,
    hashtags: r.hashtags,
    musicUrl: r.musicUrl,
    musicTitle: r.musicTitle,
    musicArtist: r.musicArtist,
    viewCount: r.viewCount ?? 0,
    likeCount: r.likeCount ?? 0,
    commentCount: r.commentCount ?? 0,
    isDeleted: r.isDeleted,
    isLikedByCurrentUser: r.isLikedByCurrentUser ?? false,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
});

const mapComment = (c: BackendReelComment): ReelComment => ({
    _id: c._id,
    id: c._id,
    reelId: c.reelId,
    userId: typeof c.userId === "string" ? c.userId : (c.userId as User)?._id || "",
    user: typeof c.userId === "object" ? (c.userId as User) : undefined,
    content: c.content,
    replyToCommentId: c.replyToCommentId,
    isDeleted: c.isDeleted,
    createdAt: c.createdAt,
});

// ─── Presigned Upload ────────────────────────────────────────────────────────

const getReelVideoUploadUrl = async (payload: {
    fileName: string;
    contentType: string;
    fileSize: number;
}): Promise<{ key: string; uploadUrl: string; method: string; contentType: string; expiresIn: number }> => {
    const { data } = await api.post("/upload/reel-video/presign-put", payload);
    return data;
};

// ─── CRUD ────────────────────────────────────────────────────────────────────

const createReel = async (payload: CreateReelPayload): Promise<Reel> => {
    const { data } = await api.post<{ success: boolean; reel: BackendReel }>("/reels", payload);
    return mapReel(data.reel);
};

const getReelFeed = async ({
    pageParam = null,
}: {
    pageParam?: string | null;
}): Promise<ReelFeedResult> => {
    const { data } = await api.get<{
        success: boolean;
        reels: BackendReel[];
        hasMore: boolean;
        nextCursor: string | null;
    }>("/reels/feed", {
        params: { cursor: pageParam || undefined, limit: 10 },
    });

    return {
        reels: data.reels.map(mapReel),
        hasMore: data.hasMore,
        nextCursor: data.nextCursor,
    };
};

const getReelById = async (reelId: string): Promise<Reel> => {
    const { data } = await api.get<{ success: boolean; reel: BackendReel }>(`/reels/${reelId}`);
    return mapReel(data.reel);
};

const getMyReels = async ({
    pageParam = null,
}: {
    pageParam?: string | null;
}): Promise<ReelFeedResult> => {
    const { data } = await api.get<{
        success: boolean;
        reels: BackendReel[];
        hasMore: boolean;
        nextCursor: string | null;
    }>("/reels/me", {
        params: { cursor: pageParam || undefined, limit: 10 },
    });

    return {
        reels: data.reels.map(mapReel),
        hasMore: data.hasMore,
        nextCursor: data.nextCursor,
    };
};

const toggleLike = async (reelId: string): Promise<{ liked: boolean; likeCount: number }> => {
    const { data } = await api.post<{ success: boolean; liked: boolean; likeCount: number }>(
        `/reels/${reelId}/like`
    );
    return { liked: data.liked, likeCount: data.likeCount };
};

const incrementView = async (reelId: string): Promise<void> => {
    await api.post(`/reels/${reelId}/view`);
};

const addComment = async (
    reelId: string,
    payload: { content: string; replyToCommentId?: string }
): Promise<ReelComment> => {
    const { data } = await api.post<{ success: boolean; comment: BackendReelComment }>(
        `/reels/${reelId}/comments`,
        payload
    );
    return mapComment(data.comment);
};

const getComments = async (
    reelId: string,
    { pageParam = null }: { pageParam?: string | null } = {}
): Promise<ReelCommentsResult> => {
    const { data } = await api.get<{
        success: boolean;
        comments: BackendReelComment[];
        hasMore: boolean;
        nextCursor: string | null;
    }>(`/reels/${reelId}/comments`, {
        params: { cursor: pageParam || undefined, limit: 20 },
    });

    return {
        comments: data.comments.map(mapComment),
        hasMore: data.hasMore,
        nextCursor: data.nextCursor,
    };
};

const deleteReel = async (reelId: string): Promise<void> => {
    await api.delete(`/reels/${reelId}`);
};

export const reelService = {
    getReelVideoUploadUrl,
    createReel,
    getReelFeed,
    getReelById,
    getMyReels,
    toggleLike,
    incrementView,
    addComment,
    getComments,
    deleteReel,
};
