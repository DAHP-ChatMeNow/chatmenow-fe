"use client";

import { useMemo, useState } from "react";
import { Loader2, Send, Share2, Search, X } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useShareTargets } from "@/hooks/use-chat";
import { useSharePost, useSharePostToChat } from "@/hooks/use-post";
import { PresignedAvatar } from "@/components/ui/presigned-avatar";
import { ShareTargetItem, ShareTargetMember } from "@/services/chat";
import { PostPrivacy } from "@/types/post";

const getMemberId = (member?: ShareTargetMember): string | undefined => {
  if (!member) return undefined;
  if (member._id || member.id) return member._id || member.id;
  if (!member.userId) return undefined;
  if (typeof member.userId === "string") return member.userId;
  if (typeof member.userId === "object") return member.userId._id || member.userId.id;
  return undefined;
};

const getTargetDisplayName = (target: ShareTargetItem): string => {
  const name = String(target.displayName || "").trim();
  if (name) return name;
  const partnerName = String(target.partner?.displayName || "").trim();
  if (partnerName) return partnerName;
  return target.type === "group" ? "Nhóm chat" : "Tin nhắn riêng";
};

const getTargetAvatar = (target: ShareTargetItem): string | undefined => {
  const avatar = String(target.avatar || "").trim();
  if (avatar) return avatar;
  const partnerAvatar = String(target.partner?.avatar || "").trim();
  if (partnerAvatar) return partnerAvatar;
  return undefined;
};

const getLastMessagePreview = (target: ShareTargetItem): string => {
  const text = String(target.lastMessage?.content || "").trim();
  if (text) return text;
  const type = String(target.lastMessage?.type || "").toLowerCase();
  if (type.includes("image")) return "Đã gửi một ảnh";
  if (type.includes("video")) return "Đã gửi một video";
  if (type === "shared_post") return "Đã chia sẻ một bài viết";
  return "Chưa có tin nhắn";
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
  const { mutate: sharePost, isPending: isSharingPost } = useSharePost();
  const { mutate: sharePostToChat, isPending: isSharingToChat } = useSharePostToChat();

  const [profileCaption, setProfileCaption] = useState("");
  const [chatCaption, setChatCaption] = useState("");
  const [privacy, setPrivacy] = useState<PostPrivacy>("public");
  const [query, setQuery] = useState("");
  const [pendingConversationId, setPendingConversationId] = useState<string | null>(null);

  const {
    data: shareTargetsData,
    isLoading: isLoadingShareTargets,
    isFetching: isFetchingShareTargets,
  } = useShareTargets(query, 20, open);

  const targets = useMemo(
    () => shareTargetsData?.targets || [],
    [shareTargetsData?.targets],
  );
  const suggestedTargets = useMemo(() => {
    const privateTargetsByPartner = new Map<string, ShareTargetItem>();

    targets.forEach((target) => {
      if (target.type !== "private") return;
      const partnerId = String(target.partner?._id || target.partner?.id || "").trim();
      if (!partnerId) return;
      privateTargetsByPartner.set(partnerId, target);
    });

    const suggestions: ShareTargetItem[] = [];
    const seenConversationIds = new Set<string>();
    (shareTargetsData?.recentMembers || []).forEach((member) => {
      const memberId = getMemberId(member);
      if (!memberId) return;
      const matched = privateTargetsByPartner.get(memberId);
      const conversationId = String(matched?.conversationId || "");
      if (!matched || !conversationId || seenConversationIds.has(conversationId)) return;
      suggestions.push(matched);
      seenConversationIds.add(conversationId);
    });

    return suggestions.slice(0, 6);
  }, [shareTargetsData?.recentMembers, targets]);

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
      <DialogContent className="sm:max-w-[500px] p-0 overflow-hidden bg-white border-0 shadow-2xl sm:rounded-3xl">
        <DialogHeader className="px-6 pt-6 pb-2 bg-white z-10 w-full relative">
          <DialogTitle className="text-xl font-bold text-gray-900 text-center">
            Chia sẻ bài viết
          </DialogTitle>
          <DialogClose className="absolute right-4 top-4 rounded-full p-2 transition-colors hover:bg-gray-100 focus:outline-none disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground w-10 h-10 flex items-center justify-center">
            <X className="w-5 h-5 text-gray-500" />
            <span className="sr-only">Close</span>
          </DialogClose>
        </DialogHeader>

        <div className="flex flex-col px-5 pb-6">
          <Tabs defaultValue="chat" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-4 bg-gray-100/80 rounded-xl p-1 h-12">
              <TabsTrigger value="chat" className="rounded-lg text-sm font-semibold transition-all data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:shadow-sm focus-visible:ring-2 focus-visible:ring-blue-400">Gửi tin nhắn</TabsTrigger>
              <TabsTrigger value="profile" className="rounded-lg text-sm font-semibold transition-all data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:shadow-sm focus-visible:ring-2 focus-visible:ring-blue-400">Lên trang cá nhân</TabsTrigger>
            </TabsList>

            <TabsContent value="profile" className="mt-0 outline-none data-[state=active]:animate-in data-[state=active]:fade-in data-[state=active]:zoom-in-95 duration-300">
              <section className="p-4 space-y-4 border border-blue-100 bg-blue-50/40 rounded-2xl">
                <Textarea
                  value={profileCaption}
                  onChange={(e) => setProfileCaption(e.target.value)}
                  placeholder="Thêm cảm nghĩ của bạn..."
                  className="resize-none min-h-[140px] bg-white border-gray-200 focus-visible:ring-2 focus-visible:ring-blue-500/20 rounded-xl text-base"
                />
                <div className="flex items-center justify-between gap-3 pt-2">
                  <Select value={privacy} onValueChange={(v) => setPrivacy(v as PostPrivacy)}>
                    <SelectTrigger className="w-[140px] h-10 bg-white border-gray-200 rounded-xl font-medium text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      <SelectItem value="public">Công khai</SelectItem>
                      <SelectItem value="friends">Bạn bè</SelectItem>
                      <SelectItem value="private">Chỉ mình tôi</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    type="button"
                    onClick={handleShareToProfile}
                    disabled={isSharingPost}
                    className="flex items-center gap-2 px-6 h-10 text-white transition-all bg-blue-600 rounded-full hover:bg-blue-700 hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50"
                  >
                    {isSharingPost ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Share2 className="w-4 h-4" />
                    )}
                    <span className="font-semibold text-sm">Đăng ngay</span>
                  </Button>
                </div>
              </section>
            </TabsContent>

            <TabsContent value="chat" className="mt-0 space-y-4 outline-none data-[state=active]:animate-in data-[state=active]:fade-in data-[state=active]:zoom-in-95 duration-300">
              <div className="space-y-3">
                <Input
                  value={chatCaption}
                  onChange={(e) => setChatCaption(e.target.value)}
                  placeholder="Thêm lời nhắn (tuỳ chọn)..."
                  className="h-11 bg-gray-50 border-gray-200 focus-visible:bg-white focus-visible:ring-2 focus-visible:ring-blue-500/20 rounded-xl text-sm"
                />
                <div className="relative group">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                  <Input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Tìm kiếm cuộc trò chuyện..."
                    className="h-11 pl-10 bg-gray-50 border-gray-200 focus-visible:bg-white focus-visible:ring-2 focus-visible:ring-blue-500/20 rounded-xl text-sm"
                  />
                </div>
              </div>

              {suggestedTargets.length > 0 && !query ? (
                <div className="pt-1 space-y-2">
                  <p className="text-[11px] font-bold tracking-wider text-gray-400 uppercase">
                    Gợi ý gần đây
                  </p>
                  <div className="flex items-start gap-3 overflow-x-auto pb-1 scrollbar-none custom-scrollbar">
                    {suggestedTargets.map((target) => {
                      const conversationId = String(target.conversationId || "");
                      if (!conversationId) return null;
                      const displayName = getTargetDisplayName(target);
                      const avatar = getTargetAvatar(target);
                      const isPending = isSharingToChat && pendingConversationId === conversationId;

                      return (
                        <button
                          key={`suggest-${conversationId}`}
                          type="button"
                          className="flex flex-col items-center gap-1.5 group w-[64px] shrink-0 outline-none"
                          disabled={isSharingToChat}
                          onClick={() => handleShareToConversation(conversationId)}
                        >
                          <div className="relative flex items-center justify-center w-12 h-12 rounded-full transition-all group-hover:ring-4 group-hover:ring-blue-100 bg-gray-50">
                            {isPending ? (
                              <div className="absolute inset-0 flex items-center justify-center bg-white/60 rounded-full z-10">
                                <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
                              </div>
                            ) : null}
                            <PresignedAvatar
                              avatarKey={avatar}
                              displayName={displayName}
                              className="w-12 h-12 text-[10px]"
                            />
                          </div>
                          <span className="text-[10px] font-medium text-gray-700 text-center leading-tight line-clamp-2 group-hover:text-blue-600 transition-colors px-0.5 w-full">
                            {displayName}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : null}

              <div className="space-y-2 pt-1 border-t border-gray-100">
                <p className="text-[11px] font-bold tracking-wider text-gray-400 uppercase pt-2">
                  {query ? "Kết quả tìm kiếm" : "Tất cả cuộc trò chuyện"}
                </p>
                <ScrollArea className="h-[180px] pr-3 -mr-3">
                  <div className="space-y-1 pb-2">
                    {isLoadingShareTargets ? (
                      <div className="flex flex-col items-center justify-center py-6 text-gray-500">
                        <Loader2 className="w-6 h-6 mb-3 text-blue-500 animate-spin" />
                        <span className="text-xs font-medium animate-pulse">Đang tải...</span>
                      </div>
                    ) : targets.length === 0 ? (
                      <div className="flex items-center justify-center py-8 text-sm text-gray-500 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                        Không tìm thấy cuộc trò chuyện nào
                      </div>
                    ) : (
                      targets.map((target) => {
                        const conversationId = String(target.conversationId || "");
                        if (!conversationId) return null;
                        const displayName = getTargetDisplayName(target);
                        const avatar = getTargetAvatar(target);
                        const isPending = isSharingToChat && pendingConversationId === conversationId;
                        const isGroup = String(target.type || "").toLowerCase() === "group";
                        const memberCountText =
                          isGroup && Number(target.memberCount || 0) > 0
                            ? `${target.memberCount} thành viên`
                            : "Tin nhắn riêng";
                        const lastMessagePreview = getLastMessagePreview(target);

                        return (
                          <div
                            key={conversationId}
                            className="flex items-center justify-between p-2 transition-all duration-200 bg-white border border-transparent rounded-2xl hover:bg-gray-50 hover:border-gray-200 group"
                          >
                            <div className="flex items-center gap-3 min-w-0 flex-1 pr-3">
                              <PresignedAvatar
                                avatarKey={avatar}
                                displayName={displayName}
                                className="w-10 h-10 shrink-0 transition-shadow group-hover:ring-2 group-hover:ring-blue-100"
                              />
                              <div className="min-w-0 flex flex-col justify-center">
                                <p className="text-sm font-bold text-gray-900 truncate group-hover:text-blue-600 transition-colors">
                                  {displayName}
                                </p>
                                <p className="text-[11px] text-gray-500 truncate mt-0.5">
                                  {memberCountText} • {lastMessagePreview}
                                </p>
                              </div>
                            </div>
                            <Button
                              size="sm"
                              type="button"
                              disabled={isSharingToChat}
                              className="flex items-center gap-1.5 px-4 rounded-full transition-all bg-blue-50 hover:bg-blue-600 text-blue-600 hover:text-white group-hover:shadow-sm shrink-0 h-8"
                              onClick={() => handleShareToConversation(conversationId)}
                            >
                              {isPending ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                              ) : (
                                <Send className="w-3 h-3" />
                              )}
                              <span className="font-semibold text-xs">Gửi</span>
                            </Button>
                          </div>
                        );
                      })
                    )}
                  </div>
                </ScrollArea>
                {isFetchingShareTargets && !isLoadingShareTargets ? (
                  <p className="text-[10px] text-gray-400 font-medium text-center animate-pulse pt-1">
                    Đang cập nhật...
                  </p>
                ) : null}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}
