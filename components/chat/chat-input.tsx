"use client";

import { useState, useCallback, useRef } from "react";
import {
  Image as ImageIcon,
  Mic,
  SendHorizontal,
  Paperclip,
  Smile,
} from "lucide-react";
import { Input } from "@/components/ui/input";

interface ChatInputProps {
  onSend: (text: string) => void;
  disabled?: boolean;
  onTyping?: () => void;
  onStopTyping?: () => void;
}

export function ChatInput({
  onSend,
  disabled,
  onTyping,
  onStopTyping,
}: ChatInputProps) {
  const [value, setValue] = useState("");
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (value.trim() && !disabled) {
      onSend(value);
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
      <div className="flex items-center gap-3 w-full max-w-[1240px] mx-auto">
        <div className="flex items-center gap-2">
          <button
            disabled={disabled}
            className="p-2.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all duration-200 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ImageIcon className="w-5 h-5" />
          </button>
          <button
            disabled={disabled}
            className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Paperclip className="w-5 h-5" />
          </button>
          <button
            disabled={disabled}
            className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-all hidden sm:block disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Mic className="w-5 h-5" />
          </button>
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
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-yellow-500 disabled:opacity-50"
          >
            <Smile className="w-5 h-5" />
          </button>
        </form>

        <button
          onClick={() => handleSubmit()}
          disabled={disabled || !value.trim()}
          className="p-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-2xl shadow-lg shadow-blue-200/50 hover:shadow-xl hover:shadow-blue-300/50 hover:scale-105 active:scale-95 transition-all duration-200 disabled:opacity-45 disabled:hover:scale-100 disabled:cursor-not-allowed"
        >
          <SendHorizontal className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
