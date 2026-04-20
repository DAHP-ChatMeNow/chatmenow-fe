export interface MessageAttachment {
  key?: string;
  url?: string;
  fileType: string;
  fileName: string;
  fileSize: number;
}

export interface MessageMusicInfo {
  title?: string | null;
  artist?: string | null;
  url?: string | null;
  coverUrl?: string | null;
  duration?: number;
  source?: string;
}

export interface MessageSenderInfo {
  _id?: string;
  id?: string;
  displayName?: string;
  avatar?: string;
}

export interface MessageCallInfo {
  status?: string;
  duration?: number;
  startedAt?: string | Date;
  endedAt?: string | Date;
  participants?: Array<{
    userId?: string;
    displayName?: string;
    avatar?: string;
    joinedAt?: string | Date;
  }>;
}

export interface MessageReplyPreview {
  content?: string;
  type?: string;
  attachments?: MessageAttachment[];
  senderDisplayName?: string;
}

export type MessageReactionEmoji = "like" | "love" | "haha" | "sad" | "angry" | "wow";

export interface MessageReaction {
  userId: string;
  emoji: MessageReactionEmoji;
  reactedAt?: string | Date;
}

export type MessageStatus = "sending" | "sent" | "failed";
export type MessageSenderSource = "user" | "ai";
export type MessageReadStatus = "read" | "unread";

// ─── Poll types ───────────────────────────────────────────────────────────────
export interface PollVoter {
  userId: string;
  votedAt?: string | Date;
}

export interface PollOption {
  _id: string;
  text: string;
  voteCount: number | null;  // null when hidden before vote
  votedByMe: boolean;
  voters: PollVoter[];
}

export interface Poll {
  _id: string;
  conversationId: string;
  messageId: string | null;
  createdBy: string;
  question: string;
  options: PollOption[];
  totalVotes: number | null;
  allowMultipleChoices: boolean;
  allowAddOptions: boolean;
  hideResultsBeforeVote: boolean;
  hideVoters: boolean;
  deadline: string | Date | null;
  isClosed: boolean;
  userHasVoted: boolean;
  createdAt: string | Date;
  updatedAt: string | Date;
}

export interface Message {
  id: string;
  conversationId: string;
  _id?: string;
  senderId?: string | MessageSenderInfo;
  senderSource?: MessageSenderSource;
  content?: string;
  type: string;
  attachments?: MessageAttachment[];
  callInfo?: MessageCallInfo;
  sharedPostId?: string;
  sharedPost?: import("./post").SharedPostReference | null;
  replyToMessageId?: string;
  replyPreview?: MessageReplyPreview;
  reactions?: MessageReaction[];
  readBy?: string[];
  mentionAll?: boolean;
  mentions?: string[];
  isRead?: boolean;
  readStatus?: MessageReadStatus;
  isUnsent?: boolean;
  isEdited?: boolean;
  editedAt?: Date | string;
  unsentAt?: Date | string;
  deletedFor?: string[];
  musicInfo?: MessageMusicInfo;
  poll?: Poll | null;
  pollId?: string;
  createdAt: Date | string;
  clientTempId?: string;
  status?: MessageStatus;
  isOptimistic?: boolean;
}
