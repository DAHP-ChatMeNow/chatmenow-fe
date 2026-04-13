"use client";

import { useEffect, useRef, useState } from "react";
import {
  Bell,
  ShieldCheck,
  ShieldBan,
  Languages,
  LogOut,
  ChevronRight,
  Phone,
  Mail,
  KeyRound,
  Eye,
  Heart,
  History,
  Check,
  X,
  Loader2,
  Clock,
} from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { PresignedAvatar } from "@/components/ui/presigned-avatar";
import { useAuthStore } from "@/store/use-auth-store";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/contexts/language-context";
import { useBlockedUsers, useUnblockUser } from "@/hooks/use-contact";
import {
  useConfirmAccountLock,
  useSendAccountLockOtp,
  useVerifyAccountLockOtp,
} from "@/hooks/use-auth";
import { userService } from "@/api/user";
import { isAxiosError } from "axios";
import { toast } from "sonner";

// ─── Mock activity data (until API is ready) ───────────────────────────────
const MOCK_VIEWED = [
  {
    id: "1",
    author: "Ngọc Bích",
    content: "Hôm nay trời đẹp quá, đi chơi thôi!",
    viewedAt: new Date(Date.now() - 1000 * 60 * 30),
  },
  {
    id: "2",
    author: "Thanh Thảo",
    content: "Chia sẻ bài học lập trình React hôm nay...",
    viewedAt: new Date(Date.now() - 1000 * 60 * 90),
  },
  {
    id: "3",
    author: "Hoàng Nam",
    content: "Review nhà hàng mới mở gần chỗ mình...",
    viewedAt: new Date(Date.now() - 1000 * 60 * 180),
  },
];
const MOCK_LIKED = [
  {
    id: "4",
    author: "Lâm Ngọc Thái",
    content: "Test ảnh mới nhé mọi người!",
    likedAt: new Date(Date.now() - 1000 * 60 * 45),
  },
  {
    id: "5",
    author: "Thu Thuỷ",
    content: "Cuối tuần check-in Đà Lạt",
    likedAt: new Date(Date.now() - 1000 * 60 * 240),
  },
];

function timeAgo(date: Date) {
  const diff = Math.floor((Date.now() - date.getTime()) / 1000);
  if (diff < 60) return `${diff} giây trước`;
  if (diff < 3600) return `${Math.floor(diff / 60)} phút trước`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} giờ trước`;
  return `${Math.floor(diff / 86400)} ngày trước`;
}

// ─── Main Page ──────────────────────────────────────────────────────────────
export default function SettingsPage() {
  const router = useRouter();
  const logout = useAuthStore((state) => state.logout);
  const user = useAuthStore((state) => state.user);
  const { language, setLanguage, t } = useLanguage();
  const { data: blockedUsersData, isLoading: isLoadingBlockedUsers } =
    useBlockedUsers();
  const unblockUserMutation = useUnblockUser();
  const { mutate: sendLockOtp, isPending: isSendingLockOtp } =
    useSendAccountLockOtp();
  const { mutate: verifyLockOtp, isPending: isVerifyingLockOtp } =
    useVerifyAccountLockOtp();
  const { mutate: confirmAccountLock, isPending: isConfirmingLock } =
    useConfirmAccountLock();

  const [showLanguageDialog, setShowLanguageDialog] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [showPhoneDialog, setShowPhoneDialog] = useState(false);
  const [showActivity, setShowActivity] = useState(false);
  const [showBlockedDialog, setShowBlockedDialog] = useState(false);
  const [showLockDialog, setShowLockDialog] = useState(false);
  const [activityTab, setActivityTab] = useState<"viewed" | "liked">("viewed");
  const [lockStep, setLockStep] = useState<1 | 2 | 3>(1);
  const [lockOtp, setLockOtp] = useState("");
  const [lockOtpSent, setLockOtpSent] = useState(false);
  const [lockReason, setLockReason] = useState<
    "temporary_leave" | "security_concern" | "privacy_break" | "other"
  >("temporary_leave");
  const [lockOtherReason, setLockOtherReason] = useState("");
  const [lockVerificationToken, setLockVerificationToken] = useState("");
  const [lockVerificationExpiresAt, setLockVerificationExpiresAt] = useState<
    string | null
  >(null);

  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [isChangingPw, setIsChangingPw] = useState(false);

  const [phone, setPhone] = useState(user?.phone || "");
  const [isSavingPhone, setIsSavingPhone] = useState(false);
  const blockedUsers = blockedUsersData?.blockedUsers || [];
  const lockOtpInputRefs = useRef<Array<HTMLInputElement | null>>([]);
  const [resolvedEmail, setResolvedEmail] = useState(user?.email || "");
  const effectiveEmail = user?.email || resolvedEmail;

  useEffect(() => {
    let cancelled = false;

    if (user?.email) return;

    void userService
      .getUserEmail()
      .then((data) => {
        if (cancelled) return;
        if (data?.email) {
          setResolvedEmail(data.email);
        }
      })
      .catch(() => {
        // Keep fallback when email API is unavailable.
      });

    return () => {
      cancelled = true;
    };
  }, [user?.email]);

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  const handleChangePassword = async () => {
    if (!currentPw || !newPw || !confirmPw) {
      toast.error("Vui lòng điền đầy đủ thông tin");
      return;
    }
    if (newPw.length < 6) {
      toast.error("Mật khẩu mới phải có ít nhất 6 ký tự");
      return;
    }
    if (newPw !== confirmPw) {
      toast.error("Mật khẩu xác nhận không khớp");
      return;
    }
    setIsChangingPw(true);
    await new Promise((r) => setTimeout(r, 1000)); // TODO: call API
    setIsChangingPw(false);
    toast.success("Đổi mật khẩu thành công!");
    setCurrentPw("");
    setNewPw("");
    setConfirmPw("");
    setShowChangePassword(false);
  };

  const handleSavePhone = async () => {
    if (!phone.trim()) {
      toast.error("Vui lòng nhập số điện thoại");
      return;
    }
    setIsSavingPhone(true);
    await new Promise((r) => setTimeout(r, 800)); // TODO: call API
    setIsSavingPhone(false);
    toast.success("Cập nhật số điện thoại thành công!");
    setShowPhoneDialog(false);
  };

  const handleSendLockOtp = () => {
    sendLockOtp(undefined, {
      onSuccess: () => {
        setLockOtpSent(true);
      },
    });
  };

  const handleVerifyOtpStep = () => {
    if (!lockOtpSent) {
      toast.error("Vui lòng gửi OTP trước");
      return;
    }
    if (!lockOtp.trim()) {
      toast.error("Vui lòng nhập mã OTP");
      return;
    }
    if (lockOtp.trim().length < 6) {
      toast.error("Mã OTP không hợp lệ");
      return;
    }
    verifyLockOtp(
      { otp: lockOtp.trim() },
      {
        onSuccess: (data) => {
          setLockVerificationToken(data.lockVerificationToken);
          setLockVerificationExpiresAt(data.expiresAt || null);
          setLockStep(2);
        },
      },
    );
  };

  const handleLockOtpDigitChange = (index: number, value: string) => {
    const digit = value.replace(/\D/g, "").slice(-1);
    const current = lockOtp.padEnd(6, " ").split("");
    current[index] = digit || "";
    const nextOtp = current
      .join("")
      .replace(/\s/g, "")
      .slice(0, 6);
    setLockOtp(nextOtp);

    if (digit && index < 5) {
      lockOtpInputRefs.current[index + 1]?.focus();
    }
  };

  const handleLockOtpKeyDown = (
    index: number,
    e: React.KeyboardEvent<HTMLInputElement>,
  ) => {
    if (e.key === "Backspace") {
      if (lockOtp[index]) {
        const current = lockOtp.padEnd(6, " ").split("");
        current[index] = "";
        setLockOtp(current.join("").replace(/\s/g, ""));
        return;
      }

      if (index > 0) {
        const prev = index - 1;
        const current = lockOtp.padEnd(6, " ").split("");
        current[prev] = "";
        setLockOtp(current.join("").replace(/\s/g, ""));
        lockOtpInputRefs.current[prev]?.focus();
      }
    }
  };

  const handleLockOtpPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (!pasted) return;
    setLockOtp(pasted);
    const focusIndex = Math.min(pasted.length, 6) - 1;
    if (focusIndex >= 0) {
      lockOtpInputRefs.current[focusIndex]?.focus();
    }
  };

  const handleConfirmLock = () => {
    if (!lockVerificationToken) {
      toast.error("Phiên xác minh đã hết hạn. Vui lòng xác minh OTP lại.");
      setLockStep(1);
      return;
    }
    if (lockReason === "other" && !lockOtherReason.trim()) {
      toast.error("Vui lòng nhập lý do tạm khóa");
      return;
    }

    if (
      lockVerificationExpiresAt &&
      Date.now() >= new Date(lockVerificationExpiresAt).getTime()
    ) {
      toast.error("Phiên xác minh OTP đã hết hạn. Vui lòng gửi lại OTP.");
      setLockVerificationToken("");
      setLockVerificationExpiresAt(null);
      setLockOtp("");
      setLockOtpSent(false);
      setLockStep(1);
      return;
    }

    confirmAccountLock(
      {
        lockVerificationToken,
        reason: lockReason,
        otherReason: lockReason === "other" ? lockOtherReason.trim() : undefined,
      },
      {
        onError: (error) => {
          if (!isAxiosError(error)) return;
          const message =
            ((error.response?.data as { message?: string } | undefined)?.message || "")
              .toLowerCase();
          if (
            message.includes("expired") ||
            message.includes("hết hạn") ||
            message.includes("verification token") ||
            message.includes("lockverificationtoken")
          ) {
            setLockVerificationToken("");
            setLockVerificationExpiresAt(null);
            setLockOtp("");
            setLockOtpSent(false);
            setLockStep(1);
          }
        },
      },
    );
  };

  const handleContinueFromReason = () => {
    if (lockReason === "other" && !lockOtherReason.trim()) {
      toast.error("Vui lòng nhập lý do tạm khóa");
      return;
    }
    setLockStep(3);
  };

  const resetLockDialog = () => {
    setLockStep(1);
    setLockOtp("");
    setLockOtpSent(false);
    setLockReason("temporary_leave");
    setLockOtherReason("");
    setLockVerificationToken("");
    setLockVerificationExpiresAt(null);
  };

  const newPwStrength =
    newPw.length === 0
      ? null
      : newPw.length < 6
        ? "weak"
        : newPw.length < 10
          ? "medium"
          : "strong";

  return (
    <div className="flex flex-col w-full h-full bg-slate-50 dark:bg-slate-900">
      <ScrollArea className="flex-1 w-full">
        <div className="w-full max-w-2xl px-0 py-4 mx-auto space-y-5 md:space-y-6 md:py-10 md:px-6">
          {/* Account */}
          <Section label="Tài khoản">
            <div className="flex items-center gap-4 p-4 border-b md:p-5 border-slate-50 dark:border-slate-700">
              <PresignedAvatar
                avatarKey={user?.avatar}
                displayName={user?.displayName}
                className="w-14 h-14 shrink-0 ring-2 ring-blue-100 dark:ring-blue-900"
                fallbackClassName="text-lg font-bold"
              />
              <div className="flex-1 min-w-0">
                <p className="font-bold truncate text-slate-900 dark:text-white">
                  {user?.displayName || "—"}
                </p>
                <p className="text-xs text-slate-400 truncate mt-0.5">
                  {effectiveEmail || "Chưa có email"}
                </p>
              </div>
              <Badge className="bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 border-0 text-[11px] shrink-0">
                Tài khoản của tôi
              </Badge>
            </div>
            <SettingItem
              icon={Mail}
              iconBg="bg-orange-50 dark:bg-orange-900/20"
              iconColor="text-orange-500"
              label="Email"
              description={effectiveEmail || "Chưa có email"}
            />
            <SettingItem
              icon={Phone}
              iconBg="bg-green-50 dark:bg-green-900/20"
              iconColor="text-green-500"
              label="Số điện thoại"
              description={user?.phone || "Chưa thêm số điện thoại"}
              onClick={() => setShowPhoneDialog(true)}
            />
            <SettingItem
              icon={KeyRound}
              iconBg="bg-purple-50 dark:bg-purple-900/20"
              iconColor="text-purple-500"
              label="Đổi mật khẩu"
              description="Cập nhật mật khẩu bảo mật tài khoản"
              onClick={() => setShowChangePassword(true)}
            />
            <SettingItem
              icon={ShieldBan}
              iconBg="bg-rose-50 dark:bg-rose-900/20"
              iconColor="text-rose-500"
              label="Tạm khóa tài khoản"
              description="Tạm khóa bằng OTP email và có thể tự mở lại"
              onClick={() => setShowLockDialog(true)}
            />
          </Section>

          {/* Activity */}
          <Section label="Hoạt động">
            <SettingItem
              icon={Eye}
              iconBg="bg-cyan-50 dark:bg-cyan-900/20"
              iconColor="text-cyan-500"
              label="Lịch sử xem bài viết"
              description={`${MOCK_VIEWED.length} bài viết đã xem gần đây`}
              badge={String(MOCK_VIEWED.length)}
              onClick={() => {
                setActivityTab("viewed");
                setShowActivity(true);
              }}
            />
            <SettingItem
              icon={Heart}
              iconBg="bg-rose-50 dark:bg-rose-900/20"
              iconColor="text-rose-500"
              label="Bài viết đã thích"
              description={`${MOCK_LIKED.length} bài viết bạn đã thích`}
              badge={String(MOCK_LIKED.length)}
              onClick={() => {
                setActivityTab("liked");
                setShowActivity(true);
              }}
            />
          </Section>

          {/* Preferences */}
          <Section label="Tuỳ chọn">
            <SettingItem
              icon={Bell}
              iconBg="bg-yellow-50 dark:bg-yellow-900/20"
              iconColor="text-yellow-500"
              label={t.notifications_setting}
              description="Âm thanh, tin nhắn đẩy"
            />
            <SettingItem
              icon={ShieldCheck}
              iconBg="bg-blue-50 dark:bg-blue-900/20"
              iconColor="text-blue-500"
              label={t.privacy}
              description="Quyền riêng tư, khoá ứng dụng"
            />
            <SettingItem
              icon={ShieldBan}
              iconBg="bg-red-50 dark:bg-red-900/20"
              iconColor="text-red-500"
              label="Người đã chặn"
              description="Xem danh sách và mở chặn người dùng"
              badge={String(blockedUsers.length)}
              onClick={() => setShowBlockedDialog(true)}
            />
            <div
              onClick={() => setShowLanguageDialog(true)}
              className="flex items-center justify-between p-4 transition-all cursor-pointer md:p-5 hover:bg-slate-50 dark:hover:bg-slate-700/50 group"
            >
              <div className="flex items-center gap-4">
                <div className="p-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-900/20 text-indigo-500 group-hover:scale-105 transition-transform shrink-0">
                  <Languages className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold leading-none md:text-base text-slate-900 dark:text-white">
                    {t.language}
                  </p>
                  <p className="text-[11px] md:text-xs text-slate-400 mt-1.5">
                    {language === "vi" ? "Tiếng Việt" : "English"}
                  </p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 transition-transform text-slate-300 group-hover:translate-x-1" />
            </div>
          </Section>

          {/* Logout */}
          <div className="sticky bottom-0 px-4 pt-2 pb-[max(12px,env(safe-area-inset-bottom))] bg-gradient-to-t from-slate-50 via-slate-50 to-transparent dark:from-slate-900 dark:via-slate-900 md:bg-transparent md:static md:px-0 md:pt-0 md:pb-0">
            <button
              onClick={handleLogout}
              className="flex items-center justify-center w-full gap-3 p-4 font-bold text-red-500 transition-all bg-white border border-red-100 shadow-sm md:p-5 dark:bg-slate-800 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl md:rounded-2xl dark:border-red-900/50"
            >
              <LogOut className="w-5 h-5" />
              <span>{t.logout}</span>
            </button>
          </div>
        </div>
      </ScrollArea>

      {/* === DIALOGS === */}

      {/* Language */}
      <Dialog open={showLanguageDialog} onOpenChange={setShowLanguageDialog}>
        <DialogContent className="w-[calc(100vw-1rem)] max-w-sm bg-white dark:bg-slate-800 rounded-2xl">
          <DialogHeader>
            <DialogTitle className="dark:text-white">{t.language}</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            {(["vi", "en"] as const).map((lang) => (
              <button
                key={lang}
                onClick={() => {
                  setLanguage(lang);
                  setShowLanguageDialog(false);
                }}
                className={`w-full p-4 rounded-xl text-left font-medium transition-all flex items-center justify-between ${
                  language === lang
                    ? "bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 border-2 border-blue-600"
                    : "bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-white hover:bg-slate-100 border-2 border-transparent"
                }`}
              >
                <span>{lang === "vi" ? "Tiếng Việt" : "English"}</span>
                {language === lang && <Check className="w-4 h-4" />}
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Change Password */}
      <Dialog open={showChangePassword} onOpenChange={setShowChangePassword}>
        <DialogContent className="w-[calc(100vw-1rem)] max-w-sm bg-white dark:bg-slate-800 rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 dark:text-white">
              <KeyRound className="w-5 h-5 text-purple-500" />
              Đổi mật khẩu
            </DialogTitle>
          </DialogHeader>
          <div className="pt-1 space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold tracking-wide uppercase text-slate-500">
                Mật khẩu hiện tại
              </label>
              <Input
                type="password"
                placeholder="Nhập mật khẩu hiện tại"
                value={currentPw}
                onChange={(e) => setCurrentPw(e.target.value)}
                className="h-11 dark:bg-slate-700 dark:border-slate-600 dark:text-white"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold tracking-wide uppercase text-slate-500">
                Mật khẩu mới
              </label>
              <Input
                type="password"
                placeholder="Tối thiểu 6 ký tự"
                value={newPw}
                onChange={(e) => setNewPw(e.target.value)}
                className="h-11 dark:bg-slate-700 dark:border-slate-600 dark:text-white"
              />
              {newPwStrength && (
                <div className="flex items-center gap-2 mt-1">
                  <div className="flex flex-1 gap-1">
                    {["weak", "medium", "strong"].map((level, i) => (
                      <div
                        key={level}
                        className={`h-1.5 flex-1 rounded-full transition-colors ${
                          newPwStrength === "weak" && i === 0
                            ? "bg-red-400"
                            : newPwStrength === "medium" && i <= 1
                              ? "bg-yellow-400"
                              : newPwStrength === "strong"
                                ? "bg-green-400"
                                : "bg-slate-200 dark:bg-slate-600"
                        }`}
                      />
                    ))}
                  </div>
                  <span
                    className={`text-[11px] font-medium ${
                      newPwStrength === "weak"
                        ? "text-red-500"
                        : newPwStrength === "medium"
                          ? "text-yellow-500"
                          : "text-green-500"
                    }`}
                  >
                    {newPwStrength === "weak"
                      ? "Yếu"
                      : newPwStrength === "medium"
                        ? "Trung bình"
                        : "Mạnh"}
                  </span>
                </div>
              )}
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold tracking-wide uppercase text-slate-500">
                Xác nhận mật khẩu mới
              </label>
              <div className="relative">
                <Input
                  type="password"
                  placeholder="Nhập lại mật khẩu mới"
                  value={confirmPw}
                  onChange={(e) => setConfirmPw(e.target.value)}
                  className="pr-10 h-11 dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                />
                {confirmPw && (
                  <div className="absolute -translate-y-1/2 right-3 top-1/2">
                    {confirmPw === newPw ? (
                      <Check className="w-4 h-4 text-green-500" />
                    ) : (
                      <X className="w-4 h-4 text-red-400" />
                    )}
                  </div>
                )}
              </div>
            </div>
            <Button
              onClick={handleChangePassword}
              disabled={isChangingPw}
              className="w-full font-semibold text-white bg-purple-600 h-11 hover:bg-purple-700 rounded-xl"
            >
              {isChangingPw && (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              )}
              {isChangingPw ? "Đang cập nhật..." : "Cập nhật mật khẩu"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Phone */}
      <Dialog open={showPhoneDialog} onOpenChange={setShowPhoneDialog}>
        <DialogContent className="w-[calc(100vw-1rem)] max-w-sm bg-white dark:bg-slate-800 rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 dark:text-white">
              <Phone className="w-5 h-5 text-green-500" />
              Số điện thoại
            </DialogTitle>
          </DialogHeader>
          <div className="pt-1 space-y-4">
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Thêm số điện thoại để bạn bè dễ tìm thấy bạn hơn.
            </p>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold tracking-wide uppercase text-slate-500">
                Số điện thoại
              </label>
              <div className="flex gap-2">
                <div className="flex items-center px-3 text-sm border rounded-lg h-11 bg-slate-50 dark:bg-slate-700 border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 shrink-0">
                  +84
                </div>
                <Input
                  type="tel"
                  placeholder="09x xxx xxxx"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="flex-1 h-11 dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                />
              </div>
            </div>
            <Button
              onClick={handleSavePhone}
              disabled={isSavingPhone}
              className="w-full font-semibold text-white bg-green-600 h-11 hover:bg-green-700 rounded-xl"
            >
              {isSavingPhone && (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              )}
              {isSavingPhone ? "Đang lưu..." : "Lưu số điện thoại"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Account lock */}
      <Dialog
        open={showLockDialog}
        onOpenChange={(open) => {
          setShowLockDialog(open);
          if (!open) resetLockDialog();
        }}
      >
        <DialogContent className="w-[calc(100vw-1rem)] max-w-md bg-white dark:bg-slate-800 rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 dark:text-white">
              <ShieldBan className="w-5 h-5 text-rose-500" />
              {lockStep === 1
                ? "Xác minh"
                : lockStep === 2
                  ? "Lý do"
                  : "Xác nhận"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {lockStep === 1 && (
              <div className="space-y-3">
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Xác minh danh tính bằng OTP gửi đến email{" "}
                  <b>{effectiveEmail || "của bạn"}</b>.
                </p>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleSendLockOtp}
                  disabled={isSendingLockOtp}
                  className="w-full"
                >
                  {isSendingLockOtp && (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  )}
                  {lockOtpSent ? "Gửi lại OTP" : "Gửi OTP"}
                </Button>

                {lockOtpSent && (
                  <>
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold tracking-wide uppercase text-slate-500">
                        Mã OTP
                      </label>
                      <div className="grid grid-cols-6 gap-2">
                        {Array.from({ length: 6 }).map((_, index) => (
                          <Input
                            key={`lock-otp-step1-${index}`}
                            ref={(el) => {
                              lockOtpInputRefs.current[index] = el;
                            }}
                            inputMode="numeric"
                            autoComplete="one-time-code"
                            maxLength={1}
                            value={lockOtp[index] || ""}
                            onChange={(e) =>
                              handleLockOtpDigitChange(index, e.target.value)
                            }
                            onKeyDown={(e) => handleLockOtpKeyDown(index, e)}
                            onPaste={handleLockOtpPaste}
                            className="h-11 text-center text-base font-semibold tracking-wide dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                          />
                        ))}
                      </div>
                    </div>
                    <Button
                      type="button"
                      onClick={handleVerifyOtpStep}
                      disabled={isVerifyingLockOtp}
                      className="w-full bg-rose-600 hover:bg-rose-700"
                    >
                      {isVerifyingLockOtp ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Đang xác minh...
                        </>
                      ) : (
                        "Xác minh OTP"
                      )}
                    </Button>
                  </>
                )}
              </div>
            )}

            {lockStep === 2 && (
              <div className="space-y-3">
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Chọn lý do tạm khóa tài khoản.
                </p>
                <div className="grid grid-cols-1 gap-2">
                  {[
                    { value: "temporary_leave", label: "Tạm thời không sử dụng" },
                    { value: "security_concern", label: "Lo ngại bảo mật" },
                    { value: "privacy_break", label: "Muốn tạm ẩn riêng tư" },
                    { value: "other", label: "Lý do khác" },
                  ].map((item) => (
                    <button
                      key={item.value}
                      type="button"
                      onClick={() =>
                        setLockReason(
                          item.value as
                            | "temporary_leave"
                            | "security_concern"
                            | "privacy_break"
                            | "other",
                        )
                      }
                      className={`rounded-xl border px-3 py-2 text-left text-sm transition ${
                        lockReason === item.value
                          ? "border-rose-500 bg-rose-50 text-rose-700 dark:bg-rose-900/20 dark:text-rose-300"
                          : "border-slate-200 text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-700/50"
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>

                {lockReason === "other" && (
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold tracking-wide uppercase text-slate-500">
                      Lý do cụ thể
                    </label>
                    <Input
                      placeholder="Nhập lý do của bạn"
                      value={lockOtherReason}
                      onChange={(e) => setLockOtherReason(e.target.value)}
                      className="h-11 dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                    />
                  </div>
                )}

                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setLockStep(1)}
                    className="flex-1"
                  >
                    Quay lại
                  </Button>
                  <Button
                    type="button"
                    onClick={handleContinueFromReason}
                    className="flex-1 bg-rose-600 hover:bg-rose-700"
                  >
                    Tiếp tục
                  </Button>
                </div>
              </div>
            )}

            {lockStep === 3 && (
              <div className="space-y-3">
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Xác nhận tạm khóa tài khoản. Sau khi thành công, bạn sẽ
                  được đăng xuất khỏi tất cả phiên đăng nhập.
                </p>
                <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:border-rose-900/60 dark:bg-rose-900/20 dark:text-rose-300">
                  <p>
                    <b>Email xác minh:</b> {effectiveEmail || "—"}
                  </p>
                  <p className="mt-1">
                    <b>Hiệu lực đến:</b> Vô hạn
                  </p>
                  <p className="mt-1">
                    <b>Lý do:</b>{" "}
                    {{
                      temporary_leave: "Tạm thời không sử dụng",
                      security_concern: "Lo ngại bảo mật",
                      privacy_break: "Muốn tạm ẩn riêng tư",
                      other: lockOtherReason.trim() || "Lý do khác",
                    }[lockReason]}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setLockStep(2)}
                    className="flex-1"
                  >
                    Quay lại
                  </Button>
                  <Button
                    type="button"
                    onClick={handleConfirmLock}
                    disabled={isConfirmingLock}
                    className="flex-1 bg-rose-600 hover:bg-rose-700"
                  >
                    {isConfirmingLock && (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    )}
                    Xác nhận & tạm khóa
                  </Button>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Activity History */}
      <Dialog open={showActivity} onOpenChange={setShowActivity}>
        <DialogContent className="w-[calc(100vw-1rem)] max-w-lg bg-white dark:bg-slate-800 h-[85vh] md:h-[80vh] flex flex-col p-0 gap-0 rounded-2xl">
          <DialogHeader className="px-5 pt-5 pb-0 shrink-0">
            <DialogTitle className="flex items-center gap-2 dark:text-white">
              <History className="w-5 h-5 text-slate-500" />
              Lịch sử hoạt động
            </DialogTitle>
          </DialogHeader>
          <div className="flex gap-1 px-5 pt-4 pb-3 border-b border-slate-100 dark:border-slate-700 shrink-0">
            <button
              onClick={() => setActivityTab("viewed")}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                activityTab === "viewed"
                  ? "bg-cyan-50 dark:bg-cyan-900/30 text-cyan-600 dark:text-cyan-400"
                  : "text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-700"
              }`}
            >
              <Eye className="w-4 h-4" />
              Đã xem ({MOCK_VIEWED.length})
            </button>
            <button
              onClick={() => setActivityTab("liked")}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                activityTab === "liked"
                  ? "bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400"
                  : "text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-700"
              }`}
            >
              <Heart className="w-4 h-4" />
              Đã thích ({MOCK_LIKED.length})
            </button>
          </div>
          <ScrollArea className="flex-1 min-h-0">
            <div className="px-5 py-3 space-y-2">
              {activityTab === "viewed" ? (
                MOCK_VIEWED.length === 0 ? (
                  <div className="py-12 text-sm text-center text-slate-400">
                    Chưa có bài viết nào được xem
                  </div>
                ) : (
                  MOCK_VIEWED.map((item) => (
                    <ActivityItem
                      key={item.id}
                      author={item.author}
                      content={item.content}
                      time={timeAgo(item.viewedAt)}
                      icon={<Eye className="w-3.5 h-3.5 text-cyan-500" />}
                      iconBg="bg-cyan-50 dark:bg-cyan-900/30"
                    />
                  ))
                )
              ) : MOCK_LIKED.length === 0 ? (
                <div className="py-12 text-sm text-center text-slate-400">
                  Chưa thích bài viết nào
                </div>
              ) : (
                MOCK_LIKED.map((item) => (
                  <ActivityItem
                    key={item.id}
                    author={item.author}
                    content={item.content}
                    time={timeAgo(item.likedAt)}
                    icon={
                      <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500" />
                    }
                    iconBg="bg-rose-50 dark:bg-rose-900/30"
                  />
                ))
              )}
            </div>
          </ScrollArea>
          <div className="px-5 py-3 border-t border-slate-100 dark:border-slate-700 shrink-0">
            <p className="text-[11px] text-slate-400 text-center">
              Lịch sử hoạt động chỉ hiển thị với bạn
            </p>
          </div>
        </DialogContent>
      </Dialog>

      {/* Blocked users */}
      <Dialog open={showBlockedDialog} onOpenChange={setShowBlockedDialog}>
        <DialogContent className="w-[calc(100vw-1rem)] max-w-lg bg-white dark:bg-slate-800 h-[85vh] md:h-[80vh] flex flex-col p-0 gap-0 rounded-2xl">
          <DialogHeader className="px-5 pt-5 pb-0 shrink-0">
            <DialogTitle className="flex items-center gap-2 dark:text-white">
              <ShieldBan className="w-5 h-5 text-red-500" />
              Người đã chặn
            </DialogTitle>
          </DialogHeader>
          <div className="px-5 pt-3 shrink-0">
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Những người này sẽ không thể nhắn tin hoặc tìm bạn cho đến khi bạn mở chặn.
            </p>
          </div>
          <ScrollArea className="flex-1 min-h-0">
            <div className="px-5 py-4 space-y-3">
              {isLoadingBlockedUsers ? (
                <div className="py-14 text-sm text-center text-slate-400">
                  Đang tải danh sách...
                </div>
              ) : blockedUsers.length === 0 ? (
                <div className="py-14 text-sm text-center text-slate-400">
                  Bạn chưa chặn ai cả
                </div>
              ) : (
                blockedUsers.map((blockedUser) => (
                  <div
                    key={blockedUser.id || blockedUser._id}
                    className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-700/50 rounded-2xl"
                  >
                    <PresignedAvatar
                      avatarKey={blockedUser.avatar}
                      displayName={blockedUser.displayName}
                      className="w-12 h-12 shrink-0"
                      fallbackClassName="text-sm font-bold"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate text-slate-900 dark:text-white">
                        {blockedUser.displayName}
                      </p>
                      <p className="text-xs text-slate-400 truncate mt-0.5">
                        {blockedUser.bio || "Người dùng đã bị chặn"}
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      disabled={unblockUserMutation.isPending}
                      onClick={() =>
                        unblockUserMutation.mutate(blockedUser.id || blockedUser._id || "")
                      }
                      className="shrink-0 border-slate-200 text-slate-700 hover:bg-slate-100 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-700"
                    >
                      Mở chặn
                    </Button>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
          <div className="px-5 py-3 border-t border-slate-100 dark:border-slate-700 shrink-0">
            <p className="text-[11px] text-slate-400 text-center">
              Chặn người dùng chỉ ngăn họ liên hệ với bạn. Bạn bè vẫn được giữ nguyên cho đến khi bạn xoá thủ công.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Reusable components ─────────────────────────────────────────────────────

function Section({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <h3 className="px-4 md:px-1 text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
        {label}
      </h3>
      <div className="overflow-hidden bg-white divide-y shadow-sm border-y md:border md:rounded-2xl dark:bg-slate-800 border-slate-100 dark:border-slate-700 divide-slate-50 dark:divide-slate-700">
        {children}
      </div>
    </div>
  );
}

function SettingItem({
  icon: Icon,
  iconBg = "bg-slate-100 dark:bg-slate-700",
  iconColor = "text-slate-600 dark:text-slate-300",
  label,
  description,
  badge,
  onClick,
}: {
  icon: React.ComponentType<{ className?: string }>;
  iconBg?: string;
  iconColor?: string;
  label: string;
  description: string;
  badge?: string;
  onClick?: () => void;
}) {
  return (
    <div
      onClick={onClick}
      className={`flex items-center justify-between p-4 md:p-5 transition-all group active:bg-slate-50/80 dark:active:bg-slate-700/60 ${
        onClick
          ? "hover:bg-slate-50 dark:hover:bg-slate-700/50 cursor-pointer"
          : "cursor-default"
      }`}
    >
      <div className="flex items-center flex-1 min-w-0 gap-3 md:gap-4">
        <div
          className={`p-2.5 rounded-xl ${iconBg} ${iconColor} ${onClick ? "group-hover:scale-105" : ""} transition-transform shrink-0`}
        >
          <Icon className="w-5 h-5" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold leading-none md:text-base text-slate-900 dark:text-white">
            {label}
          </p>
          <p className="text-[11px] md:text-xs text-slate-400 mt-1.5 leading-relaxed break-words">
            {description}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {badge && (
          <span className="text-[11px] font-bold px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full">
            {badge}
          </span>
        )}
        {onClick && (
          <ChevronRight className="w-4 h-4 transition-transform text-slate-300 dark:text-slate-600 group-hover:translate-x-1" />
        )}
      </div>
    </div>
  );
}

function ActivityItem({
  author,
  content,
  time,
  icon,
  iconBg,
}: {
  author: string;
  content: string;
  time: string;
  icon: React.ReactNode;
  iconBg: string;
}) {
  return (
    <div className="flex items-start gap-3 p-3 transition-colors cursor-pointer rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700/50 group">
      <div
        className={`w-8 h-8 rounded-full ${iconBg} flex items-center justify-center shrink-0 mt-0.5`}
      >
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-slate-800 dark:text-white">
          {author}
        </p>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-1">
          {content}
        </p>
        <div className="flex items-center gap-1 mt-1">
          <Clock className="w-3 h-3 text-slate-300" />
          <span className="text-[11px] text-slate-400">{time}</span>
        </div>
      </div>
      <ChevronRight className="w-4 h-4 mt-1 transition-opacity opacity-0 text-slate-300 group-hover:opacity-100 shrink-0" />
    </div>
  );
}
