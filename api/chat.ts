import api from "@/lib/axios";
import { Conversation } from "@/types/conversation";
import { Message, MessageAttachment } from "@/types/message";

export interface ConversationsResponse {
  conversations: Conversation[];
}

export interface ConversationDetailsResponse {
  conversation: Conversation;
}

export interface MarkConversationAsReadResponse {
  success: boolean;
  conversationId: string;
  lastReadAt?: string;
  unreadCount?: number;
}

export interface MessagesResponse {
  messages: Message[];
  conversation?: Conversation;
  total?: number;
  limit?: number;
  hasMore?: boolean;
  nextCursor?: string | null;
  pagination?: {
    hasMore?: boolean;
    nextCursor?: string | null;
  };
}

export interface PinnedMessageItem {
  messageId: string;
  pinnedAt?: string;
  pinnedBy?: string;
  message: Message;
}

export interface PinnedMessagesResponse {
  success?: boolean;
  pinnedMessages: PinnedMessageItem[];
  latestPinnedMessage: Message | null;
}

export interface GetMessagesParams {
  limit?: number;
  beforeId?: string;
}

export interface ChatUploadPresignPutPayload {
  fileName: string;
  contentType: string;
  fileSize: number;
}

export interface ChatUploadPresignPutResponse {
  uploadUrl: string;
  key: string;
  fileName?: string;
  contentType?: string;
  fileSize?: number;
  expiresIn?: number;
}

export type UploadProgressCallback = (progressPercent: number) => void;

export interface SendMessagePayload {
  conversationId: string;
  content: string;
  type: string;
  attachments?: MessageAttachment[];
  replyToMessageId?: string;
  sharedPostId?: string;
}

export interface PartnerResponse {
  partner: {
    _id: string;
    displayName: string;
    avatar: string;
    isOnline: boolean;
    lastSeen?: Date;
  };
}

export interface AiConversationResponse {
  conversation: Conversation;
  messages?: Message[];
}

export interface UpdateGroupConversationPayload {
  name?: string;
  groupAvatar?: string;
  pinManagementEnabled?: boolean;
  joinApprovalEnabled?: boolean;
}

export interface GroupJoinInfoResponse {
  success?: boolean;
  conversationId: string;
  name: string;
  groupAvatar?: string;
  memberCount: number;
  isMember: boolean;
  joinApprovalEnabled: boolean;
}

export interface JoinGroupByLinkResponse {
  success?: boolean;
  joined: boolean;
  alreadyMember: boolean;
  requestCreated: boolean;
  pendingApproval: boolean;
  conversation: Conversation | null;
}

export interface SendAiMessagePayload {
  conversationId?: string;
  content: string;
}

export interface AiMessageExchangeResponse {
  conversation?: Conversation;
  messages: Message[];
}

export interface DeleteMessageForMeResponse {
  success: boolean;
  messageId: string;
  conversationId?: string;
}

export interface AiAdminConfig {
  isEnabled: boolean;
  autoCommentEnabled: boolean;
  botName: string;
  botAvatar: string;
  botBio: string;
  conversationName: string;
  updatedAt?: string;
}

export interface UpdateAiAdminConfigPayload {
  isEnabled?: boolean;
  autoCommentEnabled?: boolean;
  botName?: string;
  botAvatar?: string;
  botBio?: string;
  conversationName?: string;
  imageFile?: File;
}

export interface UpdateAiAdminConfigResponse {
  success: boolean;
  config: AiAdminConfig;
  key?: string;
  message?: string;
}

export interface AiUsageMetric {
  totalConversations: number;
  userMessages: number;
  aiReplies: number;
  activeUsers: number;
  aiCommentOpeners: number;
  aiAutoReplies: number;
}

export interface AiAdminStats {
  days: number;
  total: AiUsageMetric;
  period: AiUsageMetric;
}

export interface AiAdminAvatarView {
  key: string;
  viewUrl: string;
  expiresIn: number;
}

export interface UnreadSummaryResult {
  status: string;
  assistantName: string;
  unreadCount: number;
  threshold?: number;
  summaryId?: string | null;
  summary?: {
    overview?: string;
    keyPoints?: string[];
    actionItems?: string[];
    unansweredQuestions?: string[];
    urgency?: "low" | "medium" | "high";
    confidence?: number;
  } | null;
  summarizedFromAt?: string | null;
  summarizedToAt?: string | null;
  cached?: boolean;
  degraded?: boolean;
  degradedReason?: string;
}

export interface UnreadSummaryCandidateMessage extends Message {
  pendingStateId?: string;
  pendingReceivedAt?: string;
}

export interface UnreadSummaryCandidatesResponse {
  totalPending: number;
  messages: UnreadSummaryCandidateMessage[];
}

export interface UnreadSummaryHistoryItem {
  _id: string;
  dayKey: string;
  unreadCount: number;
  assistantName?: string;
  summary?: {
    overview?: string;
    urgency?: "low" | "medium" | "high";
  };
  createdAt?: string;
  summarizedFromAt?: string | null;
  summarizedToAt?: string | null;
  usage?: {
    inputTokens?: number;
    outputTokens?: number;
    estimatedCostUsd?: number;
  };
}

export interface UnreadSummaryHistoryResponse {
  dayKey: string;
  items: UnreadSummaryHistoryItem[];
}

export interface UnreadSummaryMessagesResponse {
  summaryId: string;
  dayKey: string;
  assistantName?: string;
  summary?: UnreadSummaryResult["summary"];
  messages: Message[];
  summarizedFromAt?: string | null;
  summarizedToAt?: string | null;
  unreadCount?: number;
  usage?: {
    inputTokens?: number;
    outputTokens?: number;
    estimatedCostUsd?: number;
  };
  createdAt?: string;
}

// Helper function to map _id to id for MongoDB compatibility
const mapMongoId = (obj: any): any => {
  if (!obj) return obj;

  if (Array.isArray(obj)) {
    return obj.map((item) => mapMongoId(item));
  }

  if (typeof obj === "object") {
    const mapped: any = {};
    Object.entries(obj).forEach(([key, value]) => {
      mapped[key] = mapMongoId(value);
    });
    mapped.id = obj._id || obj.id;
    return mapped;
  }

  return obj;
};

const normalizeMessageList = (messages: any[]): Message[] => {
  return messages
    .filter(Boolean)
    .map((message) => mapMongoId(message))
    .filter((message) => typeof message === "object");
};

const normalizePinnedMessagesPayload = (payload: any): PinnedMessagesResponse => {
  const source = payload?.data && typeof payload.data === "object"
    ? payload.data
    : payload;

  const pinnedMessages = Array.isArray(source?.pinnedMessages)
    ? source.pinnedMessages
        .map((item: any) => {
          const message = item?.message ? mapMongoId(item.message) : null;
          if (!message) return null;

          return {
            messageId: String(item?.messageId || message.id || message._id || ""),
            pinnedAt: item?.pinnedAt ? String(item.pinnedAt) : undefined,
            pinnedBy: item?.pinnedBy ? String(item.pinnedBy) : undefined,
            message,
          };
        })
        .filter(Boolean)
    : [];

  const latestPinnedMessage = source?.latestPinnedMessage
    ? mapMongoId(source.latestPinnedMessage)
    : pinnedMessages[0]?.message || null;

  return {
    success: source?.success,
    pinnedMessages,
    latestPinnedMessage,
  };
};

const pickMessagePayload = (payload: any): Message => {
  const raw = payload?.message || payload?.data?.message || payload;
  return mapMongoId(raw);
};

const collectAiMessages = (payload: any): any[] => {
  if (!payload || typeof payload !== "object") return [];

  const candidates: any[] = [];

  if (Array.isArray(payload.messages)) {
    candidates.push(...payload.messages);
  }

  if (Array.isArray(payload.data?.messages)) {
    candidates.push(...payload.data.messages);
  }

  [
    payload.userMessage,
    payload.aiMessage,
    payload.assistantMessage,
    payload.message,
    payload.data?.userMessage,
    payload.data?.aiMessage,
    payload.data?.assistantMessage,
    payload.data?.message,
  ].forEach((value) => {
    if (value && typeof value === "object" && !Array.isArray(value)) {
      candidates.push(value);
    }
  });

  return candidates;
};

const toNumber = (value: unknown): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const normalizeAiMetric = (raw: any): AiUsageMetric => ({
  totalConversations: toNumber(
    raw?.totalConversations ?? raw?.conversations ?? raw?.conversationCount,
  ),
  userMessages: toNumber(raw?.userMessages ?? raw?.messagesFromUsers),
  aiReplies: toNumber(raw?.aiReplies ?? raw?.assistantReplies),
  activeUsers: toNumber(raw?.activeUsers ?? raw?.uniqueUsers),
  aiCommentOpeners: toNumber(
    raw?.aiCommentOpeners ?? raw?.commentOpeners ?? raw?.commentsOpenedByAi,
  ),
  aiAutoReplies: toNumber(
    raw?.aiAutoReplies ?? raw?.autoReplies ?? raw?.commentsAutoRepliedByAi,
  ),
});

const normalizeAiAdminConfig = (raw: any): AiAdminConfig => {
  const source =
    raw && typeof raw === "object" && raw.value && typeof raw.value === "object"
      ? raw.value
      : raw;

  return {
    isEnabled: Boolean(source?.isEnabled),
    autoCommentEnabled: Boolean(source?.autoCommentEnabled),
    botName: String(source?.botName || "ChatMeNow Assistant"),
    botAvatar: String(source?.botAvatar || ""),
    botBio: String(source?.botBio || ""),
    conversationName: String(source?.conversationName || "Chat AI"),
    updatedAt: raw?.updatedAt
      ? String(raw.updatedAt)
      : source?.updatedAt
        ? String(source.updatedAt)
        : undefined,
  };
};

const pickConfigPayload = (responseData: any) => {
  const config = responseData?.config;
  if (!config || typeof config !== "object") {
    throw new Error("Invalid AI admin config response");
  }

  return config;
};

const pickAvatarPayload = (responseData: any): AiAdminAvatarView => {
  const key = responseData?.key;
  const viewUrl = responseData?.viewUrl;
  const expiresIn = Number(responseData?.expiresIn || 0);

  if (typeof key !== "string" || typeof viewUrl !== "string") {
    throw new Error("Invalid AI admin avatar response");
  }

  return {
    key,
    viewUrl,
    expiresIn: Number.isFinite(expiresIn) ? expiresIn : 0,
  };
};

export const chatService = {
  // Lấy danh sách conversations
  getConversations: async () => {
    const res = await api.get<ConversationsResponse>("/chat/conversations");
    if (res.data.conversations) {
      res.data.conversations = res.data.conversations.map((conv: any) =>
        mapMongoId(conv),
      );
    }
    return res.data;
  },

  // Lấy hoặc tạo AI conversation (được ghim đầu danh sách)
  getAiConversation: async (): Promise<AiConversationResponse> => {
    const res = await api.get<any>("/chat/ai/conversation");
    const payload = res.data || {};
    const conversationRaw = payload.conversation || payload;
    const conversation = mapMongoId(conversationRaw);

    const messagesRaw = Array.isArray(payload.messages)
      ? payload.messages
      : Array.isArray(conversationRaw?.messages)
        ? conversationRaw.messages
        : [];

    return {
      conversation,
      messages: normalizeMessageList(messagesRaw),
    };
  },

  // Tạo group conversation
  createConversation: async (data: {
    name: string;
    memberIds: string[];
    groupAvatar?: string;
  }) => {
    const res = await api.post("/chat/conversations", data);
    const group =
      (res.data as any).group || (res.data as any).conversation || res.data;
    return mapMongoId(group);
  },

  // Lấy chi tiết conversation
  getConversationDetails: async (conversationId: string) => {
    const res = await api.get<ConversationDetailsResponse | any>(
      `/chat/conversations/${conversationId}`,
    );
    // Handle cả format cũ (trực tiếp) và format mới (wrapped)
    const conversation = res.data.conversation || res.data;
    if (!conversation) {
      throw new Error("Conversation not found");
    }
    return mapMongoId(conversation);
  },

  markConversationAsRead: async (
    conversationId: string,
  ): Promise<MarkConversationAsReadResponse> => {
    const res = await api.patch<any>(
      `/chat/conversations/${conversationId}/read`,
    );
    return {
      success: res.data?.success !== false,
      conversationId: String(res.data?.conversationId || conversationId),
      lastReadAt: res.data?.lastReadAt ? String(res.data.lastReadAt) : undefined,
      unreadCount: Number(res.data?.unreadCount || 0),
    };
  },

  // Lấy messages của conversation (hỗ trợ cursor pagination)
  getMessages: async (conversationId: string, params?: GetMessagesParams) => {
    const res = await api.get<MessagesResponse>(
      `/chat/conversations/${conversationId}/messages`,
      {
        params: {
          limit: params?.limit,
          beforeId: params?.beforeId,
        },
      },
    );
    if (res.data.messages) {
      res.data.messages = res.data.messages.map((msg: any) => mapMongoId(msg));
    }
    return res.data;
  },

  getPinnedMessages: async (
    conversationId: string,
  ): Promise<PinnedMessagesResponse> => {
    const res = await api.get<any>(
      `/chat/conversations/${conversationId}/pinned-messages`,
    );
    return normalizePinnedMessagesPayload(res.data);
  },

  pinMessage: async (
    conversationId: string,
    messageId: string,
  ): Promise<PinnedMessagesResponse> => {
    const res = await api.post<any>(
      `/chat/conversations/${conversationId}/messages/${messageId}/pin`,
    );
    return normalizePinnedMessagesPayload(res.data);
  },

  unpinMessage: async (
    conversationId: string,
    messageId: string,
  ): Promise<PinnedMessagesResponse> => {
    const res = await api.delete<any>(
      `/chat/conversations/${conversationId}/messages/${messageId}/pin`,
    );
    return normalizePinnedMessagesPayload(res.data);
  },

  getUnreadSummary: async (
    conversationId: string,
    payload?: { maxMessages?: number; forceRefresh?: boolean; messageIds?: string[] },
  ): Promise<UnreadSummaryResult> => {
    const res = await api.post<any>(
      `/chat/conversations/${conversationId}/unread-summary`,
      payload || {},
    );
    return res.data as UnreadSummaryResult;
  },

  getUnreadSummaryCandidates: async (
    conversationId: string,
    params?: { limit?: number },
  ): Promise<UnreadSummaryCandidatesResponse> => {
    const res = await api.get<any>(
      `/chat/conversations/${conversationId}/unread-summary/candidates`,
      {
        params: {
          limit: params?.limit,
        },
      },
    );

    const payload = res.data || {};
    const messages = Array.isArray(payload.messages)
      ? normalizeMessageList(payload.messages)
      : [];

    return {
      totalPending: Number(payload.totalPending || messages.length || 0),
      messages,
    };
  },

  getUnreadSummaryHistory: async (
    conversationId: string,
    date?: string,
  ): Promise<UnreadSummaryHistoryResponse> => {
    const res = await api.get<any>(
      `/chat/conversations/${conversationId}/unread-summary/history`,
      {
        params: date ? { date } : undefined,
      },
    );

    return res.data as UnreadSummaryHistoryResponse;
  },

  getUnreadSummaryMessages: async (
    conversationId: string,
    summaryId: string,
  ): Promise<UnreadSummaryMessagesResponse> => {
    const res = await api.get<any>(
      `/chat/conversations/${conversationId}/unread-summary/history/${summaryId}/messages`,
    );
    const payload = res.data || {};
    const messages = Array.isArray(payload.messages)
      ? normalizeMessageList(payload.messages)
      : [];

    return {
      ...payload,
      messages,
    } as UnreadSummaryMessagesResponse;
  },

  // Gửi message
  sendMessage: async (data: SendMessagePayload) => {
    const res = await api.post<Message>("/chat/messages", data);
    return mapMongoId(res.data);
  },

  createChatUploadPresignPut: async (payload: ChatUploadPresignPutPayload) => {
    const res = await api.post<ChatUploadPresignPutResponse>(
      "/upload/chat/presign-put",
      payload,
    );
    return res.data;
  },

  uploadToPresignedUrl: async (
    uploadUrl: string,
    file: File,
    onProgress?: UploadProgressCallback,
  ) => {
    await new Promise<void>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open("PUT", uploadUrl, true);
      xhr.setRequestHeader(
        "Content-Type",
        file.type || "application/octet-stream",
      );

      xhr.upload.onprogress = (event) => {
        if (!onProgress || !event.lengthComputable) return;
        const progress = Math.min(
          100,
          Math.round((event.loaded / event.total) * 100),
        );
        onProgress(progress);
      };

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          onProgress?.(100);
          resolve();
          return;
        }
        reject(new Error(`Upload failed with status ${xhr.status}`));
      };

      xhr.onerror = () => {
        reject(new Error("Upload failed due to network error"));
      };

      xhr.send(file);
    });
  },

  unsendMessage: async (messageId: string): Promise<Message> => {
    const res = await api.post<any>(`/chat/messages/${messageId}/unsend`);
    return pickMessagePayload(res.data);
  },

  deleteMessageForMe: async (
    messageId: string,
  ): Promise<DeleteMessageForMeResponse> => {
    const res = await api.delete<any>(`/chat/messages/${messageId}/me`);
    const payload = res.data || {};
    const resolvedMessageId =
      payload?.messageId ||
      payload?.message?._id ||
      payload?.message?.id ||
      messageId;

    return {
      success: payload?.success !== false,
      messageId: String(resolvedMessageId),
      conversationId:
        typeof payload?.conversationId === "string"
          ? payload.conversationId
          : typeof payload?.message?.conversationId === "string"
            ? payload.message.conversationId
            : undefined,
    };
  },

  editMessage: async (messageId: string, content: string): Promise<Message> => {
    const res = await api.patch<any>(`/chat/messages/${messageId}`, {
      content,
    });
    return pickMessagePayload(res.data);
  },

  reactToMessage: async (messageId: string, emoji: string): Promise<Message> => {
    const res = await api.post<any>(`/chat/messages/${messageId}/react`, { emoji });
    const raw = res.data?.message || res.data;
    return mapMongoId(raw);
  },

  // Gửi tin nhắn tới AI và nhận phản hồi ngay trong response
  sendAiMessage: async (
    data: SendAiMessagePayload,
  ): Promise<AiMessageExchangeResponse> => {
    const res = await api.post<any>("/chat/ai/message", data);
    const payload = res.data || {};

    const conversation = payload.conversation
      ? mapMongoId(payload.conversation)
      : payload.data?.conversation
        ? mapMongoId(payload.data.conversation)
        : undefined;

    const messages = normalizeMessageList(collectAiMessages(payload));

    return {
      conversation,
      messages,
    };
  },

  // Lấy cấu hình AI (admin)
  getAiAdminConfig: async (): Promise<AiAdminConfig> => {
    const res = await api.get<any>("/chat/ai/admin/config");
    const payload = pickConfigPayload(res.data);
    return normalizeAiAdminConfig(payload);
  },

  // Cập nhật cấu hình AI (admin)
  updateAiAdminConfig: async (
    payload: UpdateAiAdminConfigPayload,
  ): Promise<UpdateAiAdminConfigResponse> => {
    const hasImage = payload.imageFile instanceof File;

    const requestBody = hasImage
      ? (() => {
          const formData = new FormData();

          if (typeof payload.isEnabled === "boolean") {
            formData.append("isEnabled", String(payload.isEnabled));
          }

          if (typeof payload.autoCommentEnabled === "boolean") {
            formData.append(
              "autoCommentEnabled",
              String(payload.autoCommentEnabled),
            );
          }

          if (typeof payload.botName === "string") {
            formData.append("botName", payload.botName);
          }

          if (typeof payload.conversationName === "string") {
            formData.append("conversationName", payload.conversationName);
          }

          if (typeof payload.botBio === "string") {
            formData.append("botBio", payload.botBio);
          }

          if (typeof payload.botAvatar === "string") {
            formData.append("botAvatar", payload.botAvatar);
          }

          const imageFile = payload.imageFile;
          if (imageFile instanceof File) {
            formData.append("image", imageFile);
          }
          return formData;
        })()
      : {
          isEnabled: payload.isEnabled,
          autoCommentEnabled: payload.autoCommentEnabled,
          botName: payload.botName,
          botAvatar: payload.botAvatar,
          botBio: payload.botBio,
          conversationName: payload.conversationName,
        };

    const res = await api.patch<any>("/chat/ai/admin/config", requestBody, {
      headers: hasImage
        ? {
            "Content-Type": "multipart/form-data",
          }
        : undefined,
    });

    return {
      success: typeof res.data?.success === "boolean" ? res.data.success : true,
      config: normalizeAiAdminConfig(pickConfigPayload(res.data)),
      key: typeof res.data?.key === "string" ? res.data.key : undefined,
      message:
        typeof res.data?.message === "string" ? res.data.message : undefined,
    };
  },

  // Lấy thống kê AI usage (admin)
  getAiAdminStats: async (days = 7): Promise<AiAdminStats> => {
    const safeDays = Math.max(1, Math.floor(days || 7));
    const res = await api.get<any>("/chat/ai/admin/stats", {
      params: { days: safeDays },
    });

    const payload = res.data?.stats || res.data?.data || res.data || {};

    const totalRaw = payload?.total || payload?.allTime || payload;
    const periodRaw = payload?.period || payload?.range || payload?.withinDays;

    return {
      days: toNumber(payload?.days ?? safeDays) || safeDays,
      total: normalizeAiMetric(totalRaw),
      period: normalizeAiMetric(periodRaw),
    };
  },

  // Get AI avatar view URL (admin)
  getAiAdminAvatar: async (): Promise<AiAdminAvatarView> => {
    const res = await api.get<any>("/chat/ai/admin/avatar");
    return pickAvatarPayload(res.data);
  },

  // Lấy private conversation với một người
  getPrivateConversation: async (partnerId: string) => {
    const res = await api.get<ConversationDetailsResponse>(
      `/chat/private/${partnerId}`,
    );
    return mapMongoId(res.data.conversation);
  },

  // Lấy thông tin partner trong private conversation
  getPrivateConversationPartner: async (conversationId: string) => {
    const res = await api.get<PartnerResponse>(
      `/chat/conversations/${conversationId}/partner`,
    );
    return mapMongoId(res.data.partner);
  },

  getGroupJoinInfo: async (
    conversationId: string,
  ): Promise<GroupJoinInfoResponse> => {
    const res = await api.get<any>(
      `/chat/conversations/${conversationId}/join-info`,
    );
    return {
      success: res.data?.success,
      conversationId: String(
        res.data?.conversationId || conversationId,
      ),
      name: String(res.data?.name || "Nhóm chat"),
      groupAvatar: res.data?.groupAvatar
        ? String(res.data.groupAvatar)
        : undefined,
      memberCount: Number(res.data?.memberCount || 0),
      isMember: Boolean(res.data?.isMember),
      joinApprovalEnabled: Boolean(res.data?.joinApprovalEnabled),
    };
  },

  joinGroupByLink: async (
    conversationId: string,
  ): Promise<JoinGroupByLinkResponse> => {
    const res = await api.post<any>(`/chat/conversations/${conversationId}/join`);
    return {
      success: res.data?.success,
      joined: Boolean(res.data?.joined),
      alreadyMember: Boolean(res.data?.alreadyMember),
      requestCreated: Boolean(res.data?.requestCreated),
      pendingApproval: Boolean(res.data?.pendingApproval),
      conversation: res.data?.conversation ? mapMongoId(res.data.conversation) : null,
    };
  },

  updateGroupConversation: async (
    conversationId: string,
    payload: UpdateGroupConversationPayload,
  ) => {
    const res = await api.patch(`/chat/conversations/${conversationId}`, payload);
    return mapMongoId((res.data as any).conversation || res.data);
  },

  // Thêm thành viên vào nhóm
  addMemberToGroup: async (conversationId: string, memberIds: string[]) => {
    const res = await api.post(
      `/chat/conversations/${conversationId}/members`,
      { memberIds },
    );
    return {
      conversation: mapMongoId((res.data as any).conversation),
      requestCreated: Boolean((res.data as any).requestCreated),
      pendingApproval: Boolean((res.data as any).pendingApproval),
    };
  },

  approveGroupMemberRequest: async (notificationId: string) => {
    const res = await api.post(
      `/chat/group-member-requests/${notificationId}/approve`,
    );
    return {
      conversation: mapMongoId((res.data as any).conversation),
      addedCount: Number((res.data as any).addedCount || 0),
    };
  },

  // Xóa thành viên khỏi nhóm
  removeMemberFromGroup: async (conversationId: string, memberId: string) => {
    const res = await api.delete(
      `/chat/conversations/${conversationId}/members/${memberId}`,
    );
    return mapMongoId((res.data as any).conversation);
  },

  leaveGroup: async (conversationId: string) => {
    const res = await api.post(`/chat/conversations/${conversationId}/leave`);
    return {
      deleted: Boolean((res.data as any).deleted),
      conversation: (res.data as any).conversation
        ? mapMongoId((res.data as any).conversation)
        : null,
    };
  },

  transferGroupAdmin: async (conversationId: string, targetUserId: string) => {
    const res = await api.post(
      `/chat/conversations/${conversationId}/transfer-admin`,
      { targetUserId },
    );
    return mapMongoId((res.data as any).conversation);
  },

  // Giải tán nhóm
  dissolveGroup: async (conversationId: string) => {
    const res = await api.delete(`/chat/conversations/${conversationId}`);
    return res.data;
  },
};
