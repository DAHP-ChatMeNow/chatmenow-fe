export interface ConversationMember {
  userId: string;
  joinedAt: Date;
  role: string;
  lastReadAt?: Date;
}

export interface LastMessage {
  content?: string;
  senderId?: string;
  senderSource?: "user" | "ai";
  senderName?: string;
  type?: string;
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
  members: ConversationMember[];
  lastMessage?: LastMessage;
  createdAt: Date;
  updatedAt: Date;
}
