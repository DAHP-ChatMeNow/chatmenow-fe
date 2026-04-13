"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Loader2,
  ChevronLeft,
  MessageCircle,
  MoreHorizontal,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { PresignedAvatar } from "@/components/ui/presigned-avatar";
import {
  useGetFriendProfile,
  useRemoveFriend,
} from "@/hooks/use-contact";
import { useGetPrivateConversation } from "@/hooks/use-chat";
import { formatPresenceStatus } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface FriendProfileViewProps {
  userId: string;
}

export default function FriendProfileView({ userId }: FriendProfileViewProps) {
  const router = useRouter();

  const { data: friend, isLoading, error } = useGetFriendProfile(userId);
  const { mutate: getPrivateConversation, isPending: isOpeningChat } =
    useGetPrivateConversation();
  const { mutate: removeFriend, isPending: isRemovingFriend } =
    useRemoveFriend();
  const [showRemoveConfirm, setShowRemoveConfirm] = useState(false);

  const statusText = useMemo(
    () =>
      formatPresenceStatus(
        friend?.isOnline,
        friend?.lastSeen,
        friend?.lastSeenText,
      ),
    [friend?.isOnline, friend?.lastSeen, friend?.lastSeenText],
  );
  const profileDetails = [
    { label: "Quê quán", value: friend?.hometown },
    { label: "Số điện thoại", value: friend?.phoneNumber },
    { label: "Giới tính", value: friend?.gender },
    { label: "Trường học", value: friend?.school },
    { label: "Tình trạng hôn nhân", value: friend?.maritalStatus },
  ].filter((item) => !!item.value?.trim());

  const handleOpenChat = () => {
    if (!friend?.id) return;

    getPrivateConversation(friend.id, {
      onSuccess: (conversation) => {
        router.push(`/messages?conversationId=${conversation.id}`);
      },
    });
  };

  const handleRemoveFriend = () => {
    if (!friend?.id) return;

    removeFriend(friend.id, {
      onSuccess: () => {
        setShowRemoveConfirm(false);
        router.back();
      },
    });
  };

  return (
    <div className="flex w-full h-full bg-slate-50/50">
      <ScrollArea className="flex-1">
        <div className="max-w-3xl px-4 py-5 mx-auto space-y-4 md:px-6 md:py-7">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="rounded-full"
              onClick={() => router.back()}
            >
              <ChevronLeft className="w-5 h-5" />
            </Button>
            <h1 className="text-lg font-semibold md:text-xl text-slate-900">
              Trang cá nhân
            </h1>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-16 text-slate-500">
              <Loader2 className="w-6 h-6 mr-2 animate-spin" />
              Đang tải thông tin...
            </div>
          ) : error || !friend ? (
            <div className="p-6 text-center bg-white border rounded-2xl border-slate-200 text-slate-500">
              Không thể tải thông tin trang cá nhân.
            </div>
          ) : (
            <>
              <div className="overflow-hidden bg-white border rounded-2xl border-slate-200">
                <div className="h-36 md:h-48 bg-gradient-to-br from-blue-500 via-indigo-500 to-cyan-500" />
                <div className="px-5 pb-5 md:px-7 md:pb-7">
                  <div className="flex items-end justify-between gap-4 -mt-12 md:-mt-14">
                    <PresignedAvatar
                      avatarKey={friend.avatar}
                      displayName={friend.displayName}
                      className="w-24 h-24 border-4 border-white shadow-lg md:h-28 md:w-28"
                      fallbackClassName="text-3xl font-bold"
                    />

                    <div className="flex items-center gap-2">
                      <Button
                        onClick={handleOpenChat}
                        disabled={isOpeningChat}
                        className="rounded-xl"
                      >
                        {isOpeningChat ? (
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                          <MessageCircle className="w-4 h-4 mr-2" />
                        )}
                        Nhắn tin
                      </Button>

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="outline"
                            size="icon"
                            className="rounded-xl"
                            aria-label="Tuỳ chọn bạn bè"
                          >
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                          <DropdownMenuItem
                            className="gap-2 text-red-600 cursor-pointer focus:text-red-600 focus:bg-red-50"
                            onClick={() => setShowRemoveConfirm(true)}
                          >
                            <Trash2 className="w-4 h-4" />
                            Xóa bạn
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>

                  <div className="mt-3">
                    <h2 className="text-2xl font-bold text-slate-900">
                      {friend.displayName}
                    </h2>
                    <p className="mt-1 text-sm text-slate-500">{statusText}</p>
                    {friend.bio && (
                      <p className="mt-3 text-sm text-slate-600">
                        {friend.bio}
                      </p>
                    )}
                    {profileDetails.length > 0 && (
                      <div className="grid gap-2 mt-3 sm:grid-cols-2">
                        {profileDetails.map((item) => (
                          <div
                            key={item.label}
                            className="px-3 py-2 text-xs rounded-lg bg-slate-100"
                          >
                            <p className="font-semibold text-slate-500">
                              {item.label}
                            </p>
                            <p className="mt-0.5 text-sm text-slate-800">
                              {item.value}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-3 gap-3 mt-5">
                    <div className="p-3 text-center rounded-xl bg-slate-50">
                      <div className="text-lg font-semibold text-slate-900">
                        {friend.friendsCount ?? 0}
                      </div>
                      <div className="text-xs text-slate-500">Bạn bè</div>
                    </div>
                    <div className="p-3 text-center rounded-xl bg-slate-50">
                      <div className="text-lg font-semibold text-slate-900">
                        {friend.mutualFriendsCount ?? 0}
                      </div>
                      <div className="text-xs text-slate-500">Bạn chung</div>
                    </div>
                    <div className="p-3 text-center rounded-xl bg-slate-50">
                      <div className="text-lg font-semibold text-slate-900">
                        {friend.isFriend ? "Có" : "Không"}
                      </div>
                      <div className="text-xs text-slate-500">Bạn bè</div>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </ScrollArea>

      <Dialog open={showRemoveConfirm} onOpenChange={setShowRemoveConfirm}>
        <DialogContent className="max-w-md gap-0 p-0 bg-white border-0 shadow-2xl dark:bg-slate-800 rounded-2xl">
          <div className="px-6 pt-6 pb-4 space-y-3">
            <div className="flex justify-center">
              <div className="flex items-center justify-center w-16 h-16 bg-red-100 rounded-full dark:bg-red-900/30">
                <Trash2 className="w-8 h-8 text-red-600 dark:text-red-400" />
              </div>
            </div>
            <DialogHeader>
              <DialogTitle className="text-xl font-bold text-center text-slate-900 dark:text-white">
                Xóa bạn bè?
              </DialogTitle>
            </DialogHeader>
            <p className="px-2 text-sm leading-relaxed text-center text-slate-600 dark:text-slate-400">
              Bạn có chắc muốn xóa {friend?.displayName} khỏi danh sách bạn bè không?
            </p>
          </div>

          <div className="h-px bg-slate-200 dark:bg-slate-700"></div>

          <div className="flex gap-3 p-4">
            <Button
              variant="outline"
              onClick={() => setShowRemoveConfirm(false)}
              disabled={isRemovingFriend}
              className="flex-1 font-semibold transition-all bg-white border-2 h-11 border-slate-200 dark:border-slate-600 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-xl"
            >
              Hủy
            </Button>
            <Button
              onClick={handleRemoveFriend}
              disabled={isRemovingFriend}
              className="flex-1 font-semibold text-white transition-all bg-red-600 shadow-lg h-11 hover:bg-red-700 rounded-xl shadow-red-600/25 hover:shadow-red-600/40"
            >
              {isRemovingFriend ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Đang xóa...
                </>
              ) : (
                "Xóa"
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
