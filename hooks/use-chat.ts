"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { chatService, ConversationsResponse, MessagesResponse, ConversationDetailsResponse } from "@/api/chat";
import { userService } from "@/api/user";
import { Message } from "@/types/message";
import { Conversation } from "@/types/conversation";

export const useConversations = () => {
  return useQuery({
    queryKey: ["conversations"],
    queryFn: (): Promise<ConversationsResponse> => chatService.getConversations(),
  });
};

export const useConversation = (conversationId: string) => {
  return useQuery({
    queryKey: ["conversation", conversationId],
    queryFn: async () => {
      try {
        return await chatService.getConversationDetails(conversationId);
      } catch (error) {
        console.error("Error fetching conversation:", error);
        throw error;
      }
    },
    enabled: !!conversationId,
    retry: 1,
  });
};

export const useMessages = (conversationId: string) => {
  return useQuery({
    queryKey: ["messages", conversationId],
    queryFn: () => chatService.getMessages(conversationId),
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
      toast.error(error?.response?.data?.message || "Không thể tạo cuộc trò chuyện");
    },
  });
};

export const useSendMessage = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: chatService.sendMessage,
    onSuccess: (newMessage: Message) => {
      queryClient.invalidateQueries({ queryKey: ["messages", newMessage.conversationId] });
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
      toast.success("Đã gửi tin nhắn");
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || "Không thể gửi tin nhắn");
    },
  });
};

export const useGetPrivateConversation = () => {
  return useMutation({
    mutationFn: chatService.getPrivateConversation,
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || "Không thể lấy cuộc trò chuyện");
    },
  });
};

export const usePrivatePartner = (
  conversation: Conversation | undefined,
  currentUserId: string | undefined
) => {
  // Lấy partnerId từ members array
  const partnerId =
    conversation?.type === "private" && currentUserId
      ? conversation.members.find(m => {
          // Handle cả trường hợp userId là string hoặc object
          const memberUserId = typeof m.userId === 'string' ? m.userId : (m.userId as any)?._id || (m.userId as any)?.id;
          return memberUserId !== currentUserId;
        })?.userId
      : null;

  // Nếu partnerId là object, lấy _id hoặc id
  const partnerIdString = partnerId
    ? (typeof partnerId === 'string' ? partnerId : (partnerId as any)._id || (partnerId as any).id)
    : null;

  console.log("usePrivatePartner:", {
    conversationType: conversation?.type,
    currentUserId,
    members: conversation?.members,
    partnerId,
    partnerIdString
  });

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
  currentUserId: string | undefined
) => {
  console.log("useConversationDisplay called with conversation:", conversation, "currentUserId:", currentUserId);
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
      conversation?.type === "private"
        ? partner?.isOnline ?? false
        : false,
  };
};

export const useAddMemberToGroup = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ conversationId, memberIds }: { conversationId: string; memberIds: string[] }) =>
      chatService.addMemberToGroup(conversationId, memberIds),
    onSuccess: (_, { conversationId }) => {
      queryClient.invalidateQueries({ queryKey: ["conversation", conversationId] });
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
      toast.success("Đã thêm thành viên vào nhóm");
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || "Không thể thêm thành viên");
    },
  });
};

export const useRemoveMemberFromGroup = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ conversationId, memberId }: { conversationId: string; memberId: string }) =>
      chatService.removeMemberFromGroup(conversationId, memberId),
    onSuccess: (_, { conversationId }) => {
      queryClient.invalidateQueries({ queryKey: ["conversation", conversationId] });
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
    mutationFn: (conversationId: string) => chatService.dissolveGroup(conversationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
      toast.success("Đã giải tán nhóm");
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || "Không thể giải tán nhóm");
    },
  });
};