"use client";

import { useState, useRef, useEffect } from "react";
import {
  Bell,
  UserPlus,
  MessageSquare,
  Heart,
  Loader,
  ChevronRight,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
import { useRouter } from "next/navigation";
import { Notification } from "@/types/notification";
import Link from "next/link";

const getNotificationIcon = (type: string) => {
  switch (type) {
    case "friend_request":
      return <UserPlus className="w-3 h-3 text-white" />;
    case "like":
    case "post_like":
    case "post_comment":
      return <Heart className="w-3 h-3 text-white" />;
    case "video_call":
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
    case "post_like":
    case "post_comment":
      return "bg-red-500";
    case "video_call":
    case "message":
      return "bg-blue-500";
    default:
      return "bg-slate-500";
  }
};

export function FloatingNotificationButton() {
  const router = useRouter();
  const getSenderName = (noti: Notification) => {
    if (noti.senderName?.trim()) return noti.senderName.trim();
    if (typeof noti.senderId === "object" && noti.senderId?.displayName) {
      return noti.senderId.displayName;
    }
    return "Người dùng";
  };

  const getSenderAvatar = (noti: Notification) => {
    if (noti.senderAvatar?.trim()) return noti.senderAvatar.trim();
    if (typeof noti.senderId === "object" && noti.senderId?.avatar) {
      return noti.senderId.avatar;
    }
    return undefined;
  };

  const getReferencedId = (noti: Notification) => {
    if (!noti.referenced) return "";
    if (typeof noti.referenced === "string") return noti.referenced;
    return noti.referenced.id || noti.referenced._id || "";
  };

  const handleOpenNotification = (noti: Notification) => {
    if (!noti.targetUrl) return;
    setIsDropdownOpen(false);
    router.push(noti.targetUrl);
  };

  const handleAcceptClick = (
    event: React.MouseEvent,
    notificationId: string,
    requestId: string,
  ) => {
    event.stopPropagation();
    handleAcceptFriendRequest(notificationId, requestId);
  };

  const handleRejectClick = (
    event: React.MouseEvent,
    notificationId: string,
    requestId: string,
  ) => {
    event.stopPropagation();
    handleRejectFriendRequest(notificationId, requestId);
  };

  const { data: notificationsData, isLoading } = useNotifications();
  const { mutate: markAllAsRead, isPending: isMarkingAll } =
    useMarkAllNotificationsAsRead();
  const { mutate: acceptFriendRequest } = useAcceptFriendRequestContact();
  const { mutate: rejectFriendRequest } = useRejectFriendRequestContact();
  const [acceptingIds, setAcceptingIds] = useState<string[]>([]);
  const [rejectingIds, setRejectingIds] = useState<string[]>([]);

  // Draggable state
  const [position, setPosition] = useState(() => {
    if (typeof window === "undefined") return { x: 0, y: 100 };
    const savedPosition = localStorage.getItem("notification-button-position");
    if (savedPosition) {
      try {
        return JSON.parse(savedPosition);
      } catch {
        return { x: 0, y: 100 };
      }
    }
    return { x: 0, y: 100 };
  });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [hasMoved, setHasMoved] = useState(false);
  const buttonRef = useRef<HTMLDivElement>(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const notifications = notificationsData?.notifications || [];
  const unreadNotifications = notifications.filter((noti) => !noti.isRead);
  const unreadCount = unreadNotifications.length;

  // Show max 5 notifications in dropdown
  const recentNotifications = unreadNotifications.slice(0, 5);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return; // Only left click
    setIsDragging(true);
    setHasMoved(false);
    setDragStart({
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    });
  };

  useEffect(() => {
    if (isDragging) {
      const handleMove = (e: MouseEvent) => {
        if (!hasMoved) {
          setHasMoved(true);
          setIsDropdownOpen(false); // Close dropdown as soon as we start moving
        }
        const newX = e.clientX - dragStart.x;
        const newY = e.clientY - dragStart.y;
        const maxX = window.innerWidth - 64;
        const maxY = window.innerHeight - 64;
        const boundedX = Math.max(0, Math.min(newX, maxX));
        const boundedY = Math.max(0, Math.min(newY, maxY));
        setPosition({ x: boundedX, y: boundedY });
      };

      const handleUp = () => {
        setIsDragging(false);
        // Don't change dropdown state here - let Radix handle click to open
        // Dropdown is already closed if user dragged
      };

      window.addEventListener("mousemove", handleMove);
      window.addEventListener("mouseup", handleUp);

      return () => {
        window.removeEventListener("mousemove", handleMove);
        window.removeEventListener("mouseup", handleUp);
      };
    }
  }, [isDragging, dragStart, hasMoved]);

  // Save position when it changes (but not while dragging)
  useEffect(() => {
    if (!isDragging && position.x !== 0) {
      localStorage.setItem(
        "notification-button-position",
        JSON.stringify(position),
      );
    }
  }, [position, isDragging]);

  const handleAcceptFriendRequest = (
    notificationId: string,
    requestId: string,
  ) => {
    if (!requestId) return;
    setAcceptingIds([...acceptingIds, notificationId]);
    acceptFriendRequest(requestId, {
      onSuccess: (result) => {
        if (result?.conversationId) {
          router.push(`/messages/${result.conversationId}`);
        }
      },
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

  const formatTime = (date: string | Date) => {
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
    <DropdownMenu open={isDropdownOpen} onOpenChange={setIsDropdownOpen}>
      <div
        ref={buttonRef}
        className="fixed z-50"
        style={{
          right: position.x === 0 ? "20px" : "auto",
          left: position.x === 0 ? "auto" : `${position.x}px`,
          top: `${position.y}px`,
        }}
      >
        <DropdownMenuTrigger asChild>
          <div
            onMouseDown={handleMouseDown}
            className="relative p-4 transition-all bg-white border-2 border-blue-100 rounded-full shadow-2xl dark:bg-slate-800 hover:scale-105 dark:border-blue-900/50 hover:border-blue-300 dark:hover:border-blue-700"
          >
            <Bell className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            {unreadCount > 0 && (
              <>
                <span className="absolute -top-1 -right-1 min-w-[22px] h-[22px] bg-red-500 text-white text-[11px] font-bold rounded-full flex items-center justify-center px-1.5 shadow-lg">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
                <span className="absolute inset-0 rounded-full bg-blue-400/20 animate-ping" />
              </>
            )}
          </div>
        </DropdownMenuTrigger>
      </div>

      <DropdownMenuContent
        align="end"
        side="left"
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
                  onClick={() => handleOpenNotification(noti)}
                  role={noti.targetUrl ? "button" : undefined}
                  tabIndex={noti.targetUrl ? 0 : -1}
                  onKeyDown={(event) => {
                    if (!noti.targetUrl) return;
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      handleOpenNotification(noti);
                    }
                  }}
                  className={`flex items-start gap-3 px-4 py-3 transition-colors ${noti.targetUrl ? "cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/50" : "cursor-default"}`}
                >
                  <div className="relative flex-shrink-0">
                    <Avatar className="w-10 h-10 border border-white shadow-sm">
                      <AvatarImage
                        src={getSenderAvatar(noti)}
                        alt={getSenderName(noti)}
                      />
                      <AvatarFallback className="text-sm font-bold bg-slate-100 dark:bg-slate-700">
                        {getSenderName(noti).charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div
                      className={`absolute -right-1 -top-1 p-0.5 rounded-full border border-white dark:border-slate-800 ${getNotificationBgColor(noti.type)}`}
                    >
                      {getNotificationIcon(noti.type)}
                    </div>
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-sm leading-snug text-slate-900 dark:text-slate-100">
                      <span className="font-semibold text-slate-950 dark:text-white">
                        {getSenderName(noti)}{" "}
                      </span>
                      {noti.displayText || noti.message}
                    </p>
                    <p className="mt-1 text-xs font-medium text-blue-600 dark:text-blue-400">
                      {formatTime(noti.createdAt)}
                    </p>
                    {noti.type === "friend_request" && (
                      <div className="flex gap-2 mt-2">
                        <Button
                          size="sm"
                          className="px-3 text-xs bg-blue-600 rounded-lg hover:bg-blue-700 h-7"
                          onClick={(event) =>
                            handleAcceptClick(
                              event,
                              noti.id,
                              getReferencedId(noti),
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
                          onClick={(event) =>
                            handleRejectClick(
                              event,
                              noti.id,
                              getReferencedId(noti),
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
            <Link
              href="/notifications"
              className="block"
              onClick={() => setIsDropdownOpen(false)}
            >
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
