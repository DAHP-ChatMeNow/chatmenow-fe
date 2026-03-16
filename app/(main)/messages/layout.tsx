"use client";

import { ChatSidebar } from "@/components/chat/chat-sidebar";
import { useParams } from "next/navigation";

export default function MessagesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const params = useParams();
  const isChatting = !!params.id;

  return (
    <div className="flex h-full min-h-0 w-full bg-gradient-to-br from-white to-slate-50/30 overflow-hidden">
      <aside
        className={`
        ${isChatting ? "hidden" : "flex"} 
        md:flex w-full md:w-[350px] lg:w-[400px] shrink-0 border-r border-slate-200/60 flex-col h-full shadow-xl
      `}
      >
        <ChatSidebar />
      </aside>

      <section
        className={`
        ${!isChatting ? "hidden md:flex" : "flex"} 
        flex-1 h-full min-h-0 min-w-0 relative bg-white
      `}
      >
        {children}
      </section>
    </div>
  );
}
