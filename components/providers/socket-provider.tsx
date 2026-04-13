"use client";

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  RefObject,
  ReactNode,
} from "react";
import { io, Socket } from "socket.io-client";
import { useAuthStore } from "@/store/use-auth-store";
import { useQueryClient } from "@tanstack/react-query";
import { BASE_SOCKET_URL } from "@/types/utils";
import { Notification } from "@/types/notification";
import {
  normalizeNotification,
  NotificationsResponse,
} from "@/api/notification";
import { Message } from "@/types/message";
import { MessagesResponse } from "@/api/chat";
import { ContactsResponse } from "@/api/contact";
import { User } from "@/types/user";
import { formatPresenceStatus } from "@/lib/utils";

const SOCKET_URL = BASE_SOCKET_URL;

interface UserPresenceEvent {
  userId: string;
  isOnline: boolean;
  lastSeen?: string;
}

interface SocketContextType {
  socket: RefObject<Socket | null>;
  isConnected: boolean;
}

const SocketContext = createContext<SocketContextType>({
  socket: { current: null },
  isConnected: false,
});

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error("useSocket must be used within SocketProvider");
  }
  return context;
};

interface SocketProviderProps {
  children: ReactNode;
}

type RealtimeNotificationPayload = Partial<Notification> & {
  senderName?: string;
  content?: string;
};

const getNotificationId = (notification: Partial<Notification>) => {
  return notification.id || (notification as { _id?: string })._id || "";
};

const mergeRealtimeNotification = (
  oldData: NotificationsResponse | undefined,
  payload: RealtimeNotificationPayload,
) => {
  const normalizedNotification = normalizeNotification(payload);
  const notificationId = getNotificationId(normalizedNotification);
  if (!notificationId) return oldData;

  const existingNotifications = oldData?.notifications ?? [];
  const existingIndex = existingNotifications.findIndex(
    (item) => getNotificationId(item) === notificationId,
  );

  const nextNotifications = [...existingNotifications];
  const nextUnreadCount = oldData?.unreadCount ?? 0;
  const isUnread = !normalizedNotification.isRead;

  if (existingIndex >= 0) {
    nextNotifications[existingIndex] = {
      ...nextNotifications[existingIndex],
      ...normalizedNotification,
    };

    return {
      ...(oldData || { notifications: [], unreadCount: 0 }),
      notifications: nextNotifications,
      unreadCount: nextUnreadCount,
    };
  }

  return {
    ...(oldData || { notifications: [], unreadCount: 0 }),
    notifications: [normalizedNotification, ...existingNotifications],
    unreadCount: nextUnreadCount + (isUnread ? 1 : 0),
  };
};

type RealtimeMessagePayload = Partial<Message> & {
  _id?: string;
  message?: Partial<Message> & { _id?: string };
};

type RealtimeDeleteForMePayload = {
  conversationId?: string;
  messageId?: string;
  id?: string;
  _id?: string;
  message?: {
    id?: string;
    _id?: string;
    conversationId?: string;
  };
};

const getMessageSenderId = (message: Message): string | undefined => {
  if (!message.senderId) return undefined;

  if (typeof message.senderId === "string") {
    return message.senderId;
  }

  return message.senderId?._id || message.senderId?.id;
};

const normalizeRealtimeMessage = (
  payload: RealtimeMessagePayload,
): Message | null => {
  const raw = payload?.message ?? payload;
  if (!raw) return null;

  const normalizedId = raw.id || raw._id;
  const normalizedConversationId = raw.conversationId;
  if (!normalizedId || !normalizedConversationId) {
    return null;
  }

  return {
    ...(raw as Message),
    id: normalizedId,
    _id: raw._id || normalizedId,
    conversationId: normalizedConversationId,
    status: "sent",
    isOptimistic: false,
  };
};

const applyPresenceToUser = (
  targetUser: User | undefined,
  presence: UserPresenceEvent,
): User | undefined => {
  if (!targetUser) return targetUser;

  const targetUserId = targetUser.id || targetUser._id;
  if (!targetUserId || targetUserId !== presence.userId) {
    return targetUser;
  }

  return {
    ...targetUser,
    isOnline: presence.isOnline,
    lastSeen: presence.lastSeen
      ? new Date(presence.lastSeen)
      : targetUser.lastSeen,
    lastSeenText: formatPresenceStatus(
      presence.isOnline,
      presence.lastSeen,
      undefined,
    ),
  };
};

export function SocketProvider({ children }: SocketProviderProps) {
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const token = useAuthStore((state) => state.token);
  const user = useAuthStore((state) => state.user);
  const queryClient = useQueryClient();

  useEffect(() => {
    const userId = user?._id || user?.id;

    if (!token || !userId) {
      return;
    }

    if (!SOCKET_URL) {
      return;
    }

    const socketInstance = io(SOCKET_URL, {
      auth: { token },
      transports: ["websocket", "polling"],
      withCredentials: true,
    });

    socketInstance.on("connect", () => {
      socketInstance.emit("setup", userId);
      setIsConnected(true);
    });

    socketInstance.on("connected", () => {
      // Setup confirmed
    });

    socketInstance.on("disconnect", () => {
      setIsConnected(false);
    });

    socketInstance.on("connect_error", () => {
      setIsConnected(false);
    });

    socketInstance.on("friend_request_received", () => {
      queryClient.invalidateQueries({ queryKey: ["friend-requests"] });
    });

    socketInstance.on("friend_request_accepted", () => {
      queryClient.invalidateQueries({ queryKey: ["friend-requests"] });
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    });

    socketInstance.on("friend_request_rejected", () => {
      queryClient.invalidateQueries({ queryKey: ["friend-requests"] });
    });

    socketInstance.on("friend_request_removed", () => {
      queryClient.invalidateQueries({ queryKey: ["friend-requests"] });
    });

    socketInstance.on("friend_list_updated", () => {
      queryClient.invalidateQueries({ queryKey: ["friend-requests"] });
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    });

    socketInstance.on("friend_removed", () => {
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
    });

    const handleRealtimeMessage = (payload: RealtimeMessagePayload) => {
      const message = normalizeRealtimeMessage(payload);
      if (!message) return;

      queryClient.setQueryData(
        ["messages", message.conversationId],
        (oldData: MessagesResponse | undefined) => {
          const oldMessages = oldData?.messages ?? [];
          const messageSenderId = getMessageSenderId(message);
          const existingIndex = oldMessages.findIndex((item) => {
            const itemId = item.id || item._id;
            const sameOptimisticPayload =
              item.isOptimistic &&
              item.status === "sending" &&
              item.conversationId === message.conversationId &&
              (item.content || "") === (message.content || "") &&
              getMessageSenderId(item) === messageSenderId;

            return itemId === message.id || sameOptimisticPayload;
          });

          if (existingIndex >= 0) {
            const nextMessages = [...oldMessages];
            nextMessages[existingIndex] = {
              ...nextMessages[existingIndex],
              ...message,
              status: "sent",
              isOptimistic: false,
            };

            return {
              ...(oldData || {}),
              messages: nextMessages,
            };
          }

          return {
            ...(oldData || {}),
            messages: [...oldMessages, message],
          };
        },
      );

      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    };

    const handleRealtimeMessageUpdated = (payload: RealtimeMessagePayload) => {
      const message = normalizeRealtimeMessage(payload);
      if (!message) return;

      queryClient.setQueryData(
        ["messages", message.conversationId],
        (oldData: MessagesResponse | undefined) => {
          const oldMessages = oldData?.messages ?? [];
          const existingIndex = oldMessages.findIndex((item) => {
            const itemId = item.id || item._id;
            return itemId === message.id;
          });

          if (existingIndex < 0) {
            return {
              ...(oldData || {}),
              messages: [...oldMessages, message],
            };
          }

          const nextMessages = [...oldMessages];
          nextMessages[existingIndex] = {
            ...nextMessages[existingIndex],
            ...message,
            status: "sent",
            isOptimistic: false,
          };

          return {
            ...(oldData || {}),
            messages: nextMessages,
          };
        },
      );

      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    };

    const handleRealtimeDeletedForMe = (
      payload: RealtimeDeleteForMePayload,
    ) => {
      const messageId =
        payload?.messageId ||
        payload?.id ||
        payload?._id ||
        payload?.message?.id ||
        payload?.message?._id;
      const conversationId =
        payload?.conversationId || payload?.message?.conversationId;

      if (!messageId) return;

      if (conversationId) {
        queryClient.setQueryData(
          ["messages", conversationId],
          (oldData: MessagesResponse | undefined) => ({
            ...(oldData || {}),
            messages: (oldData?.messages || []).filter((item) => {
              const itemId = item.id || item._id;
              return itemId !== messageId;
            }),
          }),
        );
      } else {
        queryClient.setQueriesData<MessagesResponse | undefined>(
          { queryKey: ["messages"] },
          (oldData) => ({
            ...(oldData || {}),
            messages: (oldData?.messages || []).filter((item) => {
              const itemId = item.id || item._id;
              return itemId !== messageId;
            }),
          }),
        );
      }

      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    };

    socketInstance.on("message:new", handleRealtimeMessage);
    socketInstance.on("newMessage", handleRealtimeMessage);
    socketInstance.on("message:updated", handleRealtimeMessageUpdated);
    socketInstance.on("message:edited", handleRealtimeMessageUpdated);
    socketInstance.on("message:unsent", handleRealtimeMessageUpdated);
    socketInstance.on("message:reaction", handleRealtimeMessageUpdated);
    socketInstance.on("message:deleted-for-me", handleRealtimeDeletedForMe);

    const handleNotification = (notification: RealtimeNotificationPayload) => {
      queryClient.setQueryData<NotificationsResponse | undefined>(
        ["notifications"],
        (oldData) => mergeRealtimeNotification(oldData, notification),
      );
    };

    socketInstance.on("notification:new", handleNotification);
    socketInstance.on("notification", handleNotification);

    const handleUserPresence = (presence: UserPresenceEvent) => {
      if (!presence?.userId) return;

      const currentAuthUser = useAuthStore.getState().user;
      const currentAuthUserId = currentAuthUser?.id || currentAuthUser?._id;
      if (currentAuthUserId && currentAuthUserId === presence.userId) {
        const updatedCurrentUser = applyPresenceToUser(
          currentAuthUser,
          presence,
        );
        if (updatedCurrentUser) {
          useAuthStore.setState({ user: updatedCurrentUser });
        }
      }

      queryClient.setQueryData<User | undefined>(["user-profile"], (oldUser) =>
        applyPresenceToUser(oldUser, presence),
      );

      queryClient.setQueriesData<User | undefined>(
        { queryKey: ["user-profile"] },
        (oldUser) => applyPresenceToUser(oldUser, presence),
      );

      queryClient.setQueriesData<User | undefined>(
        { queryKey: ["partner"] },
        (oldUser) => applyPresenceToUser(oldUser, presence),
      );

      queryClient.setQueriesData<User | undefined>(
        { queryKey: ["friend-profile"] },
        (oldUser) => applyPresenceToUser(oldUser, presence),
      );

      queryClient.setQueriesData<ContactsResponse | undefined>(
        { queryKey: ["contacts"] },
        (oldData) => {
          if (!oldData?.contacts?.length) return oldData;

          const nextContacts = oldData.contacts.map((contact) => {
            const updated = applyPresenceToUser(contact, presence);
            return updated || contact;
          });

          return {
            ...oldData,
            contacts: nextContacts,
          };
        },
      );
    };

    socketInstance.on("user:presence", handleUserPresence);

    // Real-time like event
    socketInstance.on("post:liked", ({ postId }: { postId: string }) => {
      queryClient.invalidateQueries({ queryKey: ["posts", postId] });
      queryClient.invalidateQueries({ queryKey: ["feed"] });
    });

    socketRef.current = socketInstance;

    return () => {
      socketInstance.off("connected");
      socketInstance.off("friend_request_received");
      socketInstance.off("friend_request_accepted");
      socketInstance.off("friend_request_rejected");
      socketInstance.off("friend_request_removed");
      socketInstance.off("friend_list_updated");
      socketInstance.off("friend_removed");
      socketInstance.off("message:new", handleRealtimeMessage);
      socketInstance.off("newMessage", handleRealtimeMessage);
      socketInstance.off("message:updated", handleRealtimeMessageUpdated);
      socketInstance.off("message:edited", handleRealtimeMessageUpdated);
      socketInstance.off("message:unsent", handleRealtimeMessageUpdated);
      socketInstance.off("message:reaction", handleRealtimeMessageUpdated);
      socketInstance.off("message:deleted-for-me", handleRealtimeDeletedForMe);
      socketInstance.off("notification", handleNotification);
      socketInstance.off("notification:new");
      socketInstance.off("user:presence", handleUserPresence);
      socketInstance.off("post:liked");
      socketInstance.offAny();
      socketInstance.disconnect();
      socketRef.current = null;
      setIsConnected(false);
    };
  }, [token, user?._id, user?.id, queryClient]);

  return (
    <SocketContext.Provider value={{ socket: socketRef, isConnected }}>
      {children}
    </SocketContext.Provider>
  );
}
