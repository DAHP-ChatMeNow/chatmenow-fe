import { User } from "./user";

export interface ReelStats {
  likesCount:    number;
  commentsCount: number;
  sharesCount:   number;
  viewsCount:    number;
}

export interface ReelRanking {
  trendingScore:   number;
  watchTimeTotal:  number;
  avgWatchPercent: number;
}

export interface Reel {
  id:        string;
  _id:       string;
  authorId:  string;
  author?:   User;
  videoUrl:  string;
  thumbnail: string | null;
  caption:   string;
  duration:  number;
  privacy:   "public" | "friends" | "private";
  stats:     ReelStats;
  ranking:   ReelRanking;
  // Convenience alias (mirrors stats for easier UI access)
  likesCount:    number;
  commentsCount: number;
  viewsCount:    number;
  isLikedByCurrentUser: boolean;
  createdAt: Date;
  updatedAt?: Date;
}

export interface ReelFeedPage {
  reels:      Reel[];
  nextCursor: string | null;
  hasMore:    boolean;
}
