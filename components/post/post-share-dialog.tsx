"use client";

import { useMemo, useState } from "react";
import { Loader2, Send, Share2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useConversations } from "@/hooks/use-chat";
import { useSharePost, useSharePostToChat } from "@/hooks/use-post";
import { useAuthStore } from "@/store/use-auth-store";
import { PresignedAvatar } from "@/components/ui/presigned-avatar";
import { Conversation } from "@/types/conversation";
import { PostPrivacy } from "@/types/post";

type ConversationView = Conversation & {
  isAI?: boolean;
  isAi?: boolean;
  isAiAssistant?: boolean;
};

const getMemberId = (member: { userId?: unknown }): string | undefined => {
  if (!member?.userId) return undefined;
  if (typeof member.userId === "string") return member.userId;
  if (typeof member.userId === "object") {
    const value = member.userId as { _id?: string; id?: string };
    return value._id || value.id;
  }
  return undefined;
};

const getMemberUserMeta = (member: { userId?: unknown } | undefined) => {
  if (!member?.userId || typeof member.userId !== "object") return undefined;
  return member.userId as { displayName?: string; avatar?: string };
};

const getConversationName = (
  conversation: ConversationView,
  currentUserId?: string,
): string => {
  const rawName = String(conversation.name || "").trim();
  if (rawName) return rawName;

  if (conversation.type === "group") return "Nhóm chat";

  const members = (conversation.members || []) as Array<{ userId?: unknown }>;
  const partner = members.find((member) => {
    const memberId = getMemberId(member);
    return memberId && memberId !== currentUserId;
  });
  const partnerUser = getMemberUserMeta(partner);

  return (
    partnerUser?.displayName ||
    "Tin nhắn riêng"
  );
};

const getConversationAvatar = (
  conversation: ConversationView,
  currentUserId?: string,
) => {
  if (conversation.type === "group") return conversation.groupAvatar;

  const members = (conversation.members || []) as Array<{ userId?: unknown }>;
  const partner = members.find((member) => {
    const memberId = getMemberId(member);
    return memberId && memberId !== currentUserId;
  });
  const partnerUser = getMemberUserMeta(partner);
  return partnerUser?.avatar;
};

export function PostShareDialog({
  postId,
  open,
  onOpenChange,
}: {
  postId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const user = useAuthStore((state) => state.user);
  const currentUserId = user?.id || user?._id;
  const { data: conversationsData, isLoading: isLoadingConversations } = useConversations();
  const { mutate: sharePost, isPending: isSharingPost } = useSharePost();
  const { mutate: sharePostToChat, isPending: isSharingToChat } = useSharePostToChat();

  const [profileCaption, setProfileCaption] = useState("");
  const [chatCaption, setChatCaption] = useState("");
  const [privacy, setPrivacy] = useState<PostPrivacy>("public");
  const [query, setQuery] = useState("");
  const [pendingConversationId, setPendingConversationId] = useState<string | null>(null);

  const conversations = useMemo(() => {
    const all = (conversationsData?.conversations || []) as ConversationView[];
    const q = query.trim().toLowerCase();
    return all.filter((conversation) => {
      const type = String(conversation.type || "").toLowerCase();
      const isAi =
        type === "ai" ||
        Boolean(conversation.isAI) ||
        Boolean(conversation.isAi) ||
        Boolean(conversation.isAiAssistant);

      if (isAi) return false;
      const display = getConversationName(conversation, currentUserId).toLowerCase();
      return !q || display.includes(q);
    });
  }, [conversationsData?.conversations, currentUserId, query]);

  const handleShareToProfile = () => {
    sharePost(
      {
        postId,
        payload: {
          content: profileCaption.trim(),
          privacy,
        },
      },
      {
        onSuccess: () => {
          onOpenChange(false);
          setProfileCaption("");
          setChatCaption("");
          setQuery("");
        },
      },
    );
  };

  const handleShareToConversation = (conversationId: string) => {
    setPendingConversationId(conversationId);
    sharePostToChat(
      {
        postId,
        payload: {
          conversationId,
          content: chatCaption.trim(),
        },
      },
      {
        onSuccess: () => {
          onOpenChange(false);
          setProfileCaption("");
          setChatCaption("");
          setQuery("");
        },
        onSettled: () => {
          setPendingConversationId(null);
        },
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Chia sẻ bài viết</DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          <section className="space-y-2">
            <p className="text-sm font-semibold text-slate-800">Chia sẻ lên trang cá nhân</p>
            <Textarea
              value={profileCaption}
              onChange={(e) => setProfileCaption(e.target.value)}
              placeholder="Thêm cảm nghĩ của bạn..."
              className="min-h-[84px]"
            />
            <div className="flex items-center gap-2">
              <Select value={privacy} onValueChange={(v) => setPrivacy(v as PostPrivacy)}>
                <SelectTrigger className="h-10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="public">Công khai</SelectItem>
                  <SelectItem value="friends">Bạn bè</SelectItem>
                  <SelectItem value="private">Chỉ mình tôi</SelectItem>
                </SelectContent>
              </Select>
              <Button
                type="button"
                onClick={handleShareToProfile}
                disabled={isSharingPost}
                className="shrink-0"
              >
                {isSharingPost ? <Loader2 className="h-4 w-4 animate-spin" /> : <Share2 className="h-4 w-4" />}
                Chia sẻ
              </Button>
            </div>
          </section>

          <section className="space-y-2 border-t border-slate-100 pt-4">
            <p className="text-sm font-semibold text-slate-800">Chia sẻ vào tin nhắn / nhóm</p>
            <Input
              value={chatCaption}
              onChange={(e) => setChatCaption(e.target.value)}
              placeholder="Thêm lời nhắn (tuỳ chọn)..."
            />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Tìm cuộc trò chuyện..."
            />

            <ScrollArea className="h-56 rounded-lg border border-slate-100">
              <div className="space-y-1 p-2">
                {isLoadingConversations ? (
                  <div className="flex items-center justify-center py-8 text-sm text-slate-500">
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Đang tải cuộc trò chuyện...
                  </div>
                ) : conversations.length === 0 ? (
                  <div className="py-8 text-center text-sm text-slate-500">
                    Không có cuộc trò chuyện phù hợp
                  </div>
                ) : (
                  conversations.map((conversation) => {
                    const conversationId = conversation.id || conversation._id;
                    const displayName = getConversationName(conversation, currentUserId);
                    const avatar = getConversationAvatar(conversation, currentUserId);
                    const isPending =
                      isSharingToChat && pendingConversationId === conversationId;

                    return (
                      <div
                        key={conversationId}
                        className="flex items-center justify-between gap-2 rounded-lg border border-transparent px-2 py-2 hover:border-slate-200 hover:bg-slate-50"
                      >
                        <div className="flex min-w-0 items-center gap-2">
                          <PresignedAvatar
                            avatarKey={avatar}
                            displayName={displayName}
                            className="h-8 w-8"
                          />
                          <p className="truncate text-sm font-medium text-slate-800">
                            {displayName}
                          </p>
                        </div>
                        <Button
                          size="sm"
                          type="button"
                          disabled={isSharingToChat}
                          onClick={() => handleShareToConversation(conversationId)}
                        >
                          {isPending ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Send className="h-4 w-4" />
                          )}
                          Gửi
                        </Button>
                      </div>
                    );
                  })
                )}
              </div>
            </ScrollArea>
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
}
