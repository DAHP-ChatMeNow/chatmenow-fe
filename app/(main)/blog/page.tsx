"use client";

import { useState, useEffect, useRef } from "react";
import {
  Image as ImageIcon,
  Heart,
  MessageCircle,
  Share2,
  MoreHorizontal,
  Loader2,
  Send,
  Plus,
  X,
  Play,
  Globe,
  Users,
  SlidersHorizontal,
  Lock,
  Check,
  Trash2,
} from "lucide-react";
import { PresignedAvatar } from "@/components/ui/presigned-avatar";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  useFeed,
  useCreatePost,
  useUpdatePostPrivacy,
  useDeletePost,
  useLikePost,
  useComments,
  useAddComment,
  usePostAiChat,
} from "@/hooks/use-post";
import {
  useCreateStory,
  useDeleteStory,
  useMarkStoryViewed,
  useStoryFeed,
} from "@/hooks/use-story";
import { BlogSkeleton } from "@/components/skeletons/blog-skeleton";
import { useAuthStore } from "@/store/use-auth-store";
import { Post, PostMedia, PostPrivacy } from "@/types/post";
import { toast } from "sonner";
import { PostMediaLightbox } from "@/components/post/post-media-lightbox";
import { StoryViewer } from "@/components/post/story-viewer";
import {
  AiPostChatPopup,
  type AiPopupMessage,
} from "@/components/post/ai-post-chat-popup";
import { StoryPrivacyDialog } from "@/components/post/story-privacy-dialog";
import { StoryPrivacy } from "@/types/story";
import { AiSuggestion } from "@/api/post";
import { useRouter, useSearchParams } from "next/navigation";
import { useContacts } from "@/hooks/use-contact";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { getPostPrivacyLabel, POST_PRIVACY_OPTIONS } from "@/lib/post-privacy";

type AskAiPayload = {
  content?: string;
  autoSend?: boolean;
  action?: string;
  options?: string[];
};

type MediaPreview = {
  url: string;
  type: "image" | "video";
  name: string;
};

const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_VIDEO_SIZE = 50 * 1024 * 1024; // 50MB
const MAX_VIDEO_DURATION = 300; // 5 phút
const MAX_FILES = 10;
const MAX_STORY_FILE_SIZE = 20 * 1024 * 1024; // 20MB
const MAX_STORY_VIDEO_DURATION = 10; // 10s

const getVideoDuration = (file: File): Promise<number> =>
  new Promise((resolve) => {
    const video = document.createElement("video");
    video.preload = "metadata";
    const url = URL.createObjectURL(file);
    video.src = url;
    video.onloadedmetadata = () => {
      URL.revokeObjectURL(url);
      resolve(Math.floor(video.duration));
    };
    video.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(0);
    };
  });

const getPostPrivacyIcon = (privacy?: string, className = "w-3.5 h-3.5") => {
  switch (privacy) {
    case "friends":
      return <Users className={className} />;
    case "custom":
      return <SlidersHorizontal className={className} />;
    case "private":
      return <Lock className={className} />;
    case "public":
    default:
      return <Globe className={className} />;
  }
};

const normalizeId = (value?: string | { id?: string; _id?: string } | null) => {
  if (!value) return "";
  if (typeof value === "string") return value;
  return value._id || value.id || "";
};

export default function BlogPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const targetPostId = searchParams.get("postId");
  const [postContent, setPostContent] = useState("");
  const [postPrivacy, setPostPrivacy] = useState<PostPrivacy>("public");
  const [customAudienceIds, setCustomAudienceIds] = useState<string[]>([]);
  const [mediaFiles, setMediaFiles] = useState<File[]>([]);
  const [mediaPreviews, setMediaPreviews] = useState<MediaPreview[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [expandedPostId, setExpandedPostId] = useState<string | null>(null);
  const [popupPostId, setPopupPostId] = useState<string | null>(null);
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>(
    {},
  );
  const [aiSuggestions, setAiSuggestions] = useState<
    Record<string, AiSuggestion>
  >({});
  const [aiPopupOpen, setAiPopupOpen] = useState(false);
  const [aiPopupPostId, setAiPopupPostId] = useState<string | null>(null);
  const [aiPopupConversationId, setAiPopupConversationId] = useState<
    string | undefined
  >(undefined);
  const [aiPopupInput, setAiPopupInput] = useState("");
  const [aiPopupMessages, setAiPopupMessages] = useState<AiPopupMessage[]>([]);
  const [aiPopupOptions, setAiPopupOptions] = useState<string[]>([]);
  const [isStoryViewerOpen, setIsStoryViewerOpen] = useState(false);
  const [storyViewerGroupIndex, setStoryViewerGroupIndex] = useState(0);
  const [pendingStoryFile, setPendingStoryFile] = useState<File | null>(null);
  const [pendingStoryVideoDuration, setPendingStoryVideoDuration] = useState<number | undefined>();
  const [showStoryPrivacyDialog, setShowStoryPrivacyDialog] = useState(false);
  const [storyPrivacy, setStoryPrivacy] = useState<StoryPrivacy>("friends");
  const storyInputRef = useRef<HTMLInputElement>(null);
  const aiPendingMessageCounterRef = useRef(0);
  const user = useAuthStore((state) => state.user);
  const currentUserId = user?.id || user?._id;
  const { data: contactsData } = useContacts();
  const contacts = contactsData?.contacts || [];

  const {
    data,
    isLoading,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useFeed();

  const { mutate: createPost, isPending: isCreatingPost } = useCreatePost();
  const { mutate: updatePostPrivacy, isPending: isUpdatingPostPrivacy } =
    useUpdatePostPrivacy();
  const { mutate: deletePost, isPending: isDeletingPost } = useDeletePost();
  const { data: storyGroups = [] } = useStoryFeed();
  const { mutate: createStory, isPending: isCreatingStory } = useCreateStory();
  const { mutate: markStoryViewed } = useMarkStoryViewed();
  const { mutate: deleteStory } = useDeleteStory();
  const { mutate: likePost } = useLikePost();
  const { mutate: addComment, isPending: isAddingComment } = useAddComment();
  const { mutateAsync: askAiFromPost, isPending: isAskingAi } = usePostAiChat();

  const toggleCustomAudience = (userId: string) => {
    setCustomAudienceIds((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId],
    );
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files || []);
    if (!selected.length) return;

    if (mediaFiles.length + selected.length > MAX_FILES) {
      toast.error(`Tối đa ${MAX_FILES} file mỗi bài đăng`);
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    const validFiles: File[] = [];
    const newPreviews: MediaPreview[] = [];

    for (const file of selected) {
      const isImage = file.type.startsWith("image/");
      const isVideo = file.type.startsWith("video/");

      if (!isImage && !isVideo) {
        toast.error(`"${file.name}" không được hỗ trợ`);
        continue;
      }
      if (isImage && file.size > MAX_IMAGE_SIZE) {
        toast.error(`Ảnh "${file.name}" vượt quá 10MB`);
        continue;
      }
      if (isVideo && file.size > MAX_VIDEO_SIZE) {
        toast.error(`Video "${file.name}" vượt quá 50MB`);
        continue;
      }
      if (isVideo) {
        const duration = await getVideoDuration(file);
        if (duration > MAX_VIDEO_DURATION) {
          toast.error(`Video "${file.name}" vượt quá 5 phút`);
          continue;
        }
      }
      validFiles.push(file);
      newPreviews.push({
        url: URL.createObjectURL(file),
        type: isImage ? "image" : "video",
        name: file.name,
      });
    }

    setMediaFiles((prev) => [...prev, ...validFiles]);
    setMediaPreviews((prev) => [...prev, ...newPreviews]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removeMedia = (index: number) => {
    URL.revokeObjectURL(mediaPreviews[index].url);
    setMediaFiles((prev) => prev.filter((_, i) => i !== index));
    setMediaPreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const handleCreatePost = async () => {
    if (!postContent.trim() && mediaFiles.length === 0) return;
    if (postPrivacy === "custom" && customAudienceIds.length === 0) {
      toast.error("Bạn cần chọn ít nhất 1 người xem cho quyền Tùy chọn");
      return;
    }

    const videoDurations: number[] = [];
    for (const file of mediaFiles) {
      if (file.type.startsWith("video/")) {
        videoDurations.push(await getVideoDuration(file));
      }
    }

    createPost(
      {
        content: postContent,
        privacy: postPrivacy,
        customAudienceIds:
          postPrivacy === "custom" ? customAudienceIds : undefined,
        mediaFiles,
        videoDurations,
      },
      {
        onSuccess: () => {
          setPostContent("");
          mediaPreviews.forEach((p) => URL.revokeObjectURL(p.url));
          setMediaFiles([]);
          setMediaPreviews([]);
          setPostPrivacy("public");
          setCustomAudienceIds([]);
        },
      },
    );
  };

  const handleUpdatePostPrivacy = (
    postId: string,
    privacy: PostPrivacy,
    audienceIds?: string[],
  ) => {
    updatePostPrivacy({
      postId,
      payload: {
        privacy,
        customAudienceIds: privacy === "custom" ? audienceIds || [] : [],
      },
    });
  };

  const handleDeletePost = (postId: string) => {
    if (!window.confirm("Bạn chắc chắn muốn xóa bài viết này?")) return;
    deletePost(postId);
  };

  const handleOpenAuthorProfile = (post: Post) => {
    const authorId = normalizeId(post.author?._id || post.author?.id || post.authorId);
    if (!authorId) return;

    if (normalizedCurrentUserId !== "" && authorId === normalizedCurrentUserId) {
      router.push("/profile");
      return;
    }

    router.push(`/profile/${authorId}`);
  };

  const openStoryPicker = () => {
    if (isCreatingStory) return;
    storyInputRef.current?.click();
  };

  const handleStoryFileChange = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isImage = file.type.startsWith("image/");
    const isVideo = file.type.startsWith("video/");

    if (!isImage && !isVideo) {
      toast.error("Story chỉ hỗ trợ ảnh hoặc video");
      e.target.value = "";
      return;
    }

    if (file.size > MAX_STORY_FILE_SIZE) {
      toast.error("File story vượt quá 20MB");
      e.target.value = "";
      return;
    }

    let videoDuration: number | undefined;
    if (isVideo) {
      videoDuration = await getVideoDuration(file);
      if (videoDuration > MAX_STORY_VIDEO_DURATION) {
        toast.error("Video story không được vượt quá 10 giây");
        e.target.value = "";
        return;
      }
    }

    setPendingStoryFile(file);
    setPendingStoryVideoDuration(videoDuration);
    setShowStoryPrivacyDialog(true);
    e.target.value = "";
  };

  const confirmCreateStory = () => {
    if (!pendingStoryFile) return;

    createStory(
      {
        mediaFile: pendingStoryFile,
        privacy: storyPrivacy,
        videoDuration: pendingStoryVideoDuration,
      },
      {
        onSettled: () => {
          setPendingStoryFile(null);
          setShowStoryPrivacyDialog(false);
          setStoryPrivacy("friends");
        },
      },
    );
  };

  const handleOpenStoryGroup = (groupIndex: number) => {
    setStoryViewerGroupIndex(groupIndex);
    setIsStoryViewerOpen(true);
  };

  const handleDeleteStory = (storyId: string) => {
    deleteStory(storyId);
  };

  const handleLike = (postId: string, isLiked: boolean) => {
    likePost(
      { postId, isLiked },
      {
        onSuccess: (response: { aiSuggestion?: AiSuggestion }) => {
          if (response.aiSuggestion) {
            setAiSuggestions((prev) => ({
              ...prev,
              [postId]: response.aiSuggestion!,
            }));
          }
        },
      },
    );
  };

  const handleAddComment = (postId: string) => {
    const content = commentInputs[postId]?.trim();
    if (!content) return;

    addComment(
      {
        postId,
        content,
      },
      {
        onSuccess: () => {
          setCommentInputs((prev) => ({ ...prev, [postId]: "" }));
        },
      },
    );
  };

  const sendAiPopupMessage = async (postId: string, content: string) => {
    const text = content.trim();
    if (!text) return;
    aiPendingMessageCounterRef.current += 1;
    const pendingMessageId = `pending-${postId}-${aiPendingMessageCounterRef.current}`;

    setAiPopupMessages((prev) => [
      ...prev,
      {
        id: pendingMessageId,
        role: "user",
        content: text,
        status: "pending",
      },
    ]);
    setAiPopupInput("");

    try {
      const result = await askAiFromPost({
        postId,
        content: text,
        conversationId: aiPopupConversationId,
      });

      const conversationId = result.conversation?.id || result.conversationId;
      if (conversationId) {
        setAiPopupConversationId(conversationId);
      }

      const userContent = result.userMessage?.content?.trim() || text;
      const aiContent =
        result.aiMessage?.content?.trim() || result.reply?.trim();

      setAiPopupMessages((prev) => {
        const hasPendingMessage = prev.some(
          (message) => message.id === pendingMessageId,
        );

        const next = prev.map((message) =>
          message.id === pendingMessageId
            ? {
                ...message,
                content: userContent || message.content,
                status: "sent" as const,
              }
            : message,
        );

        if (!hasPendingMessage && userContent) {
          next.push({ role: "user", content: userContent, status: "sent" });
        }
        if (aiContent) {
          next.push({ role: "ai", content: aiContent, status: "sent" });
        }
        return next;
      });

      if (Array.isArray(result.options)) {
        setAiPopupOptions(result.options);
      }
    } catch {
      setAiPopupMessages((prev) =>
        prev.map((message) =>
          message.id === pendingMessageId
            ? { ...message, status: "failed" as const }
            : message,
        ),
      );
    }
  };

  const openAiPopupWithSuggestion = async (
    postId: string,
    ask?: AskAiPayload,
  ) => {
    const action = ask?.action || aiSuggestions[postId]?.action;
    if (action && action !== "ask_ai_in_chat") {
      toast.error("Hành động AI chưa được hỗ trợ");
      return;
    }

    const content = (
      ask?.content ||
      aiSuggestions[postId]?.suggestedUserPrompt ||
      ""
    ).trim();
    if (!content) {
      toast.error("Chưa có nội dung phản hồi AI hợp lệ");
      return;
    }

    setAiPopupOpen(true);
    setAiPopupPostId(postId);
    setAiPopupConversationId(undefined);
    setAiPopupMessages([]);
    setAiPopupOptions(ask?.options || aiSuggestions[postId]?.options || []);

    const shouldAutoSend =
      typeof ask?.autoSend === "boolean"
        ? ask.autoSend
        : aiSuggestions[postId]?.autoSend === true;

    if (shouldAutoSend) {
      await sendAiPopupMessage(postId, content);
      return;
    }

    setAiPopupInput(content);
  };

  // Infinite scroll logic
  useEffect(() => {
    const handleScroll = (e: Event) => {
      const target = e.target as HTMLDivElement;
      if (!target) return;

      const { scrollTop, scrollHeight, clientHeight } = target;
      const threshold = 300; // Load more when 300px from bottom

      if (
        scrollHeight - scrollTop - clientHeight < threshold &&
        hasNextPage &&
        !isFetchingNextPage
      ) {
        fetchNextPage();
      }
    };

    const scrollArea = document.querySelector(
      "[data-radix-scroll-area-viewport]",
    );
    if (scrollArea) {
      scrollArea.addEventListener("scroll", handleScroll);
      return () => scrollArea.removeEventListener("scroll", handleScroll);
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const allPosts = Array.from(
    new Map(
      (data?.pages.flatMap((page) => page.posts) || []).map((p) => [p.id, p]),
    ).values(),
  );
  const normalizedCurrentUserId = normalizeId(currentUserId);
  const selectedCustomAudience = contacts.filter((contact) =>
    customAudienceIds.includes(normalizeId(contact._id || contact.id)),
  );
  const isPostActionPending = isUpdatingPostPrivacy || isDeletingPost;

  useEffect(() => {
    setPopupPostId(targetPostId);
  }, [targetPostId]);

  const popupPost = popupPostId
    ? allPosts.find((post) => post.id === popupPostId)
    : null;

  useEffect(() => {
    if (!popupPost) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [popupPost]);

  return (
    <div className="relative flex flex-col w-full h-full max-w-full overflow-x-hidden bg-slate-50/50">
      <ScrollArea className="flex-1 w-full min-w-0">
        <div className="w-full max-w-3xl min-w-0 px-0 py-0 pb-8 mx-auto space-y-4 overflow-x-hidden md:max-w-3xl md:py-6 md:px-6 lg:max-w-4xl">
          {/* Create Post */}
          <div className="p-4 space-y-4 bg-white border-0 rounded-none shadow-sm md:p-6 md:rounded-2xl md:border border-slate-100">
            <div className="flex items-start min-w-0 gap-3 md:gap-4">
              <PresignedAvatar
                avatarKey={user?.avatar}
                displayName={user?.displayName}
                className="w-10 h-10 md:h-12 md:w-12 shrink-0"
                fallbackClassName="text-sm md:text-base"
              />
              <div className="flex-1 min-w-0 space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-slate-900">
                    {user?.displayName || "Bạn"}
                  </p>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        type="button"
                        disabled={isCreatingPost}
                        className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100 disabled:opacity-60"
                      >
                        {getPostPrivacyIcon(postPrivacy, "h-3.5 w-3.5")}
                        <span>{getPostPrivacyLabel(postPrivacy)}</span>
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                      align="end"
                      className="w-72 rounded-xl border-slate-200 bg-white p-2"
                    >
                      <DropdownMenuLabel className="text-xs uppercase text-slate-500">
                        Quyền riêng tư bài viết
                      </DropdownMenuLabel>
                      {POST_PRIVACY_OPTIONS.map((option) => (
                        <DropdownMenuItem
                          key={option.value}
                          className="flex items-start gap-2 rounded-lg py-2"
                          onClick={() => setPostPrivacy(option.value)}
                        >
                          <span className="mt-0.5 text-slate-500">
                            {getPostPrivacyIcon(option.value, "h-4 w-4")}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block text-sm font-medium text-slate-800">
                              {option.label}
                            </span>
                            <span className="block text-xs text-slate-500">
                              {option.description}
                            </span>
                          </span>
                          {postPrivacy === option.value ? (
                            <Check className="h-4 w-4 text-blue-600" />
                          ) : null}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <Textarea
                  placeholder="Bạn đang nghĩ gì thế?"
                  value={postContent}
                  onChange={(e) => setPostContent(e.target.value)}
                  disabled={isCreatingPost}
                  className="flex-1 min-w-0 border-none bg-slate-50 rounded-xl resize-none focus-visible:ring-0 min-h-[80px] md:min-h-[100px] text-sm md:text-base p-3"
                />
              </div>
            </div>

            {postPrivacy === "custom" && (
              <div className="space-y-2 rounded-xl border border-slate-100 bg-slate-50/60 p-3">
                <p className="text-xs font-semibold uppercase text-slate-500">
                  Chọn bạn bè được xem
                </p>
                {contacts.length === 0 ? (
                  <p className="text-sm text-slate-500">
                    Bạn chưa có bạn bè để chọn quyền Tùy chọn.
                  </p>
                ) : (
                  <>
                    <div className="max-h-40 space-y-1 overflow-y-auto pr-1">
                      {contacts.map((friend) => {
                        const friendId = normalizeId(friend._id || friend.id);
                        if (!friendId) return null;
                        const checked = customAudienceIds.includes(friendId);
                        return (
                          <button
                            key={friendId}
                            type="button"
                            onClick={() => toggleCustomAudience(friendId)}
                            className={`flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-left transition-colors ${
                              checked ? "bg-blue-50 text-blue-700" : "hover:bg-slate-100"
                            }`}
                          >
                            <span className="flex items-center gap-2 min-w-0">
                              <PresignedAvatar
                                avatarKey={friend.avatar}
                                displayName={friend.displayName}
                                className="h-7 w-7"
                              />
                              <span className="truncate text-sm">
                                {friend.displayName}
                              </span>
                            </span>
                            <span
                              className={`h-4 w-4 rounded border ${
                                checked
                                  ? "border-blue-600 bg-blue-600"
                                  : "border-slate-300 bg-white"
                              }`}
                            >
                              {checked ? (
                                <Check className="h-3.5 w-3.5 text-white" />
                              ) : null}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                    {selectedCustomAudience.length > 0 ? (
                      <p className="text-xs text-slate-500">
                        Đã chọn:{" "}
                        {selectedCustomAudience
                          .map((friend) => friend.displayName)
                          .join(", ")}
                      </p>
                    ) : (
                      <p className="text-xs text-red-500">
                        Hãy chọn ít nhất 1 người xem.
                      </p>
                    )}
                  </>
                )}
              </div>
            )}
            {/* Media Previews */}
            {mediaPreviews.length > 0 && (
              <div className="grid grid-cols-3 gap-2">
                {mediaPreviews.map((preview, idx) => (
                  <div
                    key={idx}
                    className="relative overflow-hidden rounded-xl aspect-square bg-slate-100 group"
                  >
                    {preview.type === "image" ? (
                      <img
                        src={preview.url}
                        alt={preview.name}
                        className="object-cover w-full h-full"
                      />
                    ) : (
                      <div className="relative w-full h-full">
                        <video
                          src={preview.url}
                          className="object-cover w-full h-full"
                        />
                        <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                          <Play className="w-8 h-8 text-white fill-white" />
                        </div>
                      </div>
                    )}
                    <button
                      onClick={() => removeMedia(idx)}
                      className="absolute flex items-center justify-center w-6 h-6 transition-colors rounded-full top-1 right-1 bg-black/60 hover:bg-black/80"
                    >
                      <X className="w-3.5 h-3.5 text-white" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="flex items-center justify-between pt-2 border-t border-slate-50">
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-2 px-2 text-slate-500 h-9 md:h-10 md:px-4"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isCreatingPost || mediaFiles.length >= MAX_FILES}
                >
                  <ImageIcon className="w-4 h-4 text-green-500 md:w-5 md:h-5" />
                  <span className="text-xs md:text-sm">
                    Ảnh/Video
                    {mediaFiles.length > 0 && (
                      <span className="ml-1 font-semibold text-blue-500">
                        ({mediaFiles.length})
                      </span>
                    )}
                  </span>
                </Button>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/jpeg,image/png,image/gif,image/webp,video/mp4,video/mpeg,video/quicktime,video/avi"
                className="hidden"
                onChange={handleFileSelect}
              />
              <Button
                onClick={handleCreatePost}
                disabled={
                  (!postContent.trim() && mediaFiles.length === 0) ||
                  isCreatingPost ||
                  (postPrivacy === "custom" && customAudienceIds.length === 0)
                }
                className="px-4 text-xs font-semibold text-white bg-blue-600 rounded-full hover:bg-blue-700 md:px-8 h-9 md:h-10 md:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isCreatingPost ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Đang đăng...
                  </>
                ) : (
                  "Đăng bài"
                )}
              </Button>
            </div>
          </div>

          {/* Stories */}
          <div className="min-w-0 p-2 bg-white border shadow-sm rounded-2xl border-slate-100 md:p-4">
            <div className="flex w-full min-w-0 gap-2 pb-2 overflow-x-auto scrollbar-hide">
              {/* Create Story */}
              <button
                type="button"
                onClick={openStoryPicker}
                className="relative flex-shrink-0 w-[110px] h-[190px] md:w-[120px] md:h-[200px] rounded-xl overflow-hidden group bg-gradient-to-b from-slate-100 to-slate-200 hover:scale-[1.02] transition-transform"
              >
                <div className="absolute inset-0 flex flex-col items-center justify-end pb-4">
                  <div className="flex items-center justify-center w-10 h-10 mb-2 bg-white rounded-full shadow-lg dark:bg-slate-800">
                    <div className="flex items-center justify-center w-8 h-8 transition-colors bg-blue-600 rounded-full group-hover:bg-blue-700">
                      {isCreatingStory ? (
                        <Loader2 className="w-4 h-4 text-white animate-spin" />
                      ) : (
                        <Plus className="w-5 h-5 text-white" />
                      )}
                    </div>
                  </div>
                  <span className="text-xs font-semibold text-slate-900">
                    Tạo tin
                  </span>
                </div>
              </button>
              <input
                ref={storyInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,video/mp4,video/quicktime"
                className="hidden"
                onChange={handleStoryFileChange}
              />

              {storyGroups.map((group, groupIndex) => {
                const cover =
                  group.stories[group.stories.length - 1]?.media?.url;
                return (
                  <button
                    key={`${group.user?._id || group.user?.id}-${groupIndex}`}
                    type="button"
                    onClick={() => handleOpenStoryGroup(groupIndex)}
                    className="relative flex-shrink-0 w-[110px] h-[190px] md:w-[120px] md:h-[200px] rounded-xl overflow-hidden group hover:scale-[1.02] transition-transform"
                  >
                    {/* Background Image */}
                    {cover ? (
                      <div
                        className="absolute inset-0 bg-center bg-cover"
                        style={{ backgroundImage: `url(${cover})` }}
                      >
                        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/60" />
                      </div>
                    ) : (
                      <div className="absolute inset-0 bg-slate-300" />
                    )}

                    {/* Avatar with blue ring at top-left */}
                    <div className="absolute top-3 left-3">
                      <div
                        className={`p-0.5 rounded-full ${group.hasUnviewed ? "bg-blue-500" : "bg-slate-300"}`}
                      >
                        <PresignedAvatar
                          avatarKey={group.user?.avatar}
                          displayName={group.user?.displayName}
                          className="border-2 border-white w-9 h-9"
                        />
                      </div>
                    </div>

                    {/* Name at bottom */}
                    <div className="absolute bottom-0 left-0 right-0 p-3">
                      <span className="text-xs font-semibold text-white drop-shadow-lg line-clamp-2">
                        {group.user?.displayName}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <StoryViewer
            open={isStoryViewerOpen}
            groups={storyGroups}
            initialGroupIndex={storyViewerGroupIndex}
            currentUserId={currentUserId}
            onMarkViewed={(storyId) => markStoryViewed(storyId)}
            onDeleteStory={handleDeleteStory}
            onClose={() => setIsStoryViewerOpen(false)}
          />

          {/* Feed */}
          {isLoading ? (
            <>
              <BlogSkeleton key="skeleton-1" />
              <BlogSkeleton key="skeleton-2" />
              <BlogSkeleton key="skeleton-3" />
            </>
          ) : error ? (
            <div className="py-12 text-center text-slate-500">
              Không thể tải bài viết
            </div>
          ) : allPosts.length > 0 ? (
            <>
              {allPosts.map((post) => (
                <ProfilePostCard
                  key={post.id}
                  post={post}
                  canManage={
                    normalizedCurrentUserId !== "" &&
                    normalizeId(post.author?._id || post.author?.id || post.authorId) ===
                      normalizedCurrentUserId
                  }
                  onOpenAuthorProfile={() => handleOpenAuthorProfile(post)}
                  isExpanded={expandedPostId === post.id}
                  onToggleExpand={() =>
                    setExpandedPostId(
                      expandedPostId === post.id ? null : post.id,
                    )
                  }
                  onLike={() =>
                    handleLike(post.id, post.isLikedByCurrentUser || false)
                  }
                  currentUserAvatar={user?.avatar}
                  currentUserDisplayName={user?.displayName}
                  commentInput={commentInputs[post.id] || ""}
                  onCommentInputChange={(value) =>
                    setCommentInputs({ ...commentInputs, [post.id]: value })
                  }
                  onAddComment={() => handleAddComment(post.id)}
                  onUpdatePrivacy={(privacy, audienceIds) =>
                    handleUpdatePostPrivacy(post.id, privacy, audienceIds)
                  }
                  onDelete={() => handleDeletePost(post.id)}
                  isMutatingPost={isPostActionPending}
                  fallbackSuggestion={aiSuggestions[post.id]}
                  onAskAi={(askPayload) =>
                    openAiPopupWithSuggestion(post.id, askPayload)
                  }
                  isAskingAi={isAskingAi}
                  isAddingComment={isAddingComment}
                />
              ))}

              {/* Load More Indicator */}
              {isFetchingNextPage && (
                <div className="flex justify-center py-4">
                  <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
                </div>
              )}

              {!hasNextPage && allPosts.length > 0 && (
                <div className="py-4 text-sm text-center text-slate-400">
                  Bạn đã xem hết bài viết
                </div>
              )}
            </>
          ) : (
            <div className="py-12 text-center text-slate-500">
              Chưa có bài viết nào. Hãy đăng bài đầu tiên!
            </div>
          )}
        </div>
      </ScrollArea>

      {popupPost ? (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center p-3 bg-black/70 backdrop-blur-sm md:p-6"
          onClick={() => router.replace("/blog")}
        >
          <div
            className="relative w-full max-w-3xl max-h-[92vh] overflow-hidden bg-white rounded-2xl shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => router.replace("/blog")}
              className="absolute z-10 flex items-center justify-center w-10 h-10 text-white rounded-full top-3 right-3 bg-black/40 hover:bg-black/60"
              aria-label="Đóng bài viết"
            >
              <X className="w-6 h-6" />
            </button>

            <div className="px-5 py-4 border-b border-slate-100">
              <p className="text-lg font-bold text-center text-slate-900">
                Bài viết
              </p>
              <p className="mt-1 text-xs text-center text-slate-500">
                Xem bài viết đã được mở từ thông báo
              </p>
            </div>

            <div className="max-h-[calc(92vh-72px)] overflow-y-auto bg-slate-50/60">
              <ProfilePostCard
                post={popupPost}
                canManage={
                  normalizedCurrentUserId !== "" &&
                  normalizeId(
                    popupPost.author?._id || popupPost.author?.id || popupPost.authorId,
                  ) === normalizedCurrentUserId
                }
                onOpenAuthorProfile={() => handleOpenAuthorProfile(popupPost)}
                isExpanded={true}
                onToggleExpand={() => undefined}
                onLike={() =>
                  handleLike(
                    popupPost.id,
                    popupPost.isLikedByCurrentUser || false,
                  )
                }
                currentUserAvatar={user?.avatar}
                currentUserDisplayName={user?.displayName}
                commentInput={commentInputs[popupPost.id] || ""}
                onCommentInputChange={(value) =>
                  setCommentInputs({ ...commentInputs, [popupPost.id]: value })
                }
                onAddComment={() => handleAddComment(popupPost.id)}
                onUpdatePrivacy={(privacy, audienceIds) =>
                  handleUpdatePostPrivacy(popupPost.id, privacy, audienceIds)
                }
                onDelete={() => handleDeletePost(popupPost.id)}
                isMutatingPost={isPostActionPending}
                fallbackSuggestion={aiSuggestions[popupPost.id]}
                onAskAi={(askPayload) =>
                  openAiPopupWithSuggestion(popupPost.id, askPayload)
                }
                isAskingAi={isAskingAi}
                isAddingComment={isAddingComment}
              />
            </div>
          </div>
        </div>
      ) : null}

      <AiPostChatPopup
        open={aiPopupOpen}
        onOpenChange={setAiPopupOpen}
        title="Phản hồi"
        messages={aiPopupMessages}
        inputValue={aiPopupInput}
        onInputChange={setAiPopupInput}
        onSend={() => {
          if (!aiPopupPostId) return;
          void sendAiPopupMessage(aiPopupPostId, aiPopupInput);
        }}
        isSending={isAskingAi}
        options={aiPopupOptions}
        onPickOption={(option) => {
          if (!aiPopupPostId) return;
          void sendAiPopupMessage(aiPopupPostId, option);
        }}
      />

      <StoryPrivacyDialog
        open={showStoryPrivacyDialog}
        onOpenChange={(val) => {
          setShowStoryPrivacyDialog(val);
          if (!val) {
            setPendingStoryFile(null);
            setStoryPrivacy("friends");
          }
        }}
        file={pendingStoryFile}
        privacy={storyPrivacy}
        onPrivacyChange={setStoryPrivacy}
        onConfirm={confirmCreateStory}
        isCreating={isCreatingStory}
      />
    </div>
  );
}

interface ProfilePostCardProps {
  post: Post;
  canManage: boolean;
  onOpenAuthorProfile: () => void;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onLike: () => void;
  currentUserAvatar?: string | null;
  currentUserDisplayName?: string;
  commentInput: string;
  onCommentInputChange: (val: string) => void;
  onAddComment: () => void;
  onUpdatePrivacy: (privacy: PostPrivacy, audienceIds?: string[]) => void;
  onDelete: () => void;
  isMutatingPost: boolean;
  fallbackSuggestion?: AiSuggestion;
  onAskAi: (payload?: AskAiPayload) => void;
  isAskingAi: boolean;
  isAddingComment: boolean;
}

function PostMediaGrid({
  media,
  onMediaClick,
}: {
  media: PostMedia[];
  onMediaClick?: (index: number) => void;
}) {
  if (!media || media.length === 0) return null;
  const count = media.length;

  const getMediaKind = (item: PostMedia): "image" | "video" => {
    const mediaType = String(item.type || "")
      .trim()
      .toLowerCase();
    const mediaUrl = String(item.url || "").toLowerCase();

    const isVideoByType =
      mediaType === "video" || mediaType.startsWith("video/");
    const isVideoByExt = /\.(mp4|mov|avi|mkv|webm|m4v)(\?|#|$)/i.test(mediaUrl);

    if (isVideoByType || isVideoByExt) return "video";
    return "image";
  };

  const mediaEl = (item: PostMedia, index: number, cls = "") => {
    if (getMediaKind(item) === "video") {
      return (
        <button
          key={item.url}
          type="button"
          onClick={() => onMediaClick?.(index)}
          className={`relative w-full h-full ${cls}`}
          aria-label="Xem video"
        >
          <video
            src={item.url}
            muted
            playsInline
            preload="metadata"
            className="w-full h-full object-cover pointer-events-none"
          />
          <span className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-black/45 text-white text-sm">
              ▶
            </span>
          </span>
        </button>
      );
    }
    return (
      <img
        key={item.url}
        src={item.url}
        alt=""
        onClick={() => onMediaClick?.(index)}
        className={`w-full h-full object-cover ${cls}`}
      />
    );
  };

  if (count === 1) {
    return (
      <div className="h-[500px] overflow-hidden cursor-zoom-in">
        {mediaEl(media[0], 0)}
      </div>
    );
  }

  if (count === 2) {
    return (
      <div className="h-[500px] grid grid-cols-2 gap-0.5 overflow-hidden">
        {media.map((m, idx) => (
          <div key={m.url} className="overflow-hidden cursor-zoom-in">
            {mediaEl(m, idx)}
          </div>
        ))}
      </div>
    );
  }

  if (count === 3) {
    return (
      <div className="h-[500px] grid grid-cols-2 grid-rows-2 gap-0.5 overflow-hidden">
        <div className="col-span-2 overflow-hidden cursor-zoom-in">
          {mediaEl(media[0], 0)}
        </div>
        <div className="overflow-hidden cursor-zoom-in">
          {mediaEl(media[1], 1)}
        </div>
        <div className="overflow-hidden cursor-zoom-in">
          {mediaEl(media[2], 2)}
        </div>
      </div>
    );
  }

  if (count === 4) {
    return (
      <div className="h-[500px] grid grid-cols-2 gap-0.5 overflow-hidden">
        {media.map((m, idx) => (
          <div key={m.url} className="overflow-hidden cursor-zoom-in">
            {mediaEl(m, idx)}
          </div>
        ))}
      </div>
    );
  }

  const remaining = count > 5 ? count - 5 : 0;
  return (
    <div className="h-[500px] flex flex-col gap-0.5 overflow-hidden">
      <div className="grid grid-cols-2 gap-0.5 flex-[3] min-h-0">
        {media.slice(0, 2).map((m, idx) => (
          <div key={m.url} className="overflow-hidden cursor-zoom-in">
            {mediaEl(m, idx)}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-0.5 flex-[2] min-h-0">
        {media.slice(2, 5).map((m, i) => (
          <div key={m.url} className="relative overflow-hidden cursor-zoom-in">
            {mediaEl(m, i + 2)}
            {i === 2 && remaining > 0 && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/60">
                <span className="text-2xl font-bold text-white">
                  +{remaining}
                </span>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function ProfilePostCard({
  post,
  canManage,
  onOpenAuthorProfile,
  isExpanded,
  onToggleExpand,
  onLike,
  currentUserAvatar,
  currentUserDisplayName,
  commentInput,
  onCommentInputChange,
  onAddComment,
  onUpdatePrivacy,
  onDelete,
  isMutatingPost,
  fallbackSuggestion,
  onAskAi,
  isAskingAi,
  isAddingComment,
}: ProfilePostCardProps) {
  const { data: commentsData } = useComments(isExpanded ? post.id : "");
  const comments = commentsData?.comments || [];
  const aiSuggestion = commentsData?.aiSuggestion || fallbackSuggestion;
  const canAskAiInChat =
    !aiSuggestion?.action || aiSuggestion.action === "ask_ai_in_chat";
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const likesCount = post.likesCount ?? 0;
  const commentsCount = post.commentsCount ?? 0;
  const hasStats = likesCount > 0 || commentsCount > 0;
  const privacyMenuOptions = POST_PRIVACY_OPTIONS.filter(
    (option) =>
      option.value !== "custom" || (post.customAudienceIds || []).length > 0,
  );

  return (
    <div className="w-full min-w-0 overflow-hidden bg-white border-0 rounded-none shadow-sm md:rounded-2xl md:border border-slate-100">
      <div className="flex items-center justify-between px-4 pt-4 pb-2">
        <button
          type="button"
          onClick={onOpenAuthorProfile}
          className="flex items-center flex-1 min-w-0 gap-3 text-left transition-opacity hover:opacity-90"
        >
          <PresignedAvatar
            avatarKey={post.author?.avatar}
            displayName={post.author?.displayName}
            className="w-10 h-10"
          />
          <div className="min-w-0">
            <p className="text-sm font-semibold leading-tight truncate text-slate-900">
              {post.author?.displayName || "User"}
            </p>
            <p className="flex items-center gap-1 text-[11px] text-slate-400">
              {new Date(post.createdAt).toLocaleDateString("vi-VN", {
                day: "2-digit",
                month: "2-digit",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
              <span>•</span>
              <span className="inline-flex items-center gap-1 text-slate-500">
                {getPostPrivacyIcon(post.privacy, "h-3 w-3")}
                {getPostPrivacyLabel(post.privacy)}
              </span>
            </p>
          </div>
        </button>
        {canManage ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="p-2 transition-colors rounded-full hover:bg-slate-100">
                <MoreHorizontal className="w-5 h-5 text-slate-500" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="w-64 rounded-xl border-slate-200 bg-white p-2"
            >
              <DropdownMenuLabel className="text-xs uppercase text-slate-500">
                Quyền riêng tư
              </DropdownMenuLabel>
              {privacyMenuOptions.map((option) => {
                const isCurrent = post.privacy === option.value;
                return (
                  <DropdownMenuItem
                    key={option.value}
                    className="flex items-start gap-2 rounded-lg py-2"
                    disabled={isCurrent || isMutatingPost}
                    onClick={() =>
                      onUpdatePrivacy(
                        option.value,
                        option.value === "custom"
                          ? post.customAudienceIds
                          : undefined,
                      )
                    }
                  >
                    <span className="mt-0.5 text-slate-500">
                      {getPostPrivacyIcon(option.value, "h-4 w-4")}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-medium text-slate-800">
                        {option.label}
                      </span>
                      <span className="block text-xs text-slate-500">
                        {option.description}
                      </span>
                    </span>
                    {isCurrent ? <Check className="h-4 w-4 text-blue-600" /> : null}
                  </DropdownMenuItem>
                );
              })}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="rounded-lg text-red-600 focus:bg-red-50 focus:text-red-600"
                disabled={isMutatingPost}
                onClick={onDelete}
              >
                <Trash2 className="h-4 w-4" />
                Xóa bài viết
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <button className="p-2 rounded-full">
            <MoreHorizontal className="w-5 h-5 text-slate-300" />
          </button>
        )}
      </div>

      {post.content && (
        <p className="px-4 pb-3 text-sm leading-relaxed break-words whitespace-pre-wrap text-slate-800">
          {post.content}
        </p>
      )}

      {post.media && post.media.length > 0 && (
        <div className="mx-0">
          <PostMediaGrid media={post.media} onMediaClick={setLightboxIndex} />
        </div>
      )}

      {post.media && lightboxIndex !== null && (
        <PostMediaLightbox
          open={lightboxIndex !== null}
          media={post.media}
          initialIndex={lightboxIndex}
          author={{
            displayName: post.author?.displayName,
            avatar: post.author?.avatar,
          }}
          content={post.content}
          createdAt={post.createdAt}
          likesCount={post.likesCount}
          commentsCount={post.commentsCount}
          onClose={() => setLightboxIndex(null)}
        />
      )}

      {hasStats && (
        <div className="flex items-center justify-between min-w-0 px-4 pt-3 pb-1">
          {likesCount > 0 ? (
            <span className="text-sm text-slate-500 flex items-center gap-1.5">
              <Heart className="w-4 h-4 text-red-400 fill-red-400" />
              {likesCount}
            </span>
          ) : (
            <span />
          )}
          {commentsCount > 0 ? (
            <span
              className="text-sm cursor-pointer text-slate-500 hover:underline"
              onClick={onToggleExpand}
            >
              {commentsCount} bình luận
            </span>
          ) : null}
        </div>
      )}

      <div className="flex mx-0 mt-1 border-t border-slate-100">
        <button
          onClick={onLike}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-semibold rounded-none hover:bg-slate-50 transition-colors ${
            post.isLikedByCurrentUser ? "text-red-500" : "text-slate-500"
          }`}
        >
          <Heart
            className={`w-4 h-4 ${post.isLikedByCurrentUser ? "fill-red-500" : ""}`}
          />
          Thích
        </button>
        <button
          onClick={onToggleExpand}
          className="flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-semibold text-slate-500 hover:bg-slate-50 transition-colors rounded-none"
        >
          <MessageCircle className="w-4 h-4" />
          Bình luận
        </button>
        <button className="flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-semibold text-slate-500 hover:bg-slate-50 transition-colors rounded-none">
          <Share2 className="w-4 h-4" />
          Chia sẻ
        </button>
      </div>

      {isExpanded && (
        <div className="min-w-0 px-4 pt-2 pb-4 space-y-3 border-t border-slate-100">
          {comments.map((c) => (
            <div key={c.id} className="flex items-start gap-2">
              <PresignedAvatar
                avatarKey={c.user?.avatar}
                displayName={c.user?.displayName}
                className="flex-shrink-0 w-8 h-8"
              />
              <div className="flex-1 min-w-0 px-3 py-2 rounded-2xl bg-slate-100">
                <p className="text-xs font-semibold text-slate-900">
                  {c.user?.displayName || "User"}
                </p>
                <p className="text-sm break-words text-slate-700">
                  {c.content}
                </p>
              </div>
            </div>
          ))}

          {aiSuggestion && (
            <div className="px-3 py-2 border border-blue-100 rounded-xl bg-blue-50">
              <p className="text-xs font-semibold text-blue-700">Gợi ý AI</p>
              <p className="mt-1 text-sm text-blue-900">{aiSuggestion.text}</p>
              {canAskAiInChat && aiSuggestion.options.length > 0 ? (
                <div className="flex flex-wrap gap-2 mt-2">
                  {aiSuggestion.options.map((option) => (
                    <button
                      key={option}
                      type="button"
                      onClick={() =>
                        onAskAi({
                          content: option,
                          autoSend: true,
                          action: aiSuggestion.action,
                          options: aiSuggestion.options,
                        })
                      }
                      disabled={isAskingAi}
                      className="rounded-full border border-blue-200 bg-white px-2.5 py-1 text-xs font-semibold text-blue-700 hover:bg-blue-100 disabled:opacity-60"
                    >
                      {option}
                    </button>
                  ))}
                </div>
              ) : canAskAiInChat ? (
                <button
                  type="button"
                  onClick={() =>
                    onAskAi({
                      content: aiSuggestion.suggestedUserPrompt,
                      autoSend: aiSuggestion.autoSend,
                      action: aiSuggestion.action,
                      options: aiSuggestion.options,
                    })
                  }
                  disabled={isAskingAi}
                  className="mt-2 text-xs font-semibold text-blue-600 hover:text-blue-700 disabled:opacity-60"
                >
                  {isAskingAi ? "Đang gửi AI chat..." : "Phản hồi ngay"}
                </button>
              ) : null}

              {!canAskAiInChat ? (
                <p className="mt-2 text-xs text-blue-600">
                  Hành động AI chưa được hỗ trợ ở phiên bản này.
                </p>
              ) : null}
            </div>
          )}

          <div className="flex items-center min-w-0 gap-2 pt-1">
            <PresignedAvatar
              avatarKey={currentUserAvatar}
              displayName={currentUserDisplayName}
              className="flex-shrink-0 w-8 h-8"
            />
            <div className="flex min-w-0 items-center flex-1 gap-2 px-4 py-1.5 rounded-full bg-slate-100">
              <Input
                value={commentInput}
                onChange={(e) => onCommentInputChange(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && onAddComment()}
                placeholder="Viết bình luận..."
                className="w-full min-w-0 p-0 text-sm bg-transparent border-0 focus-visible:ring-0 placeholder:text-slate-400"
              />
              <button
                onClick={onAddComment}
                disabled={isAddingComment || !commentInput.trim()}
                className="flex-shrink-0 text-blue-600 hover:text-blue-700 disabled:opacity-40"
              >
                {isAddingComment ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
