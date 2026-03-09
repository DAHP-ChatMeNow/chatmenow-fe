export interface User {
  id: string;
  _id?: string;
  accountId: string;
  email?: string;
  displayName: string;
  bio?: string;
  phone?: string;
  avatar?: string;
  coverImage?: string;
  language?: string;
  themeColor?: string;
  isOnline: boolean;
  lastSeen?: Date;
  friends: string[];
  createdAt: Date;
}
