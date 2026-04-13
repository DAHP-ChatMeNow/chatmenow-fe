import { User } from "./user";

export interface NotificationMedia {
  url: string;
  type?: string;
}

export interface NotificationReferenced {
  _id?: string;
  id?: string;
  content?: string;
  media?: NotificationMedia[];
  authorId?: User | string;
  createdAt?: string;
}

export interface Notification {
  id: string;
  recipientId: string;
  senderId?: string | User;
  senderName?: string;
  senderAvatar?: string;
  displayText?: string;
  previewImage?: string;
  targetUrl?: string;
  type: string;
  referenced?: string | NotificationReferenced;
  metadata?: {
    requestId?: string;
    requestType?: string;
    conversationId?: string;
    memberIds?: string[];
    status?: string;
  };
  message: string;
  isRead: boolean;
  createdAt: Date | string;
}
