"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { X, ChevronLeft, ChevronRight, Trash2, Send } from "lucide-react";
import { Story, StoryGroup } from "@/types/story";
import { PresignedAvatar } from "@/components/ui/presigned-avatar";
import {
  useAddReaction,
  useReplyToStory,
  useGetReplies,
  useDeleteReply,
} from "@/hooks/use-story";

type StoryViewerProps = {
  open: boolean;
  groups: StoryGroup[];
  initialGroupIndex: number;
  initialStoryIndex?: number;
  currentUserId?: string;
  onMarkViewed: (storyId: string) => void;
  onDeleteStory?: (storyId: string) => void;
  onClose: () => void;
};

const IMAGE_STORY_DURATION_MS = 10000;
const REACTION_EMOJIS = ["❤️", "😂", "😮", "😢", "😡", "👍"];

export function StoryViewer({
  open,
  groups,
  initialGroupIndex,
  initialStoryIndex = 0,
  currentUserId,
  onMarkViewed,
  onDeleteStory,
  onClose,
}: StoryViewerProps) {
  const [groupIndex, setGroupIndex] = useState(initialGroupIndex);
  const [storyIndex, setStoryIndex] = useState(initialStoryIndex);
  const [progress, setProgress] = useState(0);
  const [showReactionPicker, setShowReactionPicker] = useState(false);
  const [showReplies, setShowReplies] = useState(false);
  const [replyMessage, setReplyMessage] = useState("");
  const progressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const autoNextTimerRef = useRef<NodeJS.Timeout | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const addReactionMutation = useAddReaction();
  const replyToStoryMutation = useReplyToStory();
  const deleteReplyMutation = useDeleteReply();

  const activeGroup = groups[groupIndex];
  const activeStory: Story | undefined = activeGroup?.stories?.[storyIndex];

  const { data: replies = [] } = useGetReplies(showReplies ? activeStory?.id : undefined);

  useEffect(() => {
    if (!open) return;
    setGroupIndex(initialGroupIndex);
    setStoryIndex(initialStoryIndex);
  }, [open, initialGroupIndex, initialStoryIndex]);

  const clearTimers = () => {
    if (progressTimerRef.current) clearInterval(progressTimerRef.current);
    if (autoNextTimerRef.current) clearTimeout(autoNextTimerRef.current);
  };

  const goNext = () => {
    if (!activeGroup) return;

    const isLastStoryInGroup = storyIndex >= activeGroup.stories.length - 1;
    if (!isLastStoryInGroup) {
      setStoryIndex((prev) => prev + 1);
      return;
    }

    const isLastGroup = groupIndex >= groups.length - 1;
    if (!isLastGroup) {
      setGroupIndex((prev) => prev + 1);
      setStoryIndex(0);
      return;
    }

    onClose();
  };

  const goPrev = () => {
    if (!activeGroup) return;

    if (storyIndex > 0) {
      setStoryIndex((prev) => prev - 1);
      return;
    }

    if (groupIndex > 0) {
      const prevGroupIndex = groupIndex - 1;
      const prevGroup = groups[prevGroupIndex];
      setGroupIndex(prevGroupIndex);
      setStoryIndex(Math.max(0, (prevGroup?.stories?.length || 1) - 1));
    }
  };

  const handleReaction = (emoji: string) => {
    if (!activeStory) return;
    addReactionMutation.mutate({
      storyId: activeStory.id,
      emoji,
    });
  };

  const currentUserReactions = useMemo(() => {
    if (!currentUserId || !activeStory?.reactions) return [];
    return activeStory.reactions
      .filter((reaction) =>
        reaction.users.some((user) => (user._id || user.id) === currentUserId),
      )
      .map((reaction) => reaction.emoji);
  }, [activeStory?.reactions, currentUserId]);

  const handleSendReply = async () => {
    if (!activeStory || !replyMessage.trim()) return;
    replyToStoryMutation.mutate(
      {
        storyId: activeStory.id,
        message: replyMessage.trim(),
      },
      {
        onSuccess: () => {
          setReplyMessage("");
        },
      },
    );
  };

  const handleDeleteReply = (replyId: string) => {
    deleteReplyMutation.mutate(replyId);
  };

  const isStoryAuthor = useMemo(() => {
    const authorId = (activeStory?.author?._id || activeStory?.authorId || "").toString();
    return !!currentUserId && authorId === currentUserId;
  }, [activeStory?.author?._id, activeStory?.authorId, currentUserId]);

  useEffect(() => {
    if (!open || !activeStory) return;

    onMarkViewed(activeStory.id);
    setProgress(0);
    clearTimers();

    if (activeStory.media.type === "image") {
      const start = Date.now();
      progressTimerRef.current = setInterval(() => {
        const elapsed = Date.now() - start;
        const pct = Math.min(100, (elapsed / IMAGE_STORY_DURATION_MS) * 100);
        setProgress(pct);
      }, 100);

      autoNextTimerRef.current = setTimeout(() => {
        goNext();
      }, IMAGE_STORY_DURATION_MS);
    }

    return clearTimers;
  }, [open, activeStory?.id]);

  useEffect(() => {
    if (!open) return;

    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
      if (event.key === "ArrowRight") goNext();
      if (event.key === "ArrowLeft") goPrev();
    };

    window.addEventListener("keydown", onKeyDown);

    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = prev;
      clearTimers();
    };
  }, [open, goNext, goPrev, onClose]);

  const isOwnStory = useMemo(() => {
    const authorId = (activeStory?.author?._id || activeStory?.authorId || "").toString();
    return !!currentUserId && authorId === currentUserId;
  }, [activeStory?.author?._id, activeStory?.authorId, currentUserId]);

  if (!open || !activeGroup || !activeStory) return null;

  return (
    <div className="fixed inset-0 z-[90] bg-black/95">
      <div className="absolute top-0 left-0 right-0 z-10 p-3 md:p-4">
        <div className="grid grid-cols-1 gap-1.5">
          {activeGroup.stories.map((story, index) => (
            <div key={story.id} className="w-full h-1 rounded-full bg-white/30 overflow-hidden">
              <div
                className="h-full bg-white transition-all"
                style={{
                  width:
                    index < storyIndex
                      ? "100%"
                      : index > storyIndex
                        ? "0%"
                        : `${progress}%`,
                }}
              />
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between mt-3 text-white">
          <div className="flex items-center gap-3 min-w-0">
            <PresignedAvatar
              avatarKey={activeGroup.user?.avatar}
              displayName={activeGroup.user?.displayName}
              className="w-9 h-9"
            />
            <div className="min-w-0">
              <p className="text-sm font-semibold truncate">
                {activeGroup.user?.displayName || "User"}
              </p>
              {activeStory.caption ? (
                <p className="text-xs text-white/80 truncate">{activeStory.caption}</p>
              ) : null}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isOwnStory && onDeleteStory ? (
              <button
                type="button"
                onClick={() => onDeleteStory(activeStory.id)}
                className="p-2 rounded-full bg-white/15 hover:bg-white/25"
                aria-label="Xóa story"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            ) : null}
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-full bg-white/15 hover:bg-white/25"
              aria-label="Đóng story"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={goPrev}
        className="absolute left-3 top-1/2 -translate-y-1/2 z-10 p-2 rounded-full text-white bg-white/15 hover:bg-white/25"
        aria-label="Story trước"
      >
        <ChevronLeft className="w-6 h-6" />
      </button>

      <button
        type="button"
        onClick={goNext}
        className="absolute right-3 top-1/2 -translate-y-1/2 z-10 p-2 rounded-full text-white bg-white/15 hover:bg-white/25"
        aria-label="Story tiếp"
      >
        <ChevronRight className="w-6 h-6" />
      </button>

      <div className="flex items-center justify-center w-full h-full p-4 pt-24 md:pt-28">
        {activeStory.media.type === "video" ? (
          <video
            ref={videoRef}
            src={activeStory.media.url}
            autoPlay
            playsInline
            controls
            className="max-h-full max-w-full object-contain"
            onLoadedMetadata={(event) => {
              const durationMs = Math.min(
                Math.max(1000, (event.currentTarget.duration || 10) * 1000),
                IMAGE_STORY_DURATION_MS,
              );
              const start = Date.now();
              clearTimers();
              progressTimerRef.current = setInterval(() => {
                const elapsed = Date.now() - start;
                const pct = Math.min(100, (elapsed / durationMs) * 100);
                setProgress(pct);
              }, 100);
              autoNextTimerRef.current = setTimeout(goNext, durationMs);
            }}
            onEnded={goNext}
          />
        ) : (
          <img
            src={activeStory.media.url}
            alt="Story"
            className="max-h-full max-w-full object-contain"
          />
        )}
      </div>

      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
        {showReplies ? (
          <div className="max-h-64 overflow-y-auto">
            <div className="mb-4">
              <h3 className="text-white font-semibold mb-3 flex items-center justify-between">
                <span>Phản hồi ({replies.length})</span>
                <button
                  type="button"
                  onClick={() => setShowReplies(false)}
                  className="text-sm px-2 py-1 rounded bg-white/20 hover:bg-white/30"
                >
                  Đóng
                </button>
              </h3>

              <div className="space-y-2 mb-3">
                {replies.map((reply) => (
                  <div
                    key={reply._id || reply.id}
                    className="bg-white/10 rounded-lg p-2 text-white text-sm"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-semibold">
                        {(reply.sender?.displayName || reply.senderId).toString().substring(0, 20)}
                      </span>
                      {(reply.senderId === currentUserId || isStoryAuthor) && (
                        <button
                          type="button"
                          onClick={() =>
                            handleDeleteReply((reply._id || reply.id).toString())
                          }
                          className="text-xs px-2 py-1 rounded bg-red-500/30 hover:bg-red-500/50"
                        >
                          Xóa
                        </button>
                      )}
                    </div>
                    <p className="text-white/90 break-words">{reply.message}</p>
                  </div>
                ))}
              </div>

              {!isStoryAuthor && (
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={replyMessage}
                    onChange={(e) => setReplyMessage(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === "Enter") handleSendReply();
                    }}
                    placeholder="Gửi phản hồi..."
                    maxLength={500}
                    className="flex-1 bg-white/20 rounded px-3 py-2 text-white placeholder-white/60 text-sm focus:outline-none focus:ring-2 focus:ring-white/30"
                  />
                  <button
                    type="button"
                    onClick={handleSendReply}
                    disabled={!replyMessage.trim() || replyToStoryMutation.isPending}
                    className="px-3 py-2 rounded bg-blue-500 hover:bg-blue-600 disabled:opacity-50 text-white"
                  >
                    <Send size={18} />
                  </button>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 flex-1">
              {activeStory?.replyCount && activeStory.replyCount > 0 && (
                <button
                  type="button"
                  onClick={() => setShowReplies(true)}
                  className="px-3 py-1.5 rounded-full bg-white/20 hover:bg-white/30 text-white text-sm font-semibold"
                >
                  💬 {activeStory.replyCount}
                </button>
              )}

              {showReactionPicker ? (
                <div className="flex items-center gap-1 rounded-full bg-white/20 backdrop-blur-sm p-2">
                  {REACTION_EMOJIS.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => {
                        handleReaction(emoji);
                        setShowReactionPicker(false);
                      }}
                      className={`text-xl p-2 rounded-full transition-all ${
                        currentUserReactions.includes(emoji)
                          ? "bg-white/40 scale-110"
                          : "hover:bg-white/20"
                      }`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              ) : (
                <>
                  {activeStory?.reactions && activeStory.reactions.length > 0 && (
                    <div className="flex items-center gap-1 rounded-full bg-white/20 backdrop-blur-sm p-2">
                      {activeStory.reactions.slice(0, 5).map((reaction) => (
                        <button
                          key={reaction.emoji}
                          type="button"
                          onClick={() => handleReaction(reaction.emoji)}
                          className={`text-lg px-2 py-1 rounded-full transition-all ${
                            currentUserReactions.includes(reaction.emoji)
                              ? "bg-white/40"
                              : "hover:bg-white/20"
                          }`}
                          title={`${reaction.users.length} người`}
                        >
                          <span>{reaction.emoji}</span>
                          <span className="text-xs ml-1">{reaction.users.length}</span>
                        </button>
                      ))}
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={() => setShowReactionPicker(!showReactionPicker)}
                    className="text-2xl p-2 rounded-full bg-white/20 hover:bg-white/30 transition-all"
                    title="React"
                  >
                    😊
                  </button>
                </>
              )}
            </div>

            {!isStoryAuthor && (
              <button
                type="button"
                onClick={() => setShowReplies(true)}
                className="px-3 py-1.5 rounded-full bg-blue-500 hover:bg-blue-600 text-white text-sm font-semibold whitespace-nowrap"
              >
                Reply
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
