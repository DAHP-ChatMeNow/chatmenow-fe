import api from "@/lib/axios";
import { Post } from "@/types/post";
import { Comment } from "@/types/comment";
import { User } from "@/types/user";

export type CreatePostPayload = {
  content: string;
  privacy?: "public" | "friends" | "private";
  mediaFiles?: File[];
  videoDurations?: number[];
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
  userId?: User | string;
  authorSource?: "user" | "ai";
  content: string;
  replyToCommentId?: string;
  createdAt: Date;
  updatedAt?: Date;
}

export interface AddCommentPayload {
  content: string;
  replyToCommentId?: string;
}

export interface AddCommentResult {
  postId: string;
  comments: Comment[];
}

export interface AiSuggestion {
  text: string;
  options: string[];
  suggestedUserPrompt?: string;
  autoSend?: boolean;
  action?: string;
}

export interface PostCommentsResult {
  comments: Comment[];
  aiSuggestion?: AiSuggestion;
}

export interface PostAiChatPayload {
  content: string;
  conversationId?: string;
}

export interface PostAiChatResult {
  success: boolean;
  message?: string;
  reply?: string;
  options?: string[];
  conversationId?: string;
  conversation?: {
    id: string;
  };
  userMessage?: {
    id?: string;
    content: string;
  };
  aiMessage?: {
    id?: string;
    content: string;
  };
}

const normalizeSuggestionOptions = (raw: unknown): string[] => {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter(Boolean);
};

const normalizeString = (raw: unknown): string | undefined => {
  if (typeof raw !== "string") return undefined;
  const text = raw.trim();
  return text || undefined;
};

const pickAiSuggestion = (raw: any): AiSuggestion | undefined => {
  if (typeof raw?.aiSuggestion === "string") {
    const text = raw.aiSuggestion.trim();
    return text
      ? {
          text,
          options: [],
          action: "ask_ai_in_chat",
        }
      : undefined;
  }

  if (raw?.aiSuggestion && typeof raw.aiSuggestion === "object") {
    const value =
      typeof raw.aiSuggestion.text === "string"
        ? raw.aiSuggestion.text
        : typeof raw.aiSuggestion.content === "string"
          ? raw.aiSuggestion.content
          : typeof raw.aiSuggestion.message === "string"
            ? raw.aiSuggestion.message
            : "";

    const text = value.trim();
    if (!text) return undefined;

    const options = normalizeSuggestionOptions(
      raw.aiSuggestion.options || raw.aiSuggestion.suggestions,
    );

    const suggestedUserPrompt = normalizeString(
      raw.aiSuggestion.suggestedUserPrompt,
    );

    const action = normalizeString(raw.aiSuggestion.action);

    return {
      text,
      options,
      suggestedUserPrompt,
      autoSend: raw.aiSuggestion.autoSend === true,
      action,
    };
  }

  return undefined;
};

const pickAiReply = (raw: any): string | undefined => {
  const candidates = [
    raw?.reply,
    raw?.aiReply,
    raw?.response,
    raw?.message,
    raw?.data?.reply,
    raw?.data?.aiReply,
    raw?.data?.response,
    raw?.assistantMessage?.content,
    raw?.aiMessage?.content,
  ];

  for (const candidate of candidates) {
    if (typeof candidate === "string") {
      const text = candidate.trim();
      if (text) return text;
    }
  }

  return undefined;
};

const pickChatMessage = (
  raw: any,
):
  | {
      id?: string;
      content: string;
    }
  | undefined => {
  if (!raw || typeof raw !== "object") return undefined;

  const content = normalizeString(raw.content || raw.message || raw.text);
  if (!content) return undefined;

  return {
    id: normalizeString(raw.id || raw._id),
    content,
  };
};

const mapComment = (c: BackendComment): Comment => ({
  id: c._id,
  _id: c._id,
  postId: c.postId,
  userId: typeof c.userId === "string" ? c.userId : c.userId?._id,
  user: typeof c.userId === "string" ? undefined : (c.userId as User),
  authorSource: c.authorSource,
  content: c.content,
  replyToCommentId: c.replyToCommentId,
  createdAt: c.createdAt,
  updatedAt: c.updatedAt,
});

const getFeed = async ({ pageParam = 1 }: { pageParam?: number }) => {
  const { data } = await api.get<{
    success: boolean;
    posts: BackendPost[];
    total: number;
    page: number;
    limit: number;
  }>("/posts/feed", {
    params: {
      page: pageParam,
      limit: 10,
    },
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
  const formData = new FormData();
  formData.append("content", payload.content);
  formData.append("privacy", payload.privacy || "public");

  if (payload.mediaFiles && payload.mediaFiles.length > 0) {
    payload.mediaFiles.forEach((file) => formData.append("media", file));
    if (payload.videoDurations && payload.videoDurations.length > 0) {
      payload.videoDurations.forEach((d) =>
        formData.append("videoDurations[]", String(d)),
      );
    }
  }

  const { data } = await api.post<BackendPost>("/posts", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });

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
  const { data } = await api.put<any>(`/posts/${postId}/like`);
  return {
    ...data,
    aiSuggestion: pickAiSuggestion(data),
  };
};

const unlikePost = async (postId: string) => {
  const { data } = await api.delete<any>(`/posts/${postId}/like`);
  return {
    ...data,
    aiSuggestion: pickAiSuggestion(data),
  };
};

const getComments = async (postId: string): Promise<PostCommentsResult> => {
  const { data } = await api.get<any>(`/posts/${postId}/comments`);

  return {
    comments: Array.isArray(data?.comments)
      ? data.comments
          .map(mapComment)
          .filter((comment: Comment) => comment.authorSource !== "ai")
      : [],
    aiSuggestion: pickAiSuggestion(data),
  };
};

const addComment = async (postId: string, payload: AddCommentPayload) => {
  const { data } = await api.post<any>(`/posts/${postId}/comments`, {
    content: payload.content,
    replyToCommentId: payload.replyToCommentId,
  });

  const commentsRaw: BackendComment[] = [];

  if (data?._id) {
    commentsRaw.push(data as BackendComment);
  }

  if (data?.comment?._id) {
    commentsRaw.push(data.comment as BackendComment);
  }

  if (data?.aiComment?._id) {
    commentsRaw.push(data.aiComment as BackendComment);
  }

  if (Array.isArray(data?.comments)) {
    commentsRaw.push(...(data.comments as BackendComment[]));
  }

  const deduped = Array.from(
    new Map(commentsRaw.map((comment) => [comment._id, comment])).values(),
  );

  return {
    postId,
    comments: deduped.map(mapComment),
  } satisfies AddCommentResult;
};

const sendPostAiChat = async (
  postId: string,
  payload: PostAiChatPayload,
): Promise<PostAiChatResult> => {
  const { data } = await api.post<any>(`/posts/${postId}/ai-chat`, {
    content: payload.content,
    conversationId: payload.conversationId,
  });

  const conversationId =
    typeof data?.conversationId === "string"
      ? data.conversationId
      : typeof data?.conversation?.id === "string"
        ? data.conversation.id
        : typeof data?.conversation?._id === "string"
          ? data.conversation._id
          : undefined;

  const userMessage = pickChatMessage(data?.userMessage);
  const aiMessage = pickChatMessage(data?.aiMessage || data?.assistantMessage);

  return {
    success: typeof data?.success === "boolean" ? data.success : true,
    message: typeof data?.message === "string" ? data.message : undefined,
    reply: aiMessage?.content || pickAiReply(data),
    options: normalizeSuggestionOptions(
      data?.options ||
        data?.suggestions ||
        data?.followUpOptions ||
        data?.aiMessage?.options,
    ),
    conversationId,
    conversation: conversationId ? { id: conversationId } : undefined,
    userMessage,
    aiMessage,
  };
};

const getMyPosts = async ({ pageParam = 1 }: { pageParam?: number }) => {
  const { data } = await api.get<{
    success: boolean;
    posts: BackendPost[];
    total: number;
    page: number;
    limit: number;
  }>("/posts/me", { params: { page: pageParam, limit: 12 } });

  const posts: Post[] = data.posts.map((post) => ({
    id: post._id,
    _id: post._id,
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
    hasMore: data.posts.length === 12,
    nextPage: pageParam + 1,
  };
};

export const postService = {
  getFeed,
  createPost,
  likePost,
  unlikePost,
  getComments,
  addComment,
  sendPostAiChat,
  getMyPosts,
};
