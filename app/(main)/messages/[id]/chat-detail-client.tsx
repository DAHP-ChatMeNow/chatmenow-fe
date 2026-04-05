"use client";

import { Fragment, useRef, useEffect, useState, useCallback } from "react";
import { MoreHorizontal, PhoneCall, PhoneMissed, PhoneOff } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChatHeader } from "@/components/chat/chat-header";
import { ChatInput } from "@/components/chat/chat-input";
import { useParams } from "next/navigation";
import {
  useAiConversation,
  useConversation,
  useDeleteMessageForMe,
  useEditMessage,
  useMessages,
  useUnsendMessage,
  useSendAiMessage,
  useSendMessage,
  useConversationDisplay,
} from "@/hooks/use-chat";
import { MessageSkeleton } from "@/components/skeletons/message-skeleton";
import { useAuthStore } from "@/store/use-auth-store";
import { useSocket } from "@/components/providers/socket-provider";
import { Message } from "@/types/message";
import { PresignedAvatar } from "@/components/ui/presigned-avatar";
import { useQueryClient } from "@tanstack/react-query";
import { chatService, MessagesResponse } from "@/api/chat";

type ChatBackgroundKey = "default" | "sky" | "sunset" | "mint" | "night";

const CHAT_BACKGROUND_CLASS: Record<ChatBackgroundKey, string> = {
  default: "bg-gradient-to-b from-white to-slate-50/40",
  sky: "bg-gradient-to-br from-blue-50 via-white to-cyan-50",
  sunset: "bg-gradient-to-br from-rose-50 via-amber-50 to-orange-100",
  mint: "bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-100",
  night: "bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950",
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

const formatMessageClock = (value: unknown): string => {
  if (!value) return "";

  const date = new Date(value as string | number | Date);
  if (Number.isNaN(date.getTime())) return "";

  return date.toLocaleTimeString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
  });
};

const normalizeLightMarkdown = (value: string): string => {
  // Handle malformed bold markers such as "***Title:**" from some AI responses.
  return value.replace(/\*\*\*([^*\n]+?:)\*\*/g, "**$1**");
};

const renderInlineBold = (text: string) => {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);

  return parts.map((part, index) => {
    const match = part.match(/^\*\*([^*]+)\*\*$/);
    if (match) {
      return <strong key={`bold-${index}`}>{match[1]}</strong>;
    }

    return <Fragment key={`text-${index}`}>{part}</Fragment>;
  });
};

const renderMessageContent = (content?: string) => {
  if (!content) return null;

  const normalized = normalizeLightMarkdown(content);
  const lines = normalized.split("\n");

  return lines.map((line, index) => (
    <p key={`line-${index}`} className={index === 0 ? "" : "mt-1"}>
      {renderInlineBold(line)}
    </p>
  ));
};

const getSystemCallDescription = (msg: Message, status: string) => {
  if (status === "missed") return "Không được trả lời";
  if (status === "rejected") return "Cuộc gọi đã bị từ chối";

  return `Thời lượng ${formatCallDuration(msg.callInfo?.duration)}`;
};

const getSystemCallTime = (msg: Message) => {
  const value = msg.callInfo?.endedAt || msg.createdAt;

  return formatMessageClock(value);
};

const getMessageSenderId = (message: Message): string | undefined => {
  if (!message.senderId) return undefined;

  if (typeof message.senderId === "string") {
    return message.senderId;
  }

  return message.senderId?._id || message.senderId?.id;
};

const isAiConversation = (conversation: any): boolean => {
  if (!conversation) return false;
  const type = String(conversation.type || "").toLowerCase();
  return (
    type === "ai" ||
    Boolean(conversation.isAI) ||
    Boolean(conversation.isAi) ||
    Boolean(conversation.isAiAssistant)
  );
};

export default function ChatDetailClient() {
  const { id } = useParams();
  const conversationId = id as string;
  const user = useAuthStore((state) => state.user);

  // Fallback cho userId
  const currentUserId = user?.id || user?._id;

  // Lấy conversation và messages riêng biệt
  const { data: conversationFromDetail } = useConversation(conversationId);
  const { data: aiConversationData } = useAiConversation();
  const {
    data: messagesData,
    isLoading,
    error,
  } = useMessages(conversationId, {
    limit: 20,
  });
  const aiConversation =
    aiConversationData?.conversation?.id === conversationId
      ? aiConversationData.conversation
      : undefined;
  const conversation = conversationFromDetail || aiConversation;
  const aiMode = isAiConversation(conversation);
  const messages =
    messagesData?.messages?.length || !aiMode
      ? messagesData?.messages || []
      : aiConversationData?.messages || [];
  const shouldShowMessageError = Boolean(error) && messages.length === 0;

  // Hook tập trung logic phân biệt private/group - tự động fetch partner nếu cần
  const {
    displayName: conversationName,
    avatar: conversationAvatar,
    isOnline: isOnlineStatus,
    statusText,
  } = useConversationDisplay(conversation, currentUserId);

  const { mutate: sendMessage, isPending: isSendingMessage } = useSendMessage();
  const { mutate: sendAiMessage, isPending: isSendingAiMessage } =
    useSendAiMessage();
  const { mutate: unsendMessage, isPending: isUnsendPending } =
    useUnsendMessage();
  const { mutate: editMessage, isPending: isEditPending } = useEditMessage();
  const { mutate: deleteMessageForMe, isPending: isDeletePending } =
    useDeleteMessageForMe();
  const queryClient = useQueryClient();
  const { socket, isConnected } = useSocket();
  const scrollRef = useRef<HTMLDivElement>(null);
  const shouldAutoScrollRef = useRef(true);
  const hasInitializedScrollRef = useRef(false);
  const beforeIdRef = useRef<string | null>(null);
  const hasMoreRef = useRef(true);
  const isLoadingOlderRef = useRef(false);
  const isMountedRef = useRef(true);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [isLoadingOlder, setIsLoadingOlder] = useState(false);
  const [backgroundKey, setBackgroundKey] =
    useState<ChatBackgroundKey>("default");

  const getMessageId = useCallback((message: Message): string | undefined => {
    return message.id || message._id;
  }, []);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    const oldestMessage = messages[0];
    beforeIdRef.current = oldestMessage
      ? getMessageId(oldestMessage) || null
      : null;

    const hasMoreFromApi =
      messagesData?.hasMore ?? messagesData?.pagination?.hasMore;
    if (typeof hasMoreFromApi === "boolean") {
      hasMoreRef.current = hasMoreFromApi;
    }

    const nextCursor =
      messagesData?.nextCursor ?? messagesData?.pagination?.nextCursor;
    if (hasMoreRef.current === false || nextCursor === null) {
      hasMoreRef.current = false;
    } else if (typeof nextCursor === "string" && nextCursor.length > 0) {
      hasMoreRef.current = true;
      beforeIdRef.current = nextCursor;
    } else if (typeof hasMoreFromApi !== "boolean") {
      hasMoreRef.current = messages.length >= 20;
    }
  }, [messages, messagesData, getMessageId]);

  useEffect(() => {
    hasMoreRef.current = true;
    isLoadingOlderRef.current = false;
    setIsLoadingOlder(false);
    beforeIdRef.current = null;
  }, [conversationId]);

  useEffect(() => {
    if (!conversationId || typeof window === "undefined") {
      setBackgroundKey("default");
      return;
    }

    const saved = localStorage.getItem(
      `chat-background:${conversationId}`,
    ) as ChatBackgroundKey | null;

    if (saved && saved in CHAT_BACKGROUND_CLASS) {
      setBackgroundKey(saved);
    } else {
      setBackgroundKey("default");
    }
  }, [conversationId]);

  useEffect(() => {
    const handleBackgroundChange = (event: Event) => {
      const customEvent = event as CustomEvent<{
        conversationId?: string;
        background?: ChatBackgroundKey;
      }>;

      const targetConversationId = customEvent.detail?.conversationId;
      const background = customEvent.detail?.background;

      if (
        targetConversationId === conversationId &&
        background &&
        background in CHAT_BACKGROUND_CLASS
      ) {
        setBackgroundKey(background);
      }
    };

    window.addEventListener("chat:background-change", handleBackgroundChange);

    return () => {
      window.removeEventListener(
        "chat:background-change",
        handleBackgroundChange,
      );
    };
  }, [conversationId]);

  const loadOlderMessages = useCallback(async () => {
    const beforeId = beforeIdRef.current;
    if (
      !conversationId ||
      !beforeId ||
      !hasMoreRef.current ||
      isLoadingOlderRef.current
    ) {
      return;
    }

    const viewport = scrollRef.current?.querySelector<HTMLDivElement>(
      "[data-radix-scroll-area-viewport]",
    );
    if (!viewport) return;

    isLoadingOlderRef.current = true;
    setIsLoadingOlder(true);

    const previousHeight = viewport.scrollHeight;
    const previousTop = viewport.scrollTop;

    try {
      const response = await chatService.getMessages(conversationId, {
        limit: 20,
        beforeId,
      });

      const olderMessages = response.messages || [];
      if (olderMessages.length === 0) {
        hasMoreRef.current = false;
        queryClient.setQueryData<MessagesResponse>(
          ["messages", conversationId],
          (old) => {
            if (!old) return old;

            return {
              ...old,
              messages: old.messages || [],
              hasMore: false,
              nextCursor: null,
              pagination: {
                ...(old.pagination || {}),
                hasMore: false,
                nextCursor: null,
              },
            };
          },
        );
        return;
      }

      queryClient.setQueryData<MessagesResponse>(
        ["messages", conversationId],
        (old) => {
          const existing = old?.messages || [];
          const existingIds = new Set(
            existing
              .map((message) => getMessageId(message))
              .filter((id): id is string => Boolean(id)),
          );

          const prepend = olderMessages.filter((message) => {
            const id = getMessageId(message);
            return !!id && !existingIds.has(id);
          });

          return {
            ...(old || {}),
            messages: [...prepend, ...existing],
            hasMore: response.hasMore,
            nextCursor: response.nextCursor,
            pagination: {
              ...(response.pagination || {}),
              hasMore: response.hasMore ?? response.pagination?.hasMore,
              nextCursor:
                response.nextCursor ?? response.pagination?.nextCursor,
            },
          };
        },
      );

      const hasMoreFromApi = response.hasMore ?? response.pagination?.hasMore;
      const responseCursor =
        response.nextCursor ?? response.pagination?.nextCursor;
      if (hasMoreFromApi === false || responseCursor === null) {
        hasMoreRef.current = false;
      } else if (
        typeof responseCursor === "string" &&
        responseCursor.length > 0
      ) {
        hasMoreRef.current = true;
        beforeIdRef.current = responseCursor;
      } else {
        const oldestLoaded = olderMessages[0];
        const oldestLoadedId = oldestLoaded ? getMessageId(oldestLoaded) : null;
        beforeIdRef.current = oldestLoadedId || null;
        hasMoreRef.current = olderMessages.length >= 20;
      }

      requestAnimationFrame(() => {
        const currentViewport =
          scrollRef.current?.querySelector<HTMLDivElement>(
            "[data-radix-scroll-area-viewport]",
          );
        if (!currentViewport) return;

        const heightDelta = currentViewport.scrollHeight - previousHeight;
        currentViewport.scrollTop = previousTop + heightDelta;
      });
    } finally {
      isLoadingOlderRef.current = false;
      if (isMountedRef.current) {
        setIsLoadingOlder(false);
      }
    }
  }, [conversationId, queryClient, getMessageId]);

  useEffect(() => {
    const viewport = scrollRef.current?.querySelector<HTMLDivElement>(
      "[data-radix-scroll-area-viewport]",
    );
    if (!viewport) return;

    const handleScroll = () => {
      if (viewport.scrollTop <= 40) {
        void loadOlderMessages();
      }

      const distanceFromBottom =
        viewport.scrollHeight - viewport.scrollTop - viewport.clientHeight;
      shouldAutoScrollRef.current = distanceFromBottom < 120;
    };

    handleScroll();
    viewport.addEventListener("scroll", handleScroll);

    return () => {
      viewport.removeEventListener("scroll", handleScroll);
    };
  }, [conversationId, loadOlderMessages]);

  useEffect(() => {
    hasInitializedScrollRef.current = false;
    shouldAutoScrollRef.current = true;
  }, [conversationId]);

  useEffect(() => {
    const viewport = scrollRef.current?.querySelector<HTMLDivElement>(
      "[data-radix-scroll-area-viewport]",
    );
    if (!viewport || messages.length === 0) return;

    const behavior = hasInitializedScrollRef.current ? "smooth" : "auto";

    if (shouldAutoScrollRef.current || !hasInitializedScrollRef.current) {
      viewport.scrollTo({ top: viewport.scrollHeight, behavior });
      hasInitializedScrollRef.current = true;
      shouldAutoScrollRef.current = true;
    }
  }, [messages]);

  useEffect(() => {
    if (!socket.current || !conversationId || aiMode) return;

    socket.current.emit("joinConversation", conversationId);

    return () => {
      socket.current?.emit("leaveConversation", conversationId);
    };
  }, [isConnected, conversationId, socket, aiMode]);

  useEffect(() => {
    if (!socket.current || !conversationId || aiMode) return;

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
  }, [isConnected, conversationId, user, aiMode]);

  const handleSendMessage = (text: string) => {
    if (!text.trim()) return;

    if (aiMode) {
      sendAiMessage({
        conversationId,
        content: text,
      });
      return;
    }

    sendMessage({
      conversationId,
      content: text,
      type: "text",
    });
  };

  const handleTyping = () => {
    if (aiMode) return;
    if (socket.current && conversationId) {
      socket.current.emit("typing", {
        conversationId,
        userId: user?.id,
        displayName: user?.displayName,
      });
    }
  };

  const handleStopTyping = () => {
    if (aiMode) return;
    if (socket.current && conversationId) {
      socket.current.emit("stopTyping", { conversationId, userId: user?.id });
    }
  };

  return (
    <div className="relative flex flex-col w-full h-full min-h-0 overflow-hidden bg-white">
      <ChatHeader
        name={conversationName}
        isOnline={isOnlineStatus}
        avatar={conversationAvatar}
        statusText={statusText}
      />

      <ScrollArea
        className={`flex-1 min-h-0 ${CHAT_BACKGROUND_CLASS[backgroundKey]}`}
        ref={scrollRef}
      >
        <div className="w-full max-w-[1240px] px-3 py-4 md:px-6 md:py-6 xl:px-10 mx-auto">
          <div className="flex flex-col w-full gap-3.5 pb-4">
            {isLoading ? (
              <MessageSkeleton />
            ) : shouldShowMessageError ? (
              <div className="py-8 text-center text-slate-500">
                Không thể tải tin nhắn
              </div>
            ) : messages && messages.length > 0 ? (
              <>
                {isLoadingOlder && hasMoreRef.current && (
                  <div className="text-xs text-center text-slate-400">
                    Đang tải tin nhắn cũ...
                  </div>
                )}
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
                              isMySystemMessage
                                ? "text-white"
                                : "text-slate-800"
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
                  const isAiMessage = msg.senderSource === "ai";
                  const isMe = isAiMessage
                    ? false
                    : msg.senderSource === "user"
                      ? messageSenderId
                        ? messageSenderId === currentUserId
                        : false
                      : messageSenderId === currentUserId;

                  const senderInfo =
                    typeof msg.senderId === "object" && msg.senderId !== null
                      ? msg.senderId
                      : undefined;

                  const senderDisplayName = isMe
                    ? user?.displayName || "You"
                    : isAiMessage
                      ? conversation?.name || "Chat AI"
                      : senderInfo?.displayName ||
                        (conversation?.type === "private"
                          ? conversationName || "User"
                          : "User");

                  const senderAvatarKey = isMe
                    ? user?.avatar
                    : isAiMessage
                      ? conversation?.groupAvatar || conversationAvatar
                      : senderInfo?.avatar ||
                        (conversation?.type === "private"
                          ? conversationAvatar
                          : undefined);
                  const messageTime = formatMessageClock(msg.createdAt);
                  const messageId = msg.id || msg._id;
                  const isTextMessage = msg.type === "text";
                  const isUnsent = Boolean(msg.isUnsent || msg.unsentAt);
                  const canEdit =
                    isMe && isTextMessage && !isUnsent && !isAiMessage;
                  const canUnsend = isMe && !isUnsent && !isAiMessage;
                  const canDeleteForMe = isMe;

                  const handleEditMessage = () => {
                    if (!messageId || !canEdit) return;

                    const currentContent = msg.content || "";
                    const nextContent = window.prompt(
                      "Sửa tin nhắn",
                      currentContent,
                    );
                    if (nextContent === null) return;

                    const trimmed = nextContent.trim();
                    if (!trimmed || trimmed === currentContent.trim()) return;

                    editMessage({
                      conversationId,
                      messageId,
                      content: trimmed,
                    });
                  };

                  const handleUnsendMessage = () => {
                    if (!messageId || !canUnsend) return;
                    const confirmed = window.confirm("Thu hồi tin nhắn này?");
                    if (!confirmed) return;

                    unsendMessage({
                      conversationId,
                      messageId,
                    });
                  };

                  const handleDeleteForMe = () => {
                    if (!messageId || !canDeleteForMe) return;

                    deleteMessageForMe({
                      conversationId,
                      messageId,
                    });
                  };

                  return (
                    <div
                      key={messageId}
                      className={`flex items-end gap-2 ${isMe ? "justify-end" : "justify-start"}`}
                    >
                      {!isMe && (
                        <PresignedAvatar
                          avatarKey={senderAvatarKey}
                          displayName={senderDisplayName}
                          className="w-8 h-8 shrink-0 self-end"
                        />
                      )}
                      <div
                        className={`px-4 py-2.5 rounded-2xl text-[14px] md:text-[15px] shadow-sm max-w-[84%] md:max-w-[70%] xl:max-w-[64%] ${
                          isMe
                            ? "bg-blue-600 text-white rounded-br-none"
                            : "bg-white text-slate-800 border border-slate-100 rounded-bl-none"
                        }`}
                      >
                        {renderMessageContent(msg.content)}
                        {isAiMessage && !isMe && (
                          <div className="mt-1.5 flex justify-start">
                            <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-blue-600">
                              AI
                            </span>
                          </div>
                        )}
                        {(msg.status === "sending" ||
                          msg.status === "failed" ||
                          messageTime) && (
                          <div
                            className={`text-[10px] mt-1 text-right ${
                              isMe ? "text-blue-100" : "text-slate-400"
                            }`}
                            suppressHydrationWarning
                          >
                            {msg.status === "sending"
                              ? "Đang gửi..."
                              : msg.status === "failed"
                                ? "Gửi thất bại"
                                : messageTime}
                          </div>
                        )}

                        {(msg.isEdited || isUnsent) && (
                          <div
                            className={`mt-1 text-[10px] ${
                              isMe ? "text-blue-100" : "text-slate-400"
                            }`}
                          >
                            {isUnsent
                              ? "Đã thu hồi"
                              : msg.isEdited
                                ? "Đã chỉnh sửa"
                                : ""}
                          </div>
                        )}

                        {isMe && (canEdit || canUnsend || canDeleteForMe) && (
                          <div className="mt-1.5 flex justify-end">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <button
                                  type="button"
                                  aria-label="Mở tùy chọn tin nhắn"
                                  className="inline-flex items-center justify-center rounded-full p-1 text-blue-100 hover:bg-blue-500/40 hover:text-white"
                                  disabled={
                                    isEditPending ||
                                    isUnsendPending ||
                                    isDeletePending
                                  }
                                >
                                  <MoreHorizontal className="h-4 w-4" />
                                </button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-40">
                                {canEdit && (
                                  <DropdownMenuItem onClick={handleEditMessage}>
                                    Sửa tin nhắn
                                  </DropdownMenuItem>
                                )}
                                {canUnsend && (
                                  <DropdownMenuItem
                                    onClick={handleUnsendMessage}
                                  >
                                    Thu hồi tin nhắn
                                  </DropdownMenuItem>
                                )}
                                {canDeleteForMe && (
                                  <DropdownMenuItem onClick={handleDeleteForMe}>
                                    Xóa phía tôi
                                  </DropdownMenuItem>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        )}
                      </div>
                      {isMe && (
                        <PresignedAvatar
                          avatarKey={senderAvatarKey}
                          displayName={senderDisplayName}
                          className="w-8 h-8 shrink-0 self-end"
                        />
                      )}
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
              <div className="py-8 text-center text-slate-500">
                Chưa có tin nhắn nào. Hãy bắt đầu cuộc trò chuyện!
              </div>
            )}
          </div>
        </div>
      </ScrollArea>

      <ChatInput
        onSend={handleSendMessage}
        disabled={!conversationId || isSendingMessage || isSendingAiMessage}
        onTyping={handleTyping}
        onStopTyping={handleStopTyping}
      />
    </div>
  );
}
