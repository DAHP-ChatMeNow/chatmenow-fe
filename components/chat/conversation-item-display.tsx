"use client";

import { useConversationDisplay } from "@/hooks/use-chat";
import { ChatItem } from "./chat-item";
import { Conversation } from "@/types/conversation";
import { formatMessageTime } from "@/lib/utils";

const formatLastMessagePreview = (conversation: Conversation): string => {
  const lastMessage = conversation.lastMessage;
  if (!lastMessage) return "Chưa có tin nhắn";

  const callStatus = (
    lastMessage.callInfo?.status ||
    lastMessage.content ||
    ""
  ).toLowerCase();

  if (lastMessage.type === "system") {
    if (callStatus === "accepted") {
      return lastMessage.content || "Một thành viên đã tham gia cuộc gọi";
    }
    if (callStatus === "ended") return "Cuộc gọi kết thúc";
    if (callStatus === "rejected") return "Cuộc gọi bị từ chối";
    if (callStatus === "missed") return "Cuộc gọi nhỡ";
  }

  if (lastMessage.type === "shared_post") {
    if (lastMessage.content && lastMessage.content.trim()) {
      return `Đã chia sẻ bài viết: ${lastMessage.content}`;
    }
    return "Đã chia sẻ một bài viết";
  }

  return lastMessage.content || "Chưa có tin nhắn";
};

const isAiConversation = (conversation: Conversation): boolean => {
  const extra = conversation as Conversation & {
    isAI?: boolean;
    isAi?: boolean;
    isAiAssistant?: boolean;
  };
  const type = String(conversation.type || "").toLowerCase();
  return (
    type === "ai" ||
    Boolean(extra.isAI) ||
    Boolean(extra.isAi) ||
    Boolean(extra.isAiAssistant)
  );
};

export function ConversationItemDisplay({
  conversation,
  currentUserId,
  isActive,
}: {
  conversation: Conversation;
  currentUserId: string | undefined;
  isActive: boolean;
}) {
  const { displayName, avatar } = useConversationDisplay(
    conversation,
    currentUserId,
  );
  const isAi = isAiConversation(conversation);
  const isBlocked = Boolean(conversation.isBlocked);
  const blockedLabel = conversation.blockedByMe
    ? "Bạn đã chặn người này"
    : conversation.blockedByOther
      ? "Người này đã chặn bạn"
      : undefined;

  const fallbackName = isAi ? "Chat AI" : "Unknown";
  const fallbackLastMessage = isAi
    ? "Bắt đầu hỏi AI về bất kỳ chủ đề nào"
    : "Chưa có tin nhắn";

  return (
    <ChatItem
      id={conversation.id}
      avatar={avatar}
      name={displayName || conversation.name || fallbackName}
      lastMsg={formatLastMessagePreview(conversation) || fallbackLastMessage}
      time={formatMessageTime(conversation.lastMessage?.createdAt)}
      unread={conversation.unreadCount || 0}
      isActive={isActive}
      isBlocked={isBlocked}
      blockedLabel={blockedLabel}
    />
  );
}
