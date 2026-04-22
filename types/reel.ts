import { User } from "./user";

export interface Reel {
    _id: string;
    id: string;
    userId: string | User;
    user?: User;
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

export interface ReelComment {
    _id: string;
    id: string;
    reelId: string;
    userId: string | User;
    user?: User;
    content: string;
    replyToCommentId?: string | null;
    isDeleted?: boolean;
    createdAt: Date | string;
}

export interface ReelFeedResult {
    reels: Reel[];
    hasMore: boolean;
    nextCursor: string | null;
}

export interface ReelCommentsResult {
    comments: ReelComment[];
    hasMore: boolean;
    nextCursor: string | null;
}

export interface CreateReelPayload {
    videoKey: string;
    videoDuration: number;
    caption?: string;
    musicUrl?: string | null;
    musicTitle?: string | null;
    musicArtist?: string | null;
}
