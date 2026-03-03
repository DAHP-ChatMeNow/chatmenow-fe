"use client";

import { useState } from "react";
import {
  Bell,
  UserPlus,
  MessageSquare,
  Heart,
  Loader,
  ChevronRight,
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  useNotifications,
  useMarkAllNotificationsAsRead,
} from "@/hooks/use-notification";
import {
  useAcceptFriendRequest as useAcceptFriendRequestContact,
  useRejectFriendRequest as useRejectFriendRequestContact,
} from "@/hooks/use-contact";
import Link from "next/link";

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

export function NotificationDropdown() {
  const { data: notificationsData, isLoading } = useNotifications();
  const { mutate: markAllAsRead, isPending: isMarkingAll } =
    useMarkAllNotificationsAsRead();
  const { mutate: acceptFriendRequest } = useAcceptFriendRequestContact();
  const { mutate: rejectFriendRequest } = useRejectFriendRequestContact();
  const [acceptingIds, setAcceptingIds] = useState<string[]>([]);
  const [rejectingIds, setRejectingIds] = useState<string[]>([]);

  const notifications = notificationsData?.notifications || [];
  const unreadNotifications = notifications.filter((noti) => !noti.isRead);
  const unreadCount = unreadNotifications.length;

  // Show max 5 notifications in dropdown
  const recentNotifications = unreadNotifications.slice(0, 5);

  const handleAcceptFriendRequest = (
    notificationId: string,
    requestId: string,
  ) => {
    if (!requestId) return;
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
    if (!requestId) return;
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
    if (diffMins < 60) return `${diffMins} phút`;
    if (diffHours < 24) return `${diffHours} giờ`;
    if (diffDays < 7) return `${diffDays} ngày`;
    return new Date(date).toLocaleDateString("vi-VN");
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="relative p-3 transition-all duration-200 rounded-2xl text-slate-400 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100/80 dark:hover:bg-slate-700/50 hover:scale-105">
          <Bell className="w-6 h-6" />
          {unreadCount > 0 && (
            <>
              <span className="absolute w-2 h-2 bg-red-500 border border-white rounded-full top-1 right-1 dark:border-slate-800" />
              <span className="absolute -top-1 -right-1 min-w-[20px] h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1.5">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            </>
          )}
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="center"
        className="p-0 bg-white border shadow-2xl w-96 dark:bg-slate-800 border-slate-200 dark:border-slate-700 rounded-2xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-700">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">
            Thông báo
          </h3>
          {notifications.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="px-2 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950 h-7"
              onClick={() => markAllAsRead()}
              disabled={isMarkingAll}
            >
              Đánh dấu đã đọc
            </Button>
          )}
        </div>

        {/* Notifications List */}
        <ScrollArea className="max-h-[400px]">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader className="w-6 h-6 animate-spin text-slate-400" />
            </div>
          ) : recentNotifications.length > 0 ? (
            <div className="py-2">
              {recentNotifications.map((noti, index) => (
                <div
                  key={`${noti.id}-${index}`}
                  className="flex items-start gap-3 px-4 py-3 transition-colors cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/50"
                >
                  <div className="relative flex-shrink-0">
                    <Avatar className="w-10 h-10 border border-white shadow-sm">
                      <AvatarFallback className="text-sm font-bold bg-slate-100 dark:bg-slate-700">
                        {typeof noti.senderId === "string"
                          ? noti.senderId.charAt(0).toUpperCase()
                          : "N"}
                      </AvatarFallback>
                    </Avatar>
                    <div
                      className={`absolute -bottom-0.5 -right-0.5 p-1 rounded-full border-2 border-white dark:border-slate-800 ${getNotificationBgColor(noti.type)}`}
                    >
                      {getNotificationIcon(noti.type)}
                    </div>
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-sm leading-snug text-slate-900 dark:text-slate-100">
                      {noti.message}
                    </p>
                    <p className="mt-1 text-xs font-medium text-blue-600 dark:text-blue-400">
                      {formatTime(noti.createdAt)}
                    </p>

                    {noti.type === "friend_request" && (
                      <div className="flex gap-2 mt-2">
                        <Button
                          size="sm"
                          className="px-3 text-xs bg-blue-600 rounded-lg hover:bg-blue-700 h-7"
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
                          className="px-3 text-xs rounded-lg h-7 border-slate-300 dark:border-slate-600"
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
                    <div className="w-2 h-2 bg-blue-600 rounded-full mt-1.5 flex-shrink-0" />
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="py-12 text-center text-slate-500 dark:text-slate-400">
              <Bell className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="text-sm">Không có thông báo mới</p>
            </div>
          )}
        </ScrollArea>

        {/* Footer - View All */}
        {notifications.length > 0 && (
          <>
            <DropdownMenuSeparator className="bg-slate-200 dark:bg-slate-700" />
            <Link href="/notifications" className="block">
              <div className="px-4 py-3 transition-colors hover:bg-slate-50 dark:hover:bg-slate-700/50">
                <p className="flex items-center justify-center gap-1 text-sm font-semibold text-center text-blue-600 dark:text-blue-400">
                  Xem tất cả thông báo
                  <ChevronRight className="w-4 h-4" />
                </p>
              </div>
            </Link>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
