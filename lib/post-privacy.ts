import { PostPrivacy } from "@/types/post";

export const POST_PRIVACY_OPTIONS: Array<{
  value: PostPrivacy;
  label: string;
  description: string;
}> = [
  {
    value: "public",
    label: "Công khai",
    description: "Ai cũng có thể xem bài viết này",
  },
  {
    value: "friends",
    label: "Bạn bè",
    description: "Chỉ bạn bè của bạn mới xem được",
  },
  {
    value: "custom",
    label: "Tùy chọn",
    description: "Chỉ những người bạn chọn mới xem được",
  },
  {
    value: "private",
    label: "Chỉ mình tôi",
    description: "Chỉ bạn mới xem được",
  },
];

export const getPostPrivacyLabel = (privacy?: string): string => {
  const found = POST_PRIVACY_OPTIONS.find((option) => option.value === privacy);
  return found?.label || "Công khai";
};
