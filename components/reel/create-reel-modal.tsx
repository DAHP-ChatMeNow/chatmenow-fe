"use client";
import { useState, useRef } from "react";
import { X, Upload, Clapperboard, Music2, Loader2, ChevronRight } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { reelService } from "@/services/reel";
import { MusicTrack } from "@/types/music";
import { MusicPickerModal } from "@/components/music/music-picker-modal";
import { toast } from "sonner";
import {
    PREMIUM_ERROR_CODE,
    extractPremiumErrorInfo,
    isPremium403Error,
} from "@/lib/premium";

interface CreateReelModalProps {
    open: boolean;
    onClose: () => void;
}

type Step = "select" | "compose";

export function CreateReelModal({ open, onClose }: CreateReelModalProps) {
    const qc = useQueryClient();

    const [step, setStep] = useState<Step>("select");
    const [videoFile, setVideoFile] = useState<File | null>(null);
    const [videoPreviewUrl, setVideoPreviewUrl] = useState<string | null>(null);
    const [caption, setCaption] = useState("");
    const [selectedTrack, setSelectedTrack] = useState<MusicTrack | null>(null);
    const [musicPickerOpen, setMusicPickerOpen] = useState(false);
    const [uploadProgress, setUploadProgress] = useState<number | null>(null);
    const [videoDuration, setVideoDuration] = useState<number | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const getVideoDuration = (file: File): Promise<number> =>
        new Promise((resolve) => {
            const video = document.createElement("video");
            const url = URL.createObjectURL(file);
            video.preload = "metadata";
            video.src = url;
            video.onloadedmetadata = () => {
                URL.revokeObjectURL(url);
                resolve(Math.ceil(video.duration || 0));
            };
            video.onerror = () => {
                URL.revokeObjectURL(url);
                resolve(0);
            };
        });

    const getErrorMessage = (error: unknown) => {
        if (typeof error !== "object" || !error) return "Đăng reel thất bại";
        const err = error as {
            response?: { data?: { message?: string } };
            message?: string;
        };
        return err.response?.data?.message || err.message || "Đăng reel thất bại";
    };

    const handleSelectedFile = async (file: File) => {
        if (!file.type.startsWith("video/")) {
            toast.error("Chỉ chấp nhận file video");
            return;
        }
        if (file.size > 200 * 1024 * 1024) {
            toast.error("Video tối đa 200MB");
            return;
        }

        const duration = await getVideoDuration(file);
        setVideoFile(file);
        setVideoDuration(duration);
        if (videoPreviewUrl) URL.revokeObjectURL(videoPreviewUrl);
        setVideoPreviewUrl(URL.createObjectURL(file));
        setStep("compose");
    };

    const { mutate: create, isPending } = useMutation({
        mutationFn: async () => {
            if (!videoFile) throw new Error("Chưa chọn video");

            // 1. Get presigned URL
            const presigned = await reelService.getReelVideoUploadUrl({
                fileName: videoFile.name,
                contentType: videoFile.type,
                fileSize: videoFile.size,
            });

            // 2. Upload to S3 via PUT
            setUploadProgress(0);
            await new Promise<void>((resolve, reject) => {
                const xhr = new XMLHttpRequest();
                xhr.open("PUT", presigned.uploadUrl);
                xhr.setRequestHeader("Content-Type", videoFile.type);
                xhr.upload.onprogress = (e) => {
                    if (e.lengthComputable) {
                        setUploadProgress(Math.round((e.loaded / e.total) * 100));
                    }
                };
                xhr.onload = () => {
                    if (xhr.status >= 200 && xhr.status < 300) resolve();
                    else reject(new Error("Upload thất bại"));
                };
                xhr.onerror = () => reject(new Error("Upload thất bại"));
                xhr.send(videoFile);
            });

            setUploadProgress(null);

            // 3. Create reel with S3 key
            return reelService.createReel({
                videoKey: presigned.key,
                videoDuration: videoDuration || (await getVideoDuration(videoFile)),
                caption: caption.trim() || undefined,
                musicUrl: selectedTrack?.url || null,
                musicTitle: selectedTrack?.title || null,
                musicArtist: selectedTrack?.artist || null,
            });
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["reel-feed"] });
            qc.invalidateQueries({ queryKey: ["my-reels"] });
            handleClose();
        },
        onError: (err: unknown) => {
            setUploadProgress(null);
            if (isPremium403Error(err)) {
                const info = extractPremiumErrorInfo(err);
                if (
                    info.code === PREMIUM_ERROR_CODE.VIDEO_DURATION_EXCEEDED ||
                    /duration/i.test(String(info.message || ""))
                ) {
                    toast.error("Video vượt giới hạn gói hiện tại");
                }
                return;
            }

            toast.error(getErrorMessage(err));
        },
    });

    const handleClose = () => {
        if (isPending) return;
        setStep("select");
        setVideoFile(null);
        if (videoPreviewUrl) URL.revokeObjectURL(videoPreviewUrl);
        setVideoPreviewUrl(null);
        setCaption("");
        setSelectedTrack(null);
        setUploadProgress(null);
        setVideoDuration(null);
        onClose();
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        await handleSelectedFile(file);
    };

    const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        const file = e.dataTransfer.files?.[0];
        if (file) {
            void handleSelectedFile(file);
        }
    };

    if (!open) return null;

    return (
        <>
            <div
                className="fixed inset-0 z-[9998] flex items-center justify-center bg-black/70 backdrop-blur-sm"
                onClick={handleClose}
            >
                <div
                    className="relative w-full max-w-lg bg-gray-900 border border-white/10 rounded-2xl shadow-2xl max-h-[90vh] flex flex-col overflow-hidden"
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Header */}
                    <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
                        <div className="flex items-center gap-2">
                            <Clapperboard className="w-5 h-5 text-primary" />
                            <h2 className="text-base font-semibold text-white">Tạo Reel</h2>
                        </div>
                        <button
                            onClick={handleClose}
                            disabled={isPending}
                            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors text-white/60 hover:text-white disabled:opacity-40"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>

                    {step === "select" ? (
                        /* ── Step 1: Select video ── */
                        <div
                            className="flex-1 flex flex-col items-center justify-center gap-5 p-8 cursor-pointer group"
                            onDragOver={(e) => e.preventDefault()}
                            onDrop={handleDrop}
                            onClick={() => fileInputRef.current?.click()}
                        >
                            <div className="w-20 h-20 rounded-full bg-primary/20 border-2 border-dashed border-primary/50 group-hover:border-primary group-hover:bg-primary/30 transition-all flex items-center justify-center">
                                <Upload className="w-8 h-8 text-primary" />
                            </div>
                            <div className="text-center">
                                <p className="text-white font-medium mb-1">Chọn hoặc kéo thả video</p>
                                <p className="text-sm text-white/40">MP4, MOV, WebM · Tối đa 200MB</p>
                            </div>
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="video/*"
                                className="hidden"
                                onChange={handleFileChange}
                            />
                        </div>
                    ) : (
                        /* ── Step 2: Compose ── */
                        <div className="flex-1 overflow-y-auto">
                            <div className="flex flex-col sm:flex-row gap-4 p-4">
                                {/* Video preview */}
                                <div className="shrink-0 w-full sm:w-40 aspect-[9/16] sm:aspect-auto sm:h-72 bg-black rounded-xl overflow-hidden border border-white/10">
                                    {videoPreviewUrl && (
                                        <video
                                            src={videoPreviewUrl}
                                            className="w-full h-full object-cover"
                                            controls
                                            muted
                                            playsInline
                                        />
                                    )}
                                </div>

                                {/* Fields */}
                                <div className="flex-1 flex flex-col gap-3">
                                    {/* Caption */}
                                    <div>
                                        <label className="block text-xs font-medium text-white/60 mb-1.5">Caption</label>
                                        <textarea
                                            value={caption}
                                            onChange={(e) => setCaption(e.target.value)}
                                            maxLength={2200}
                                            rows={4}
                                            placeholder="Viết caption, thêm #hashtag..."
                                            className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder-white/30 focus:outline-none focus:border-primary/60 resize-none transition-colors"
                                        />
                                        <p className="text-right text-[10px] text-white/30 mt-0.5">{caption.length}/2200</p>
                                    </div>

                                    {/* Music */}
                                    <div>
                                        <label className="block text-xs font-medium text-white/60 mb-1.5">Nhạc nền</label>
                                        <button
                                            type="button"
                                            onClick={() => setMusicPickerOpen(true)}
                                            className="w-full flex items-center gap-2 bg-white/5 border border-white/10 hover:border-primary/40 rounded-xl px-3 py-2.5 text-sm text-white/60 hover:text-white transition-all"
                                        >
                                            <Music2 className="w-4 h-4 text-primary shrink-0" />
                                            {selectedTrack ? (
                                                <span className="flex-1 text-left truncate text-white">
                                                    {selectedTrack.title} — {selectedTrack.artist}
                                                </span>
                                            ) : (
                                                <span className="flex-1 text-left">Thêm nhạc từ Jamendo</span>
                                            )}
                                            <ChevronRight className="w-4 h-4 shrink-0" />
                                        </button>
                                        {selectedTrack && (
                                            <button
                                                type="button"
                                                onClick={() => setSelectedTrack(null)}
                                                className="mt-1.5 text-[11px] text-red-400/80 hover:text-red-400 transition-colors"
                                            >
                                                Xóa nhạc nền
                                            </button>
                                        )}
                                    </div>

                                    {/* File info */}
                                    {videoFile && (
                                        <p className="text-[11px] text-white/30">
                                            {videoFile.name} · {(videoFile.size / 1024 / 1024).toFixed(1)}MB
                                        </p>
                                    )}
                                </div>
                            </div>

                            {/* Upload progress */}
                            {uploadProgress !== null && (
                                <div className="px-4 pb-2">
                                    <div className="flex items-center justify-between mb-1">
                                        <span className="text-xs text-white/60">Đang tải lên...</span>
                                        <span className="text-xs text-white/60">{uploadProgress}%</span>
                                    </div>
                                    <div className="w-full bg-white/10 rounded-full h-1.5">
                                        <div
                                            className="bg-primary h-1.5 rounded-full transition-all"
                                            style={{ width: `${uploadProgress}%` }}
                                        />
                                    </div>
                                </div>
                            )}

                            {/* Actions */}
                            <div className="flex gap-2 p-4 border-t border-white/10">
                                <button
                                    type="button"
                                    onClick={() => setStep("select")}
                                    disabled={isPending}
                                    className="flex-1 py-2.5 rounded-xl border border-white/15 text-white/70 hover:bg-white/5 transition-colors text-sm font-medium disabled:opacity-40"
                                >
                                    Đổi video
                                </button>
                                <button
                                    type="button"
                                    onClick={() => create()}
                                    disabled={isPending || !videoFile}
                                    className="flex-1 py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-semibold transition-all disabled:opacity-40 flex items-center justify-center gap-2"
                                >
                                    {isPending ? (
                                        <>
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                            Đang đăng...
                                        </>
                                    ) : (
                                        "Đăng Reel"
                                    )}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <MusicPickerModal
                open={musicPickerOpen}
                onClose={() => setMusicPickerOpen(false)}
                onSelect={setSelectedTrack}
                selectedTrack={selectedTrack}
            />
        </>
    );
}
