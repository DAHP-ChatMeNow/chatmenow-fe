"use client";

import { useState } from "react";
import {
  Bell,
  ShieldCheck,
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
  AlertTriangle,
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

  const [showLanguageDialog, setShowLanguageDialog] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [showPhoneDialog, setShowPhoneDialog] = useState(false);
  const [showActivity, setShowActivity] = useState(false);
  const [activityTab, setActivityTab] = useState<"viewed" | "liked">("viewed");
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [isChangingPw, setIsChangingPw] = useState(false);

  const [phone, setPhone] = useState(user?.phone || "");
  const [isSavingPhone, setIsSavingPhone] = useState(false);

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
        <div className="max-w-2xl px-4 py-6 mx-auto space-y-6 md:py-10 md:px-6">
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
                  {user?.email}
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
              description={user?.email || "Chưa có email"}
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
          <button
            onClick={() => setShowLogoutConfirm(true)}
            className="flex items-center justify-center w-full gap-3 p-4 font-bold text-red-500 transition-all bg-white border border-red-100 shadow-sm md:p-5 dark:bg-slate-800 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-2xl dark:border-red-900/50"
          >
            <LogOut className="w-5 h-5" />
            <span>{t.logout}</span>
          </button>
        </div>
      </ScrollArea>

      {/* === DIALOGS === */}

      {/* Language */}
      <Dialog open={showLanguageDialog} onOpenChange={setShowLanguageDialog}>
        <DialogContent className="max-w-sm bg-white dark:bg-slate-800">
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
        <DialogContent className="max-w-sm bg-white dark:bg-slate-800">
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
        <DialogContent className="max-w-sm bg-white dark:bg-slate-800">
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

      {/* Activity History */}
      <Dialog open={showActivity} onOpenChange={setShowActivity}>
        <DialogContent className="max-w-lg bg-white dark:bg-slate-800 h-[80vh] flex flex-col p-0 gap-0">
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

      {/* Logout Confirm */}
      <Dialog open={showLogoutConfirm} onOpenChange={setShowLogoutConfirm}>
        <DialogContent className="max-w-sm bg-white dark:bg-slate-800">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 dark:text-white">
              <AlertTriangle className="w-5 h-5 text-red-500" />
              Xác nhận đăng xuất
            </DialogTitle>
          </DialogHeader>
          <p className="pb-2 text-sm text-slate-500 dark:text-slate-400">
            Bạn có chắc muốn đăng xuất khỏi tài khoản không?
          </p>
          <div className="flex gap-3">
            <Button
              variant="outline"
              className="flex-1 dark:border-slate-600 dark:text-white"
              onClick={() => setShowLogoutConfirm(false)}
            >
              Huỷ
            </Button>
            <Button
              className="flex-1 text-white bg-red-600 hover:bg-red-700"
              onClick={handleLogout}
            >
              Đăng xuất
            </Button>
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
      <h3 className="px-1 text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
        {label}
      </h3>
      <div className="overflow-hidden bg-white border divide-y shadow-sm dark:bg-slate-800 rounded-2xl border-slate-100 dark:border-slate-700 divide-slate-50 dark:divide-slate-700">
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
      className={`flex items-center justify-between p-4 md:p-5 transition-all group ${
        onClick
          ? "hover:bg-slate-50 dark:hover:bg-slate-700/50 cursor-pointer"
          : "cursor-default"
      }`}
    >
      <div className="flex items-center gap-4">
        <div
          className={`p-2.5 rounded-xl ${iconBg} ${iconColor} ${onClick ? "group-hover:scale-105" : ""} transition-transform shrink-0`}
        >
          <Icon className="w-5 h-5" />
        </div>
        <div>
          <p className="text-sm font-semibold leading-none md:text-base text-slate-900 dark:text-white">
            {label}
          </p>
          <p className="text-[11px] md:text-xs text-slate-400 mt-1.5 leading-relaxed">
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
