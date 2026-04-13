"use client";

import { useState } from "react";
import { MessageCircle, Loader, UserCircle2, UserMinus } from "lucide-react";
import { PresignedAvatar } from "@/components/ui/presigned-avatar";
import { Button } from "@/components/ui/button";
import { User } from "@/types/user";
import { useRouter } from "next/navigation";
import { useBlockedUsers, useRemoveFriend } from "@/hooks/use-contact";
import { useGetPrivateConversation } from "@/hooks/use-chat";
import { formatPresenceStatus } from "@/lib/utils";

interface FriendsListProps {
  friends: User[];
  isLoading: boolean;
  searchQuery?: string;
}

export function FriendsList({
  friends,
  isLoading,
  searchQuery = "",
}: FriendsListProps) {
  const router = useRouter();
  const [pendingRemoveId, setPendingRemoveId] = useState<string | null>(null);
  const { data: blockedUsersData } = useBlockedUsers();
  const { mutate: removeFriend, isPending: isRemovingFriend } = useRemoveFriend();
  const { mutate: getPrivateConversation } = useGetPrivateConversation();
  const blockedIdSet = new Set(
    (blockedUsersData?.blockedUsers || []).map((user) => user.id || user._id),
  );
  const normalizeUserId = (user: User) => user.id || user._id || "";

  const filteredFriends = friends.filter((friend) =>
    friend.displayName.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const handleMessageFriend = (friendId: string) => {
    // Lấy conversation private đã tồn tại
    getPrivateConversation(friendId, {
      onSuccess: (conversation) => {
        router.push(`/messages/${conversation.id}`);
      },
    });
  };

  const handleViewProfile = (friendId: string) => {
    router.push(`/profile/${friendId}`);
  };

  const handleRemoveFriend = (friendId: string) => {
    if (!friendId) return;
    if (!window.confirm("Bạn có chắc chắn muốn xóa bạn này không?")) return;

    setPendingRemoveId(friendId);
    removeFriend(friendId, {
      onSettled: () => {
        setPendingRemoveId(null);
      },
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader className="w-6 h-6 animate-spin text-slate-400" />
      </div>
    );
  }

  if (filteredFriends.length === 0) {
    return (
      <div className="text-center py-8 text-slate-500">
        Không tìm thấy bạn bè nào
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
      {filteredFriends.map((friend) => {
        const friendId = normalizeUserId(friend);
        if (!friendId) return null;
        const isRemovingThisFriend =
          isRemovingFriend && pendingRemoveId === friendId;

        return (
        <div
          key={friendId}
          className="p-3 rounded-xl hover:bg-slate-50 border border-transparent hover:border-slate-100 transition-all group"
        >
          <div className="flex items-start justify-between mb-2">
            <PresignedAvatar
              avatarKey={friend.avatar}
              displayName={friend.displayName}
              className="h-10 w-10"
              fallbackClassName="bg-slate-100"
            />
            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <Button
                size="sm"
                variant="ghost"
                className="h-7 w-7 p-0"
                onClick={() => handleViewProfile(friendId)}
                title="Xem thông tin cá nhân"
              >
                <UserCircle2 className="w-4 h-4 text-slate-600" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-7 w-7 p-0"
                onClick={() => handleMessageFriend(friendId)}
                title="Nhắn tin"
              >
                <MessageCircle className="w-4 h-4 text-blue-600" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-7 w-7 p-0"
                onClick={() => handleRemoveFriend(friendId)}
                title="Xóa bạn"
                disabled={isRemovingThisFriend}
              >
                {isRemovingThisFriend ? (
                  <Loader className="w-4 h-4 animate-spin text-red-500" />
                ) : (
                  <UserMinus className="w-4 h-4 text-red-500" />
                )}
              </Button>
            </div>
          </div>
          <div className="flex items-center gap-2 min-w-0">
            <p className="font-semibold text-sm text-slate-900 truncate">
              {friend.displayName}
            </p>
            {blockedIdSet.has(friendId) && (
              <span className="px-1.5 py-0.5 text-[10px] font-semibold text-white bg-red-500 rounded-full shrink-0">
                Chặn
              </span>
            )}
          </div>
          <p className="text-xs text-slate-400">
            {formatPresenceStatus(
              friend.isOnline,
              friend.lastSeen,
              friend.lastSeenText,
            )}
          </p>
          <button
            type="button"
            onClick={() => handleViewProfile(friendId)}
            className="mt-1 text-[11px] font-medium text-slate-500 hover:text-blue-600"
          >
            Xem thông tin cá nhân
          </button>
        </div>
        );
      })}
    </div>
  );
}
