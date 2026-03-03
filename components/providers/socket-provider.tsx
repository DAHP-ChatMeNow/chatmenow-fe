"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import { io, Socket } from "socket.io-client";
import { useAuthStore } from "@/store/use-auth-store";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { BASE_SOCKET_URL } from "@/types/utils";
import { Notification } from "@/types/notification";

const SOCKET_URL = BASE_SOCKET_URL;

// ✅ Socket event interfaces
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

interface FriendRequestRemovedEvent {
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

interface FriendRemovedEvent {
  removedFriendId: string;
}

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
}

const SocketContext = createContext<SocketContextType>({
  socket: null,
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

export function SocketProvider({ children }: SocketProviderProps) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const token = useAuthStore((state) => state.token);
  const user = useAuthStore((state) => state.user);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!token || !user?._id) {
      if (socket) {
        socket.disconnect();
        setSocket(null);
        setIsConnected(false);
      }
      return;
    }

    const socketInstance = io(SOCKET_URL, {
      auth: { token },
      transports: ["websocket", "polling"],
    });

    socketInstance.on("connect", () => {
      const userId = user._id || user.id;
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

    socketInstance.on(
      "friend_request_removed",
      (data: FriendRequestRemovedEvent) => {
        queryClient.invalidateQueries({ queryKey: ["friend-requests"] });
        toast.success("Đã từ chối lời mời kết bạn");
      },
    );

    socketInstance.on("friend_list_updated", (data: FriendListUpdatedEvent) => {
      queryClient.invalidateQueries({ queryKey: ["friend-requests"] });
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      toast.success(
        `Bạn và ${data.newFriend?.displayName || "người dùng"} đã là bạn bè`,
      );
    });

    socketInstance.on("friend_removed", (data: FriendRemovedEvent) => {
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      toast.info("Một người bạn đã xóa bạn khỏi danh sách");
    });

    socketInstance.on("notification:new", (notification: Notification) => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });

      if (notification.type === "like") {
        toast.info("Ai đó đã thích bài viết của bạn");
      } else if (notification.type === "message") {
        toast.info("Bạn có tin nhắn mới");
      } else if (notification.type !== "friend_request") {
        toast.info(notification.message);
      }
    });

    // Real-time like event
    socketInstance.on("post:liked", ({ postId }: { postId: string }) => {
      queryClient.invalidateQueries({ queryKey: ["posts", postId] });
      queryClient.invalidateQueries({ queryKey: ["feed"] });
    });

    setSocket(socketInstance);

    return () => {
      socketInstance.off("connected");
      socketInstance.off("friend_request_received");
      socketInstance.off("friend_request_accepted");
      socketInstance.off("friend_request_rejected");
      socketInstance.off("friend_request_removed");
      socketInstance.off("friend_list_updated");
      socketInstance.off("friend_removed");
      socketInstance.off("notification:new");
      socketInstance.off("post:liked");
      socketInstance.offAny();
      socketInstance.disconnect();
    };
  }, [token, user, queryClient]);

  return (
    <SocketContext.Provider value={{ socket, isConnected }}>
      {children}
    </SocketContext.Provider>
  );
}
