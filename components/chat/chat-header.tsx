"use client";

import { useMemo, useState } from "react";
import {
  ChevronLeft,
  Phone,
  Video,
  MoreVertical,
  Image as ImageIcon,
  Link2,
  Search as SearchIcon,
  UserPlus,
  ShieldBan,
  Trash2,
  LogOut,
} from "lucide-react";
import { useRouter, useParams } from "next/navigation";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
  useRemoveMemberFromGroup,
  useDissolveGroup,
} from "@/hooks/use-chat";
import { useAuthStore } from "@/store/use-auth-store";
import { useContacts, useRemoveFriend } from "@/hooks/use-contact";
import { useCreateConversation } from "@/hooks/use-chat";
import { useVideoCall } from "@/components/providers/video-call-provider";

export function ChatHeader({
  name,
  isOnline,
  avatar,
}: {
  name?: string;
  isOnline?: boolean;
  avatar?: string;
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
  const removeFriendMutation = useRemoveFriend();
  const createGroupMutation = useCreateConversation();
  const { startCall, isBusy } = useVideoCall();

  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetTab, setSheetTab] = useState<"media" | "links" | "search">(
    "media",
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [groupOpen, setGroupOpen] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteSelectedIds, setInviteSelectedIds] = useState<string[]>([]);
  const [manageOpen, setManageOpen] = useState(false);
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const [dissolveConfirmOpen, setDissolveConfirmOpen] = useState(false);

  const addMemberMutation = useAddMemberToGroup();
  const removeMemberMutation = useRemoveMemberFromGroup();
  const dissolveMutation = useDissolveGroup();

  // Derive partnerId from conversation members for private chats
  const partnerId = useMemo(() => {
    if (!conversation || conversation.type !== "private" || !currentUserId)
      return undefined;
    const partnerMember = conversation.members.find((m: any) => {
      const memberUserId =
        typeof m.userId === "string" ? m.userId : m.userId?._id || m.userId?.id;
      return memberUserId !== currentUserId;
    });
    if (!partnerMember) return undefined;
    return typeof partnerMember.userId === "string"
      ? partnerMember.userId
      : partnerMember.userId?._id || partnerMember.userId?.id;
  }, [conversation, currentUserId]);

  // Check if current user is admin in group
  const isAdmin = useMemo(() => {
    if (!conversation || conversation.type !== "group" || !currentUserId)
      return false;
    const member = conversation.members.find((m: any) => {
      const memberUserId =
        typeof m.userId === "string" ? m.userId : m.userId?._id || m.userId?.id;
      return memberUserId === currentUserId;
    });
    return member?.role === "admin";
  }, [conversation, currentUserId]);

  // Get group members (excluding self)
  const groupMembers = useMemo(() => {
    if (!conversation || conversation.type !== "group" || !currentUserId)
      return [];
    return conversation.members
      .filter((m: any) => {
        const memberUserId =
          typeof m.userId === "string"
            ? m.userId
            : m.userId?._id || m.userId?.id;
        return memberUserId !== currentUserId;
      })
      .map((m: any) => ({
        userId:
          typeof m.userId === "string"
            ? m.userId
            : m.userId?._id || m.userId?.id,
        displayName:
          typeof m.userId === "string"
            ? "Unknown"
            : m.userId?.displayName || "Unknown",
        avatar: typeof m.userId === "string" ? "" : m.userId?.avatar || "",
        role: m.role,
      }));
  }, [conversation, currentUserId]);

  const displayName = name || "Chat";
  const canCall = conversation?.type === "private" && !!partnerId && !isBusy;

  const handleStartCall = async (callType: "audio" | "video") => {
    if (!partnerId || !canCall) return;

    await startCall({
      receiverId: partnerId,
      receiverName: displayName,
      conversationId: currentId,
      callType,
    });
  };

  return (
    <>
      <div className="h-[70px] md:h-[80px] border-b border-slate-200/60 flex items-center justify-between px-5 bg-white/80 backdrop-blur-xl sticky top-0 z-30 shadow-sm">
        <div className="flex items-center gap-2 md:gap-3">
          <button
            onClick={() => router.push("/messages")}
            className="p-2 -ml-2 transition-colors rounded-full md:hidden hover:bg-slate-100"
          >
            <ChevronLeft className="w-6 h-6 text-slate-600" />
          </button>

          <div className="relative">
            <Avatar className="border-2 border-white shadow-lg h-11 w-11 md:h-12 md:w-12 ring-1 ring-slate-100">
              <AvatarImage src={avatar} />
              <AvatarFallback className="font-bold text-white bg-gradient-to-br from-blue-400 to-blue-600">
                {(displayName || "U").charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            {isOnline && (
              <span className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 border-2 border-white rounded-full shadow-sm" />
            )}
          </div>

          <div className="flex flex-col">
            <h2 className="text-base font-bold leading-tight text-slate-900 md:text-lg">
              {displayName}
            </h2>
            <p className="text-[11px] md:text-[12px] text-slate-400 font-medium">
              {isOnline ? "Đang hoạt động" : "Vừa truy cập"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
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
            <DropdownMenuContent align="end" className="w-60">
              <DropdownMenuLabel>Tùy chọn chat</DropdownMenuLabel>
              <DropdownMenuItem
                onClick={() => {
                  setSheetTab("media");
                  setSheetOpen(true);
                }}
              >
                <ImageIcon className="text-slate-500" /> Xem hình ảnh đã gửi
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  setSheetTab("links");
                  setSheetOpen(true);
                }}
              >
                <Link2 className="text-slate-500" /> Xem link đã gửi
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  setSheetTab("search");
                  setSheetOpen(true);
                }}
              >
                <SearchIcon className="text-slate-500" /> Tìm kiếm tin nhắn
              </DropdownMenuItem>
              <DropdownMenuSeparator />

              {/* Private chat options */}
              {conversation?.type === "private" && (
                <>
                  <DropdownMenuItem
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
                    onClick={() => {
                      if (partnerId) {
                        removeFriendMutation.mutate(partnerId);
                      }
                    }}
                  >
                    <ShieldBan className="text-red-500" /> Chặn bạn bè
                  </DropdownMenuItem>
                </>
              )}

              {/* Group chat options */}
              {conversation?.type === "group" && (
                <>
                  <DropdownMenuItem onClick={() => setInviteOpen(true)}>
                    <UserPlus className="text-slate-500" /> Mời bạn bè vào nhóm
                  </DropdownMenuItem>
                  {isAdmin && (
                    <>
                      <DropdownMenuItem onClick={() => setManageOpen(true)}>
                        <Trash2 className="text-slate-500" /> Quản lý thành viên
                      </DropdownMenuItem>
                      <DropdownMenuItem
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
      <MessagesSideSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        tab={sheetTab}
        messages={messages}
        searchQuery={searchQuery}
        onSearchQueryChange={setSearchQuery}
        title={
          sheetTab === "media"
            ? "Hình ảnh đã gửi"
            : sheetTab === "links"
              ? "Liên kết đã gửi"
              : "Tìm kiếm tin nhắn"
        }
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
        conversationId={currentId || ""}
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
      <ManageMembersDialog
        open={manageOpen}
        onOpenChange={setManageOpen}
        members={groupMembers}
        isAdmin={isAdmin}
        conversationId={currentId || ""}
        onRemoveMember={(memberId) => {
          if (!currentId) return;
          removeMemberMutation.mutate(
            { conversationId: currentId, memberId },
            {
              onSuccess: () => {
                setSelectedMemberId(null);
              },
            },
          );
        }}
        removing={removeMemberMutation.isPending}
      />
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
    </>
  );
}

// Side sheet content for media/links/search
function MessagesSideSheet({
  open,
  onOpenChange,
  tab,
  messages,
  searchQuery,
  onSearchQueryChange,
  title,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  tab: "media" | "links" | "search";
  messages: any[];
  searchQuery: string;
  onSearchQueryChange: (v: string) => void;
  title: string;
}) {
  const urlRegex = /(https?:\/\/[^\s]+)/gi;
  const mediaMsgs = useMemo(
    () =>
      messages.filter(
        (m) =>
          m.type === "image" ||
          (m.attachments || []).some((a: any) =>
            (a.fileType || "").startsWith("image"),
          ),
      ),
    [messages],
  );
  const linkMsgs = useMemo(
    () => messages.filter((m) => (m.content || "").match(urlRegex)),
    [messages],
  );
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
        <ScrollArea className="mt-4 h-[70vh]">
          {tab === "media" && (
            <div className="grid grid-cols-3 gap-2 pr-3">
              {mediaMsgs.length === 0 ? (
                <div className="text-sm text-slate-500">Chưa có hình ảnh</div>
              ) : (
                mediaMsgs.map((m, idx) => {
                  const img = (m.attachments || []).find((a: any) =>
                    (a.fileType || "").startsWith("image"),
                  );
                  const src = img?.url || m.content;
                  return (
                    <img
                      key={m.id || idx}
                      src={src}
                      alt="image"
                      className="object-cover w-full h-24 border rounded-md"
                    />
                  );
                })
              )}
            </div>
          )}
          {tab === "links" && (
            <div className="pr-3 space-y-2">
              {linkMsgs.length === 0 ? (
                <div className="text-sm text-slate-500">Chưa có liên kết</div>
              ) : (
                linkMsgs.map((m, idx) => {
                  const links = ((m.content || "").match(urlRegex) ||
                    []) as string[];
                  return (
                    <div key={m.id || idx} className="p-2 border rounded-md">
                      {links.map((l: string, i: number) => (
                        <a
                          key={i}
                          href={l}
                          target="_blank"
                          rel="noreferrer"
                          className="text-sm text-blue-600 break-all"
                        >
                          {l}
                        </a>
                      ))}
                      <div className="mt-1 text-xs text-slate-500">
                        {new Date(m.createdAt).toLocaleString()}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}
          {tab === "search" && (
            <div className="pr-3 space-y-2">
              {searchMsgs.length === 0 ? (
                <div className="text-sm text-slate-500">Không có kết quả</div>
              ) : (
                searchMsgs.map((m, idx) => (
                  <div key={m.id || idx} className="p-2 border rounded-md">
                    <div className="text-sm whitespace-pre-wrap text-slate-800">
                      {m.content}
                    </div>
                    <div className="mt-1 text-xs text-slate-500">
                      {new Date(m.createdAt).toLocaleString()}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
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
  contacts: any[];
  groupName: string;
  onGroupNameChange: (v: string) => void;
  selectedIds: string[];
  setSelectedIds: (updater: any) => void;
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
                const id = (c as any)._id || c.id;
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
  conversationId,
  selectedIds,
  setSelectedIds,
  onInvite,
  inviting,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  contacts: any[];
  conversationId: string;
  selectedIds: string[];
  setSelectedIds: (updater: any) => void;
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
                const id = (c as any)._id || c.id;
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

// Dialog để quản lý thành viên nhóm
function ManageMembersDialog({
  open,
  onOpenChange,
  members,
  isAdmin,
  conversationId,
  onRemoveMember,
  removing,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  members: any[];
  isAdmin: boolean;
  conversationId: string;
  onRemoveMember: (memberId: string) => void;
  removing: boolean;
}) {
  const [confirmRemoveId, setConfirmRemoveId] = useState<string | null>(null);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Quản lý thành viên</DialogTitle>
        </DialogHeader>
        <div className="space-y-2 overflow-auto max-h-64">
          {members.length === 0 ? (
            <div className="text-sm text-slate-500">
              Không có thành viên khác
            </div>
          ) : (
            members.map((member) => (
              <div
                key={member.userId}
                className="flex items-center justify-between p-2 border rounded-md border-slate-200/80"
              >
                <div className="flex items-center gap-3">
                  {member.avatar ? (
                    <img
                      src={member.avatar}
                      alt={member.displayName}
                      className="object-cover w-8 h-8 rounded-full"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-slate-200" />
                  )}
                  <div className="text-sm text-slate-800">
                    {member.displayName}
                  </div>
                  {member.role === "admin" && (
                    <span className="px-2 py-1 text-xs text-blue-800 bg-blue-100 rounded">
                      Admin
                    </span>
                  )}
                </div>
                {isAdmin && member.role !== "admin" && (
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => setConfirmRemoveId(member.userId)}
                    disabled={removing}
                  >
                    Xóa
                  </Button>
                )}
              </div>
            ))
          )}
        </div>
        {confirmRemoveId && (
          <div className="p-3 border border-red-200 rounded-md bg-red-50">
            <p className="mb-2 text-sm text-red-800">
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
        <DialogFooter>
          <Button onClick={() => onOpenChange(false)}>Đóng</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
