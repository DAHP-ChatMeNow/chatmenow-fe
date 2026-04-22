export type AccountStatus = "active" | "suspended" | "locked";

export interface UserAccountRef {
  _id?: string;
  id?: string;
  email?: string;
  role?: string;
  isPremium?: boolean;
  premiumExpiryDate?: string | Date | null;
}

export interface User {
  id: string;
  _id?: string;
  accountId: string | UserAccountRef;
  email?: string;
  displayName: string;
  bio?: string;
  hometown?: string;
  phoneNumber?: string;
  gender?: string;
  school?: string;
  maritalStatus?: string;
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
  isPremium?: boolean;
  premiumTierName?: string;
  premiumExpiryDate?: string | Date;
  createdAt: Date;
}
