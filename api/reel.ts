import api from "@/lib/axios";
import { Reel, ReelFeedPage } from "@/types/reel";
import { User } from "@/types/user";

// ─── Backend raw shape ───────────────────────────────────────────────────────

interface BackendReel {
  _id:       string;
  id?:       string;
  authorId:  User | string;
  videoUrl:  string;
  thumbnail: string | null;
  caption:   string;
  duration:  number;
  privacy:   "public" | "friends" | "private";
  stats: {
    likesCount:    number;
    commentsCount: number;
    sharesCount:   number;
    viewsCount:    number;
  };
  ranking: {
    trendingScore:   number;
    watchTimeTotal:  number;
    avgWatchPercent: number;
  };
  likesCount?:          number;
  commentsCount?:       number;
  viewsCount?:          number;
  isLikedByCurrentUser: boolean;
  createdAt: Date;
  updatedAt?: Date;
}

// ─── Mapper ──────────────────────────────────────────────────────────────────

const mapReel = (raw: BackendReel): Reel => ({
  id:        raw._id,
  _id:       raw._id,
  authorId:  (raw.authorId as User)?._id || (raw.authorId as string),
  author:    typeof raw.authorId === "object" ? (raw.authorId as User) : undefined,
  videoUrl:  raw.videoUrl,
  thumbnail: raw.thumbnail,
  caption:   raw.caption,
  duration:  raw.duration || 0,
  privacy:   raw.privacy,
  stats:     raw.stats ?? { likesCount: 0, commentsCount: 0, sharesCount: 0, viewsCount: 0 },
  ranking:   raw.ranking ?? { trendingScore: 0, watchTimeTotal: 0, avgWatchPercent: 0 },
  // convenience aliases
  likesCount:           raw.stats?.likesCount    ?? raw.likesCount    ?? 0,
  commentsCount:        raw.stats?.commentsCount ?? raw.commentsCount ?? 0,
  viewsCount:           raw.stats?.viewsCount    ?? raw.viewsCount    ?? 0,
  isLikedByCurrentUser: raw.isLikedByCurrentUser ?? false,
  createdAt: raw.createdAt,
  updatedAt: raw.updatedAt,
});

// ─── API Functions ───────────────────────────────────────────────────────────

/**
 * Fetch cursor-based reel feed.
 * pageParam is the base64 cursor string (or undefined for first page).
 */
const getReelFeed = async ({ pageParam }: { pageParam?: string }): Promise<ReelFeedPage> => {
  const { data } = await api.get<{
    success: boolean;
    data: {
      reels:      BackendReel[];
      nextCursor: string | null;
      hasMore:    boolean;
    };
  }>("/reels/feed", {
    params: pageParam ? { cursor: pageParam } : undefined,
  });

  return {
    reels:      data.data.reels.map(mapReel),
    nextCursor: data.data.nextCursor,
    hasMore:    data.data.hasMore,
  };
};

/**
 * Upload video + create reel in one call.
 * Sends multipart/form-data with field "video".
 */
const createReel = async (payload: {
  caption:  string;
  privacy?: "public" | "friends" | "private";
  duration: number;
  videoFile: File;
}): Promise<Reel> => {
  const formData = new FormData();
  formData.append("video", payload.videoFile);
  formData.append("caption",  payload.caption  || "");
  formData.append("privacy",  payload.privacy  || "public");
  formData.append("duration", String(payload.duration));

  const { data } = await api.post<{ success: boolean; data: BackendReel }>(
    "/reels",
    formData,
    { headers: { "Content-Type": "multipart/form-data" } }
  );

  return mapReel(data.data);
};

/**
 * Delete own reel.
 */
const deleteReel = async (reelId: string): Promise<void> => {
  await api.delete(`/reels/${reelId}`);
};

/**
 * Like a reel.
 */
const likeReel = async (reelId: string): Promise<{ isLikedByCurrentUser: boolean; likesCount: number }> => {
  const { data } = await api.post<{ success: boolean; data: { isLikedByCurrentUser: boolean; likesCount: number } }>(
    `/reels/${reelId}/like`
  );
  return data.data;
};

/**
 * Unlike a reel.
 */
const unlikeReel = async (reelId: string): Promise<{ isLikedByCurrentUser: boolean; likesCount: number }> => {
  const { data } = await api.delete<{ success: boolean; data: { isLikedByCurrentUser: boolean; likesCount: number } }>(
    `/reels/${reelId}/like`
  );
  return data.data;
};

/**
 * Record a view. Optionally send watchSeconds for analytics.
 */
const addReelView = async (reelId: string, watchSeconds = 0): Promise<void> => {
  await api.post(`/reels/${reelId}/view`, { watchSeconds });
};

/**
 * Get all reels of a specific user.
 */
const getUserReels = async (userId: string): Promise<Reel[]> => {
  const { data } = await api.get<{ success: boolean; data: BackendReel[] }>(
    `/reels/user/${userId}`
  );
  return data.data.map(mapReel);
};

// ─── Export ──────────────────────────────────────────────────────────────────

export const reelApiService = {
  getReelFeed,
  createReel,
  deleteReel,
  likeReel,
  unlikeReel,
  addReelView,
  getUserReels,
};
