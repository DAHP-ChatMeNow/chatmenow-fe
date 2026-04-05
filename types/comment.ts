import { User } from "./user";

export interface Comment {
  id: string;
  _id: string;
  postId: string;
  userId?: string;
  user?: User;
  authorSource?: "user" | "ai";
  content: string;
  replyToCommentId?: string;
  createdAt: Date;
  updatedAt?: Date;
}
