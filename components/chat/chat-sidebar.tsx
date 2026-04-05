"use client";

import { useMemo, useState } from "react";
import { Search, Edit, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { PresignedAvatar } from "@/components/ui/presigned-avatar";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { useParams } from "next/navigation";
import {
  useAiConversation,
  useConversations,
  useCreateConversation,
} from "@/hooks/use-chat";
import { useContacts } from "@/hooks/use-contact";
import { useAuthStore } from "@/store/use-auth-store";
import { ChatListSkeleton } from "@/components/skeletons/chat-list-skeleton";
import { ConversationItemDisplay } from "./conversation-item-display";
import { Conversation } from "@/types/conversation";

type ChatConversation = Conversation & {
  isAI?: boolean;
  isAi?: boolean;
  isAiAssistant?: boolean;
};

export function ChatSidebar() {
  const [open, setOpen] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | "private" | "group">(
    "all",
  );
  const params = useParams();
  const currentId = params.id as string;
  const user = useAuthStore((state) => state.user);
  const { data: conversationsData, isLoading, error } = useConversations();
  const { data: aiConversationData } = useAiConversation();
  const conversations = useMemo(() => {
    const merged = new Map<string, ChatConversation>();

    (conversationsData?.conversations || []).forEach((conversation) => {
      merged.set(conversation.id, conversation);
    });

    const aiConversation = aiConversationData?.conversation;
    if (aiConversation?.id) {
      merged.set(aiConversation.id, aiConversation);
    }

    const toTimestamp = (value: unknown) => {
      if (!value) return 0;
      const timestamp = new Date(value as string | number | Date).getTime();
      return Number.isNaN(timestamp) ? 0 : timestamp;
    };

    const isAiConversation = (conversation: ChatConversation) => {
      const type = String(conversation?.type || "").toLowerCase();
      return (
        type === "ai" ||
        Boolean(conversation?.isAI) ||
        Boolean(conversation?.isAi) ||
        Boolean(conversation?.isAiAssistant)
      );
    };

    return Array.from(merged.values()).sort((left, right) => {
      const leftAi = isAiConversation(left) ? 1 : 0;
      const rightAi = isAiConversation(right) ? 1 : 0;

      if (leftAi !== rightAi) return rightAi - leftAi;

      return toTimestamp(right.updatedAt) - toTimestamp(left.updatedAt);
    });
  }, [conversationsData, aiConversationData]);
  const { data: contactsData } = useContacts();
  const contacts = contactsData?.contacts || [];
  const createMutation = useCreateConversation();

  const currentUserId = user?.id || user?._id;

  const normalizedQuery = query.trim().toLowerCase();

  const filteredConversations = useMemo(() => {
    const isAiConversation = (conversation: ChatConversation) => {
      const type = String(conversation?.type || "").toLowerCase();
      return (
        type === "ai" ||
        Boolean(conversation?.isAI) ||
        Boolean(conversation?.isAi) ||
        Boolean(conversation?.isAiAssistant)
      );
    };

    return conversations.filter((conversation) => {
      const matchType =
        typeFilter === "all"
          ? true
          : typeFilter === "private"
            ? conversation.type === "private"
            : conversation.type === "group";

      if (!matchType) return false;
      if (!normalizedQuery) return true;

      const searchable = [
        conversation.name,
        conversation.lastMessage?.content,
        isAiConversation(conversation) ? "ai chat" : "",
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return searchable.includes(normalizedQuery);
    });
  }, [conversations, normalizedQuery, typeFilter]);

  const filterBtnClass = (isActive: boolean) =>
    `rounded-full px-3 py-1.5 text-xs font-semibold whitespace-nowrap transition-colors ${
      isActive
        ? "bg-blue-600 text-white"
        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
    }`;

  return (
    <aside className="flex flex-col w-full h-full border-r border-slate-200/60 bg-gradient-to-b from-white to-slate-50/20 shrink-0">
      <div className="flex items-center justify-between px-4 pt-3 pb-2 md:px-5 md:pt-4">
        <div className="min-w-0">
          <h2 className="text-xl font-bold leading-tight text-blue-600">
            Tin nhắn
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            {filteredConversations.length}/{conversations.length} cuộc hội thoại
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <button
              aria-label="Tạo cuộc trò chuyện"
              className="flex items-center justify-center w-10 h-10 transition-colors rounded-xl bg-slate-100/80 hover:bg-slate-200/80"
            >
              <Edit className="w-5 h-5 text-slate-700" />
            </button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Tạo nhóm chat</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-slate-700">
                  Tên nhóm
                </label>
                <Input
                  placeholder="Nhập tên nhóm"
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  className="mt-2"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700">
                  Chọn thành viên (ít nhất 2)
                </label>
                <div className="mt-2 overflow-auto border rounded-md max-h-56 border-slate-200/80">
                  {contacts.length === 0 ? (
                    <div className="p-3 text-sm text-slate-500">
                      Chưa có danh bạ
                    </div>
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
                              setSelectedIds((prev) =>
                                e.target.checked
                                  ? [...prev, id]
                                  : prev.filter((x) => x !== id),
                              );
                            }}
                          />
                          <div className="flex items-center gap-3">
                            <PresignedAvatar
                              avatarKey={c.avatar}
                              displayName={c.displayName}
                              className="w-6 h-6"
                              fallbackClassName="bg-slate-200 text-slate-600 text-[10px]"
                            />
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
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setOpen(false)}
                disabled={createMutation.isPending}
              >
                Hủy
              </Button>
              <Button
                onClick={() => {
                  if (!groupName || selectedIds.length < 2) return;
                  createMutation.mutate(
                    { name: groupName, memberIds: selectedIds },
                    {
                      onSuccess: () => {
                        setGroupName("");
                        setSelectedIds([]);
                        setOpen(false);
                      },
                    },
                  );
                }}
                disabled={
                  !groupName ||
                  selectedIds.length < 2 ||
                  createMutation.isPending
                }
              >
                {createMutation.isPending ? "Đang tạo..." : "Tạo nhóm"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="px-4 pb-2 md:px-5">
        <div className="relative">
          <Search className="absolute w-4 h-4 -translate-y-1/2 left-3.5 top-1/2 text-slate-400" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Tìm kiếm cuộc trò chuyện..."
            className="pl-10 pr-10 bg-white border shadow-sm border-slate-200/80 h-11 rounded-xl focus-visible:ring-2 focus-visible:ring-blue-500/20"
          />
          {query ? (
            <button
              type="button"
              aria-label="Xóa từ khóa"
              onClick={() => setQuery("")}
              className="absolute p-1 -translate-y-1/2 rounded-full right-2 top-1/2 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            >
              <X className="w-4 h-4" />
            </button>
          ) : null}
        </div>
      </div>

      <div className="px-4 pb-2.5 md:px-5 border-b border-slate-100">
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
          <button
            type="button"
            onClick={() => setTypeFilter("all")}
            className={filterBtnClass(typeFilter === "all")}
          >
            Tất cả
          </button>
          <button
            type="button"
            onClick={() => setTypeFilter("private")}
            className={filterBtnClass(typeFilter === "private")}
          >
            Cá nhân
          </button>
          <button
            type="button"
            onClick={() => setTypeFilter("group")}
            className={filterBtnClass(typeFilter === "group")}
          >
            Nhóm
          </button>
        </div>
      </div>

      <ScrollArea className="flex-1">
        {isLoading ? (
          <div className="px-3 pt-2 pb-4">
            <ChatListSkeleton />
          </div>
        ) : error ? (
          <div className="px-4 py-8 text-sm text-center text-slate-500">
            Không thể tải danh sách hội thoại
          </div>
        ) : filteredConversations.length > 0 ? (
          <div className="flex flex-col gap-1.5 pt-2 pb-3">
            {filteredConversations.map((chat) => (
              <ConversationItemDisplay
                key={chat.id}
                conversation={chat}
                currentUserId={currentUserId}
                isActive={currentId === chat.id}
              />
            ))}
          </div>
        ) : (
          <div className="px-4 py-8 text-sm text-center text-slate-500">
            Không có cuộc hội thoại phù hợp
          </div>
        )}
      </ScrollArea>
    </aside>
  );
}
