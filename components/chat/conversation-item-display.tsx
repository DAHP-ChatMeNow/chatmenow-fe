"use client";

import { useConversationDisplay } from "@/hooks/use-chat";
import { ChatItem } from "./chat-item";
import { Conversation } from "@/types/conversation";
import { formatMessageTime } from "@/lib/utils";

const formatLastMessagePreview = (conversation: Conversation): string => {
  const lastMessage = conversation.lastMessage;
  if (!lastMessage) return "No messages yet";

  const callStatus = (
    lastMessage.callInfo?.status ||
    lastMessage.content ||
    ""
  ).toLowerCase();

  if (lastMessage.type === "system") {
    if (callStatus === "ended") return "Cuộc gọi kết thúc";
    if (callStatus === "rejected") return "Cuộc gọi bị từ chối";
    if (callStatus === "missed") return "Cuộc gọi nhỡ";
  }

  return lastMessage.content || "No messages yet";
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

  return (
    <ChatItem
      id={conversation.id}
      avatar={avatar}
      name={displayName || "Unknown"}
      lastMsg={formatLastMessagePreview(conversation)}
      time={formatMessageTime(conversation.lastMessage?.createdAt)}
      unread={0}
      isActive={isActive}
    />
  );
}
