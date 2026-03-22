"use client";

import { Plus, Loader2 } from "lucide-react";
import { StoryGroup } from "@/types/story";
import { PresignedAvatar } from "@/components/ui/presigned-avatar";

type StoryStripProps = {
  stories: StoryGroup[];
  currentUserAvatar?: string;
  currentUserDisplayName?: string;
  isCreating: boolean;
  onPickStory: () => void;
  onOpenGroup: (groupIndex: number) => void;
};

export function StoryStrip({
  stories,
  currentUserAvatar,
  currentUserDisplayName,
  isCreating,
  onPickStory,
  onOpenGroup,
}: StoryStripProps) {
  return (
    <div className="p-2 min-w-0 bg-white border shadow-sm rounded-2xl border-slate-100 md:p-4">
      <div className="flex w-full min-w-0 gap-2 pb-2 overflow-x-auto scrollbar-hide">
        <button
          type="button"
          onClick={onPickStory}
          className="relative flex-shrink-0 w-[110px] h-[190px] md:w-[120px] md:h-[200px] rounded-xl overflow-hidden group bg-gradient-to-b from-slate-100 to-slate-200 hover:scale-[1.02] transition-transform"
        >
          <div className="absolute top-3 left-3">
            <PresignedAvatar
              avatarKey={currentUserAvatar}
              displayName={currentUserDisplayName}
              className="w-9 h-9 border-2 border-white"
            />
          </div>

          <div className="absolute inset-0 flex flex-col items-center justify-end pb-4">
            <div className="flex items-center justify-center w-10 h-10 mb-2 bg-white rounded-full shadow-lg">
              <div className="flex items-center justify-center w-8 h-8 bg-blue-600 rounded-full">
                {isCreating ? (
                  <Loader2 className="w-4 h-4 text-white animate-spin" />
                ) : (
                  <Plus className="w-5 h-5 text-white" />
                )}
              </div>
            </div>
            <span className="text-xs font-semibold text-slate-900">Tạo tin</span>
          </div>
        </button>

        {stories.map((group, index) => {
          const cover = group.stories[group.stories.length - 1]?.media?.url;
          return (
            <button
              key={`${group.user?._id || group.user?.id || "user"}-${index}`}
              type="button"
              onClick={() => onOpenGroup(index)}
              className="relative flex-shrink-0 w-[110px] h-[190px] md:w-[120px] md:h-[200px] rounded-xl overflow-hidden group hover:scale-[1.02] transition-transform"
            >
              {cover ? (
                <div
                  className="absolute inset-0 bg-center bg-cover"
                  style={{ backgroundImage: `url(${cover})` }}
                >
                  <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/60" />
                </div>
              ) : (
                <div className="absolute inset-0 bg-slate-300" />
              )}

              <div className="absolute top-3 left-3">
                <div
                  className={`p-0.5 rounded-full ${group.hasUnviewed ? "bg-blue-500" : "bg-slate-300"}`}
                >
                  <PresignedAvatar
                    avatarKey={group.user?.avatar}
                    displayName={group.user?.displayName}
                    className="w-9 h-9 border-2 border-white"
                  />
                </div>
              </div>

              <div className="absolute bottom-0 left-0 right-0 p-3 text-left">
                <span className="text-xs font-semibold text-white drop-shadow-lg line-clamp-2">
                  {group.user?.displayName || "User"}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
