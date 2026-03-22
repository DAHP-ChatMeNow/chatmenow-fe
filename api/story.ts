import api from "@/lib/axios";
import { Story, StoryGroup, StoryPrivacy, StoryReply } from "@/types/story";
import { User } from "@/types/user";

export type CreateStoryPayload = {
  mediaFile: File;
  caption?: string;
  privacy?: StoryPrivacy;
  videoDuration?: number;
};

interface BackendStory {
  _id: string;
  authorId: User;
  caption: string;
  privacy: StoryPrivacy;
  media: {
    url: string;
    type: "image" | "video";
    duration?: number;
  };
  createdAt: Date;
  expiresAt: Date;
  isViewedByCurrentUser?: boolean;
}

interface BackendStoryGroup {
  user: User;
  latestStoryAt: Date;
  hasUnviewed: boolean;
  stories: BackendStory[];
}

const mapStory = (story: BackendStory): Story => ({
  _id: story._id,
  id: story._id,
  authorId: (story.authorId as any)?._id || story.authorId?.id,
  author: story.authorId,
  caption: story.caption,
  privacy: story.privacy,
  media: story.media,
  createdAt: story.createdAt,
  expiresAt: story.expiresAt,
  isViewedByCurrentUser: story.isViewedByCurrentUser || false,
});

const mapStoryGroup = (group: BackendStoryGroup): StoryGroup => ({
  user: group.user,
  latestStoryAt: group.latestStoryAt,
  hasUnviewed: group.hasUnviewed,
  stories: group.stories.map(mapStory),
});

const createStory = async (payload: CreateStoryPayload) => {
  const formData = new FormData();
  formData.append("media", payload.mediaFile);
  formData.append("caption", payload.caption || "");
  formData.append("privacy", payload.privacy || "friends");

  if (typeof payload.videoDuration === "number") {
    formData.append("videoDuration", String(payload.videoDuration));
  }

  const { data } = await api.post<BackendStory>("/stories", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });

  return mapStory(data);
};

const getStoryFeed = async () => {
  const { data } = await api.get<{
    success: boolean;
    stories: BackendStoryGroup[];
  }>("/stories/feed");

  return data.stories.map(mapStoryGroup);
};

const getStoriesByUser = async (userId: string) => {
  const { data } = await api.get<{
    success: boolean;
    stories: BackendStory[];
  }>(`/stories/users/${userId}`);

  return data.stories.map(mapStory);
};

const markStoryViewed = async (storyId: string) => {
  await api.post(`/stories/${storyId}/view`);
};

const deleteStory = async (storyId: string) => {
  await api.delete(`/stories/${storyId}`);
};

const addReaction = async (storyId: string, emoji: string) => {
  const { data } = await api.post(`/stories/${storyId}/react`, { emoji });
  return data;
};

const getReactions = async (storyId: string) => {
  const { data } = await api.get<{
    success: boolean;
    reactions: Array<{ emoji: string; users: User[] }>;
  }>(`/stories/${storyId}/reactions`);
  return data.reactions;
};

const replyToStory = async (storyId: string, message: string) => {
  const { data } = await api.post<StoryReply>(`/stories/${storyId}/reply`, {
    message,
  });
  return data;
};

const getReplies = async (storyId: string) => {
  const { data } = await api.get<{
    success: boolean;
    replies: StoryReply[];
  }>(`/stories/${storyId}/replies`);
  return data.replies;
};

const deleteReply = async (replyId: string) => {
  await api.delete(`/stories/reply/${replyId}`);
};

export const storyService = {
  createStory,
  getStoryFeed,
  getStoriesByUser,
  markStoryViewed,
  deleteStory,
  addReaction,
  getReactions,
  replyToStory,
  getReplies,
  deleteReply,
};
