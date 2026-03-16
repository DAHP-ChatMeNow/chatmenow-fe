"use client";

import { MessageCircle, Loader } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { PresignedAvatar } from "@/components/ui/presigned-avatar";
import { Button } from "@/components/ui/button";
import { User } from "@/types/user";
import { useRouter } from "next/navigation";
import { useRemoveFriend } from "@/hooks/use-contact";
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
  const { mutate: removeFriend } = useRemoveFriend();
  const { mutate: getPrivateConversation } = useGetPrivateConversation();

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
      {filteredFriends.map((friend) => (
        <div
          key={friend.id}
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
                onClick={() => handleMessageFriend(friend.id)}
              >
                <MessageCircle className="w-4 h-4 text-blue-600" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-7 w-7 p-0 text-red-600"
                onClick={() => removeFriend(friend.id)}
              >
                ×
              </Button>
            </div>
          </div>
          <p className="font-semibold text-sm text-slate-900">
            {friend.displayName}
          </p>
          <p className="text-xs text-slate-400">
            {formatPresenceStatus(
              friend.isOnline,
              friend.lastSeen,
              friend.lastSeenText,
            )}
          </p>
        </div>
      ))}
    </div>
  );
}
