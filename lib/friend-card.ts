import { MessageAttachment } from "@/types/message";

export const FRIEND_CARD_ATTACHMENT_TYPE =
  "application/vnd.chatmenow.friend-card";

export interface FriendCardPayload {
  userId: string;
  displayName: string;
  avatar?: string;
  email?: string;
  profileUrl: string;
}

const FRIEND_CARD_PREFIX = "friend-card:";

export const encodeFriendCardPayload = (payload: FriendCardPayload): string => {
  return `${FRIEND_CARD_PREFIX}${encodeURIComponent(JSON.stringify(payload))}`;
};

export const decodeFriendCardPayload = (
  value?: string,
): FriendCardPayload | null => {
  if (!value || !value.startsWith(FRIEND_CARD_PREFIX)) {
    return null;
  }

  try {
    const rawPayload = decodeURIComponent(value.slice(FRIEND_CARD_PREFIX.length));
    const parsed = JSON.parse(rawPayload) as FriendCardPayload;

    if (!parsed?.userId || !parsed?.displayName || !parsed?.profileUrl) {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
};

export const createFriendCardAttachment = (
  payload: FriendCardPayload,
): MessageAttachment => ({
  url: encodeFriendCardPayload(payload),
  fileType: FRIEND_CARD_ATTACHMENT_TYPE,
  fileName: `Danh thiếp - ${payload.displayName}`,
  fileSize: 0,
});
