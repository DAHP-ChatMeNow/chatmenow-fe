export interface User {
  id: string;
  _id?: string;
  accountId: string;
  displayName: string;
  bio?: string;
  avatar?: string;
  avatarUrl?: string; // Full URL from backend
  coverImage?: string;
  language?: string;
  themeColor?: string;
  isOnline: boolean;
  lastSeen?: Date;
  friends: string[];
  createdAt: Date;
}
