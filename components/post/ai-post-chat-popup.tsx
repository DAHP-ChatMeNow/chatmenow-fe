"use client";

import { Loader2, Send } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export type AiPopupMessage = {
  id?: string;
  role: "user" | "ai";
  content: string;
  status?: "pending" | "sent" | "failed";
};

const formatAiMessage = (content: string): string => {
  return content
    .replace(/\r\n/g, "\n")
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
};

export function AiPostChatPopup({
  open,
  onOpenChange,
  title,
  messages,
  inputValue,
  onInputChange,
  onSend,
  isSending,
  options,
  onPickOption,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  messages: AiPopupMessage[];
  inputValue: string;
  onInputChange: (value: string) => void;
  onSend: () => void;
  isSending: boolean;
  options: string[];
  onPickOption: (option: string) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg p-0 overflow-hidden">
        <DialogHeader className="px-4 py-3 border-b border-slate-100">
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        <div className="max-h-[50vh] space-y-2 overflow-y-auto px-4 py-3 bg-slate-50">
          {messages.length === 0 ? (
            <p className="text-sm text-slate-500">
              Chọn gợi ý để bắt đầu chat với AI.
            </p>
          ) : (
            messages.map((message, index) => (
              <div
                key={message.id || `${message.role}-${index}`}
                className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${
                    message.role === "user"
                      ? "bg-blue-600 text-white"
                      : "bg-white text-slate-800 border border-slate-200"
                  }`}
                >
                  <p className="leading-relaxed whitespace-pre-wrap break-words">
                    {message.role === "ai"
                      ? formatAiMessage(message.content)
                      : message.content}
                  </p>
                  {message.role === "user" && message.status === "pending" ? (
                    <p className="mt-1 text-[11px] text-blue-100">
                      Đang gửi...
                    </p>
                  ) : null}
                  {message.role === "user" && message.status === "failed" ? (
                    <p className="mt-1 text-[11px] text-red-100">
                      Gửi thất bại
                    </p>
                  ) : null}
                </div>
              </div>
            ))
          )}
        </div>

        {options.length > 0 && (
          <div className="border-t border-slate-100 px-4 py-2 bg-white">
            <p className="mb-2 text-xs font-semibold text-slate-500">
              Gợi ý tiếp theo
            </p>
            <div className="flex flex-wrap gap-2">
              {options.map((option) => (
                <Button
                  key={option}
                  variant="outline"
                  size="sm"
                  type="button"
                  onClick={() => onPickOption(option)}
                  disabled={isSending}
                  className="h-7 text-xs"
                >
                  {option}
                </Button>
              ))}
            </div>
          </div>
        )}

        <div className="flex items-center gap-2 border-t border-slate-100 px-4 py-3">
          <Input
            value={inputValue}
            onChange={(event) => onInputChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                onSend();
              }
            }}
            placeholder="Nhập tin nhắn cho AI..."
            className="h-9"
            disabled={isSending}
          />
          <Button
            type="button"
            onClick={onSend}
            disabled={isSending || !inputValue.trim()}
          >
            {isSending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
