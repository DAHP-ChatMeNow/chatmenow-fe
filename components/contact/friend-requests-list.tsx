"use client";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { PresignedAvatar } from "@/components/ui/presigned-avatar";
import { Button } from "@/components/ui/button";
import { FriendRequest } from "@/types/friend-request";
import {
  useAcceptFriendRequest,
  useRejectFriendRequest,
  useGetUserEmailById,
} from "@/hooks/use-contact";
import { useState } from "react";
import { Loader } from "lucide-react";

interface FriendRequestsListProps {
  requests: FriendRequest[];
  isLoading?: boolean;
}

function FriendRequestItem({
  request,
  processingIds,
  onAccept,
  onReject,
}: {
  request: FriendRequest;
  processingIds: string[];
  onAccept: (id: string) => void;
  onReject: (id: string) => void;
}) {
  const requestId = request._id || request.id;

  // Get sender ID from senderId field (which is populated as an object)
  const senderObj =
    typeof request.senderId === "string"
      ? {
          _id: request.senderId,
          displayName: request.sender?.displayName,
          avatar: request.sender?.avatar,
        }
      : request.senderId;
  const senderId = senderObj?._id;

  // Only fetch email, sender info is already populated
  const { data: emailData } = useGetUserEmailById(senderId || "");

  if (!requestId) return null;

  const displayName = senderObj?.displayName || "Unknown";
  const avatar = senderObj?.avatar;
  const email = emailData?.email;

  const isProcessing = processingIds.includes(requestId);

  return (
    <div className="flex items-center gap-4 p-4 border rounded-xl border-slate-100 hover:bg-slate-50">
      <PresignedAvatar
        avatarKey={avatar}
        displayName={displayName}
        className="w-12 h-12"
      />

      <div className="flex-1">
        <p className="text-sm font-semibold">{displayName}</p>
        {email && <p className="text-xs text-slate-400">{email}</p>}
      </div>

      <div className="flex gap-2">
        <Button
          size="sm"
          onClick={() => onAccept(requestId)}
          disabled={isProcessing}
        >
          {isProcessing ? (
            <Loader className="w-3 h-3 animate-spin" />
          ) : (
            "Chấp nhận"
          )}
        </Button>

        <Button
          size="sm"
          variant="outline"
          onClick={() => onReject(requestId)}
          disabled={isProcessing}
        >
          Từ chối
        </Button>
      </div>
    </div>
  );
}

export function FriendRequestsList({
  requests,
  isLoading,
}: FriendRequestsListProps) {
  const { mutate: acceptRequest } = useAcceptFriendRequest();
  const { mutate: rejectRequest } = useRejectFriendRequest();
  const [processingIds, setProcessingIds] = useState<string[]>([]);

  const handleAccept = (id: string) => {
    setProcessingIds((prev) => [...prev, id]);
    acceptRequest(id, {
      onSettled: () => setProcessingIds((prev) => prev.filter((x) => x !== id)),
    });
  };

  const handleReject = (id: string) => {
    setProcessingIds((prev) => [...prev, id]);
    rejectRequest(id, {
      onSettled: () => setProcessingIds((prev) => prev.filter((x) => x !== id)),
    });
  };

  if (isLoading) {
    return <Loader className="mx-auto animate-spin" />;
  }

  if (!requests || requests.length === 0) {
    return (
      <p className="text-center text-slate-500">Không có lời mời kết bạn nào</p>
    );
  }

  return (
    <div className="space-y-3">
      {requests.map((req) => (
        <FriendRequestItem
          key={req._id || req.id}
          request={req}
          processingIds={processingIds}
          onAccept={handleAccept}
          onReject={handleReject}
        />
      ))}
    </div>
  );
}
