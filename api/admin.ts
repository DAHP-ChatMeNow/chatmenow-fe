import api from "@/lib/axios";
import { AccountStatus } from "@/types/user";
import { userService, UpdateAccountStatusPayload } from "@/api/user";

// ===================== Users =====================
export interface AdminUser {
  _id: string;
  id: string;
  displayName: string;
  email: string;
  phone?: string;
  avatar?: string;
  role: string;
  isActive: boolean;
  accountStatus?: AccountStatus;
  suspendedUntil?: string;
  statusReason?: string;
  isPremium?: boolean;
  createdAt: string;
}

export interface AdminUsersResponse {
  success: boolean;
  users: AdminUser[];
  total: number;
  offset?: number;
  limit?: number;
  page: number;
  totalPages: number;
  hasNext?: boolean;
  hasPrev?: boolean;
}

export type AdminUserRoleFilter = "all" | "user" | "admin";
export type AdminUserStatusFilter =
  | "all"
  | "active"
  | "suspended"
  | "locked"
  | "inactive"
  | "premium";
export type AdminUserSortBy =
  | "newest"
  | "oldest"
  | "name_asc"
  | "name_desc"
  | "online_first";

export interface AdminUsersQueryParams {
  offset?: number;
  limit?: number;
  search?: string;
  role?: AdminUserRoleFilter;
  status?: AdminUserStatusFilter;
  sortBy?: AdminUserSortBy;
  dateFrom?: string;
  dateTo?: string;
  // Keep for backward compatibility if an old caller still passes page.
  page?: number;
}

const getUsers = async ({
  offset = 0,
  limit = 7,
  search = "",
  role = "all",
  status = "all",
  sortBy = "newest",
  dateFrom = "",
  dateTo = "",
  page,
}: AdminUsersQueryParams = {}) => {
  const safeLimit = Math.min(Math.max(limit, 1), 100);
  const safeOffset = Math.max(offset, 0);
  const fallbackPage = Math.floor(safeOffset / safeLimit) + 1;

  const { data } = await api.get<AdminUsersResponse>("/users/all", {
    params: {
      offset: safeOffset,
      limit: safeLimit,
      search,
      role,
      status,
      sortBy,
      ...(dateFrom ? { dateFrom } : {}),
      ...(dateTo ? { dateTo } : {}),
      page: page ?? fallbackPage,
    },
  });
  return data;
};

const toggleUserActive = async (userId: string, isActive: boolean) => {
  const { data } = await api.patch(`/admin/users/${userId}`, { isActive });
  return data;
};

const updateUserAccountStatus = async (
  userId: string,
  payload: UpdateAccountStatusPayload,
) => {
  return userService.updateAccountStatus(userId, payload);
};

const getUserFriends = async (userId: string) => {
  const { data } = await api.get<{
    success: boolean;
    friends: any[];
    total: number;
  }>(`/users/${userId}/contacts`);
  return data;
};

const removeUserFriend = async (userId: string, friendId: string) => {
  const { data } = await api.delete<{
    success: boolean;
    message: string;
  }>(`/admin/users/${userId}/friends/${friendId}`);
  return data;
};

// ===================== Posts =====================
export interface AdminPost {
  _id: string;
  id: string;
  content: string;
  author: { _id: string; displayName: string; email: string; avatar?: string };
  media?: { url: string; type: string }[];
  likesCount: number;
  commentsCount: number;
  privacy: string;
  status?: string; // "pending" | "approved" | "rejected"
  createdAt: string;
}

export interface AdminPostsResponse {
  success?: boolean;
  posts: AdminPost[];
  total: number;
  page: number;
  totalPages: number;
}

interface BackendAdminPostAuthor {
  _id?: string;
  id?: string;
  displayName?: string;
  email?: string;
  avatar?: string;
}

interface BackendAdminPost extends Omit<AdminPost, "author" | "id"> {
  id?: string;
  author?: BackendAdminPostAuthor;
  authorId?: BackendAdminPostAuthor | string;
}

interface BackendAdminPostsResponse {
  success?: boolean;
  posts: BackendAdminPost[];
  total: number;
  page: number;
  totalPages: number;
}

const normalizeAdminPost = (post: BackendAdminPost): AdminPost => {
  const sourceAuthor =
    (post.author && typeof post.author === "object"
      ? post.author
      : undefined) ||
    (typeof post.authorId === "object" && post.authorId
      ? post.authorId
      : undefined);

  const authorId = sourceAuthor?._id || sourceAuthor?.id || "";

  return {
    ...post,
    id: post.id || post._id,
    author: {
      _id: authorId,
      displayName: sourceAuthor?.displayName || "Unknown user",
      email: sourceAuthor?.email || "",
      avatar: sourceAuthor?.avatar,
    },
  };
};

export interface AdminPostDetailResponse {
  success?: boolean;
  post: AdminPost;
}

export interface AdminPostStatsTopPost {
  _id: string;
  id?: string;
  content?: string;
  likesCount?: number;
  commentsCount?: number;
  privacy?: string;
  createdAt?: string;
  author?: {
    _id?: string;
    displayName?: string;
    avatar?: string;
  };
  authorId?: {
    _id?: string;
    displayName?: string;
    avatar?: string;
  };
}

export interface AdminPostsStatsResponse {
  success?: boolean;
  stats?: Partial<Omit<AdminPostsStatsResponse, "stats">>;
  rangeDays: number;
  totalPosts: number;
  postsInRange: number;
  totalLikes: number;
  totalComments: number;
  avgLikesPerPost: number;
  avgCommentsPerPost: number;
  privacyStats?: {
    public?: number;
    friends?: number;
    custom?: number;
    private?: number;
  };
  postsPerDay?: Array<{
    date: string;
    count: number;
  }>;
  topPosts?: AdminPostStatsTopPost[];
}

export interface AdminPostLikeUser {
  _id: string;
  displayName: string;
  avatar?: string;
  isOnline?: boolean;
  lastSeen?: string;
}

export interface AdminPostLikesResponse {
  success: boolean;
  users: AdminPostLikeUser[];
  total: number;
  page: number;
  limit: number;
}

export interface AdminPostComment {
  _id: string;
  postId: string;
  userId?: {
    _id: string;
    displayName: string;
    avatar?: string;
  };
  authorSource?: "user" | "ai";
  content: string;
  createdAt: string;
}

export interface AdminPostCommentsResponse {
  success: boolean;
  comments: AdminPostComment[];
  total: number;
  page: number;
  limit: number;
}

export type AdminPostPrivacy = "public" | "friends" | "custom" | "private";
export type AdminPostSortBy = "createdAt" | "likesCount" | "commentsCount";
export type AdminPostSortOrder = "asc" | "desc";

export interface AdminPostsQueryParams {
  page?: number;
  limit?: number;
  q?: string;
  privacy?: AdminPostPrivacy | "";
  authorId?: string;
  sortBy?: AdminPostSortBy;
  sortOrder?: AdminPostSortOrder;
}

export interface AdminPostInteractionsQueryParams {
  page?: number;
  limit?: number;
  authorSource?: "user" | "ai";
}

const getPosts = async ({
  page = 1,
  limit = 20,
  q = "",
  privacy = "",
  authorId = "",
  sortBy = "createdAt",
  sortOrder = "desc",
}: AdminPostsQueryParams = {}) => {
  const { data } = await api.get<BackendAdminPostsResponse>(
    "/posts/admin/all",
    {
      params: {
        page,
        limit,
        ...(q ? { q } : {}),
        ...(privacy ? { privacy } : {}),
        ...(authorId ? { authorId } : {}),
        sortBy,
        sortOrder,
      },
    },
  );

  return {
    ...data,
    posts: (data.posts || []).map(normalizeAdminPost),
  } satisfies AdminPostsResponse;
};

const getPostDetail = async (postId: string) => {
  const { data } = await api.get<{ success?: boolean; post: BackendAdminPost }>(
    `/posts/admin/${postId}`,
  );
  return {
    ...data,
    post: normalizeAdminPost(data.post),
  } satisfies AdminPostDetailResponse;
};

const getPostLikes = async (
  postId: string,
  {
    page = 1,
    limit = 20,
  }: Omit<AdminPostInteractionsQueryParams, "authorSource"> = {},
) => {
  const { data } = await api.get<AdminPostLikesResponse>(
    `/posts/admin/${postId}/likes`,
    {
      params: { page, limit },
    },
  );
  return data;
};

const getPostComments = async (
  postId: string,
  { page = 1, limit = 20, authorSource }: AdminPostInteractionsQueryParams = {},
) => {
  const { data } = await api.get<AdminPostCommentsResponse>(
    `/posts/admin/${postId}/comments`,
    {
      params: {
        page,
        limit,
        ...(authorSource ? { authorSource } : {}),
      },
    },
  );
  return data;
};

const updatePostPrivacy = async (postId: string, privacy: AdminPostPrivacy) => {
  const { data } = await api.patch(`/posts/admin/${postId}/privacy`, {
    privacy,
  });
  return data;
};

const deletePost = async (postId: string) => {
  const { data } = await api.delete(`/posts/admin/${postId}`);
  return data;
};

const getPostStats = async (days: number = 30) => {
  const safeDays = Math.min(365, Math.max(1, Number(days) || 30));
  const { data } = await api.get<AdminPostsStatsResponse>(
    "/posts/admin/stats",
    {
      params: { days: safeDays },
    },
  );

  const stats = data?.stats || {};
  return {
    success: data?.success,
    rangeDays:
      Number(stats.rangeDays ?? data?.rangeDays ?? safeDays) || safeDays,
    totalPosts: Number(stats.totalPosts ?? data?.totalPosts ?? 0) || 0,
    postsInRange: Number(stats.postsInRange ?? data?.postsInRange ?? 0) || 0,
    totalLikes: Number(stats.totalLikes ?? data?.totalLikes ?? 0) || 0,
    totalComments: Number(stats.totalComments ?? data?.totalComments ?? 0) || 0,
    avgLikesPerPost:
      Number(stats.avgLikesPerPost ?? data?.avgLikesPerPost ?? 0) || 0,
    avgCommentsPerPost:
      Number(stats.avgCommentsPerPost ?? data?.avgCommentsPerPost ?? 0) || 0,
    privacyStats: stats.privacyStats ??
      data?.privacyStats ?? {
      public: 0,
      friends: 0,
      custom: 0,
      private: 0,
    },
    postsPerDay: stats.postsPerDay ?? data?.postsPerDay ?? [],
    topPosts: stats.topPosts ?? data?.topPosts ?? [],
  } satisfies AdminPostsStatsResponse;
};

// ===================== Stats =====================
export interface AdminStats {
  totalUsers: number;
  activeUsers: number;
  totalPosts: number;
  pendingPosts: number;
  newUsersToday: number;
  newPostsToday: number;
}

const getStats = async () => {
  const { data } = await api.get<{ stats: AdminStats }>("/admin/stats");
  return data.stats;
};

export const adminService = {
  getUsers,
  toggleUserActive,
  updateUserAccountStatus,
  getUserFriends,
  removeUserFriend,
  getPosts,
  getPostDetail,
  getPostLikes,
  getPostComments,
  updatePostPrivacy,
  deletePost,
  getPostStats,
  getStats,
};
