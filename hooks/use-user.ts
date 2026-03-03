"use client";

import { useQuery } from "@tanstack/react-query";
import { userService } from "@/api/user";
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
