import { MessageAttachment } from "@/types/message";

export const GROUP_CARD_ATTACHMENT_TYPE =
  "application/vnd.chatmenow.group-card";

export interface GroupCardPayload {
  conversationId: string;
  displayName: string;
  avatar?: string;
  memberCount?: number;
  profileUrl: string;
}

const GROUP_CARD_PREFIX = "group-card:";

export const encodeGroupCardPayload = (payload: GroupCardPayload): string => {
  return `${GROUP_CARD_PREFIX}${encodeURIComponent(JSON.stringify(payload))}`;
};

export const decodeGroupCardPayload = (
  value?: string,
): GroupCardPayload | null => {
  if (!value || !value.startsWith(GROUP_CARD_PREFIX)) {
    return null;
  }

  try {
    const rawPayload = decodeURIComponent(value.slice(GROUP_CARD_PREFIX.length));
    const parsed = JSON.parse(rawPayload) as GroupCardPayload;

    if (!parsed?.conversationId || !parsed?.displayName || !parsed?.profileUrl) {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
};

export const createGroupCardAttachment = (
  payload: GroupCardPayload,
): MessageAttachment => ({
  url: encodeGroupCardPayload(payload),
  fileType: GROUP_CARD_ATTACHMENT_TYPE,
  fileName: `Danh thiếp nhóm - ${payload.displayName}`,
  fileSize: 0,
});
