import api from "@/lib/axios";
import { User } from "@/types/user";

export interface UpdateProfilePayload {
  displayName?: string;
  bio?: string;
  language?: string;
  themeColor?: string;
}

export interface UpdateProfileResponse {
  user: User;
  message: string;
}

export interface UploadAvatarResponse {
  success: boolean;
  message: string;
  user: User;
  avatar: string; // S3 key (e.g., "avatars/xxx.jpg") - use getPresignedUrl() to display
}

export interface DeleteAvatarResponse {
  msg: string;
  user: User;
}

export interface PresignedUrlResponse {
  viewUrl: string;
  key: string;
  expiresIn: number;
}

export interface GetProfileResponse {
  success: boolean;
  user: User;
}

export const userService = {
  /**
   * Get current user profile
   */
  getProfile: async () => {
    const res = await api.get<GetProfileResponse>("/users/profile");
    return res.data.user; // Extract user from response
  },

  /**
   * Update user profile
   * @param data - Profile data to update
   */
  updateProfile: async (data: UpdateProfilePayload) => {
    const res = await api.put<UpdateProfileResponse>("/users/profile", data);
    return res.data;
  },

  /**
   * Upload user avatar to S3
   * @param file - Avatar image file
   */
  uploadAvatar: async (file: File) => {
    const formData = new FormData();
    formData.append("image", file);
    const res = await api.post<UploadAvatarResponse>(
      "/upload/avatar",
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      },
    );
    return res.data;
  },

  /**
   * Delete user avatar and reset to default
   */
  deleteAvatar: async () => {
    const res = await api.delete<DeleteAvatarResponse>("/upload/avatar");
    return res.data;
  },

  /**
   * Get presigned URL for viewing avatar/image
   * @param key - S3 object key (e.g., "avatars/1772192498360-hkg2p.jpg")
   */
  getPresignedUrl: async (key: string) => {
    const res = await api.get<PresignedUrlResponse>(
      `/upload/presign-get?key=${encodeURIComponent(key)}`,
    );
    return res.data;
  },

  /**
   * @deprecated Use uploadAvatar instead
   * Update user avatar - gửi file trực tiếp đến backend
   * Backend sẽ xử lý upload Cloudinary
   * @param file - Avatar image file
   */
  updateAvatar: async (file: File) => {
    const formData = new FormData();
    formData.append("avatar", file);
    const res = await api.put<UpdateProfileResponse>(
      "/users/avatar",
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      },
    );
    return res.data;
  },

  /**
   * Update user cover image - gửi file trực tiếp đến backend
   * Backend sẽ xử lý upload Cloudinary
   * @param file - Cover image file
   */
  updateCoverImage: async (file: File) => {
    const formData = new FormData();
    formData.append("coverImage", file);
    const res = await api.put<UpdateProfileResponse>("/users/cover", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
    return res.data;
  },

  /**
   * Get user by ID
   */
  getUserById: async (userId: string) => {
    const res = await api.get<User>(`/users/${userId}`);
    return res.data;
  },

  /**
   * Get user profile by ID (with friends list and full info)
   */
  getUserProfile: async (userId: string) => {
    const res = await api.get<{ success: boolean; user: User }>(
      `/users/${userId}`,
    );
    return res.data.user;
  },

  /**
   * Get current user's email from account
   */
  getUserEmail: async () => {
    const res = await api.get<{
      success: boolean;
      email: string;
      phoneNumber?: string;
      displayName: string;
    }>(`/users/me/email`);
    return res.data;
  },

  /**
   * Get user's email by user ID
   */
  getUserEmailById: async (userId: string) => {
    const res = await api.get<{
      success: boolean;
      email: string;
      phoneNumber?: string;
      displayName: string;
    }>(`/users/${userId}/email`);
    return res.data;
  },
};
