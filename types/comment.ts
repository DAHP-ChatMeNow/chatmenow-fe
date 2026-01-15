import { User } from "./user";

export interface Comment {
  id: string;
  _id: string;
  postId: string;
  userId: string;
  user?: User;
  content: string;
  replyToCommentId?: string;
  createdAt: Date;
  updatedAt?: Date;
}
