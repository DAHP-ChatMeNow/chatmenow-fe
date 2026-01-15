import api from "@/lib/axios";
import { Post } from "@/types/post";
import { Comment } from "@/types/comment";
import { User } from "@/types/user";

export type CreatePostPayload = {
  content: string;
  media?: Array<{ url: string; type: string; duration?: number }>;
  privacy?: "public" | "friends" | "private";
};

interface BackendPost {
  id: string;
  _id: string;
  authorId: User; 
  content: string;
  privacy: string;
  media?: Array<{ url: string; type: string; duration?: number }>;
  likesCount: number;
  commentsCount: number;
  trendingScore: number;
  isLikedByCurrentUser?: boolean;
  createdAt: Date;
  updatedAt?: Date;
}

interface BackendComment {
  _id: string;
  postId: string;
  userId: User | string;
  content: string;
  createdAt: Date;
  updatedAt?: Date;
}

const mapComment = (c: BackendComment): Comment => ({
  id: c._id,
  _id: c._id,
  postId: c.postId,
  userId: typeof c.userId === "string" ? c.userId : (c.userId?._id || ""),
  user: typeof c.userId === "string" ? undefined : (c.userId as User),
  content: c.content,
  createdAt: c.createdAt,
  updatedAt: c.updatedAt,
});

const getFeed = async ({ pageParam = 1 }: { pageParam?: number }) => {
  const { data } = await api.get<{ success: boolean; posts: BackendPost[]; total: number; page: number; limit: number }>("/posts/feed", { 
    params: { 
      page: pageParam, 
      limit: 10 
    } 
  });
  
  const posts: Post[] = data.posts.map((post) => ({
    id: post._id,
    _id: post._id,
    // authorId is populated from backend, so it's an object
    authorId: (post.authorId as any)?._id || post.authorId,
    author: post.authorId as User, 
    content: post.content,
    privacy: post.privacy,
    media: post.media,
    likesCount: post.likesCount || 0,
    commentsCount: post.commentsCount || 0,
    trendingScore: post.trendingScore || 0,
    isLikedByCurrentUser: post.isLikedByCurrentUser || false,
    createdAt: post.createdAt,
    updatedAt: post.updatedAt,
  }));
  
  return {
    posts,
    hasMore: data.posts.length === 10, 
    nextPage: pageParam + 1,
  };
};

const createPost = async (payload: CreatePostPayload) => {
  const { data } = await api.post<BackendPost>("/posts", payload);
  
  // Backend populates authorId, so it's an object
  const post: Post = {
    id: data._id,
    _id: data._id,
    authorId: (data.authorId as any)?._id || data.authorId,
    author: data.authorId as User,
    content: data.content,
    privacy: data.privacy,
    media: data.media,
    likesCount: data.likesCount || 0,
    commentsCount: data.commentsCount || 0,
    isLikedByCurrentUser: false, // Just created post, current user hasn't liked it
    trendingScore: data.trendingScore || 0,
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
  };
  
  return post;
};

const likePost = async (postId: string) => {
  const { data } = await api.put(`/posts/${postId}/like`);
  return data;
};

const unlikePost = async (postId: string) => {
  const { data } = await api.delete(`/posts/${postId}/like`);
  return data;
};

const getComments = async (postId: string) => {
  const { data } = await api.get<{ success: boolean; comments: BackendComment[] }>(`/posts/${postId}/comments`);
  return data.comments.map(mapComment);
};

const addComment = async (postId: string, content: string) => {
  const { data } = await api.post<BackendComment>(`/posts/${postId}/comments`, { content });
  return mapComment(data);
};

export const postService = { getFeed, createPost, likePost, unlikePost, getComments, addComment };
