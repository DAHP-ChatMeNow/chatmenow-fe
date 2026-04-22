"use client";
import { useEffect, useRef, useState, useCallback } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { reelService } from "@/services/reel";
import { ReelCard } from "./reel-card";
import { Loader2, RefreshCw } from "lucide-react";

export function ReelFeed() {
    const containerRef = useRef<HTMLDivElement>(null);
    const [activeIndex, setActiveIndex] = useState(0);

    const {
        data,
        fetchNextPage,
        hasNextPage,
        isFetchingNextPage,
        isLoading,
        isError,
        refetch,
    } = useInfiniteQuery({
        queryKey: ["reel-feed"],
        queryFn: ({ pageParam }) => reelService.getReelFeed({ pageParam: pageParam as string | null }),
        initialPageParam: null as string | null,
        getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    });

    const reels = data?.pages.flatMap((p) => p.reels) ?? [];

    // IntersectionObserver per slide → update activeIndex
    useEffect(() => {
        const container = containerRef.current;
        if (!container || reels.length === 0) return;

        const slides = container.querySelectorAll("[data-reel-slide]");
        const observer = new IntersectionObserver(
            (entries) => {
                for (const entry of entries) {
                    if (entry.isIntersecting) {
                        const idx = Number((entry.target as HTMLElement).dataset.reelSlide);
                        if (!isNaN(idx)) setActiveIndex(idx);
                    }
                }
            },
            { root: container, threshold: 0.6 }
        );

        slides.forEach((slide) => observer.observe(slide));
        return () => observer.disconnect();
    }, [reels.length]);

    // Load more when near end
    useEffect(() => {
        if (activeIndex >= reels.length - 3 && hasNextPage && !isFetchingNextPage) {
            fetchNextPage();
        }
    }, [activeIndex, reels.length, hasNextPage, isFetchingNextPage, fetchNextPage]);

    if (isLoading) {
        return (
            <div className="w-full h-full flex items-center justify-center bg-black">
                <Loader2 className="w-8 h-8 text-white/50 animate-spin" />
            </div>
        );
    }

    if (isError) {
        return (
            <div className="w-full h-full flex flex-col items-center justify-center bg-black gap-4">
                <p className="text-white/60 text-sm">Không tải được Reels</p>
                <button
                    onClick={() => refetch()}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 transition-colors text-white text-sm"
                >
                    <RefreshCw className="w-4 h-4" />
                    Thử lại
                </button>
            </div>
        );
    }

    if (reels.length === 0) {
        return (
            <div className="w-full h-full flex flex-col items-center justify-center bg-black gap-3">
                <p className="text-white/40 text-sm">Chưa có Reel nào</p>
                <p className="text-white/25 text-xs">Hãy đăng Reel đầu tiên của bạn!</p>
            </div>
        );
    }

    return (
        <div
            ref={containerRef}
            className="w-full h-full overflow-y-scroll snap-y snap-mandatory scroll-smooth"
            style={{ scrollbarWidth: "none" }}
        >
            <style>{`div::-webkit-scrollbar { display: none; }`}</style>

            {reels.map((reel, idx) => (
                <div
                    key={reel._id}
                    data-reel-slide={idx}
                    className="w-full h-full snap-start snap-always shrink-0"
                >
                    <ReelCard reel={reel} isActive={activeIndex === idx} />
                </div>
            ))}

            {/* Loading more indicator */}
            {isFetchingNextPage && (
                <div className="w-full snap-start snap-always shrink-0 h-24 flex items-center justify-center bg-black">
                    <Loader2 className="w-6 h-6 text-white/40 animate-spin" />
                </div>
            )}
        </div>
    );
}
