"use client";

import {
  type ComponentType,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { chatService, UpdateAiAdminConfigPayload } from "@/services/chat";
import { toast } from "sonner";
import {
  Bot,
  Loader2,
  RefreshCw,
  MessageSquare,
  MessageCircleReply,
  UserCheck,
  Rocket,
  WandSparkles,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { validateImageFile } from "@/lib/cloudinary";

const DAY_OPTIONS = [7, 14, 30, 90];

const formatter = new Intl.NumberFormat("vi-VN");

const formatCount = (value: number) => formatter.format(value || 0);

const isDirectAvatarValue = (value: string) =>
  value.startsWith("http://") ||
  value.startsWith("https://") ||
  value.startsWith("data:") ||
  value.startsWith("blob:") ||
  value.startsWith("/");

const getErrorMessage = (error: unknown, fallback: string): string => {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  const maybeError = error as
    | { response?: { data?: { message?: unknown } } }
    | undefined;

  if (typeof maybeError?.response?.data?.message === "string") {
    return maybeError.response.data.message;
  }

  return fallback;
};

export default function AdminAiPage() {
  const queryClient = useQueryClient();
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const [days, setDays] = useState<number>(7);
  const [pendingAvatarFile, setPendingAvatarFile] = useState<File | null>(null);
  const [form, setForm] = useState<{
    isEnabled: boolean;
    autoCommentEnabled: boolean;
    botName: string;
    botAvatar: string;
    botBio: string;
    conversationName: string;
  } | null>(null);

  const {
    data: config,
    isLoading: isLoadingConfig,
    isFetching: isFetchingConfig,
  } = useQuery({
    queryKey: ["admin", "ai", "config"],
    queryFn: chatService.getAiAdminConfig,
  });

  const {
    data: stats,
    isLoading: isLoadingStats,
    isFetching: isFetchingStats,
    refetch: refetchStats,
  } = useQuery({
    queryKey: ["admin", "ai", "stats", days],
    queryFn: () => chatService.getAiAdminStats(days),
  });

  const {
    data: avatarView,
    isFetching: isFetchingAvatar,
    refetch: refetchAvatar,
  } = useQuery({
    queryKey: ["admin", "ai", "avatar", config?.botAvatar || ""],
    queryFn: chatService.getAiAdminAvatar,
    enabled: !!config?.botAvatar && !isDirectAvatarValue(config.botAvatar),
  });

  const pendingAvatarPreview = useMemo(
    () => (pendingAvatarFile ? URL.createObjectURL(pendingAvatarFile) : ""),
    [pendingAvatarFile],
  );

  useEffect(() => {
    return () => {
      if (pendingAvatarPreview) {
        URL.revokeObjectURL(pendingAvatarPreview);
      }
    };
  }, [pendingAvatarPreview]);

  const currentForm = useMemo(
    () =>
      form || {
        isEnabled: config?.isEnabled ?? true,
        autoCommentEnabled: config?.autoCommentEnabled ?? true,
        botName: config?.botName || "ChatMeNow Assistant",
        botAvatar: config?.botAvatar || "",
        botBio: config?.botBio || "",
        conversationName: config?.conversationName || "Chat AI",
      },
    [form, config],
  );

  const { mutate: saveConfig, isPending: isSaving } = useMutation({
    mutationFn: (payload: UpdateAiAdminConfigPayload) =>
      chatService.updateAiAdminConfig(payload),
    onSuccess: (response) => {
      const nextConfig = response.config;
      queryClient.setQueryData(["admin", "ai", "config"], nextConfig);
      queryClient.invalidateQueries({ queryKey: ["admin", "ai", "config"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "ai", "stats"] });
      setPendingAvatarFile(null);
      setForm(null);
      if (nextConfig.botAvatar && !isDirectAvatarValue(nextConfig.botAvatar)) {
        void refetchAvatar();
      }
      queryClient.invalidateQueries({ queryKey: ["ai-conversation"] });
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
      queryClient.invalidateQueries({ queryKey: ["conversation"] });
      queryClient.invalidateQueries({ queryKey: ["messages"] });
      toast.success(response.message || "Đã cập nhật cấu hình AI chat");
    },
    onError: (error: unknown) => {
      toast.error(
        getErrorMessage(error, "Không thể cập nhật cấu hình AI chat"),
      );
    },
  });

  const hasChanges = useMemo(() => {
    if (!config) return false;

    return (
      currentForm.isEnabled !== config.isEnabled ||
      currentForm.autoCommentEnabled !== config.autoCommentEnabled ||
      currentForm.botName.trim() !== config.botName ||
      currentForm.botAvatar.trim() !== config.botAvatar ||
      currentForm.botBio.trim() !== config.botBio ||
      currentForm.conversationName.trim() !== config.conversationName ||
      !!pendingAvatarFile
    );
  }, [config, currentForm, pendingAvatarFile]);

  const handleSave = () => {
    if (!currentForm.botName.trim()) {
      toast.error("Tên AI không được để trống");
      return;
    }

    if (!currentForm.conversationName.trim()) {
      toast.error("Tên cuộc trò chuyện AI không được để trống");
      return;
    }

    saveConfig({
      isEnabled: currentForm.isEnabled,
      autoCommentEnabled: currentForm.autoCommentEnabled,
      botName: currentForm.botName.trim(),
      botAvatar: currentForm.botAvatar.trim(),
      botBio: currentForm.botBio.trim(),
      conversationName: currentForm.conversationName.trim(),
      imageFile: pendingAvatarFile || undefined,
    });
  };

  const handlePickAvatarFile = () => {
    avatarInputRef.current?.click();
  };

  const handleAvatarFileChange = (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    event.currentTarget.value = "";
    if (!file) return;

    try {
      validateImageFile(file);
      setPendingAvatarFile(file);
    } catch (error) {
      toast.error(getErrorMessage(error, "File avatar không hợp lệ"));
    }
  };

  const isDirectAvatarUrl =
    !!currentForm.botAvatar && isDirectAvatarValue(currentForm.botAvatar);

  const resolvedAvatarSrc = pendingAvatarPreview
    ? pendingAvatarPreview
    : isDirectAvatarUrl
      ? currentForm.botAvatar
      : avatarView?.viewUrl || "";

  return (
    <div className="p-6 space-y-6 md:p-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            Quản lý AI Chat
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Cập nhật thông tin bot AI, bật/tắt AI chat và theo dõi usage.
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <div className="p-4 bg-white border shadow-sm rounded-2xl border-slate-200 dark:border-slate-700 dark:bg-slate-800">
            {isLoadingConfig ? (
              <div className="flex items-center justify-center py-10 text-slate-500">
                <Loader2 className="w-5 h-5 animate-spin" />
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="flex items-center justify-between px-3 py-2 border rounded-xl border-slate-200 dark:border-slate-700">
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
                      Bật AI chat
                    </span>
                    <input
                      type="checkbox"
                      checked={currentForm.isEnabled}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...(prev || currentForm),
                          isEnabled: e.target.checked,
                        }))
                      }
                      className="w-4 h-4"
                    />
                  </label>

                  <label className="flex items-center justify-between px-3 py-2 border rounded-xl border-slate-200 dark:border-slate-700">
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
                      Bật auto comment
                    </span>
                    <input
                      type="checkbox"
                      checked={currentForm.autoCommentEnabled}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...(prev || currentForm),
                          autoCommentEnabled: e.target.checked,
                        }))
                      }
                      className="w-4 h-4"
                    />
                  </label>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-200">
                    Tên AI
                  </label>
                  <Input
                    value={currentForm.botName}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...(prev || currentForm),
                        botName: e.target.value,
                      }))
                    }
                    placeholder="ChatMeNow Assistant"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-200">
                    Tên cuộc trò chuyện AI
                  </label>
                  <Input
                    value={currentForm.conversationName}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...(prev || currentForm),
                        conversationName: e.target.value,
                      }))
                    }
                    placeholder="Chat AI"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-200">
                    Avatar URL
                  </label>
                  <Input
                    value={currentForm.botAvatar}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...(prev || currentForm),
                        botAvatar: e.target.value,
                      }))
                    }
                    placeholder="https://.../ai.png"
                  />
                  <div className="flex items-center gap-2">
                    <input
                      ref={avatarInputRef}
                      type="file"
                      accept="image/png,image/jpeg,image/webp,image/gif"
                      onChange={handleAvatarFileChange}
                      className="hidden"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handlePickAvatarFile}
                      className="gap-2"
                    >
                      Chọn ảnh từ máy
                    </Button>
                    {pendingAvatarFile && (
                      <span className="text-xs text-slate-500">
                        Ảnh mới sẽ được lưu khi bấm &quot;Lưu cấu hình&quot;
                      </span>
                    )}
                    {isFetchingAvatar && (
                      <span className="text-xs text-slate-500">
                        Đang lấy ảnh...
                      </span>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-200">
                    Mô tả bot
                  </label>
                  <Textarea
                    value={currentForm.botBio}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...(prev || currentForm),
                        botBio: e.target.value,
                      }))
                    }
                    placeholder="Trợ lý AI hỗ trợ người dùng."
                    rows={4}
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-1">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setForm(null);
                      setPendingAvatarFile(null);
                    }}
                    disabled={!hasChanges || isSaving}
                  >
                    Hoàn tác
                  </Button>
                  <Button
                    onClick={handleSave}
                    disabled={!hasChanges || isSaving}
                    className="gap-2"
                  >
                    {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
                    Lưu cấu hình
                  </Button>
                </div>
              </div>
            )}
          </div>

          {currentForm.botAvatar.trim() && (
            <div className="p-4 bg-white border shadow-sm rounded-2xl border-slate-200 dark:border-slate-700 dark:bg-slate-800">
              <p className="mb-3 text-sm font-semibold text-slate-700 dark:text-slate-200">
                Xem trước avatar bot
              </p>
              <div className="flex items-center gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={resolvedAvatarSrc || currentForm.botAvatar}
                  alt="AI avatar"
                  className="object-cover w-12 h-12 border rounded-full border-slate-200"
                />
                <div>
                  <p className="font-semibold text-slate-900 dark:text-white">
                    {currentForm.botName || "ChatMeNow Assistant"}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {currentForm.botBio || "Trợ lý AI hỗ trợ người dùng."}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="p-4 bg-white border shadow-sm rounded-2xl border-slate-200 dark:border-slate-700 dark:bg-slate-800">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                Thống kê usage
              </p>
              <select
                value={String(days)}
                onChange={(event) => setDays(Number(event.target.value) || 7)}
                className="px-2 py-1 text-sm bg-white border rounded-lg border-slate-200 dark:border-slate-600 dark:bg-slate-900"
              >
                {DAY_OPTIONS.map((dayOption) => (
                  <option key={dayOption} value={dayOption}>
                    {dayOption} ngày
                  </option>
                ))}
              </select>
            </div>

            {isLoadingStats ? (
              <div className="flex items-center justify-center py-8 text-slate-500">
                <Loader2 className="w-5 h-5 animate-spin" />
              </div>
            ) : (
              <div className="space-y-2 text-sm">
                <StatRow
                  icon={Bot}
                  label={`Hội thoại AI (${days} ngày)`}
                  value={stats?.period.totalConversations || 0}
                />
                <StatRow
                  icon={MessageSquare}
                  label={`Tin nhắn user (${days} ngày)`}
                  value={stats?.period.userMessages || 0}
                />
                <StatRow
                  icon={MessageCircleReply}
                  label={`Phản hồi AI (${days} ngày)`}
                  value={stats?.period.aiReplies || 0}
                />
                <StatRow
                  icon={UserCheck}
                  label={`User hoạt động (${days} ngày)`}
                  value={stats?.period.activeUsers || 0}
                />
                <StatRow
                  icon={Rocket}
                  label={`AI mở đầu comment (${days} ngày)`}
                  value={stats?.period.aiCommentOpeners || 0}
                />
                <StatRow
                  icon={WandSparkles}
                  label={`AI auto reply (${days} ngày)`}
                  value={stats?.period.aiAutoReplies || 0}
                />
              </div>
            )}
          </div>

          <div className="p-4 bg-white border shadow-sm rounded-2xl border-slate-200 dark:border-slate-700 dark:bg-slate-800">
            <p className="mb-3 text-sm font-semibold text-slate-800 dark:text-slate-100">
              Tổng cộng (all-time)
            </p>
            <div className="space-y-2 text-sm">
              <StatRow
                icon={Bot}
                label="Tổng hội thoại AI"
                value={stats?.total.totalConversations || 0}
              />
              <StatRow
                icon={MessageSquare}
                label="Tổng tin nhắn user"
                value={stats?.total.userMessages || 0}
              />
              <StatRow
                icon={MessageCircleReply}
                label="Tổng phản hồi AI"
                value={stats?.total.aiReplies || 0}
              />
              <StatRow
                icon={UserCheck}
                label="Tổng user hoạt động"
                value={stats?.total.activeUsers || 0}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatRow({
  icon: Icon,
  label,
  value,
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  value: number;
}) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-slate-100 px-2.5 py-2 dark:border-slate-700">
      <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
        <Icon className="w-4 h-4 text-blue-500" />
        <span>{label}</span>
      </div>
      <span className="font-semibold text-slate-900 dark:text-white">
        {formatCount(value)}
      </span>
    </div>
  );
}
