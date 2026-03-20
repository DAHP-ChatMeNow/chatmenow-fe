"use client";

import { ChangeEvent, useEffect, useMemo, useRef, useState } from "react";
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
  useAddComment,
  useComments,
  useCreatePost,
  useFeed,
  useToggleLikePost,
} from "@/hooks/use-post";
import { Post, PostMedia } from "@/types/post";
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

const MAX_REEL_SIZE = 50 * 1024 * 1024; // 50MB
const MAX_REEL_DURATION = 90; // 90s

type ReelItem = {
  post: Post;
  video: PostMedia;
};

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

const toReels = (posts: Post[]) =>
  posts
    .map((post) => {
      const video = post.media?.find(
        (item) => item.type === "video" || item.type.startsWith("video"),
      );

      return video ? { post, video } : null;
    })
    .filter((item): item is ReelItem => item !== null);

function ReelCommentsDialog({
  post,
  open,
  onOpenChange,
}: {
  post: Post | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [commentInput, setCommentInput] = useState("");
  const { data: commentsData, isLoading } = useComments(post?.id || "");
  const { mutate: addComment, isPending } = useAddComment();

  const comments = commentsData || [];

  const handleAddComment = () => {
    const content = commentInput.trim();
    if (!post || !content) return;

    addComment(
      { postId: post.id, content },
      {
        onSuccess: () => {
          setCommentInput("");
        },
      },
    );
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) {
          setCommentInput("");
        }
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
          ) : comments.length > 0 ? (
            comments.map((comment) => (
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
                  <p className="text-sm break-words text-slate-700">
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
            onChange={(event) => setCommentInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                handleAddComment();
              }
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

export default function ReelsPage() {
  const router = useRouter();
  const [activeReelId, setActiveReelId] = useState<string | null>(null);
  const [isMuted, setIsMuted] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [commentOpenPostId, setCommentOpenPostId] = useState<string | null>(
    null,
  );
  const [reelCaption, setReelCaption] = useState("");
  const [reelFile, setReelFile] = useState<File | null>(null);
  const [reelDuration, setReelDuration] = useState(0);
  const [reelPreview, setReelPreview] = useState("");

  const fileInputRef = useRef<HTMLInputElement>(null);
  const reelRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const videoRefs = useRef<Record<string, HTMLVideoElement | null>>({});

  const {
    data,
    isLoading,
    error,
    hasNextPage,
    fetchNextPage,
    refetch,
    isFetchingNextPage,
  } = useFeed();

  const { mutate: createPost, isPending: isCreatingReel } = useCreatePost();
  const { mutate: toggleLike } = useToggleLikePost();

  const allPosts = useMemo(
    () =>
      Array.from(
        new Map(
          (data?.pages.flatMap((page) => page.posts) || []).map((post) => [
            post.id,
            post,
          ]),
        ).values(),
      ),
    [data],
  );

  const reels = useMemo(() => toReels(allPosts), [allPosts]);
  const effectiveActiveReelId = activeReelId || reels[0]?.post.id || null;

  const activeIndex = useMemo(
    () => reels.findIndex((item) => item.post.id === effectiveActiveReelId),
    [reels, effectiveActiveReelId],
  );

  const activeReel = useMemo(
    () =>
      reels.find((item) => item.post.id === effectiveActiveReelId)?.post ||
      null,
    [reels, effectiveActiveReelId],
  );

  useEffect(() => {
    if (!reels.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        let bestEntry: IntersectionObserverEntry | null = null;

        for (const entry of entries) {
          if (!entry.isIntersecting) continue;

          if (
            !bestEntry ||
            entry.intersectionRatio > bestEntry.intersectionRatio
          ) {
            bestEntry = entry;
          }
        }

        if (!bestEntry) return;

        const reelId = (bestEntry.target as HTMLElement).dataset.reelId;
        if (reelId) {
          setActiveReelId(reelId);
        }
      },
      {
        threshold: [0.55, 0.75, 0.9],
      },
    );

    reels.forEach((item) => {
      const reelNode = reelRefs.current[item.post.id];
      if (reelNode) {
        observer.observe(reelNode);
      }
    });

    return () => observer.disconnect();
  }, [reels]);

  useEffect(() => {
    Object.values(videoRefs.current).forEach((videoEl) => {
      if (videoEl) {
        videoEl.muted = isMuted;
      }
    });
  }, [isMuted, reels]);

  useEffect(() => {
    Object.entries(videoRefs.current).forEach(([reelId, videoEl]) => {
      if (!videoEl) return;

      if (reelId === effectiveActiveReelId) {
        const playPromise = videoEl.play();
        if (playPromise) {
          playPromise.catch(() => {
            // Ignore autoplay interruption from browser policy.
          });
        }
      } else {
        videoEl.pause();
      }
    });
  }, [effectiveActiveReelId, reels]);

  useEffect(() => {
    if (activeIndex === -1) return;

    if (activeIndex >= reels.length - 2 && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [activeIndex, reels.length, hasNextPage, isFetchingNextPage, fetchNextPage]);

  useEffect(
    () => () => {
      if (reelPreview) {
        URL.revokeObjectURL(reelPreview);
      }
    },
    [reelPreview],
  );

  const handleLike = (post: Post) => {
    toggleLike({ postId: post.id, isLiked: post.isLikedByCurrentUser || false });
  };

  const handleShare = async (postId: string) => {
    const shareUrl = `${window.location.origin}/reels?reel=${postId}`;

    try {
      if (navigator.share) {
        await navigator.share({
          title: "Reel trên ChatMeNow",
          text: "Xem reel này nhé",
          url: shareUrl,
        });
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

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleCreateDialog = (nextOpen: boolean) => {
    setCreateOpen(nextOpen);

    if (!nextOpen) {
      resetCreateState();
    }
  };

  const handleReelFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (!selectedFile) return;

    if (!selectedFile.type.startsWith("video/")) {
      toast.error("Vui lòng chọn file video");
      event.target.value = "";
      return;
    }

    if (selectedFile.size > MAX_REEL_SIZE) {
      toast.error("Video vượt quá 50MB");
      event.target.value = "";
      return;
    }

    const duration = await getVideoDuration(selectedFile);
    if (!duration || duration > MAX_REEL_DURATION) {
      toast.error("Reel chỉ hỗ trợ video tối đa 90 giây");
      event.target.value = "";
      return;
    }

    if (reelPreview) {
      URL.revokeObjectURL(reelPreview);
    }

    setReelFile(selectedFile);
    setReelDuration(duration);
    setReelPreview(URL.createObjectURL(selectedFile));
  };

  const handleCreateReel = () => {
    if (!reelFile) {
      toast.error("Bạn chưa chọn video");
      return;
    }

    createPost(
      {
        content: reelCaption.trim(),
        privacy: "public",
        mediaFiles: [reelFile],
        videoDurations: [reelDuration],
      },
      {
        onSuccess: () => {
          handleCreateDialog(false);
          setActiveReelId(null);
        },
      },
    );
  };

  if (isLoading && !reels.length) {
    return (
      <div className="flex h-full items-center justify-center bg-black text-slate-300">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  if (error && !reels.length) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 bg-black text-slate-200">
        <p>Không thể tải reel</p>
        <Button type="button" variant="secondary" onClick={() => refetch()}>
          Thử lại
        </Button>
      </div>
    );
  }

  return (
    <>
      <div className="relative h-full w-full bg-black text-white md:bg-white">
        <div className="absolute left-4 top-4 z-20 flex items-center gap-2">
          <div className="flex items-center gap-2 rounded-full bg-black/45 px-3 py-1.5 backdrop-blur">
            <Clapperboard className="h-4 w-4" />
            <span className="text-sm font-semibold">Reels</span>
          </div>
        </div>

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

        {reels.length > 0 ? (
          <div className="h-full w-full snap-y snap-mandatory overflow-y-auto md:px-6 md:py-4">
            {reels.map((reel) => {
              const isActive = reel.post.id === effectiveActiveReelId;

              return (
                <section
                  key={reel.post.id}
                  ref={(node) => {
                    reelRefs.current[reel.post.id] = node;
                  }}
                  data-reel-id={reel.post.id}
                  className="relative h-full w-full snap-start md:flex md:items-center md:justify-center"
                >
                  <div className="relative h-full w-full md:h-[min(92vh,860px)] md:w-[clamp(460px,34vw,520px)] md:overflow-hidden md:rounded-[28px] md:border md:border-white/10 md:shadow-[0_20px_80px_rgba(0,0,0,0.55)]">
                    <video
                      ref={(node) => {
                        videoRefs.current[reel.post.id] = node;
                      }}
                      src={reel.video.url}
                      className="h-full w-full object-cover"
                      loop
                      playsInline
                      muted={isMuted}
                      autoPlay={isActive}
                      controls={false}
                      onClick={(event) => {
                        const videoEl = event.currentTarget;

                        if (videoEl.paused) {
                          const playPromise = videoEl.play();
                          if (playPromise) {
                            playPromise.catch(() => {});
                          }
                        } else {
                          videoEl.pause();
                        }
                      }}
                    />

                    <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-black/30" />

                    <div className="absolute bottom-20 right-4 z-10 flex flex-col items-center gap-4 md:bottom-6">
                      <button
                        type="button"
                        onClick={() => handleLike(reel.post)}
                        className="flex flex-col items-center gap-1"
                      >
                        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-black/45 backdrop-blur">
                          <Heart
                            className={`h-6 w-6 ${reel.post.isLikedByCurrentUser ? "fill-red-500 text-red-500" : "text-white"}`}
                          />
                        </div>
                        <span className="text-xs font-semibold">
                          {reel.post.likesCount || 0}
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setCommentOpenPostId(reel.post.id)}
                        className="flex flex-col items-center gap-1"
                      >
                        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-black/45 backdrop-blur">
                          <MessageCircle className="h-6 w-6 text-white" />
                        </div>
                        <span className="text-xs font-semibold">
                          {reel.post.commentsCount || 0}
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleShare(reel.post.id)}
                        className="flex flex-col items-center gap-1"
                      >
                        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-black/45 backdrop-blur">
                          <Share2 className="h-6 w-6 text-white" />
                        </div>
                        <span className="text-xs font-semibold">Chia sẻ</span>
                      </button>
                    </div>

                    <div className="absolute bottom-20 left-4 right-20 z-10 md:bottom-6">
                      <div className="mb-2 flex items-center gap-3">
                        <PresignedAvatar
                          avatarKey={reel.post.author?.avatar}
                          displayName={reel.post.author?.displayName}
                          className="h-9 w-9 border border-white/40"
                        />
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold">
                            {reel.post.author?.displayName || "Người dùng"}
                          </p>
                          <p className="text-xs text-white/75">
                            {new Date(reel.post.createdAt).toLocaleDateString(
                              "vi-VN",
                              {
                                day: "2-digit",
                                month: "2-digit",
                                hour: "2-digit",
                                minute: "2-digit",
                              },
                            )}
                          </p>
                        </div>
                      </div>

                      {reel.post.content ? (
                        <p className="line-clamp-3 whitespace-pre-wrap break-words text-sm leading-relaxed text-white/95">
                          {reel.post.content}
                        </p>
                      ) : (
                        <p className="text-sm text-white/80">Reel không có mô tả</p>
                      )}
                    </div>
                  </div>
                </section>
              );
            })}

            {isFetchingNextPage && (
              <div className="absolute bottom-4 left-1/2 z-20 -translate-x-1/2 rounded-full bg-black/60 px-3 py-1.5">
                <Loader2 className="h-4 w-4 animate-spin" />
              </div>
            )}
          </div>
        ) : (
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
              onChange={(event) => setReelCaption(event.target.value)}
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

      <ReelCommentsDialog
        post={
          activeReel && activeReel.id === commentOpenPostId
            ? activeReel
            : allPosts.find((post) => post.id === commentOpenPostId) || null
        }
        open={!!commentOpenPostId}
        onOpenChange={(open) => {
          if (!open) {
            setCommentOpenPostId(null);
          }
        }}
      />
    </>
  );
}
