"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  chatService,
  AiConversationResponse,
  ConversationsResponse,
  MessagesResponse,
  GetMessagesParams,
  SendAiMessagePayload,
  UpdateGroupConversationPayload,
} from "@/api/chat";
import { MessageAttachment } from "@/types/message";
import { userService } from "@/api/user";
import { Message } from "@/types/message";
import { Conversation } from "@/types/conversation";
import { useAuthStore } from "@/store/use-auth-store";
import { formatPresenceStatus } from "@/lib/utils";

type SendMessageInput = {
  conversationId: string;
  content: string;
  type: string;
  attachments?: MessageAttachment[];
};

type SendMessageContext = {
  previousMessages?: MessagesResponse;
  previousConversations?: ConversationsResponse;
  optimisticMessageId: string;
  conversationId: string;
};

type UpsertConversationPreviewInput = {
  conversationId: string;
  content: string;
  type: string;
  senderId?: string;
};

const getMessageSenderId = (message: Message): string | undefined => {
  if (!message.senderId) return undefined;

  if (typeof message.senderId === "string") {
    return message.senderId;
  }

  return message.senderId?._id || message.senderId?.id;
};

const isSameOptimisticMessage = (
  left: Message,
  right: Message,
  currentUserId?: string,
): boolean => {
  const leftSenderId = getMessageSenderId(left);
  const rightSenderId = getMessageSenderId(right);

  return (
    !!currentUserId &&
    leftSenderId === currentUserId &&
    rightSenderId === currentUserId &&
    left.conversationId === right.conversationId &&
    left.type === right.type &&
    (left.content || "") === (right.content || "")
  );
};

const createOptimisticMessage = (params: {
  optimisticMessageId: string;
  conversationId: string;
  content: string;
  type: string;
  attachments?: MessageAttachment[];
  currentUserId?: string;
  currentUserName: string;
  currentUserAvatar?: string;
}): Message => ({
  id: params.optimisticMessageId,
  clientTempId: params.optimisticMessageId,
  conversationId: params.conversationId,
  senderId: {
    id: params.currentUserId,
    _id: params.currentUserId,
    displayName: params.currentUserName,
    avatar: params.currentUserAvatar,
  },
  content: params.content,
  type: params.type,
  attachments: params.attachments,
  createdAt: new Date().toISOString(),
  status: "sending",
  isOptimistic: true,
});

const upsertConversationPreview = (
  old: ConversationsResponse | undefined,
  input: UpsertConversationPreviewInput,
) => {
  if (!old?.conversations) return old;

  return {
    ...old,
    conversations: old.conversations.map((conversation) =>
      conversation.id === input.conversationId
        ? {
            ...conversation,
            lastMessage: {
              ...conversation.lastMessage,
              content: input.content,
              type: input.type,
              createdAt: new Date(),
              senderId: input.senderId,
            },
            updatedAt: new Date(),
          }
        : conversation,
    ),
  };
};

const mergeUniqueMessages = (messages: Message[]): Message[] => {
  const messageMap = new Map<string, Message>();

  messages.forEach((message) => {
    const key =
      message.id ||
      message._id ||
      `${message.conversationId}:${message.type}:${message.content || ""}:${String(message.createdAt)}`;
    messageMap.set(key, message);
  });

  return Array.from(messageMap.values());
};

const updateMessageInCache = (
  queryClient: ReturnType<typeof useQueryClient>,
  conversationId: string,
  messageId: string,
  updater: (message: Message) => Message,
) => {
  queryClient.setQueryData<MessagesResponse>(
    ["messages", conversationId],
    (old) => ({
      ...(old || {}),
      messages: (old?.messages || []).map((message) => {
        const currentId = message.id || message._id;
        return currentId === messageId ? updater(message) : message;
      }),
    }),
  );
};

const removeMessageFromCache = (
  queryClient: ReturnType<typeof useQueryClient>,
  conversationId: string,
  messageId: string,
) => {
  queryClient.setQueryData<MessagesResponse>(
    ["messages", conversationId],
    (old) => ({
      ...(old || {}),
      messages: (old?.messages || []).filter((message) => {
        const currentId = message.id || message._id;
        return currentId !== messageId;
      }),
    }),
  );
};

export const useConversations = () => {
  return useQuery({
    queryKey: ["conversations"],
    queryFn: (): Promise<ConversationsResponse> =>
      chatService.getConversations(),
  });
};

export const useConversation = (conversationId: string) => {
  return useQuery({
    queryKey: ["conversation", conversationId],
    queryFn: () => chatService.getConversationDetails(conversationId),
    enabled: !!conversationId,
    retry: 1,
  });
};

export const useMarkConversationAsRead = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (conversationId: string) =>
      chatService.markConversationAsRead(conversationId),
    onSuccess: (_, conversationId) => {
      queryClient.invalidateQueries({ queryKey: ["conversation", conversationId] });
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || "Không thể cập nhật trạng thái đã đọc");
    },
  });
};

export const useAiConversation = () => {
  return useQuery({
    queryKey: ["ai-conversation"],
    queryFn: (): Promise<AiConversationResponse> =>
      chatService.getAiConversation(),
    staleTime: 30_000,
  });
};

export const useMessages = (
  conversationId: string,
  params?: GetMessagesParams,
) => {
  return useQuery({
    queryKey: ["messages", conversationId],
    queryFn: () => chatService.getMessages(conversationId, params),
    enabled: !!conversationId,
  });
};

export const useCreateConversation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: chatService.createConversation,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
      toast.success("Tạo cuộc trò chuyện thành công");
    },
    onError: (error: any) => {
      toast.error(
        error?.response?.data?.message || "Không thể tạo cuộc trò chuyện",
      );
    },
  });
};

export const useSendMessage = () => {
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);
  const currentUserId = user?.id || user?._id;
  const currentUserName = user?.displayName || "Bạn";
  const currentUserAvatar = user?.avatar;

  return useMutation({
    mutationFn: chatService.sendMessage,
    onMutate: async (
      variables: SendMessageInput,
    ): Promise<SendMessageContext> => {
      const optimisticMessageId = `temp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

      await queryClient.cancelQueries({
        queryKey: ["messages", variables.conversationId],
      });
      await queryClient.cancelQueries({ queryKey: ["conversations"] });

      const previousMessages = queryClient.getQueryData<MessagesResponse>([
        "messages",
        variables.conversationId,
      ]);
      const previousConversations =
        queryClient.getQueryData<ConversationsResponse>(["conversations"]);

      const optimisticMessage = createOptimisticMessage({
        optimisticMessageId,
        conversationId: variables.conversationId,
        content: variables.content,
        type: variables.type,
        attachments: variables.attachments,
        currentUserId,
        currentUserName,
        currentUserAvatar,
      });

      queryClient.setQueryData<MessagesResponse>(
        ["messages", variables.conversationId],
        (old) => ({
          ...(old || {}),
          messages: [...(old?.messages || []), optimisticMessage],
        }),
      );

      queryClient.setQueryData<ConversationsResponse>(
        ["conversations"],
        (old) =>
          upsertConversationPreview(old, {
            conversationId: variables.conversationId,
            content: variables.content,
            type: variables.type,
            senderId: currentUserId,
          }),
      );

      return {
        previousMessages,
        previousConversations,
        optimisticMessageId,
        conversationId: variables.conversationId,
      };
    },
    onSuccess: (newMessage: Message, variables, context) => {
      queryClient.setQueryData<MessagesResponse>(
        ["messages", variables.conversationId],
        (old) => {
          const existingMessages = old?.messages || [];
          const withoutOptimistic = existingMessages.filter((message) => {
            if (message.id === context?.optimisticMessageId) {
              return false;
            }

            if (message.id === newMessage.id) {
              return false;
            }

            return !isSameOptimisticMessage(message, newMessage, currentUserId);
          });

          return {
            ...(old || {}),
            messages: [
              ...withoutOptimistic,
              {
                ...newMessage,
                status: "sent",
                isOptimistic: false,
              },
            ],
          };
        },
      );

      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    },
    onError: (error: any, variables, context) => {
      queryClient.setQueryData<MessagesResponse>(
        ["messages", variables.conversationId],
        (old) => ({
          ...(old || {}),
          messages: (old?.messages || []).map((message) =>
            message.id === context?.optimisticMessageId
              ? {
                  ...message,
                  status: "failed",
                  isOptimistic: true,
                }
              : message,
          ),
        }),
      );

      toast.error(error?.response?.data?.message || "Không thể gửi tin nhắn");
    },
  });
};

export const useSendAiMessage = () => {
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);
  const currentUserId = user?.id || user?._id;
  const currentUserName = user?.displayName || "Bạn";
  const currentUserAvatar = user?.avatar;

  return useMutation({
    mutationFn: (variables: SendAiMessagePayload) =>
      chatService.sendAiMessage(variables),
    onMutate: async (variables): Promise<SendMessageContext> => {
      if (!variables.conversationId) {
        throw new Error("Thiếu conversationId cho AI chat");
      }

      const optimisticMessageId = `temp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

      await queryClient.cancelQueries({
        queryKey: ["messages", variables.conversationId],
      });
      await queryClient.cancelQueries({ queryKey: ["conversations"] });

      const previousMessages = queryClient.getQueryData<MessagesResponse>([
        "messages",
        variables.conversationId,
      ]);
      const previousConversations =
        queryClient.getQueryData<ConversationsResponse>(["conversations"]);

      const optimisticMessage = createOptimisticMessage({
        optimisticMessageId,
        conversationId: variables.conversationId,
        content: variables.content,
        type: "text",
        currentUserId,
        currentUserName,
        currentUserAvatar,
      });

      queryClient.setQueryData<MessagesResponse>(
        ["messages", variables.conversationId],
        (old) => ({
          ...(old || {}),
          messages: [...(old?.messages || []), optimisticMessage],
        }),
      );

      queryClient.setQueryData<ConversationsResponse>(
        ["conversations"],
        (old) =>
          upsertConversationPreview(old, {
            conversationId: variables.conversationId!,
            content: variables.content,
            type: "text",
            senderId: currentUserId,
          }),
      );

      return {
        previousMessages,
        previousConversations,
        optimisticMessageId,
        conversationId: variables.conversationId,
      };
    },
    onSuccess: (result, variables, context) => {
      if (!variables.conversationId) return;

      const responseMessages = (result.messages || []).map((message) => ({
        ...message,
        status: "sent" as const,
        isOptimistic: false,
      }));

      queryClient.setQueryData<MessagesResponse>(
        ["messages", variables.conversationId],
        (old) => {
          const currentMessages = old?.messages || [];
          const withoutOptimistic = currentMessages.filter(
            (message) => message.id !== context?.optimisticMessageId,
          );

          return {
            ...(old || {}),
            messages: mergeUniqueMessages([
              ...withoutOptimistic,
              ...responseMessages,
            ]),
          };
        },
      );

      if (result.conversation) {
        queryClient.setQueryData(
          ["conversation", variables.conversationId],
          result.conversation,
        );
        queryClient.setQueryData(["ai-conversation"], {
          conversation: result.conversation,
        });
      }

      const lastResponseMessage =
        responseMessages[responseMessages.length - 1] ||
        responseMessages[0] ||
        null;

      if (lastResponseMessage) {
        queryClient.setQueryData<ConversationsResponse>(
          ["conversations"],
          (old) =>
            upsertConversationPreview(old, {
              conversationId: variables.conversationId!,
              content: lastResponseMessage.content || "",
              type: lastResponseMessage.type,
              senderId: getMessageSenderId(lastResponseMessage),
            }),
        );
      }

      queryClient.invalidateQueries({ queryKey: ["ai-conversation"] });
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    },
    onError: (error: any, variables, context) => {
      if (!variables.conversationId) return;

      queryClient.setQueryData<MessagesResponse>(
        ["messages", variables.conversationId],
        (old) => ({
          ...(old || {}),
          messages: (old?.messages || []).map((message) =>
            message.id === context?.optimisticMessageId
              ? {
                  ...message,
                  status: "failed",
                  isOptimistic: true,
                }
              : message,
          ),
        }),
      );

      toast.error(
        error?.response?.data?.message ||
          "Không thể gửi tin nhắn tới AI lúc này",
      );
    },
  });
};

export const useGetPrivateConversation = () => {
  return useMutation({
    mutationFn: chatService.getPrivateConversation,
    onError: (error: any) => {
      toast.error(
        error?.response?.data?.message || "Không thể lấy cuộc trò chuyện",
      );
    },
  });
};

export const usePrivatePartner = (
  conversation: Conversation | undefined,
  currentUserId: string | undefined,
) => {
  const isAiConversation =
    String(conversation?.type || "").toLowerCase() === "ai" ||
    Boolean(conversation?.isAI) ||
    Boolean(conversation?.isAi) ||
    Boolean(conversation?.isAiAssistant);

  // Lấy partnerId từ members array
  const partnerId =
    conversation?.type === "private" && currentUserId && !isAiConversation
      ? conversation.members.find((m) => {
          // Handle cả trường hợp userId là string hoặc object
          const memberUserId =
            typeof m.userId === "string"
              ? m.userId
              : (m.userId as any)?._id || (m.userId as any)?.id;
          return memberUserId !== currentUserId;
        })?.userId
      : null;

  // Nếu partnerId là object, lấy _id hoặc id
  const partnerIdString = partnerId
    ? typeof partnerId === "string"
      ? partnerId
      : (partnerId as any)._id || (partnerId as any).id
    : null;

  return useQuery({
    queryKey: ["partner", partnerIdString],
    queryFn: () => userService.getUserProfile(partnerIdString!),
    enabled: !!partnerIdString && !isAiConversation,
  });
};

/**
 * Hook tập trung logic phân biệt private/group conversation
 * Tự động fetch partner info nếu là private conversation
 * Trả về displayName, avatar, isOnline dùng chung cho cả UI
 */

export const useConversationDisplay = (
  conversation: Conversation | undefined,
  currentUserId: string | undefined,
) => {
  const { data: partner } = usePrivatePartner(conversation, currentUserId);
  const isAiConversation =
    String(conversation?.type || "").toLowerCase() === "ai" ||
    Boolean(conversation?.isAI) ||
    Boolean(conversation?.isAi) ||
    Boolean(conversation?.isAiAssistant);
  const shouldUsePartner =
    conversation?.type === "private" && !isAiConversation;

  const privateMemberFallback =
    conversation?.type === "private" && currentUserId
      ? conversation.members.find((member) => {
          const memberUserId =
            typeof member.userId === "string"
              ? member.userId
              : (member.userId as any)?._id || (member.userId as any)?.id;
          return !!memberUserId && memberUserId !== currentUserId;
        })
      : undefined;

  const privateMemberProfile =
    privateMemberFallback && typeof privateMemberFallback.userId === "object"
      ? privateMemberFallback.userId
      : undefined;

  const aiMember =
    conversation?.type === "private" && isAiConversation && currentUserId
      ? conversation.members.find((member) => {
          const memberUserId =
            typeof member.userId === "string"
              ? member.userId
              : (member.userId as any)?._id || (member.userId as any)?.id;
          return !!memberUserId && memberUserId !== currentUserId;
        })
      : undefined;

  const aiProfile =
    aiMember && typeof aiMember.userId === "object" ? aiMember.userId : null;

  return {
    displayName: shouldUsePartner
      ? partner?.displayName || (privateMemberProfile as any)?.displayName
      : conversation?.name || (aiProfile as any)?.displayName,
    avatar: shouldUsePartner
      ? partner?.avatar || (privateMemberProfile as any)?.avatar
      : conversation?.groupAvatar || (aiProfile as any)?.avatar,
    isOnline: shouldUsePartner ? (partner?.isOnline ?? false) : false,
    lastSeenText: shouldUsePartner ? partner?.lastSeenText : undefined,
    statusText: shouldUsePartner
      ? formatPresenceStatus(
          partner?.isOnline,
          partner?.lastSeen,
          partner?.lastSeenText,
        )
      : undefined,
  };
};

export const useAddMemberToGroup = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      conversationId,
      memberIds,
    }: {
      conversationId: string;
      memberIds: string[];
    }) => chatService.addMemberToGroup(conversationId, memberIds),
    onSuccess: (result, { conversationId }) => {
      queryClient.invalidateQueries({
        queryKey: ["conversation", conversationId],
      });
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
      if (result?.requestCreated) {
        toast.success("Đã gửi yêu cầu, chờ nhóm trưởng duyệt");
      } else {
        toast.success("Đã thêm thành viên vào nhóm");
      }
    },
    onError: (error: any) => {
      toast.error(
        error?.response?.data?.message || "Không thể thêm thành viên",
      );
    },
  });
};

export const useRemoveMemberFromGroup = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      conversationId,
      memberId,
    }: {
      conversationId: string;
      memberId: string;
    }) => chatService.removeMemberFromGroup(conversationId, memberId),
    onSuccess: (_, { conversationId }) => {
      queryClient.invalidateQueries({
        queryKey: ["conversation", conversationId],
      });
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
      toast.success("Đã xóa thành viên");
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || "Không thể xóa thành viên");
    },
  });
};

export const useDissolveGroup = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (conversationId: string) =>
      chatService.dissolveGroup(conversationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
      toast.success("Đã giải tán nhóm");
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || "Không thể giải tán nhóm");
    },
  });
};

export const useLeaveGroup = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (conversationId: string) => chatService.leaveGroup(conversationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
      toast.success("Đã rời nhóm");
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || "Không thể rời nhóm");
    },
  });
};

export const useTransferGroupAdmin = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      conversationId,
      targetUserId,
    }: {
      conversationId: string;
      targetUserId: string;
    }) => chatService.transferGroupAdmin(conversationId, targetUserId),
    onSuccess: (_, { conversationId }) => {
      queryClient.invalidateQueries({
        queryKey: ["conversation", conversationId],
      });
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
      toast.success("Đã chuyển quyền admin");
    },
    onError: (error: any) => {
      toast.error(
        error?.response?.data?.message || "Không thể chuyển quyền admin",
      );
    },
  });
};

export const useUpdateGroupConversation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      conversationId,
      payload,
    }: {
      conversationId: string;
      payload: UpdateGroupConversationPayload;
    }) => chatService.updateGroupConversation(conversationId, payload),
    onSuccess: (conversation, { conversationId }) => {
      queryClient.setQueryData(["conversation", conversationId], conversation);
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
      toast.success("Đã cập nhật thông tin nhóm");
    },
    onError: (error: any) => {
      toast.error(
        error?.response?.data?.message || "Không thể cập nhật thông tin nhóm",
      );
    },
  });
};

export const useUnsendMessage = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      messageId,
    }: {
      conversationId: string;
      messageId: string;
    }) => chatService.unsendMessage(messageId),
    onMutate: async ({ conversationId, messageId }) => {
      await queryClient.cancelQueries({
        queryKey: ["messages", conversationId],
      });
      const previousMessages = queryClient.getQueryData<MessagesResponse>([
        "messages",
        conversationId,
      ]);

      updateMessageInCache(
        queryClient,
        conversationId,
        messageId,
        (message) => ({
          ...message,
          content: "Tin nhắn đã được thu hồi",
          isUnsent: true,
          unsentAt: new Date().toISOString(),
        }),
      );

      return { previousMessages, conversationId };
    },
    onSuccess: (updatedMessage, variables) => {
      updateMessageInCache(
        queryClient,
        variables.conversationId,
        variables.messageId,
        (message) => ({
          ...message,
          ...updatedMessage,
          status: "sent",
          isOptimistic: false,
        }),
      );
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    },
    onError: (error: any, variables, context) => {
      if (context?.previousMessages) {
        queryClient.setQueryData(
          ["messages", variables.conversationId],
          context.previousMessages,
        );
      }
      toast.error(
        error?.response?.data?.message || "Không thể thu hồi tin nhắn",
      );
    },
  });
};

export const useDeleteMessageForMe = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      messageId,
    }: {
      conversationId: string;
      messageId: string;
    }) => chatService.deleteMessageForMe(messageId),
    onMutate: async ({ conversationId, messageId }) => {
      await queryClient.cancelQueries({
        queryKey: ["messages", conversationId],
      });
      const previousMessages = queryClient.getQueryData<MessagesResponse>([
        "messages",
        conversationId,
      ]);

      removeMessageFromCache(queryClient, conversationId, messageId);
      return { previousMessages, conversationId };
    },
    onSuccess: (result, variables) => {
      const conversationId = result.conversationId || variables.conversationId;
      removeMessageFromCache(queryClient, conversationId, result.messageId);
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    },
    onError: (error: any, variables, context) => {
      if (context?.previousMessages) {
        queryClient.setQueryData(
          ["messages", variables.conversationId],
          context.previousMessages,
        );
      }
      toast.error(
        error?.response?.data?.message || "Không thể xóa tin nhắn phía bạn",
      );
    },
  });
};

export const useEditMessage = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      messageId,
      content,
    }: {
      conversationId: string;
      messageId: string;
      content: string;
    }) => chatService.editMessage(messageId, content),
    onMutate: async ({ conversationId, messageId, content }) => {
      await queryClient.cancelQueries({
        queryKey: ["messages", conversationId],
      });
      const previousMessages = queryClient.getQueryData<MessagesResponse>([
        "messages",
        conversationId,
      ]);

      updateMessageInCache(
        queryClient,
        conversationId,
        messageId,
        (message) => ({
          ...message,
          content,
          isEdited: true,
          editedAt: new Date().toISOString(),
        }),
      );

      return { previousMessages, conversationId };
    },
    onSuccess: (updatedMessage, variables) => {
      updateMessageInCache(
        queryClient,
        variables.conversationId,
        variables.messageId,
        (message) => ({
          ...message,
          ...updatedMessage,
          status: "sent",
          isOptimistic: false,
        }),
      );
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    },
    onError: (error: any, variables, context) => {
      if (context?.previousMessages) {
        queryClient.setQueryData(
          ["messages", variables.conversationId],
          context.previousMessages,
        );
      }
      toast.error(error?.response?.data?.message || "Không thể sửa tin nhắn");
    },
  });
};
