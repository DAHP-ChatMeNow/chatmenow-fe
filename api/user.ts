import api from "@/lib/axios";
import { User, AccountStatus } from "@/types/user";

export interface UpdateProfilePayload {
  displayName?: string;
  bio?: string;
  hometown?: string;
  phoneNumber?: string;
  gender?: string;
  school?: string;
  maritalStatus?: string;
  language?: string;
  themeColor?: string;
}

export interface UpdateProfileResponse {
  user: User;
  message: string;
}

export interface UpdateAccountStatusPayload {
  accountStatus: AccountStatus;
  suspendedUntil?: string; // ISO format or YYYY-MM-DD
  statusReason?: string;
}

export interface UpdateAccountStatusResponse {
  success: boolean;
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

export interface UploadCoverImageResponse {
  success: boolean;
  message: string;
  user: User;
  coverImage?: string;
}

export interface DeleteCoverImageResponse {
  success?: boolean;
  message?: string;
  msg?: string;
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

export interface GetFriendProfileResponse {
  success: boolean;
  user: User;
}

export interface BlockedUsersResponse {
  success: boolean;
  blockedUsers: User[];
  total: number;
}

export interface BlockUserResponse {
  success: boolean;
  message: string;
  blockedUser: Pick<User, "id" | "_id" | "displayName" | "avatar">;
}

export interface UnblockUserResponse {
  success: boolean;
  message: string;
}

const mapMongoUser = (user: User): User => {
  if (!user) return user;
  return {
    ...user,
    id: user.id || user._id || "",
  };
};

export const userService = {
  /**
   * Get current user profile
   */
  getProfile: async () => {
    const res = await api.get<GetProfileResponse>("/users/profile");
    return mapMongoUser(res.data.user); // Extract user from response
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
   * Upload user cover image to S3
   * @param file - Cover image file
   */
  updateCoverImage: async (file: File) => {
    const formData = new FormData();
    // Keep the same multipart field as avatar upload for multer.single("image").
    formData.append("image", file);
    const res = await api.post<UploadCoverImageResponse>(
      "/upload/cover-image",
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
   * Delete current user's cover image
   */
  deleteCoverImage: async () => {
    const res = await api.delete<DeleteCoverImageResponse>("/upload/cover-image");
    return res.data;
  },

  /**
   * Get user by ID
   */
  getUserById: async (userId: string) => {
    const res = await api.get<User>(`/users/${userId}`);
    return mapMongoUser(res.data);
  },

  /**
   * Get user profile by ID (with friends list and full info)
   */
  getUserProfile: async (userId: string) => {
    const res = await api.get<{ success: boolean; user: User }>(
      `/users/${userId}`,
    );
    return mapMongoUser(res.data.user);
  },

  /**
   * Get friend profile from chat/user context
   */
  getFriendProfile: async (userId: string) => {
    const res = await api.get<GetFriendProfileResponse>(
      `/users/friends/${userId}/profile`,
    );
    return mapMongoUser(res.data.user);
  },

  /**
   * Get blocked users of current user
   */
  getBlockedUsers: async () => {
    const res = await api.get<BlockedUsersResponse>("/users/blocked");
    res.data.blockedUsers = (res.data.blockedUsers || []).map((user: any) =>
      mapMongoUser(user),
    );
    return res.data;
  },

  /**
   * Block a user
   */
  blockUser: async (userId: string) => {
    const res = await api.post<BlockUserResponse>(`/users/${userId}/block`);
    return {
      ...res.data,
      blockedUser: mapMongoUser(res.data.blockedUser as User),
    };
  },

  /**
   * Unblock a user
   */
  unblockUser: async (userId: string) => {
    const res = await api.delete<UnblockUserResponse>(
      `/users/blocked/${userId}`,
    );
    return res.data;
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

  /**
   * Update account status (active, suspended, locked)
   * @param userId - User ID to update
   * @param data - Account status update payload
   */
  updateAccountStatus: async (
    userId: string,
    data: UpdateAccountStatusPayload,
  ) => {
    const res = await api.put<UpdateAccountStatusResponse>(
      `/users/${userId}/account-status`,
      data,
    );
    return res.data;
  },
};
