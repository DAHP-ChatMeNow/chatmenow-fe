"use client";

import { useRef, useEffect, useState } from "react";
import { PhoneCall, PhoneMissed, PhoneOff } from "lucide-react";
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
import { Message } from "@/types/message";

const getMessageSenderId = (message: Message): string | undefined => {
  if (!message.senderId) return undefined;

  if (typeof message.senderId === "string") {
    return message.senderId;
  }

  return message.senderId?._id || message.senderId?.id;
};

const normalizeCallStatus = (msg: Message): string => {
  const status = msg.callInfo?.status?.toLowerCase();
  if (status) return status;

  const text = (msg.content || "").toLowerCase();
  if (text === "ended" || text === "rejected" || text === "missed") {
    return text;
  }

  if (text.includes("nhỡ") || text.includes("nho")) return "missed";
  if (text.includes("từ chối") || text.includes("tu choi")) return "rejected";
  return "ended";
};

const getSystemCallStyle = (status: string) => {
  const text = status.toLowerCase();

  if (text.includes("nhỡ") || text.includes("nho")) {
    return {
      Icon: PhoneMissed,
      iconClass: "bg-rose-100 text-rose-600",
      bubbleClass: "border-rose-100",
    };
  }

  if (text.includes("từ chối") || text.includes("tu choi")) {
    return {
      Icon: PhoneOff,
      iconClass: "bg-amber-100 text-amber-600",
      bubbleClass: "border-amber-100",
    };
  }

  return {
    Icon: PhoneCall,
    iconClass: "bg-blue-100 text-blue-600",
    bubbleClass: "border-blue-100",
  };
};

const getSystemCallTitle = (status: string) => {
  const text = status.toLowerCase();

  if (text.includes("missed")) return "Cuộc gọi nhỡ";
  if (text.includes("rejected")) return "Cuộc gọi bị từ chối";
  return "Cuộc gọi kết thúc";
};

const formatCallDuration = (seconds?: number) => {
  if (!seconds || seconds <= 0) return "0s";

  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;

  if (mins <= 0) return `${secs}s`;
  return `${mins}m ${secs}s`;
};

const getSystemCallDescription = (msg: Message, status: string) => {
  if (status === "missed") return "Không được trả lời";
  if (status === "rejected") return "Cuộc gọi đã bị từ chối";

  return `Thời lượng ${formatCallDuration(msg.callInfo?.duration)}`;
};

const getSystemCallTime = (msg: Message) => {
  const value = msg.callInfo?.endedAt || msg.createdAt;

  return new Date(value).toLocaleTimeString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
  });
};

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
    statusText,
  } = useConversationDisplay(conversation, currentUserId);

  const { mutate: sendMessage, isPending } = useSendMessage();
  const { socket, isConnected } = useSocket();
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
    if (!socket.current || !conversationId) return;

    socket.current.emit("joinConversation", conversationId);

    return () => {
      socket.current?.emit("leaveConversation", conversationId);
    };
  }, [isConnected, conversationId, socket]);

  useEffect(() => {
    if (!socket.current || !conversationId) return;

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

    socket.current.on("userTyping", handleUserTyping);
    socket.current.on("userStopTyping", handleUserStopTyping);

    return () => {
      socket.current?.off("userTyping", handleUserTyping);
      socket.current?.off("userStopTyping", handleUserStopTyping);
    };
  }, [isConnected, conversationId, user]);

  const handleSendMessage = (text: string) => {
    if (!text.trim() || isPending) return;

    sendMessage({
      conversationId,
      content: text,
      type: "text",
    });
  };

  const handleTyping = () => {
    if (socket.current && conversationId) {
      socket.current.emit("typing", {
        conversationId,
        userId: user?.id,
        displayName: user?.displayName,
      });
    }
  };

  const handleStopTyping = () => {
    if (socket.current && conversationId) {
      socket.current.emit("stopTyping", { conversationId, userId: user?.id });
    }
  };

  return (
    <div className="flex flex-col h-full bg-white relative w-full overflow-hidden">
      <ChatHeader
        name={conversationName}
        isOnline={isOnlineStatus}
        avatar={conversationAvatar}
        statusText={statusText}
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
                if (msg.type === "system") {
                  const callStatus = normalizeCallStatus(msg);
                  const callStyle = getSystemCallStyle(callStatus);
                  const callTitle = getSystemCallTitle(callStatus);
                  const callDescription = getSystemCallDescription(
                    msg,
                    callStatus,
                  );
                  const systemSenderId = getMessageSenderId(msg);
                  const isMySystemMessage =
                    !!systemSenderId && systemSenderId === currentUserId;

                  return (
                    <div
                      key={msg.id || msg._id}
                      className={`flex items-end gap-2 ${
                        isMySystemMessage ? "justify-end" : "justify-start"
                      }`}
                    >
                      {!isMySystemMessage && (
                        <div
                          className={`h-8 w-8 rounded-full flex items-center justify-center ${callStyle.iconClass}`}
                        >
                          <callStyle.Icon className="w-4 h-4" />
                        </div>
                      )}

                      <div
                        className={`px-3.5 py-2 rounded-2xl shadow-sm max-w-[84%] md:max-w-[60%] border ${
                          isMySystemMessage
                            ? "bg-blue-600 text-white rounded-br-none border-blue-600"
                            : `bg-white text-slate-800 rounded-bl-none ${callStyle.bubbleClass}`
                        }`}
                      >
                        <p
                          className={`text-[13px] font-semibold ${
                            isMySystemMessage ? "text-white" : "text-slate-800"
                          }`}
                        >
                          {callTitle}
                        </p>
                        <p
                          className={`mt-0.5 text-[11px] ${
                            isMySystemMessage
                              ? "text-blue-100"
                              : "text-slate-600"
                          }`}
                        >
                          {callDescription}
                        </p>
                        <p
                          className={`mt-0.5 text-[10px] ${
                            isMySystemMessage
                              ? "text-blue-100"
                              : "text-slate-400"
                          }`}
                        >
                          {getSystemCallTime(msg)}
                        </p>
                      </div>

                      {isMySystemMessage && (
                        <div className="h-8 w-8 rounded-full flex items-center justify-center bg-blue-500/20 text-blue-600">
                          <callStyle.Icon className="w-4 h-4" />
                        </div>
                      )}
                    </div>
                  );
                }

                const messageSenderId = getMessageSenderId(msg);
                const isMe = messageSenderId === currentUserId;

                return (
                  <div
                    key={msg.id || msg._id}
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
