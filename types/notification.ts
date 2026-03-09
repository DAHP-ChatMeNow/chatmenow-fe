import { User } from "./user";

export interface Notification {
  id: string;
  recipientId: string;
  senderId?: string | User;
  type: string;
  referenced?: string;
  message: string;
  isRead: boolean;
  createdAt: Date;
}
