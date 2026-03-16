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
import { toast } from "sonner";
import { BASE_SOCKET_URL } from "@/types/utils";
import { Notification } from "@/types/notification";
import { Message } from "@/types/message";

const SOCKET_URL = BASE_SOCKET_URL;

interface FriendRequestReceivedEvent {
  requestId: string;
  sender: {
    _id: string;
    displayName: string;
    avatar?: string;
  };
  createdAt: string;
}

interface FriendRequestAcceptedEvent {
  acceptedBy: {
    _id: string;
    displayName: string;
    avatar?: string;
  };
  requestId: string;
  receiverInfo?: {
    _id: string;
    displayName: string;
    avatar?: string;
  };
}

interface FriendRequestRejectedEvent {
  rejectedBy: {
    _id: string;
    displayName: string;
  };
  requestId: string;
}

interface FriendListUpdatedEvent {
  newFriend: {
    _id: string;
    displayName: string;
    avatar?: string;
    bio?: string;
    isOnline?: boolean;
  };
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

type RealtimeMessagePayload = Partial<Message> & {
  _id?: string;
  message?: Partial<Message> & { _id?: string };
};

type MessagesCache = {
  messages?: Message[];
  [key: string]: unknown;
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
    conversationId: normalizedConversationId,
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
      console.error("[socket] Ket noi that bai: thieu NEXT_PUBLIC_SOCKET_URL");
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
      console.info("[socket] Ket noi thanh cong", {
        socketId: socketInstance.id,
        websocketUrl: SOCKET_URL,
      });
    });

    socketInstance.on("connected", () => {
      // Setup confirmed
    });

    socketInstance.on("disconnect", () => {
      setIsConnected(false);
      console.warn("[socket] Da ngat ket noi", {
        websocketUrl: SOCKET_URL,
      });
    });

    socketInstance.on("connect_error", (error: Error) => {
      setIsConnected(false);
      console.error("[socket] Ket noi that bai", {
        websocketUrl: SOCKET_URL,
        message: error?.message || "Unknown error",
      });
    });

    socketInstance.on(
      "friend_request_received",
      (data: FriendRequestReceivedEvent) => {
        queryClient.invalidateQueries({ queryKey: ["friend-requests"] });
        toast.info(
          `${data.sender?.displayName || "Ai đó"} đã gửi lời mời kết bạn`,
        );
      },
    );

    socketInstance.on(
      "friend_request_accepted",
      (data: FriendRequestAcceptedEvent) => {
        queryClient.invalidateQueries({ queryKey: ["friend-requests"] });
        queryClient.invalidateQueries({ queryKey: ["contacts"] });
        toast.success(
          `${data.receiverInfo?.displayName || data.acceptedBy?.displayName || "Người dùng"} đã chấp nhận lời mời kết bạn`,
        );
      },
    );

    socketInstance.on(
      "friend_request_rejected",
      (data: FriendRequestRejectedEvent) => {
        queryClient.invalidateQueries({ queryKey: ["friend-requests"] });
        toast.info(
          `${data.rejectedBy?.displayName || "Người dùng"} đã từ chối lời mời`,
        );
      },
    );

    socketInstance.on("friend_request_removed", () => {
      queryClient.invalidateQueries({ queryKey: ["friend-requests"] });
      toast.success("Đã từ chối lời mời kết bạn");
    });

    socketInstance.on("friend_list_updated", (data: FriendListUpdatedEvent) => {
      queryClient.invalidateQueries({ queryKey: ["friend-requests"] });
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      toast.success(
        `Bạn và ${data.newFriend?.displayName || "người dùng"} đã là bạn bè`,
      );
    });

    socketInstance.on("friend_removed", () => {
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      toast.info("Một người bạn đã xóa bạn khỏi danh sách");
    });

    const handleRealtimeMessage = (payload: RealtimeMessagePayload) => {
      const message = normalizeRealtimeMessage(payload);
      if (!message) return;

      queryClient.setQueryData(
        ["messages", message.conversationId],
        (oldData: MessagesCache | undefined) => {
          const oldMessages = oldData?.messages ?? [];
          const exists = oldMessages.some(
            (item) =>
              (item.id || (item as Message & { _id?: string })._id) ===
              message.id,
          );

          if (exists) return oldData;

          return {
            ...(oldData || {}),
            messages: [...oldMessages, message],
          };
        },
      );

      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    };

    socketInstance.on("message:new", handleRealtimeMessage);
    socketInstance.on("newMessage", handleRealtimeMessage);

    const handleNotification = (notification: RealtimeNotificationPayload) => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });

      if (notification.type === "like") {
        toast.info("Ai đó đã thích bài viết của bạn");
      } else if (notification.type !== "friend_request") {
        toast.info(notification.message || "Bạn có thông báo mới");
      }
    };

    socketInstance.on("notification:new", handleNotification);
    socketInstance.on("notification", handleNotification);

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
      socketInstance.off("notification", handleNotification);
      socketInstance.off("notification:new");
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
