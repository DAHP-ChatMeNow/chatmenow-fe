"use client";

import { useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Loader2,
  ChevronLeft,
  MessageCircle,
  Globe,
  Users,
  SlidersHorizontal,
  Lock,
  Heart,
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
import { formatPresenceStatus, formatPostTime } from "@/lib/utils";
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
import { useProfilePosts } from "@/hooks/use-post";
import { Post, PostMedia } from "@/types/post";
import { getPostPrivacyLabel } from "@/lib/post-privacy";
import { PostMediaLightbox } from "@/components/post/post-media-lightbox";
import { PostShareDialog } from "@/components/post/post-share-dialog";
import { SharedPostPreview } from "@/components/post/shared-post-preview";

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

  const shareTargets = useMemo(() => {
    const contacts = contactsData?.contacts || [];
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
  }, [contactsData?.contacts, currentUserId, friend?.id, recipientQuery]);

  const statusText = useMemo(
    () =>
      formatPresenceStatus(
        friend?.isOnline,
        friend?.lastSeen,
        friend?.lastSeenText,
      ),
    [friend?.isOnline, friend?.lastSeen, friend?.lastSeenText],
  );
  const {
    data: profilePostsData,
    isLoading: isLoadingProfilePosts,
    fetchNextPage: fetchNextProfilePosts,
    hasNextPage: hasNextProfilePosts,
    isFetchingNextPage: isFetchingMoreProfilePosts,
  } = useProfilePosts(friend?.id);

  const profilePosts = Array.from(
    new Map(
      (profilePostsData?.pages.flatMap((page) => page.posts) || []).map(
        (post) => [post.id, post],
      ),
    ).values(),
  );
  const profileDetails = [
    { label: "Quê quán", value: friend?.hometown },
    { label: "Số điện thoại", value: friend?.phoneNumber },
    { label: "Giới tính", value: friend?.gender },
    { label: "Trường học", value: friend?.school },
    { label: "Tình trạng hôn nhân", value: friend?.maritalStatus },
  ].filter((item) => !!item.value?.trim());

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

              <div className="space-y-3">
                <h3 className="px-1 text-base font-semibold text-slate-900">
                  Bài viết
                </h3>

                {isLoadingProfilePosts ? (
                  <div className="flex items-center justify-center rounded-2xl border border-slate-200 bg-white py-10 text-slate-500">
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Đang tải bài viết...
                  </div>
                ) : profilePosts.length === 0 ? (
                  <div className="rounded-2xl border border-slate-200 bg-white px-4 py-8 text-center text-sm text-slate-500">
                    Chưa có bài viết công khai để hiển thị.
                  </div>
                ) : (
                  <>
                    {profilePosts.map((post) => (
                      <FriendProfilePostCard key={post.id} post={post} />
                    ))}

                    {isFetchingMoreProfilePosts ? (
                      <div className="flex items-center justify-center py-3 text-slate-500">
                        <Loader2 className="h-5 w-5 animate-spin" />
                      </div>
                    ) : null}

                    {hasNextProfilePosts ? (
                      <button
                        type="button"
                        onClick={() => fetchNextProfilePosts()}
                        className="w-full rounded-xl border border-slate-200 bg-white py-2.5 text-sm font-semibold text-blue-600 transition-colors hover:bg-blue-50"
                      >
                        Xem thêm bài viết
                      </button>
                    ) : null}
                  </>
                )}
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

const getPostPrivacyIcon = (privacy?: string, className = "h-3.5 w-3.5") => {
  switch (privacy) {
    case "friends":
      return <Users className={className} />;
    case "custom":
      return <SlidersHorizontal className={className} />;
    case "private":
      return <Lock className={className} />;
    case "public":
    default:
      return <Globe className={className} />;
  }
};

function FriendProfilePostCard({ post }: { post: Post }) {
  const likesCount = post.likesCount ?? 0;
  const commentsCount = post.commentsCount ?? 0;
  const hasStats = likesCount > 0 || commentsCount > 0;
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [isShareDialogOpen, setIsShareDialogOpen] = useState(false);

  return (
    <div className="overflow-hidden bg-white border rounded-2xl border-slate-200">
      <div className="flex items-center gap-3 px-4 pt-4 pb-3">
        <PresignedAvatar
          avatarKey={post.author?.avatar}
          displayName={post.author?.displayName}
          className="h-10 w-10"
        />
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-slate-900">
            {post.author?.displayName || "Người dùng"}
          </p>
          <p className="flex items-center gap-1 text-[11px] text-slate-500">
            {formatPostTime(post.createdAt)}
            <span>•</span>
            <span className="inline-flex items-center gap-1">
              {getPostPrivacyIcon(post.privacy)}
              {getPostPrivacyLabel(post.privacy)}
            </span>
          </p>
        </div>
      </div>

      {post.content ? (
        <p className="px-4 pb-3 text-sm whitespace-pre-wrap text-slate-700">
          {post.content}
        </p>
      ) : null}

      {post.sharedPost ? (
        <div className="px-4 pb-3">
          <SharedPostPreview post={post.sharedPost} />
        </div>
      ) : null}

      {post.media && post.media.length > 0 ? (
        <div className="overflow-hidden border-t border-b border-slate-100">
          <FriendProfilePostMediaGrid
            media={post.media}
            onMediaClick={setLightboxIndex}
          />
        </div>
      ) : null}

      {post.media && lightboxIndex !== null ? (
        <PostMediaLightbox
          open={lightboxIndex !== null}
          media={post.media}
          initialIndex={lightboxIndex}
          author={{
            displayName: post.author?.displayName,
            avatar: post.author?.avatar,
          }}
          content={post.content}
          createdAt={post.createdAt}
          likesCount={post.likesCount}
          commentsCount={post.commentsCount}
          onClose={() => setLightboxIndex(null)}
        />
      ) : null}

      {hasStats ? (
        <div className="flex items-center justify-between px-4 py-3 text-sm text-slate-500">
          <span className="inline-flex items-center gap-1.5">
            <Heart className="h-4 w-4 fill-red-400 text-red-400" />
            {likesCount}
          </span>
          <span>{commentsCount} bình luận</span>
        </div>
      ) : null}

      <div className="border-t border-slate-100 px-2 py-1.5">
        <button
          type="button"
          onClick={() => setIsShareDialogOpen(true)}
          className="flex w-full items-center justify-center gap-2 rounded-lg py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
        >
          <Share2 className="h-4 w-4" />
          Chia sẻ
        </button>
      </div>

      <PostShareDialog
        postId={post.id}
        open={isShareDialogOpen}
        onOpenChange={setIsShareDialogOpen}
      />
    </div>
  );
}

function FriendProfilePostMediaGrid({
  media,
  onMediaClick,
}: {
  media: PostMedia[];
  onMediaClick?: (index: number) => void;
}) {
  if (!media || media.length === 0) return null;
  const count = media.length;

  const getMediaKind = (item: PostMedia): "image" | "video" => {
    const mediaType = String(item.type || "")
      .trim()
      .toLowerCase();
    const mediaUrl = String(item.url || "").toLowerCase();

    const isVideoByType =
      mediaType === "video" || mediaType.startsWith("video/");
    const isVideoByExt = /\.(mp4|mov|avi|mkv|webm|m4v)(\?|#|$)/i.test(mediaUrl);

    if (isVideoByType || isVideoByExt) return "video";
    return "image";
  };

  const mediaEl = (item: PostMedia, index: number, cls = "") => {
    if (getMediaKind(item) === "video") {
      return (
        <button
          key={item.url}
          type="button"
          onClick={() => onMediaClick?.(index)}
          className={`relative h-full w-full ${cls}`}
          aria-label="Xem video"
        >
          <video
            src={item.url}
            muted
            playsInline
            preload="metadata"
            className="pointer-events-none h-full w-full object-cover"
          />
          <span className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-black/45 text-sm text-white">
              ▶
            </span>
          </span>
        </button>
      );
    }
    return (
      <img
        key={item.url}
        src={item.url}
        alt=""
        onClick={() => onMediaClick?.(index)}
        className={`h-full w-full object-cover ${cls}`}
      />
    );
  };

  if (count === 1)
    return (
      <div className="h-[500px] cursor-zoom-in overflow-hidden">
        {mediaEl(media[0], 0)}
      </div>
    );

  if (count === 2)
    return (
      <div className="grid h-[500px] grid-cols-2 gap-0.5 overflow-hidden">
        {media.map((m, idx) => (
          <div key={m.url} className="cursor-zoom-in overflow-hidden">
            {mediaEl(m, idx)}
          </div>
        ))}
      </div>
    );

  if (count === 3)
    return (
      <div className="grid h-[500px] grid-cols-2 grid-rows-2 gap-0.5 overflow-hidden">
        <div className="col-span-2 cursor-zoom-in overflow-hidden">
          {mediaEl(media[0], 0)}
        </div>
        <div className="cursor-zoom-in overflow-hidden">{mediaEl(media[1], 1)}</div>
        <div className="cursor-zoom-in overflow-hidden">{mediaEl(media[2], 2)}</div>
      </div>
    );

  if (count === 4)
    return (
      <div className="grid h-[500px] grid-cols-2 gap-0.5 overflow-hidden">
        {media.map((m, idx) => (
          <div key={m.url} className="cursor-zoom-in overflow-hidden">
            {mediaEl(m, idx)}
          </div>
        ))}
      </div>
    );

  const remaining = count > 5 ? count - 5 : 0;
  return (
    <div className="flex h-[500px] flex-col gap-0.5 overflow-hidden">
      <div className="grid min-h-0 flex-[3] grid-cols-2 gap-0.5">
        {media.slice(0, 2).map((m, idx) => (
          <div key={m.url} className="cursor-zoom-in overflow-hidden">
            {mediaEl(m, idx)}
          </div>
        ))}
      </div>

      <div className="grid min-h-0 flex-[2] grid-cols-3 gap-0.5">
        {media.slice(2, 5).map((m, i) => (
          <div key={m.url} className="relative cursor-zoom-in overflow-hidden">
            {mediaEl(m, i + 2)}
            {i === 2 && remaining > 0 ? (
              <div className="absolute inset-0 flex items-center justify-center bg-black/60">
                <span className="text-2xl font-bold text-white">+{remaining}</span>
              </div>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}
