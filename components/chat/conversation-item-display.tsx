"use client";

import { useConversationDisplay } from "@/hooks/use-chat";
import { ChatItem } from "./chat-item";
import { Conversation } from "@/types/conversation";
import { formatMessageTime } from "@/lib/utils";

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
      lastMsg={conversation.lastMessage?.content || "No messages yet"}
      time={formatMessageTime(conversation.lastMessage?.createdAt)}
      unread={0}
      isActive={isActive}
    />
  );
}
