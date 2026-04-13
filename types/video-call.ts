export type VideoCallType = "video" | "audio";
export type VideoCallMode = "direct" | "group";

export type VideoCallStatus =
  | "initiated"
  | "accepted"
  | "rejected"
  | "ended"
  | "missed";

export interface VideoCallRecord {
  id: string;
  callerId: string;
  receiverId?: string;
  callMode?: VideoCallMode;
  participantIds?: string[];
  acceptedParticipantIds?: string[];
  rejectedParticipantIds?: string[];
  status: VideoCallStatus;
  callType: VideoCallType;
  conversationId?: string;
  startTime?: string;
  endTime?: string;
  duration?: number;
  rejectionReason?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface VideoCallStats {
  totalCalls: number;
  totalDuration: number;
  acceptedCalls: number;
  missedCalls: number;
  rejectedCalls: number;
}

export interface IncomingCallData {
  roomId: string;
  callId?: string;
  callMode?: VideoCallMode;
  callerId: string;
  callerName?: string;
  callerAvatar?: string;
  receiverId?: string;
  participantIds?: string[];
  callType: VideoCallType;
  conversationId?: string;
}
