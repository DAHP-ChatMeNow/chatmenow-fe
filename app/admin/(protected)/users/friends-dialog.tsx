"use client";

import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { adminService, AdminUser } from "@/services/admin";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Loader2,
  UserX,
  Users,
} from "lucide-react";
import { PresignedAvatar } from "@/components/ui/presigned-avatar";
import { Button } from "@/components/ui/button";

interface FriendsDialogProps {
  user: AdminUser | null;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export function FriendsDialog({ user, isOpen, onOpenChange }: FriendsDialogProps) {
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "users", user?._id || user?.id, "friends"],
    queryFn: () => adminService.getUserFriends(user?._id || user?.id || ""),
    enabled: isOpen && !!(user?._id || user?.id),
  });

  const { mutate: removeFriend, isPending: isRemoving } = useMutation({
    mutationFn: (friendId: string) =>
      adminService.removeUserFriend(user?._id || user?.id || "", friendId),
    onSuccess: () => {
      qc.invalidateQueries({
        queryKey: ["admin", "users", user?._id || user?.id, "friends"],
      });
      toast.success("Đã xóa bạn bè");
    },
    onError: () => toast.error("Xóa bạn bè thất bại"),
  });

  const friends = data?.friends || [];

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md md:max-w-lg dark:bg-slate-800 dark:border-slate-700 max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg font-semibold dark:text-white">
            <Users className="w-5 h-5 text-blue-500" />
            Bạn bè của {user?.displayName}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto mt-2 min-h-[300px]">
          {isLoading ? (
            <div className="flex items-center justify-center flex-1 h-full py-14">
              <Loader2 className="w-8 h-8 text-blue-600 dark:text-blue-400 animate-spin" />
            </div>
          ) : friends.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-3 py-14 text-slate-400">
              <Users className="w-8 h-8" />
              <p className="text-sm font-medium">Người dùng này chưa có bạn bè</p>
            </div>
          ) : (
            <div className="space-y-2 pr-2">
              {friends.map((friend) => (
                <div
                  key={friend._id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-slate-50 dark:bg-slate-700/30 rounded-lg border border-slate-100 dark:border-slate-700"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <PresignedAvatar
                      avatarKey={friend.avatar}
                      displayName={friend.displayName}
                      className="w-10 h-10 shrink-0"
                      fallbackClassName="text-sm font-semibold"
                    />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-900 dark:text-white truncate">
                        {friend.displayName}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                        {friend.isOnline ? (
                          <span className="text-emerald-500 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            Đang hoạt động
                          </span>
                        ) : (
                          friend.lastSeenText || "Không hoạt động"
                        )}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-rose-600 border-rose-200 hover:bg-rose-50 hover:text-rose-700 dark:border-rose-900/50 dark:hover:bg-rose-950/40 shrink-0"
                    onClick={() => {
                      if (window.confirm(`Bạn có chắc muốn xóa ${friend.displayName} khỏi danh sách bạn bè của ${user?.displayName}?`)) {
                        removeFriend(friend._id);
                      }
                    }}
                    disabled={isRemoving}
                  >
                    <UserX className="w-4 h-4 mr-1.5" />
                    Hủy kết bạn
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
