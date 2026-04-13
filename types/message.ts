export interface MessageAttachment {
  key?: string;
  url?: string;
  fileType: string;
  fileName: string;
  fileSize: number;
}

export interface MessageSenderInfo {
  _id?: string;
  id?: string;
  displayName?: string;
  avatar?: string;
}

export interface MessageCallInfo {
  status?: string;
  duration?: number;
  startedAt?: string | Date;
  endedAt?: string | Date;
  participants?: Array<{
    userId?: string;
    displayName?: string;
    avatar?: string;
    joinedAt?: string | Date;
  }>;
}

export interface MessageReplyPreview {
  content?: string;
  type?: string;
  attachments?: MessageAttachment[];
  senderDisplayName?: string;
}

export type MessageReactionEmoji = "like" | "love" | "haha" | "sad" | "angry" | "wow";

export interface MessageReaction {
  userId: string;
  emoji: MessageReactionEmoji;
  reactedAt?: string | Date;
}

export type MessageStatus = "sending" | "sent" | "failed";
export type MessageSenderSource = "user" | "ai";

export interface Message {
  id: string;
  conversationId: string;
  _id?: string;
  senderId?: string | MessageSenderInfo;
  senderSource?: MessageSenderSource;
  content?: string;
  type: string;
  attachments?: MessageAttachment[];
  callInfo?: MessageCallInfo;
  sharedPostId?: string;
  sharedPost?: import("./post").SharedPostReference | null;
  replyToMessageId?: string;
  replyPreview?: MessageReplyPreview;
  reactions?: MessageReaction[];
  readBy?: string[];
  isUnsent?: boolean;
  isEdited?: boolean;
  editedAt?: Date | string;
  unsentAt?: Date | string;
  deletedFor?: string[];
  createdAt: Date | string;
  clientTempId?: string;
  status?: MessageStatus;
  isOptimistic?: boolean;
}
