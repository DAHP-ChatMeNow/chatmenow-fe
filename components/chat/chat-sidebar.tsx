"use client";

import { useState } from "react";
import { Search, Edit } from "lucide-react";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useParams } from "next/navigation";
import { useConversations, useCreateConversation } from "@/hooks/use-chat";
import { useContacts } from "@/hooks/use-contact";
import { useAuthStore } from "@/store/use-auth-store";
import { ChatListSkeleton } from "@/components/skeletons/chat-list-skeleton";
import { ConversationItemDisplay } from "./conversation-item-display";

export function ChatSidebar() {
  const [open, setOpen] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const params = useParams();
  const currentId = params.id as string;
  const user = useAuthStore((state) => state.user);
  const { data: conversationsData, isLoading, error } = useConversations();
  const conversations = conversationsData?.conversations || [];
  const { data: contactsData } = useContacts();
  const contacts = contactsData?.contacts || [];
  const createMutation = useCreateConversation();
  
  // Fallback cho userId - lấy id hoặc _id
  const currentUserId = user?.id || user?._id;
  
  console.log("ChatSidebar:", { 
    userId: user?.id,
    userIdFallback: user?._id, 
    currentUserId,
    conversationsCount: conversations.length,
    firstConversation: conversations[0] 
  });
  
  return (
    <aside className="w-[350px] border-r border-slate-200/60 flex flex-col h-full bg-gradient-to-b from-white to-slate-50/30 shrink-0">
      <div className="px-5 pt-4 pb-3 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text">Messages</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <button className="p-2.5 hover:bg-slate-100 rounded-xl transition-all duration-200 hover:scale-105">
              <Edit className="w-5 h-5 text-slate-600" />
            </button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Tạo nhóm chat</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-slate-700">Tên nhóm</label>
                <Input
                  placeholder="Nhập tên nhóm"
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  className="mt-2"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700">Chọn thành viên (ít nhất 2)</label>
                <div className="mt-2 max-h-56 overflow-auto rounded-md border border-slate-200/80">
                  {contacts.length === 0 ? (
                    <div className="p-3 text-sm text-slate-500">Chưa có danh bạ</div>
                  ) : (
                    contacts.map((c) => {
                      const id = (c as any)._id || c.id;
                      const checked = selectedIds.includes(id);
                      return (
                        <label key={id} className="flex items-center gap-3 px-3 py-2 hover:bg-slate-50">
                          <input
                            type="checkbox"
                            className="h-4 w-4"
                            checked={checked}
                            onChange={(e) => {
                              setSelectedIds((prev) =>
                                e.target.checked ? [...prev, id] : prev.filter((x) => x !== id)
                              );
                            }}
                          />
                          <div className="flex items-center gap-3">
                            {/* avatar */}
                            {c.avatar ? (
                              <img src={c.avatar} alt={c.displayName} className="h-6 w-6 rounded-full object-cover" />
                            ) : (
                              <div className="h-6 w-6 rounded-full bg-slate-200" />
                            )}
                            <div className="text-sm text-slate-800">{c.displayName}</div>
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
                    }
                  );
                }}
                disabled={!groupName || selectedIds.length < 2 || createMutation.isPending}
              >
                {createMutation.isPending ? "Đang tạo..." : "Tạo nhóm"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="px-5 pb-4">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input placeholder="Search messages..." className="pl-11 bg-white border border-slate-200/80 shadow-sm h-11 rounded-xl focus-visible:ring-2 focus-visible:ring-blue-500/20" />
        </div>
      </div>

      <ScrollArea className="flex-1">
        {isLoading ? (
          <div className="px-4 pb-4">
            <ChatListSkeleton />
          </div>
        ) : error ? (
          <div className="px-4 py-8 text-center text-sm text-slate-500">
            Không thể tải danh sách hội thoại
          </div>
        ) : conversations && conversations.length > 0 ? (
          <div className="flex flex-col gap-0.5 pb-2">
            {conversations.map((chat) => (
              <ConversationItemDisplay
                key={chat.id}
                conversation={chat}
                currentUserId={currentUserId}
                isActive={currentId === chat.id}
              />
            ))}
          </div>
        ) : (
          <div className="px-4 py-8 text-center text-sm text-slate-500">
            Chưa có hội thoại nào
          </div>
        )}
      </ScrollArea>
    </aside>
  );
}