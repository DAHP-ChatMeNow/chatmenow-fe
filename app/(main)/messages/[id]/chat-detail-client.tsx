"use client";

import { Fragment, useRef, useEffect, useState, useCallback, useMemo, type MouseEvent } from "react";
import {
  FileAudio2,
  Copy,
  MoreVertical,
  Pause,
  Paperclip,
  Play,
  PhoneCall,
  PhoneMissed,
  PhoneOff,
  Reply,
  Pin,
  Share2,
} from "lucide-react";
import Image from "next/image";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ChatHeader } from "@/components/chat/chat-header";
import { ChatInput } from "@/components/chat/chat-input";
import { useParams, useRouter } from "next/navigation";
import {
  useAiConversation,
  useConversation,
  useConversations,
  useDeleteMessageForMe,
  useMarkConversationAsRead,
  useMessages,
  usePinnedMessages,
  usePinMessage,
  useUnpinMessage,
  useUnsendMessage,
  useSendAiMessage,
  useSendMessage,
  useConversationDisplay,
  useReactToMessage,
} from "@/hooks/use-chat";
import {
  useGetFriendProfile,
  useSendFriendRequest,
} from "@/hooks/use-contact";
import { MessageSkeleton } from "@/components/skeletons/message-skeleton";
import { useAuthStore } from "@/store/use-auth-store";
import { useSocket } from "@/components/providers/socket-provider";
import { Message } from "@/types/message";
import { MessageAttachment } from "@/types/message";
import { PresignedAvatar } from "@/components/ui/presigned-avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useQueryClient } from "@tanstack/react-query";
import { chatService, MessagesResponse } from "@/api/chat";
import { usePresignedUrl } from "@/hooks/use-profile";
import { toast } from "sonner";
import {
  decodeFriendCardPayload,
  FRIEND_CARD_ATTACHMENT_TYPE,
} from "@/lib/friend-card";
import {
  decodeGroupCardPayload,
  GROUP_CARD_ATTACHMENT_TYPE,
} from "@/lib/group-card";

type ChatBackgroundKey = "default" | "sky" | "sunset" | "mint" | "night";

const CHAT_BACKGROUND_CLASS: Record<ChatBackgroundKey, string> = {
  default: "bg-gradient-to-b from-white to-slate-50/40",
  sky: "bg-gradient-to-br from-blue-50 via-white to-cyan-50",
  sunset: "bg-gradient-to-br from-rose-50 via-amber-50 to-orange-100",
  mint: "bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-100",
  night: "bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950",
};

const normalizeCallStatus = (msg: Message): string => {
  const status = msg.callInfo?.status?.toLowerCase();
  if (status) return status;

  const text = (msg.content || "").toLowerCase();
  if (text === "ended" || text === "rejected" || text === "missed") {
    return text;
  }

  if (text.includes("nhỡ") || text.includes("nho")) return "missed";
  if (text.includes("từ chối") || text.includes("tu choi")) return "rejected";
  return "ended";
};

const getSystemCallStyle = (status: string) => {
  const text = status.toLowerCase();

  if (text.includes("nhỡ") || text.includes("nho")) {
    return {
      Icon: PhoneMissed,
      iconClass: "bg-rose-100 text-rose-600",
      bubbleClass: "border-rose-100",
    };
  }

  if (text.includes("từ chối") || text.includes("tu choi")) {
    return {
      Icon: PhoneOff,
      iconClass: "bg-amber-100 text-amber-600",
      bubbleClass: "border-amber-100",
    };
  }

  return {
    Icon: PhoneCall,
    iconClass: "bg-blue-100 text-blue-600",
    bubbleClass: "border-blue-100",
  };
};

const getSystemCallTitle = (status: string) => {
  const text = status.toLowerCase();

  if (text.includes("missed")) return "Cuộc gọi nhỡ";
  if (text.includes("rejected")) return "Cuộc gọi bị từ chối";
  return "Cuộc gọi kết thúc";
};

const formatCallDuration = (seconds?: number) => {
  if (!seconds || seconds <= 0) return "0s";

  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;

  if (mins <= 0) return `${secs}s`;
  return `${mins}m ${secs}s`;
};

const formatMessageClock = (value: unknown): string => {
  if (!value) return "";

  const date = new Date(value as string | number | Date);
  if (Number.isNaN(date.getTime())) return "";

  return date.toLocaleTimeString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
  });
};

const normalizeLightMarkdown = (value: string): string => {
  // Handle malformed bold markers such as "***Title:**" from some AI responses.
  return value.replace(/\*\*\*([^*\n]+?:)\*\*/g, "**$1**");
};

const renderInlineBold = (text: string) => {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);

  return parts.map((part, index) => {
    const match = part.match(/^\*\*([^*]+)\*\*$/);
    if (match) {
      return <strong key={`bold-${index}`}>{match[1]}</strong>;
    }

    return <Fragment key={`text-${index}`}>{part}</Fragment>;
  });
};

const renderMessageContent = (content?: string) => {
  if (!content) return null;

  const normalized = normalizeLightMarkdown(content);
  const lines = normalized.split("\n");

  return lines.map((line, index) => (
    <p key={`line-${index}`} className={index === 0 ? "" : "mt-1"}>
      {renderInlineBold(line)}
    </p>
  ));
};

const isDirectMediaUrl = (value?: string) => {
  if (!value) return false;
  return /^(https?:\/\/|data:|blob:|\/)\S+/i.test(value);
};

const attachmentKeyOrUrl = (attachment: MessageAttachment) => {
  if (attachment.key) return attachment.key;
  if (!attachment.url) return "";
  return attachment.url;
};

const hasUrlInContent = (content?: string) =>
  /(?:https?:\/\/|www\.)\S+/i.test(String(content || ""));

const FORWARDED_MESSAGE_MARKER = "[chatmenow-forwarded]";

const parseForwardedMessageContent = (content?: string) => {
  const rawContent = String(content || "");
  if (!rawContent.startsWith(FORWARDED_MESSAGE_MARKER)) {
    return {
      isForwarded: false,
      displayContent: rawContent,
    };
  }

  return {
    isForwarded: true,
    displayContent: rawContent
      .slice(FORWARDED_MESSAGE_MARKER.length)
      .replace(/^\n+/, ""),
  };
};

const getForwardableAttachments = (attachments?: MessageAttachment[]) =>
  (attachments || []).filter((attachment) => {
    const source = String(attachment?.key || attachment?.url || "").trim();
    return Boolean(source);
  });

const isMessageForwardable = (message: Message) => {
  if (!message || message.isUnsent || message.senderSource === "ai") return false;

  const { displayContent } = parseForwardedMessageContent(message.content);
  const content = String(displayContent || "").trim();
  const attachments = getForwardableAttachments(message.attachments);

  return attachments.length > 0 || hasUrlInContent(content);
};

const getConversationForwardLabel = (
  conversation: any,
  currentUserId?: string,
): string => {
  const name = String(conversation?.name || "").trim();
  if (name) return name;

  if (conversation?.type === "group") return "Nhóm chat";
  if (conversation?.type === "private") {
    const members = Array.isArray(conversation?.members)
      ? conversation.members
      : [];
    const partner = members.find((member: any) => {
      const memberUserId =
        typeof member?.userId === "string"
          ? member.userId
          : member?.userId?._id || member?.userId?.id;
      return memberUserId && memberUserId !== currentUserId;
    });

    const partnerName = String(
      partner?.userId?.displayName ||
        partner?.displayName ||
        conversation?.partner?.displayName ||
        conversation?.otherUser?.displayName ||
        "",
    ).trim();

    return partnerName || "Bạn bè";
  }

  return "Cuộc trò chuyện";
};

const getReplyToMessageId = (value: unknown): string | undefined => {
  if (!value) return undefined;
  if (typeof value === "string") return value;

  const obj = value as { _id?: string; id?: string };
  return obj._id || obj.id;
};

const getReplyMessageFromPayload = (value: unknown): Message | undefined => {
  if (!value || typeof value === "string") return undefined;
  if (typeof value !== "object") return undefined;
  return value as Message;
};

const getReplyMessageFromSnapshot = (snapshot: unknown): Message | undefined => {
  if (!snapshot || typeof snapshot !== "object") return undefined;

  const raw = snapshot as {
    content?: string;
    type?: string;
    attachments?: MessageAttachment[];
  };

  return {
    id: "reply-preview",
    conversationId: "reply-preview",
    content: String(raw.content || ""),
    type: String(raw.type || "text"),
    attachments: Array.isArray(raw.attachments) ? raw.attachments : [],
    createdAt: new Date().toISOString(),
  };
};

function FriendCardBubble({
  attachment,
  isMe,
}: {
  attachment: MessageAttachment;
  isMe: boolean;
}) {
  const router = useRouter();
  const { mutate: sendFriendRequest, isPending: isSendingFriendRequest } =
    useSendFriendRequest();
  const card = decodeFriendCardPayload(attachment.url);
  const { data: ownerProfile, isLoading: isLoadingFriendState } =
    useGetFriendProfile(card?.userId || "");

  if (!card) {
    return null;
  }

  const isFriend = Boolean(ownerProfile?.isFriend);
  const canShowAddFriend = !isFriend && !isLoadingFriendState && !isMe;

  const handleOpenProfile = () => {
    router.push(card.profileUrl);
  };

  const handleAddFriend = (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    if (!card.userId || isSendingFriendRequest) return;

    sendFriendRequest(card.userId, {
      onSuccess: () => {
        router.push(card.profileUrl);
      },
    });
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={handleOpenProfile}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          handleOpenProfile();
        }
      }}
      className={`w-full max-w-[280px] rounded-2xl border p-3 text-left shadow-sm transition-transform hover:scale-[1.01] ${
        isMe
          ? "border-blue-400/40 bg-white/10 text-white"
          : "border-slate-200 bg-white text-slate-800"
      }`}
    >
      <div className="flex items-center gap-3">
        <PresignedAvatar
          avatarKey={card.avatar}
          displayName={card.displayName}
          className="h-12 w-12 shrink-0"
          fallbackClassName={isMe ? "bg-white/20 text-white" : "bg-slate-200 text-slate-600"}
        />
        <div className="min-w-0 flex-1">
          <div className={`truncate text-sm font-semibold ${isMe ? "text-white" : "text-slate-900"}`}>
            {card.displayName}
          </div>
          <div className={`truncate text-xs ${isMe ? "text-blue-100" : "text-slate-500"}`}>
            {card.email || "Danh thiếp"}
          </div>
        </div>
      </div>

      <div className="mt-3">
        {canShowAddFriend ? (
          <Button
            type="button"
            size="sm"
            className="w-full rounded-xl"
            onClick={handleAddFriend}
            disabled={isSendingFriendRequest}
          >
            {isSendingFriendRequest ? "Đang gửi..." : "Kết bạn"}
          </Button>
        ) : (
          <div
            className={`rounded-xl px-3 py-2 text-xs font-medium ${
              isMe
                ? "bg-white/10 text-blue-50"
                : "bg-slate-50 text-slate-600"
            }`}
          >
            Mở danh thiếp
          </div>
        )}
      </div>
    </div>
  );
}

function GroupCardBubble({
  attachment,
  isMe,
}: {
  attachment: MessageAttachment;
  isMe: boolean;
}) {
  const router = useRouter();
  const card = decodeGroupCardPayload(attachment.url);
  const [isCheckingMembership, setIsCheckingMembership] = useState(false);
  const [isJoiningGroup, setIsJoiningGroup] = useState(false);
  const [isMember, setIsMember] = useState<boolean | null>(null);
  const [requiresApproval, setRequiresApproval] = useState(false);

  if (!card) {
    return null;
  }

  useEffect(() => {
    let active = true;

    const run = async () => {
      try {
        setIsCheckingMembership(true);
        const info = await chatService.getGroupJoinInfo(card.conversationId);
        if (!active) return;
        setIsMember(Boolean(info.isMember));
        setRequiresApproval(Boolean(info.joinApprovalEnabled));
      } catch {
        if (!active) return;
        setIsMember(false);
        setRequiresApproval(false);
      } finally {
        if (active) {
          setIsCheckingMembership(false);
        }
      }
    };

    void run();

    return () => {
      active = false;
    };
  }, [card.conversationId]);

  const handleOpenGroup = () => {
    router.push(`/messages/${card.conversationId}`);
  };

  const handlePrimaryAction = async (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();

    if (isCheckingMembership || isJoiningGroup) return;

    if (isMember) {
      handleOpenGroup();
      return;
    }

    try {
      setIsJoiningGroup(true);
      const result = await chatService.joinGroupByLink(card.conversationId);
      if (result.pendingApproval) {
        toast.success("Đã gửi yêu cầu tham gia. Chờ admin duyệt.");
        return;
      }

      setIsMember(true);
      toast.success(
        result.alreadyMember ? "Bạn đã ở trong nhóm này" : "Gia nhập nhóm thành công",
      );
      router.push(`/messages/${card.conversationId}`);
    } catch (error: unknown) {
      const message =
        typeof error === "object" &&
        error !== null &&
        "response" in error &&
        typeof (error as { response?: { data?: { message?: string } } }).response
          ?.data?.message === "string"
          ? (error as { response?: { data?: { message?: string } } }).response?.data?.message
          : "Không thể gia nhập nhóm";
      toast.error(message);
    } finally {
      setIsJoiningGroup(false);
    }
  };

  const handleCopyGroupLink = async (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    if (typeof navigator === "undefined") return;

    try {
      const shareUrl = new URL(card.profileUrl, window.location.origin).toString();
      await navigator.clipboard.writeText(shareUrl);
      toast.success("Đã sao chép link nhóm");
    } catch {
      toast.error("Không thể sao chép link nhóm");
    }
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => {
        if (isMember) {
          handleOpenGroup();
        }
      }}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          if (isMember) {
            handleOpenGroup();
          }
        }
      }}
      className={`w-full max-w-[300px] rounded-2xl border p-3 text-left shadow-sm transition-transform hover:scale-[1.01] ${
        isMe
          ? "border-blue-400/40 bg-white/10 text-white"
          : "border-slate-200 bg-white text-slate-800"
      }`}
    >
      <div className="flex items-center gap-3">
        <PresignedAvatar
          avatarKey={card.avatar}
          displayName={card.displayName}
          className="h-12 w-12 shrink-0"
          fallbackClassName={isMe ? "bg-white/20 text-white" : "bg-slate-200 text-slate-600"}
        />
        <div className="min-w-0 flex-1">
          <div className={`truncate text-sm font-semibold ${isMe ? "text-white" : "text-slate-900"}`}>
            {card.displayName}
          </div>
          <div className={`truncate text-xs ${isMe ? "text-blue-100" : "text-slate-500"}`}>
            {card.memberCount ? `${card.memberCount} thành viên` : "Danh thiếp nhóm"}
          </div>
        </div>
      </div>

      <div className="mt-3 flex gap-2">
        <Button
          type="button"
          size="sm"
          className="flex-1 rounded-xl"
          onClick={handlePrimaryAction}
          disabled={isCheckingMembership || isJoiningGroup}
        >
          <Share2 className="mr-2 h-4 w-4" />
          {isCheckingMembership
            ? "Đang kiểm tra..."
            : isJoiningGroup
              ? "Đang gia nhập..."
              : isMember
                ? "Mở nhóm"
                : requiresApproval
                  ? "Gửi yêu cầu"
                  : "Gia nhập nhóm"}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="rounded-xl"
          onClick={handleCopyGroupLink}
        >
          <Copy className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

const WAVEFORM_BARS = [5, 10, 7, 13, 9, 15, 8, 12, 6, 11, 7, 14, 9, 10];
const AUDIO_WAVE_SCALE = 0.72;

const formatAudioDuration = (seconds: number) => {
  const safeSeconds = Number.isFinite(seconds) ? Math.max(0, seconds) : 0;
  const mins = Math.floor(safeSeconds / 60);
  const secs = Math.floor(safeSeconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
};

function AudioMessageBubble({ src, isMe }: { src: string; isMe: boolean }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onLoaded = () => {
      if (Number.isFinite(audio.duration)) {
        setDuration(audio.duration);
      }
    };

    const onTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };

    const onEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    audio.addEventListener("loadedmetadata", onLoaded);
    audio.addEventListener("timeupdate", onTimeUpdate);
    audio.addEventListener("ended", onEnded);

    return () => {
      audio.removeEventListener("loadedmetadata", onLoaded);
      audio.removeEventListener("timeupdate", onTimeUpdate);
      audio.removeEventListener("ended", onEnded);
    };
  }, []);

  useEffect(() => {
    const audio = audioRef.current;
    return () => {
      if (audio) {
        audio.pause();
      }
    };
  }, []);

  const togglePlay = async () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
      return;
    }

    try {
      await audio.play();
      setIsPlaying(true);
    } catch {
      setIsPlaying(false);
    }
  };

  const progressRatio = duration > 0 ? currentTime / duration : 0;
  const activeBars = Math.round(progressRatio * WAVEFORM_BARS.length);
  const bubbleWidth = Math.min(300, Math.max(170, 130 + duration * 4));

  return (
    <div
      className={`inline-flex items-center gap-1.5 rounded-2xl px-2.5 py-1.5 ${
        isMe ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-700"
      }`}
      style={{ width: `${bubbleWidth}px` }}
    >
      <button
        type="button"
        onClick={togglePlay}
        aria-label={isPlaying ? "Tạm dừng ghi âm" : "Phát ghi âm"}
        className={`inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full transition-colors ${
          isMe
            ? "bg-white/20 hover:bg-white/30"
            : "bg-slate-200 hover:bg-slate-300"
        }`}
      >
        {isPlaying ? (
          <Pause className="h-3 w-3" />
        ) : (
          <Play className="h-3 w-3" />
        )}
      </button>

      <div className="flex min-w-0 flex-1 items-end gap-0.5 h-4">
        {WAVEFORM_BARS.map((height, index) => {
          const isActive = index < activeBars;
          return (
            <span
              key={`wave-${index}`}
              className={`w-1 rounded-full transition-colors ${
                isMe
                  ? isActive
                    ? "bg-white"
                    : "bg-white/45"
                  : isActive
                    ? "bg-blue-500"
                    : "bg-slate-400"
              }`}
              style={{
                height: `${Math.max(3, Math.round(height * AUDIO_WAVE_SCALE))}px`,
              }}
            />
          );
        })}
      </div>

      <span
        className={`shrink-0 text-[10px] font-medium ${
          isMe ? "text-blue-100" : "text-slate-500"
        }`}
      >
        {formatAudioDuration(duration || currentTime)}
      </span>

      <audio ref={audioRef} src={src} preload="metadata" className="hidden" />
    </div>
  );
}

function MessageAttachmentItem({
  attachment,
  isMe,
}: {
  attachment: MessageAttachment;
  isMe: boolean;
}) {
  if (attachment.fileType === FRIEND_CARD_ATTACHMENT_TYPE || attachment.fileType === "contact-card") {
    return <FriendCardBubble attachment={attachment} isMe={isMe} />;
  }

  if (attachment.fileType === GROUP_CARD_ATTACHMENT_TYPE) {
    return <GroupCardBubble attachment={attachment} isMe={isMe} />;
  }

  const rawKeyOrUrl = attachmentKeyOrUrl(attachment);
  const direct = isDirectMediaUrl(rawKeyOrUrl);
  const { data: presigned } = usePresignedUrl(
    rawKeyOrUrl,
    Boolean(rawKeyOrUrl) && !direct,
  );

  const resolvedUrl = direct ? rawKeyOrUrl : (presigned?.viewUrl ?? "");
  const type = String(attachment.fileType || "").toLowerCase();
  const fileName = String(attachment.fileName || "").toLowerCase();
  const urlValue = String(resolvedUrl || "").toLowerCase();
  const isImageType =
    type === "image" ||
    type.startsWith("image/") ||
    /\.(png|jpe?g|gif|webp|bmp|svg)(\?|#|$)/i.test(fileName) ||
    /\.(png|jpe?g|gif|webp|bmp|svg)(\?|#|$)/i.test(urlValue);
  const isAudioType =
    type === "audio" ||
    type.startsWith("audio/") ||
    /\.(mp3|wav|ogg|m4a|aac|webm)(\?|#|$)/i.test(fileName) ||
    /\.(mp3|wav|ogg|m4a|aac|webm)(\?|#|$)/i.test(urlValue);
  const isVideoType =
    type === "video" ||
    type.startsWith("video/") ||
    /\.(mp4|mov|avi|mkv|webm|m4v)(\?|#|$)/i.test(fileName) ||
    /\.(mp4|mov|avi|mkv|webm|m4v)(\?|#|$)/i.test(urlValue);

  if (!resolvedUrl) {
    return (
      <div
        className={`rounded-xl px-3 py-2 text-xs ${
          isMe ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-500"
        }`}
      >
        Đang tải tệp...
      </div>
    );
  }

  if (isImageType) {
    return (
      <a href={resolvedUrl} target="_blank" rel="noreferrer" className="block">
        <Image
          src={resolvedUrl}
          alt={attachment.fileName || "image"}
          width={320}
          height={200}
          unoptimized
          className="h-auto w-full max-w-[260px] rounded-xl object-cover"
        />
      </a>
    );
  }

  if (isAudioType) {
    return <AudioMessageBubble src={resolvedUrl} isMe={isMe} />;
  }

  if (isVideoType) {
    return (
      <video
        controls
        src={resolvedUrl}
        className="h-auto w-full max-w-[260px] rounded-xl"
      />
    );
  }

  return (
    <a
      href={resolvedUrl}
      target="_blank"
      rel="noreferrer"
      className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-sm ${
        isMe
          ? "border-blue-600 bg-blue-600 text-white shadow-sm"
          : "border-slate-200 bg-slate-50 text-slate-700"
      }`}
    >
      <Paperclip className="h-4 w-4" />
      <span className="max-w-[190px] truncate">
        {attachment.fileName || "Tệp đính kèm"}
      </span>
    </a>
  );
}

const resolveTypeFromFile = (file: File): string => {
  const mime = file.type || "";
  if (mime.startsWith("image/")) return "image";
  if (mime.startsWith("audio/")) return "audio";
  if (mime.startsWith("video/")) return "video";
  return "file";
};

const resolveMessageTypeFromAttachment = (attachment: MessageAttachment): string => {
  const mime = String(attachment.fileType || "").toLowerCase();
  if (mime.startsWith("image/")) return "image";
  if (mime.startsWith("audio/")) return "audio";
  if (mime.startsWith("video/")) return "video";
  return "file";
};

const getSystemCallDescription = (msg: Message, status: string) => {
  if (status === "missed") return "Không được trả lời";
  if (status === "rejected") return "Cuộc gọi đã bị từ chối";

  return `Thời lượng ${formatCallDuration(msg.callInfo?.duration)}`;
};

const getSystemCallTime = (msg: Message) => {
  const value = msg.callInfo?.endedAt || msg.createdAt;

  return formatMessageClock(value);
};

const getMessageSenderId = (message: Message): string | undefined => {
  if (!message.senderId) return undefined;

  if (typeof message.senderId === "string") {
    return message.senderId;
  }

  return message.senderId?._id || message.senderId?.id;
};

const getConversationMemberUserId = (
  member: { userId?: string | { _id?: string; id?: string } },
): string | undefined => {
  if (!member?.userId) return undefined;
  if (typeof member.userId === "string") return member.userId;
  return member.userId._id || member.userId.id;
};

const buildReplyPreview = (message?: Message): string => {
  if (!message) return "Tin nhắn gốc không còn khả dụng";
  if (message.isUnsent || message.unsentAt) return "Tin nhắn đã được thu hồi";

  const { isForwarded, displayContent } = parseForwardedMessageContent(
    message.content,
  );
  const text = displayContent.trim();

  const attachmentLabels = (message.attachments || [])
    .slice(0, 2)
    .map((attachment) => {
      const normalized = String(attachment.fileType || "").toLowerCase();
      if (normalized.startsWith("image")) return "[Hình ảnh]";
      if (normalized.startsWith("video")) return "[Video]";
      if (normalized.startsWith("audio")) return "[Ghi âm]";
      return `[Tệp] ${attachment.fileName || "Đính kèm"}`;
    })
    .filter(Boolean);

  if (text && attachmentLabels.length > 0) {
    const extraCount = (message.attachments || []).length - attachmentLabels.length;
    const extraSuffix = extraCount > 0 ? ` +${extraCount}` : "";
    return `${text} • ${attachmentLabels.join(", ")}${extraSuffix}`;
  }

  if (text) return text;

  if (attachmentLabels.length > 0) {
    const extraCount = (message.attachments || []).length - attachmentLabels.length;
    const extraSuffix = extraCount > 0 ? ` +${extraCount}` : "";
    const attachmentText = `${attachmentLabels.join(", ")}${extraSuffix}`;

    return isForwarded
      ? `[Tin nhắn chuyển tiếp] • ${attachmentText}`
      : attachmentText;
  }

  if (isForwarded) return "[Tin nhắn chuyển tiếp]";

  const attachment = message.attachments?.[0];
  if (!attachment) return "Tin nhắn";

  const normalized = String(attachment.fileType || "").toLowerCase();
  if (normalized.startsWith("image")) return "[Hình ảnh]";
  if (normalized.startsWith("video")) return "[Video]";
  if (normalized.startsWith("audio")) return "[Ghi âm]";
  return `[Tệp] ${attachment.fileName || "Đính kèm"}`;
};

const isAiConversation = (conversation: any): boolean => {
  if (!conversation) return false;
  const type = String(conversation.type || "").toLowerCase();
  return (
    type === "ai" ||
    Boolean(conversation.isAI) ||
    Boolean(conversation.isAi) ||
    Boolean(conversation.isAiAssistant)
  );
};

function UnreadSummaryBanner({
  unreadCount,
  isGroupConversation,
  onOpenSummary,
  onMarkAsRead,
  isMarkingRead,
}: {
  unreadCount: number;
  isGroupConversation: boolean;
  onOpenSummary: () => void;
  onMarkAsRead: () => void;
  isMarkingRead: boolean;
}) {
  return (
    <div className="rounded-3xl border border-violet-200/80 bg-gradient-to-r from-violet-50 via-fuchsia-50 to-amber-50 px-4 py-3 shadow-sm">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-violet-600">
            DanhAI
          </div>
          <div className="mt-1 text-sm font-semibold text-slate-900">
            {unreadCount} tin nhắn chưa đọc
          </div>
          <div className="mt-1 text-xs leading-5 text-slate-600">
            {isGroupConversation
              ? "Mở tóm tắt AI cho nhóm này hoặc đánh dấu đã đọc sau khi bạn xem xong."
              : "Đánh dấu đã đọc để đồng bộ trạng thái cho cuộc trò chuyện này."}
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {isGroupConversation && (
            <Button size="sm" onClick={onOpenSummary}>
              Tóm tắt bằng DanhAI
            </Button>
          )}
          <Button size="sm" variant="outline" onClick={onMarkAsRead} disabled={isMarkingRead}>
            {isMarkingRead ? "Đang cập nhật..." : "Đánh dấu đã đọc"}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function ChatDetailClient() {
  const { id } = useParams();
  const router = useRouter();
  const conversationId = id as string;
  const user = useAuthStore((state) => state.user);

  // Fallback cho userId
  const currentUserId = user?.id || user?._id;

  // Lấy conversation và messages riêng biệt
  const { data: conversationFromDetail } = useConversation(conversationId);
  const { data: aiConversationData } = useAiConversation();
  const { data: conversationsData } = useConversations();
  const {
    data: messagesData,
    isLoading,
    error,
  } = useMessages(conversationId, {
    limit: 20,
  });
  const { data: pinnedMessagesData } = usePinnedMessages(conversationId);
  const aiConversation =
    aiConversationData?.conversation?.id === conversationId
      ? aiConversationData.conversation
      : undefined;
  const conversation = conversationFromDetail || aiConversation;
  const aiMode = isAiConversation(conversation);
  const isConversationBlocked = Boolean(
    !aiMode && (conversation as any)?.isBlocked,
  );
  const blockedMessage = (conversation as any)?.blockedByMe
    ? "Bạn đã chặn người này. Mở chặn để tiếp tục trò chuyện."
    : (conversation as any)?.blockedByOther
      ? "Bạn không thể chat vì người này đã chặn bạn."
      : "Cuộc trò chuyện đang bị chặn.";
  const messages =
    messagesData?.messages?.length || !aiMode
      ? messagesData?.messages || []
      : aiConversationData?.messages || [];
  const shouldShowMessageError = Boolean(error) && messages.length === 0;
  const errorStatusCode =
    typeof (error as { response?: { status?: number } } | null)?.response
      ?.status === "number"
      ? ((error as { response?: { status?: number } }).response?.status as number)
      : undefined;
  const shouldShowJoinGroupPanel =
    shouldShowMessageError && (errorStatusCode === 403 || errorStatusCode === 404);
  const [joinGroupInfo, setJoinGroupInfo] = useState<{
    conversationId: string;
    name: string;
    groupAvatar?: string;
    memberCount: number;
    isMember: boolean;
    joinApprovalEnabled: boolean;
  } | null>(null);
  const [isLoadingJoinGroupInfo, setIsLoadingJoinGroupInfo] = useState(false);
  const [isJoiningGroup, setIsJoiningGroup] = useState(false);
  const [summaryOpen, setSummaryOpen] = useState(false);
  const { mutate: markConversationAsRead, isPending: isMarkingConversationAsRead } =
    useMarkConversationAsRead();

  useEffect(() => {
    if (!shouldShowJoinGroupPanel || !conversationId) return;

    let active = true;

    const run = async () => {
      try {
        setIsLoadingJoinGroupInfo(true);
        const info = await chatService.getGroupJoinInfo(conversationId);
        if (!active) return;

        setJoinGroupInfo({
          conversationId: info.conversationId,
          name: info.name,
          groupAvatar: info.groupAvatar,
          memberCount: info.memberCount,
          isMember: info.isMember,
          joinApprovalEnabled: info.joinApprovalEnabled,
        });
      } catch {
        if (!active) return;
        setJoinGroupInfo(null);
      } finally {
        if (active) {
          setIsLoadingJoinGroupInfo(false);
        }
      }
    };

    void run();

    return () => {
      active = false;
    };
  }, [conversationId, shouldShowJoinGroupPanel]);

  const handleJoinGroupFromLink = useCallback(async () => {
    if (!conversationId || isJoiningGroup) return;

    try {
      setIsJoiningGroup(true);
      const result = await chatService.joinGroupByLink(conversationId);
      if (result.pendingApproval) {
        toast.success("Đã gửi yêu cầu tham gia. Chờ admin duyệt.");
        return;
      }

      setJoinGroupInfo((current) =>
        current ? { ...current, isMember: true } : current,
      );
      toast.success(
        result.alreadyMember ? "Bạn đã ở trong nhóm này" : "Gia nhập nhóm thành công",
      );
      router.push(`/messages/${conversationId}`);
    } catch (joinError: unknown) {
      const message =
        typeof joinError === "object" &&
        joinError !== null &&
        "response" in joinError &&
        typeof (joinError as { response?: { data?: { message?: string } } }).response
          ?.data?.message === "string"
          ? (joinError as { response?: { data?: { message?: string } } }).response?.data?.message
          : "Không thể gia nhập nhóm";
      toast.error(message);
    } finally {
      setIsJoiningGroup(false);
    }
  }, [conversationId, isJoiningGroup, router]);

  // Hook tập trung logic phân biệt private/group - tự động fetch partner nếu cần
  const {
    displayName: conversationName,
    avatar: conversationAvatar,
    isOnline: isOnlineStatus,
    statusText,
  } = useConversationDisplay(conversation, currentUserId);

  const currentConversationMember = conversation?.members?.find((member: { userId: string | { _id?: string; id?: string }; lastReadAt?: Date }) => {
    const memberUserId =
      typeof member.userId === "string"
        ? member.userId
        : (member.userId as any)?._id || (member.userId as any)?.id;
    return memberUserId === currentUserId;
  });

  const currentLastReadAt = currentConversationMember?.lastReadAt
    ? new Date(currentConversationMember.lastReadAt as any)
    : undefined;

  const unreadCount = useMemo(() => {
    if (!messages.length) {
      return Number(conversation?.unreadCount || 0);
    }

    const fallbackCount = messages.filter((message) => {
      const messageSenderId = getMessageSenderId(message);
      const createdAt = new Date(message.createdAt);

      if (Number.isNaN(createdAt.getTime())) {
        return false;
      }

      if (message.type === "system") {
        return false;
      }

      if (messageSenderId && messageSenderId === currentUserId) {
        return false;
      }

      if (!currentLastReadAt) {
        return true;
      }

      return createdAt.getTime() > currentLastReadAt.getTime();
    }).length;

    return Number(conversation?.unreadCount ?? fallbackCount);
  }, [conversation?.unreadCount, currentLastReadAt, currentUserId, messages]);

  const firstUnreadIndex = useMemo(() => {
    if (!messages.length || unreadCount <= 0) {
      return -1;
    }

    return messages.findIndex((message) => {
      const messageSenderId = getMessageSenderId(message);
      const createdAt = new Date(message.createdAt);

      if (Number.isNaN(createdAt.getTime())) {
        return false;
      }

      if (message.type === "system") {
        return false;
      }

      if (messageSenderId && messageSenderId === currentUserId) {
        return false;
      }

      if (!currentLastReadAt) {
        return true;
      }

      return createdAt.getTime() > currentLastReadAt.getTime();
    });
  }, [currentLastReadAt, currentUserId, messages, unreadCount]);

  const isGroupConversation = conversation?.type === "group";
  const isCurrentUserGroupAdmin = useMemo(() => {
    if (!isGroupConversation || !currentUserId) return false;

    const members = (conversation?.members || []) as Array<{
      userId?: string | { _id?: string; id?: string };
      role?: string;
    }>;
    const currentMember = members.find(
      (member) => getConversationMemberUserId(member) === currentUserId,
    );

    return currentMember?.role === "admin";
  }, [conversation?.members, currentUserId, isGroupConversation]);

  const { mutateAsync: sendMessage, isPending: isSendingMessage } =
    useSendMessage();
  const { mutateAsync: sendAiMessage, isPending: isSendingAiMessage } =
    useSendAiMessage();
  const { mutate: unsendMessage, isPending: isUnsendPending } =
    useUnsendMessage();
  const { mutate: pinMessage, isPending: isPinPending } = usePinMessage();
  const { mutate: unpinMessage, isPending: isUnpinPending } = useUnpinMessage();
  const { mutate: reactToMessage } = useReactToMessage();
  const { mutate: deleteMessageForMe, isPending: isDeletePending } =
    useDeleteMessageForMe();
  const queryClient = useQueryClient();
  const { socket, isConnected } = useSocket();
  const scrollRef = useRef<HTMLDivElement>(null);
  const longPressTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const highlightTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const messageElementMapRef = useRef<Record<string, HTMLDivElement | null>>({});
  const shouldAutoScrollRef = useRef(true);
  const hasInitializedScrollRef = useRef(false);
  const beforeIdRef = useRef<string | null>(null);
  const hasMoreRef = useRef(true);
  const isLoadingOlderRef = useRef(false);
  const isMountedRef = useRef(true);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [isLoadingOlder, setIsLoadingOlder] = useState(false);
  const [isSendingAttachment, setIsSendingAttachment] = useState(false);
  const [uploadProgressPercent, setUploadProgressPercent] = useState(0);
  const [uploadProgressLabel, setUploadProgressLabel] = useState("");
  const [activeMessageActionsId, setActiveMessageActionsId] = useState<
    string | null
  >(null);
  const [reactionPickerMessageId, setReactionPickerMessageId] = useState<string | null>(null);
  const reactionPickerTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [highlightedMessageId, setHighlightedMessageId] = useState<
    string | null
  >(null);
  const [pendingFocusMessageId, setPendingFocusMessageId] = useState<
    string | null
  >(null);
  const [replyingToMessageId, setReplyingToMessageId] = useState<string | null>(
    null,
  );
  const [forwardDialogOpen, setForwardDialogOpen] = useState(false);
  const [forwardSearchQuery, setForwardSearchQuery] = useState("");
  const [selectedForwardMessageId, setSelectedForwardMessageId] = useState<
    string | null
  >(null);
  const [selectedForwardConversationId, setSelectedForwardConversationId] =
    useState<string>("");
  const [isForwarding, setIsForwarding] = useState(false);
  const [backgroundKey, setBackgroundKey] =
    useState<ChatBackgroundKey>("default");

  const waitForNextFrame = useCallback(
    () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve())),
    [],
  );

  const getMessageId = useCallback((message: Message): string | undefined => {
    const rawId = message.id || message._id;
    if (!rawId) return undefined;
    return String(rawId);
  }, []);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      if (highlightTimeoutRef.current) {
        clearTimeout(highlightTimeoutRef.current);
        highlightTimeoutRef.current = null;
      }
    };
  }, []);

  const focusMessageById = useCallback((messageId: string) => {
    const element = messageElementMapRef.current[messageId];
    if (!element) return false;

    element.scrollIntoView({ behavior: "smooth", block: "center" });
    setHighlightedMessageId(messageId);

    if (highlightTimeoutRef.current) {
      clearTimeout(highlightTimeoutRef.current);
    }

    highlightTimeoutRef.current = setTimeout(() => {
      setHighlightedMessageId((current) =>
        current === messageId ? null : current,
      );
      highlightTimeoutRef.current = null;
    }, 1800);

    return true;
  }, []);

  useEffect(() => {
    const handleFocusMessage = (event: Event) => {
      const customEvent = event as CustomEvent<{
        conversationId?: string;
        messageId?: string;
      }>;

      const targetConversationId = customEvent.detail?.conversationId;
      const targetMessageId = customEvent.detail?.messageId;

      if (!targetMessageId) return;
      if (targetConversationId && targetConversationId !== conversationId) return;

      setPendingFocusMessageId(targetMessageId);
    };

    window.addEventListener("chat:focus-message", handleFocusMessage);

    return () => {
      window.removeEventListener("chat:focus-message", handleFocusMessage);
    };
  }, [conversationId]);

  useEffect(() => {
    if (!pendingFocusMessageId) return;

    const hasMessage = messages.some(
      (message) => getMessageId(message) === pendingFocusMessageId,
    );
    if (!hasMessage) return;

    const frameId = requestAnimationFrame(() => {
      if (focusMessageById(pendingFocusMessageId)) {
        setPendingFocusMessageId(null);
      }
    });

    return () => {
      cancelAnimationFrame(frameId);
    };
  }, [focusMessageById, getMessageId, messages, pendingFocusMessageId]);

  const messageMapById = useMemo(() => {
    const map = new Map<string, Message>();
    messages.forEach((message) => {
      const id = getMessageId(message);
      if (id) {
        map.set(id, message);
      }
    });
    return map;
  }, [getMessageId, messages]);

  const latestPinnedMessage = useMemo(() => {
    return pinnedMessagesData?.latestPinnedMessage || null;
  }, [pinnedMessagesData?.latestPinnedMessage]);

  const pinnedMessageIdSet = useMemo(() => {
    const set = new Set<string>();
    (pinnedMessagesData?.pinnedMessages || []).forEach((item) => {
      const id = String(item?.messageId || item?.message?.id || item?.message?._id || "");
      if (id) {
        set.add(id);
      }
    });
    return set;
  }, [pinnedMessagesData?.pinnedMessages]);

  const replyPreviewText = useMemo(() => {
    if (!replyingToMessageId) return "";
    return buildReplyPreview(messageMapById.get(replyingToMessageId));
  }, [messageMapById, replyingToMessageId]);

  const selectedForwardMessage = useMemo(() => {
    if (!selectedForwardMessageId) return undefined;
    return messageMapById.get(selectedForwardMessageId);
  }, [messageMapById, selectedForwardMessageId]);

  const forwardTargetConversations = useMemo(() => {
    const list = (conversationsData?.conversations || []).filter(
      (item: any) => {
        const id = String(item?.id || item?._id || "");
        if (!id || id === conversationId) return false;
        if (isAiConversation(item)) return false;
        if (item?.isBlocked) return false;
        return true;
      },
    );

    const normalizedQuery = forwardSearchQuery.trim().toLowerCase();
    if (!normalizedQuery) return list;

    return list.filter((item: any) =>
      getConversationForwardLabel(item, currentUserId)
        .toLowerCase()
        .includes(normalizedQuery),
    );
  }, [conversationId, conversationsData?.conversations, currentUserId, forwardSearchQuery]);

  useEffect(() => {
    const oldestMessage = messages[0];
    beforeIdRef.current = oldestMessage
      ? getMessageId(oldestMessage) || null
      : null;

    const hasMoreFromApi =
      messagesData?.hasMore ?? messagesData?.pagination?.hasMore;
    if (typeof hasMoreFromApi === "boolean") {
      hasMoreRef.current = hasMoreFromApi;
    }

    const nextCursor =
      messagesData?.nextCursor ?? messagesData?.pagination?.nextCursor;
    if (hasMoreRef.current === false || nextCursor === null) {
      hasMoreRef.current = false;
    } else if (typeof nextCursor === "string" && nextCursor.length > 0) {
      hasMoreRef.current = true;
      beforeIdRef.current = nextCursor;
    } else if (typeof hasMoreFromApi !== "boolean") {
      hasMoreRef.current = messages.length >= 20;
    }
  }, [messages, messagesData, getMessageId]);

  useEffect(() => {
    hasMoreRef.current = true;
    isLoadingOlderRef.current = false;
    setIsLoadingOlder(false);
    beforeIdRef.current = null;
  }, [conversationId]);

  useEffect(() => {
    if (!conversationId || typeof window === "undefined") {
      setBackgroundKey("default");
      return;
    }

    const saved = localStorage.getItem(
      `chat-background:${conversationId}`,
    ) as ChatBackgroundKey | null;

    if (saved && saved in CHAT_BACKGROUND_CLASS) {
      setBackgroundKey(saved);
    } else {
      setBackgroundKey("default");
    }
  }, [conversationId]);

  useEffect(() => {
    const handleBackgroundChange = (event: Event) => {
      const customEvent = event as CustomEvent<{
        conversationId?: string;
        background?: ChatBackgroundKey;
      }>;

      const targetConversationId = customEvent.detail?.conversationId;
      const background = customEvent.detail?.background;

      if (
        targetConversationId === conversationId &&
        background &&
        background in CHAT_BACKGROUND_CLASS
      ) {
        setBackgroundKey(background);
      }
    };

    window.addEventListener("chat:background-change", handleBackgroundChange);

    return () => {
      window.removeEventListener(
        "chat:background-change",
        handleBackgroundChange,
      );
    };
  }, [conversationId]);

  const loadOlderMessages = useCallback(async () => {
    const beforeId = beforeIdRef.current;
    if (
      !conversationId ||
      !beforeId ||
      !hasMoreRef.current ||
      isLoadingOlderRef.current
    ) {
      return;
    }

    const viewport = scrollRef.current?.querySelector<HTMLDivElement>(
      "[data-radix-scroll-area-viewport]",
    );
    if (!viewport) return;

    isLoadingOlderRef.current = true;
    setIsLoadingOlder(true);

    const previousHeight = viewport.scrollHeight;
    const previousTop = viewport.scrollTop;

    try {
      const response = await chatService.getMessages(conversationId, {
        limit: 20,
        beforeId,
      });

      const olderMessages = response.messages || [];
      if (olderMessages.length === 0) {
        hasMoreRef.current = false;
        queryClient.setQueryData<MessagesResponse>(
          ["messages", conversationId],
          (old) => {
            if (!old) return old;

            return {
              ...old,
              messages: old.messages || [],
              hasMore: false,
              nextCursor: null,
              pagination: {
                ...(old.pagination || {}),
                hasMore: false,
                nextCursor: null,
              },
            };
          },
        );
        return;
      }

      queryClient.setQueryData<MessagesResponse>(
        ["messages", conversationId],
        (old) => {
          const existing = old?.messages || [];
          const existingIds = new Set(
            existing
              .map((message) => getMessageId(message))
              .filter((id): id is string => Boolean(id)),
          );

          const prepend = olderMessages.filter((message) => {
            const id = getMessageId(message);
            return !!id && !existingIds.has(id);
          });

          return {
            ...(old || {}),
            messages: [...prepend, ...existing],
            hasMore: response.hasMore,
            nextCursor: response.nextCursor,
            pagination: {
              ...(response.pagination || {}),
              hasMore: response.hasMore ?? response.pagination?.hasMore,
              nextCursor:
                response.nextCursor ?? response.pagination?.nextCursor,
            },
          };
        },
      );

      const hasMoreFromApi = response.hasMore ?? response.pagination?.hasMore;
      const responseCursor =
        response.nextCursor ?? response.pagination?.nextCursor;
      if (hasMoreFromApi === false || responseCursor === null) {
        hasMoreRef.current = false;
      } else if (
        typeof responseCursor === "string" &&
        responseCursor.length > 0
      ) {
        hasMoreRef.current = true;
        beforeIdRef.current = responseCursor;
      } else {
        const oldestLoaded = olderMessages[0];
        const oldestLoadedId = oldestLoaded ? getMessageId(oldestLoaded) : null;
        beforeIdRef.current = oldestLoadedId || null;
        hasMoreRef.current = olderMessages.length >= 20;
      }

      requestAnimationFrame(() => {
        const currentViewport =
          scrollRef.current?.querySelector<HTMLDivElement>(
            "[data-radix-scroll-area-viewport]",
          );
        if (!currentViewport) return;

        const heightDelta = currentViewport.scrollHeight - previousHeight;
        currentViewport.scrollTop = previousTop + heightDelta;
      });
    } finally {
      isLoadingOlderRef.current = false;
      if (isMountedRef.current) {
        setIsLoadingOlder(false);
      }
    }
  }, [conversationId, queryClient, getMessageId]);

  const focusReplyTargetMessage = useCallback(
    async (targetMessageId: string) => {
      if (!targetMessageId) return;

      if (focusMessageById(targetMessageId)) return;

      let attempt = 0;
      const maxAttempts = 8;

      while (attempt < maxAttempts && hasMoreRef.current) {
        await loadOlderMessages();
        await waitForNextFrame();

        if (focusMessageById(targetMessageId)) {
          return;
        }

        attempt += 1;
      }

      setPendingFocusMessageId(targetMessageId);
    },
    [focusMessageById, loadOlderMessages, waitForNextFrame],
  );

  useEffect(() => {
    let frameId: number | null = null;
    let cleanupScroll: (() => void) | null = null;
    let disposed = false;

    const attachScrollListener = () => {
      if (disposed) return;

      const viewport = scrollRef.current?.querySelector<HTMLDivElement>(
        "[data-radix-scroll-area-viewport]",
      );

      if (!viewport) {
        frameId = requestAnimationFrame(attachScrollListener);
        return;
      }

      const handleScroll = () => {
        if (viewport.scrollTop <= 40) {
          void loadOlderMessages();
        }

        const distanceFromBottom =
          viewport.scrollHeight - viewport.scrollTop - viewport.clientHeight;
        shouldAutoScrollRef.current = distanceFromBottom < 120;
      };

      handleScroll();
      viewport.addEventListener("scroll", handleScroll, { passive: true });

      cleanupScroll = () => {
        viewport.removeEventListener("scroll", handleScroll);
      };
    };

    frameId = requestAnimationFrame(attachScrollListener);

    return () => {
      disposed = true;
      if (frameId !== null) {
        cancelAnimationFrame(frameId);
      }
      cleanupScroll?.();
    };
  }, [conversationId, loadOlderMessages, messages.length]);

  useEffect(() => {
    hasInitializedScrollRef.current = false;
    shouldAutoScrollRef.current = true;
  }, [conversationId]);

  useEffect(() => {
    const viewport = scrollRef.current?.querySelector<HTMLDivElement>(
      "[data-radix-scroll-area-viewport]",
    );
    if (!viewport || messages.length === 0) return;

    const behavior = hasInitializedScrollRef.current ? "smooth" : "auto";

    if (shouldAutoScrollRef.current || !hasInitializedScrollRef.current) {
      viewport.scrollTo({ top: viewport.scrollHeight, behavior });
      hasInitializedScrollRef.current = true;
      shouldAutoScrollRef.current = true;
    }
  }, [messages]);

  useEffect(() => {
    if (!socket.current || !conversationId || aiMode) return;

    socket.current.emit("joinConversation", conversationId);

    return () => {
      socket.current?.emit("leaveConversation", conversationId);
    };
  }, [isConnected, conversationId, socket, aiMode]);

  useEffect(() => {
    if (!socket.current || !conversationId || aiMode) return;

    const handleUserTyping = ({
      userId,
      displayName,
    }: {
      userId: string;
      displayName: string;
    }) => {
      if (userId !== user?.id) {
        setTypingUsers((prev) => {
          if (!prev.includes(displayName)) return [...prev, displayName];
          return prev;
        });
      }
    };

    const handleUserStopTyping = ({ userId }: { userId: string }) => {
      setTypingUsers((prev) => prev.filter((name) => name !== userId));
    };

    socket.current.on("userTyping", handleUserTyping);
    socket.current.on("userStopTyping", handleUserStopTyping);

    return () => {
      socket.current?.off("userTyping", handleUserTyping);
      socket.current?.off("userStopTyping", handleUserStopTyping);
    };
  }, [isConnected, conversationId, user, aiMode]);

  useEffect(() => {
    if (!socket.current || !conversationId) return;

    const handlePinnedUpdated = (payload: { conversationId?: string }) => {
      if (!payload?.conversationId || payload.conversationId !== conversationId) {
        return;
      }

      queryClient.invalidateQueries({
        queryKey: ["pinned-messages", conversationId],
      });
    };

    socket.current.on("conversation:pinned-updated", handlePinnedUpdated);

    return () => {
      socket.current?.off("conversation:pinned-updated", handlePinnedUpdated);
    };
  }, [conversationId, queryClient, socket]);

  useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.closest("[data-message-action-scope='true']")) {
        return;
      }

      setActiveMessageActionsId(null);
    };

    document.addEventListener("pointerdown", handlePointerDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
    };
  }, []);

  useEffect(() => {
    setActiveMessageActionsId(null);
    setReplyingToMessageId(null);
  }, [conversationId]);

  useEffect(() => {
    if (forwardDialogOpen) return;
    setForwardSearchQuery("");
    setSelectedForwardConversationId("");
    setSelectedForwardMessageId(null);
    setIsForwarding(false);
  }, [forwardDialogOpen]);

  const clearLongPressTimer = useCallback(() => {
    if (longPressTimeoutRef.current) {
      clearTimeout(longPressTimeoutRef.current);
      longPressTimeoutRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      clearLongPressTimer();
    };
  }, [clearLongPressTimer]);

  const handleMessageTouchStart = useCallback(
    (messageId?: string, canShowActions?: boolean) => {
      clearLongPressTimer();
      if (!messageId || !canShowActions) return;

      longPressTimeoutRef.current = setTimeout(() => {
        setActiveMessageActionsId(messageId);
      }, 450);
    },
    [clearLongPressTimer],
  );

  const handleSendMessage = async (text: string) => {
    if (!text.trim()) return;

    if (isConversationBlocked) {
      toast.error(blockedMessage);
      return;
    }

    if (aiMode) {
      await sendAiMessage({
        conversationId,
        content: text,
      });
      setReplyingToMessageId(null);
      return;
    }

    await sendMessage({
      conversationId,
      content: text,
      type: "text",
      replyToMessageId: replyingToMessageId || undefined,
    });
    setReplyingToMessageId(null);
  };

  const openForwardDialog = useCallback((messageId?: string) => {
    if (!messageId) return;
    setSelectedForwardMessageId(messageId);
    setSelectedForwardConversationId("");
    setForwardSearchQuery("");
    setForwardDialogOpen(true);
    setActiveMessageActionsId(null);
  }, []);

  const handleForwardMessage = useCallback(async () => {
    if (!selectedForwardMessage || !selectedForwardConversationId) return;

    if (!isMessageForwardable(selectedForwardMessage)) {
      toast.error("Chỉ hỗ trợ chuyển tiếp link, tệp hoặc hình ảnh");
      return;
    }

    const attachments = getForwardableAttachments(selectedForwardMessage.attachments);
    const { displayContent } = parseForwardedMessageContent(
      selectedForwardMessage.content,
    );
    const content = String(displayContent || "").trim();
    const canForwardLinkOnly = hasUrlInContent(content);

    if (attachments.length === 0 && !canForwardLinkOnly) {
      toast.error("Chỉ hỗ trợ chuyển tiếp link, tệp hoặc hình ảnh");
      return;
    }

    const inferredType =
      selectedForwardMessage.type && selectedForwardMessage.type !== "text"
        ? selectedForwardMessage.type
        : attachments.length > 0
          ? resolveMessageTypeFromAttachment(attachments[0])
          : "text";

    setIsForwarding(true);
    try {
      const forwardedContent = content
        ? `${FORWARDED_MESSAGE_MARKER}\n${content}`
        : FORWARDED_MESSAGE_MARKER;

      await sendMessage({
        conversationId: selectedForwardConversationId,
        content: forwardedContent,
        type: inferredType,
        attachments,
      });

      setForwardDialogOpen(false);
      toast.success("Đã chuyển tiếp tin nhắn");
    } catch (error: any) {
      toast.error(
        error?.response?.data?.message || "Không thể chuyển tiếp tin nhắn",
      );
    } finally {
      setIsForwarding(false);
    }
  }, [selectedForwardConversationId, selectedForwardMessage, sendMessage]);

  const handleSendAttachments = useCallback(
    async (files: File[]) => {
      if (!files.length || !conversationId) return;

      if (isConversationBlocked) {
        toast.error(blockedMessage);
        return;
      }

      if (aiMode) {
        toast.info("Đoạn chat AI hiện chỉ hỗ trợ tin nhắn văn bản");
        return;
      }

      setIsSendingAttachment(true);
      setUploadProgressPercent(0);
      try {
        for (let index = 0; index < files.length; index += 1) {
          const file = files[index];
          setUploadProgressLabel(
            `Đang tải ${index + 1}/${files.length}: ${file.name}`,
          );

          const presign = await chatService.createChatUploadPresignPut({
            fileName: file.name,
            contentType: file.type || "application/octet-stream",
            fileSize: file.size,
          });

          await chatService.uploadToPresignedUrl(
            presign.uploadUrl,
            file,
            (fileProgress) => {
              const overall = Math.round(
                ((index + fileProgress / 100) / files.length) * 100,
              );
              setUploadProgressPercent(overall);
            },
          );

          const fileType =
            file.type || presign.contentType || "application/octet-stream";
          const messageType = resolveTypeFromFile(file);

          await sendMessage({
            conversationId,
            content: "",
            type: messageType,
            replyToMessageId: replyingToMessageId || undefined,
            attachments: [
              {
                key: presign.key,
                fileType,
                fileName: file.name,
                fileSize: file.size,
              },
            ],
          });
        }
        setReplyingToMessageId(null);
      } catch (error: unknown) {
        toast.error(
          (error as { response?: { data?: { message?: string } } })?.response
            ?.data?.message || "Không thể gửi tệp đính kèm",
        );
      } finally {
        setUploadProgressPercent(0);
        setUploadProgressLabel("");
        setIsSendingAttachment(false);
      }
    },
    [aiMode, blockedMessage, conversationId, isConversationBlocked, sendMessage],
  );

  const handleTyping = () => {
    if (aiMode) return;
    if (socket.current && conversationId) {
      socket.current.emit("typing", {
        conversationId,
        userId: user?.id,
        displayName: user?.displayName,
      });
    }
  };

  const handleStopTyping = () => {
    if (aiMode) return;
    if (socket.current && conversationId) {
      socket.current.emit("stopTyping", { conversationId, userId: user?.id });
    }
  };

  return (
    <div className="relative flex flex-col w-full h-full min-h-0 overflow-hidden bg-white">
      <ChatHeader
        name={conversationName}
        isOnline={isOnlineStatus}
        avatar={conversationAvatar}
        statusText={statusText}
        summaryOpen={summaryOpen}
        onSummaryOpenChange={setSummaryOpen}
      />

      <ScrollArea
        className={`flex-1 min-h-0 ${CHAT_BACKGROUND_CLASS[backgroundKey]}`}
        ref={scrollRef}
      >
        <div className="w-full max-w-[1240px] px-3 py-4 md:px-6 md:py-6 xl:px-10 mx-auto">
          <div className="flex flex-col w-full gap-3.5 pb-4">
            {latestPinnedMessage && (
              <button
                type="button"
                onClick={() => {
                  const pinnedId = String(
                    latestPinnedMessage.id || latestPinnedMessage._id || "",
                  );
                  if (!pinnedId) return;
                  focusMessageById(pinnedId);
                }}
                className="flex items-start gap-2 rounded-2xl border border-amber-200 bg-amber-50/80 px-3 py-2 text-left shadow-sm transition hover:bg-amber-100/80"
              >
                <Pin className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                <div className="min-w-0">
                  <div className="text-[11px] font-semibold uppercase tracking-wide text-amber-700">
                    Tin ghim mới nhất
                  </div>
                  <div className="truncate text-sm text-slate-700">
                    {buildReplyPreview(latestPinnedMessage)}
                  </div>
                </div>
              </button>
            )}
            {isLoading ? (
              <MessageSkeleton />
            ) : shouldShowMessageError ? (
              shouldShowJoinGroupPanel ? (
                <div className="mx-auto w-full max-w-md rounded-3xl border border-slate-200 bg-white px-5 py-5 text-center shadow-sm">
                  <div className="text-sm font-semibold text-slate-900">
                    {joinGroupInfo?.name || "Nhóm chat"}
                  </div>
                  <div className="mt-1 text-xs text-slate-500">
                    {isLoadingJoinGroupInfo
                      ? "Đang kiểm tra trạng thái thành viên..."
                      : joinGroupInfo
                        ? `${joinGroupInfo.memberCount} thành viên`
                        : "Bạn chưa thể xem nội dung nhóm này"}
                  </div>

                  <div className="mt-4 flex justify-center">
                    <Button
                      type="button"
                      onClick={() => {
                        if (joinGroupInfo?.isMember) {
                          router.push(`/messages/${conversationId}`);
                          return;
                        }
                        void handleJoinGroupFromLink();
                      }}
                      disabled={isLoadingJoinGroupInfo || isJoiningGroup}
                    >
                      {isLoadingJoinGroupInfo
                        ? "Đang kiểm tra..."
                        : isJoiningGroup
                          ? "Đang gia nhập..."
                          : joinGroupInfo?.isMember
                            ? "Vào nhóm"
                            : joinGroupInfo?.joinApprovalEnabled
                              ? "Gửi yêu cầu tham gia"
                              : "Gia nhập nhóm"}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="py-8 text-center text-slate-500">
                  Không thể tải tin nhắn
                </div>
              )
            ) : messages && messages.length > 0 ? (
              <>
                {isLoadingOlder && hasMoreRef.current && (
                  <div className="text-xs text-center text-slate-400">
                    Đang tải tin nhắn cũ...
                  </div>
                )}
                {messages.map((msg: Message, index: number) => {
                  const shouldRenderUnreadBanner =
                    index === firstUnreadIndex && unreadCount > 0;
                  const stableMessageId = getMessageId(msg);

                  if (msg.type === "system") {
                    const normalizedSystemContent = String(msg.content || "")
                      .trim()
                      .toLowerCase();
                    const isLeaveNotice =
                      normalizedSystemContent.includes("đã rời khỏi nhóm") ||
                      normalizedSystemContent.includes("da roi khoi nhom");

                    if (isLeaveNotice) {
                      return (
                        <Fragment key={stableMessageId || `leave-${index}`}>
                          {shouldRenderUnreadBanner && (
                            <UnreadSummaryBanner
                              unreadCount={unreadCount}
                              isGroupConversation={isGroupConversation}
                              onOpenSummary={() => setSummaryOpen(true)}
                              onMarkAsRead={() =>
                                markConversationAsRead(conversationId)
                              }
                              isMarkingRead={isMarkingConversationAsRead}
                            />
                          )}
                          <div className="flex justify-center">
                            <div className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-600">
                              {msg.content || "Người dùng đã rời khỏi nhóm"}
                            </div>
                          </div>
                        </Fragment>
                      );
                    }

                    const callStatus = normalizeCallStatus(msg);
                    const callStyle = getSystemCallStyle(callStatus);
                    const callTitle = getSystemCallTitle(callStatus);
                    const callDescription = getSystemCallDescription(
                      msg,
                      callStatus,
                    );
                    const messageId = getMessageId(msg);
                    const systemSenderId = getMessageSenderId(msg);
                    const isMySystemMessage =
                      !!systemSenderId && systemSenderId === currentUserId;

                    return (
                      <Fragment key={stableMessageId || `system-${index}`}>
                        {shouldRenderUnreadBanner && (
                          <UnreadSummaryBanner
                            unreadCount={unreadCount}
                            isGroupConversation={isGroupConversation}
                            onOpenSummary={() => setSummaryOpen(true)}
                            onMarkAsRead={() =>
                              markConversationAsRead(conversationId)
                            }
                            isMarkingRead={isMarkingConversationAsRead}
                          />
                        )}
                        <div
                          ref={(element) => {
                            if (!messageId) return;
                            if (element) {
                              messageElementMapRef.current[messageId] = element;
                            } else {
                              delete messageElementMapRef.current[messageId];
                            }
                          }}
                          className={`flex items-end gap-2 ${
                            isMySystemMessage ? "justify-end" : "justify-start"
                          }`}
                        >
                          {!isMySystemMessage && (
                            <div
                              className={`h-8 w-8 rounded-full flex items-center justify-center ${callStyle.iconClass}`}
                            >
                              <callStyle.Icon className="w-4 h-4" />
                            </div>
                          )}

                          <div
                            className={`px-3.5 py-2 rounded-2xl shadow-sm max-w-[84%] md:max-w-[60%] border ${
                              isMySystemMessage
                                ? "bg-blue-600 text-white rounded-br-none border-blue-600"
                                : `bg-white text-slate-800 rounded-bl-none ${callStyle.bubbleClass}`
                            } ${
                              messageId && highlightedMessageId === messageId
                                ? "ring-2 ring-amber-300 ring-offset-2"
                                : ""
                            }`}
                          >
                            <p
                              className={`text-[13px] font-semibold ${
                                isMySystemMessage
                                  ? "text-white"
                                  : "text-slate-800"
                              }`}
                            >
                              {callTitle}
                            </p>
                            <p
                              className={`mt-0.5 text-[11px] ${
                                isMySystemMessage
                                  ? "text-blue-100"
                                  : "text-slate-600"
                              }`}
                            >
                              {callDescription}
                            </p>
                            <p
                              className={`mt-0.5 text-[10px] ${
                                isMySystemMessage
                                  ? "text-blue-100"
                                  : "text-slate-400"
                              }`}
                            >
                              {getSystemCallTime(msg)}
                            </p>
                          </div>

                          {isMySystemMessage && (
                            <div className="h-8 w-8 rounded-full flex items-center justify-center bg-blue-500/20 text-blue-600">
                              <callStyle.Icon className="w-4 h-4" />
                            </div>
                          )}
                        </div>
                      </Fragment>
                    );
                  }

                  const messageSenderId = getMessageSenderId(msg);
                  const isAiMessage = msg.senderSource === "ai";
                  const isMe = isAiMessage
                    ? false
                    : msg.senderSource === "user"
                      ? messageSenderId
                        ? messageSenderId === currentUserId
                        : false
                      : messageSenderId === currentUserId;

                  const senderInfo =
                    typeof msg.senderId === "object" && msg.senderId !== null
                      ? msg.senderId
                      : undefined;

                  const senderDisplayName = isMe
                    ? user?.displayName || "You"
                    : isAiMessage
                      ? conversation?.name || "Chat AI"
                      : senderInfo?.displayName ||
                        (conversation?.type === "private"
                          ? conversationName || "User"
                          : "User");

                  const senderAvatarKey = isMe
                    ? user?.avatar
                    : isAiMessage
                      ? conversation?.groupAvatar || conversationAvatar
                      : senderInfo?.avatar ||
                        (conversation?.type === "private"
                          ? conversationAvatar
                          : undefined);
                  const messageTime = formatMessageClock(msg.createdAt);
                  const messageId = stableMessageId;
                  const isTextMessage = msg.type === "text";
                  const isUnsent = Boolean(msg.isUnsent || msg.unsentAt);
                  const {
                    isForwarded,
                    displayContent: parsedContent,
                  } = parseForwardedMessageContent(msg.content);
                  const attachments = msg.attachments || [];
                  const visibleAttachments = isUnsent ? [] : attachments;
                  const isAttachmentOnlyMessage =
                    visibleAttachments.length > 0 &&
                    !parsedContent &&
                    msg.type !== "audio";
                  const isPlainAttachmentBubble =
                    isMe && isAttachmentOnlyMessage;
                  const canReply = !isUnsent;
                  const isPinned = Boolean(messageId && pinnedMessageIdSet.has(messageId));
                  const canPin =
                    !isUnsent &&
                    !isAiMessage &&
                    (!isGroupConversation ||
                      !conversation?.pinManagementEnabled ||
                      isCurrentUserGroupAdmin);
                  const canUnpin = canPin && isPinned;
                  const canUnsend = isMe && !isUnsent && !isAiMessage;
                  const canDeleteForMe = isMe;
                  const canForward = isMessageForwardable(msg);
                  const canShowActions =
                    Boolean(messageId) &&
                    (canPin ||
                      canUnpin ||
                      canUnsend ||
                      canDeleteForMe ||
                      canReply ||
                      canForward);
                  const isActionsVisible =
                    canShowActions && activeMessageActionsId === messageId;
                  const replyTargetMessageId = getReplyToMessageId(msg.replyToMessageId);
                  const repliedMessageFromPayload = getReplyMessageFromPayload(
                    msg.replyToMessageId,
                  );
                  const repliedMessageFromSnapshot = getReplyMessageFromSnapshot(
                    (msg as any).replyPreview,
                  );
                  const repliedMessageFromMap = replyTargetMessageId
                    ? messageMapById.get(replyTargetMessageId)
                    : undefined;
                  const repliedMessage =
                    repliedMessageFromPayload ||
                    repliedMessageFromMap ||
                    repliedMessageFromSnapshot;
                  const hasReplyReference = Boolean(
                    msg.replyToMessageId || (msg as any).replyPreview,
                  );
                  const repliedPreview = buildReplyPreview(repliedMessage);
                  const unsentBubbleClass =
                    backgroundKey === "default"
                      ? "px-4 py-2.5 border border-slate-200/80 bg-white text-slate-600 shadow-none"
                      : backgroundKey === "night"
                        ? "px-4 py-2.5 border border-slate-600/70 bg-slate-900/65 text-slate-200 shadow-none"
                        : "px-4 py-2.5 border border-slate-200/80 bg-white/75 text-slate-700 shadow-none";
                  const outgoingMetaClass = isPlainAttachmentBubble
                    ? "text-slate-400"
                    : "text-blue-100";
                  const outgoingActionClass = isPlainAttachmentBubble
                    ? "text-slate-500 hover:bg-slate-200/80 hover:text-slate-700"
                    : "text-blue-100 hover:bg-blue-500/40 hover:text-white";
                  const statusText =
                    msg.status === "sending"
                      ? "Đang gửi..."
                      : msg.status === "failed"
                        ? "Gửi thất bại"
                        : messageTime;
                  const noteText = isUnsent
                    ? "Đã thu hồi"
                    : msg.isEdited
                      ? "Đã chỉnh sửa"
                      : "";

                  const handleReplyMessage = () => {
                    if (!messageId || !canReply) return;
                    setReplyingToMessageId(messageId);
                    setActiveMessageActionsId(null);
                  };

                  const handleUnsendMessage = () => {
                    if (!messageId || !canUnsend) return;
                    unsendMessage({
                      conversationId,
                      messageId,
                    });
                  };

                  const handleDeleteForMe = () => {
                    if (!messageId || !canDeleteForMe) return;

                    deleteMessageForMe({
                      conversationId,
                      messageId,
                    });
                  };

                  const handlePinMessage = () => {
                    if (!messageId || !canPin || isPinned) return;
                    pinMessage({ conversationId, messageId });
                  };

                  const handleUnpinMessage = () => {
                    if (!messageId || !canUnpin) return;
                    unpinMessage({ conversationId, messageId });
                  };

                  const EMOTE_MAP: Record<string, string> = {
                    like: "👍", love: "❤️", haha: "😂",
                    sad: "😢", angry: "😠", wow: "😮",
                  };
                  const reactionSummary = (msg.reactions || []).reduce<
                    Record<string, { count: number; users: string[] }>
                  >((acc, r: any) => {
                    const k = r.emoji as string;
                    if (!acc[k]) acc[k] = { count: 0, users: [] };
                    acc[k].count++;
                    acc[k].users.push(String(r.userId));
                    return acc;
                  }, {});
                  const hasReactions = Object.keys(reactionSummary).length > 0;

                  return (
                    <Fragment key={messageId}>
                      {shouldRenderUnreadBanner && (
                        <UnreadSummaryBanner
                          unreadCount={unreadCount}
                          isGroupConversation={isGroupConversation}
                          onOpenSummary={() => setSummaryOpen(true)}
                          onMarkAsRead={() =>
                            markConversationAsRead(conversationId)
                          }
                          isMarkingRead={isMarkingConversationAsRead}
                        />
                      )}
                      <div
                        ref={(element) => {
                          if (!messageId) return;
                          if (element) {
                            messageElementMapRef.current[messageId] = element;
                          } else {
                            delete messageElementMapRef.current[messageId];
                          }
                        }}
                        className={`flex items-end gap-2 ${isMe ? "justify-end" : "justify-start"}`}
                      >
                        {!isMe && (
                          <PresignedAvatar
                            avatarKey={senderAvatarKey}
                            displayName={senderDisplayName}
                            className="w-8 h-8 shrink-0 self-end"
                          />
                        )}
                        <div
                          data-message-action-scope={isMe ? "true" : undefined}
                          onTouchStart={() => {
                            if (!isMe) return;
                            handleMessageTouchStart(messageId, canShowActions);
                          }}
                          onTouchEnd={clearLongPressTimer}
                          onTouchCancel={clearLongPressTimer}
                          onTouchMove={clearLongPressTimer}
                          className={`group rounded-2xl text-[14px] md:text-[15px] max-w-[84%] md:max-w-[70%] xl:max-w-[64%] ${
                            isPlainAttachmentBubble
                              ? "w-fit p-0 bg-transparent text-slate-800 shadow-none"
                              : isUnsent
                                ? unsentBubbleClass
                              : `px-4 py-2.5 shadow-sm ${
                                  isMe
                                    ? "bg-blue-600 text-white rounded-br-none"
                                    : "bg-white text-slate-800 border border-slate-100 rounded-bl-none"
                                }`
                          } ${
                            messageId && highlightedMessageId === messageId
                              ? "ring-2 ring-amber-300 ring-offset-2"
                              : ""
                          }`}
                        >
                          {hasReplyReference && (
                            <button
                              type="button"
                              onClick={() => {
                                if (replyTargetMessageId) {
                                  void focusReplyTargetMessage(replyTargetMessageId);
                                }
                              }}
                              className={`mb-2 w-full rounded-xl border-l-2 px-2.5 py-1.5 text-left text-xs transition ${
                                isMe
                                  ? "border-blue-200 bg-blue-500/35 text-blue-50 hover:bg-blue-500/45"
                                  : "border-blue-300 bg-slate-100 text-slate-600 hover:bg-slate-200"
                              }`}
                            >
                              <span className="font-semibold uppercase tracking-wide">Trả lời</span>
                              <span className="mt-1 block whitespace-pre-wrap break-words leading-relaxed opacity-90">
                                {repliedPreview}
                              </span>
                            </button>
                          )}

                          {!isUnsent && isForwarded && (
                            <div
                              className={`mb-2 inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                                isMe
                                  ? "bg-blue-500/45 text-blue-50"
                                  : "bg-slate-200 text-slate-600"
                              }`}
                            >
                              Chuyển tiếp
                            </div>
                          )}

                          {visibleAttachments.length > 0 && (
                            <div className={msg.content ? "mb-2" : ""}>
                              <div className="flex flex-col gap-2">
                                {visibleAttachments.map((attachment, index) => (
                                  <MessageAttachmentItem
                                    key={`${attachment.key || attachment.url || attachment.fileName}-${index}`}
                                    attachment={attachment}
                                    isMe={isMe}
                                  />
                                ))}
                              </div>
                            </div>
                          )}
                          {isUnsent ? (
                            <p className={isMe ? "italic text-blue-100" : "italic text-slate-500"}>
                              Tin nhắn đã được thu hồi
                            </p>
                          ) : parsedContent ? (
                            renderMessageContent(parsedContent)
                          ) : null}
                          {msg.type === "audio" && visibleAttachments.length === 0 && (
                            <div
                              className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm ${
                                isMe
                                  ? "bg-blue-500/40 text-blue-50"
                                  : "bg-slate-100 text-slate-700"
                              }`}
                            >
                              <FileAudio2 className="h-4 w-4" />
                              Tin nhắn ghi âm
                            </div>
                          )}
                          {isAiMessage && !isMe && (
                            <div className="mt-1.5 flex justify-start">
                              <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-blue-600">
                                AI
                              </span>
                            </div>
                          )}
                          {isPinned && (
                            <div
                              className={`mt-1.5 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${
                                isMe
                                  ? "bg-blue-500/40 text-blue-50"
                                  : "bg-amber-100 text-amber-700"
                              }`}
                            >
                              <Pin className="h-3 w-3" />
                              Đã ghim
                            </div>
                          )}
                          {!isMe && (
                            <div className="mt-1 flex items-center justify-between gap-2">
                              <div className="flex items-center gap-1">
                                {canReply && (
                                  <button
                                    type="button"
                                    onClick={handleReplyMessage}
                                    className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] text-slate-500 transition hover:bg-slate-200 hover:text-slate-700"
                                  >
                                    <Reply className="h-3 w-3" />
                                    Trả lời
                                  </button>
                                )}
                                {canForward && (
                                  <button
                                    type="button"
                                    onClick={() => openForwardDialog(messageId)}
                                    className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] text-slate-500 transition hover:bg-slate-200 hover:text-slate-700"
                                  >
                                    Chuyển tiếp
                                  </button>
                                )}
                                {canPin && (
                                  <button
                                    type="button"
                                    onClick={isPinned ? handleUnpinMessage : handlePinMessage}
                                    className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] text-slate-500 transition hover:bg-slate-200 hover:text-slate-700"
                                    disabled={isPinPending || isUnpinPending}
                                  >
                                    {isPinned ? "Bỏ ghim" : "Ghim"}
                                  </button>
                                )}
                                {/* Emote button — inline like reply/pin */}
                                {!isUnsent && messageId && (
                                  <div
                                    data-reaction-scope="true"
                                    className="relative"
                                  >
                                    <button
                                      type="button"
                                      title="Thả emote"
                                      onClick={() =>
                                        setReactionPickerMessageId(
                                          reactionPickerMessageId === messageId ? null : messageId,
                                        )
                                      }
                                      className={`inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[10px] transition ${
                                        reactionPickerMessageId === messageId
                                          ? "bg-yellow-100 text-yellow-600"
                                          : "text-slate-500 hover:bg-slate-200 hover:text-slate-700"
                                      }`}
                                    >
                                      😊
                                    </button>
                                    {reactionPickerMessageId === messageId && (
                                      <div
                                        className="absolute bottom-7 left-0 z-30 flex items-end gap-1 px-2 py-1.5 bg-white rounded-2xl shadow-xl border border-slate-100"
                                        onMouseLeave={() => setReactionPickerMessageId(null)}
                                      >
                                        {([
                                          { key: "like", label: "Thích", emoji: "👍" },
                                          { key: "love", label: "Yêu thích", emoji: "❤️" },
                                          { key: "haha", label: "Haha", emoji: "😂" },
                                          { key: "sad", label: "Khóc", emoji: "😢" },
                                          { key: "angry", label: "Tức giận", emoji: "😠" },
                                          { key: "wow", label: "Lo lắng", emoji: "😮" },
                                        ] as const).map((opt) => {
                                          const myReaction = (msg.reactions || []).find(
                                            (r: any) => r.userId === currentUserId,
                                          );
                                          return (
                                            <button
                                              key={opt.key}
                                              type="button"
                                              title={opt.label}
                                              onClick={() => {
                                                reactToMessage({
                                                  conversationId,
                                                  messageId,
                                                  emoji: opt.key,
                                                });
                                                setReactionPickerMessageId(null);
                                              }}
                                              className={`flex flex-col items-center gap-0.5 px-1 py-1 rounded-xl transition-all duration-100 hover:scale-125 ${
                                                myReaction?.emoji === opt.key
                                                  ? "bg-blue-50 ring-2 ring-blue-300 scale-110"
                                                  : "hover:bg-slate-50"
                                              }`}
                                            >
                                              <span className="text-xl leading-none">{opt.emoji}</span>
                                              <span className="text-[9px] text-slate-500 font-medium">{opt.label}</span>
                                            </button>
                                          );
                                        })}
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                              {statusText && (
                                <div
                                  className="text-[10px] text-slate-400"
                                  suppressHydrationWarning
                                >
                                  {statusText}
                                </div>
                              )}
                            </div>
                          )}

                          {!isMe && noteText && (
                            <div
                              className={`mt-1 text-[10px] ${
                                isMe ? "text-blue-100" : "text-slate-400"
                              }`}
                            >
                              {noteText}
                            </div>
                          )}

                          {isMe && (statusText || noteText || canDeleteForMe) && (
                            <div className="mt-1.5 flex items-center justify-end gap-1.5">
                              {noteText && (
                                <span
                                  className={`text-[10px] ${outgoingMetaClass}`}
                                >
                                  {noteText}
                                </span>
                              )}
                              {statusText && (
                                <span
                                  className={`text-[10px] ${outgoingMetaClass}`}
                                  suppressHydrationWarning
                                >
                                  {statusText}
                                </span>
                              )}

                              {/* Emote button for my messages — inline before 3-dot */}
                              {!isUnsent && messageId && (
                                <div
                                  data-reaction-scope="true"
                                  className="relative"
                                >
                                  <button
                                    type="button"
                                    title="Thả emote"
                                    onClick={() =>
                                      setReactionPickerMessageId(
                                        reactionPickerMessageId === messageId ? null : messageId,
                                      )
                                    }
                                    className={`inline-flex items-center rounded-full p-1 text-sm transition-all duration-150 ${outgoingActionClass} ${
                                      reactionPickerMessageId === messageId
                                        ? "opacity-100 pointer-events-auto"
                                        : "opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto"
                                    }`}
                                  >
                                    😊
                                  </button>
                                  {reactionPickerMessageId === messageId && (
                                    <div
                                      className="absolute bottom-8 right-0 z-30 flex items-end gap-1 px-2 py-1.5 bg-white rounded-2xl shadow-xl border border-slate-100"
                                      onMouseLeave={() => setReactionPickerMessageId(null)}
                                    >
                                      {([
                                        { key: "like", label: "Thích", emoji: "👍" },
                                        { key: "love", label: "Yêu thích", emoji: "❤️" },
                                        { key: "haha", label: "Haha", emoji: "😂" },
                                        { key: "sad", label: "Khóc", emoji: "😢" },
                                        { key: "angry", label: "Tức giận", emoji: "😠" },
                                        { key: "wow", label: "Lo lắng", emoji: "😮" },
                                      ] as const).map((opt) => {
                                        const myReaction = (msg.reactions || []).find(
                                          (r: any) => r.userId === currentUserId,
                                        );
                                        return (
                                          <button
                                            key={opt.key}
                                            type="button"
                                            title={opt.label}
                                            onClick={() => {
                                              reactToMessage({
                                                conversationId,
                                                messageId,
                                                emoji: opt.key,
                                              });
                                              setReactionPickerMessageId(null);
                                            }}
                                            className={`flex flex-col items-center gap-0.5 px-1 py-1 rounded-xl transition-all duration-100 hover:scale-125 ${
                                              myReaction?.emoji === opt.key
                                                ? "bg-blue-50 ring-2 ring-blue-300 scale-110"
                                                : "hover:bg-slate-50"
                                            }`}
                                          >
                                            <span className="text-xl leading-none">{opt.emoji}</span>
                                            <span className="text-[9px] text-slate-500 font-medium">{opt.label}</span>
                                          </button>
                                        );
                                      })}
                                    </div>
                                  )}
                                </div>
                              )}

                              {canShowActions && (
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <button
                                      type="button"
                                      aria-label="Mở tùy chọn tin nhắn"
                                      onClick={(event) => {
                                        event.stopPropagation();
                                        if (messageId) {
                                          setActiveMessageActionsId(messageId);
                                        }
                                      }}
                                      className={`inline-flex items-center justify-center rounded-full p-1 transition-all duration-150 ${outgoingActionClass} ${
                                        isActionsVisible
                                          ? "opacity-100 pointer-events-auto"
                                          : "opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto"
                                      }`}
                                      disabled={
                                        isUnsendPending ||
                                        isDeletePending ||
                                        isPinPending ||
                                        isUnpinPending
                                      }
                                    >
                                      <MoreVertical className="h-4 w-4" />
                                    </button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent
                                    align="end"
                                    className="w-40"
                                  >
                                    {canReply && (
                                      <DropdownMenuItem
                                        onClick={handleReplyMessage}
                                      >
                                        Trả lời tin nhắn
                                      </DropdownMenuItem>
                                    )}
                                    {canPin && (
                                      <DropdownMenuItem
                                        onClick={
                                          isPinned
                                            ? handleUnpinMessage
                                            : handlePinMessage
                                        }
                                        disabled={isPinPending || isUnpinPending}
                                      >
                                        {isPinned ? "Bỏ ghim tin nhắn" : "Ghim tin nhắn"}
                                      </DropdownMenuItem>
                                    )}
                                    {canForward && (
                                      <DropdownMenuItem
                                        onClick={() => openForwardDialog(messageId)}
                                      >
                                        Chuyển tiếp
                                      </DropdownMenuItem>
                                    )}
                                    {canUnsend && (
                                      <DropdownMenuItem
                                        onClick={handleUnsendMessage}
                                      >
                                        Thu hồi tin nhắn
                                      </DropdownMenuItem>
                                    )}
                                    {canDeleteForMe && (
                                      <DropdownMenuItem
                                        onClick={handleDeleteForMe}
                                      >
                                        Xóa phía tôi
                                      </DropdownMenuItem>
                                    )}
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              )}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* ── Reaction badges below bubble ── */}
                      {hasReactions && (
                        <div
                          className={`flex flex-wrap gap-1 ${
                            isMe
                              ? "justify-end pr-10"
                              : "justify-start pl-10"
                          } -mt-1 mb-0.5`}
                        >
                          {Object.entries(reactionSummary).map(([emoji, data]) => {
                            const isMine = data.users.includes(currentUserId || "");
                            return (
                              <button
                                key={emoji}
                                type="button"
                                title={`${data.count}`}
                                onClick={() => {
                                  if (!messageId) return;
                                  reactToMessage({ conversationId, messageId, emoji });
                                }}
                                className={`inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-xs font-medium transition-all duration-150 hover:scale-110 shadow-sm border ${
                                  isMine
                                    ? "bg-blue-100 border-blue-300 text-blue-700"
                                    : "bg-white border-slate-200 text-slate-600"
                                }`}
                              >
                                <span className="text-sm leading-none">
                                  {EMOTE_MAP[emoji] || emoji}
                                </span>
                                {data.count > 1 && (
                                  <span>{data.count}</span>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      )}

                    </Fragment>
                  );
                })}

                {typingUsers.length > 0 && (
                  <div className="flex justify-start">
                    <div className="px-4 py-2.5 rounded-2xl text-[14px] bg-slate-200 text-slate-600">
                      {typingUsers[0]} đang soạn tin...
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="py-8 text-center text-slate-500">
                Chưa có tin nhắn nào. Hãy bắt đầu cuộc trò chuyện!
              </div>
            )}
          </div>
        </div>
      </ScrollArea>

      {isConversationBlocked && (
        <div className="mx-3 mb-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 md:mx-6 xl:mx-10">
          {blockedMessage}
        </div>
      )}

      <Dialog open={forwardDialogOpen} onOpenChange={setForwardDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Chuyển tiếp tin nhắn</DialogTitle>
          </DialogHeader>

          <div className="space-y-3">
            <Input
              value={forwardSearchQuery}
              onChange={(event) => setForwardSearchQuery(event.target.value)}
              placeholder="Tìm cuộc trò chuyện"
            />

            <div className="max-h-72 overflow-y-auto rounded-xl border border-slate-200">
              {forwardTargetConversations.length > 0 ? (
                forwardTargetConversations.map((item: any) => {
                  const id = String(item?.id || item?._id || "");
                  if (!id) return null;

                  const isSelected = selectedForwardConversationId === id;

                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setSelectedForwardConversationId(id)}
                      className={`flex w-full items-center justify-between px-3 py-2.5 text-left text-sm transition ${
                        isSelected
                          ? "bg-blue-50 text-blue-700"
                          : "hover:bg-slate-50"
                      }`}
                    >
                      <span className="truncate">{getConversationForwardLabel(item, currentUserId)}</span>
                      {isSelected && (
                        <span className="text-xs font-medium">Đã chọn</span>
                      )}
                    </button>
                  );
                })
              ) : (
                <div className="px-3 py-5 text-center text-xs text-slate-500">
                  Không có cuộc trò chuyện phù hợp
                </div>
              )}
            </div>

            <div className="rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-600">
              Chỉ hỗ trợ chuyển tiếp link, tệp, hình ảnh hoặc ghi âm.
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setForwardDialogOpen(false)}
              disabled={isForwarding}
            >
              Hủy
            </Button>
            <Button
              onClick={() => void handleForwardMessage()}
              disabled={!selectedForwardConversationId || isForwarding}
            >
              {isForwarding ? "Đang chuyển tiếp..." : "Chuyển tiếp"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ChatInput
        onSend={handleSendMessage}
        onSendAttachments={handleSendAttachments}
        isUploadingAttachments={isSendingAttachment}
        uploadProgressPercent={uploadProgressPercent}
        uploadProgressLabel={uploadProgressLabel}
        replyPreview={replyPreviewText}
        onCancelReply={() => setReplyingToMessageId(null)}
        disabled={
          !conversationId ||
          isSendingMessage ||
          isSendingAiMessage ||
          isSendingAttachment ||
          isConversationBlocked
        }
        onTyping={handleTyping}
        onStopTyping={handleStopTyping}
      />
    </div>
  );
}
