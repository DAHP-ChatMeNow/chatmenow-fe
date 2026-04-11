export type AccountStatus = "active" | "suspended" | "locked";

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
  lastSeenText?: string;
  friendsCount?: number;
  isFriend?: boolean;
  mutualFriendsCount?: number;
  friends: string[];
  blockedUsers?: string[];
  accountStatus?: AccountStatus;
  suspendedUntil?: string | Date;
  statusReason?: string;
  createdAt: Date;
}
