import { User } from './user';

export type PostPrivacy = "public" | "friends" | "custom" | "private";

export interface PostMedia {
  url: string;
  type: string;
  duration?: number;
}

export interface SharedPostReference {
  id?: string;
  _id?: string;
  isAccessible?: boolean;
  authorId?: string | User;
  author?: User;
  content?: string;
  privacy?: PostPrivacy | string;
  media?: PostMedia[];
  createdAt?: Date | string;
  updatedAt?: Date | string;
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
  sharedPostId?: string;
  sharedPost?: SharedPostReference | null;
  createdAt: Date;
  updatedAt?: Date;
}
