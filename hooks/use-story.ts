"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { CreateStoryPayload, storyService } from "@/api/story";

export const useStoryFeed = () => {
  return useQuery({
    queryKey: ["stories", "feed"],
    queryFn: storyService.getStoryFeed,
  });
};

export const useStoriesByUser = (userId?: string) => {
  return useQuery({
    queryKey: ["stories", "user", userId],
    queryFn: () => storyService.getStoriesByUser(userId || ""),
    enabled: !!userId,
  });
};

export const useCreateStory = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateStoryPayload) => storyService.createStory(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["stories", "feed"] });
      toast.success("Đăng story thành công");
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || "Không thể đăng story");
    },
  });
};

export const useMarkStoryViewed = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (storyId: string) => storyService.markStoryViewed(storyId),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["stories", "feed"] });
    },
  });
};

export const useDeleteStory = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (storyId: string) => storyService.deleteStory(storyId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["stories", "feed"] });
      toast.success("Đã xóa story");
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || "Không thể xóa story");
    },
  });
};

export const useAddReaction = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ storyId, emoji }: { storyId: string; emoji: string }) =>
      storyService.addReaction(storyId, emoji),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["stories", "feed"] });
      queryClient.invalidateQueries({ queryKey: ["stories", "reactions"] });
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || "Không thể react story");
    },
  });
};

export const useGetReactions = (storyId?: string) => {
  return useQuery({
    queryKey: ["stories", "reactions", storyId],
    queryFn: () => storyService.getReactions(storyId || ""),
    enabled: !!storyId,
  });
};

export const useReplyToStory = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ storyId, message }: { storyId: string; message: string }) =>
      storyService.replyToStory(storyId, message),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["stories", "replies", variables.storyId],
      });
      toast.success("Đã gửi phản hồi");
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || "Không thể gửi phản hồi");
    },
  });
};

export const useGetReplies = (storyId?: string) => {
  return useQuery({
    queryKey: ["stories", "replies", storyId],
    queryFn: () => storyService.getReplies(storyId || ""),
    enabled: !!storyId,
  });
};

export const useDeleteReply = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (replyId: string) => storyService.deleteReply(replyId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["stories", "replies"] });
      toast.success("Đã xóa phản hồi");
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || "Không thể xóa phản hồi");
    },
  });
};
