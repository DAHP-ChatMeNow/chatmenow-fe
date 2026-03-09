"use client";

import { Bell, UserPlus, MessageSquare, Heart, Loader } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  useNotifications,
  useMarkAllNotificationsAsRead,
} from "@/hooks/use-notification";
import {
  useAcceptFriendRequest as useAcceptFriendRequestContact,
  useRejectFriendRequest as useRejectFriendRequestContact,
} from "@/hooks/use-contact";
import { useState } from "react";

const getNotificationIcon = (type: string) => {
  switch (type) {
    case "friend_request":
      return <UserPlus className="w-3 h-3 text-white" />;
    case "like":
      return <Heart className="w-3 h-3 text-white" />;
    case "message":
      return <MessageSquare className="w-3 h-3 text-white" />;
    default:
      return <Bell className="w-3 h-3 text-white" />;
  }
};

const getNotificationBgColor = (type: string) => {
  switch (type) {
    case "friend_request":
      return "bg-orange-500";
    case "like":
      return "bg-red-500";
    case "message":
      return "bg-blue-500";
    default:
      return "bg-slate-500";
  }
};

export default function NotificationsPage() {
  const { data: notificationsData, isLoading, error } = useNotifications();
  const { mutate: markAllAsRead, isPending: isMarkingAll } =
    useMarkAllNotificationsAsRead();
  const { mutate: acceptFriendRequest } = useAcceptFriendRequestContact();
  const { mutate: rejectFriendRequest } = useRejectFriendRequestContact();
  const [acceptingIds, setAcceptingIds] = useState<string[]>([]);
  const [rejectingIds, setRejectingIds] = useState<string[]>([]);
  const notifications = notificationsData?.notifications || [];
  // Only show unread notifications
  const unreadNotifications = notifications.filter((noti) => !noti.isRead);

  const handleAcceptFriendRequest = (
    notificationId: string,
    requestId: string,
  ) => {
    if (!requestId) {
      return;
    }
    setAcceptingIds([...acceptingIds, notificationId]);
    acceptFriendRequest(requestId, {
      onSettled: () => {
        setAcceptingIds(acceptingIds.filter((id) => id !== notificationId));
      },
    });
  };

  const handleRejectFriendRequest = (
    notificationId: string,
    requestId: string,
  ) => {
    if (!requestId) {
      return;
    }
    setRejectingIds([...rejectingIds, notificationId]);
    rejectFriendRequest(requestId, {
      onSettled: () => {
        setRejectingIds(rejectingIds.filter((id) => id !== notificationId));
      },
    });
  };

  const formatTime = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - new Date(date).getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "vừa xong";
    if (diffMins < 60) return `${diffMins} phút trước`;
    if (diffHours < 24) return `${diffHours} giờ trước`;
    if (diffDays < 7) return `${diffDays} ngày trước`;
    return new Date(date).toLocaleDateString("vi-VN");
  };
  return (
    <div className="flex flex-col w-full h-full bg-white">
      <header className="h-[70px] border-b border-slate-100 flex items-center justify-between px-6 sticky top-0 bg-white z-10 w-full">
        <h1 className="text-xl font-bold text-slate-900">Thông báo</h1>
        <Button
          variant="ghost"
          size="sm"
          className="font-medium text-blue-600"
          onClick={() => markAllAsRead()}
          disabled={isMarkingAll || notifications.length === 0}
        >
          Đánh dấu đã đọc tất cả
        </Button>
      </header>

      <ScrollArea className="flex-1 w-full">
        <div className="w-full p-4 space-y-2 md:p-8">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader className="w-6 h-6 animate-spin text-slate-400" />
            </div>
          ) : error ? (
            <div className="py-12 text-center text-slate-500">
              Không thể tải thông báo
            </div>
          ) : notifications.length > 0 ? (
            unreadNotifications.length > 0 ? (
              unreadNotifications.map((noti, index) => (
                <div
                  key={`${noti.id}-${index}`}
                  className={`flex items-start gap-4 p-4 rounded-2xl transition-all cursor-pointer ${noti.isRead ? "hover:bg-slate-50" : "bg-blue-50/40 border border-blue-100 shadow-sm"}`}
                >
                  <div className="relative">
                    <Avatar className="w-12 h-12 border border-white shadow-sm">
                      <AvatarFallback className="font-bold bg-slate-100">
                        {typeof noti.senderId === "string"
                          ? noti.senderId.charAt(0).toUpperCase()
                          : noti.senderId?.displayName
                              ?.charAt(0)
                              .toUpperCase() || "N"}
                      </AvatarFallback>
                    </Avatar>
                    <div
                      className={`absolute -bottom-1 -right-1 p-1 rounded-full border-2 border-white ${getNotificationBgColor(noti.type)}`}
                    >
                      {getNotificationIcon(noti.type)}
                    </div>
                  </div>

                  <div className="flex-1 space-y-1">
                    <p className="text-[14.5px] text-slate-900 leading-tight">
                      {noti.message}
                    </p>
                    <p className="text-[12px] text-slate-400 font-medium">
                      {formatTime(noti.createdAt)}
                    </p>
                    {noti.type === "friend_request" && (
                      <div className="flex gap-2 mt-3">
                        <Button
                          size="sm"
                          className="h-8 px-4 bg-blue-600 rounded-lg hover:bg-blue-700"
                          onClick={() =>
                            handleAcceptFriendRequest(
                              noti.id,
                              noti.referenced || "",
                            )
                          }
                          disabled={acceptingIds.includes(noti.id)}
                        >
                          {acceptingIds.includes(noti.id) ? (
                            <Loader className="w-3 h-3 animate-spin" />
                          ) : (
                            "Chấp nhận"
                          )}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 px-4 rounded-lg"
                          onClick={() =>
                            handleRejectFriendRequest(
                              noti.id,
                              noti.referenced || "",
                            )
                          }
                          disabled={rejectingIds.includes(noti.id)}
                        >
                          {rejectingIds.includes(noti.id) ? (
                            <Loader className="w-3 h-3 animate-spin" />
                          ) : (
                            "Từ chối"
                          )}
                        </Button>
                      </div>
                    )}
                  </div>
                  {!noti.isRead && (
                    <div className="w-2.5 h-2.5 bg-blue-600 rounded-full mt-2" />
                  )}
                </div>
              ))
            ) : (
              <div className="py-12 text-center text-slate-500">
                Bạn đã đọc tất cả thông báo
              </div>
            )
          ) : (
            <div className="py-12 text-center text-slate-500">
              Bạn không có thông báo nào
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
