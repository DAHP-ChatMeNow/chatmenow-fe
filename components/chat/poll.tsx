"use client";

import React, { useState, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";

import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { X, Plus, BarChart2, Calendar, Eye, EyeOff, Users, CheckSquare, Lock, Clock } from "lucide-react";
import { Poll, PollOption } from "@/types/message";
import { useCreatePoll, useVotePoll, useAddPollOption, useClosePoll } from "@/hooks/use-poll";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

// ─────────────────────────────────────────────────────────────────────────────
// Create Poll Dialog
// ─────────────────────────────────────────────────────────────────────────────

interface CreatePollDialogProps {
  open: boolean;
  onClose: () => void;
  conversationId: string;
}

export function CreatePollDialog({
  open,
  onClose,
  conversationId,
}: CreatePollDialogProps) {
  const { toast } = useToast();
  const { mutate: createPoll, isPending } = useCreatePoll();

  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState<string[]>(["", ""]);
  const [deadline, setDeadline] = useState<string>("");
  const [allowMultipleChoices, setAllowMultipleChoices] = useState(true);
  const [allowAddOptions, setAllowAddOptions] = useState(true);
  const [hideResultsBeforeVote, setHideResultsBeforeVote] = useState(false);
  const [hideVoters, setHideVoters] = useState(false);
  const [pinToTop, setPinToTop] = useState(false);

  const resetForm = () => {
    setQuestion("");
    setOptions(["", ""]);
    setDeadline("");
    setAllowMultipleChoices(true);
    setAllowAddOptions(true);
    setHideResultsBeforeVote(false);
    setHideVoters(false);
    setPinToTop(false);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const addOption = () => {
    if (options.length >= 10) return;
    setOptions([...options, ""]);
  };

  const updateOption = (index: number, val: string) => {
    const next = [...options];
    next[index] = val;
    setOptions(next);
  };

  const removeOption = (index: number) => {
    if (options.length <= 2) return;
    setOptions(options.filter((_, i) => i !== index));
  };

  const handleSubmit = () => {
    const cleanQuestion = question.trim();
    if (!cleanQuestion) {
      toast({ description: "Vui lòng nhập câu hỏi bình chọn", variant: "destructive" });
      return;
    }
    const validOptions = options.map((o) => o.trim()).filter(Boolean);
    if (validOptions.length < 2) {
      toast({ description: "Cần ít nhất 2 lựa chọn hợp lệ", variant: "destructive" });
      return;
    }

    createPoll(
      {
        conversationId,
        question: cleanQuestion,
        options: validOptions.map((text) => ({ text })),
        allowMultipleChoices,
        allowAddOptions,
        hideResultsBeforeVote,
        hideVoters,
        deadline: deadline || null,
        pinToTop,
      },
      {
        onSuccess: () => {
          toast({ description: "Đã tạo bình chọn!" });
          handleClose();
        },
        onError: (err: Error | unknown) => {
          toast({ description: (err as any)?.message || "Tạo bình chọn thất bại", variant: "destructive" });
        },
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="max-w-3xl w-full p-0 overflow-hidden bg-white border-blue-100 text-slate-900 [--ring:221_83%_53%]">
        <DialogHeader className="px-6 pt-5 pb-4 border-b border-blue-100 bg-gradient-to-r from-blue-50/80 to-white">
          <DialogTitle className="text-lg font-semibold text-blue-700">Tạo bình chọn</DialogTitle>
        </DialogHeader>

        <div className="flex gap-0 max-h-[70vh] overflow-hidden">
          {/* Left: Question + Options */}
          <div className="flex-1 px-6 py-4 overflow-y-auto space-y-5 border-r border-blue-100">
            {/* Question */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Chủ đề bình chọn</label>
              <div className="relative">
                <Textarea
                  placeholder="Đặt câu hỏi bình chọn"
                  value={question}
                  onChange={(e) => setQuestion(e.target.value.slice(0, 200))}
                  className="min-h-[90px] resize-none bg-white border-blue-200 text-slate-800 placeholder:text-slate-400 focus:border-blue-500 focus:ring-blue-500/20 focus-visible:ring-blue-500/30"
                  maxLength={200}
                />
                <span className="absolute bottom-2 right-3 text-[11px] text-slate-400">
                  {question.length}/200
                </span>
              </div>
            </div>

            {/* Options */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Các lựa chọn</label>
              <div className="space-y-2">
                {options.map((opt, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <Input
                      placeholder={`Lựa chọn ${idx + 1}`}
                      value={opt}
                      onChange={(e) => updateOption(idx, e.target.value.slice(0, 200))}
                      className="flex-1 bg-white border-blue-200 text-slate-800 placeholder:text-slate-400 focus:border-blue-500 focus-visible:ring-blue-500/30 h-10"
                    />
                    {options.length > 2 && (
                      <button
                        type="button"
                        onClick={() => removeOption(idx)}
                        className="p-1.5 rounded-full text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
              {options.length < 10 && (
                <button
                  type="button"
                  onClick={addOption}
                  className="flex items-center gap-1.5 text-blue-600 hover:text-blue-700 text-sm font-medium mt-1 transition-colors"
                >
                  <Plus className="h-4 w-4" />
                  Thêm lựa chọn
                </button>
              )}
            </div>
          </div>

          {/* Right: Settings */}
          <div className="w-[280px] shrink-0 px-6 py-4 overflow-y-auto space-y-5 bg-blue-50/40">
            {/* Deadline */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Thời hạn bình chọn</label>
              <div className="relative">
                <Input
                  type="datetime-local"
                  value={deadline}
                  onChange={(e) => setDeadline(e.target.value)}
                  className="bg-white border-blue-200 text-slate-700 focus:border-blue-500 focus-visible:ring-blue-500/30 h-10 pr-8"
                  placeholder="Không thời hạn"
                />
                {deadline && (
                  <button
                    type="button"
                    onClick={() => setDeadline("")}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
              {!deadline && (
                <p className="text-xs text-slate-500">Không thời hạn</p>
              )}
            </div>

            {/* Advanced settings */}
            <div className="space-y-1">
              <p className="text-sm font-semibold text-blue-700 mb-2">Thiết lập nâng cao</p>
              <SettingRow
                label="Ghim lên đầu trò chuyện"
                checked={pinToTop}
                onChange={setPinToTop}
              />
              <SettingRow
                label="Chọn nhiều phương án"
                checked={allowMultipleChoices}
                onChange={setAllowMultipleChoices}
              />
              <SettingRow
                label="Có thể thêm phương án"
                checked={allowAddOptions}
                onChange={setAllowAddOptions}
              />
            </div>

            {/* Anonymous vote */}
            <div className="space-y-1">
              <p className="text-sm font-semibold text-blue-700 mb-2">Bình chọn ẩn danh</p>
              <SettingRow
                label="Ẩn kết quả khi chưa bình chọn"
                checked={hideResultsBeforeVote}
                onChange={setHideResultsBeforeVote}
              />
              <SettingRow
                label="Ẩn người bình chọn"
                checked={hideVoters}
                onChange={setHideVoters}
              />
            </div>
          </div>
        </div>

        <DialogFooter className="px-6 py-4 border-t border-blue-100 bg-white flex items-center justify-end gap-3">
          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={handleClose} className="border-blue-200 text-slate-700 hover:bg-blue-50 hover:text-blue-700">
              Hủy
            </Button>
            <Button onClick={handleSubmit} disabled={isPending} className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-5">
              {isPending ? "Đang tạo..." : "Tạo bình chọn"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function SettingRow({
  label,
  checked,
  onChange,
  hint,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  hint?: string;
}) {
  return (
    <div className="flex items-center justify-between py-1.5">
      <span className="text-sm text-slate-600 flex items-center gap-1 mr-3 leading-snug">
        {label}
        {hint && (
          <span className="inline-flex h-4 w-4 items-center justify-center rounded-full border border-blue-200 text-[10px] text-blue-500 cursor-help" title={hint}>?</span>
        )}
      </span>
      <Switch checked={checked} onCheckedChange={onChange} className="data-[state=checked]:bg-blue-500" />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Poll Message Bubble
// ─────────────────────────────────────────────────────────────────────────────

interface PollBubbleProps {
  poll: Poll;
  messageId: string;
  conversationId: string;
  currentUserId?: string;
  isMe: boolean;
  isUnsent?: boolean;
}

export function PollBubble({
  poll: initialPoll,
  messageId,
  conversationId,
  currentUserId,
  isMe,
  isUnsent,
}: PollBubbleProps) {
  const { toast } = useToast();
  const [poll, setPoll] = useState<Poll>(initialPoll);
  const [addingOption, setAddingOption] = useState(false);
  const [newOptionText, setNewOptionText] = useState("");

  const { mutate: vote, isPending: isVoting } = useVotePoll();
  const { mutate: addOption, isPending: isAddingOption } = useAddPollOption();
  const { mutate: closePoll, isPending: isClosing } = useClosePoll();

  // Keep poll in sync when parent updates (e.g. socket event)
  React.useEffect(() => {
    setPoll(initialPoll);
  }, [initialPoll]);

  const totalVotes = poll.totalVotes ?? poll.options.reduce((s, o) => s + (o.voteCount ?? 0), 0);

  const isExpired = poll.deadline ? new Date(poll.deadline) < new Date() : false;
  const isClosed = poll.isClosed || isExpired;

  const handleVote = useCallback(
    (optionId: string) => {
      if (isClosed || isVoting) return;

      let newOptionIds: string[];
      if (poll.allowMultipleChoices) {
        const currentVoted = poll.options.filter((o) => o.votedByMe).map((o) => o._id);
        if (currentVoted.includes(optionId)) {
          newOptionIds = currentVoted.filter((id) => id !== optionId);
        } else {
          newOptionIds = [...currentVoted, optionId];
        }
      } else {
        // Single choice: toggle
        const alreadyVoted = poll.options.find((o) => o._id === optionId)?.votedByMe;
        newOptionIds = alreadyVoted ? [] : [optionId];
      }

      // Optimistic update
      const optimisticPoll: Poll = {
        ...poll,
        userHasVoted: newOptionIds.length > 0,
        options: poll.options.map((opt) => {
          const willVote = newOptionIds.includes(opt._id);
          const wasVoted = opt.votedByMe;
          const delta = willVote && !wasVoted ? 1 : !willVote && wasVoted ? -1 : 0;
          return {
            ...opt,
            votedByMe: willVote,
            voteCount: opt.voteCount !== null ? Math.max(0, opt.voteCount + delta) : null,
          };
        }),
      };
      setPoll(optimisticPoll);

      vote(
        { pollId: poll._id, optionIds: newOptionIds },
        {
          onSuccess: (updatedPoll: unknown) => setPoll(updatedPoll as Poll),
          onError: () => {
            setPoll(poll); // revert
            toast({ description: "Không thể bình chọn. Thử lại.", variant: "destructive" });
          },
        },
      );
    },
    [poll, isClosed, isVoting, vote, toast],
  );

  const handleAddOption = () => {
    const text = newOptionText.trim();
    if (!text) return;
    addOption(
      { pollId: poll._id, text },
      {
        onSuccess: (updatedPoll: unknown) => {
          setPoll(updatedPoll as Poll);
          setNewOptionText("");
          setAddingOption(false);
        },
        onError: (err: Error | unknown) => {
          toast({ description: (err as any)?.message || "Thêm lựa chọn thất bại", variant: "destructive" });
        },
      },
    );
  };

  const handleClose = () => {
    closePoll(
      { pollId: poll._id },
      {
        onSuccess: (updatedPoll: unknown) => setPoll(updatedPoll as Poll),
        onError: (err: Error | unknown) => {
          toast({ description: (err as any)?.message || "Không thể kết thúc bình chọn", variant: "destructive" });
        },
      },
    );
  };

  if (isUnsent) {
    return (
      <div className="px-3 py-2 rounded-xl text-sm italic text-slate-400 bg-slate-100">
        Tin nhắn đã được thu hồi
      </div>
    );
  }

  return (
    <div
      className={cn(
        "w-full max-w-sm rounded-2xl p-4 shadow-md border space-y-3",
        isMe
          ? "bg-blue-600 border-blue-500 text-white"
          : "bg-white border-slate-200 text-slate-900",
      )}
    >
      {/* Header */}
      <div className="flex items-start gap-2">
        <BarChart2 className={cn("h-5 w-5 mt-0.5 shrink-0", isMe ? "text-blue-200" : "text-blue-500")} />
        <div className="flex-1 min-w-0">
          <p className={cn("font-semibold text-sm leading-snug", isMe ? "text-white" : "text-slate-900")}>
            {poll.question}
          </p>
          <p className={cn("text-xs mt-0.5", isMe ? "text-blue-200" : "text-slate-400")}>
            {isClosed ? "Đã kết thúc · " : ""}{totalVotes} lượt bình chọn
            {poll.deadline && !isClosed && (
              <span className="ml-1 inline-flex items-center gap-0.5">
                · <Clock className="h-3 w-3 inline" /> Hết hạn {new Date(poll.deadline).toLocaleDateString("vi-VN")}
              </span>
            )}
          </p>
        </div>
        {isClosed && (
          <Lock className={cn("h-4 w-4 shrink-0", isMe ? "text-blue-200" : "text-slate-400")} />
        )}
      </div>

      {/* Options */}
      <div className="space-y-2">
        {poll.options.map((opt) => {
          const pct = totalVotes && opt.voteCount !== null && opt.voteCount > 0
            ? Math.round((opt.voteCount / totalVotes) * 100)
            : 0;
          const showBar = !poll.hideResultsBeforeVote || poll.userHasVoted || isClosed;

          return (
            <button
              key={opt._id}
              type="button"
              disabled={isClosed || isVoting}
              onClick={() => handleVote(opt._id)}
              className={cn(
                "relative w-full rounded-xl text-left overflow-hidden transition-all duration-150",
                "disabled:cursor-not-allowed",
                opt.votedByMe
                  ? isMe ? "ring-2 ring-white/60" : "ring-2 ring-blue-400"
                  : "hover:brightness-95",
              )}
            >
              {/* Progress bar background */}
              {showBar && opt.voteCount !== null && (
                <div
                  className={cn(
                    "absolute inset-y-0 left-0 transition-all duration-300 rounded-xl",
                    opt.votedByMe
                      ? isMe ? "bg-white/25" : "bg-blue-100"
                      : isMe ? "bg-white/10" : "bg-slate-100",
                  )}
                  style={{ width: `${pct}%` }}
                />
              )}
              <div className={cn(
                "relative flex items-center justify-between px-3 py-2 rounded-xl border",
                opt.votedByMe
                  ? isMe ? "border-white/40 bg-white/10" : "border-blue-300 bg-blue-50/60"
                  : isMe ? "border-white/20 bg-white/5" : "border-slate-200 bg-slate-50",
              )}>
                <span className={cn("text-sm font-medium", isMe ? "text-white" : "text-slate-800")}>
                  {opt.text}
                </span>
                <div className="flex items-center gap-2 ml-2 shrink-0">
                  {opt.votedByMe && (
                    <CheckSquare className={cn("h-4 w-4", isMe ? "text-white" : "text-blue-500")} />
                  )}
                  {showBar && opt.voteCount !== null && (
                    <span className={cn("text-xs font-semibold tabular-nums", isMe ? "text-blue-100" : "text-slate-500")}>
                      {opt.voteCount} ({pct}%)
                    </span>
                  )}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Add option */}
      {!isClosed && poll.allowAddOptions && (
        <div>
          {addingOption ? (
            <div className="flex gap-2 items-center mt-1">
              <Input
                autoFocus
                value={newOptionText}
                onChange={(e) => setNewOptionText(e.target.value.slice(0, 200))}
                placeholder="Nhập lựa chọn mới..."
                className={cn(
                  "h-8 text-sm flex-1",
                  isMe
                    ? "bg-white/10 border-white/30 text-white placeholder:text-white/50"
                    : "bg-slate-50 border-slate-200",
                )}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleAddOption();
                  if (e.key === "Escape") { setAddingOption(false); setNewOptionText(""); }
                }}
              />
              <Button
                size="sm"
                disabled={!newOptionText.trim() || isAddingOption}
                onClick={handleAddOption}
                className={cn("h-8 text-xs px-3", isMe ? "bg-white text-blue-600 hover:bg-blue-50" : "")}
              >
                {isAddingOption ? "..." : "Thêm"}
              </Button>
              <button
                type="button"
                onClick={() => { setAddingOption(false); setNewOptionText(""); }}
                className={cn("p-1 rounded-full", isMe ? "text-white/60 hover:text-white" : "text-slate-400 hover:text-slate-600")}
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setAddingOption(true)}
              className={cn(
                "flex items-center gap-1.5 text-xs font-medium transition-colors mt-1",
                isMe ? "text-blue-100 hover:text-white" : "text-blue-500 hover:text-blue-400",
              )}
            >
              <Plus className="h-3.5 w-3.5" />
              Thêm lựa chọn
            </button>
          )}
        </div>
      )}

      {/* Footer: voters count + close button */}
      <div className={cn("flex items-center justify-between pt-1 border-t", isMe ? "border-white/20" : "border-slate-100")}>
        <div className={cn("flex items-center gap-1 text-xs", isMe ? "text-blue-200" : "text-slate-400")}>
          {!poll.hideVoters && <Users className="h-3.5 w-3.5" />}
          <span>{poll.allowMultipleChoices ? "Nhiều lựa chọn" : "Một lựa chọn"}</span>
          {poll.hideResultsBeforeVote && !poll.userHasVoted && !isClosed && (
            <span className="flex items-center gap-0.5"><EyeOff className="h-3 w-3" /> Kết quả ẩn</span>
          )}
        </div>

        {/* Close button — only creator can close */}
        {!isClosed && String(poll.createdBy) === String(currentUserId) && (
          <button
            type="button"
            disabled={isClosing}
            onClick={handleClose}
            className={cn(
              "text-xs px-2 py-0.5 rounded-full border transition-all",
              isMe
                ? "border-white/30 text-white/70 hover:bg-white/10"
                : "border-slate-200 text-slate-500 hover:bg-slate-50",
            )}
          >
            {isClosing ? "..." : "Kết thúc"}
          </button>
        )}
        {isClosed && (
          <span className={cn("text-xs font-medium", isMe ? "text-blue-200" : "text-slate-400")}>
            Đã kết thúc
          </span>
        )}
      </div>
    </div>
  );
}
