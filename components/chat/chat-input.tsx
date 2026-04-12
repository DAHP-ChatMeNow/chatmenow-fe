"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import dynamic from "next/dynamic";
import {
  Image as ImageIcon,
  Mic,
  SendHorizontal,
  Paperclip,
  Smile,
  Loader2,
  Square,
} from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

const EmojiPicker = dynamic(() => import("emoji-picker-react"), {
  ssr: false,
});

interface ChatInputProps {
  onSend: (text: string) => void | Promise<void>;
  onSendAttachments?: (files: File[]) => Promise<void> | void;
  isUploadingAttachments?: boolean;
  uploadProgressPercent?: number;
  uploadProgressLabel?: string;
  disabled?: boolean;
  onTyping?: () => void;
  onStopTyping?: () => void;
}

export function ChatInput({
  onSend,
  onSendAttachments,
  isUploadingAttachments,
  uploadProgressPercent,
  uploadProgressLabel,
  disabled,
  onTyping,
  onStopTyping,
}: ChatInputProps) {
  const [value, setValue] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDialogOpen, setRecordingDialogOpen] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [emojiDialogOpen, setEmojiDialogOpen] = useState(false);
  const [isSendingAttachment, setIsSendingAttachment] = useState(false);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordingStreamRef = useRef<MediaStream | null>(null);
  const recordedChunksRef = useRef<BlobPart[]>([]);
  const recordingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const discardRecordingRef = useRef(false);

  useEffect(() => {
    return () => {
      if (mediaRecorderRef.current?.state === "recording") {
        mediaRecorderRef.current.stop();
      }

      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
        recordingIntervalRef.current = null;
      }

      recordingStreamRef.current?.getTracks().forEach((track) => track.stop());
      recordingStreamRef.current = null;
    };
  }, []);

  const clearRecordingState = useCallback(() => {
    if (recordingIntervalRef.current) {
      clearInterval(recordingIntervalRef.current);
      recordingIntervalRef.current = null;
    }

    recordingStreamRef.current?.getTracks().forEach((track) => track.stop());
    recordingStreamRef.current = null;
    mediaRecorderRef.current = null;
    setIsRecording(false);
    setRecordingDialogOpen(false);
    setRecordingSeconds(0);
  }, []);

  const sendAttachments = useCallback(
    async (files: File[]) => {
      if (!files.length || !onSendAttachments || disabled) return;

      try {
        setIsSendingAttachment(true);
        await onSendAttachments(files);
      } catch (error) {
        console.error("sendAttachments error:", error);
      } finally {
        setIsSendingAttachment(false);
      }
    },
    [disabled, onSendAttachments],
  );

  const handlePickFiles = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const files = event.target.files ? Array.from(event.target.files) : [];
      event.target.value = "";
      await sendAttachments(files);
    },
    [sendAttachments],
  );

  const stopRecording = useCallback(() => {
    const recorder = mediaRecorderRef.current;
    if (!recorder || recorder.state !== "recording") return;
    recorder.stop();
  }, []);

  const cancelRecording = useCallback(() => {
    discardRecordingRef.current = true;
    stopRecording();
  }, [stopRecording]);

  const finishRecording = useCallback(() => {
    discardRecordingRef.current = false;
    stopRecording();
  }, [stopRecording]);

  const startRecording = useCallback(async () => {
    if (!onSendAttachments) {
      toast.info("Tính năng gửi ghi âm chưa được bật");
      return;
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      toast.error("Trình duyệt không hỗ trợ ghi âm");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);

      recordingStreamRef.current = stream;
      mediaRecorderRef.current = recorder;
      recordedChunksRef.current = [];

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          recordedChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = async () => {
        if (recordingIntervalRef.current) {
          clearInterval(recordingIntervalRef.current);
          recordingIntervalRef.current = null;
        }

        const shouldDiscard = discardRecordingRef.current;
        discardRecordingRef.current = false;

        const mimeType = recorder.mimeType || "audio/webm";
        const extension = mimeType.includes("ogg") ? "ogg" : "webm";
        const audioBlob = new Blob(recordedChunksRef.current, {
          type: mimeType,
        });

        recordingStreamRef.current
          ?.getTracks()
          .forEach((track) => track.stop());
        recordingStreamRef.current = null;
        mediaRecorderRef.current = null;
        setIsRecording(false);
        setRecordingDialogOpen(false);
        setRecordingSeconds(0);

        if (shouldDiscard || audioBlob.size <= 0) return;

        const audioFile = new File(
          [audioBlob],
          `record-${Date.now()}.${extension}`,
          { type: mimeType },
        );

        await sendAttachments([audioFile]);
      };

      recorder.start();
      setIsRecording(true);
      setRecordingDialogOpen(true);
      setRecordingSeconds(0);
      recordingIntervalRef.current = setInterval(() => {
        setRecordingSeconds((current) => current + 1);
      }, 1000);
      toast.success("Đang ghi âm...");
    } catch (error) {
      console.error("startRecording error:", error);
      toast.error("Không thể bắt đầu ghi âm");
      clearRecordingState();
    }
  }, [clearRecordingState, onSendAttachments, sendAttachments]);

  const handleMicClick = useCallback(() => {
    if (disabled || isSendingAttachment) return;

    if (isRecording) {
      setRecordingDialogOpen(true);
      return;
    }

    void startRecording();
  }, [
    disabled,
    isRecording,
    isSendingAttachment,
    startRecording,
  ]);

  const handleEmojiClick = useCallback((emojiObject: { emoji: string }) => {
    setValue((current) => `${current}${emojiObject.emoji}`);
    setEmojiDialogOpen(false);
  }, []);

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (value.trim() && !disabled && !isSendingAttachment) {
      Promise.resolve(onSend(value)).catch((error) => {
        console.error("handleSubmit error:", error);
      });
      setValue("");
      if (onStopTyping) onStopTyping();
    }
  };

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setValue(e.target.value);

      if (onTyping) onTyping();

      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      typingTimeoutRef.current = setTimeout(() => {
        if (onStopTyping) onStopTyping();
      }, 2000);
    },
    [onTyping, onStopTyping],
  );

  return (
    <div className="px-3 py-4 md:px-6 md:py-5 border-t border-slate-200/60 bg-white/88 backdrop-blur-xl">
      {isUploadingAttachments && (
        <div className="w-full max-w-[1240px] mx-auto mb-3">
          <div className="mb-1 flex items-center justify-between text-[11px] text-slate-500">
            <span>{uploadProgressLabel || "Đang tải tệp lên..."}</span>
            <span>
              {Math.max(0, Math.min(100, uploadProgressPercent || 0))}%
            </span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
            <div
              className="h-full rounded-full bg-blue-500 transition-all duration-200"
              style={{
                width: `${Math.max(0, Math.min(100, uploadProgressPercent || 0))}%`,
              }}
            />
          </div>
        </div>
      )}
      <div className="flex items-center gap-3 w-full max-w-[1240px] mx-auto">
        <div className="flex items-center gap-2">
          <button
            disabled={disabled}
            onClick={() => imageInputRef.current?.click()}
            className="p-2.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all duration-200 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ImageIcon className="w-5 h-5" />
          </button>
          <button
            disabled={disabled}
            onClick={() => fileInputRef.current?.click()}
            className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Paperclip className="w-5 h-5" />
          </button>
          <button
            disabled={disabled || isSendingAttachment}
            onClick={handleMicClick}
            className={`p-2 rounded-full transition-all hidden sm:block disabled:opacity-50 disabled:cursor-not-allowed ${
              isRecording
                ? "text-rose-600 bg-rose-50"
                : "text-slate-400 hover:text-blue-600 hover:bg-blue-50"
            }`}
          >
            <Mic className="w-5 h-5" />
          </button>
          <input
            ref={imageInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handlePickFiles}
            multiple
          />
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            onChange={handlePickFiles}
            multiple
          />
        </div>

        <form onSubmit={handleSubmit} className="flex-1 relative">
          <Input
            value={value}
            onChange={handleChange}
            placeholder="Nhập tin nhắn..."
            disabled={disabled}
            className="w-full bg-slate-50 border border-slate-200/80 shadow-sm h-12 rounded-2xl pl-5 pr-12 focus-visible:ring-2 focus-visible:ring-blue-500/20 focus-visible:border-blue-300 disabled:opacity-50 disabled:cursor-not-allowed"
          />
          <button
            type="button"
            disabled={disabled}
            onClick={() => setEmojiDialogOpen(true)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-yellow-500 disabled:opacity-50"
          >
            <Smile className="w-5 h-5" />
          </button>
        </form>

        <button
          onClick={() => handleSubmit()}
          disabled={disabled || !value.trim() || isSendingAttachment}
          className="p-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-2xl shadow-lg shadow-blue-200/50 hover:shadow-xl hover:shadow-blue-300/50 hover:scale-105 active:scale-95 transition-all duration-200 disabled:opacity-45 disabled:hover:scale-100 disabled:cursor-not-allowed"
        >
          <SendHorizontal className="w-5 h-5" />
        </button>
      </div>

      <Dialog open={emojiDialogOpen} onOpenChange={setEmojiDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Chọn emoji</DialogTitle>
          </DialogHeader>
          <div className="overflow-hidden rounded-2xl border border-slate-200">
            <EmojiPicker onEmojiClick={handleEmojiClick} width="100%" height={420} />
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={recordingDialogOpen} onOpenChange={(open) => {
        if (!open && isRecording) {
          setRecordingDialogOpen(true);
          return;
        }
        setRecordingDialogOpen(open);
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Đang ghi âm</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="rounded-3xl border border-rose-200 bg-rose-50 px-4 py-4">
              <div className="flex items-center gap-3">
                <span className="relative flex h-3 w-3">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-rose-400 opacity-75" />
                  <span className="relative inline-flex h-3 w-3 rounded-full bg-rose-500" />
                </span>
                <div className="text-sm font-medium text-rose-700">
                  Đang thu âm giọng nói
                </div>
              </div>
              <div className="mt-3 flex items-center justify-between text-sm text-rose-700">
                <span>Thời gian</span>
                <span className="font-semibold tabular-nums">{Math.floor(recordingSeconds / 60)}:{String(recordingSeconds % 60).padStart(2, "0")}</span>
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs text-slate-500">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Bấm dừng để gửi hoặc hủy để bỏ bản ghi.
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <button
              type="button"
              onClick={cancelRecording}
              className="rounded-2xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Hủy
            </button>
            <button
              type="button"
              onClick={finishRecording}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-rose-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-rose-700"
            >
              <Square className="h-4 w-4" />
              Dừng và gửi
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
