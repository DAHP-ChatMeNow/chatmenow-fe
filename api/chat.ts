import api from "@/lib/axios";
import { Conversation } from "@/types/conversation";
import { Message } from "@/types/message";

export interface ConversationsResponse {
  conversations: Conversation[];
}

export interface ConversationDetailsResponse {
  conversation: Conversation;
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

export interface GetMessagesParams {
  limit?: number;
  beforeId?: string;
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

// Helper function to map _id to id for MongoDB compatibility
const mapMongoId = (obj: any): any => {
  if (!obj) return obj;

  if (Array.isArray(obj)) {
    return obj.map((item) => mapMongoId(item));
  }

  if (typeof obj === "object") {
    const mapped: any = {
      ...obj,
      id: obj._id || obj.id,
    };
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

  // Gửi message
  sendMessage: async (data: {
    conversationId: string;
    content: string;
    type: string;
  }) => {
    const res = await api.post<Message>("/chat/messages", data);
    return mapMongoId(res.data);
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

  // Thêm thành viên vào nhóm
  addMemberToGroup: async (conversationId: string, memberIds: string[]) => {
    const res = await api.post(
      `/chat/conversations/${conversationId}/members`,
      { memberIds },
    );
    return mapMongoId((res.data as any).conversation);
  },

  // Xóa thành viên khỏi nhóm
  removeMemberFromGroup: async (conversationId: string, memberId: string) => {
    const res = await api.delete(
      `/chat/conversations/${conversationId}/members/${memberId}`,
    );
    return mapMongoId((res.data as any).conversation);
  },

  // Giải tán nhóm
  dissolveGroup: async (conversationId: string) => {
    const res = await api.delete(`/chat/conversations/${conversationId}`);
    return res.data;
  },
};
