"use client";
import React, { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { chatService } from "@/services/chat";
import { PresignedAvatar } from "@/components/ui/presigned-avatar";
import { Send, CheckCircle2, Search, Link as LinkIcon, Share as ShareIcon } from "lucide-react";
import { toast } from "sonner";
import { useAuthStore } from "@/store/use-auth-store";

interface ShareFriendsModalProps {
    open: boolean;
    onOpenChange: (o: boolean) => void;
    reelUrl: string;
}

export function ShareFriendsModal({
    open,
    onOpenChange,
    reelUrl,
}: ShareFriendsModalProps) {
    const { user } = useAuthStore();
    const [search, setSearch] = useState("");
    const [sentIds, setSentIds] = useState<Set<string>>(new Set());

    const { data: conversations = [], isLoading } = useQuery({
        queryKey: ["share-conversations"],
        queryFn: async () => {
            const res = await chatService.getConversations();
            return Array.isArray(res) ? res : res.conversations || [];
        },
        enabled: open
    });

    const sendMutation = useMutation({
        mutationFn: ({ convId }: { convId: string }) =>
            chatService.sendMessage({
                conversationId: convId,
                content: `Hãy xem Reel này nhé!\n${reelUrl}`,
                type: "text",
            }),
        onSuccess: (_, variables) => {
            setSentIds(prev => new Set(prev).add(variables.convId));
            toast.success("Đã gửi cho bạn bè!");
        }
    });

    const handleSend = (convId: string) => {
        if (sentIds.has(convId)) return;
        sendMutation.mutate({ convId });
    };

    const copyLink = () => {
        navigator.clipboard.writeText(reelUrl);
        toast.success("Đã copy liên kết!");
        onOpenChange(false);
    };

    const nativeShare = async () => {
        if (navigator.share) {
            try {
                await navigator.share({
                    title: 'ChatMeNow Reel',
                    text: 'Xem Reel này trên ChatMeNow',
                    url: reelUrl,
                });
            } catch (err) {
                // ignore
            }
        }
    };

    const contacts = conversations.filter((c: any) => c.type === 'private').map((c: any) => {
        const partner = c.members?.find((m: any) => m.userId?._id !== user?._id && m.userId?.id !== user?.id)?.userId;
        return {
            convId: c._id || c.id,
            partner
        };
    }).filter((c: any) => c.partner && (c.partner.displayName || "").toLowerCase().includes(search.toLowerCase()));

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md bg-white dark:bg-slate-900 border-none z-[100]">
                <DialogHeader>
                    <DialogTitle className="text-center font-bold">Chia sẻ thước phim</DialogTitle>
                </DialogHeader>

                <div className="flex items-center gap-3 mb-2 mt-2">
                    <button
                        onClick={copyLink}
                        className="flex-1 flex flex-col items-center justify-center p-3 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 transition-colors"
                    >
                        <div className="w-10 h-10 rounded-full bg-white dark:bg-slate-900 flex items-center justify-center mb-2 shadow-sm">
                            <LinkIcon className="w-5 h-5 text-slate-700 dark:text-slate-300" />
                        </div>
                        <span className="text-xs font-semibold">Copy Link</span>
                    </button>

                    {typeof navigator !== "undefined" && typeof navigator.share === "function" && (
                        <button
                            onClick={nativeShare}
                            className="flex-1 flex flex-col items-center justify-center p-3 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 transition-colors"
                        >
                            <div className="w-10 h-10 rounded-full bg-white dark:bg-slate-900 flex items-center justify-center mb-2 shadow-sm">
                                <ShareIcon className="w-5 h-5 text-slate-700 dark:text-slate-300" />
                            </div>
                            <span className="text-xs font-semibold">Tùy chọn khác</span>
                        </button>
                    )}
                </div>

                <div className="relative mt-2">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                        className="w-full bg-slate-100 dark:bg-slate-800 rounded-full py-2.5 pl-9 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Gửi cho bạn bè..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                    />
                </div>

                <div className="mt-2 max-h-[40vh] overflow-y-auto space-y-1 pr-1">
                    {isLoading && <div className="text-center p-4 text-sm text-slate-500">Đang tải...</div>}
                    {!isLoading && contacts.length === 0 && (
                        <div className="text-center p-4 text-sm text-slate-500">Không tìm thấy người nào</div>
                    )}
                    {contacts.map((contact: any) => {
                        const isSent = sentIds.has(contact.convId);
                        const isPending = sendMutation.isPending && sendMutation.variables?.convId === contact.convId;

                        return (
                            <div key={contact.convId} className="flex items-center justify-between p-2 hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-lg transition-colors">
                                <div className="flex items-center gap-3">
                                    <PresignedAvatar
                                        avatarKey={contact.partner.avatar}
                                        displayName={contact.partner.displayName}
                                        className="w-10 h-10"
                                    />
                                    <span className="font-semibold text-sm">{contact.partner.displayName}</span>
                                </div>
                                <button
                                    onClick={() => handleSend(contact.convId)}
                                    disabled={isSent || isPending}
                                    className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${isSent
                                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                                        : 'bg-blue-500 text-white hover:bg-blue-600'
                                        }`}
                                >
                                    {isPending ? 'Đang gửi' : isSent ? 'Đã gửi' : 'Gửi'}
                                </button>
                            </div>
                        );
                    })}
                </div>
            </DialogContent>
        </Dialog>
    );
}
