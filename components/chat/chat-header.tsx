"use client";

import {
  type Dispatch,
  type SetStateAction,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ChevronLeft,
  Phone,
  Video,
  MoreVertical,
  Search as SearchIcon,
  Palette,
  Check,
  Copy,
  Share2,
  UserPlus,
  UserCircle2,
  ShieldBan,
  LogOut,
  Sparkles,
  FileText,
  Trash2,
  Pencil,
  Pin,
  Save,
  Loader2,
  Upload,
  Send,
} from "lucide-react";
import { useRouter, useParams } from "next/navigation";
import { PresignedAvatar } from "@/components/ui/presigned-avatar";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  useMessages,
  useConversation,
  useAddMemberToGroup,
  useClearConversationHistory,
  useLeaveGroup,
  useRemoveMemberFromGroup,
  useTransferGroupAdmin,
  useDissolveGroup,
  useUpdateGroupConversation,
  usePinnedMessages,
  useUnpinMessage,
  useGetPrivateConversation,
  useSendMessage,
} from "@/hooks/use-chat";
import { useAuthStore } from "@/store/use-auth-store";
import {
  useBlockUser,
  useUnblockUser,
  useContacts,
  useGetFriendProfile,
  useSendFriendRequest,
} from "@/hooks/use-contact";
import {
  useApproveGroupMemberRequest,
  useNotifications,
} from "@/hooks/use-notification";
import { useCreateConversation } from "@/hooks/use-chat";
import { useVideoCall } from "@/components/providers/video-call-provider";
import { Conversation, ConversationMember } from "@/types/conversation";
import { Message, MessageAttachment } from "@/types/message";
import { FRIEND_CARD_ATTACHMENT_TYPE } from "@/lib/friend-card";
import {
  createGroupCardAttachment,
  GROUP_CARD_ATTACHMENT_TYPE,
  type GroupCardPayload,
} from "../../lib/group-card";
import { isShareCardSource } from "@/lib/share-card";
import { User } from "@/types/user";
import { UnreadSummaryDialog } from "@/components/chat/unread-summary-dialog";
import { usePresignedUrl } from "@/hooks/use-profile";
import { chatService, type PinnedMessageItem } from "@/services/chat";
import { toast } from "sonner";
import { QRCodeCanvas } from "qrcode.react";
import { buildPublicAppUrl } from "@/types/utils";

type ChatBackgroundKey = "default" | "sky" | "sunset" | "mint" | "night";

type ChatMemberUser =
  | string
  | {
      _id?: string;
      id?: string;
      displayName?: string;
      avatar?: string;
    };

type ChatConversationMember = Omit<ConversationMember, "userId"> & {
  userId: ChatMemberUser;
};

type ChatConversation = Omit<Conversation, "members"> & {
  members: ChatConversationMember[];
};

type GroupMemberView = {
  userId: string;
  displayName: string;
  avatar: string;
  role: string;
};

type GroupJoinRequestView = {
  notificationId: string;
  requesterName: string;
  requesterAvatar?: string;
  requestType?: string;
  requestedCount: number;
  createdAt?: string | Date;
};

type GroupAvatarMemberView = {
  userId: string;
  displayName: string;
  avatar?: string;
};

function GroupAvatarTile({
  member,
  className,
}: {
  member: GroupAvatarMemberView;
  className?: string;
}) {
  return (
    <PresignedAvatar
      avatarKey={member.avatar}
      displayName={member.displayName}
      className={className}
      fallbackClassName="font-semibold text-[10px] text-white bg-gradient-to-br from-blue-400 to-cyan-500"
    />
  );
}

function GroupCompositeAvatar({
  members,
  totalCount,
  className,
}: {
  members: GroupAvatarMemberView[];
  totalCount: number;
  className?: string;
}) {
  const visibleMembers = members.slice(0, 4);
  const hasTriangleLayout = totalCount === 3 && visibleMembers.length >= 3;
  const hasSquareLayout = totalCount >= 4 && visibleMembers.length >= 4;
  const extraCount = Math.max(totalCount - 3, 0);
  const badgeText = extraCount > 99 ? "99+" : `+${extraCount}`;

  return (
    <div
      className={`relative overflow-hidden rounded-full border-2 border-white bg-slate-100 shadow-lg ring-1 ring-slate-100 ${className ?? ""}`}
    >
      {hasTriangleLayout ? (
        <div className="absolute inset-0">
          <div className="absolute left-1/2 top-[6%] h-[46%] w-[46%] -translate-x-1/2">
            <GroupAvatarTile
              member={visibleMembers[0]}
              className="h-full w-full border-2 border-white shadow-sm"
            />
          </div>
          <div className="absolute left-[8%] top-[48%] h-[46%] w-[46%]">
            <GroupAvatarTile
              member={visibleMembers[1]}
              className="h-full w-full border-2 border-white shadow-sm"
            />
          </div>
          <div className="absolute right-[8%] top-[48%] h-[46%] w-[46%]">
            <GroupAvatarTile
              member={visibleMembers[2]}
              className="h-full w-full border-2 border-white shadow-sm"
            />
          </div>
        </div>
      ) : hasSquareLayout ? (
        <div className="absolute inset-0">
          {visibleMembers.map((member, index) => (
            totalCount >= 5 && index === 3 ? (
              <span
                key="group-extra-count"
                className="absolute right-[6%] bottom-[8%] flex h-[45%] w-[45%] items-center justify-center rounded-md bg-slate-600 text-[11px] font-bold text-white shadow-sm"
              >
                {badgeText}
              </span>
            ) : (
              <GroupAvatarTile
                key={member.userId}
                member={member}
                className={`absolute h-[45%] w-[45%] border-2 border-white shadow-sm ${
                  index === 0
                    ? "left-[6%] top-[8%]"
                    : index === 1
                      ? "right-[6%] top-[8%]"
                      : index === 2
                        ? "left-[6%] bottom-[8%]"
                        : "right-[6%] bottom-[8%]"
                }`}
              />
            )
          ))}
        </div>
      ) : (
        <GroupAvatarTile
          member={visibleMembers[0] ?? { userId: "group", displayName: "G" }}
          className="h-full w-full"
        />
      )}

    </div>
  );
}

function GroupMemberCard({
  member,
  isAdmin,
  onTransferAdmin,
  onRemoveMember,
  transferring,
  removing,
}: {
  member: GroupMemberView;
  isAdmin: boolean;
  onTransferAdmin: (memberId: string) => void;
  onRemoveMember: (memberId: string) => void;
  transferring: boolean;
  removing: boolean;
}) {
  const router = useRouter();
  const { data: friendProfile, isFetching: isCheckingFriend } =
    useGetFriendProfile(member.userId);
  const { mutate: sendFriendRequest, isPending: isSendingFriendRequest } =
    useSendFriendRequest();

  const isFriend = Boolean(friendProfile?.isFriend);
  const canSendFriendRequest = !isFriend && !isCheckingFriend;

  return (
    <div
      className="px-3 py-2.5 bg-white border shadow-sm rounded-2xl border-slate-200"
    >
      <div className="flex items-center justify-between gap-2.5">
        <div className="flex items-center flex-1 min-w-0 gap-2.5 text-left">
          <PresignedAvatar
            avatarKey={member.avatar}
            displayName={member.displayName}
            className="w-9 h-9"
            fallbackClassName="font-semibold text-white"
          />
          <div className="min-w-0">
            <div className="text-sm font-medium leading-tight truncate text-slate-900">
              {member.displayName}
            </div>
            <div className="text-xs leading-tight capitalize text-slate-500">
              {member.role === "admin" ? "Admin" : "Thành viên"}
            </div>
          </div>
        </div>

        {isAdmin && member.role !== "admin" && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                size="icon"
                variant="outline"
                className="w-7 h-7 rounded-full border-slate-300 bg-white shadow-sm hover:bg-slate-100"
                disabled={transferring || removing}
                aria-label={`Tùy chọn thành viên ${member.displayName}`}
                onClick={(event) => event.stopPropagation()}
              >
                <MoreVertical className="w-3.5 h-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              sideOffset={8}
              className="z-[70] w-44 border border-slate-200 bg-white shadow-xl"
            >
              <DropdownMenuItem onClick={() => onTransferAdmin(member.userId)}>
                Chuyển admin
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-red-600 focus:text-red-600"
                onClick={() => onRemoveMember(member.userId)}
              >
                Xóa
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {canSendFriendRequest && (
        <div className="flex flex-wrap gap-2 mt-2">
          <Button
            type="button"
            size="sm"
            onClick={(event) => {
              event.stopPropagation();
              sendFriendRequest(member.userId, {
                onSuccess: () => {
                  void router.push(`/profile/${member.userId}`);
                },
              });
            }}
            disabled={isSendingFriendRequest}
          >
            <UserPlus className="w-4 h-4 mr-2" />
            {isSendingFriendRequest ? "Đang gửi..." : "Kết bạn"}
          </Button>
        </div>
      )}
    </div>
  );
}

const URL_REGEX = /(https?:\/\/[^\s]+)/gi;

const getPinnedMessageId = (item?: PinnedMessageItem | null): string => {
  if (!item) return "";
  const message = item.message;
  return String(item.messageId || message?.id || message?._id || "").trim();
};

const getPinnedPreviewText = (message?: Message | null): string => {
  if (!message || message.isUnsent) {
    return "Tin nhắn đã được thu hồi";
  }

  const content = String(message.content || "").trim();
  if (content) {
    return content;
  }

  switch (message.type) {
    case "image":
      return "Da gui mot anh";
    case "video":
      return "Da gui mot video";
    case "audio":
      return "Da gui mot ban ghi am";
    case "file": {
      const firstAttachment = message.attachments?.[0];
      return firstAttachment?.fileName
        ? `Tep: ${firstAttachment.fileName}`
        : "Da gui mot tep";
    }
    case "system":
      return "Tin nhan he thong";
    default:
      return "Tin nhan";
  }
};

type CachedFileItem = {
  id: string;
  source: string;
  fileType?: string;
  fileName?: string;
  createdAt: string;
};

type CachedLinkItem = {
  id: string;
  link: string;
  createdAt: string;
};

type SideSheetCache = {
  files: CachedFileItem[];
  links: CachedLinkItem[];
};

const getMemberUserId = (
  member: ChatConversationMember,
): string | undefined => {
  if (typeof member.userId === "string") return member.userId;
  return member.userId?._id || member.userId?.id;
};

const CHAT_BACKGROUND_OPTIONS: Array<{
  key: ChatBackgroundKey;
  label: string;
  previewClass: string;
}> = [
  {
    key: "default",
    label: "Mặc định",
    previewClass: "bg-gradient-to-b from-white to-slate-50/40",
  },
  {
    key: "sky",
    label: "Xanh trời",
    previewClass: "bg-gradient-to-br from-blue-50 via-white to-cyan-50",
  },
  {
    key: "sunset",
    label: "Hoàng hôn",
    previewClass: "bg-gradient-to-br from-rose-50 via-amber-50 to-orange-100",
  },
  {
    key: "mint",
    label: "Bạc hà",
    previewClass: "bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-100",
  },
  {
    key: "night",
    label: "Đêm",
    previewClass:
      "bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950",
  },
];

export function ChatHeader({
  name,
  isOnline,
  avatar,
  statusText,
  summaryOpen: controlledSummaryOpen,
  onSummaryOpenChange,
}: {
  name?: string;
  isOnline?: boolean;
  avatar?: string;
  statusText?: string;
  summaryOpen?: boolean;
  onSummaryOpenChange?: Dispatch<SetStateAction<boolean>>;
}) {
  const router = useRouter();
  const params = useParams();
  const currentId = params?.id as string | undefined;
  const { data: conversation } = useConversation(currentId || "");
  const { data: messagesData } = useMessages(currentId || "");
  const { data: pinnedMessagesData } = usePinnedMessages(currentId || "");
  const messages = messagesData?.messages || [];
  const pinnedMessages = pinnedMessagesData?.pinnedMessages || [];
  const user = useAuthStore((s) => s.user);
  const currentUserId = user?.id || user?._id;
  const { data: contactsData } = useContacts();
  const contacts = contactsData?.contacts || [];
  const blockUserMutation = useBlockUser();
  const unblockUserMutation = useUnblockUser();
  const createGroupMutation = useCreateConversation();
  const { startCall, startGroupCall, isBusy } = useVideoCall();
  const { mutateAsync: getPrivateConversationAsync } =
    useGetPrivateConversation();
  const { mutateAsync: sendMessageAsync, isPending: isSendingGroupCard } =
    useSendMessage();

  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetTab, setSheetTab] = useState<"assets" | "search" | "pinned">(
    "assets",
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [groupOpen, setGroupOpen] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteSelectedIds, setInviteSelectedIds] = useState<string[]>([]);
  const [groupDrawerOpen, setGroupDrawerOpen] = useState(false);
  const [groupDrawerTab, setGroupDrawerTab] = useState<"info" | "members">(
    "info",
  );
  const [groupDraftName, setGroupDraftName] = useState("");
  const [groupDraftAvatarKey, setGroupDraftAvatarKey] = useState("");
  const [groupDraftPinManagementEnabled, setGroupDraftPinManagementEnabled] =
    useState(false);
  const [groupDraftJoinApprovalEnabled, setGroupDraftJoinApprovalEnabled] =
    useState(false);
  const [renameDialogOpen, setRenameDialogOpen] = useState(false);
  const [renameValue, setRenameValue] = useState("");
  const [groupShareOpen, setGroupShareOpen] = useState(false);
  const [groupCardRecipientQuery, setGroupCardRecipientQuery] = useState("");
  const [groupCardRecipientIds, setGroupCardRecipientIds] = useState<string[]>(
    [],
  );
  const [clearHistoryConfirmOpen, setClearHistoryConfirmOpen] = useState(false);
  const [backgroundOpen, setBackgroundOpen] = useState(false);
  const [selectedBackground, setSelectedBackground] =
    useState<ChatBackgroundKey>("default");
  const [leaveConfirmOpen, setLeaveConfirmOpen] = useState(false);
  const [dissolveConfirmOpen, setDissolveConfirmOpen] = useState(false);
  const [internalSummaryOpen, setInternalSummaryOpen] = useState(false);
  const summaryOpen = controlledSummaryOpen ?? internalSummaryOpen;
  const setSummaryOpen = onSummaryOpenChange ?? setInternalSummaryOpen;

  const addMemberMutation = useAddMemberToGroup();
  const clearConversationHistoryMutation = useClearConversationHistory();
  const leaveGroupMutation = useLeaveGroup();
  const removeMemberMutation = useRemoveMemberFromGroup();
  const transferAdminMutation = useTransferGroupAdmin();
  const updateGroupMutation = useUpdateGroupConversation();
  const dissolveMutation = useDissolveGroup();
  const approveRequestMutation = useApproveGroupMemberRequest();
  const { data: notificationsData } = useNotifications();

  // Derive partnerId from conversation members for private chats
  const partnerId = useMemo(() => {
    if (!conversation || conversation.type !== "private" || !currentUserId)
      return undefined;
    const typedConversation = conversation as ChatConversation;
    const partnerMember = typedConversation.members.find(
      (member) => getMemberUserId(member) !== currentUserId,
    );
    if (!partnerMember) return undefined;
    return typeof partnerMember.userId === "string"
      ? partnerMember.userId
      : partnerMember.userId?._id || partnerMember.userId?.id;
  }, [conversation, currentUserId]);

  // Check if current user is admin in group
  const isAdmin = useMemo(() => {
    if (!conversation || conversation.type !== "group" || !currentUserId)
      return false;
    const typedConversation = conversation as ChatConversation;
    const member = typedConversation.members.find(
      (m) => getMemberUserId(m) === currentUserId,
    );
    return member?.role === "admin";
  }, [conversation, currentUserId]);

  // Get group members (excluding self)
  const groupMembers = useMemo(() => {
    if (!conversation || conversation.type !== "group" || !currentUserId)
      return [];
    const typedConversation = conversation as ChatConversation;
    return typedConversation.members
      .filter((member) => getMemberUserId(member) !== currentUserId)
      .map((member): GroupMemberView => {
        const userId = getMemberUserId(member) || "";
        const profile =
          typeof member.userId === "string" ? undefined : member.userId;

        return {
          userId,
          displayName: profile?.displayName || "Unknown",
          avatar: profile?.avatar || "",
          role: member.role,
        };
      })
      .filter((member) => Boolean(member.userId));
  }, [conversation, currentUserId]);

  const displayName = useMemo(() => {
    if (name) return name;
    if (conversation?.name) return conversation.name;

    if (conversation?.type === "private" && currentUserId) {
      const typedConversation = conversation as ChatConversation;
      const partnerMember = typedConversation.members.find(
        (member) => getMemberUserId(member) !== currentUserId,
      );

      if (partnerMember && typeof partnerMember.userId === "object") {
        return partnerMember.userId?.displayName || "Chat";
      }
    }

    return "Chat";
  }, [name, conversation, currentUserId]);

  const headerAvatarKey = useMemo(() => {
    if (avatar) return avatar;
    if (conversation?.groupAvatar) return conversation.groupAvatar;

    if (conversation?.type === "private" && currentUserId) {
      const typedConversation = conversation as ChatConversation;
      const partnerMember = typedConversation.members.find(
        (member) => getMemberUserId(member) !== currentUserId,
      );

      if (partnerMember && typeof partnerMember.userId === "object") {
        return partnerMember.userId?.avatar || "";
      }
    }

    return "";
  }, [avatar, conversation, currentUserId]);
  const groupAvatarMembers = useMemo<GroupAvatarMemberView[]>(() => {
    if (!conversation || conversation.type !== "group") return [];
    const typedConversation = conversation as ChatConversation;

    return typedConversation.members
      .map((member) => {
        const userId = getMemberUserId(member);
        const profile =
          typeof member.userId === "string" ? undefined : member.userId;
        const fallbackName = profile?.displayName || `User ${userId || ""}`;

        return {
          userId: userId || fallbackName,
          displayName: fallbackName,
          avatar: profile?.avatar || "",
        };
      })
      .filter((member) => Boolean(member.userId));
  }, [conversation]);
  const shouldUseCompositeGroupAvatar =
    conversation?.type === "group" &&
    !headerAvatarKey &&
    groupAvatarMembers.length >= 3;
  const groupMemberCount =
    conversation?.type === "group"
      ? (conversation as ChatConversation).members.length
      : 0;

  const groupCallParticipantIds = useMemo(() => {
    if (!conversation || conversation.type !== "group" || !currentUserId) {
      return [];
    }

    const typedConversation = conversation as ChatConversation;
    return typedConversation.members
      .map((member) => getMemberUserId(member))
      .filter((id): id is string => Boolean(id) && id !== currentUserId);
  }, [conversation, currentUserId]);
  const groupMemberIds = useMemo(() => {
    return new Set(groupMembers.map((member) => member.userId));
  }, [groupMembers]);

  const pendingJoinRequests = useMemo<GroupJoinRequestView[]>(() => {
    if (!currentId) return [];

    const notifications = notificationsData?.notifications || [];

    return notifications
      .filter((notification) => {
        if (notification.type !== "group_member_request") return false;

        const status = notification.metadata?.status;
        if (status && status !== "pending") return false;

        const referencedConversationId =
          typeof notification.referenced === "string"
            ? notification.referenced
            : notification.referenced?.id || notification.referenced?._id;

        const metadataConversationId = notification.metadata?.conversationId;
        const targetConversationId = String(
          metadataConversationId || referencedConversationId || "",
        );

        return targetConversationId === String(currentId);
      })
      .map((notification) => ({
        notificationId: notification.id,
        requesterName: notification.senderName || "Người dùng",
        requesterAvatar: notification.senderAvatar,
        requestType: notification.metadata?.requestType,
        requestedCount: Array.isArray(notification.metadata?.memberIds)
          ? notification.metadata.memberIds.length
          : 1,
        createdAt: notification.createdAt,
      }));
  }, [currentId, notificationsData?.notifications]);

  const inviteContacts = useMemo(() => {
    return contacts.filter((contact) => {
      const contactId = contact._id || contact.id;
      return (
        Boolean(contactId) &&
        contactId !== currentUserId &&
        !groupMemberIds.has(contactId)
      );
    });
  }, [contacts, currentUserId, groupMemberIds]);

  const shareContacts = useMemo(() => {
    return contacts.filter((contact) => {
      const contactId = contact._id || contact.id;
      return Boolean(contactId) && contactId !== currentUserId;
    });
  }, [contacts, currentUserId]);

  const groupShareLink = useMemo(() => {
    if (!currentId) return "";
    return buildPublicAppUrl(`/messages?conversationId=${currentId}`);
  }, [currentId]);

  const groupCardPayload = useMemo<GroupCardPayload | null>(() => {
    if (!currentId) return null;

    return {
      conversationId: currentId,
      displayName,
      avatar: headerAvatarKey || undefined,
      memberCount: conversation?.members?.length || groupMembers.length + 1,
      profileUrl: buildPublicAppUrl(`/messages?conversationId=${currentId}`),
    };
  }, [
    conversation?.members?.length,
    currentId,
    displayName,
    groupMembers.length,
    headerAvatarKey,
  ]);

  const isCallEnabled = process.env.NEXT_PUBLIC_ENABLE_CALL === "true";
  const canCall =
    isCallEnabled &&
    !isBusy &&
    ((conversation?.type === "private" && !!partnerId) ||
      (conversation?.type === "group" && groupCallParticipantIds.length > 0));

  const handleStartCall = async (callType: "audio" | "video") => {
    if (!canCall || !conversation) return;

    if (conversation.type === "group") {
      await startGroupCall({
        participantIds: groupCallParticipantIds,
        conversationId: currentId,
        groupName: displayName,
        callType,
      });
      return;
    }

    if (!partnerId) return;

    await startCall({
      receiverId: partnerId,
      receiverName: displayName,
      conversationId: currentId,
      callType,
    });
  };

  const canOpenFriendProfile =
    conversation?.type === "private" && Boolean(partnerId);
  const isBlockedByMe = Boolean(
    conversation?.type === "private" && conversation?.blockedByMe,
  );

  const latestPinnedItem = useMemo(() => {
    if (!Array.isArray(pinnedMessages) || pinnedMessages.length === 0) {
      return null;
    }

    return [...pinnedMessages].sort((left, right) => {
      const leftTime = new Date(
        left?.pinnedAt || left?.message?.createdAt || 0,
      ).getTime();
      const rightTime = new Date(
        right?.pinnedAt || right?.message?.createdAt || 0,
      ).getTime();
      return rightTime - leftTime;
    })[0];
  }, [pinnedMessages]);

  const latestPinnedPreview = useMemo(
    () => getPinnedPreviewText(latestPinnedItem?.message),
    [latestPinnedItem],
  );

  const handleFocusLatestPinnedMessage = useCallback(() => {
    const messageId = getPinnedMessageId(latestPinnedItem);
    if (!messageId || typeof window === "undefined") return;

    window.dispatchEvent(
      new CustomEvent("chat:focus-message", {
        detail: {
          conversationId: currentId,
          messageId,
        },
      }),
    );
  }, [currentId, latestPinnedItem]);

  const handleOpenFriendProfile = () => {
    if (!canOpenFriendProfile || !partnerId) return;
    router.push(`/profile/${partnerId}`);
  };

  const openBackgroundPicker = () => {
    if (typeof window !== "undefined" && currentId) {
      const saved = localStorage.getItem(
        `chat-background:${currentId}`,
      ) as ChatBackgroundKey | null;
      if (
        saved &&
        CHAT_BACKGROUND_OPTIONS.some((option) => option.key === saved)
      ) {
        setSelectedBackground(saved);
      } else {
        setSelectedBackground("default");
      }
    }
    setBackgroundOpen(true);
  };

  const handleSelectBackground = (background: ChatBackgroundKey) => {
    if (!currentId || typeof window === "undefined") return;

    localStorage.setItem(`chat-background:${currentId}`, background);
    setSelectedBackground(background);
    window.dispatchEvent(
      new CustomEvent("chat:background-change", {
        detail: { conversationId: currentId, background },
      }),
    );
  };

  const openGroupDrawer = (tab: "info" | "members") => {
    setGroupDrawerTab(tab);
    setGroupDraftName(conversation?.name || displayName || "");
    setGroupDraftAvatarKey(conversation?.groupAvatar || "");
    setGroupDraftPinManagementEnabled(
      Boolean(conversation?.pinManagementEnabled),
    );
    setGroupDraftJoinApprovalEnabled(
      Boolean(conversation?.joinApprovalEnabled),
    );
    setGroupDrawerOpen(true);
  };

  const openRenameDialog = () => {
    setRenameValue(conversation?.name || displayName || "");
    setRenameDialogOpen(true);
  };

  const handleRenameGroup = async () => {
    if (!currentId) return;
    const nextName = renameValue.trim();
    if (!nextName) return;

    await updateGroupMutation.mutateAsync({
      conversationId: currentId,
      payload: { name: nextName },
    });
    setRenameDialogOpen(false);
  };

  const handleSaveGroupInfo = async (payload: {
    name?: string;
    groupAvatar?: string;
    pinManagementEnabled?: boolean;
    joinApprovalEnabled?: boolean;
  }) => {
    if (!currentId) return;

    await updateGroupMutation.mutateAsync({
      conversationId: currentId,
      payload,
    });
  };

  const handleCopyGroupLink = async () => {
    if (!groupShareLink || typeof navigator === "undefined") return;

    try {
      await navigator.clipboard.writeText(groupShareLink);
      toast.success("Đã sao chép link nhóm");
    } catch {
      toast.error("Không thể sao chép link nhóm");
    }
  };

  const handleShareGroupLink = async () => {
    if (!groupShareLink || typeof navigator === "undefined") return;

    if (navigator.share) {
      try {
        await navigator.share({
          title: displayName,
          text: `Tham gia nhóm ${displayName}`,
          url: groupShareLink,
        });
        return;
      } catch {
        // Fall back to clipboard below.
      }
    }

    await handleCopyGroupLink();
  };

  const handleInviteByLink = async () => {
    await handleCopyGroupLink();
    setGroupShareOpen(false);
  };

  const handleSendGroupCard = async () => {
    if (!groupCardPayload || groupCardRecipientIds.length === 0) return;

    try {
      await Promise.all(
        groupCardRecipientIds.map(async (recipientId) => {
          const privateConversation =
            await getPrivateConversationAsync(recipientId);
          const privateConversationId = String(
            privateConversation?.id || privateConversation?._id || "",
          );

          if (!privateConversationId) {
            throw new Error("Không thể mở cuộc trò chuyện riêng");
          }

          await sendMessageAsync({
            conversationId: privateConversationId,
            content: `Đã chia sẻ danh thiếp nhóm ${displayName}`,
            type: "file",
            attachments: [createGroupCardAttachment(groupCardPayload)],
          });
        }),
      );

      toast.success("Đã gửi danh thiếp nhóm");
      setGroupCardRecipientIds([]);
      setGroupCardRecipientQuery("");
      setGroupShareOpen(false);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Không thể gửi danh thiếp nhóm",
      );
    }
  };

  return (
    <>
      <div className="h-[70px] md:h-[80px] border-b border-slate-200/60 bg-white/80 backdrop-blur-xl sticky top-0 z-30 shadow-sm px-3 md:px-6">
        <div className="flex items-center justify-between w-full max-w-[1240px] h-full mx-auto">
          <div
            onClick={handleOpenFriendProfile}
            className={`flex items-center min-w-0 gap-2 md:gap-3 ${
              canOpenFriendProfile ? "cursor-pointer" : "cursor-default"
            }`}
          >
            <button
              onClick={(event) => {
                event.stopPropagation();
                router.push("/messages");
              }}
              className="p-2 -ml-2 transition-colors rounded-full md:hidden hover:bg-slate-100"
            >
              <ChevronLeft className="w-6 h-6 text-slate-600" />
            </button>

            <div className="relative shrink-0">
              {shouldUseCompositeGroupAvatar ? (
                <GroupCompositeAvatar
                  members={groupAvatarMembers}
                  totalCount={groupMemberCount}
                  className="h-11 w-11 md:h-12 md:w-12"
                />
              ) : (
                <PresignedAvatar
                  avatarKey={headerAvatarKey}
                  displayName={displayName}
                  className="border-2 border-white shadow-lg h-11 w-11 md:h-12 md:w-12 ring-1 ring-slate-100"
                  fallbackClassName="font-bold text-white bg-gradient-to-br from-blue-400 to-blue-600"
                />
              )}
              {isOnline && (
                <span className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 border-2 border-white rounded-full shadow-sm" />
              )}
            </div>

            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-1.5 min-w-0">
                <h2 className="text-base font-bold leading-tight truncate text-slate-900 md:text-lg">
                  {displayName}
                </h2>
                {conversation?.type === "group" && isAdmin && (
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      openRenameDialog();
                    }}
                    className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-slate-100 hover:text-blue-600"
                    title="Đổi tên nhóm"
                    aria-label="Đổi tên nhóm"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
              <p className="text-[11px] md:text-[12px] text-slate-400 font-medium truncate">
                {conversation?.type === "group"
                  ? `Thành viên ${groupMemberCount}`
                  : statusText || (isOnline ? "Đang hoạt động" : "Vừa truy cập")}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              disabled={!canCall}
              onClick={() => {
                void handleStartCall("audio");
              }}
              className="p-2.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all duration-200 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
              title={
                canCall ? "Gọi audio" : "Không thể gọi ở cuộc trò chuyện này"
              }
            >
              <Phone className="w-5 h-5" />
            </button>
            <button
              disabled={!canCall}
              onClick={() => {
                void handleStartCall("video");
              }}
              className="p-2.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all duration-200 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
              title={
                canCall ? "Gọi video" : "Không thể gọi ở cuộc trò chuyện này"
              }
            >
              <Video className="w-5 h-5" />
            </button>
            {conversation?.type === "group" && (
              <button
                type="button"
                onClick={() => setInviteOpen(true)}
                className="p-2.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all duration-200 hover:scale-105"
                title="Thêm thành viên"
              >
                <UserPlus className="w-5 h-5" />
              </button>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="p-2.5 text-slate-400 hover:bg-slate-100 rounded-xl transition-all duration-200">
                  <MoreVertical className="w-5 h-5" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                sideOffset={8}
                className="w-64 rounded-xl border-slate-200/80 bg-white/95 backdrop-blur-md shadow-xl p-1.5"
              >
                <DropdownMenuLabel className="px-3 py-2 text-xs font-semibold tracking-wide uppercase text-slate-500">
                  Tùy chọn chat
                </DropdownMenuLabel>
                <DropdownMenuItem
                  className="h-10 rounded-lg px-3 text-[15px] font-medium text-slate-700"
                  onClick={() => {
                    setSheetTab("assets");
                    setSheetOpen(true);
                  }}
                >
                  <FileText className="text-slate-500" /> Xem ảnh/tệp/link đã
                  gửi
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="h-10 rounded-lg px-3 text-[15px] font-medium text-slate-700"
                  onClick={() => {
                    setSheetTab("search");
                    setSheetOpen(true);
                  }}
                >
                  <SearchIcon className="text-slate-500" /> Tìm kiếm tin nhắn
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="h-10 rounded-lg px-3 text-[15px] font-medium text-slate-700"
                  onClick={() => {
                    setSheetTab("pinned");
                    setSheetOpen(true);
                  }}
                >
                  <Pin className="text-slate-500" /> Xem tin ghim
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="h-10 rounded-lg px-3 text-[15px] font-medium text-red-600 focus:bg-red-50 focus:text-red-700"
                  onClick={() => setClearHistoryConfirmOpen(true)}
                >
                  <Trash2 className="w-4 h-4 text-red-500" /> Xóa lịch sử hội thoại
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="h-10 rounded-lg px-3 text-[15px] font-medium text-slate-700"
                  onClick={openBackgroundPicker}
                >
                  <Palette className="text-slate-500" /> Đổi background
                </DropdownMenuItem>
                {conversation?.type === "group" && (
                  <DropdownMenuItem
                    className="h-10 rounded-lg px-3 text-[15px] font-medium text-slate-700"
                    onClick={() => setInviteOpen(true)}
                  >
                    <UserPlus className="text-slate-500" /> Thêm thành viên vào
                    nhóm
                  </DropdownMenuItem>
                )}
                {conversation?.type === "group" && (
                  <DropdownMenuItem
                    className="h-10 rounded-lg px-3 text-[15px] font-medium text-slate-700"
                    onClick={() => setSummaryOpen(true)}
                  >
                    <Sparkles className="text-cyan-500" /> Tóm tắt unread
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />

                {/* Private chat options */}
                {conversation?.type === "private" && (
                  <>
                    <DropdownMenuItem
                      className="h-10 rounded-lg px-3 text-[15px] font-medium text-slate-700"
                      onClick={handleOpenFriendProfile}
                    >
                      <UserCircle2 className="text-slate-500" /> Xem trang cá
                      nhân
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="h-10 rounded-lg px-3 text-[15px] font-medium text-slate-700"
                      onClick={() => {
                        if (partnerId) {
                          setSelectedIds([partnerId]);
                        } else {
                          setSelectedIds([]);
                        }
                        setGroupOpen(true);
                      }}
                    >
                      <UserPlus className="text-slate-500" /> Tạo nhóm với người
                      này
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="h-10 rounded-lg px-3 text-[15px] font-medium text-slate-700"
                      onClick={async () => {
                        if (partnerId) {
                          if (isBlockedByMe) {
                            await unblockUserMutation.mutateAsync(partnerId);
                            return;
                          }

                          await blockUserMutation.mutateAsync(partnerId);
                          router.push("/contacts");
                        }
                      }}
                    >
                      <ShieldBan className={isBlockedByMe ? "text-emerald-500" : "text-red-500"} />
                      {isBlockedByMe ? "Mở chặn người này" : "Chặn người này"}
                    </DropdownMenuItem>
                  </>
                )}

                {/* Group chat options */}
                {conversation?.type === "group" && (
                  <>
                    {!isAdmin ? (
                      <DropdownMenuItem
                        className="h-10 rounded-lg px-3 text-[15px] font-medium text-red-600 focus:text-red-700"
                        onClick={() => {
                          setLeaveConfirmOpen(true);
                        }}
                      >
                        <LogOut className="text-red-500" /> Rời nhóm
                      </DropdownMenuItem>
                    ) : (
                      <DropdownMenuItem
                        className="h-10 rounded-lg px-3 text-[15px] font-medium text-slate-500"
                        onClick={() => {
                          toast.error(
                            "Bạn cần chuyển quyền admin trước khi rời nhóm",
                          );
                        }}
                      >
                        <LogOut className="text-slate-400" />
                        Chuyển quyền admin trước khi rời nhóm
                      </DropdownMenuItem>
                    )}

                    <DropdownMenuSeparator />

                    <DropdownMenuItem
                      className="h-10 rounded-lg px-3 text-[15px] font-medium text-slate-700"
                      onClick={() =>
                        openGroupDrawer(isAdmin ? "info" : "members")
                      }
                    >
                      <UserPlus className="text-slate-500" />
                      {isAdmin ? "Quản lý nhóm" : "Xem thành viên nhóm"}
                    </DropdownMenuItem>
                    {isAdmin && (
                      <DropdownMenuItem
                        className="h-10 rounded-lg px-3 text-[15px] font-medium text-red-600 focus:text-red-700"
                        onClick={() => setDissolveConfirmOpen(true)}
                      >
                        <LogOut className="text-red-500" /> Giải tán nhóm
                      </DropdownMenuItem>
                    )}
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      {latestPinnedItem?.message && (
        <div className="sticky top-[70px] md:top-[80px] z-20 border-b border-amber-200/70 bg-amber-50/90 backdrop-blur px-3 md:px-6 py-2">
          <div className="mx-auto flex w-full max-w-[1240px] items-center gap-2">
            <button
              type="button"
              onClick={handleFocusLatestPinnedMessage}
              className="flex-1 min-w-0 px-3 py-2 text-left transition border rounded-xl border-amber-200 bg-white/80 hover:bg-white"
            >
              <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-amber-700">
                <Pin className="h-3.5 w-3.5" />
                Tin nhan ghim
              </div>
              <div className="mt-0.5 truncate text-sm text-slate-700">
                {latestPinnedPreview}
              </div>
            </button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="shrink-0 border-amber-300 text-amber-700 hover:bg-amber-100"
              onClick={() => {
                setSheetTab("pinned");
                setSheetOpen(true);
              }}
            >
              Xem
            </Button>
          </div>
        </div>
      )}

      <MessagesSideSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        tab={sheetTab}
        conversationId={currentId}
        messages={messages}
        pinnedMessages={pinnedMessages}
        canManagePinned={
          conversation?.type !== "group" ||
          !conversation?.pinManagementEnabled ||
          isAdmin
        }
        searchQuery={searchQuery}
        onSearchQueryChange={setSearchQuery}
        title={
          sheetTab === "assets"
            ? "Kho ảnh/tệp/link đã gửi"
            : sheetTab === "search"
              ? "Tìm kiếm tin nhắn"
              : "Tin nhắn đã ghim"
        }
      />
      <UnreadSummaryDialog
        open={summaryOpen}
        onOpenChange={setSummaryOpen}
        conversationId={currentId}
        conversationName={displayName}
        backgroundTheme={selectedBackground}
      />
      <CreateGroupWithPartnerDialog
        open={groupOpen}
        onOpenChange={(o) => {
          setGroupOpen(o);
          if (!o) {
            setGroupName("");
            setSelectedIds(partnerId ? [partnerId] : []);
          }
        }}
        partnerId={partnerId}
        contacts={contacts}
        groupName={groupName}
        onGroupNameChange={setGroupName}
        selectedIds={selectedIds}
        setSelectedIds={setSelectedIds}
        creating={createGroupMutation.isPending}
        onCreate={() => {
          // Ensure partner included
          const base = partnerId
            ? [partnerId, ...selectedIds.filter((x) => x !== partnerId)]
            : selectedIds;
          if (!groupName || base.length < 2) return;
          createGroupMutation.mutate(
            { name: groupName, memberIds: base },
            {
              onSuccess: () => {
                setGroupOpen(false);
                setGroupName("");
                setSelectedIds(partnerId ? [partnerId] : []);
              },
            },
          );
        }}
      />
      <InviteMembersDialog
        open={inviteOpen}
        onOpenChange={setInviteOpen}
        contacts={inviteContacts}
        selectedIds={inviteSelectedIds}
        setSelectedIds={setInviteSelectedIds}
        onInvite={() => {
          if (inviteSelectedIds.length === 0 || !currentId) return;
          addMemberMutation.mutate(
            { conversationId: currentId, memberIds: inviteSelectedIds },
            {
              onSuccess: () => {
                setInviteOpen(false);
                setInviteSelectedIds([]);
              },
            },
          );
        }}
        inviting={addMemberMutation.isPending}
      />
      <GroupShareDialog
        open={groupShareOpen}
        onOpenChange={(open) => {
          setGroupShareOpen(open);
          if (!open) {
            setGroupCardRecipientIds([]);
            setGroupCardRecipientQuery("");
          }
        }}
        shareUrl={groupShareLink}
        groupCardPayload={groupCardPayload}
        contacts={shareContacts}
        selectedIds={groupCardRecipientIds}
        setSelectedIds={setGroupCardRecipientIds}
        recipientQuery={groupCardRecipientQuery}
        onRecipientQueryChange={setGroupCardRecipientQuery}
        onSendGroupCard={handleSendGroupCard}
        sendingGroupCard={isSendingGroupCard}
        onCopyLink={handleCopyGroupLink}
        onShareLink={handleShareGroupLink}
      />
      <GroupSettingsDrawer
        open={groupDrawerOpen}
        onOpenChange={setGroupDrawerOpen}
        activeTab={groupDrawerTab}
        onTabChange={setGroupDrawerTab}
        draftName={groupDraftName}
        onDraftNameChange={setGroupDraftName}
        draftAvatarKey={groupDraftAvatarKey}
        onDraftAvatarChange={setGroupDraftAvatarKey}
        draftPinManagementEnabled={groupDraftPinManagementEnabled}
        onDraftPinManagementEnabledChange={setGroupDraftPinManagementEnabled}
        draftJoinApprovalEnabled={groupDraftJoinApprovalEnabled}
        onDraftJoinApprovalEnabledChange={setGroupDraftJoinApprovalEnabled}
        onSaveGroupInfo={handleSaveGroupInfo}
        savingGroupInfo={updateGroupMutation.isPending}
        members={groupMembers}
        isAdmin={isAdmin}
        canInviteMembers={Boolean(conversation?.type === "group")}
        onInviteMembers={() => setInviteOpen(true)}
        onInviteByLink={handleInviteByLink}
        onOpenShareGroup={() => setGroupShareOpen(true)}
        pendingJoinRequests={pendingJoinRequests}
        approvingRequest={approveRequestMutation.isPending}
        onApproveJoinRequest={(notificationId) => {
          approveRequestMutation.mutate(notificationId);
        }}
        onTransferAdmin={(targetUserId) => {
          if (!currentId) return;
          transferAdminMutation.mutate({
            conversationId: currentId,
            targetUserId,
          });
        }}
        transferring={transferAdminMutation.isPending}
        onRemoveMember={(memberId) => {
          if (!currentId) return;
          removeMemberMutation.mutate({ conversationId: currentId, memberId });
        }}
        removing={removeMemberMutation.isPending}
        onClearHistory={() => setClearHistoryConfirmOpen(true)}
      />
      <Dialog open={renameDialogOpen} onOpenChange={setRenameDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Đổi tên nhóm</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <p className="text-sm text-slate-600">
              Nhập tên mới cho nhóm chat.
            </p>
            <Input
              value={renameValue}
              onChange={(event) => setRenameValue(event.target.value)}
              maxLength={80}
              placeholder="Tên nhóm"
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setRenameDialogOpen(false)}
              disabled={updateGroupMutation.isPending}
            >
              Hủy
            </Button>
            <Button
              type="button"
              onClick={() => {
                void handleRenameGroup();
              }}
              disabled={
                updateGroupMutation.isPending || renameValue.trim().length < 2
              }
            >
              {updateGroupMutation.isPending ? "Đang lưu..." : "Lưu"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={leaveConfirmOpen} onOpenChange={setLeaveConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rời nhóm</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-slate-600">
            Bạn có chắc chắn muốn rời nhóm này?
          </p>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setLeaveConfirmOpen(false)}
              disabled={leaveGroupMutation.isPending}
            >
              Hủy
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (isAdmin) {
                  toast.error("Bạn cần chuyển quyền admin trước khi rời nhóm");
                  setLeaveConfirmOpen(false);
                  return;
                }

                if (!currentId) return;
                leaveGroupMutation.mutate(currentId, {
                  onSuccess: () => {
                    setLeaveConfirmOpen(false);
                    router.push("/messages");
                  },
                });
              }}
              disabled={leaveGroupMutation.isPending}
            >
              {leaveGroupMutation.isPending ? "Đang rời..." : "Rời nhóm"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={dissolveConfirmOpen} onOpenChange={setDissolveConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Giải tán nhóm</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-slate-600">
            Bạn có chắc chắn muốn giải tán nhóm này? Tất cả tin nhắn sẽ bị xóa.
          </p>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDissolveConfirmOpen(false)}
              disabled={dissolveMutation.isPending}
            >
              Hủy
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (!currentId) return;
                dissolveMutation.mutate(currentId, {
                  onSuccess: () => {
                    setDissolveConfirmOpen(false);
                    router.push("/messages");
                  },
                });
              }}
              disabled={dissolveMutation.isPending}
            >
              {dissolveMutation.isPending ? "Đang giải tán..." : "Giải tán"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={backgroundOpen} onOpenChange={setBackgroundOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Đổi background đoạn chat</DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-3">
            {CHAT_BACKGROUND_OPTIONS.map((option) => {
              const isSelected = selectedBackground === option.key;

              return (
                <button
                  key={option.key}
                  type="button"
                  onClick={() => handleSelectBackground(option.key)}
                  className={`relative h-20 rounded-xl border transition-all ${
                    isSelected
                      ? "border-blue-500 ring-2 ring-blue-200"
                      : "border-slate-200 hover:border-slate-300"
                  } ${option.previewClass}`}
                >
                  <span
                    className={`absolute inset-0 rounded-xl ${
                      option.key === "night" ? "bg-black/10" : ""
                    }`}
                  />
                  <span
                    className={`absolute left-2 bottom-2 text-xs font-semibold ${
                      option.key === "night" ? "text-white" : "text-slate-700"
                    }`}
                  >
                    {option.label}
                  </span>
                  {isSelected && (
                    <span className="absolute p-1 text-white bg-blue-600 rounded-full top-2 right-2">
                      <Check className="w-3 h-3" />
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={clearHistoryConfirmOpen}
        onOpenChange={setClearHistoryConfirmOpen}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <div className="flex items-center gap-3 mb-1">
              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-red-100 shrink-0">
                <Trash2 className="w-5 h-5 text-red-600" />
              </div>
              <DialogTitle className="text-slate-900">Xóa lịch sử hội thoại?</DialogTitle>
            </div>
          </DialogHeader>
          <p className="text-sm text-slate-500 leading-relaxed pl-[52px]">
            Tất cả tin nhắn sẽ <span className="font-medium text-slate-700">biến mất khỏi màn hình của bạn</span> ngay lập tức. Người khác trong cuộc trò chuyện vẫn giữ nguyên lịch sử của họ.
          </p>
          <DialogFooter className="gap-2 sm:gap-0 pt-2">
            <Button
              variant="outline"
              className="flex-1 sm:flex-none border-slate-200"
              onClick={() => setClearHistoryConfirmOpen(false)}
              disabled={clearConversationHistoryMutation.isPending}
            >
              Hủy bỏ
            </Button>
            <Button
              variant="destructive"
              className="flex-1 sm:flex-none gap-2"
              onClick={() => {
                if (!currentId) return;
                clearConversationHistoryMutation.mutate(
                  { conversationId: currentId },
                  {
                    onSuccess: () => {
                      setClearHistoryConfirmOpen(false);
                    },
                  },
                );
              }}
              disabled={clearConversationHistoryMutation.isPending}
            >
              {clearConversationHistoryMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Đang xóa...
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4" />
                  Xóa lịch sử
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// Side sheet content for assets/search
function MessagesSideSheet({
  open,
  onOpenChange,
  tab,
  conversationId,
  messages,
  pinnedMessages,
  canManagePinned,
  searchQuery,
  onSearchQueryChange,
  title,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  tab: "assets" | "search" | "pinned";
  conversationId?: string;
  messages: Message[];
  pinnedMessages: PinnedMessageItem[];
  canManagePinned: boolean;
  searchQuery: string;
  onSearchQueryChange: (v: string) => void;
  title: string;
}) {
  const [assetView, setAssetView] = useState<"images" | "files" | "links">(
    "images",
  );
  const { mutate: unpinMessage, isPending: isUnpinning } = useUnpinMessage();

  const getMessageId = useCallback((message: Message): string | undefined => {
    return message.id || message._id;
  }, []);

  const cacheKey = useMemo(
    () => (conversationId ? `chat-side-sheet-cache:${conversationId}` : null),
    [conversationId],
  );

  const { cachedFiles, cachedLinks } = useMemo(() => {
    if (!cacheKey || typeof window === "undefined") {
      return {
        cachedFiles: [] as CachedFileItem[],
        cachedLinks: [] as CachedLinkItem[],
      };
    }

    try {
      const raw = window.localStorage.getItem(cacheKey);
      if (!raw) {
        return {
          cachedFiles: [] as CachedFileItem[],
          cachedLinks: [] as CachedLinkItem[],
        };
      }

      const parsed = JSON.parse(raw) as SideSheetCache;
      return {
        cachedFiles: Array.isArray(parsed?.files) ? parsed.files : [],
        cachedLinks: Array.isArray(parsed?.links) ? parsed.links : [],
      };
    } catch {
      return {
        cachedFiles: [] as CachedFileItem[],
        cachedLinks: [] as CachedLinkItem[],
      };
    }
  }, [cacheKey]);

  const isDirectMediaUrl = useCallback((value?: string) => {
    if (!value) return false;
    return /^(https?:\/\/|data:|blob:|\/)\S+/i.test(value);
  }, []);

  const normalizeDateString = useCallback((value: unknown) => {
    if (!value) return new Date().toISOString();
    const date = new Date(value as string | number | Date);
    if (Number.isNaN(date.getTime())) return new Date().toISOString();
    return date.toISOString();
  }, []);

  const extractFiles = useCallback(
    (inputMessages: Message[]): CachedFileItem[] => {
      const collected: CachedFileItem[] = [];

      inputMessages.forEach((message, index) => {
        const messageId = String(message.id || message._id || `m-${index}`);
        const createdAt = normalizeDateString(message.createdAt);

        (message.attachments || []).forEach(
          (attachment: MessageAttachment, attachmentIndex: number) => {
            const source = attachment.key || attachment.url || "";
            if (
              attachment.fileType === FRIEND_CARD_ATTACHMENT_TYPE ||
              attachment.fileType === GROUP_CARD_ATTACHMENT_TYPE ||
              isShareCardSource(source)
            ) {
              return;
            }

            if (!source) return;

            collected.push({
              id: `${messageId}-${attachmentIndex}-${source}`,
              source,
              fileType: attachment.fileType,
              fileName: attachment.fileName,
              createdAt,
            });
          },
        );
      });

      return collected;
    },
    [normalizeDateString],
  );

  const extractLinks = useCallback(
    (inputMessages: Message[]): CachedLinkItem[] => {
      const collected: CachedLinkItem[] = [];

      inputMessages.forEach((message, index) => {
        const links = ((message.content || "").match(URL_REGEX) ||
          []) as string[];
        if (links.length === 0) return;

        const messageId = String(message.id || message._id || `m-${index}`);
        const createdAt = normalizeDateString(message.createdAt);

        links.forEach((link, linkIndex) => {
          collected.push({
            id: `${messageId}-${linkIndex}-${link}`,
            link,
            createdAt,
          });
        });
      });

      return collected;
    },
    [normalizeDateString],
  );

  const fileMsgs = useMemo(() => {
    const fromCurrentMessages = extractFiles(messages);
    const map = new Map<string, CachedFileItem>();

    cachedFiles.forEach((item) => {
      if (
        item?.fileType === FRIEND_CARD_ATTACHMENT_TYPE ||
        item?.fileType === GROUP_CARD_ATTACHMENT_TYPE ||
        isShareCardSource(item?.source)
      ) {
        return;
      }
      if (item?.id && item?.source) map.set(item.id, item);
    });
    fromCurrentMessages.forEach((item) => map.set(item.id, item));

    return Array.from(map.values()).sort(
      (left, right) =>
        new Date(right.createdAt).getTime() -
        new Date(left.createdAt).getTime(),
    );
  }, [messages, cachedFiles, extractFiles]);

  const linkMsgs = useMemo(() => {
    const fromCurrentMessages = extractLinks(messages);
    const map = new Map<string, CachedLinkItem>();

    cachedLinks.forEach((item) => {
      if (item?.id && item?.link) map.set(item.id, item);
    });
    fromCurrentMessages.forEach((item) => map.set(item.id, item));

    return Array.from(map.values()).sort(
      (left, right) =>
        new Date(right.createdAt).getTime() -
        new Date(left.createdAt).getTime(),
    );
  }, [messages, cachedLinks, extractLinks]);

  const isImageAsset = useCallback((item: CachedFileItem) => {
    const normalizedType = String(item.fileType || "").toLowerCase();
    const normalizedName = String(
      item.fileName || item.source || "",
    ).toLowerCase();
    return (
      normalizedType.startsWith("image/") ||
      [".png", ".jpg", ".jpeg", ".gif", ".webp", ".bmp", ".svg"].some((ext) =>
        normalizedName.endsWith(ext),
      )
    );
  }, []);

  const imageItems = useMemo(
    () => fileMsgs.filter((item) => isImageAsset(item)),
    [fileMsgs, isImageAsset],
  );

  const fileItems = useMemo(
    () => fileMsgs.filter((item) => !isImageAsset(item)),
    [fileMsgs, isImageAsset],
  );

  useEffect(() => {
    if (!cacheKey || typeof window === "undefined") return;

    const payload: SideSheetCache = {
      files: fileMsgs.slice(0, 500),
      links: linkMsgs.slice(0, 500),
    };

    window.localStorage.setItem(cacheKey, JSON.stringify(payload));
  }, [cacheKey, fileMsgs, linkMsgs]);

  const searchMsgs = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return [];
    return messages.filter((m) => (m.content || "").toLowerCase().includes(q));
  }, [messages, searchQuery]);

  const pinnedItems = useMemo(() => {
    return [...(pinnedMessages || [])].sort(
      (left, right) =>
        new Date(right?.pinnedAt || 0).getTime() -
        new Date(left?.pinnedAt || 0).getTime(),
    );
  }, [pinnedMessages]);

  const getPinnedPreview = useCallback((item: PinnedMessageItem) => {
    const content = String(item?.message?.content || "").trim();
    if (content) return content;

    const attachment = item?.message?.attachments?.[0];
    if (!attachment) return "Tin nhắn";

    const mime = String(attachment.fileType || "").toLowerCase();
    if (mime.startsWith("image/")) return "[Hình ảnh]";
    if (mime.startsWith("video/")) return "[Video]";
    if (mime.startsWith("audio/")) return "[Ghi âm]";
    return `[Tệp] ${attachment.fileName || "Đính kèm"}`;
  }, []);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="sm:max-w-md">
        <SheetHeader>
          <SheetTitle>{title}</SheetTitle>
        </SheetHeader>
        {tab === "search" && (
          <div className="mt-3">
            <Input
              placeholder="Nhập từ khóa..."
              value={searchQuery}
              onChange={(e) => onSearchQueryChange(e.target.value)}
            />
            <div className="mt-2 text-xs text-slate-500">
              {searchMsgs.length} kết quả
            </div>
          </div>
        )}
        {tab === "assets" && (
          <div className="flex items-center gap-2 mt-3">
            <button
              type="button"
              className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
                assetView === "images"
                  ? "bg-blue-600 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
              onClick={() => setAssetView("images")}
            >
              Ảnh ({imageItems.length})
            </button>
            <button
              type="button"
              className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
                assetView === "files"
                  ? "bg-blue-600 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
              onClick={() => setAssetView("files")}
            >
              Tệp ({fileItems.length})
            </button>
            <button
              type="button"
              className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
                assetView === "links"
                  ? "bg-blue-600 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
              onClick={() => setAssetView("links")}
            >
              Liên kết ({linkMsgs.length})
            </button>
          </div>
        )}
        <ScrollArea className="mt-4 h-[70vh]">
          {tab === "pinned" && (
            <div className="pr-3 space-y-2">
              {pinnedItems.length === 0 ? (
                <div className="text-sm text-slate-500">
                  Chưa có tin nhắn ghim
                </div>
              ) : (
                pinnedItems.map((item) => {
                  const message = item.message;
                  const messageId = String(
                    item.messageId || message?.id || message?._id || "",
                  );

                  return (
                    <div
                      key={`${messageId}-${item.pinnedAt || ""}`}
                      className="p-2 border rounded-md"
                    >
                      <button
                        type="button"
                        className="w-full text-left"
                        onClick={() => {
                          if (
                            !messageId ||
                            !conversationId ||
                            typeof window === "undefined"
                          ) {
                            return;
                          }

                          window.dispatchEvent(
                            new CustomEvent("chat:focus-message", {
                              detail: {
                                conversationId,
                                messageId,
                              },
                            }),
                          );

                          onOpenChange(false);
                        }}
                      >
                        <div className="text-sm font-medium text-slate-800 line-clamp-2">
                          {getPinnedPreview(item)}
                        </div>
                        <div className="mt-1 text-xs text-slate-500">
                          Ghim lúc{" "}
                          {new Date(
                            item.pinnedAt || Date.now(),
                          ).toLocaleString()}
                        </div>
                      </button>
                      {canManagePinned && (
                        <div className="flex justify-end mt-2">
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            disabled={
                              isUnpinning || !conversationId || !messageId
                            }
                            onClick={() => {
                              if (!conversationId || !messageId) return;
                              unpinMessage({ conversationId, messageId });
                            }}
                          >
                            Xóa ghim
                          </Button>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          )}
          {tab === "assets" && (
            <div className="pr-3 space-y-2">
              {assetView === "images" &&
                (imageItems.length === 0 ? (
                  <div className="text-sm text-slate-500">Chưa có ảnh nào</div>
                ) : (
                  imageItems.map((item) => (
                    <FilePreview
                      key={item.id}
                      source={item.source}
                      fileName={item.fileName}
                      fileType={item.fileType}
                      isDirectMediaUrl={isDirectMediaUrl}
                    />
                  ))
                ))}

              {assetView === "files" &&
                (fileItems.length === 0 ? (
                  <div className="text-sm text-slate-500">Chưa có tệp nào</div>
                ) : (
                  fileItems.map((item) => (
                    <FilePreview
                      key={item.id}
                      source={item.source}
                      fileName={item.fileName}
                      fileType={item.fileType}
                      isDirectMediaUrl={isDirectMediaUrl}
                    />
                  ))
                ))}

              {assetView === "links" &&
                (linkMsgs.length === 0 ? (
                  <div className="text-sm text-slate-500">Chưa có liên kết</div>
                ) : (
                  linkMsgs.map((item) => (
                    <div key={item.id} className="p-2 border rounded-md">
                      <a
                        href={item.link}
                        target="_blank"
                        rel="noreferrer"
                        className="text-sm text-blue-600 break-all"
                      >
                        {item.link}
                      </a>
                      <div className="mt-1 text-xs text-slate-500">
                        {new Date(item.createdAt).toLocaleString()}
                      </div>
                    </div>
                  ))
                ))}
            </div>
          )}
          {tab === "search" && (
            <div className="pr-3 space-y-2">
              {searchMsgs.length === 0 ? (
                <div className="text-sm text-slate-500">Không có kết quả</div>
              ) : (
                searchMsgs.map((m, idx) => (
                  <button
                    key={m.id || idx}
                    type="button"
                    className="w-full p-2 text-left transition-colors border rounded-md hover:bg-slate-50"
                    onClick={() => {
                      const messageId = getMessageId(m);
                      if (
                        !messageId ||
                        !conversationId ||
                        typeof window === "undefined"
                      ) {
                        return;
                      }

                      window.dispatchEvent(
                        new CustomEvent("chat:focus-message", {
                          detail: {
                            conversationId,
                            messageId,
                          },
                        }),
                      );

                      onOpenChange(false);
                    }}
                  >
                    <div className="text-sm whitespace-pre-wrap text-slate-800">
                      {m.content}
                    </div>
                    <div className="mt-1 text-xs text-slate-500">
                      {new Date(m.createdAt).toLocaleString()}
                    </div>
                  </button>
                ))
              )}
            </div>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}

function FilePreview({
  source,
  fileName,
  fileType,
  isDirectMediaUrl,
}: {
  source: string;
  fileName?: string;
  fileType?: string;
  isDirectMediaUrl: (value?: string) => boolean;
}) {
  const needsPresigned = !isDirectMediaUrl(source);
  const { data } = usePresignedUrl(source, needsPresigned);

  const resolvedSrc = needsPresigned ? data?.viewUrl : source;
  const normalizedType = String(fileType || "").toLowerCase();
  const normalizedName = String(fileName || source).toLowerCase();
  const isImage =
    normalizedType.startsWith("image/") ||
    [".png", ".jpg", ".jpeg", ".gif", ".webp", ".bmp", ".svg"].some((ext) =>
      normalizedName.endsWith(ext),
    );
  const isAudio =
    normalizedType.startsWith("audio/") ||
    [".mp3", ".wav", ".ogg", ".m4a", ".aac", ".webm"].some((ext) =>
      normalizedName.endsWith(ext),
    );
  const isVideo =
    normalizedType.startsWith("video/") ||
    [".mp4", ".mov", ".avi", ".mkv", ".webm", ".m4v"].some((ext) =>
      normalizedName.endsWith(ext),
    );

  if (!resolvedSrc) {
    return (
      <div className="flex items-center justify-center w-full h-24 text-xs border rounded-2xl border-slate-200 bg-slate-50 text-slate-400">
        Đang tải...
      </div>
    );
  }

  if (isImage) {
    return (
      <a href={resolvedSrc} target="_blank" rel="noreferrer" className="block">
        <img
          src={resolvedSrc}
          alt={fileName || "image"}
          className="object-cover w-full h-24 border rounded-2xl border-slate-200"
          loading="lazy"
        />
      </a>
    );
  }

  if (isAudio) {
    return (
      <a
        href={resolvedSrc}
        target="_blank"
        rel="noreferrer"
        className="flex items-center gap-3 px-3 py-3 bg-white border shadow-sm rounded-2xl border-slate-200"
      >
        <div className="flex items-center justify-center w-10 h-10 rounded-full bg-emerald-100 text-emerald-700">
          <Sparkles className="w-4 h-4" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium truncate text-slate-900">
            {fileName || "Tệp âm thanh"}
          </div>
          <div className="text-xs text-slate-500">Audio</div>
        </div>
      </a>
    );
  }

  if (isVideo) {
    return (
      <a href={resolvedSrc} target="_blank" rel="noreferrer" className="block">
        <video
          controls
          src={resolvedSrc}
          className="w-full h-32 bg-black border rounded-2xl border-slate-200"
        />
      </a>
    );
  }

  return (
    <a
      href={resolvedSrc}
      target="_blank"
      rel="noreferrer"
      className="flex items-center gap-3 px-3 py-3 bg-white border shadow-sm rounded-2xl border-slate-200"
    >
      <div className="flex items-center justify-center w-10 h-10 text-blue-700 bg-blue-100 rounded-full">
        <FileText className="w-4 h-4" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium truncate text-slate-900">
          {fileName || "Tệp đính kèm"}
        </div>
        <div className="text-xs text-slate-500">{fileType || "File"}</div>
      </div>
    </a>
  );
}

// Dialog to create a group with current partner preselected
function CreateGroupWithPartnerDialog({
  open,
  onOpenChange,
  partnerId,
  contacts,
  groupName,
  onGroupNameChange,
  selectedIds,
  setSelectedIds,
  onCreate,
  creating,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  partnerId?: string;
  contacts: User[];
  groupName: string;
  onGroupNameChange: (v: string) => void;
  selectedIds: string[];
  setSelectedIds: Dispatch<SetStateAction<string[]>>;
  onCreate: () => void;
  creating: boolean;
}) {
  const disableCreate = !groupName || selectedIds.length < 2 || creating;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Tạo nhóm với người này</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-slate-700">
              Tên nhóm
            </label>
            <Input
              className="mt-2"
              placeholder="Nhập tên nhóm"
              value={groupName}
              onChange={(e) => onGroupNameChange(e.target.value)}
            />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700">
              Thành viên (đã chọn 1)
            </label>
            <div className="mt-2 overflow-auto border rounded-md max-h-56 border-slate-200/80">
              {partnerId && (
                <label className="flex items-center gap-3 px-3 py-2 bg-slate-50">
                  <input type="checkbox" className="w-4 h-4" checked disabled />
                  <div className="text-sm text-slate-800">Đối tác hiện tại</div>
                </label>
              )}
              {contacts.map((c) => {
                const id = c._id || c.id;
                const checked = selectedIds.includes(id);
                return (
                  <label
                    key={id}
                    className="flex items-center gap-3 px-3 py-2 hover:bg-slate-50"
                  >
                    <input
                      type="checkbox"
                      className="w-4 h-4"
                      checked={checked}
                      onChange={(e) => {
                        setSelectedIds((prev: string[]) =>
                          e.target.checked
                            ? [...prev, id]
                            : prev.filter((x) => x !== id),
                        );
                      }}
                    />
                    <div className="flex items-center gap-3">
                      {c.avatar ? (
                        <img
                          src={c.avatar}
                          alt={c.displayName}
                          className="object-cover w-6 h-6 rounded-full"
                        />
                      ) : (
                        <div className="w-6 h-6 rounded-full bg-slate-200" />
                      )}
                      <div className="text-sm text-slate-800">
                        {c.displayName}
                      </div>
                    </div>
                  </label>
                );
              })}
            </div>
            <div className="mt-2 text-xs text-slate-500">
              Chọn thêm ít nhất 1 người
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={creating}
          >
            Hủy
          </Button>
          <Button onClick={onCreate} disabled={disableCreate}>
            {creating ? "Đang tạo..." : "Tạo nhóm"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Dialog để mời bạn bè vào nhóm
function InviteMembersDialog({
  open,
  onOpenChange,
  contacts,
  selectedIds,
  setSelectedIds,
  onInvite,
  inviting,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  contacts: User[];
  selectedIds: string[];
  setSelectedIds: Dispatch<SetStateAction<string[]>>;
  onInvite: () => void;
  inviting: boolean;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Mời bạn bè vào nhóm</DialogTitle>
        </DialogHeader>
        <div>
          <label className="text-sm font-medium text-slate-700">
            Chọn bạn bè
          </label>
          <div className="mt-2 overflow-auto border rounded-md max-h-56 border-slate-200/80">
            {contacts.length === 0 ? (
              <div className="p-3 text-sm text-slate-500">Chưa có danh bạ</div>
            ) : (
              contacts.map((c) => {
                const id = c._id || c.id;
                const checked = selectedIds.includes(id);
                return (
                  <label
                    key={id}
                    className="flex items-center gap-3 px-3 py-2 hover:bg-slate-50"
                  >
                    <input
                      type="checkbox"
                      className="w-4 h-4"
                      checked={checked}
                      onChange={(e) => {
                        setSelectedIds((prev: string[]) =>
                          e.target.checked
                            ? [...prev, id]
                            : prev.filter((x) => x !== id),
                        );
                      }}
                    />
                    <div className="flex items-center gap-3">
                      {c.avatar ? (
                        <img
                          src={c.avatar}
                          alt={c.displayName}
                          className="object-cover w-6 h-6 rounded-full"
                        />
                      ) : (
                        <div className="w-6 h-6 rounded-full bg-slate-200" />
                      )}
                      <div className="text-sm text-slate-800">
                        {c.displayName}
                      </div>
                    </div>
                  </label>
                );
              })
            )}
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={inviting}
          >
            Hủy
          </Button>
          <Button
            onClick={onInvite}
            disabled={selectedIds.length === 0 || inviting}
          >
            {inviting ? "Đang mời..." : "Mời"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function GroupShareDialog({
  open,
  onOpenChange,
  shareUrl,
  groupCardPayload,
  contacts,
  selectedIds,
  setSelectedIds,
  recipientQuery,
  onRecipientQueryChange,
  onSendGroupCard,
  sendingGroupCard,
  onCopyLink,
  onShareLink,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  shareUrl: string;
  groupCardPayload: GroupCardPayload | null;
  contacts: User[];
  selectedIds: string[];
  setSelectedIds: Dispatch<SetStateAction<string[]>>;
  recipientQuery: string;
  onRecipientQueryChange: (value: string) => void;
  onSendGroupCard: () => void;
  sendingGroupCard: boolean;
  onCopyLink: () => void;
  onShareLink: () => void;
}) {
  const filteredContacts = useMemo(() => {
    const query = recipientQuery.trim().toLowerCase();
    if (!query) return contacts;

    return contacts.filter((contact) => {
      const displayName = contact.displayName.toLowerCase();
      const email = (contact.email || "").toLowerCase();
      return displayName.includes(query) || email.includes(query);
    });
  }, [contacts, recipientQuery]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Chia sẻ nhóm</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 md:grid-cols-[220px_minmax(0,1fr)]">
          <div className="p-4 border rounded-3xl border-slate-200 bg-slate-50">
            <div className="flex items-center justify-center p-4 bg-white border rounded-2xl border-slate-200">
              {shareUrl ? (
                <QRCodeCanvas value={shareUrl} size={168} includeMargin />
              ) : (
                <div className="flex h-[168px] items-center justify-center text-sm text-slate-400">
                  Thiếu link nhóm
                </div>
              )}
            </div>

            <div className="mt-3 space-y-3">
              <Button
                type="button"
                className="w-full"
                onClick={onShareLink}
                disabled={!shareUrl}
              >
                <Share2 className="w-4 h-4 mr-2" />
                Chia sẻ link
              </Button>
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={onCopyLink}
                disabled={!shareUrl}
              >
                <Copy className="w-4 h-4 mr-2" />
                Sao chép link
              </Button>
            </div>

            {groupCardPayload && (
              <div className="p-3 mt-4 bg-white border shadow-sm rounded-2xl border-slate-200">
                <div className="flex items-center gap-3">
                  <PresignedAvatar
                    avatarKey={groupCardPayload.avatar}
                    displayName={groupCardPayload.displayName}
                    className="h-11 w-11"
                    fallbackClassName="bg-gradient-to-br from-blue-500 to-cyan-500 text-white"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold truncate text-slate-900">
                      {groupCardPayload.displayName}
                    </div>
                    <div className="text-xs text-slate-500">
                      {groupCardPayload.memberCount || 0} thành viên
                    </div>
                  </div>
                </div>
                <div className="px-3 py-2 mt-3 text-xs rounded-xl bg-slate-50 text-slate-500">
                  Danh thiếp nhóm có thể gửi cho người khác để mở nhanh cuộc trò
                  chuyện.
                </div>
              </div>
            )}
          </div>

          <div className="space-y-3">
            <div>
              <div className="text-sm font-medium text-slate-700">
                Gửi danh thiếp nhóm
              </div>
              <div className="mt-2 text-xs text-slate-500">
                Chọn 1 hoặc nhiều liên hệ để gửi card nhóm vào cuộc trò chuyện
                riêng.
              </div>
            </div>

            <Input
              value={recipientQuery}
              onChange={(event) => onRecipientQueryChange(event.target.value)}
              placeholder="Tìm liên hệ..."
              className="bg-white h-11 rounded-2xl border-slate-200"
            />

            <ScrollArea className="h-[280px] rounded-2xl border border-slate-200 bg-white">
              <div className="p-2 space-y-1">
                {filteredContacts.length === 0 ? (
                  <div className="px-3 py-8 text-sm text-center text-slate-500">
                    Không có liên hệ phù hợp
                  </div>
                ) : (
                  filteredContacts.map((contact) => {
                    const id = contact._id || contact.id;
                    if (!id) return null;
                    const checked = selectedIds.includes(id);

                    return (
                      <label
                        key={id}
                        className="flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-slate-50"
                      >
                        <input
                          type="checkbox"
                          className="w-4 h-4"
                          checked={checked}
                          onChange={(event) => {
                            setSelectedIds((prev) =>
                              event.target.checked
                                ? [...prev, id]
                                : prev.filter((item) => item !== id),
                            );
                          }}
                        />
                        {contact.avatar ? (
                          <img
                            src={contact.avatar}
                            alt={contact.displayName}
                            className="object-cover rounded-full h-9 w-9"
                          />
                        ) : (
                          <div className="rounded-full h-9 w-9 bg-slate-200" />
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium truncate text-slate-900">
                            {contact.displayName}
                          </div>
                          <div className="text-xs truncate text-slate-500">
                            {contact.email || "Liên hệ"}
                          </div>
                        </div>
                      </label>
                    );
                  })
                )}
              </div>
            </ScrollArea>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={sendingGroupCard}
              >
                Hủy
              </Button>
              <Button
                onClick={onSendGroupCard}
                disabled={
                  selectedIds.length === 0 ||
                  sendingGroupCard ||
                  !groupCardPayload
                }
              >
                {sendingGroupCard ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Đang gửi...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    Gửi danh thiếp
                  </>
                )}
              </Button>
            </DialogFooter>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Drawer để chỉnh thông tin và quản lý thành viên nhóm
function GroupSettingsDrawer({
  open,
  onOpenChange,
  activeTab,
  onTabChange,
  draftName,
  onDraftNameChange,
  draftAvatarKey,
  onDraftAvatarChange,
  draftPinManagementEnabled,
  onDraftPinManagementEnabledChange,
  draftJoinApprovalEnabled,
  onDraftJoinApprovalEnabledChange,
  onSaveGroupInfo,
  savingGroupInfo,
  members,
  isAdmin,
  canInviteMembers,
  onInviteMembers,
  onInviteByLink,
  onOpenShareGroup,
  pendingJoinRequests,
  approvingRequest,
  onApproveJoinRequest,
  onTransferAdmin,
  transferring,
  onRemoveMember,
  removing,
  onClearHistory,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  activeTab: "info" | "members";
  onTabChange: (tab: "info" | "members") => void;
  draftName: string;
  onDraftNameChange: (value: string) => void;
  draftAvatarKey: string;
  onDraftAvatarChange: (value: string) => void;
  draftPinManagementEnabled: boolean;
  onDraftPinManagementEnabledChange: (value: boolean) => void;
  draftJoinApprovalEnabled: boolean;
  onDraftJoinApprovalEnabledChange: (value: boolean) => void;
  onSaveGroupInfo: (payload: {
    name?: string;
    groupAvatar?: string;
    pinManagementEnabled?: boolean;
    joinApprovalEnabled?: boolean;
  }) => Promise<void> | void;
  savingGroupInfo: boolean;
  members: GroupMemberView[];
  isAdmin: boolean;
  canInviteMembers: boolean;
  onInviteMembers: () => void;
  onInviteByLink: () => void;
  onOpenShareGroup: () => void;
  pendingJoinRequests: GroupJoinRequestView[];
  approvingRequest: boolean;
  onApproveJoinRequest: (notificationId: string) => void;
  onTransferAdmin: (memberId: string) => void;
  transferring: boolean;
  onRemoveMember: (memberId: string) => void;
  removing: boolean;
  onClearHistory?: () => void;
}) {
  const [confirmRemoveId, setConfirmRemoveId] = useState<string | null>(null);
  const [confirmTransferId, setConfirmTransferId] = useState<string | null>(
    null,
  );
  const [memberQuery, setMemberQuery] = useState("");
  const [avatarUploading, setAvatarUploading] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!open) return;
    setConfirmRemoveId(null);
    setConfirmTransferId(null);
    setMemberQuery("");
  }, [open]);

  const hasDraftChanges = draftName.trim().length > 0;
  const filteredMembers = useMemo(() => {
    const query = memberQuery.trim().toLowerCase();
    if (!query) return members;

    return members.filter((member) => {
      return member.displayName.toLowerCase().includes(query);
    });
  }, [memberQuery, members]);
  const removingMember = useMemo(
    () => filteredMembers.find((member) => member.userId === confirmRemoveId),
    [filteredMembers, confirmRemoveId],
  );

  const pendingJoinRequestCount = pendingJoinRequests.length;

  const handlePickAvatar = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    if (!isAdmin) {
      toast.error("Chỉ admin mới có thể đổi avatar nhóm");
      return;
    }

    if (!file.type.startsWith("image/")) {
      toast.error("Avatar nhóm phải là ảnh");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Ảnh avatar không được vượt quá 5MB");
      return;
    }

    try {
      setAvatarUploading(true);
      const presign = await chatService.createChatUploadPresignPut({
        fileName: file.name,
        contentType: file.type || "image/jpeg",
        fileSize: file.size,
      });

      await chatService.uploadToPresignedUrl(presign.uploadUrl, file);
      onDraftAvatarChange(presign.key);
      await onSaveGroupInfo({ groupAvatar: presign.key });
    } catch (error: unknown) {
      const message =
        typeof error === "object" &&
        error !== null &&
        "response" in error &&
        typeof (error as { response?: { data?: { message?: string } } })
          .response?.data?.message === "string"
          ? (error as { response?: { data?: { message?: string } } }).response
              ?.data?.message
          : "Không thể cập nhật avatar nhóm";
      toast.error(message);
    } finally {
      setAvatarUploading(false);
    }
  };

  const handleSaveInfo = async () => {
    const trimmedName = draftName.trim();
    if (!trimmedName) {
      toast.error("Tên nhóm không được để trống");
      return;
    }

    await onSaveGroupInfo({
      name: trimmedName,
      groupAvatar: draftAvatarKey || undefined,
      pinManagementEnabled: draftPinManagementEnabled,
      joinApprovalEnabled: draftJoinApprovalEnabled,
    });
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full p-0 overflow-hidden sm:max-w-xl"
      >
        <div className="flex flex-col h-full">
          <SheetHeader className="px-5 py-4 text-left border-b border-slate-200/80">
            <SheetTitle className="text-xl">Thông tin nhóm</SheetTitle>
            <SheetDescription>
              Chỉnh tên, avatar và quản lý thành viên theo kiểu drawer.
            </SheetDescription>
          </SheetHeader>

          <div className="px-5 py-4 border-b border-slate-200/80">
            <div className="flex items-center gap-4">
              <div className="relative">
                <PresignedAvatar
                  avatarKey={draftAvatarKey}
                  displayName={draftName || "Nhóm"}
                  className="w-16 h-16 border shadow-sm border-slate-200"
                  fallbackClassName="bg-gradient-to-br from-blue-500 to-cyan-500 text-white font-semibold"
                />
                {avatarUploading && (
                  <span className="absolute inset-0 flex items-center justify-center text-white rounded-full bg-black/40">
                    <Loader2 className="w-4 h-4 animate-spin" />
                  </span>
                )}
              </div>

              <div className="flex-1 min-w-0 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <div className="text-lg font-semibold truncate text-slate-900">
                    {draftName || "Nhóm"}
                  </div>
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-600">
                    {isAdmin ? "Admin" : "Thành viên"}
                  </span>
                </div>
                <div className="text-sm text-slate-500">
                  {members.length} thành viên trong nhóm
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 px-5 py-3 border-b border-slate-200/80">
            <button
              type="button"
              onClick={() => onTabChange("info")}
              className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                activeTab === "info"
                  ? "bg-blue-600 text-white shadow-sm"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              Thông tin
            </button>
            <button
              type="button"
              onClick={() => onTabChange("members")}
              className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                activeTab === "members"
                  ? "bg-blue-600 text-white shadow-sm"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              <span className="inline-flex items-center gap-2">
                Thành viên
                {pendingJoinRequestCount > 0 && (
                  <span className="rounded-full bg-rose-500 px-2 py-0.5 text-[11px] font-semibold text-white">
                    {pendingJoinRequestCount}
                  </span>
                )}
              </span>
            </button>
          </div>

          <ScrollArea className="flex-1">
            <div className="px-5 py-4 space-y-5">
              {activeTab === "info" ? (
                <div className="space-y-5">
                  <div className="p-4 border rounded-3xl border-slate-200/80 bg-slate-50">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="text-sm font-semibold text-slate-900">
                          Ảnh đại diện nhóm
                        </div>
                        <div className="text-xs text-slate-500">
                          Ảnh mới sẽ được lưu và cập nhật ngay sau khi upload.
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => avatarInputRef.current?.click()}
                        disabled={!isAdmin || avatarUploading}
                      >
                        <Upload className="w-4 h-4 mr-2" />
                        Đổi ảnh
                      </Button>
                    </div>
                    <input
                      ref={avatarInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handlePickAvatar}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">
                      Tên nhóm
                    </label>
                    <Input
                      value={draftName}
                      onChange={(event) =>
                        onDraftNameChange(event.target.value)
                      }
                      placeholder="Nhập tên nhóm"
                      disabled={!isAdmin}
                      className="bg-white h-11 rounded-2xl border-slate-200"
                    />
                  </div>

                  <div className="p-4 border rounded-3xl border-slate-200/80 bg-slate-50">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="text-sm font-semibold text-slate-900">
                          Quản lý ghim
                        </div>
                        <div className="text-xs text-slate-500">
                          Bật để chỉ admin có thể ghim hoặc bỏ ghim tin nhắn.
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant={
                          draftPinManagementEnabled ? "default" : "outline"
                        }
                        size="sm"
                        disabled={!isAdmin || savingGroupInfo}
                        onClick={() =>
                          onDraftPinManagementEnabledChange(
                            !draftPinManagementEnabled,
                          )
                        }
                      >
                        {draftPinManagementEnabled ? "Bật" : "Tắt"}
                      </Button>
                    </div>
                  </div>

                  <div className="p-4 border rounded-3xl border-slate-200/80 bg-slate-50">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="text-sm font-semibold text-slate-900">
                          Duyệt thành viên vào nhóm
                        </div>
                        <div className="text-xs text-slate-500">
                          Bật để thành viên mới cần admin duyệt trước khi vào
                          nhóm.
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant={
                          draftJoinApprovalEnabled ? "default" : "outline"
                        }
                        size="sm"
                        disabled={!isAdmin || savingGroupInfo}
                        onClick={() =>
                          onDraftJoinApprovalEnabledChange(
                            !draftJoinApprovalEnabled,
                          )
                        }
                      >
                        {draftJoinApprovalEnabled ? "Bật" : "Tắt"}
                      </Button>
                    </div>
                  </div>

                  {isAdmin && pendingJoinRequestCount > 0 && (
                    <div className="p-4 border rounded-3xl border-amber-200 bg-amber-50">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <div className="text-sm font-semibold text-amber-900">
                            Có {pendingJoinRequestCount} yêu cầu chờ duyệt
                          </div>
                          <div className="text-xs text-amber-700">
                            Chạm vào để mở danh sách duyệt ngay.
                          </div>
                        </div>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="border-amber-300 text-amber-800 hover:bg-amber-100"
                          onClick={() => onTabChange("members")}
                        >
                          Xem duyệt
                        </Button>
                      </div>
                    </div>
                  )}

                  <div className="space-y-3 pt-2">
                    <div className="text-xs font-semibold text-slate-500 tracking-wider uppercase px-1">
                      Dữ liệu & Lưu trữ
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full justify-start gap-3 rounded-2xl border-red-100 bg-red-50/50 text-red-600 hover:bg-red-50 hover:text-red-700 hover:border-red-200 transition-all h-12"
                      onClick={onClearHistory}
                    >
                      <Trash2 className="w-4 h-4 text-red-500" />
                      Xóa lịch sử hội thoại
                    </Button>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      onClick={handleSaveInfo}
                      disabled={!isAdmin || savingGroupInfo || !hasDraftChanges}
                    >
                      {savingGroupInfo ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Đang lưu...
                        </>
                      ) : (
                        <>
                          <Save className="w-4 h-4 mr-2" />
                          Lưu thay đổi
                        </>
                      )}
                    </Button>
                    {!isAdmin && (
                      <span className="text-xs text-slate-500">
                        Chỉ admin mới có thể chỉnh sửa.
                      </span>
                    )}
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {isAdmin && (
                    <div className="p-4 space-y-3 border border-blue-200 rounded-3xl bg-blue-50">
                      <div className="text-sm font-semibold text-blue-900">
                        Duyệt thành viên vào nhóm
                      </div>
                      {pendingJoinRequests.length === 0 ? (
                        <div className="text-xs text-blue-700">
                          Hiện chưa có yêu cầu chờ duyệt.
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {pendingJoinRequests.map((request) => (
                            <div
                              key={request.notificationId}
                              className="px-3 py-2 bg-white border rounded-2xl border-blue-200/70"
                            >
                              <div className="flex items-center justify-between gap-3">
                                <div className="min-w-0">
                                  <div className="text-sm font-medium truncate text-slate-900">
                                    {request.requesterName}
                                  </div>
                                  <div className="text-xs text-slate-500">
                                    {request.requestType === "join_group"
                                      ? "Xin tham gia nhóm"
                                      : `Yêu cầu thêm ${request.requestedCount} thành viên`}
                                  </div>
                                </div>
                                <Button
                                  type="button"
                                  size="sm"
                                  onClick={() =>
                                    onApproveJoinRequest(request.notificationId)
                                  }
                                  disabled={approvingRequest}
                                >
                                  {approvingRequest ? "Đang duyệt..." : "Duyệt"}
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  <div className="p-4 space-y-3 border rounded-3xl border-slate-200/80 bg-slate-50">
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={onInviteByLink}
                        className="justify-center"
                      >
                        <Copy className="w-4 h-4 mr-2" />
                        Mời bằng link
                      </Button>
                      {canInviteMembers && (
                        <Button
                          type="button"
                          size="sm"
                          onClick={onInviteMembers}
                          className="justify-center"
                        >
                          <UserPlus className="w-4 h-4 mr-2" />
                          Mời bạn bè
                        </Button>
                      )}
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={onOpenShareGroup}
                        className="justify-center"
                      >
                        <Share2 className="w-4 h-4 mr-2" />
                        Chia sẻ QR
                      </Button>
                    </div>
                    <Input
                      value={memberQuery}
                      onChange={(event) => setMemberQuery(event.target.value)}
                      placeholder="Tìm thành viên..."
                      className="h-10 bg-white rounded-2xl border-slate-200"
                    />
                  </div>

                  {filteredMembers.length === 0 ? (
                    <div className="px-4 py-5 text-sm border border-dashed rounded-2xl border-slate-200 bg-slate-50 text-slate-500">
                      Không có thành viên khác
                    </div>
                  ) : (
                    filteredMembers.map((member) => (
                      <div key={member.userId}>
                        <GroupMemberCard
                          member={member}
                          isAdmin={isAdmin}
                          onTransferAdmin={(memberId) =>
                            setConfirmTransferId(memberId)
                          }
                          onRemoveMember={(memberId) =>
                            setConfirmRemoveId(memberId)
                          }
                          transferring={transferring}
                          removing={removing}
                        />
                      </div>
                    ))
                  )}

                  {confirmTransferId && (
                    <div className="p-4 border border-blue-200 rounded-2xl bg-blue-50">
                      <p className="mb-3 text-sm text-blue-800">
                        Chuyển quyền admin cho thành viên này?
                      </p>
                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setConfirmTransferId(null)}
                          disabled={transferring}
                        >
                          Hủy
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => {
                            onTransferAdmin(confirmTransferId);
                            setConfirmTransferId(null);
                          }}
                          disabled={transferring}
                        >
                          {transferring ? "Đang chuyển..." : "Xác nhận"}
                        </Button>
                      </div>
                    </div>
                  )}

                  {confirmRemoveId && (
                    <Dialog
                      open={Boolean(confirmRemoveId)}
                      onOpenChange={(nextOpen) => {
                        if (!nextOpen) {
                          setConfirmRemoveId(null);
                        }
                      }}
                    >
                      <DialogContent className="sm:max-w-sm">
                        <DialogHeader>
                          <DialogTitle>Xóa thành viên khỏi nhóm?</DialogTitle>
                        </DialogHeader>
                        <p className="text-sm text-slate-600">
                          {removingMember
                            ? `Bạn có chắc muốn xóa ${removingMember.displayName} khỏi nhóm không?`
                            : "Bạn có chắc muốn xóa thành viên này khỏi nhóm không?"}
                        </p>
                        <DialogFooter>
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => setConfirmRemoveId(null)}
                            disabled={removing}
                          >
                            Hủy
                          </Button>
                          <Button
                            type="button"
                            variant="destructive"
                            onClick={() => {
                              if (!confirmRemoveId) return;
                              onRemoveMember(confirmRemoveId);
                              setConfirmRemoveId(null);
                            }}
                            disabled={removing}
                          >
                            {removing ? "Đang xóa..." : "Xóa"}
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  )}
                </div>
              )}
            </div>
          </ScrollArea>
        </div>
      </SheetContent>
    </Sheet>
  );
}
