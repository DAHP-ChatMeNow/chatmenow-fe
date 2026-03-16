export interface MessageAttachment {
  url: string;
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
}

export type MessageStatus = "sending" | "sent" | "failed";

export interface Message {
  id: string;
  conversationId: string;
  _id?: string;
  senderId?: string | MessageSenderInfo;
  content?: string;
  type: string;
  attachments?: MessageAttachment[];
  callInfo?: MessageCallInfo;
  replyToMessageId?: string;
  readBy?: string[];
  isUnsent?: boolean;
  createdAt: Date | string;
  clientTempId?: string;
  status?: MessageStatus;
  isOptimistic?: boolean;
}
