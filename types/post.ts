import { User } from './user';

export type PostPrivacy = "public" | "friends" | "custom" | "private";

export interface PostMedia {
  url: string;
  type: string;
  duration?: number;
}

export interface Post {
  id: string;
  _id: string;
  authorId: string;
  author?: User; 
  content: string;
  privacy: PostPrivacy | string;
  customAudienceIds?: string[];
  media?: PostMedia[];
  likesCount: number;
  commentsCount: number;
  trendingScore: number;
  isLikedByCurrentUser?: boolean; // Whether current user has liked this post
  createdAt: Date;
  updatedAt?: Date;
}
