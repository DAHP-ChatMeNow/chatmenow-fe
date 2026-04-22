import api from "@/lib/axios";
import { Post, PostPrivacy } from "@/types/post";
import { Comment } from "@/types/comment";
import { User } from "@/types/user";
import { userService } from "@/services/user";

export type CreatePostPayload = {
  content: string;
  privacy?: PostPrivacy;
  customAudienceIds?: string[];
  mediaFiles?: File[];
  videoDurations?: number[];
};

export type UpdatePostPrivacyPayload = {
  privacy: PostPrivacy;
  customAudienceIds?: string[];
};

export type SharePostPayload = {
  content?: string;
  privacy?: PostPrivacy;
  customAudienceIds?: string[];
};

export type SharePostToChatPayload = {
  conversationId: string;
  content?: string;
};

interface BackendPost {
  id?: string;
  _id: string;
  authorId: User | string;
  content: string;
  privacy: PostPrivacy | string;
  customAudienceIds?: Array<string | { _id?: string; id?: string }>;
  media?: Array<{ url: string; type: string; duration?: number }>;
  likesCount: number;
  commentsCount: number;
  trendingScore: number;
  isLikedByCurrentUser?: boolean;
  sharedPostId?: string | { _id?: string; id?: string };
  sharedPost?: Partial<BackendPost> & {
    isAccessible?: boolean;
    sourcePostId?: string | { _id?: string; id?: string };
    openPostId?: string | { _id?: string; id?: string };
    originalPostId?: string | { _id?: string; id?: string };
  };
  createdAt: Date;
  updatedAt?: Date;
}

const isSignedS3ViewUrl = (value?: string): boolean => {
  if (!value || !/^https?:\/\//i.test(value)) return false;

  try {
    const parsed = new URL(value);
    return parsed.searchParams.has("X-Amz-Algorithm");
  } catch {
    return false;
  }
};

const extractS3ObjectKey = (value?: string): string | null => {
  if (!value || !/^https?:\/\//i.test(value)) return null;

  try {
    const parsed = new URL(value);
    const rawPath = decodeURIComponent(parsed.pathname || "").replace(
      /^\/+/,
      "",
    );
    return rawPath || null;
  } catch {
    return null;
  }
};

const refreshPostMediaUrls = async (
  media?: Array<{ url: string; type: string; duration?: number }>,
) => {
  if (!media?.length) return media;

  const cache = new Map<string, string>();

  return Promise.all(
    media.map(async (item) => {
      if (!isSignedS3ViewUrl(item.url)) return item;

      const key = extractS3ObjectKey(item.url);
      if (!key) return item;

      if (cache.has(key)) {
        return { ...item, url: cache.get(key)! };
      }

      try {
        const presigned = await userService.getPresignedUrl(key);
        if (presigned?.viewUrl) {
          cache.set(key, presigned.viewUrl);
          return { ...item, url: presigned.viewUrl };
        }
      } catch {
        // Keep original URL when refresh fails to avoid breaking render.
      }

      return item;
    }),
  );
};

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

export interface ResolveOriginalPostResult {
  sourcePostId: string;
  originalPostId: string;
  isOriginal: boolean;
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

const normalizeCustomAudienceIds = (
  value?: BackendPost["customAudienceIds"],
): string[] => {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      if (typeof item === "string") return item;
      return item?._id || item?.id || "";
    })
    .filter(Boolean);
};

const toIdString = (
  value?: string | { _id?: string; id?: string } | null,
): string | undefined => {
  if (!value) return undefined;
  if (typeof value === "string") return value;
  return value._id || value.id;
};

const mapSharedPostReference = async (
  raw?: BackendPost["sharedPost"],
): Promise<Post["sharedPost"]> => {
  if (!raw || typeof raw !== "object") return undefined;

  const source = ((raw as any).postId &&
  typeof (raw as any).postId === "object"
    ? (raw as any).postId
    : raw) as BackendPost["sharedPost"] & Partial<BackendPost>;

  const sharedId = toIdString(
    (source as any)._id || (source as any).id || (raw as any).postId,
  );
  const sourcePostId = toIdString(
    (raw as any).sourcePostId ||
      (source as any).sourcePostId ||
      (raw as any).postId ||
      (source as any).postId ||
      sharedId,
  );
  const openPostId = toIdString(
    (raw as any).openPostId ||
      (source as any).openPostId ||
      (raw as any).originalPostId ||
      (source as any).originalPostId,
  );

  const authorRaw = source.authorId;
  const authorId =
    typeof authorRaw === "string"
      ? authorRaw
      : (authorRaw as any)?._id || (authorRaw as any)?.id;
  const hasAuthorData =
    typeof authorRaw === "string"
      ? authorRaw.trim().length > 0
      : Boolean(
          (authorRaw as any)?._id ||
            (authorRaw as any)?.id ||
            (authorRaw as any)?.displayName ||
            (authorRaw as any)?.avatar,
        );
  const normalizedContent = String(source.content || "");
  const hasContent = normalizedContent.trim().length > 0;
  const hasMedia = Array.isArray(source.media) && source.media.length > 0;
  const hasPrivacy = typeof source.privacy !== "undefined";
  const hasShareHint =
    Boolean(sharedId) ||
    Boolean(sourcePostId) ||
    Boolean(openPostId) ||
    hasAuthorData ||
    hasContent ||
    hasMedia ||
    hasPrivacy ||
    (source as any).isAccessible === false ||
    (raw as any).isAccessible === false;

  // Some API responses may include `sharedPost: {}` for non-shared posts.
  // In that case, skip mapping to avoid rendering a fake shared-post card.
  if (!hasShareHint) return undefined;

  const isAccessible =
    (source as any).isAccessible !== false && (raw as any).isAccessible !== false;

  if (!isAccessible) {
    return {
      id: sharedId,
      _id: sharedId,
      sourcePostId: sourcePostId || sharedId,
      openPostId: openPostId || sourcePostId || sharedId,
      isAccessible: false,
    };
  }

  return {
    id: sharedId,
    _id: sharedId,
    sourcePostId: sourcePostId || sharedId,
    openPostId: openPostId || sourcePostId || sharedId,
    isAccessible: true,
    authorId,
    author: typeof authorRaw === "string" ? undefined : (authorRaw as User),
    content: normalizedContent,
    privacy: source.privacy,
    media: await refreshPostMediaUrls(source.media),
    createdAt: source.createdAt,
    updatedAt: source.updatedAt,
  };
};

const mapBackendPost = async (post: BackendPost): Promise<Post> => {
  const sharedPostId = toIdString(
    post.sharedPostId ||
      (post.sharedPost as any)?._id ||
      (post.sharedPost as any)?.id ||
      (post.sharedPost as any)?.postId?._id ||
      (post.sharedPost as any)?.postId?.id,
  );

  return {
    id: post._id,
    _id: post._id,
    authorId: (post.authorId as any)?._id || post.authorId,
    author: typeof post.authorId === "string" ? undefined : (post.authorId as User),
    content: post.content,
    privacy: post.privacy,
    customAudienceIds: normalizeCustomAudienceIds(post.customAudienceIds),
    media: await refreshPostMediaUrls(post.media),
    likesCount: post.likesCount || 0,
    commentsCount: post.commentsCount || 0,
    trendingScore: post.trendingScore || 0,
    isLikedByCurrentUser: post.isLikedByCurrentUser || false,
    sharedPostId,
    sharedPost: await mapSharedPostReference(post.sharedPost),
    createdAt: post.createdAt,
    updatedAt: post.updatedAt,
  };
};

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

  const posts: Post[] = await Promise.all(data.posts.map(mapBackendPost));

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
  if (payload.customAudienceIds && payload.customAudienceIds.length > 0) {
    formData.append(
      "customAudienceIds",
      JSON.stringify(payload.customAudienceIds),
    );
  }

  if (payload.mediaFiles && payload.mediaFiles.length > 0) {
    payload.mediaFiles.forEach((file) => formData.append("media", file));
    if (payload.videoDurations && payload.videoDurations.length > 0) {
      payload.videoDurations.forEach((d) =>
        formData.append("videoDurations[]", String(d)),
      );
    }
  }

  const { data } = await api.post<BackendPost | { post: BackendPost }>(
    "/posts",
    formData,
    {
      headers: { "Content-Type": "multipart/form-data" },
    },
  );

  return mapBackendPost(((data as any)?.post || data) as BackendPost);
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

  const posts: Post[] = await Promise.all(data.posts.map(mapBackendPost));

  return {
    posts,
    hasMore: data.posts.length === 12,
    nextPage: pageParam + 1,
  };
};

const getUserPosts = async ({
  userId,
  pageParam = 1,
}: {
  userId: string;
  pageParam?: number;
}) => {
  const { data } = await api.get<{
    success?: boolean;
    posts?: BackendPost[];
    total?: number;
    page?: number;
    limit?: number;
  }>(`/posts/user/${userId}`, {
    params: { page: pageParam, limit: 10 },
  });

  const backendPosts = Array.isArray(data?.posts) ? data.posts : [];
  const posts: Post[] = await Promise.all(backendPosts.map(mapBackendPost));

  return {
    posts,
    hasMore: backendPosts.length === 10,
    nextPage: pageParam + 1,
  };
};

const updatePostPrivacy = async (
  postId: string,
  payload: UpdatePostPrivacyPayload,
) => {
  const { data } = await api.patch<BackendPost | { post: BackendPost }>(
    `/posts/${postId}/privacy`,
    {
      privacy: payload.privacy,
      customAudienceIds: payload.customAudienceIds || [],
    },
  );

  return mapBackendPost(((data as any)?.post || data) as BackendPost);
};

const deletePost = async (postId: string) => {
  const { data } = await api.delete<{ success?: boolean; message?: string }>(
    `/posts/${postId}`,
  );
  return data;
};

const sharePost = async (postId: string, payload: SharePostPayload) => {
  const { data } = await api.post<any>(`/posts/${postId}/share`, {
    content: payload.content || "",
    privacy: payload.privacy || "public",
    customAudienceIds: payload.customAudienceIds || [],
  });

  const backendPost = (data?.post || data?.sharedPost || data?.data?.post || data) as BackendPost;
  if (backendPost?._id) {
    return mapBackendPost(backendPost);
  }
  return data;
};

const sharePostToChat = async (postId: string, payload: SharePostToChatPayload) => {
  const { data } = await api.post<any>(`/posts/${postId}/share-to-chat`, {
    conversationId: payload.conversationId,
    content: payload.content || "",
  });
  return data;
};

const resolveOriginalPost = async (
  postId: string,
): Promise<ResolveOriginalPostResult> => {
  const normalizedPostId = String(postId || "").trim();
  if (!normalizedPostId) {
    throw new Error("postId is required");
  }

  const { data } = await api.get<any>(`/post/${normalizedPostId}/original`);
  const payload =
    data?.data && typeof data.data === "object" ? data.data : data || {};

  const sourcePostId = String(
    payload.sourcePostId || normalizedPostId,
  ).trim();
  const originalPostId = String(
    payload.originalPostId || payload.openPostId || sourcePostId,
  ).trim();

  return {
    sourcePostId,
    originalPostId: originalPostId || sourcePostId,
    isOriginal: Boolean(payload.isOriginal),
  };
};

export const postService = {
  getFeed,
  createPost,
  updatePostPrivacy,
  deletePost,
  likePost,
  unlikePost,
  getComments,
  addComment,
  sendPostAiChat,
  getMyPosts,
  getUserPosts,
  sharePost,
  sharePostToChat,
  resolveOriginalPost,
};
