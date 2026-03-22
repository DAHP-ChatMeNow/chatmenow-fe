import { User } from "./user";

export type StoryPrivacy = "public" | "friends" | "private";

export interface StoryMedia {
  url: string;
  type: "image" | "video";
  duration?: number;
}

export interface StoryReaction {
  emoji: string;
  users: User[];
}

export interface StoryReply {
  _id: string;
  id: string;
  storyId: string;
  senderId: string;
  sender?: User;
  message: string;
  createdAt: Date;
  expiresAt: Date;
}

export interface Story {
  _id: string;
  id: string;
  authorId: string;
  author?: User;
  caption?: string;
  privacy: StoryPrivacy;
  media: StoryMedia;
  reactions?: StoryReaction[];
  replyCount?: number;
  createdAt: Date;
  expiresAt: Date;
  isViewedByCurrentUser?: boolean;
}

export interface StoryGroup {
  user: User;
  latestStoryAt: Date;
  hasUnviewed: boolean;
  stories: Story[];
}
