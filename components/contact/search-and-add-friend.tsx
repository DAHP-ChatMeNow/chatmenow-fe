"use client";

import { useState } from "react";
import { Search, UserPlus, Loader, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  useSearchUsers,
  useSendFriendRequest,
  useGetUserEmailById,
} from "@/hooks/use-contact";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { User } from "@/types/user";

interface SearchAndAddFriendProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function SearchResultItem({
  user,
  onSendRequest,
  isSending,
}: {
  user: User;
  onSendRequest: (userId: string) => void;
  isSending: boolean;
}) {
  const { data: emailData } = useGetUserEmailById(user.id);

  return (
    <div className="flex items-center justify-between p-4 transition-all duration-200 border border-gray-200 rounded-xl hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 hover:border-blue-300 hover:shadow-md">
      <div className="flex items-center gap-3">
        <Avatar className="w-12 h-12 ring-2 ring-blue-100">
          {user.avatar ? (
            <img
              src={user.avatar}
              alt={user.displayName}
              className="object-cover w-full h-full"
            />
          ) : (
            <AvatarFallback className="text-lg font-bold text-white bg-gradient-to-br from-blue-400 to-indigo-500">
              {user.displayName.charAt(0).toUpperCase()}
            </AvatarFallback>
          )}
        </Avatar>
        <div>
          <p className="text-base font-semibold text-gray-900">
            {user.displayName}
          </p>
          {emailData?.email && (
            <p className="text-sm text-gray-500">{emailData.email}</p>
          )}
        </div>
      </div>
      <Button
        size="sm"
        onClick={() => onSendRequest(user.id)}
        disabled={isSending}
        className="flex items-center gap-2 text-white transition-all duration-200 shadow-md bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 hover:shadow-lg"
      >
        {isSending ? (
          <Loader className="w-4 h-4 animate-spin" />
        ) : (
          <>
            <UserPlus className="w-4 h-4" />
            Thêm bạn
          </>
        )}
      </Button>
    </div>
  );
}

export function SearchAndAddFriend({
  open,
  onOpenChange,
}: SearchAndAddFriendProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const { data: searchData, isLoading } = useSearchUsers(searchQuery);
  const { mutate: sendFriendRequest, isPending } = useSendFriendRequest();

  const searchResults = searchData?.users || [];

  const handleSendRequest = (userId: string) => {
    if (!userId) {
      return;
    }
    sendFriendRequest(userId, {
      onSuccess: () => {
        // Optionally close dialog or show success message
      },
    });
  };

  const handleClearSearch = () => {
    setSearchQuery("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col bg-white">
        <DialogHeader className="relative">
          <DialogTitle className="text-gray-900">
            Tìm kiếm và thêm bạn
          </DialogTitle>
          <Button
            variant="ghost"
            size="sm"
            className="absolute top-0 right-0 w-8 h-8 p-0 rounded-full bottom-2 hover:bg-gray-100"
            onClick={() => onOpenChange(false)}
          >
            <X className="w-4 h-4 text-gray-600" />
          </Button>
        </DialogHeader>

        <div className="flex flex-col flex-1 space-y-4 overflow-hidden">
          {/* Search Input */}
          <div className="relative">
            <Search className="absolute w-5 h-5 text-blue-400 -translate-y-1/2 left-3 top-1/2" />
            <Input
              placeholder="Tìm kiếm theo tên, email hoặc số điện thoại..."
              className="pl-10 pr-10 text-gray-900 border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50 focus-visible:ring-blue-400 placeholder:text-gray-500"
              value={searchQuery}
              onChange={(e) => {
                const value = e.target.value;
                setSearchQuery(value);
              }}
            />
            {searchQuery && (
              <Button
                size="sm"
                variant="ghost"
                className="absolute p-0 transition-colors -translate-y-1/2 right-1 top-1/2 h-7 w-7 hover:bg-red-100 hover:text-red-600"
                onClick={handleClearSearch}
              >
                <X className="w-4 h-4" />
              </Button>
            )}
          </div>

          {/* Search Results */}
          <ScrollArea className="flex-1">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader className="w-8 h-8 text-blue-500 animate-spin" />
              </div>
            ) : searchQuery.length === 0 ? (
              <div className="py-16 text-center text-gray-600">
                <div className="flex items-center justify-center w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-blue-100 to-indigo-100">
                  <Search className="w-10 h-10 text-blue-500" />
                </div>
                <p className="text-lg font-medium">
                  Nhập tên, email hoặc số điện thoại để tìm kiếm
                </p>
              </div>
            ) : searchResults.length === 0 ? (
              <div className="py-16 text-center text-gray-600">
                <div className="flex items-center justify-center w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-gray-100 to-gray-200">
                  <Search className="w-10 h-10 text-gray-400" />
                </div>
                <p className="text-lg font-medium">
                  Không tìm thấy người dùng nào
                </p>
              </div>
            ) : (
              <div className="pr-2 space-y-2">
                {searchResults.map((user: User) => (
                  <SearchResultItem
                    key={user.id}
                    user={user}
                    onSendRequest={handleSendRequest}
                    isSending={isPending}
                  />
                ))}
              </div>
            )}
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
}
