"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { userService, UpdateProfilePayload } from "@/api/user";
import { useAuthStore } from "@/store/use-auth-store";
import { validateImageFile } from "@/lib/cloudinary";

const getErrorMessage = (error: unknown, fallback: string): string => {
  if (!error || typeof error !== "object") return fallback;
  const err = error as {
    response?: {
      data?: {
        message?: string;
      };
    };
  };
  return err.response?.data?.message || fallback;
};

export const useUpdateProfile = () => {
  const queryClient = useQueryClient();
  const { setAuth } = useAuthStore();

  return useMutation({
    mutationFn: async (data: UpdateProfilePayload) => {
      return userService.updateProfile(data);
    },

    onSuccess: (response) => {
      const token = useAuthStore.getState().token;
      if (token) {
        setAuth(response.user, token);
      }

      queryClient.invalidateQueries({ queryKey: ["profile"] });
      queryClient.invalidateQueries({ queryKey: ["user"] });

      toast.success("Hồ sơ đã được cập nhật");
    },

    onError: (error: unknown) => {
      toast.error(getErrorMessage(error, "Không thể cập nhật hồ sơ"));
    },
  });
};

export const useUpdateAvatar = () => {
  const queryClient = useQueryClient();
  const { setAuth } = useAuthStore();

  return useMutation({
    mutationFn: async (avatarFile: File) => {
      validateImageFile(avatarFile);
      return userService.uploadAvatar(avatarFile);
    },

    onSuccess: (response) => {
      const token = useAuthStore.getState().token;
      if (token) {
        setAuth(response.user, token);
      }
      // Invalidate tất cả queries liên quan
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      queryClient.invalidateQueries({ queryKey: ["user"] });
      // Invalidate tất cả presigned URLs để refetch ảnh mới
      queryClient.invalidateQueries({ queryKey: ["presigned-url"] });
      toast.success("Avatar đã được cập nhật");
    },

    onError: (error: unknown) => {
      toast.error(getErrorMessage(error, "Không thể cập nhật avatar"));
    },
  });
};

export const useDeleteAvatar = () => {
  const queryClient = useQueryClient();
  const { setAuth } = useAuthStore();

  return useMutation({
    mutationFn: userService.deleteAvatar,

    onSuccess: (response) => {
      const token = useAuthStore.getState().token;
      if (token) {
        setAuth(response.user, token);
      }
      // Invalidate tất cả queries liên quan
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      queryClient.invalidateQueries({ queryKey: ["user"] });
      queryClient.invalidateQueries({ queryKey: ["presigned-url"] });
      toast.success(response.msg || "Avatar đã được xóa");
    },

    onError: (error: unknown) => {
      toast.error(getErrorMessage(error, "Không thể xóa avatar"));
    },
  });
};

export const useUpdateCoverImage = () => {
  const queryClient = useQueryClient();
  const { setAuth } = useAuthStore();

  return useMutation({
    mutationFn: async (coverFile: File) => {
      validateImageFile(coverFile);
      return userService.updateCoverImage(coverFile);
    },

    onSuccess: (response) => {
      const token = useAuthStore.getState().token;
      if (token) {
        setAuth(response.user, token);
      }
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      queryClient.invalidateQueries({ queryKey: ["user"] });
      queryClient.invalidateQueries({ queryKey: ["presigned-url"] });
      toast.success("Ảnh bìa đã được cập nhật");
    },

    onError: (error: unknown) => {
      toast.error(getErrorMessage(error, "Không thể cập nhật ảnh bìa"));
    },
  });
};

export const useDeleteCoverImage = () => {
  const queryClient = useQueryClient();
  const { setAuth } = useAuthStore();

  return useMutation({
    mutationFn: userService.deleteCoverImage,

    onSuccess: (response) => {
      const token = useAuthStore.getState().token;
      if (token) {
        setAuth(response.user, token);
      }
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      queryClient.invalidateQueries({ queryKey: ["user"] });
      queryClient.invalidateQueries({ queryKey: ["presigned-url"] });
      toast.success(response.message || response.msg || "Ảnh bìa đã được xóa");
    },

    onError: (error: unknown) => {
      toast.error(getErrorMessage(error, "Không thể xóa ảnh bìa"));
    },
  });
};

/**
 * Hook to get presigned URL for viewing images
 * @param key - S3 object key (e.g., "avatars/xxx.jpg")
 * @param enabled - Whether to fetch the URL
 */
export const usePresignedUrl = (
  key: string | null | undefined,
  enabled: boolean = true,
) => {
  return useQuery({
    queryKey: ["presigned-url", key],
    queryFn: () => {
      if (!key) throw new Error("Key is required");
      return userService.getPresignedUrl(key);
    },
    enabled: enabled && !!key,
    staleTime: 1000 * 60 * 50, // 50 minutes (presigned URLs expire in 1 hour)
    gcTime: 1000 * 60 * 55, // 55 minutes
  });
};
