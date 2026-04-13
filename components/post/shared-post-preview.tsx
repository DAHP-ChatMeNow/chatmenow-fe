"use client";

import { Lock } from "lucide-react";
import { PresignedAvatar } from "@/components/ui/presigned-avatar";
import { SharedPostReference } from "@/types/post";
import { formatPostTime } from "@/lib/utils";

const getAuthorMeta = (post?: SharedPostReference | null) => {
  if (!post) return { displayName: "Người dùng", avatar: undefined as string | undefined };
  const author = post.author;
  const authorId = post.authorId;
  const displayName =
    author?.displayName ||
    (typeof authorId === "object" ? authorId?.displayName : undefined) ||
    "Người dùng";
  const avatar =
    author?.avatar ||
    (typeof authorId === "object" ? authorId?.avatar : undefined);
  return { displayName, avatar };
};

const getMediaType = (type?: string, url?: string) => {
  const t = String(type || "").toLowerCase();
  if (t.startsWith("video")) return "video";
  const u = String(url || "").toLowerCase();
  if (/\.(mp4|mov|webm|m4v)(\?|#|$)/i.test(u)) return "video";
  return "image";
};

export function SharedPostPreview({
  post,
  onClick,
  className = "",
  isMe = false,
  compact = false,
}: {
  post?: SharedPostReference | null;
  onClick?: () => void;
  className?: string;
  isMe?: boolean;
  compact?: boolean;
}) {
  if (!post) return null;

  if (post.isAccessible === false) {
    return (
      <div
        className={`rounded-xl border px-3 py-2 text-sm ${
          isMe
            ? "border-blue-300/40 bg-blue-500/25 text-blue-50"
            : "border-slate-200 bg-slate-50 text-slate-600"
        } ${className}`}
      >
        <div className="flex items-center gap-2 font-semibold">
          <Lock className="h-4 w-4" />
          Bài viết gốc không còn khả dụng
        </div>
      </div>
    );
  }

  const { displayName, avatar } = getAuthorMeta(post);
  const firstMedia = post.media?.[0];

  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full overflow-hidden rounded-xl border text-left transition hover:opacity-95 ${
        isMe
          ? "border-blue-300/40 bg-blue-500/25 text-blue-50"
          : "border-slate-200 bg-slate-50 text-slate-800"
      } ${className}`}
    >
      <div className="flex items-center gap-3 px-3 py-2">
        <PresignedAvatar
          avatarKey={avatar}
          displayName={displayName}
          className="h-9 w-9"
        />
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{displayName}</p>
          {post.createdAt ? (
            <p className="truncate text-[11px] text-slate-500 mt-0.5">
              {formatPostTime(post.createdAt)}
            </p>
          ) : null}
        </div>
      </div>
      {post.content ? (
        <p
          className={`overflow-hidden px-3 pb-2 text-sm leading-6 ${
            compact ? "max-h-[72px]" : "max-h-[160px]"
          }`}
        >
          {post.content}
        </p>
      ) : null}
      {firstMedia?.url ? (
        <div
          className={`w-full overflow-hidden bg-black/5 ${
            compact ? "h-36" : "h-[320px] md:h-[460px]"
          }`}
        >
          {getMediaType(firstMedia.type, firstMedia.url) === "video" ? (
            <video
              src={firstMedia.url}
              className="h-full w-full object-cover"
              muted
              playsInline
              preload="metadata"
            />
          ) : (
            <img
              src={firstMedia.url}
              alt="shared-post"
              className="h-full w-full object-cover"
            />
          )}
        </div>
      ) : null}
    </button>
  );
}
