"use client";
import { useRef, useEffect, useState, useCallback } from "react";
import {
    Heart,
    MessageCircle,
    Share2,
    Music2,
    MoreVertical,
    Trash2,
    Volume2,
    VolumeX,
} from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Reel } from "@/types/reel";
import { reelService } from "@/services/reel";
import { MusicPlayerInline } from "@/components/music/music-player-inline";
import { ReelCommentDrawer } from "@/components/reel/reel-comment-drawer";
import { PresignedAvatar } from "@/components/ui/presigned-avatar";
import { useAuthStore } from "@/store/use-auth-store";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { ShareFriendsModal } from "@/components/reel/share-friends-modal";

interface ReelCardProps {
    reel: Reel;
    isActive: boolean;
}

export function ReelCard({ reel, isActive }: ReelCardProps) {
    const qc = useQueryClient();
    const videoRef = useRef<HTMLVideoElement>(null);
    const viewTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const hasCountedView = useRef(false);

    const [liked, setLiked] = useState(reel.isLikedByCurrentUser);
    const [likeCount, setLikeCount] = useState(reel.likeCount);
    const [commentCount, setCommentCount] = useState(reel.commentCount);
    const [muted, setMuted] = useState(true);
    const [paused, setPaused] = useState(false);
    const [showOptions, setShowOptions] = useState(false);
    const [showMusicPlayer, setShowMusicPlayer] = useState(false);
    const [commentDrawerOpen, setCommentDrawerOpen] = useState(false);
    const [shareModalOpen, setShareModalOpen] = useState(false);
    const [likeAnim, setLikeAnim] = useState(false);

    const { user } = useAuthStore();
    const userId = user?.id || user?._id;
    const ownerId =
        typeof reel.userId === "string"
            ? reel.userId
            : (reel.user?._id ?? reel.user?.id ?? "");
    const isOwner = !!userId && userId === ownerId;

    // ── Play / pause on active change ─────────────────────────────────────────
    useEffect(() => {
        const video = videoRef.current;
        if (!video) return;

        if (isActive) {
            setPaused(false);
            video.play().catch(() => { });
            if (!hasCountedView.current) {
                viewTimerRef.current = setTimeout(() => {
                    hasCountedView.current = true;
                    reelService.incrementView(reel._id).catch(() => { });
                }, 3000);
            }
        } else {
            video.pause();
            video.currentTime = 0;
            setPaused(true);
            if (viewTimerRef.current) clearTimeout(viewTimerRef.current);
            setShowOptions(false);
            setCommentDrawerOpen(false);
        }

        return () => {
            if (viewTimerRef.current) clearTimeout(viewTimerRef.current);
        };
    }, [isActive, reel._id]);

    // ── Like (optimistic) ─────────────────────────────────────────────────────
    const { mutate: likeMutation } = useMutation({
        mutationFn: () => reelService.toggleLike(reel._id),
        onSuccess: (data) => {
            setLiked(data.liked);
            setLikeCount(data.likeCount);
        },
        onError: () => {
            setLiked(reel.isLikedByCurrentUser);
            setLikeCount(reel.likeCount);
        },
    });

    const toggleLike = () => {
        if (!user) return;

        const next = !liked;
        // Optimistic UI update immediately
        setLiked(next);
        setLikeCount((prev) => (liked ? Math.max(0, prev - 1) : prev + 1));
        if (next) animateLike();

        likeMutation();
    };

    const animateLike = () => {
        setLikeAnim(true);
        setTimeout(() => setLikeAnim(false), 600);
    };

    const handleShareClick = () => {
        setShareModalOpen(true);
    };

    // ── Delete ────────────────────────────────────────────────────────────────
    const { mutate: deleteReel } = useMutation({
        mutationFn: () => reelService.deleteReel(reel._id),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["reel-feed"] });
            qc.invalidateQueries({ queryKey: ["my-reels"] });
        },
    });

    // ── Video tap → toggle play/pause ─────────────────────────────────────────
    const handleVideoClick = useCallback(() => {
        const video = videoRef.current;
        if (!video) return;
        if (video.paused) {
            video.play().catch(() => { });
            setPaused(false);
        } else {
            video.pause();
            setPaused(true);
        }
    }, []);

    const author = reel.user;
    const displayName = author?.displayName ?? "User";
    const avatar = author?.avatar;

    const fmt = (n: number) => (n > 999 ? `${(n / 1000).toFixed(1)}k` : String(n));

    return (
        <>
            {/* ── Card ────────────────────────────────────────────────────────── */}
            <div className="relative w-full h-full bg-black overflow-hidden">
                {/* Video */}
                <video
                    ref={videoRef}
                    src={reel.videoUrl}
                    className="absolute inset-0 w-full h-full object-cover"
                    loop
                    muted={muted}
                    playsInline
                    onClick={handleVideoClick}
                />

                {/* Gradient overlays */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-black/30 pointer-events-none" />

                {/* Pause indicator (centre flash) */}
                {paused && isActive && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div className="w-16 h-16 rounded-full bg-black/50 flex items-center justify-center animate-scaleIn">
                            <svg className="w-8 h-8 text-white fill-white" viewBox="0 0 24 24">
                                <rect x="6" y="4" width="4" height="16" rx="1" />
                                <rect x="14" y="4" width="4" height="16" rx="1" />
                            </svg>
                        </div>
                    </div>
                )}

                {/* ── Top bar: mute + options ─────────────────────────────────── */}
                <div className="absolute top-3 left-3 right-3 z-10 flex items-start justify-between">
                    <button
                        onClick={() => setMuted((m) => !m)}
                        className="w-9 h-9 flex items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-sm border border-white/10 transition-transform active:scale-90"
                        aria-label={muted ? "Bật âm thanh" : "Tắt âm thanh"}
                    >
                        {muted ? (
                            <VolumeX className="w-4 h-4" />
                        ) : (
                            <Volume2 className="w-4 h-4" />
                        )}
                    </button>

                    {isOwner && (
                        <div className="relative">
                            <button
                                onClick={() => setShowOptions((p) => !p)}
                                className="w-9 h-9 flex items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-sm border border-white/10 transition-transform active:scale-90"
                                aria-label="Tuỳ chọn"
                            >
                                <MoreVertical className="w-4 h-4" />
                            </button>

                            {showOptions && (
                                <div className="absolute right-0 top-11 w-40 bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-slate-200 dark:border-white/10 overflow-hidden z-20 animate-scaleIn">
                                    <button
                                        onClick={() => {
                                            deleteReel();
                                            setShowOptions(false);
                                        }}
                                        className="w-full flex items-center gap-2.5 px-4 py-3 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors font-medium"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                        Xóa Reel
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* ── Right actions ───────────────────────────────────────────── */}
                <div className="absolute right-3 bottom-28 sm:bottom-32 z-10 flex flex-col items-center gap-5">
                    {/* Like */}
                    <button
                        onClick={() => toggleLike()}
                        className="flex flex-col items-center gap-1 group"
                        aria-label="Thích"
                    >
                        <div
                            className={cn(
                                "w-11 h-11 flex items-center justify-center rounded-full transition-all duration-200",
                                "bg-black/40 backdrop-blur-sm border border-white/10",
                                "active:scale-90 group-hover:scale-105",
                                likeAnim && "scale-125",
                            )}
                        >
                            <Heart
                                className={cn(
                                    "w-5 h-5 transition-all duration-200",
                                    liked ? "fill-red-500 text-red-500" : "text-white",
                                )}
                            />
                        </div>
                        <span className="text-white text-xs font-semibold drop-shadow-md tabular-nums">
                            {fmt(likeCount)}
                        </span>
                    </button>

                    {/* Comment */}
                    <button
                        onClick={() => setCommentDrawerOpen(true)}
                        className="flex flex-col items-center gap-1 group"
                        aria-label="Bình luận"
                    >
                        <div className="w-11 h-11 flex items-center justify-center rounded-full bg-black/40 backdrop-blur-sm border border-white/10 transition-all active:scale-90 group-hover:scale-105">
                            <MessageCircle className="w-5 h-5 text-white" />
                        </div>
                        <span className="text-white text-xs font-semibold drop-shadow-md tabular-nums">
                            {fmt(commentCount)}
                        </span>
                    </button>

                    {/* Share */}
                    <button
                        type="button"
                        onClick={handleShareClick}
                        className="flex flex-col items-center gap-1 group"
                        aria-label="Chia sẻ"
                    >
                        <div className="w-11 h-11 flex items-center justify-center rounded-full bg-black/40 backdrop-blur-sm border border-white/10 transition-all active:scale-90 group-hover:scale-105">
                            <Share2 className="w-5 h-5 text-white" />
                        </div>
                        <span className="text-white text-xs font-semibold drop-shadow-md">
                            Chia sẻ
                        </span>
                    </button>

                    {/* Music toggle */}
                    {reel.musicUrl && (
                        <button
                            onClick={() => setShowMusicPlayer((p) => !p)}
                            className="flex flex-col items-center gap-1 group"
                            aria-label="Nhạc nền"
                        >
                            <div
                                className={cn(
                                    "w-11 h-11 flex items-center justify-center rounded-full backdrop-blur-sm border transition-all active:scale-90 group-hover:scale-105",
                                    showMusicPlayer
                                        ? "bg-primary/70 border-primary/50"
                                        : "bg-black/40 border-white/10",
                                )}
                            >
                                <Music2
                                    className={cn(
                                        "w-5 h-5",
                                        showMusicPlayer ? "text-white" : "text-purple-300",
                                        isActive && "animate-spin [animation-duration:3s]",
                                    )}
                                />
                            </div>
                        </button>
                    )}
                </div>

                {/* ── Bottom info ──────────────────────────────────────────────── */}
                <div className="absolute bottom-0 left-0 right-14 z-10 px-4 pb-5 pt-8">
                    {/* Author row */}
                    <div className="flex items-center gap-2.5 mb-2">
                        <PresignedAvatar
                            avatarKey={avatar}
                            displayName={displayName}
                            className="w-9 h-9 border-2 border-white/60 shrink-0"
                        />
                        <span className="text-white font-semibold text-sm drop-shadow-md leading-none">
                            {displayName}
                        </span>
                    </div>

                    {/* Caption */}
                    {reel.caption && (
                        <p className="text-white/90 text-sm leading-snug mb-2 line-clamp-2 drop-shadow-md font-sans">
                            {reel.caption}
                        </p>
                    )}

                    {/* Music ticker */}
                    {reel.musicTitle && (
                        <div className="flex items-center gap-1.5 overflow-hidden">
                            <Music2 className="w-3.5 h-3.5 text-purple-300 shrink-0 animate-spin [animation-duration:4s]" />
                            <div className="overflow-hidden">
                                <p className="text-white/80 text-xs truncate">
                                    {reel.musicTitle}
                                    {reel.musicArtist ? ` — ${reel.musicArtist}` : ""}
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Inline player */}
                    {showMusicPlayer && reel.musicUrl && (
                        <div className="mt-2">
                            <MusicPlayerInline
                                track={{
                                    url: reel.musicUrl,
                                    title: reel.musicTitle,
                                    artist: reel.musicArtist,
                                }}
                                autoPlay={isActive}
                            />
                        </div>
                    )}
                </div>
            </div>

            {/* Comment drawer */}
            <ReelCommentDrawer
                reelId={reel._id}
                open={commentDrawerOpen}
                onClose={() => setCommentDrawerOpen(false)}
            />

            <ShareFriendsModal
                open={shareModalOpen}
                onOpenChange={setShareModalOpen}
                reelUrl={`${typeof window !== 'undefined' ? window.location.origin : ''}/reels?id=${reel.id || reel._id}`}
            />
        </>
    );
}
