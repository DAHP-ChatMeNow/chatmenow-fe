"use client";

import { useState, useRef } from "react";
import {
  Camera,
  ShieldCheck,
  Bell,
  Languages,
  LogOut,
  ChevronRight,
  Loader,
  Trash2,
  Upload,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { PresignedAvatar } from "@/components/ui/presigned-avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import * as SwitchPrimitives from "@radix-ui/react-switch";
import { useAuthStore } from "@/store/use-auth-store";
import {
  useUpdateProfile,
  useUpdateAvatar,
  useDeleteAvatar,
} from "@/hooks/use-profile";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/contexts/language-context";

export default function ProfilePage() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const { language, setLanguage, t } = useLanguage();

  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showLanguageDialog, setShowLanguageDialog] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [displayName, setDisplayName] = useState(user?.displayName || "");
  const [bio, setBio] = useState(user?.bio || "");
  const [previewAvatar, setPreviewAvatar] = useState<string | null>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const { mutate: updateProfile, isPending: isUpdating } = useUpdateProfile();
  const { mutate: updateAvatar, isPending: isUploadingAvatar } =
    useUpdateAvatar();
  const { mutate: deleteAvatar, isPending: isDeletingAvatar } =
    useDeleteAvatar();

  const handleAvatarClick = () => {
    avatarInputRef.current?.click();
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Show preview
      const reader = new FileReader();
      reader.onload = (event) => {
        setPreviewAvatar(event.target?.result as string);
      };
      reader.readAsDataURL(file);

      // Upload to backend
      updateAvatar(file, {
        onSuccess: () => {
          // Clear preview after successful upload so S3 URL is used
          setTimeout(() => setPreviewAvatar(null), 1000);
        },
        onError: () => {
          // Clear preview on error too
          setPreviewAvatar(null);
        },
      });
    }
  };

  const handleDeleteAvatar = () => {
    setShowDeleteConfirm(true);
  };

  const confirmDeleteAvatar = () => {
    deleteAvatar(undefined, {
      onSettled: () => {
        setShowDeleteConfirm(false);
      },
    });
  };

  const handleSaveProfile = () => {
    updateProfile(
      {
        displayName,
        bio,
      },
      {
        onSuccess: () => {
          setShowEditDialog(false);
        },
      },
    );
  };

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  if (!user) {
    return null;
  }

  return (
    <div className="flex flex-col h-full bg-slate-50/50 dark:bg-slate-900 w-full">
      <ScrollArea className="flex-1 w-full">
        <div className="max-w-2xl mx-auto py-6 md:py-10 px-4 md:px-6 space-y-8">
          {/* Profile Card */}
          <div className="bg-white dark:bg-slate-800 p-6 md:p-10 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm flex flex-col items-center text-center">
            {/* Avatar with Camera Button */}
            <div className="relative">
              {previewAvatar ? (
                <Avatar className="h-32 w-32 md:h-40 md:w-40 border-4 border-white dark:border-slate-700 shadow-lg">
                  <AvatarImage src={previewAvatar} alt={user.displayName} />
                  <AvatarFallback className="text-3xl font-bold bg-gradient-to-br from-blue-500 to-purple-500 text-white">
                    {user.displayName?.charAt(0).toUpperCase() || "U"}
                  </AvatarFallback>
                </Avatar>
              ) : (
                <PresignedAvatar
                  avatarKey={user.avatar}
                  displayName={user.displayName}
                  className="h-32 w-32 md:h-40 md:w-40 border-4 border-white dark:border-slate-700 shadow-lg"
                  fallbackClassName="text-3xl font-bold"
                />
              )}

              {/* Camera Button - Facebook Style */}
              {isUploadingAvatar || isDeletingAvatar ? (
                <div className="absolute bottom-1 right-1 md:bottom-2 md:right-2 bg-blue-500 p-2.5 md:p-3 rounded-full shadow-lg">
                  <Loader className="text-white w-4 h-4 md:w-5 md:h-5 animate-spin" />
                </div>
              ) : (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      className="absolute bottom-1 right-1 md:bottom-2 md:right-2 bg-white dark:bg-slate-700 hover:bg-gray-100 dark:hover:bg-slate-600 p-2.5 md:p-3 rounded-full shadow-lg border-2 border-slate-200 dark:border-slate-600 transition-all hover:scale-105 active:scale-95"
                      aria-label="Chỉnh sửa ảnh đại diện"
                    >
                      <Camera className="text-slate-700 dark:text-slate-200 w-4 h-4 md:w-5 md:h-5" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    align="end"
                    className="w-56 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xl backdrop-blur-sm"
                  >
                    <DropdownMenuItem
                      onClick={handleAvatarClick}
                      className="cursor-pointer flex items-center gap-3 py-2.5 hover:bg-slate-100 dark:hover:bg-slate-700"
                    >
                      <Upload className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                      <span className="font-medium text-slate-900 dark:text-slate-100">
                        Tải ảnh lên
                      </span>
                    </DropdownMenuItem>

                    {user.avatar && !user.avatar.includes("ui-avatars.com") && (
                      <>
                        <DropdownMenuSeparator className="bg-slate-200 dark:bg-slate-700" />
                        <DropdownMenuItem
                          onClick={handleDeleteAvatar}
                          className="cursor-pointer flex items-center gap-3 py-2.5 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/50 focus:text-red-600 dark:focus:text-red-400 focus:bg-red-50 dark:focus:bg-red-950/50"
                        >
                          <Trash2 className="w-4 h-4" />
                          <span className="font-medium">Xóa ảnh</span>
                        </DropdownMenuItem>
                      </>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}

              <input
                ref={avatarInputRef}
                type="file"
                accept="image/*"
                onChange={handleAvatarChange}
                className="hidden"
                disabled={isUploadingAvatar || isDeletingAvatar}
              />
            </div>

            {/* User Info */}
            <h2 className="mt-4 md:mt-6 text-xl md:text-2xl font-bold text-slate-900 dark:text-white">
              {user.displayName || "User"}
            </h2>
            {user.bio && (
              <p className="text-slate-500 text-sm mt-2 max-w-md">{user.bio}</p>
            )}
            <p className="text-slate-400 text-xs mt-2">
              @{user.id?.slice(0, 8)}
            </p>

            {/* Edit Button */}
            <Button
              onClick={() => setShowEditDialog(true)}
              className="mt-6 px-8 py-2.5 bg-slate-900 dark:bg-blue-600 text-white rounded-full text-sm font-semibold hover:bg-slate-800 dark:hover:bg-blue-700 transition-all active:scale-95 shadow-md"
            >
              {t.editProfile}
            </Button>
          </div>

          {/* App Settings */}
          <div className="space-y-4">
            <h3 className="px-2 text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
              {t.settings}
            </h3>

            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden">
              <SettingItem
                icon={Bell}
                label={t.notifications_setting}
                description={
                  language === "vi"
                    ? "Âm thanh, tin nhắn đẩy"
                    : "Sound, push messages"
                }
              />
              <SettingItem
                icon={ShieldCheck}
                label={t.privacy}
                description={
                  language === "vi"
                    ? "Mật khẩu, khóa ứng dụng"
                    : "Password, app lock"
                }
              />

              <div
                onClick={() => setShowLanguageDialog(true)}
                className="flex items-center justify-between p-4 md:p-5 hover:bg-slate-50 dark:hover:bg-slate-700/50 cursor-pointer transition-all border-b border-slate-50 dark:border-slate-700 last:border-0 group"
              >
                <div className="flex items-center gap-4">
                  <div className="p-2 bg-slate-100 dark:bg-slate-700 rounded-xl text-slate-600 dark:text-slate-300 group-hover:bg-blue-600 group-hover:text-white transition-colors shrink-0">
                    <Languages className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="font-semibold text-sm md:text-base text-slate-900 dark:text-white leading-none">
                      {t.language}
                    </p>
                    <p className="text-[11px] md:text-xs text-slate-400 mt-1.5">
                      {language === "vi" ? "Tiếng Việt" : "English"}
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-300 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="w-full p-4 md:p-5 flex items-center justify-center gap-3 text-red-500 font-bold bg-white dark:bg-slate-800 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-2xl transition-all border border-red-100 dark:border-red-900/50 shadow-sm"
          >
            <LogOut className="w-5 h-5" />
            <span>{t.logout}</span>
          </button>
        </div>
      </ScrollArea>

      {/* Edit Profile Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-md bg-white dark:bg-slate-800">
          <DialogHeader>
            <DialogTitle className="dark:text-white">
              {t.editProfile}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Display Name */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-900 dark:text-slate-200">
                {t.displayName}
              </label>
              <Input
                placeholder={
                  language === "vi" ? "Nhập tên của bạn" : "Enter your name"
                }
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                disabled={isUpdating}
                className="dark:bg-slate-700 dark:text-white dark:border-slate-600"
              />
            </div>

            {/* Bio */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-900 dark:text-slate-200">
                {t.bio}
              </label>
              <Textarea
                placeholder={
                  language === "vi"
                    ? "Kể về bạn..."
                    : "Tell us about yourself..."
                }
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                disabled={isUpdating}
                className="min-h-[100px] dark:bg-slate-700 dark:text-white dark:border-slate-600"
              />
              <p className="text-xs text-slate-400">{bio.length}/160</p>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4">
              <Button
                variant="outline"
                onClick={() => setShowEditDialog(false)}
                disabled={isUpdating}
                className="flex-1 dark:border-slate-600 dark:text-white dark:hover:bg-slate-700"
              >
                {t.cancel}
              </Button>
              <Button
                onClick={handleSaveProfile}
                disabled={isUpdating}
                className="flex-1 bg-blue-600 hover:bg-blue-700"
              >
                {isUpdating ? (
                  <>
                    <Loader className="w-4 h-4 mr-2 animate-spin" />
                    {language === "vi" ? "Đang lưu..." : "Saving..."}
                  </>
                ) : (
                  t.save
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Language Selection Dialog */}
      <Dialog open={showLanguageDialog} onOpenChange={setShowLanguageDialog}>
        <DialogContent className="max-w-sm bg-white dark:bg-slate-800">
          <DialogHeader>
            <DialogTitle className="dark:text-white">{t.language}</DialogTitle>
          </DialogHeader>

          <div className="space-y-2">
            <button
              onClick={() => {
                setLanguage("vi");
                setShowLanguageDialog(false);
              }}
              className={`w-full p-4 rounded-xl text-left font-medium transition-all ${
                language === "vi"
                  ? "bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 border-2 border-blue-600 dark:border-blue-500"
                  : "bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-white hover:bg-slate-100 dark:hover:bg-slate-600 border-2 border-transparent"
              }`}
            >
              🇻🇳 Tiếng Việt
            </button>
            <button
              onClick={() => {
                setLanguage("en");
                setShowLanguageDialog(false);
              }}
              className={`w-full p-4 rounded-xl text-left font-medium transition-all ${
                language === "en"
                  ? "bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 border-2 border-blue-600 dark:border-blue-500"
                  : "bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-white hover:bg-slate-100 dark:hover:bg-slate-600 border-2 border-transparent"
              }`}
            >
              🇬🇧 English
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Avatar Confirmation Dialog - Facebook Style */}
      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent className="max-w-md bg-white dark:bg-slate-800 p-0 gap-0 rounded-2xl shadow-2xl border-0">
          {/* Header with Icon */}
          <div className="px-6 pt-6 pb-4 space-y-3">
            <div className="flex justify-center">
              <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                <Trash2 className="w-8 h-8 text-red-600 dark:text-red-400" />
              </div>
            </div>
            <DialogHeader>
              <DialogTitle className="text-xl font-bold text-slate-900 dark:text-white text-center">
                Xóa ảnh đại diện?
              </DialogTitle>
            </DialogHeader>
            <p className="text-center text-sm text-slate-600 dark:text-slate-400 leading-relaxed px-2">
              Bạn có chắc muốn xóa ảnh đại diện của mình không? Ảnh sẽ được thay
              thế bằng avatar mặc định.
            </p>
          </div>

          {/* Divider */}
          <div className="h-px bg-slate-200 dark:bg-slate-700"></div>

          {/* Buttons */}
          <div className="p-4 flex gap-3">
            <Button
              variant="outline"
              onClick={() => setShowDeleteConfirm(false)}
              disabled={isDeletingAvatar}
              className="flex-1 h-11 border-2 border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 font-semibold rounded-xl transition-all"
            >
              Hủy
            </Button>
            <Button
              onClick={confirmDeleteAvatar}
              disabled={isDeletingAvatar}
              className="flex-1 h-11 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-xl transition-all shadow-lg shadow-red-600/25 hover:shadow-red-600/40"
            >
              {isDeletingAvatar ? (
                <>
                  <Loader className="w-4 h-4 mr-2 animate-spin" />
                  Đang xóa...
                </>
              ) : (
                "Xóa"
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function SettingItem({
  icon: Icon,
  label,
  description,
}: {
  icon: any;
  label: string;
  description: string;
}) {
  return (
    <div className="flex items-center justify-between p-4 md:p-5 hover:bg-slate-50 dark:hover:bg-slate-700/50 cursor-pointer transition-all border-b border-slate-50 dark:border-slate-700 last:border-0 group">
      <div className="flex items-center gap-4">
        <div className="p-2 bg-slate-100 dark:bg-slate-700 rounded-xl text-slate-600 dark:text-slate-300 group-hover:bg-blue-600 group-hover:text-white transition-colors shrink-0">
          <Icon className="w-5 h-5" />
        </div>
        <div>
          <p className="font-semibold text-sm md:text-base text-slate-900 dark:text-white leading-none">
            {label}
          </p>
          <p className="text-[11px] md:text-xs text-slate-400 mt-1.5">
            {description}
          </p>
        </div>
      </div>
      <ChevronRight className="w-4 h-4 text-slate-300 dark:text-slate-600 group-hover:translate-x-1 transition-transform" />
    </div>
  );
}

function CustomSwitch({
  checked,
  onCheckedChange,
}: {
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
}) {
  return (
    <SwitchPrimitives.Root
      checked={checked}
      onCheckedChange={onCheckedChange}
      className="w-[42px] h-[24px] bg-slate-200 dark:bg-slate-700 rounded-full relative data-[state=checked]:bg-blue-600 outline-none cursor-pointer transition-colors"
    >
      <SwitchPrimitives.Thumb className="block w-[18px] h-[18px] bg-white rounded-full transition-transform duration-100 translate-x-1 will-change-transform data-[state=checked]:translate-x-[20px]" />
    </SwitchPrimitives.Root>
  );
}
