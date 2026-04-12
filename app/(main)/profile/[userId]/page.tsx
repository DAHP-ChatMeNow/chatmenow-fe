"use client";

import { useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Loader2,
  ChevronLeft,
  MessageCircle,
  MoreHorizontal,
  Share2,
  UserPlus,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { PresignedAvatar } from "@/components/ui/presigned-avatar";
import {
  useContacts,
  useGetFriendProfile,
  useGetUserEmailById,
  useSendFriendRequest,
  useRemoveFriend,
} from "@/hooks/use-contact";
import {
  useGetPrivateConversation,
  useSendMessage,
} from "@/hooks/use-chat";
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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuthStore } from "@/store/use-auth-store";
import {
  createFriendCardAttachment,
  FriendCardPayload,
} from "@/lib/friend-card";

export default function FriendProfilePage() {
  const params = useParams();
  const router = useRouter();
  const userId = params?.userId as string;
  const user = useAuthStore((state) => state.user);
  const currentUserId = user?.id || user?._id;

  const { data: friend, isLoading, error } = useGetFriendProfile(userId);
  const { data: friendEmail } = useGetUserEmailById(userId);
  const { data: contactsData, isLoading: isLoadingContacts } = useContacts();
  const {
    mutate: getPrivateConversation,
    mutateAsync: getPrivateConversationAsync,
    isPending: isOpeningChat,
  } = useGetPrivateConversation();
  const { mutateAsync: sendMessage, isPending: isSendingShareCard } =
    useSendMessage();
  const { mutate: sendFriendRequest, isPending: isSendingFriendRequest } =
    useSendFriendRequest();
  const { mutate: removeFriend, isPending: isRemovingFriend } =
    useRemoveFriend();
  const [showRemoveConfirm, setShowRemoveConfirm] = useState(false);
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [recipientQuery, setRecipientQuery] = useState("");

  const contacts = contactsData?.contacts || [];

  const shareTargets = useMemo(() => {
    const query = recipientQuery.trim().toLowerCase();

    return contacts.filter((contact) => {
      if (!contact?.id || contact.id === currentUserId || contact.id === friend?.id) {
        return false;
      }

      if (!query) {
        return true;
      }

      return (
        contact.displayName.toLowerCase().includes(query) ||
        (contact.email || "").toLowerCase().includes(query)
      );
    });
  }, [contacts, currentUserId, friend?.id, recipientQuery]);

  const statusText = useMemo(
    () =>
      formatPresenceStatus(
        friend?.isOnline,
        friend?.lastSeen,
        friend?.lastSeenText,
      ),
    [friend?.isOnline, friend?.lastSeen, friend?.lastSeenText],
  );

  const handleOpenChat = () => {
    if (!friend?.id || !friend.isFriend) return;

    getPrivateConversation(friend.id, {
      onSuccess: (conversation) => {
        router.push(`/messages/${conversation.id}`);
      },
    });
  };

  const handleSendFriendRequest = () => {
    if (!friend?.id || friend.isFriend) return;

    sendFriendRequest(friend.id);
  };

  const handleShareCard = async (recipientId: string) => {
    if (!friend?.id || !friendEmail?.email) return;

    const conversation = await getPrivateConversationAsync(recipientId);

    if (!conversation?.id) return;

    const payload: FriendCardPayload = {
      userId: friend.id,
      displayName: friend.displayName,
      avatar: friend.avatar,
      email: friendEmail.email,
      profileUrl: `/profile/${friend.id}`,
    };

    await sendMessage({
      conversationId: conversation.id,
      content: `Đã chia sẻ danh thiếp của ${friend.displayName}`,
      type: "file",
      attachments: [createFriendCardAttachment(payload)],
    });

    setShowShareDialog(false);
    setRecipientQuery("");
    router.push(`/messages/${conversation.id}`);
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
                      {friend.isFriend ? (
                        <>
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
                            <DropdownMenuContent align="end" className="w-56">
                              <DropdownMenuItem
                                className="gap-2 cursor-pointer"
                                onClick={() => setShowShareDialog(true)}
                              >
                                <Share2 className="w-4 h-4" />
                                Chia sẻ danh thiếp
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="gap-2 text-red-600 cursor-pointer focus:text-red-600 focus:bg-red-50"
                                onClick={() => setShowRemoveConfirm(true)}
                              >
                                <Trash2 className="w-4 h-4" />
                                Xóa bạn
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </>
                      ) : (
                        <Button
                          onClick={handleSendFriendRequest}
                          disabled={isSendingFriendRequest}
                          className="rounded-xl"
                        >
                          {isSendingFriendRequest ? (
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          ) : (
                            <UserPlus className="w-4 h-4 mr-2" />
                          )}
                          Kết bạn
                        </Button>
                      )}
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

      <Dialog open={showShareDialog} onOpenChange={setShowShareDialog}>
        <DialogContent className="max-w-2xl gap-0 p-0 bg-white border-0 shadow-2xl dark:bg-slate-800 rounded-2xl">
          <div className="px-6 pt-6 pb-4 space-y-4">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold text-slate-900 dark:text-white">
                Chia sẻ danh thiếp
              </DialogTitle>
            </DialogHeader>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-900/40">
              <div className="flex items-center gap-3">
                <PresignedAvatar
                  avatarKey={friend?.avatar}
                  displayName={friend?.displayName || ""}
                  className="h-14 w-14 shrink-0"
                  fallbackClassName="text-lg font-bold"
                />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-base font-semibold text-slate-900 dark:text-white">
                    {friend?.displayName}
                  </div>
                  <div className="truncate text-sm text-slate-500 dark:text-slate-400">
                    {friendEmail?.email || "Đang tải email..."}
                  </div>
                </div>
              </div>
            </div>

            <Input
              placeholder="Tìm người nhận..."
              value={recipientQuery}
              onChange={(e) => setRecipientQuery(e.target.value)}
            />

            <ScrollArea className="h-72 rounded-2xl border border-slate-200 dark:border-slate-700">
              <div className="p-2">
                {isLoadingContacts ? (
                  <div className="flex items-center justify-center py-10 text-sm text-slate-500">
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Đang tải danh sách bạn bè...
                  </div>
                ) : shareTargets.length > 0 ? (
                  shareTargets.map((contact) => (
                    <button
                      key={contact.id}
                      type="button"
                      onClick={() => void handleShareCard(contact.id)}
                      disabled={isSendingShareCard}
                      className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60 dark:hover:bg-slate-800"
                    >
                      <PresignedAvatar
                        avatarKey={contact.avatar}
                        displayName={contact.displayName}
                        className="h-11 w-11 shrink-0"
                        fallbackClassName="text-sm font-semibold"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="truncate font-medium text-slate-900 dark:text-white">
                          {contact.displayName}
                        </div>
                        <div className="truncate text-xs text-slate-500 dark:text-slate-400">
                          {contact.email || "Không có email"}
                        </div>
                      </div>
                      <div className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700 dark:bg-blue-500/10 dark:text-blue-300">
                        Gửi
                      </div>
                    </button>
                  ))
                ) : (
                  <div className="px-4 py-10 text-center text-sm text-slate-500">
                    Không tìm thấy người nhận phù hợp.
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>
        </DialogContent>
      </Dialog>

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
