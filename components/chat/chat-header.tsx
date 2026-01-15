"use client"

import { ChevronLeft, Phone, Video, MoreVertical } from "lucide-react";
import { useRouter } from "next/navigation";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export function ChatHeader({ 
  name, 
  isOnline, 
  avatar 
}: { 
  name?: string, 
  isOnline?: boolean, 
  avatar?: string 
}) {
  const router = useRouter();
  const displayName = name || "Chat";

  return (
    <div className="h-[70px] md:h-[80px] border-b border-slate-200/60 flex items-center justify-between px-5 bg-white/80 backdrop-blur-xl sticky top-0 z-30 shadow-sm">
      <div className="flex items-center gap-2 md:gap-3">
        <button 
          onClick={() => router.push('/messages')} 
          className="md:hidden p-2 -ml-2 hover:bg-slate-100 rounded-full transition-colors"
        >
          <ChevronLeft className="w-6 h-6 text-slate-600" />
        </button>

        <div className="relative">
          <Avatar className="h-11 w-11 md:h-12 md:w-12 border-2 border-white shadow-lg ring-1 ring-slate-100">
            <AvatarImage src={avatar} />
            <AvatarFallback className="bg-gradient-to-br from-blue-400 to-blue-600 text-white font-bold">
              {(displayName || "U").charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          {isOnline && <span className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 border-2 border-white rounded-full shadow-sm" />}
        </div>

        <div className="flex flex-col">
          <h2 className="font-bold text-slate-900 text-base md:text-lg leading-tight">{displayName}</h2>
          <p className="text-[11px] md:text-[12px] text-slate-400 font-medium">
            {isOnline ? "Đang hoạt động" : "Vừa truy cập"}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button className="p-2.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all duration-200 hover:scale-105"><Phone className="w-5 h-5" /></button>
        <button className="p-2.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all duration-200 hover:scale-105"><Video className="w-5 h-5" /></button>
        <button className="p-2.5 text-slate-400 hover:bg-slate-100 rounded-xl transition-all duration-200"><MoreVertical className="w-5 h-5" /></button>
      </div>
    </div>
  );
}