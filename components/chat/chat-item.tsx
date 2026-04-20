"use client";
import { PresignedAvatar } from "@/components/ui/presigned-avatar";
import { Badge } from "@/components/ui/badge";
import Link from "next/link"; // Quan trọng

type GroupAvatarMemberView = {
  userId: string;
  displayName: string;
  avatar?: string;
};

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
  useCompositeGroupAvatar?: boolean;
  groupAvatarMembers?: GroupAvatarMemberView[];
  groupMemberCount?: number;
  showGroupMemberCountBadge?: boolean;
}

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
      className={`relative overflow-hidden rounded-full border-2 border-white bg-slate-100 shadow-sm ring-1 ring-slate-100 ${className ?? ""}`}
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
  useCompositeGroupAvatar,
  groupAvatarMembers = [],
  groupMemberCount = 0,
  showGroupMemberCountBadge = false,
}: ChatItemProps) {
  const memberCountText =
    groupMemberCount > 99 ? "99+" : String(Math.max(groupMemberCount, 0));

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
          {useCompositeGroupAvatar ? (
            <GroupCompositeAvatar
              members={groupAvatarMembers}
              totalCount={groupMemberCount}
              className="h-11 w-11"
            />
          ) : (
            <PresignedAvatar
              avatarKey={avatar}
              displayName={name}
              className="h-11 w-11 border-2 border-white shadow-sm ring-1 ring-slate-100"
              fallbackClassName="bg-slate-200 text-slate-600 font-bold text-xs"
            />
          )}
          {showGroupMemberCountBadge && (
            <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full border-2 border-white bg-blue-600 px-1 text-[10px] font-bold leading-none text-white shadow-sm">
              {memberCountText}
            </span>
          )}
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
