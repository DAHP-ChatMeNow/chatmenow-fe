"use client";
import { useState, useEffect, useRef } from "react";
import { Search, X, Music2, Play, Pause, Check, Loader2 } from "lucide-react";
import { musicService } from "@/services/music";
import { MusicTrack } from "@/types/music";

interface MusicPickerModalProps {
    open: boolean;
    onClose: () => void;
    onSelect: (track: MusicTrack) => void;
    selectedTrack?: MusicTrack | null;
}

import * as DialogPrimitive from "@radix-ui/react-dialog";

export function MusicPickerModal({ open, onClose, onSelect, selectedTrack }: MusicPickerModalProps) {
    const [query, setQuery] = useState("");
    const [tracks, setTracks] = useState<MusicTrack[]>([]);
    const [loading, setLoading] = useState(false);
    const [playingId, setPlayingId] = useState<string | null>(null);
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Load popular on open
    useEffect(() => {
        if (!open) return;
        setQuery("");
        loadPopular();
    }, [open]);

    const loadPopular = async () => {
        setLoading(true);
        try {
            const result = await musicService.getPopular(20);
            setTracks(result);
        } catch {
            setTracks([]);
        } finally {
            setLoading(false);
        }
    };

    // Debounced search
    useEffect(() => {
        if (debounceRef.current) clearTimeout(debounceRef.current);
        if (!query.trim()) {
            loadPopular();
            return;
        }
        debounceRef.current = setTimeout(async () => {
            setLoading(true);
            try {
                const result = await musicService.search(query.trim(), 20);
                setTracks(result);
            } catch {
                setTracks([]);
            } finally {
                setLoading(false);
            }
        }, 500);
    }, [query]);

    const togglePreview = (track: MusicTrack) => {
        const id = track.jamendoId;
        if (playingId === id) {
            audioRef.current?.pause();
            setPlayingId(null);
        } else {
            if (audioRef.current) {
                audioRef.current.pause();
            }
            const audio = new Audio(track.url);
            audio.play().catch(() => { });
            audio.addEventListener("ended", () => setPlayingId(null));
            audioRef.current = audio;
            setPlayingId(id);
        }
    };

    const handleSelect = (track: MusicTrack) => {
        audioRef.current?.pause();
        setPlayingId(null);
        onSelect(track);
        onClose();
    };

    const handleClose = () => {
        audioRef.current?.pause();
        setPlayingId(null);
        onClose();
    };

    const formatDuration = (s: number) => {
        const m = Math.floor(s / 60);
        const sec = Math.floor(s % 60);
        return `${m}:${sec.toString().padStart(2, "0")}`;
    };

    return (
        <DialogPrimitive.Root open={open} onOpenChange={(val) => { if (!val) handleClose(); }}>
            <DialogPrimitive.Portal>
                {/* Backdrop mimicking old custom logic */}
                <div
                    className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm"
                    onClick={handleClose}
                >
                    <DialogPrimitive.Content
                        onClick={(e) => e.stopPropagation()}
                        className="relative w-full max-w-md bg-gray-900 border border-white/10 rounded-t-2xl sm:rounded-2xl shadow-2xl max-h-[90vh] flex flex-col focus:outline-none"
                        aria-describedby={undefined}
                        aria-label="Chọn nhạc nền"
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between p-4 border-b border-white/10">
                            <div className="flex items-center gap-2">
                                <Music2 className="w-5 h-5 text-primary" />
                                <h2 className="text-base font-semibold text-white">Chọn nhạc</h2>
                            </div>
                            <button
                                onClick={handleClose}
                                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors text-white/60 hover:text-white"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        {/* Search */}
                        <div className="p-3 border-b border-white/10">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                                <input
                                    type="text"
                                    value={query}
                                    onChange={(e) => setQuery(e.target.value)}
                                    placeholder="Tìm kiếm bài hát, nghệ sĩ..."
                                    className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-4 py-2.5 text-sm text-white placeholder-white/30 focus:outline-none focus:border-primary/60 transition-colors"
                                />
                            </div>
                        </div>

                        {/* Track list */}
                        <div className="flex-1 overflow-y-auto p-2 space-y-1">
                            {loading ? (
                                <div className="flex items-center justify-center py-12">
                                    <Loader2 className="w-6 h-6 text-primary animate-spin" />
                                </div>
                            ) : tracks.length === 0 ? (
                                <div className="text-center py-12 text-white/40 text-sm">
                                    {query ? "Không tìm thấy bài hát nào" : "Không có nhạc"}
                                </div>
                            ) : (
                                tracks.map((track) => {
                                    const isPlaying = playingId === track.jamendoId;
                                    const isSelected = selectedTrack?.jamendoId === track.jamendoId;

                                    return (
                                        <div
                                            key={track.jamendoId}
                                            className={`flex items-center gap-3 p-2 rounded-xl cursor-pointer transition-all ${isSelected
                                                ? "bg-primary/20 border border-primary/40"
                                                : "hover:bg-white/5 border border-transparent"
                                                }`}
                                            onClick={() => handleSelect(track)}
                                        >
                                            {/* Cover */}
                                            <div className="relative w-11 h-11 rounded-lg overflow-hidden bg-primary/20 shrink-0">
                                                {track.coverUrl ? (
                                                    <img src={track.coverUrl} alt={track.title} className="w-full h-full object-cover" />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center">
                                                        <Music2 className="w-5 h-5 text-primary" />
                                                    </div>
                                                )}
                                            </div>

                                            {/* Info */}
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium text-white truncate">{track.title}</p>
                                                <p className="text-xs text-white/50 truncate">{track.artist}</p>
                                            </div>

                                            {/* Duration */}
                                            {track.duration > 0 && (
                                                <span className="text-xs text-white/40 tabular-nums shrink-0">
                                                    {formatDuration(track.duration)}
                                                </span>
                                            )}

                                            {/* Preview / check */}
                                            <div className="flex items-center gap-1 shrink-0">
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        togglePreview(track);
                                                    }}
                                                    className="w-7 h-7 flex items-center justify-center rounded-full bg-white/10 hover:bg-primary/40 transition-colors"
                                                    title={isPlaying ? "Dừng" : "Nghe thử"}
                                                >
                                                    {isPlaying ? (
                                                        <Pause className="w-3 h-3 text-white fill-white" />
                                                    ) : (
                                                        <Play className="w-3 h-3 text-white fill-white ml-0.5" />
                                                    )}
                                                </button>
                                                {isSelected && (
                                                    <div className="w-5 h-5 flex items-center justify-center">
                                                        <Check className="w-4 h-4 text-primary" />
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>

                        {/* Current selection */}
                        {selectedTrack && (
                            <div className="p-3 border-t border-white/10 bg-primary/10">
                                <div className="flex items-center gap-2">
                                    <Check className="w-4 h-4 text-primary shrink-0" />
                                    <div className="flex-1 min-w-0">
                                        <p className="text-xs font-medium text-primary truncate">{selectedTrack.title}</p>
                                        <p className="text-[10px] text-primary/70 truncate">{selectedTrack.artist}</p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </DialogPrimitive.Content>
                </div>
            </DialogPrimitive.Portal>
        </DialogPrimitive.Root>
    );
}
