"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { contactService, ContactsResponse } from "@/api/contact";
import { userService } from "@/api/user";
import { User } from "@/types/user";
import { FriendRequest } from "@/types/friend-request";
import { useAuthStore } from "@/store/use-auth-store";

export const useContacts = () => {
  const user = useAuthStore((state) => state.user);
  return useQuery({
    queryKey: ["contacts", user?._id],
    queryFn: (): Promise<ContactsResponse> =>
      contactService.getContacts(user?._id || ""),
    enabled: !!user?._id,
    refetchOnWindowFocus: false, // ❌ Tắt auto-refetch khi focus tab
    staleTime: 5 * 60 * 1000, // 5 phút - cho phép invalidate work
  });
};

export const useSearchUsers = (query: string) => {
  return useQuery({
    queryKey: ["search-users", query],
    queryFn: () => contactService.searchUsers(query),
    enabled: query.length > 0,
  });
};

export const useSearchAndAddFriend = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: contactService.searchAndAddFriend,
    onSuccess: () => {
      // ❌ Bỏ invalidateQueries vì socket sẽ tự động update
      // queryClient.invalidateQueries({ queryKey: ["friend-requests"] });
      // queryClient.invalidateQueries({ queryKey: ["contacts"] });
      toast.success("Đã gửi lời mời kết bạn");
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || "Không thể gửi lời mời");
    },
  });
};

export const useGetUserEmail = () => {
  return useQuery({
    queryKey: ["user-email"],
    queryFn: () => userService.getUserEmail(),
    staleTime: 1000 * 60 * 10, // Cache for 10 minutes
  });
};

export const useGetUserEmailById = (userId: string) => {
  return useQuery({
    queryKey: ["user-email", userId],
    queryFn: () => userService.getUserEmailById(userId),
    staleTime: 1000 * 60 * 10, // Cache for 10 minutes
    enabled: !!userId,
  });
};

export const useGetUserProfile = (userId: string) => {
  return useQuery({
    queryKey: ["user-profile", userId],
    queryFn: () => userService.getUserProfile(userId),
    staleTime: 1000 * 60 * 10, // Cache for 10 minutes
    enabled: !!userId,
  });
};

export const useGetFriendProfile = (userId: string) => {
  return useQuery({
    queryKey: ["friend-profile", userId],
    queryFn: () => userService.getFriendProfile(userId),
    enabled: !!userId,
    staleTime: 1000 * 60 * 5,
  });
};

export const useFriendRequests = () => {
  return useQuery({
    queryKey: ["friend-requests"],
    queryFn: async () => {
      const res = await contactService.getFriendRequests();
      return res as { requests: FriendRequest[] };
    },
    refetchOnWindowFocus: false, // ❌ Tắt auto-refetch khi focus tab
    staleTime: 5 * 60 * 1000, // 5 phút - cho phép invalidate work
  });
};

export const useSendFriendRequest = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: contactService.sendFriendRequest,
    onSuccess: () => {
      // ❌ Bỏ invalidateQueries vì socket sẽ tự động update
      // queryClient.invalidateQueries({ queryKey: ["friend-requests"] });
      toast.success("Đã gửi lời mời kết bạn");
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || "Không thể gửi lời mời");
    },
  });
};

export const useAcceptFriendRequest = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: contactService.acceptFriendRequest,
    onSuccess: () => {
      // ❌ Bỏ invalidateQueries vì socket sẽ tự động update
      // queryClient.invalidateQueries({ queryKey: ["friend-requests"] });
      // queryClient.invalidateQueries({ queryKey: ["contacts"] });
      toast.success("Đã chấp nhận lời mời kết bạn");
    },
    onError: (error: any) => {
      toast.error(
        error?.response?.data?.message || "Không thể chấp nhận lời mời",
      );
    },
  });
};

export const useRejectFriendRequest = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: contactService.rejectFriendRequest,
    onSuccess: () => {
      // ❌ Bỏ invalidateQueries vì socket sẽ tự động update
      // queryClient.invalidateQueries({ queryKey: ["friend-requests"] });
      toast.success("Đã từ chối lời mời kết bạn");
    },
    onError: (error: any) => {
      toast.error(
        error?.response?.data?.message || "Không thể từ chối lời mời",
      );
    },
  });
};

export const useRemoveFriend = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: contactService.removeFriend,
    onSuccess: () => {
      // ⚠️ Giữ lại invalidate cho remove friend vì BE chưa có socket event
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      toast.success("Đã xóa bạn");
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || "Không thể xóa bạn");
    },
  });
};
