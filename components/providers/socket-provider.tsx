"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { io, Socket } from "socket.io-client";
import { useAuthStore } from "@/store/use-auth-store";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { BASE_SOCKET_URL } from "@/types/utils";
import { Notification } from "@/types/notification";

const SOCKET_URL = BASE_SOCKET_URL || "http://192.168.1.11:5000"; 

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
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!token) {
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
      console.log("✅ Socket connected:", socketInstance.id);
      setIsConnected(true);
      toast.success("Kết nối thành công");
    });

    socketInstance.on("disconnect", () => {
      console.log("❌ Socket disconnected");
      setIsConnected(false);
      toast.info("Mất kết nối");
    });

    socketInstance.on("connect_error", (error) => {
      console.error("Socket connection error:", error);
      setIsConnected(false);
      toast.error("Lỗi kết nối socket");
    });

    // Real-time notifications
    socketInstance.on("notification:new", (notification: Notification) => {
      // Add to notifications list
      queryClient.setQueryData(["notifications"], (oldData: any) => {
        if (!oldData) return { notifications: [notification], unreadCount: 1 };
        return {
          notifications: [notification, ...oldData.notifications],
          unreadCount: oldData.unreadCount + 1,
        };
      });

      // Show toast based on notification type
      if (notification.type === "friend_request") {
        toast.info("Bạn có lời mời kết bạn mới");
      } else if (notification.type === "like") {
        toast.info("Ai đó đã thích bài viết của bạn");
      } else if (notification.type === "message") {
        toast.info("Bạn có tin nhắn mới");
      } else {
        toast.info(notification.message);
      }
    });

    // Real-time friend request events
    socketInstance.on("friendRequest:received", () => {
      queryClient.invalidateQueries({ queryKey: ["friend-requests"] });
    });

    // Real-time like event
    socketInstance.on("post:liked", ({ postId }: { postId: string }) => {
      queryClient.invalidateQueries({ queryKey: ["posts", postId] });
      queryClient.invalidateQueries({ queryKey: ["feed"] });
    });

    setSocket(socketInstance);

    return () => {
      socketInstance.disconnect();
    };
  }, [token, queryClient]);

  return (
    <SocketContext.Provider value={{ socket, isConnected }}>
      {children}
    </SocketContext.Provider>
  );
}
