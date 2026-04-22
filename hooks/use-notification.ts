"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { notificationService, NotificationsResponse } from "@/services/notification";

export const useNotifications = () => {
  return useQuery({
    queryKey: ["notifications"],
    queryFn: (): Promise<NotificationsResponse> =>
      notificationService.getNotifications(),
    refetchOnWindowFocus: false, // ❌ Tắt auto-refetch khi focus tab
    staleTime: 5 * 60 * 1000, // 5 phút - cho phép invalidate work
  });
};

export const useMarkNotificationAsRead = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: notificationService.markAsRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
};

export const useMarkAllNotificationsAsRead = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: notificationService.markAllAsRead,
    onSuccess: () => {
      // Optimistically update the cache
      queryClient.setQueryData(["notifications"], (oldData: any) => {
        if (!oldData) return oldData;
        return {
          ...oldData,
          notifications: oldData.notifications.map((noti: any) => ({
            ...noti,
            isRead: true,
          })),
          unreadCount: 0,
        };
      });
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      toast.success("Đã đánh dấu tất cả thông báo là đã đọc");
    },
    onError: (error: any) => {
      toast.error(
        error?.response?.data?.message || "Không thể đánh dấu thông báo",
      );
    },
  });
};

export const useDeleteNotification = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: notificationService.deleteNotification,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || "Không thể xóa thông báo");
    },
  });
};

export const useApproveGroupMemberRequest = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: notificationService.approveGroupMemberRequest,
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.invalidateQueries({ queryKey: ["conversations"] });

      const conversationId = data?.conversation?._id || data?.conversation?.id;
      if (conversationId) {
        queryClient.invalidateQueries({
          queryKey: ["conversation", conversationId],
        });
      }

      toast.success("Đã duyệt yêu cầu thêm thành viên");
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || "Không thể duyệt yêu cầu");
    },
  });
};
