import api from "@/lib/axios";

// ===================== Users =====================
export interface AdminUser {
  _id: string;
  id: string;
  displayName: string;
  email: string;
  avatar?: string;
  role: string;
  isActive: boolean;
  createdAt: string;
}

export interface AdminUsersResponse {
  users: AdminUser[];
  total: number;
  page: number;
  totalPages: number;
}

const getUsers = async (page = 1, limit = 20, search = "") => {
  const { data } = await api.get<AdminUsersResponse>("/admin/users", {
    params: { page, limit, search },
  });
  return data;
};

const toggleUserActive = async (userId: string, isActive: boolean) => {
  const { data } = await api.patch(`/admin/users/${userId}`, { isActive });
  return data;
};

const deleteUser = async (userId: string) => {
  const { data } = await api.delete(`/admin/users/${userId}`);
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
  posts: AdminPost[];
  total: number;
  page: number;
  totalPages: number;
}

const getPosts = async (page = 1, limit = 20, status = "") => {
  const { data } = await api.get<AdminPostsResponse>("/admin/posts", {
    params: { page, limit, ...(status ? { status } : {}) },
  });
  return data;
};

const approvePost = async (postId: string) => {
  const { data } = await api.patch(`/admin/posts/${postId}/approve`);
  return data;
};

const rejectPost = async (postId: string, reason?: string) => {
  const { data } = await api.patch(`/admin/posts/${postId}/reject`, { reason });
  return data;
};

const deletePost = async (postId: string) => {
  const { data } = await api.delete(`/admin/posts/${postId}`);
  return data;
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
  deleteUser,
  getPosts,
  approvePost,
  rejectPost,
  deletePost,
  getStats,
};
