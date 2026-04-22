"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { userService } from "@/services/user";
import { useAuthStore } from "@/store/use-auth-store";

/**
 * Hook để lấy user profile từ server với auto-refetch
 * Tự động cập nhật auth store khi có data mới
 */
export const useUserProfile = () => {
  const { setAuth, token, user: localUser } = useAuthStore();

  return useQuery({
    queryKey: ["user-profile"],
    queryFn: async () => {
      const user = await userService.getProfile();
      // Tự động cập nhật auth store với data mới từ server
      if (token && user) {
        setAuth(user, token);
      }
      return user;
    },
    enabled: !!token,
    // Auto refetch mỗi 30 giây để check updates
    refetchInterval: 30000,
    // Refetch khi window được focus (chuyển tab trở lại)
    refetchOnWindowFocus: true,
    // Data cũ sau 20 giây
    staleTime: 20000,
    // Giữ data trong 1 phút
    gcTime: 60000,
  });
};

export const useSearchHistory = (limit: number = 20) => {
  return useQuery({
    queryKey: ["search-history", limit],
    queryFn: () => userService.getSearchHistory(limit),
  });
};

export const useDeleteSearchHistory = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: userService.deleteSearchHistory,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["search-history"] });
    },
  });
};

export const useProfileVisitHistory = (limit: number = 20) => {
  return useQuery({
    queryKey: ["profile-visit-history", limit],
    queryFn: () => userService.getProfileVisitHistory(limit),
  });
};

export const useDeleteProfileVisitHistory = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: userService.deleteProfileVisitHistory,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile-visit-history"] });
    },
  });
};

export const useActivityHistory = (limit: number = 20) => {
  return useQuery({
    queryKey: ["activity-history", limit],
    queryFn: () => userService.getActivityHistory(limit),
  });
};
