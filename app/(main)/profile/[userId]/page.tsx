"use client";

import { useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { Loader2, ChevronLeft, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { PresignedAvatar } from "@/components/ui/presigned-avatar";
import { useGetFriendProfile } from "@/hooks/use-contact";
import { useGetPrivateConversation } from "@/hooks/use-chat";
import { formatPresenceStatus } from "@/lib/utils";

export default function FriendProfilePage() {
  const params = useParams();
  const router = useRouter();
  const userId = params?.userId as string;

  const { data: friend, isLoading, error } = useGetFriendProfile(userId);
  const { mutate: getPrivateConversation, isPending: isOpeningChat } =
    useGetPrivateConversation();

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
    if (!friend?.id) return;

    getPrivateConversation(friend.id, {
      onSuccess: (conversation) => {
        router.push(`/messages/${conversation.id}`);
      },
    });
  };

  return (
    <div className="flex h-full w-full bg-slate-50/50">
      <ScrollArea className="flex-1">
        <div className="max-w-3xl mx-auto px-4 md:px-6 py-5 md:py-7 space-y-4">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="rounded-full"
              onClick={() => router.back()}
            >
              <ChevronLeft className="w-5 h-5" />
            </Button>
            <h1 className="text-lg md:text-xl font-semibold text-slate-900">
              Trang cá nhân
            </h1>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-16 text-slate-500">
              <Loader2 className="w-6 h-6 animate-spin mr-2" />
              Đang tải thông tin...
            </div>
          ) : error || !friend ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center text-slate-500">
              Không thể tải thông tin trang cá nhân.
            </div>
          ) : (
            <>
              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                <div className="h-36 md:h-48 bg-gradient-to-br from-blue-500 via-indigo-500 to-cyan-500" />
                <div className="px-5 pb-5 md:px-7 md:pb-7">
                  <div className="-mt-12 md:-mt-14 flex items-end justify-between gap-4">
                    <PresignedAvatar
                      avatarKey={friend.avatar}
                      displayName={friend.displayName}
                      className="h-24 w-24 md:h-28 md:w-28 border-4 border-white shadow-lg"
                      fallbackClassName="text-3xl font-bold"
                    />

                    <Button
                      onClick={handleOpenChat}
                      disabled={isOpeningChat}
                      className="rounded-xl"
                    >
                      {isOpeningChat ? (
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      ) : (
                        <MessageCircle className="w-4 h-4 mr-2" />
                      )}
                      Nhắn tin
                    </Button>
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

                  <div className="mt-5 grid grid-cols-3 gap-3">
                    <div className="rounded-xl bg-slate-50 p-3 text-center">
                      <div className="text-lg font-semibold text-slate-900">
                        {friend.friendsCount ?? 0}
                      </div>
                      <div className="text-xs text-slate-500">Bạn bè</div>
                    </div>
                    <div className="rounded-xl bg-slate-50 p-3 text-center">
                      <div className="text-lg font-semibold text-slate-900">
                        {friend.mutualFriendsCount ?? 0}
                      </div>
                      <div className="text-xs text-slate-500">Bạn chung</div>
                    </div>
                    <div className="rounded-xl bg-slate-50 p-3 text-center">
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
    </div>
  );
}
