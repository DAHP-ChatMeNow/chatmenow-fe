"use client";
import { PresignedAvatar } from "@/components/ui/presigned-avatar";
import { Badge } from "@/components/ui/badge";
import Link from "next/link"; // Quan trọng

interface ChatItemProps {
  id: string;
  name: string;
  avatar?: string;
  lastMsg: string;
  time: string;
  unread: number;
  isActive: boolean;
  isBlocked?: boolean;
  blockedLabel?: string;
}

export function ChatItem({
  id,
  name,
  avatar,
  lastMsg,
  time,
  unread,
  isActive,
  isBlocked,
  blockedLabel,
}: ChatItemProps) {
  return (
    <Link href={`/messages/${id}`}>
      <div
        className={`flex items-center gap-3 p-3 mx-2 md:mx-3 rounded-2xl cursor-pointer border transition-colors duration-150 ${
          isActive
            ? "bg-blue-50/80 border-blue-200 shadow-sm"
            : "bg-transparent border-slate-100 hover:bg-white hover:border-slate-200"
        } ${isBlocked ? "opacity-80" : ""}`}
      >
        <div className="relative">
          <PresignedAvatar
            avatarKey={avatar}
            displayName={name}
            className="h-11 w-11 border-2 border-white shadow-sm ring-1 ring-slate-100"
            fallbackClassName="bg-slate-200 text-slate-600 font-bold text-xs"
          />
          {isBlocked && (
            <span className="absolute -bottom-1 -right-1 rounded-full bg-red-500 px-1.5 py-0.5 text-[9px] font-semibold leading-none text-white shadow-sm">
              Chặn
            </span>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex justify-between items-baseline mb-0.5">
            <h4
              className={`text-[15px] truncate ${isActive ? "text-blue-700 font-bold" : "font-semibold text-slate-900"}`}
            >
              {name}
            </h4>
            <span className="text-[11px] text-slate-400 font-medium">
              {time}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <p
              className={`text-[13px] truncate pr-2 ${unread > 0 ? "text-slate-900 font-medium" : "text-slate-500"}`}
            >
              {blockedLabel || lastMsg}
            </p>
            {unread > 0 && (
              <Badge className="bg-blue-600 hover:bg-blue-600 h-5 min-w-[20px] rounded-full text-[10px] flex items-center justify-center p-0">
                {unread}
              </Badge>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}
