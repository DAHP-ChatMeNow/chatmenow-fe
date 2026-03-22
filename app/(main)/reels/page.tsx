"use client";

import {
  ChangeEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Clapperboard,
  Gamepad2,
  Heart,
  Loader2,
  MessageCircle,
  Plus,
  Send,
  Share2,
  Upload,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";
import {
  useReelFeed,
  useCreateReel,
  useToggleLikeReel,
  useAddReelView,
} from "@/hooks/use-reel";
import {
  useAddComment,
  useComments,
} from "@/hooks/use-post";
import { Reel } from "@/types/reel";
import { Post } from "@/types/post";
import { PresignedAvatar } from "@/components/ui/presigned-avatar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Comment } from "@/types/comment";

// ─── Constants ────────────────────────────────────────────────────────────────

const MAX_REEL_SIZE     = 50 * 1024 * 1024; // 50 MB
const MAX_REEL_DURATION = 90; // seconds

// ─── Helpers ─────────────────────────────────────────────────────────────────

const getVideoDuration = (file: File): Promise<number> =>
  new Promise((resolve) => {
    const video = document.createElement("video");
    video.preload = "metadata";
    const url = URL.createObjectURL(file);
    video.src = url;
    video.onloadedmetadata = () => {
      URL.revokeObjectURL(url);
      resolve(Math.floor(video.duration));
    };
    video.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(0);
    };
  });

// ─── Sub-components ──────────────────────────────────────────────────────────

/**
 * Comments dialog – reuses the existing post comments API
 * because reels are still attached to post comments on the backend for now.
 * Replace postId with reelId when reel comments endpoint is ready.
 */
function ReelCommentsDialog({
  postId,
  open,
  onOpenChange,
}: {
  postId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [commentInput, setCommentInput] = useState("");
  const { data: comments = [], isLoading } = useComments(postId || "");
  const { mutate: addComment, isPending } = useAddComment();

  const handleAddComment = () => {
    const content = commentInput.trim();
    if (!postId || !content) return;

    addComment(
      { postId, content },
      {
        onSuccess: () => {
          setCommentInput("");
        },
      }
    );
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) setCommentInput("");
        onOpenChange(nextOpen);
      }}
    >
      <DialogContent className="max-w-lg overflow-hidden rounded-2xl border-0 p-0">
        <DialogHeader className="border-b px-5 pb-3 pt-5">
          <DialogTitle className="text-base font-semibold">Bình luận</DialogTitle>
        </DialogHeader>

        <div className="max-h-[50vh] space-y-3 overflow-y-auto px-5 py-3">
          {isLoading ? (
            <div className="flex items-center justify-center py-10 text-slate-500">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          ) : (comments as Comment[]).length > 0 ? (
            (comments as Comment[]).map((comment) => (
              <div key={comment.id} className="flex items-start gap-2">
                <PresignedAvatar
                  avatarKey={comment.user?.avatar}
                  displayName={comment.user?.displayName}
                  className="h-8 w-8"
                />
                <div className="flex-1 rounded-2xl bg-slate-100 px-3 py-2">
                  <p className="text-xs font-semibold text-slate-900">
                    {comment.user?.displayName || "Người dùng"}
                  </p>
                  <p className="break-words text-sm text-slate-700">
                    {comment.content}
                  </p>
                </div>
              </div>
            ))
          ) : (
            <p className="py-8 text-center text-sm text-slate-500">
              Chưa có bình luận nào.
            </p>
          )}
        </div>

        <div className="flex items-center gap-2 border-t px-5 py-3">
          <Input
            value={commentInput}
            onChange={(e) => setCommentInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleAddComment();
            }}
            placeholder="Viết bình luận..."
            className="h-10"
          />
          <Button
            type="button"
            onClick={handleAddComment}
            disabled={isPending || !commentInput.trim()}
            className="h-10 px-3"
          >
            {isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ReelsPage() {
  const router = useRouter();

  // ── State ─────────────────────────────────────────────────────────────────
  const [activeReelId, setActiveReelId]       = useState<string | null>(null);
  const [isMuted, setIsMuted]                 = useState(true);
  const [createOpen, setCreateOpen]           = useState(false);
  const [commentReelId, setCommentReelId]     = useState<string | null>(null);

  // Upload dialog state
  const [reelCaption, setReelCaption]   = useState("");
  const [reelFile, setReelFile]         = useState<File | null>(null);
  const [reelDuration, setReelDuration] = useState(0);
  const [reelPreview, setReelPreview]   = useState("");

  // ── Refs ──────────────────────────────────────────────────────────────────
  const fileInputRef = useRef<HTMLInputElement>(null);
  const reelRefs     = useRef<Record<string, HTMLDivElement | null>>({});
  const videoRefs    = useRef<Record<string, HTMLVideoElement | null>>({});

  // Track which reels we've already sent a "view" event for (per session)
  const viewedReelsRef = useRef<Set<string>>(new Set());
  // Track when a reel started playing (for watchSeconds)
  const playStartRef   = useRef<Record<string, number>>({});

  // ── Data hooks ────────────────────────────────────────────────────────────
  const {
    data,
    isLoading,
    error,
    hasNextPage,
    fetchNextPage,
    isFetchingNextPage,
    refetch,
  } = useReelFeed();

  const { mutate: createReel, isPending: isCreatingReel } = useCreateReel();
  const { mutate: toggleLike }                            = useToggleLikeReel();
  const { mutate: addView }                               = useAddReelView();

  // ── Derived data ──────────────────────────────────────────────────────────
  const allReels: Reel[] = useMemo(
    () =>
      Array.from(
        new Map(
          (data?.pages.flatMap((page) => page.reels) || []).map((r) => [r.id, r])
        ).values()
      ),
    [data]
  );

  const effectiveActiveId = activeReelId || allReels[0]?.id || null;

  const activeIndex = useMemo(
    () => allReels.findIndex((r) => r.id === effectiveActiveId),
    [allReels, effectiveActiveId]
  );

  // ── IntersectionObserver: detect which reel is visible ───────────────────
  useEffect(() => {
    if (!allReels.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        let best: IntersectionObserverEntry | null = null;
        for (const entry of entries) {
          if (
            entry.isIntersecting &&
            (!best || entry.intersectionRatio > best.intersectionRatio)
          ) {
            best = entry;
          }
        }
        if (!best) return;
        const id = (best.target as HTMLElement).dataset.reelId;
        if (id) setActiveReelId(id);
      },
      { threshold: [0.55, 0.75, 0.9] }
    );

    allReels.forEach((reel) => {
      const node = reelRefs.current[reel.id];
      if (node) observer.observe(node);
    });

    return () => observer.disconnect();
  }, [allReels]);

  // ── Mute / play control ───────────────────────────────────────────────────
  useEffect(() => {
    Object.values(videoRefs.current).forEach((el) => {
      if (el) el.muted = isMuted;
    });
  }, [isMuted, allReels]);

  useEffect(() => {
    Object.entries(videoRefs.current).forEach(([reelId, el]) => {
      if (!el) return;
      if (reelId === effectiveActiveId) {
        const p = el.play();
        if (p) p.catch(() => {});
        playStartRef.current[reelId] = Date.now();
      } else {
        el.pause();
      }
    });
  }, [effectiveActiveId, allReels]);

  // ── Fire "view" event when reel becomes active ────────────────────────────
  useEffect(() => {
    if (!effectiveActiveId) return;
    if (viewedReelsRef.current.has(effectiveActiveId)) return;

    viewedReelsRef.current.add(effectiveActiveId);
    // Reset play start
    playStartRef.current[effectiveActiveId] = Date.now();

    addView({ reelId: effectiveActiveId });
  }, [effectiveActiveId, addView]);

  // ── Infinite scroll trigger ───────────────────────────────────────────────
  useEffect(() => {
    if (activeIndex === -1) return;
    if (activeIndex >= allReels.length - 2 && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [activeIndex, allReels.length, hasNextPage, isFetchingNextPage, fetchNextPage]);

  // ── Cleanup preview URL ───────────────────────────────────────────────────
  useEffect(
    () => () => {
      if (reelPreview) URL.revokeObjectURL(reelPreview);
    },
    [reelPreview]
  );

  // ─── Handlers ─────────────────────────────────────────────────────────────

  const handleLike = (reel: Reel) => {
    toggleLike({ reelId: reel.id, isLiked: reel.isLikedByCurrentUser });
  };

  const handleShare = async (reelId: string) => {
    const shareUrl = `${window.location.origin}/reels?reel=${reelId}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: "Reel trên ChatMeNow", url: shareUrl });
        return;
      }
      await navigator.clipboard.writeText(shareUrl);
      toast.success("Đã copy link reel");
    } catch {
      toast.error("Không thể chia sẻ reel");
    }
  };

  const resetCreateState = () => {
    setReelCaption("");
    setReelFile(null);
    setReelDuration(0);
    if (reelPreview) {
      URL.revokeObjectURL(reelPreview);
      setReelPreview("");
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleCreateDialog = (nextOpen: boolean) => {
    setCreateOpen(nextOpen);
    if (!nextOpen) resetCreateState();
  };

  const handleReelFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("video/")) {
      toast.error("Vui lòng chọn file video");
      event.target.value = "";
      return;
    }
    if (file.size > MAX_REEL_SIZE) {
      toast.error("Video vượt quá 50MB");
      event.target.value = "";
      return;
    }

    const duration = await getVideoDuration(file);
    if (!duration || duration > MAX_REEL_DURATION) {
      toast.error("Reel chỉ hỗ trợ video tối đa 90 giây");
      event.target.value = "";
      return;
    }

    if (reelPreview) URL.revokeObjectURL(reelPreview);

    setReelFile(file);
    setReelDuration(duration);
    setReelPreview(URL.createObjectURL(file));
  };

  const handleCreateReel = () => {
    if (!reelFile) {
      toast.error("Bạn chưa chọn video");
      return;
    }

    createReel(
      {
        caption:   reelCaption.trim(),
        privacy:   "public",
        duration:  reelDuration,
        videoFile: reelFile,
      },
      {
        onSuccess: () => {
          handleCreateDialog(false);
          setActiveReelId(null);
        },
      }
    );
  };

  // ─── Render states ────────────────────────────────────────────────────────

  if (isLoading && !allReels.length) {
    return (
      <div className="flex h-full items-center justify-center bg-black text-slate-300">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  if (error && !allReels.length) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 bg-black text-slate-200">
        <p>Không thể tải reel</p>
        <Button type="button" variant="secondary" onClick={() => refetch()}>
          Thử lại
        </Button>
      </div>
    );
  }

  // ─── Main render ──────────────────────────────────────────────────────────

  return (
    <>
      <div className="relative h-full w-full bg-black text-white md:bg-white">
        {/* Top-left: brand */}
        <div className="absolute left-4 top-4 z-20 flex items-center gap-2">
          <div className="flex items-center gap-2 rounded-full bg-black/45 px-3 py-1.5 backdrop-blur">
            <Clapperboard className="h-4 w-4" />
            <span className="text-sm font-semibold">Reels</span>
          </div>
        </div>

        {/* Top-right: actions */}
        <div className="absolute right-4 top-4 z-20 flex items-center gap-2">
          <Button
            type="button"
            onClick={() => router.push("/games")}
            className="h-10 rounded-full bg-white px-3 text-slate-900 hover:bg-slate-100"
          >
            <Gamepad2 className="h-4 w-4 md:mr-1" />
            <span className="hidden md:inline">Mini game</span>
          </Button>

          <Button
            type="button"
            size="icon"
            variant="secondary"
            onClick={() => setIsMuted((prev) => !prev)}
            className="h-10 w-10 rounded-full border-white/20 bg-black/50 text-white hover:bg-black/70"
          >
            {isMuted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
          </Button>

          <Button
            type="button"
            onClick={() => setCreateOpen(true)}
            className="h-10 rounded-full bg-white px-4 text-slate-900 hover:bg-slate-100"
          >
            <Plus className="mr-1 h-4 w-4" />
            Tạo reel
          </Button>
        </div>

        {/* ── Reel feed ── */}
        {allReels.length > 0 ? (
          <div className="h-full w-full snap-y snap-mandatory overflow-y-auto md:px-6 md:py-4">
            {allReels.map((reel) => {
              const isActive = reel.id === effectiveActiveId;

              return (
                <section
                  key={reel.id}
                  ref={(node) => { reelRefs.current[reel.id] = node; }}
                  data-reel-id={reel.id}
                  className="relative h-full w-full snap-start md:flex md:items-center md:justify-center"
                >
                  <div className="relative h-full w-full md:h-[min(92vh,860px)] md:w-[clamp(460px,34vw,520px)] md:overflow-hidden md:rounded-[28px] md:border md:border-white/10 md:shadow-[0_20px_80px_rgba(0,0,0,0.55)]">
                    {/* Video element */}
                    <video
                      ref={(node) => { videoRefs.current[reel.id] = node; }}
                      src={reel.videoUrl}
                      className="h-full w-full object-cover"
                      loop
                      playsInline
                      muted={isMuted}
                      autoPlay={isActive}
                      controls={false}
                      onClick={(e) => {
                        const el = e.currentTarget;
                        if (el.paused) {
                          const p = el.play();
                          if (p) p.catch(() => {});
                        } else {
                          el.pause();
                        }
                      }}
                    />

                    {/* Gradient overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-black/30" />

                    {/* ── Right action buttons ── */}
                    <div className="absolute bottom-20 right-4 z-10 flex flex-col items-center gap-4 md:bottom-6">
                      {/* Like */}
                      <button
                        type="button"
                        id={`reel-like-btn-${reel.id}`}
                        onClick={() => handleLike(reel)}
                        className="flex flex-col items-center gap-1"
                      >
                        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-black/45 backdrop-blur">
                          <Heart
                            className={`h-6 w-6 transition-colors ${
                              reel.isLikedByCurrentUser
                                ? "fill-red-500 text-red-500"
                                : "text-white"
                            }`}
                          />
                        </div>
                        <span className="text-xs font-semibold">
                          {reel.likesCount || 0}
                        </span>
                      </button>

                      {/* Comment */}
                      <button
                        type="button"
                        id={`reel-comment-btn-${reel.id}`}
                        onClick={() => setCommentReelId(reel.id)}
                        className="flex flex-col items-center gap-1"
                      >
                        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-black/45 backdrop-blur">
                          <MessageCircle className="h-6 w-6 text-white" />
                        </div>
                        <span className="text-xs font-semibold">
                          {reel.commentsCount || 0}
                        </span>
                      </button>

                      {/* Share */}
                      <button
                        type="button"
                        id={`reel-share-btn-${reel.id}`}
                        onClick={() => handleShare(reel.id)}
                        className="flex flex-col items-center gap-1"
                      >
                        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-black/45 backdrop-blur">
                          <Share2 className="h-6 w-6 text-white" />
                        </div>
                        <span className="text-xs font-semibold">Chia sẻ</span>
                      </button>
                    </div>

                    {/* ── Bottom author + caption ── */}
                    <div className="absolute bottom-20 left-4 right-20 z-10 md:bottom-6">
                      <div className="mb-2 flex items-center gap-3">
                        <PresignedAvatar
                          avatarKey={reel.author?.avatar}
                          displayName={reel.author?.displayName}
                          className="h-9 w-9 border border-white/40"
                        />
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold">
                            {reel.author?.displayName || "Người dùng"}
                          </p>
                          <p className="text-xs text-white/75">
                            {new Date(reel.createdAt).toLocaleDateString("vi-VN", {
                              day:    "2-digit",
                              month:  "2-digit",
                              hour:   "2-digit",
                              minute: "2-digit",
                            })}
                          </p>
                        </div>
                      </div>

                      {reel.caption ? (
                        <p className="line-clamp-3 whitespace-pre-wrap break-words text-sm leading-relaxed text-white/95">
                          {reel.caption}
                        </p>
                      ) : (
                        <p className="text-sm text-white/80">Reel không có mô tả</p>
                      )}
                    </div>
                  </div>
                </section>
              );
            })}

            {/* Loading more indicator */}
            {isFetchingNextPage && (
              <div className="absolute bottom-4 left-1/2 z-20 -translate-x-1/2 rounded-full bg-black/60 px-3 py-1.5">
                <Loader2 className="h-4 w-4 animate-spin" />
              </div>
            )}
          </div>
        ) : (
          /* ── Empty state ── */
          <div className="flex h-full flex-col items-center justify-center gap-3 px-4 text-center">
            <Clapperboard className="h-12 w-12 text-white/70" />
            <h2 className="text-xl font-semibold">Chưa có reel nào</h2>
            <p className="max-w-md text-sm text-white/75">
              Hãy tạo reel đầu tiên để bắt đầu trải nghiệm video ngắn.
            </p>
            <Button
              type="button"
              onClick={() => setCreateOpen(true)}
              className="rounded-full bg-white px-4 text-slate-900 hover:bg-slate-100"
            >
              <Plus className="mr-1 h-4 w-4" />
              Tạo reel
            </Button>
          </div>
        )}
      </div>

      {/* ── Upload dialog ── */}
      <Dialog open={createOpen} onOpenChange={handleCreateDialog}>
        <DialogContent className="max-w-lg overflow-hidden rounded-2xl p-0">
          <DialogHeader className="border-b px-5 pb-3 pt-5">
            <DialogTitle className="text-base font-semibold">Tạo reel mới</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 px-5 py-4">
            {reelPreview ? (
              <div className="relative overflow-hidden rounded-xl bg-black">
                <video
                  src={reelPreview}
                  className="max-h-[360px] w-full object-contain"
                  controls
                  playsInline
                />
                <button
                  type="button"
                  onClick={resetCreateState}
                  className="absolute right-2 top-2 rounded-full bg-black/60 p-1.5 text-white hover:bg-black/80"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex h-[220px] w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-300 text-slate-500 transition-colors hover:border-blue-400 hover:text-blue-600"
              >
                <Upload className="h-6 w-6" />
                <span className="text-sm font-medium">
                  Chọn video reel (tối đa 90s)
                </span>
              </button>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept="video/*"
              className="hidden"
              onChange={handleReelFile}
            />

            <Textarea
              value={reelCaption}
              onChange={(e) => setReelCaption(e.target.value)}
              placeholder="Viết mô tả cho reel của bạn..."
              className="min-h-[96px] resize-none"
              disabled={isCreatingReel}
            />

            <div className="rounded-xl bg-slate-50 p-3 text-xs text-slate-500">
              Reel sẽ đăng công khai và ưu tiên video dọc ngắn dưới 90 giây.
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 border-t px-5 py-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleCreateDialog(false)}
            >
              Hủy
            </Button>
            <Button
              type="button"
              onClick={handleCreateReel}
              disabled={isCreatingReel || !reelFile}
              className="min-w-[120px]"
            >
              {isCreatingReel ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Đang đăng...
                </>
              ) : (
                "Đăng reel"
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Comments dialog ── */}
      <ReelCommentsDialog
        postId={commentReelId}
        open={!!commentReelId}
        onOpenChange={(open) => {
          if (!open) setCommentReelId(null);
        }}
      />
    </>
  );
}
