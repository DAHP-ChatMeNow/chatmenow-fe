"use client";

import { useEffect, useMemo, useState } from "react";
import { CalendarDays, Loader2, RefreshCcw, Sparkles, MessageSquareText } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import {
  chatService,
  type UnreadSummaryCandidateMessage,
  type UnreadSummaryHistoryItem,
  type UnreadSummaryMessagesResponse,
  type UnreadSummaryResult,
} from "@/api/chat";

type ChatBackgroundKey = "default" | "sky" | "sunset" | "mint" | "night";

type ThemeColors = {
  contentBg: string;
  headerBg: string;
  overviewContainerBg: string;
  overviewTextGradient: string;
  badgeBg: string;
  badgeText: string;
  metadataBg: string;
  messageBg: string;
  messageText: string;
  detailHeaderBg: string;
  scrollBg: string;
};

const THEME_COLORS: Record<ChatBackgroundKey, ThemeColors> = {
  default: {
    contentBg: "bg-gradient-to-br from-slate-50 via-white to-slate-100",
    headerBg: "border-b border-slate-200/80 bg-white/90",
    overviewContainerBg: "bg-gradient-to-br from-cyan-50 via-sky-50 to-blue-50",
    overviewTextGradient: "from-cyan-600 to-blue-600",
    badgeBg: "bg-gradient-to-r from-cyan-100 to-blue-100",
    badgeText: "text-cyan-700",
    metadataBg: "bg-gradient-to-r from-cyan-100 to-cyan-50",
    messageBg: "bg-white/70",
    messageText: "text-slate-800",
    detailHeaderBg: "bg-slate-900 text-white",
    scrollBg: "border-b border-slate-200/60 bg-white/70",
  },
  sky: {
    contentBg: "bg-gradient-to-br from-blue-50 via-white to-cyan-100",
    headerBg: "border-b border-blue-200/80 bg-gradient-to-r from-blue-50 to-cyan-50/90",
    overviewContainerBg: "bg-gradient-to-br from-blue-50 via-sky-50 to-cyan-100",
    overviewTextGradient: "from-blue-600 to-cyan-600",
    badgeBg: "bg-gradient-to-r from-blue-100 to-cyan-100",
    badgeText: "text-blue-700",
    metadataBg: "bg-gradient-to-r from-blue-100 to-blue-50",
    messageBg: "bg-white/70",
    messageText: "text-blue-900",
    detailHeaderBg: "bg-blue-900 text-blue-50",
    scrollBg: "border-b border-blue-200/60 bg-blue-50/70",
  },
  sunset: {
    contentBg: "bg-gradient-to-br from-rose-50 via-amber-50 to-orange-100",
    headerBg: "border-b border-orange-200/80 bg-gradient-to-r from-rose-50 to-amber-50/90",
    overviewContainerBg: "bg-gradient-to-br from-rose-50 via-amber-50 to-orange-100",
    overviewTextGradient: "from-rose-600 to-orange-600",
    badgeBg: "bg-gradient-to-r from-rose-100 to-orange-100",
    badgeText: "text-rose-700",
    metadataBg: "bg-gradient-to-r from-rose-100 to-rose-50",
    messageBg: "bg-white/70",
    messageText: "text-rose-900",
    detailHeaderBg: "bg-orange-900 text-amber-50",
    scrollBg: "border-b border-orange-200/60 bg-orange-50/70",
  },
  mint: {
    contentBg: "bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-100",
    headerBg: "border-b border-teal-200/80 bg-gradient-to-r from-emerald-50 to-teal-50/90",
    overviewContainerBg: "bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-100",
    overviewTextGradient: "from-emerald-600 to-teal-600",
    badgeBg: "bg-gradient-to-r from-emerald-100 to-teal-100",
    badgeText: "text-emerald-700",
    metadataBg: "bg-gradient-to-r from-emerald-100 to-emerald-50",
    messageBg: "bg-white/70",
    messageText: "text-emerald-900",
    detailHeaderBg: "bg-emerald-900 text-teal-50",
    scrollBg: "border-b border-teal-200/60 bg-teal-50/70",
  },
  night: {
    contentBg: "bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950",
    headerBg: "border-b border-indigo-700/80 bg-gradient-to-r from-slate-900 to-indigo-900/90",
    overviewContainerBg: "bg-gradient-to-br from-slate-800 via-indigo-900 to-slate-900",
    overviewTextGradient: "from-indigo-300 to-cyan-300",
    badgeBg: "bg-gradient-to-r from-indigo-700 to-indigo-600",
    badgeText: "text-indigo-100",
    metadataBg: "bg-gradient-to-r from-indigo-800 to-indigo-700",
    messageBg: "bg-slate-800/70",
    messageText: "text-slate-100",
    detailHeaderBg: "bg-slate-950 text-indigo-100",
    scrollBg: "border-b border-indigo-700/60 bg-slate-800/70",
  },
};

const toDayKey = (value = new Date()) => value.toISOString().slice(0, 10);

const formatDateTime = (value?: string | null) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString("vi-VN", {
    dateStyle: "short",
    timeStyle: "short",
  });
};

export function UnreadSummaryDialog({
  open,
  onOpenChange,
  conversationId,
  conversationName,
  backgroundTheme = "default",
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  conversationId?: string;
  conversationName?: string;
  backgroundTheme?: ChatBackgroundKey;
}) {
  const theme = THEME_COLORS[backgroundTheme];
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<UnreadSummaryResult | null>(null);
  const [candidateMessages, setCandidateMessages] =
    useState<UnreadSummaryCandidateMessage[]>([]);
  const [selectedMessageIds, setSelectedMessageIds] = useState<string[]>([]);
  const [submittingSummary, setSubmittingSummary] = useState(false);
  const [historyDate, setHistoryDate] = useState(toDayKey());
  const [historyItems, setHistoryItems] = useState<UnreadSummaryHistoryItem[]>([]);
  const [selectedHistoryId, setSelectedHistoryId] = useState<string | null>(null);
  const [selectedHistoryDetail, setSelectedHistoryDetail] =
    useState<UnreadSummaryMessagesResponse | null>(null);

  const fetchSummary = async (forceRefresh = false) => {
    if (!conversationId) return;

    const effectiveMessageIds = selectedMessageIds;
    if (effectiveMessageIds.length === 0) {
      setError("Bạn cần chọn ít nhất 1 tin nhắn để tóm tắt");
      return;
    }

    setLoadingSummary(true);
    setSubmittingSummary(true);
    setError(null);

    try {
      const result = await chatService.getUnreadSummary(conversationId, {
        forceRefresh,
        messageIds: effectiveMessageIds,
      });
      setSummary(result);
      await fetchCandidates();
    } catch (err: unknown) {
      const message =
        typeof err === "object" &&
        err !== null &&
        "response" in err &&
        typeof (err as { response?: { data?: { message?: string } } }).response
          ?.data?.message === "string"
          ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
          : "Không thể lấy bản tóm tắt tin nhắn";
      setError(message as any);
    } finally {
      setLoadingSummary(false);
      setSubmittingSummary(false);
    }
  };

  const fetchCandidates = async () => {
    if (!conversationId) return;

    try {
      const result = await chatService.getUnreadSummaryCandidates(conversationId, {
        limit: 400,
      });
      const nextMessages = result.messages || [];
      setCandidateMessages(nextMessages);

      const nextIds = new Set(nextMessages.map((item) => String(item.id || item._id)));
      setSelectedMessageIds((prev) => prev.filter((id) => nextIds.has(id)));
    } catch {
      setCandidateMessages([]);
      setSelectedMessageIds([]);
    }
  };

  const fetchHistory = async (dayKey = historyDate) => {
    if (!conversationId) return;

    setLoadingHistory(true);

    try {
      const result = await chatService.getUnreadSummaryHistory(
        conversationId,
        dayKey,
      );
      setHistoryItems(result.items || []);

      const firstItem = result.items?.[0];
      if (firstItem) {
        setSelectedHistoryId(firstItem._id);
        const detail = await chatService.getUnreadSummaryMessages(
          conversationId,
          firstItem._id,
        );
        setSelectedHistoryDetail(detail);
      } else {
        setSelectedHistoryId(null);
        setSelectedHistoryDetail(null);
      }
    } catch {
      setHistoryItems([]);
      setSelectedHistoryId(null);
      setSelectedHistoryDetail(null);
    } finally {
      setLoadingHistory(false);
    }
  };

  const openDetail = async (summaryId: string) => {
    if (!conversationId) return;

    setSelectedHistoryId(summaryId);
    setLoadingDetail(true);

    try {
      const detail = await chatService.getUnreadSummaryMessages(
        conversationId,
        summaryId,
      );
      setSelectedHistoryDetail(detail);
    } finally {
      setLoadingDetail(false);
    }
  };

  useEffect(() => {
    if (!open) {
      return;
    }

    void fetchCandidates();
    void fetchHistory(historyDate);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, conversationId]);

  const selectableCandidates = useMemo(
    () =>
      candidateMessages.filter(
        (message) => String(message.type || "") !== "system",
      ),
    [candidateMessages],
  );

  const allSelectableIds = useMemo(
    () =>
      selectableCandidates.map((message) => String(message.id || message._id || "")),
    [selectableCandidates],
  );

  const allSelected =
    allSelectableIds.length > 0 &&
    allSelectableIds.every((id) => selectedMessageIds.includes(id));

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedMessageIds([]);
      return;
    }
    setSelectedMessageIds(allSelectableIds);
  };

  const toggleSelectMessage = (messageId: string) => {
    setSelectedMessageIds((prev) => {
      if (prev.includes(messageId)) {
        return prev.filter((id) => id !== messageId);
      }
      return [...prev, messageId];
    });
  };

  const summaryOverview = summary?.summary?.overview?.trim() || "";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={`max-w-5xl w-[96vw] max-h-[92vh] overflow-hidden border-slate-300/40 ${theme.contentBg} p-0`}>
        <div className="flex h-[92vh] max-h-[92vh] flex-col overflow-hidden">
          <DialogHeader className={`${theme.headerBg} px-5 py-4 text-left backdrop-blur-xl`}>
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1">
                <DialogTitle className="flex items-center gap-2 text-xl text-slate-900">
                  <span className="inline-flex h-9 w-9 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 text-white shadow-lg shadow-cyan-200">
                    <Sparkles className="h-4 w-4" />
                  </span>
                  {summary?.assistantName || "DanhAI"}
                </DialogTitle>
                <DialogDescription className="text-sm text-slate-500">
                  Tóm tắt tin chưa đọc trong {conversationName || "cuộc trò chuyện"}.
                </DialogDescription>
              </div>

              <div className="flex flex-col items-end gap-2">
                {summary?.cached ? (
                  <span className="text-xs font-medium text-emerald-700">
                    Đang dùng cache
                  </span>
                ) : summary?.degraded ? (
                  <span className="text-xs font-medium text-amber-700 text-right">
                    Đang dùng bản rút gọn
                    {summary?.degradedReason ? ` (${summary.degradedReason})` : ""}
                  </span>
                ) : null}
              </div>
            </div>
          </DialogHeader>

          <div className="grid flex-1 min-h-0 grid-cols-1 gap-0 overflow-hidden lg:grid-cols-[minmax(0,1.5fr)_360px]">
            <ScrollArea className={`min-h-0 ${theme.scrollBg} lg:border-b-0 lg:border-r`}>
              <div className="space-y-6 p-5">
                {loadingSummary ? (
                  <div className="flex items-center gap-3 rounded-2xl border border-slate-200/40 bg-white/80 px-4 py-4 text-sm text-slate-600 shadow-sm">
                    <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                    <span>Đang tạo tóm tắt...</span>
                  </div>
                ) : error ? (
                  <div className="rounded-2xl border border-rose-200/60 bg-rose-50/80 px-4 py-4 text-sm text-rose-600">
                    {error}
                  </div>
                ) : summary?.status === "below_threshold" ? (
                  <div className="rounded-2xl border border-slate-200 bg-white px-4 py-4 text-sm text-slate-600 shadow-sm">
                    Chưa đủ số tin nhắn chưa đọc để tạo tóm tắt.
                  </div>
                ) : (
                  <>
                    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                        <h3 className="text-base font-semibold text-slate-900">
                          Chọn tin nhắn để tóm tắt
                        </h3>
                        <div className="flex items-center gap-2 text-xs text-slate-600">
                          <button
                            type="button"
                            className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 font-medium hover:bg-slate-100"
                            onClick={toggleSelectAll}
                          >
                            {allSelected ? "Bỏ chọn tất cả" : "Chọn tất cả"}
                          </button>
                          <span>{selectedMessageIds.length} đã chọn</span>
                        </div>
                      </div>

                      {selectableCandidates.length === 0 ? (
                        <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-5 text-sm text-slate-500">
                          Không có tin nhắn chờ tóm tắt.
                        </div>
                      ) : (
                        <ScrollArea className="max-h-[260px]">
                          <div className="space-y-2 pr-2">
                            {selectableCandidates.map((message) => {
                              const messageId = String(message.id || message._id || "");
                              const checked = selectedMessageIds.includes(messageId);
                              const senderName =
                                typeof message.senderId === "object"
                                  ? message.senderId?.displayName || "Người dùng"
                                  : "Người dùng";

                              return (
                                <label
                                  key={messageId}
                                  className="flex cursor-pointer items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50/70 px-3 py-3 hover:bg-slate-100"
                                >
                                  <input
                                    type="checkbox"
                                    className="mt-1 h-4 w-4 rounded border-slate-300"
                                    checked={checked}
                                    onChange={() => toggleSelectMessage(messageId)}
                                  />
                                  <div className="min-w-0 flex-1">
                                    <div className="mb-1 flex items-center justify-between gap-3 text-xs text-slate-500">
                                      <span className="font-semibold text-slate-700">
                                        {senderName}
                                      </span>
                                      <span>
                                        {formatDateTime(
                                          typeof message.createdAt === "string"
                                            ? message.createdAt
                                            : message.createdAt?.toISOString?.() ?? null,
                                        )}
                                      </span>
                                    </div>
                                    <p className="line-clamp-2 text-sm leading-6 text-slate-700">
                                      {message.content || "[Không có nội dung]"}
                                    </p>
                                  </div>
                                </label>
                              );
                            })}
                          </div>
                        </ScrollArea>
                      )}
                    </div>

                    <div className={`rounded-3xl border-2 border-transparent ${theme.overviewContainerBg} p-5 shadow-md`}>
                      <div className="mb-4 flex items-center justify-between gap-2">
                        <h3 className={`text-lg font-bold bg-gradient-to-r ${theme.overviewTextGradient} bg-clip-text text-transparent`}>
                          📋 Nội dung tóm tắt
                        </h3>
                        <div className={`inline-flex items-center gap-2 rounded-full bg-gradient-to-r ${theme.badgeBg} px-4 py-1.5 text-xs font-semibold ${theme.badgeText}`}>
                          <span className="relative flex h-2 w-2">
                            <span className="absolute h-full w-full animate-pulse rounded-full bg-blue-400"></span>
                            <span className="h-full w-full rounded-full bg-blue-300"></span>
                          </span>
                          {summary?.unreadCount || 0} tin chưa đọc
                        </div>
                      </div>
                      <div className={`rounded-2xl bg-white/70 p-4 backdrop-blur-sm`}>
                        <p className={`whitespace-pre-wrap text-base leading-7 ${theme.messageText}`}>
                          {summaryOverview || "Không có nội dung tóm tắt."}
                        </p>
                      </div>
                      <div className="mt-4 flex flex-wrap gap-2">
                        <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-medium border`} style={{background: 'rgba(255,255,255,0.5)'}}>
                          <span>📅</span>
                          Từ: {formatDateTime(summary?.summarizedFromAt) || "--"}
                        </span>
                        <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-medium border`} style={{background: 'rgba(255,255,255,0.5)'}}>
                          <span>📌</span>
                          Đến: {formatDateTime(summary?.summarizedToAt) || "--"}
                        </span>
                        <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-medium border`} style={{background: 'rgba(255,255,255,0.5)'}}>
                          <span>{summary?.cached ? "⚡" : "✨"}</span>
                          {summary?.cached ? "Cache hit" : "Mới sinh"}
                        </span>
                      </div>
                    </div>

                    {selectedHistoryDetail ? (
                      <div className={`rounded-3xl border border-slate-200/40 ${theme.detailHeaderBg} shadow-xl`}>
                        <div className="border-b border-white/10 px-4 py-3" style={{borderTopColor: 'rgba(255,255,255,0.1)'}}>
                          <div className="flex items-center gap-2 text-sm font-semibold">
                            <MessageSquareText className={`h-4 w-4`} style={{color: backgroundTheme === 'night' ? '#a5f3fc' : '#0ea5e9'}} />
                            Chi tiết đoạn đã tóm tắt
                          </div>
                          <div className={`mt-1 text-xs`} style={{color: backgroundTheme === 'night' ? '#cbd5e1' : 'rgba(0,0,0,0.6)'}}>
                            {selectedHistoryDetail.unreadCount || 0} tin nhắn
                            · {selectedHistoryDetail.dayKey}
                          </div>
                        </div>

                        <ScrollArea className="max-h-[320px]">
                          <div className={`space-y-3 p-4 ${backgroundTheme === 'night' ? 'bg-slate-950' : 'bg-white/50'}`}>
                            {loadingDetail ? (
                              <div className={`flex items-center gap-2 text-sm`} style={{color: backgroundTheme === 'night' ? '#cbd5e1' : 'rgba(0,0,0,0.5)'}}>
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Đang tải nội dung...
                              </div>
                            ) : selectedHistoryDetail.messages.length === 0 ?  (
                              <div className={`text-sm`} style={{color: backgroundTheme === 'night' ? '#cbd5e1' : 'rgba(0,0,0,0.5)'}}>
                                Chưa có tin nhắn chi tiết cho bản tóm tắt này.
                              </div>
                            ) : (
                              selectedHistoryDetail.messages.map((message) => {
                                const senderName =
                                  typeof message.senderId === "object"
                                    ? message.senderId?.displayName || "Người dùng"
                                    : "Người dùng";

                                return (
                                  <div
                                    key={message.id || message._id}
                                    className="rounded-2xl bg-white/10 px-4 py-3 text-sm text-white/90"
                                  >
                                    <div className="mb-1 flex items-center justify-between gap-3 text-xs text-slate-300">
                                      <span className="font-semibold text-cyan-200">
                                        {senderName}
                                      </span>
                                      <span>
                                        {formatDateTime(
                                          typeof message.createdAt === 'string'
                                            ? message.createdAt
                                            : message.createdAt?.toISOString?.() ?? null,
                                        )}
                                      </span>
                                    </div>
                                    <div className="whitespace-pre-wrap leading-6">
                                      {message.content || "[Không có nội dung]"}
                                    </div>
                                  </div>
                                );
                              })
                            )}
                          </div>
                        </ScrollArea>
                      </div>
                    ) : null}
                  </>
                )}
              </div>
            </ScrollArea>

            <div className={`flex min-h-0 flex-col ${backgroundTheme === 'night' ? 'bg-slate-800/90' : 'bg-white/90'}`}>
              <div className={`border-b ${backgroundTheme === 'night' ? 'border-indigo-600/40' : 'border-slate-200/70'} px-4 py-3`}>
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className={`flex items-center gap-2 text-sm font-semibold ${backgroundTheme === 'night' ? 'text-indigo-100' : 'text-slate-900'}`}>
                      <CalendarDays className={`h-4 w-4 ${backgroundTheme === 'night' ? 'text-indigo-300' : 'text-slate-500'}`} />
                      Lịch sử theo ngày
                    </div>
                    <div className={`text-xs ${backgroundTheme === 'night' ? 'text-indigo-200/70' : 'text-slate-500'}`}>
                      Bấm một bản tóm tắt để mở danh sách tin đã được gom.
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="date"
                      value={historyDate}
                      onChange={(event) => {
                        const next = event.target.value;
                        setHistoryDate(next);
                        void fetchHistory(next);
                      }}
                      className={`rounded-xl border px-3 py-2 text-sm shadow-sm outline-none transition ${backgroundTheme === 'night' ? 'border-indigo-600 bg-slate-700 text-slate-100 focus:border-indigo-400' : 'border-slate-200 bg-white text-slate-700 focus:border-cyan-400'}`}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => {
                        void fetchCandidates();
                        void fetchHistory(historyDate);
                      }}
                      disabled={loadingSummary || loadingHistory}
                    >
                      <RefreshCcw className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>

              <ScrollArea className="min-h-0 flex-1">
                <div className={`space-y-3 p-4 ${backgroundTheme === 'night' ? 'bg-slate-900/50' : 'bg-slate-50/30'}`}>
                  {loadingHistory ? (
                    <div className="flex items-center gap-2 text-sm text-slate-500">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Đang tải lịch sử...
                    </div>
                  ) : historyItems.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-sm text-slate-500">
                      Chưa có bản tóm tắt nào trong ngày này.
                    </div>
                  ) : (
                    historyItems.map((item) => {
                      const isSelected = item._id === selectedHistoryId;
                      return (
                        <button
                          key={item._id}
                          type="button"
                          onClick={() => void openDetail(item._id)}
                          className={`w-full rounded-2xl border p-4 text-left transition-all ${
                            isSelected
                              ? "border-cyan-400 bg-cyan-50 shadow-sm"
                              : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
                          }`}
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div className="text-sm font-semibold text-slate-900">
                              {item.assistantName || "DanhAI"}
                            </div>
                            <span className="rounded-full bg-slate-100 px-2 py-1 text-[11px] font-medium text-slate-600">
                              {item.unreadCount} tin
                            </span>
                          </div>
                          <div className="mt-1 text-xs text-slate-500">
                            {formatDateTime(item.createdAt)}
                          </div>
                          <p className="mt-3 line-clamp-3 text-sm leading-6 text-slate-600">
                            {item.summary?.overview || "Không có mô tả."}
                          </p>
                        </button>
                      );
                    })
                  )}
                </div>
              </ScrollArea>
            </div>
          </div>

          <DialogFooter className="border-t border-slate-200/80 bg-white/95 px-5 py-4 backdrop-blur-xl sm:justify-between">
            <div className="text-xs text-slate-500">
              Summary được giới hạn theo budget mỗi user mỗi ngày.
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  void fetchSummary(true);
                }}
                disabled={loadingSummary || selectedMessageIds.length === 0}
              >
                {loadingSummary || submittingSummary ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : null}
                Tóm tắt đã chọn
              </Button>
              <Button type="button" onClick={() => onOpenChange(false)}>
                Đóng
              </Button>
            </div>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
