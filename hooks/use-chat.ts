"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  chatService,
  ConversationsResponse,
  MessagesResponse,
  ConversationDetailsResponse,
  GetMessagesParams,
} from "@/api/chat";
import { userService } from "@/api/user";
import { Message } from "@/types/message";
import { Conversation } from "@/types/conversation";
import { useAuthStore } from "@/store/use-auth-store";
import { formatPresenceStatus } from "@/lib/utils";

type SendMessageInput = {
  conversationId: string;
  content: string;
  type: string;
};

type SendMessageContext = {
  previousMessages?: MessagesResponse;
  previousConversations?: ConversationsResponse;
  optimisticMessageId: string;
  conversationId: string;
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
    onSuccess: (newConversation: Conversation) => {
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

      const optimisticMessage: Message = {
        id: optimisticMessageId,
        clientTempId: optimisticMessageId,
        conversationId: variables.conversationId,
        senderId: {
          id: currentUserId,
          _id: currentUserId,
          displayName: currentUserName,
          avatar: currentUserAvatar,
        },
        content: variables.content,
        type: variables.type,
        createdAt: new Date().toISOString(),
        status: "sending",
        isOptimistic: true,
      };

      queryClient.setQueryData<MessagesResponse>(
        ["messages", variables.conversationId],
        (old) => ({
          ...(old || {}),
          messages: [...(old?.messages || []), optimisticMessage],
        }),
      );

      queryClient.setQueryData<ConversationsResponse>(
        ["conversations"],
        (old) => {
          if (!old?.conversations) return old;

          return {
            ...old,
            conversations: old.conversations.map((conversation) =>
              conversation.id === variables.conversationId
                ? {
                    ...conversation,
                    lastMessage: {
                      ...conversation.lastMessage,
                      content: variables.content,
                      type: variables.type,
                      createdAt: new Date(),
                      senderId: currentUserId,
                    },
                    updatedAt: new Date(),
                  }
                : conversation,
            ),
          };
        },
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
  // Lấy partnerId từ members array
  const partnerId =
    conversation?.type === "private" && currentUserId
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
    enabled: !!partnerIdString,
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

  return {
    displayName:
      conversation?.type === "private"
        ? partner?.displayName
        : conversation?.name,
    avatar:
      conversation?.type === "private"
        ? partner?.avatar
        : conversation?.groupAvatar,
    isOnline:
      conversation?.type === "private" ? (partner?.isOnline ?? false) : false,
    lastSeenText:
      conversation?.type === "private" ? partner?.lastSeenText : undefined,
    statusText:
      conversation?.type === "private"
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
    onSuccess: (_, { conversationId }) => {
      queryClient.invalidateQueries({
        queryKey: ["conversation", conversationId],
      });
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
      toast.success("Đã thêm thành viên vào nhóm");
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
