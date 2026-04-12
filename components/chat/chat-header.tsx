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
  UserPlus,
  UserCircle2,
  ShieldBan,
  Trash2,
  LogOut,
  Sparkles,
  FileText,
  Save,
  Loader2,
  Upload,
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
  useLeaveGroup,
  useRemoveMemberFromGroup,
  useTransferGroupAdmin,
  useDissolveGroup,
  useUpdateGroupConversation,
} from "@/hooks/use-chat";
import { useAuthStore } from "@/store/use-auth-store";
import { useBlockUser, useContacts } from "@/hooks/use-contact";
import { useCreateConversation } from "@/hooks/use-chat";
import { useVideoCall } from "@/components/providers/video-call-provider";
import { Conversation, ConversationMember } from "@/types/conversation";
import { Message, MessageAttachment } from "@/types/message";
import { FRIEND_CARD_ATTACHMENT_TYPE } from "@/lib/friend-card";
import { User } from "@/types/user";
import { UnreadSummaryDialog } from "@/components/chat/unread-summary-dialog";
import { usePresignedUrl } from "@/hooks/use-profile";
import { chatService } from "@/api/chat";
import { toast } from "sonner";

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

const URL_REGEX = /(https?:\/\/[^\s]+)/gi;

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
  const messages = messagesData?.messages || [];
  const user = useAuthStore((s) => s.user);
  const currentUserId = user?.id || user?._id;
  const { data: contactsData } = useContacts();
  const contacts = contactsData?.contacts || [];
  const blockUserMutation = useBlockUser();
  const createGroupMutation = useCreateConversation();
  const { startCall, isBusy } = useVideoCall();

  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetTab, setSheetTab] = useState<"assets" | "search">("assets");
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
  const [backgroundOpen, setBackgroundOpen] = useState(false);
  const [selectedBackground, setSelectedBackground] =
    useState<ChatBackgroundKey>("default");
  const [leaveConfirmOpen, setLeaveConfirmOpen] = useState(false);
  const [dissolveConfirmOpen, setDissolveConfirmOpen] = useState(false);
  const [internalSummaryOpen, setInternalSummaryOpen] = useState(false);
  const summaryOpen = controlledSummaryOpen ?? internalSummaryOpen;
  const setSummaryOpen = onSummaryOpenChange ?? setInternalSummaryOpen;

  const addMemberMutation = useAddMemberToGroup();
  const leaveGroupMutation = useLeaveGroup();
  const removeMemberMutation = useRemoveMemberFromGroup();
  const transferAdminMutation = useTransferGroupAdmin();
  const updateGroupMutation = useUpdateGroupConversation();
  const dissolveMutation = useDissolveGroup();

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
  const isCallEnabled = process.env.NEXT_PUBLIC_ENABLE_CALL === "true";
  const canCall =
    isCallEnabled && conversation?.type === "private" && !!partnerId && !isBusy;

  const handleStartCall = async (callType: "audio" | "video") => {
    if (!partnerId || !canCall) return;

    await startCall({
      receiverId: partnerId,
      receiverName: displayName,
      conversationId: currentId,
      callType,
    });
  };

  const canOpenFriendProfile =
    conversation?.type === "private" && Boolean(partnerId);

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

    const openGroupDrawer = () => {
      setGroupDrawerTab("info");
      setGroupDraftName(conversation?.name || displayName || "");
      setGroupDraftAvatarKey(conversation?.groupAvatar || "");
      setGroupDrawerOpen(true);
    };

    const handleSaveGroupInfo = async (payload: {
      name?: string;
      groupAvatar?: string;
    }) => {
      if (!currentId) return;

      await updateGroupMutation.mutateAsync({
        conversationId: currentId,
        payload,
      });
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
              <PresignedAvatar
                avatarKey={headerAvatarKey}
                displayName={displayName}
                className="border-2 border-white shadow-lg h-11 w-11 md:h-12 md:w-12 ring-1 ring-slate-100"
                fallbackClassName="font-bold text-white bg-gradient-to-br from-blue-400 to-blue-600"
              />
              {isOnline && (
                <span className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 border-2 border-white rounded-full shadow-sm" />
              )}
            </div>

            <div className="flex flex-col min-w-0">
              <h2 className="text-base font-bold leading-tight truncate text-slate-900 md:text-lg">
                {displayName}
              </h2>
              <p className="text-[11px] md:text-[12px] text-slate-400 font-medium truncate">
                {statusText || (isOnline ? "Đang hoạt động" : "Vừa truy cập")}
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
              title={canCall ? "Gọi audio" : "Chi ho tro trong chat ca nhan"}
            >
              <Phone className="w-5 h-5" />
            </button>
            <button
              disabled={!canCall}
              onClick={() => {
                void handleStartCall("video");
              }}
              className="p-2.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all duration-200 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
              title={canCall ? "Gọi video" : "Chi ho tro trong chat ca nhan"}
            >
              <Video className="w-5 h-5" />
            </button>
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
                  <FileText className="text-slate-500" /> Xem ảnh/tệp/link đã gửi
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
                  onClick={openBackgroundPicker}
                >
                  <Palette className="text-slate-500" /> Đổi background
                </DropdownMenuItem>
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
                          await blockUserMutation.mutateAsync(partnerId);
                          router.push("/contacts");
                        }
                      }}
                    >
                      <ShieldBan className="text-red-500" /> Chặn người này
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
                      onClick={() => setInviteOpen(true)}
                    >
                      <UserPlus className="text-slate-500" /> Mời bạn bè vào
                      nhóm
                    </DropdownMenuItem>
                    {isAdmin && (
                      <>
                        <DropdownMenuItem
                          className="h-10 rounded-lg px-3 text-[15px] font-medium text-slate-700"
                          onClick={openGroupDrawer}
                        >
                          <Trash2 className="text-slate-500" /> Thông tin nhóm
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="h-10 rounded-lg px-3 text-[15px] font-medium text-red-600 focus:text-red-700"
                          onClick={() => setDissolveConfirmOpen(true)}
                        >
                          <LogOut className="text-red-500" /> Giải tán nhóm
                        </DropdownMenuItem>
                      </>
                    )}
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
      <MessagesSideSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        tab={sheetTab}
        conversationId={currentId}
        messages={messages}
        searchQuery={searchQuery}
        onSearchQueryChange={setSearchQuery}
        title={
          sheetTab === "assets" ? "Kho ảnh/tệp/link đã gửi" : "Tìm kiếm tin nhắn"
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
        contacts={contacts}
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
      <GroupSettingsDrawer
        open={groupDrawerOpen}
        onOpenChange={setGroupDrawerOpen}
        activeTab={groupDrawerTab}
        onTabChange={setGroupDrawerTab}
        draftName={groupDraftName}
        onDraftNameChange={setGroupDraftName}
        draftAvatarKey={groupDraftAvatarKey}
        onDraftAvatarChange={setGroupDraftAvatarKey}
        onSaveGroupInfo={handleSaveGroupInfo}
        savingGroupInfo={updateGroupMutation.isPending}
        members={groupMembers}
        isAdmin={isAdmin}
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
      />
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
  searchQuery,
  onSearchQueryChange,
  title,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  tab: "assets" | "search";
  conversationId?: string;
  messages: Message[];
  searchQuery: string;
  onSearchQueryChange: (v: string) => void;
  title: string;
}) {
  const [assetView, setAssetView] = useState<"images" | "files" | "links">(
    "images",
  );

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

        (message.attachments || []).forEach((attachment: MessageAttachment, attachmentIndex: number) => {
          if (attachment.fileType === FRIEND_CARD_ATTACHMENT_TYPE) {
            return;
          }

          const source = attachment.key || attachment.url || "";
          if (!source) return;

          collected.push({
            id: `${messageId}-${attachmentIndex}-${source}`,
            source,
            fileType: attachment.fileType,
            fileName: attachment.fileName,
            createdAt,
          });
        });
      });

      return collected;
    },
    [normalizeDateString],
  );

  const extractLinks = useCallback(
    (inputMessages: Message[]): CachedLinkItem[] => {
      const collected: CachedLinkItem[] = [];

      inputMessages.forEach((message, index) => {
        const links = ((message.content || "").match(URL_REGEX) || []) as string[];
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
      if (item?.fileType === FRIEND_CARD_ATTACHMENT_TYPE) return;
      if (item?.id && item?.source) map.set(item.id, item);
    });
    fromCurrentMessages.forEach((item) => map.set(item.id, item));

    return Array.from(map.values()).sort(
      (left, right) =>
        new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime(),
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
        new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime(),
    );
  }, [messages, cachedLinks, extractLinks]);

  const isImageAsset = useCallback((item: CachedFileItem) => {
    const normalizedType = String(item.fileType || "").toLowerCase();
    const normalizedName = String(item.fileName || item.source || "").toLowerCase();
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
          <div className="mt-3 flex items-center gap-2">
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
          {tab === "assets" && (
            <div className="space-y-2 pr-3">
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
                    className="w-full p-2 text-left border rounded-md transition-colors hover:bg-slate-50"
                    onClick={() => {
                      const messageId = getMessageId(m);
                      if (!messageId || !conversationId || typeof window === "undefined") {
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
      <div className="flex items-center justify-center w-full h-24 rounded-2xl border border-slate-200 bg-slate-50 text-xs text-slate-400">
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
          className="h-24 w-full rounded-2xl border border-slate-200 object-cover"
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
        className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-3 py-3 shadow-sm"
      >
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
          <Sparkles className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-medium text-slate-900">{fileName || "Tệp âm thanh"}</div>
          <div className="text-xs text-slate-500">Audio</div>
        </div>
      </a>
    );
  }

  if (isVideo) {
    return (
      <a href={resolvedSrc} target="_blank" rel="noreferrer" className="block">
        <video controls src={resolvedSrc} className="h-32 w-full rounded-2xl border border-slate-200 bg-black" />
      </a>
    );
  }

  return (
    <a
      href={resolvedSrc}
      target="_blank"
      rel="noreferrer"
      className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-3 py-3 shadow-sm"
    >
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-blue-700">
        <FileText className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium text-slate-900">
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
  onSaveGroupInfo,
  savingGroupInfo,
  members,
  isAdmin,
  onTransferAdmin,
  transferring,
  onRemoveMember,
  removing,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  activeTab: "info" | "members";
  onTabChange: (tab: "info" | "members") => void;
  draftName: string;
  onDraftNameChange: (value: string) => void;
  draftAvatarKey: string;
  onDraftAvatarChange: (value: string) => void;
  onSaveGroupInfo: (payload: { name?: string; groupAvatar?: string }) => Promise<void> | void;
  savingGroupInfo: boolean;
  members: GroupMemberView[];
  isAdmin: boolean;
  onTransferAdmin: (memberId: string) => void;
  transferring: boolean;
  onRemoveMember: (memberId: string) => void;
  removing: boolean;
}) {
  const [confirmRemoveId, setConfirmRemoveId] = useState<string | null>(null);
  const [confirmTransferId, setConfirmTransferId] = useState<string | null>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!open) return;
    setConfirmRemoveId(null);
    setConfirmTransferId(null);
  }, [open]);

  const hasDraftChanges = draftName.trim().length > 0;

  const handlePickAvatar = async (event: React.ChangeEvent<HTMLInputElement>) => {
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
        typeof (error as { response?: { data?: { message?: string } } }).response
          ?.data?.message === "string"
          ? (error as { response?: { data?: { message?: string } } }).response?.data?.message
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
    });
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-xl overflow-hidden p-0">
        <div className="flex h-full flex-col">
          <SheetHeader className="border-b border-slate-200/80 px-5 py-4 text-left">
            <SheetTitle className="text-xl">Thông tin nhóm</SheetTitle>
            <SheetDescription>
              Chỉnh tên, avatar và quản lý thành viên theo kiểu drawer.
            </SheetDescription>
          </SheetHeader>

          <div className="border-b border-slate-200/80 px-5 py-4">
            <div className="flex items-center gap-4">
              <div className="relative">
                <PresignedAvatar
                  avatarKey={draftAvatarKey}
                  displayName={draftName || "Nhóm"}
                  className="h-16 w-16 border border-slate-200 shadow-sm"
                  fallbackClassName="bg-gradient-to-br from-blue-500 to-cyan-500 text-white font-semibold"
                />
                {avatarUploading && (
                  <span className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 text-white">
                    <Loader2 className="h-4 w-4 animate-spin" />
                  </span>
                )}
              </div>

              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <div className="text-lg font-semibold text-slate-900 truncate">
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

          <div className="flex items-center gap-2 border-b border-slate-200/80 px-5 py-3">
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
              Thành viên
            </button>
          </div>

          <ScrollArea className="flex-1">
            <div className="space-y-5 px-5 py-4">
              {activeTab === "info" ? (
                <div className="space-y-5">
                  <div className="rounded-3xl border border-slate-200/80 bg-slate-50 p-4">
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
                        <Upload className="mr-2 h-4 w-4" />
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
                      onChange={(event) => onDraftNameChange(event.target.value)}
                      placeholder="Nhập tên nhóm"
                      disabled={!isAdmin}
                      className="h-11 rounded-2xl border-slate-200 bg-white"
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      onClick={handleSaveInfo}
                      disabled={!isAdmin || savingGroupInfo || !hasDraftChanges}
                    >
                      {savingGroupInfo ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Đang lưu...
                        </>
                      ) : (
                        <>
                          <Save className="mr-2 h-4 w-4" />
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
                  {members.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-5 text-sm text-slate-500">
                      Không có thành viên khác
                    </div>
                  ) : (
                    members.map((member) => (
                      <div
                        key={member.userId}
                        className="rounded-2xl border border-slate-200 bg-white px-3 py-3 shadow-sm"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex min-w-0 items-center gap-3">
                            {member.avatar ? (
                              <img
                                src={member.avatar}
                                alt={member.displayName}
                                className="h-10 w-10 rounded-full object-cover"
                              />
                            ) : (
                              <div className="h-10 w-10 rounded-full bg-slate-200" />
                            )}
                            <div className="min-w-0">
                              <div className="truncate text-sm font-medium text-slate-900">
                                {member.displayName}
                              </div>
                              <div className="text-xs text-slate-500 capitalize">
                                {member.role === "admin" ? "Admin" : "Thành viên"}
                              </div>
                            </div>
                          </div>

                          {isAdmin && member.role !== "admin" && (
                            <div className="flex items-center gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setConfirmTransferId(member.userId)}
                                disabled={transferring || removing}
                              >
                                Chuyển admin
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => setConfirmRemoveId(member.userId)}
                                disabled={removing || transferring}
                              >
                                Xóa
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    ))
                  )}

                  {confirmTransferId && (
                    <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4">
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
                    <div className="rounded-2xl border border-red-200 bg-red-50 p-4">
                      <p className="mb-3 text-sm text-red-800">
                        Xóa thành viên này khỏi nhóm?
                      </p>
                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setConfirmRemoveId(null)}
                          disabled={removing}
                        >
                          Hủy
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => {
                            onRemoveMember(confirmRemoveId);
                            setConfirmRemoveId(null);
                          }}
                          disabled={removing}
                        >
                          {removing ? "Đang xóa..." : "Xóa"}
                        </Button>
                      </div>
                    </div>
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
