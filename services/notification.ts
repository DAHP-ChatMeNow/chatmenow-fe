import api from "@/lib/axios";
import { Notification } from "@/types/notification";

export interface NotificationsResponse {
  notifications: Notification[];
  unreadCount: number;
}

export const normalizeNotification = (noti: any): Notification => {
  const referenced = noti?.referenced;

  const normalizedReferenced =
    referenced && typeof referenced === "object"
      ? {
          ...referenced,
          id: referenced._id || referenced.id,
        }
      : referenced;

  return {
    ...noti,
    id: noti._id || noti.id,
    targetUrl: noti.targetUrl,
    senderName:
      noti.senderName ||
      (typeof noti.senderId === "object"
        ? noti.senderId?.displayName
        : undefined),
    senderAvatar:
      noti.senderAvatar ||
      (typeof noti.senderId === "object" ? noti.senderId?.avatar : undefined),
    referenced: normalizedReferenced,
  };
};

export const notificationService = {
  getNotifications: async () => {
    const res = await api.get<any>("/notifications");
    const notifications =
      res.data.notifications?.map((noti: any) => normalizeNotification(noti)) ||
      [];

    return {
      notifications,
      unreadCount: res.data.unreadCount || 0,
    };
  },

  markAsRead: async (notificationId: string) => {
    const res = await api.put(`/notifications/${notificationId}/read`);
    return res.data;
  },

  markAllAsRead: async () => {
    const res = await api.put("/notifications/read-all");
    return res.data;
  },

  deleteNotification: async (notificationId: string) => {
    const res = await api.delete(`/notifications/${notificationId}`);
    return res.data;
  },

  approveGroupMemberRequest: async (notificationId: string) => {
    const res = await api.post(
      `/chat/group-member-requests/${notificationId}/approve`,
    );
    return res.data;
  },
};
