"use client";

import { useConversationDisplay } from "@/hooks/use-chat";
import { ChatItem } from "./chat-item";
import { Conversation } from "@/types/conversation";
import { formatMessageTime } from "@/lib/utils";

type ChatMemberUser =
  | string
  | {
      _id?: string;
      id?: string;
      displayName?: string;
      avatar?: string;
    };

type ChatConversationMember = Omit<Conversation["members"][number], "userId"> & {
  userId: ChatMemberUser;
};

type ChatConversation = Omit<Conversation, "members"> & {
  members: ChatConversationMember[];
};

type GroupAvatarMemberView = {
  userId: string;
  displayName: string;
  avatar?: string;
};

const getMemberUserId = (
  member: ChatConversationMember,
): string | undefined => {
  if (typeof member.userId === "string") return member.userId;
  return member.userId?._id || member.userId?.id;
};

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
  const typedConversation = conversation as ChatConversation;
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
  const groupAvatarMembers: GroupAvatarMemberView[] =
    conversation.type === "group"
      ? typedConversation.members
          .map((member) => {
            const userId = getMemberUserId(member);
            const profile =
              typeof member.userId === "string" ? undefined : member.userId;
            const fallbackMemberName = profile?.displayName || "User";

            return {
              userId: userId || fallbackMemberName,
              displayName: fallbackMemberName,
              avatar: profile?.avatar || "",
            };
          })
          .filter((member) => Boolean(member.userId))
      : [];
  const shouldUseCompositeGroupAvatar =
    conversation.type === "group" &&
    !conversation.groupAvatar &&
    groupAvatarMembers.length >= 3;
  const groupMemberCount =
    conversation.type === "group" ? typedConversation.members.length : 0;

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
      useCompositeGroupAvatar={shouldUseCompositeGroupAvatar}
      groupAvatarMembers={groupAvatarMembers}
      groupMemberCount={groupMemberCount}
    />
  );
}
