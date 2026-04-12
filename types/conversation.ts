export interface ConversationMember {
  userId: string;
  joinedAt: Date;
  role: string;
  lastReadAt?: Date;
}

export interface LastMessage {
  content?: string;
  type?: string;
  senderId?: string;
  senderSource?: "user" | "ai";
  senderName?: string;
  pinManagementEnabled?: boolean;
  callInfo?: {
    status?: string;
    duration?: number;
    startedAt?: Date | string;
    endedAt?: Date | string;
  };
  createdAt?: Date;
}

export interface Conversation {
  id: string;
  _id: string;
  type: string;
  isAI?: boolean;
  isAi?: boolean;
  isAiAssistant?: boolean;
  name?: string;
  groupAvatar?: string;
  pinManagementEnabled?: boolean;
  joinApprovalEnabled?: boolean;
  members: ConversationMember[];
  lastMessage?: LastMessage;
  unreadCount?: number;
  isBlocked?: boolean;
  blockedByMe?: boolean;
  blockedByOther?: boolean;
  blockReason?: string | null;
  createdAt: Date;
  updatedAt: Date;
}
