"use client"

import { UserPlus, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useContacts, useFriendRequests } from "@/hooks/use-contact";
import { useState } from "react";
import { FriendRequestsList } from "@/components/contact/friend-requests-list";
import { SearchAndAddFriend } from "@/components/contact/search-and-add-friend";
import { FriendsList } from "@/components/contact/friends-list";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { QRDialog } from "@/components/contact/qr-dialog";
import { QrCode } from "lucide-react";

export default function ContactsPage() {
  const { data: contactsData, isLoading: isLoadingContacts } = useContacts();
  const { data: friendRequestsData, isLoading: isLoadingRequests } = useFriendRequests();
  const [searchQuery, setSearchQuery] = useState("");
  const [showRequests, setShowRequests] = useState(false);
  const [showSearchDialog, setShowSearchDialog] = useState(false);
  const [showQRDialog, setShowQRDialog] = useState(false);

  const contacts = contactsData?.contacts || [];
  const friendRequests = friendRequestsData?.requests || [];

  return (
    <div className="flex flex-col h-full bg-white w-full">
      <header className="hidden md:flex h-[70px] border-b border-slate-100 items-center justify-between px-6 sticky top-0 bg-white z-10 shrink-0">
        <h1 className="text-xl font-bold text-black">Danh bạ</h1>
      </header>

      <ScrollArea className="flex-1 w-full">
        <div className="w-full p-3 md:p-8 space-y-4 md:space-y-8">
          {/* Quick Action Cards */}
          <div className="grid grid-cols-3 gap-2 md:gap-4 font-sans">
            <div 
              className="flex flex-col items-center justify-center gap-2 p-2.5 md:p-4 rounded-xl border border-slate-100 hover:bg-slate-50 cursor-pointer transition-all text-center min-h-[96px] md:min-h-[112px]"
              onClick={() => setShowQRDialog(true)}
            >
              <div className="p-2 md:p-3 rounded-lg bg-emerald-50 text-emerald-500">
                <QrCode className="w-4 h-4 md:w-5 md:h-5" />
              </div>
              <div>
                <p className="font-semibold text-xs md:text-sm text-black">Mã QR</p>
                <p className="text-[11px] md:text-xs text-slate-400 leading-tight">Kết bạn QR</p>
              </div>
            </div>

            <div
              className="flex flex-col items-center justify-center gap-2 p-2.5 md:p-4 rounded-xl border border-slate-100 hover:bg-slate-50 cursor-pointer transition-all text-center min-h-[96px] md:min-h-[112px]"
              onClick={() => setShowRequests(true)}
            >
              <div className="p-2 md:p-3 rounded-lg bg-orange-50 text-orange-500">
                <UserPlus className="w-4 h-4 md:w-5 md:h-5" />
              </div>
              <div>
                <p className="font-semibold text-xs md:text-sm text-black leading-tight">Lời mời</p>
                <p className="text-[11px] md:text-xs text-slate-400">{friendRequests.length}</p>
              </div>
            </div>

            <div
              className="flex flex-col items-center justify-center gap-2 p-2.5 md:p-4 rounded-xl border border-slate-100 hover:bg-slate-50 cursor-pointer transition-all text-center min-h-[96px] md:min-h-[112px]"
              onClick={() => setShowSearchDialog(true)}
            >
              <div className="p-2 md:p-3 rounded-lg bg-blue-50 text-blue-500">
                <UserPlus className="w-4 h-4 md:w-5 md:h-5" />
              </div>
              <div>
                <p className="font-semibold text-xs md:text-sm text-black">Thêm bạn</p>
                <p className="text-[11px] md:text-xs text-slate-400 leading-tight">Tìm & mời</p>
              </div>
            </div>
          </div>

          {/* Search */}
          <div className="w-full md:max-w-md">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Tìm bạn bè..."
                className="pl-9 bg-slate-100/50 border-none h-11 md:h-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          {/* Friends List */}
          <div className="space-y-3 md:space-y-4">
            <h3 className="font-bold text-black text-lg md:text-base">
              Bạn bè ({contacts.filter(c => c.displayName.toLowerCase().includes(searchQuery.toLowerCase())).length})
            </h3>
            <FriendsList 
              friends={contacts} 
              isLoading={isLoadingContacts}
              searchQuery={searchQuery}
            />
          </div>
        </div>
      </ScrollArea>

      {/* Friend Requests Modal */}
      <Dialog open={showRequests} onOpenChange={setShowRequests}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Lời mời kết bạn ({friendRequests.length})</DialogTitle>
          </DialogHeader>
          <FriendRequestsList requests={friendRequests} isLoading={isLoadingRequests} />
        </DialogContent>
      </Dialog>

      {/* Search and Add Friend Modal */}
      <SearchAndAddFriend 
        open={showSearchDialog} 
        onOpenChange={setShowSearchDialog} 
      />

      {/* QR Code Dialog */}
      <QRDialog
        open={showQRDialog}
        onOpenChange={setShowQRDialog}
      />
    </div>
  );
}
