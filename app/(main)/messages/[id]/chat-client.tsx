"use client";

import { useRef, useEffect, useState } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ChatHeader } from "@/components/chat/chat-header";
import { ChatInput } from "@/components/chat/chat-input";
import { useParams } from "next/navigation";
import {
  useConversation,
  useMessages,
  useSendMessage,
  useConversationDisplay,
} from "@/hooks/use-chat";
import { MessageSkeleton } from "@/components/skeletons/message-skeleton";
import { useAuthStore } from "@/store/use-auth-store";
import { useSocket } from "@/components/providers/socket-provider";
import { useQueryClient } from "@tanstack/react-query";
import { Message } from "@/types/message";

export default function ChatDetailPage() {
  const { id } = useParams();
  const conversationId = id as string;
  const user = useAuthStore((state) => state.user);

  // Fallback cho userId
  const currentUserId = user?.id || user?._id;

  // Lấy conversation và messages riêng biệt
  const { data: conversation } = useConversation(conversationId);
  const { data: messagesData, isLoading, error } = useMessages(conversationId);
  const messages = messagesData?.messages || [];

  // Hook tập trung logic phân biệt private/group - tự động fetch partner nếu cần
  const {
    displayName: conversationName,
    avatar: conversationAvatar,
    isOnline: isOnlineStatus,
  } = useConversationDisplay(conversation, currentUserId);

  const { mutate: sendMessage, isPending } = useSendMessage();
  const { socket, isConnected } = useSocket();
  const queryClient = useQueryClient();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);

  useEffect(() => {
    if (scrollRef.current && messages) {
      const viewport = scrollRef.current.querySelector(
        "[data-radix-scroll-area-viewport]",
      );
      if (viewport)
        viewport.scrollTo({ top: viewport.scrollHeight, behavior: "smooth" });
    }
  }, [messages]);

  useEffect(() => {
    if (!socket || !conversationId) return;

    socket.emit("joinConversation", conversationId);

    const handleNewMessage = (newMessage: Message) => {
      queryClient.setQueryData(["messages", conversationId], (oldData: { messages: Message[] } | undefined) => {
        if (!oldData) return { messages: [newMessage] };
        const exists = oldData.messages.some(
          (msg: Message) => msg.id === newMessage.id,
        );
        if (exists) return oldData;
        return {
          messages: [...oldData.messages, newMessage],
        };
      });

      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    };

    socket.on("newMessage", handleNewMessage);

    return () => {
      socket.off("newMessage", handleNewMessage);
      socket.emit("leaveConversation", conversationId);
    };
  }, [socket, conversationId, queryClient]);

  useEffect(() => {
    if (!socket || !conversationId) return;

    const handleUserTyping = ({
      userId,
      displayName,
    }: {
      userId: string;
      displayName: string;
    }) => {
      if (userId !== user?.id) {
        setTypingUsers((prev) => {
          if (!prev.includes(displayName)) return [...prev, displayName];
          return prev;
        });
      }
    };

    const handleUserStopTyping = ({ userId }: { userId: string }) => {
      setTypingUsers((prev) => prev.filter((name) => name !== userId));
    };

    socket.on("userTyping", handleUserTyping);
    socket.on("userStopTyping", handleUserStopTyping);

    return () => {
      socket.off("userTyping", handleUserTyping);
      socket.off("userStopTyping", handleUserStopTyping);
    };
  }, [socket, conversationId, user]);

  const handleSendMessage = (text: string) => {
    if (!text.trim() || isPending) return;

    sendMessage({
      conversationId,
      content: text,
      type: "text",
    });
  };

  const handleTyping = () => {
    if (socket && conversationId) {
      socket.emit("typing", {
        conversationId,
        userId: user?.id,
        displayName: user?.displayName,
      });
    }
  };

  const handleStopTyping = () => {
    if (socket && conversationId) {
      socket.emit("stopTyping", { conversationId, userId: user?.id });
    }
  };

  return (
    <div className="flex flex-col h-full bg-white relative w-full overflow-hidden">
      <ChatHeader
        name={conversationName}
        isOnline={isOnlineStatus}
        avatar={conversationAvatar}
      />

      <ScrollArea className="flex-1 p-3 md:p-6 bg-slate-50/30" ref={scrollRef}>
        <div className="flex flex-col gap-4 w-full max-w-5xl mx-auto pb-4">
          {isLoading ? (
            <MessageSkeleton />
          ) : error ? (
            <div className="text-center py-8 text-slate-500">
              Không thể tải tin nhắn
            </div>
          ) : messages && messages.length > 0 ? (
            <>
              {messages.map((msg: Message) => {
                // So sánh senderId với currentUserId (handle cả _id và id)
                const messageSenderId =
                  typeof msg.senderId === "string"
                    ? msg.senderId
                    : (msg.senderId as { _id?: string; id?: string })?._id ||
                      (msg.senderId as { _id?: string; id?: string })?.id;
                const isMe = messageSenderId === currentUserId;

                // Debug log
                if (messages.indexOf(msg) === 0) {
                  console.log("Message comparison:", {
                    messageSenderId,
                    currentUserId,
                    isMe,
                    rawSenderId: msg.senderId,
                  });
                }

                return (
                  <div
                    key={msg.id}
                    className={`flex ${isMe ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`px-4 py-2.5 rounded-2xl text-[14px] md:text-[15px] shadow-sm max-w-[85%] md:max-w-[70%] lg:max-w-[60%] ${
                        isMe
                          ? "bg-blue-600 text-white rounded-br-none"
                          : "bg-white text-slate-800 border border-slate-100 rounded-bl-none"
                      }`}
                    >
                      {msg.content}
                      <div
                        className={`text-[10px] mt-1 text-right ${
                          isMe ? "text-blue-100" : "text-slate-400"
                        }`}
                        suppressHydrationWarning
                      >
                        {new Date(msg.createdAt).toLocaleTimeString("vi-VN", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </div>
                    </div>
                  </div>
                );
              })}

              {typingUsers.length > 0 && (
                <div className="flex justify-start">
                  <div className="px-4 py-2.5 rounded-2xl text-[14px] bg-slate-200 text-slate-600">
                    {typingUsers[0]} đang soạn tin...
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-8 text-slate-500">
              Chưa có tin nhắn nào. Hãy bắt đầu cuộc trò chuyện!
            </div>
          )}
        </div>
      </ScrollArea>

      <ChatInput
        onSend={handleSendMessage}
        disabled={isPending}
        onTyping={handleTyping}
        onStopTyping={handleStopTyping}
      />
    </div>
  );
}
