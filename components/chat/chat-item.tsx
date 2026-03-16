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
}

export function ChatItem({
  id,
  name,
  avatar,
  lastMsg,
  time,
  unread,
  isActive,
}: ChatItemProps) {
  return (
    <Link href={`/messages/${id}`}>
      <div
        className={`flex items-center gap-3 p-3.5 mx-3 rounded-2xl cursor-pointer transition-all duration-200 ${
          isActive
            ? "bg-gradient-to-r from-blue-50 to-blue-100/50 shadow-md shadow-blue-100/50 scale-[1.02]"
            : "hover:bg-white hover:shadow-md hover:scale-[1.01]"
        }`}
      >
        <div className="relative">
          <PresignedAvatar
            avatarKey={avatar}
            displayName={name}
            className="h-12 w-12 border-2 border-white shadow-lg ring-1 ring-slate-100"
            fallbackClassName="bg-slate-200 text-slate-600 font-bold text-xs"
          />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex justify-between items-baseline mb-0.5">
            <h4
              className={`text-[14.5px] truncate ${isActive ? "text-blue-600 font-bold" : "font-semibold text-slate-900"}`}
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
              {lastMsg}
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
