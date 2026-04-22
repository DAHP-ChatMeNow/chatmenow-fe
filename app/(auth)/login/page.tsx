"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TurnstileWidget } from "@/components/auth/turnstile-widget";
import {
  useConfirmAccountUnlock,
  useLogin,
  useRememberedLogin,
  useRevokeRememberedAccount,
  useSendAccountUnlockOtp,
} from "@/hooks/use-auth";
import { authService } from "@/services/auth";
import { useAuthStore } from "@/store/use-auth-store";
import { isAxiosError } from "axios";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PresignedAvatar } from "@/components/ui/presigned-avatar";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Eye,
  EyeOff,
  Mail,
  Lock,
  X,
  ChevronRight,
  Plus,
  UserPlus,
} from "lucide-react";
import { getDeviceId, getDeviceName } from "@/lib/device-utils";
import { getDefaultRouteForClient } from "@/lib/default-route";

const loginSchema = z.object({
  email: z.string().email("Email không hợp lệ"),
  password: z.string().min(6, "Mật khẩu phải có ít nhất 6 ký tự"),
});

type LoginFormValues = z.infer<typeof loginSchema>;

const isDirectAvatarUrl = (avatar?: string) =>
  Boolean(
    avatar &&
    (avatar.startsWith("http://") ||
      avatar.startsWith("https://") ||
      avatar.startsWith("data:") ||
      avatar.startsWith("blob:") ||
      avatar.startsWith("/")),
  );

// Generate particles array outside component to avoid impure function error
const generateParticles = () =>
  Array.from({ length: 16 }).map((_, i) => ({
    id: i,
    width: 4 + Math.random() * 10,
    height: 4 + Math.random() * 10,
    left: i * 6.25 + Math.random() * 5,
    color: [
      "rgba(99,102,241,0.2)",
      "rgba(139,92,246,0.18)",
      "rgba(37,99,235,0.15)",
      "rgba(16,185,129,0.15)",
    ][i % 4],
    duration: 6 + Math.random() * 10,
    delay: Math.random() * 8,
  }));

const PARTICLES = generateParticles();

const isLockedAccountError = (error: unknown) => {
  if (!isAxiosError(error)) return false;
  const data = (error.response?.data as { code?: string; message?: string } | undefined) || {};
  const code = (data.code || "").toUpperCase();
  const message = (data.message || "").toLowerCase();
  return code === "ACCOUNT_LOCKED" || message.includes("locked") || message.includes("bị khóa");
};

export default function LoginPage() {
  const { mutate: login, isPending } = useLogin();
  const { mutate: rememberedLogin, isPending: isRememberedLoginPending } =
    useRememberedLogin();
  const { mutate: revokeAccount, isPending: isRevokePending } =
    useRevokeRememberedAccount();
  const { mutate: sendUnlockOtp, isPending: isSendingUnlockOtp } =
    useSendAccountUnlockOtp();
  const { mutate: confirmUnlock, isPending: isConfirmingUnlock } =
    useConfirmAccountUnlock();
  const addRememberedAccount = useAuthStore(
    (state) => state.addRememberedAccount,
  );
  const token = useAuthStore((state) => state.token);
  const rememberedAccounts = useAuthStore((state) => state.rememberedAccounts);
  const enrichedTokensRef = useRef<Set<string>>(new Set());
  const router = useRouter();

  const [showPassword, setShowPassword] = useState(false);
  const [rememberAccount, setRememberAccount] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState("");
  const [turnstileError, setTurnstileError] = useState("");
  const [loginError, setLoginError] = useState("");
  const [turnstileResetSignal] = useState(0);
  const [showLoginForm, setShowLoginForm] = useState(
    rememberedAccounts.length === 0,
  );
  const [unlockEmail, setUnlockEmail] = useState("");
  const [unlockOtp, setUnlockOtp] = useState("");
  const [unlockOtpSent, setUnlockOtpSent] = useState(false);
  const [showUnlockScreen, setShowUnlockScreen] = useState(false);
  const unlockOtpInputRefs = useRef<Array<HTMLInputElement | null>>([]);

  const turnstileSiteKey =
    process.env.NEXT_PUBLIC_CLOUDFLARE_TURNSTILE_SITE_KEY ?? "";

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
  });

  const formErrorMessage = useMemo(() => {
    if (loginError) return loginError;
    if (turnstileError) return turnstileError;
    return "";
  }, [loginError, turnstileError]);

  useEffect(() => {
    if (!token) return;
    router.replace(getDefaultRouteForClient());
  }, [token, router]);

  useEffect(() => {
    const enrichAvatars = async () => {
      for (const account of rememberedAccounts) {
        if (enrichedTokensRef.current.has(account.rememberToken)) continue;
        enrichedTokensRef.current.add(account.rememberToken);

        try {
          const data = await authService.getRememberedAccountInfo({
            rememberToken: account.rememberToken,
            deviceId: account.rememberProfile.deviceId,
          });

          const profile = data.rememberProfile;
          const resolvedAvatar =
            profile.avatarViewUrl ||
            (isDirectAvatarUrl(profile.avatar) ? profile.avatar : undefined) ||
            account.rememberProfile.avatar;

          const hasChanged =
            profile.displayName !== account.rememberProfile.displayName ||
            profile.email !== account.rememberProfile.email ||
            profile.deviceName !== account.rememberProfile.deviceName ||
            profile.savedAt !== account.rememberProfile.savedAt ||
            resolvedAvatar !== account.rememberProfile.avatar;

          if (hasChanged) {
            addRememberedAccount({
              ...account,
              rememberProfile: {
                ...account.rememberProfile,
                id: profile.id,
                email: profile.email,
                displayName: profile.displayName,
                avatar: resolvedAvatar,
                avatarViewUrl: profile.avatarViewUrl,
                deviceId: profile.deviceId,
                deviceName: profile.deviceName,
                savedAt: profile.savedAt,
              },
            });
          }
        } catch {
          // Keep fallback avatar when enrichment fails.
        }
      }
    };

    if (rememberedAccounts.length > 0) {
      enrichAvatars();
    }
  }, [rememberedAccounts, addRememberedAccount]);

  const onSubmit = (data: LoginFormValues) => {
    setLoginError("");
    setTurnstileError("");
    setShowUnlockScreen(false);

    if (!turnstileSiteKey) {
      setTurnstileError(
        "Thiếu site key Turnstile. Hãy cấu hình NEXT_PUBLIC_CLOUDFLARE_TURNSTILE_SITE_KEY.",
      );
      return;
    }

    if (!turnstileToken) {
      setTurnstileError(
        "Vui lòng hoàn thành xác thực Turnstile trước khi đăng nhập.",
      );
      return;
    }

    login({
      ...data,
      turnstileToken,
      rememberAccount,
      deviceId: getDeviceId(),
      deviceName: getDeviceName(),
    }, {
      onError: (error) => {
        if (!isLockedAccountError(error)) return;
        setUnlockEmail(data.email);
        setUnlockOtp("");
        setUnlockOtpSent(false);
        setShowUnlockScreen(true);
      },
    });
  };

  const handleSendUnlockOtp = () => {
    if (!unlockEmail.trim()) {
      setLoginError("Vui lòng nhập email để nhận OTP mở khóa.");
      return;
    }
    sendUnlockOtp(
      { email: unlockEmail.trim() },
      {
        onSuccess: () => {
          setUnlockOtpSent(true);
        },
      },
    );
  };

  const handleConfirmUnlock = () => {
    if (!unlockEmail.trim() || !unlockOtp.trim()) {
      setLoginError("Vui lòng nhập đầy đủ email và OTP mở khóa.");
      return;
    }
    confirmUnlock(
      { email: unlockEmail.trim(), otp: unlockOtp.trim() },
      {
        onSuccess: () => {
          setShowUnlockScreen(false);
          setShowLoginForm(true);
          setValue("email", unlockEmail.trim(), { shouldValidate: true });
          setUnlockOtp("");
          setUnlockOtpSent(false);
          setLoginError("");
          setTurnstileError("");
        },
      },
    );
  };

  const handleUnlockOtpDigitChange = (index: number, value: string) => {
    const digit = value.replace(/\D/g, "").slice(-1);
    const current = unlockOtp.padEnd(6, " ").split("");
    current[index] = digit || "";
    const nextOtp = current
      .join("")
      .replace(/\s/g, "")
      .slice(0, 6);
    setUnlockOtp(nextOtp);

    if (digit && index < 5) {
      unlockOtpInputRefs.current[index + 1]?.focus();
    }
  };

  const handleUnlockOtpKeyDown = (
    index: number,
    e: React.KeyboardEvent<HTMLInputElement>,
  ) => {
    if (e.key !== "Backspace") return;

    if (unlockOtp[index]) {
      const current = unlockOtp.padEnd(6, " ").split("");
      current[index] = "";
      setUnlockOtp(current.join("").replace(/\s/g, ""));
      return;
    }

    if (index > 0) {
      const prev = index - 1;
      const current = unlockOtp.padEnd(6, " ").split("");
      current[prev] = "";
      setUnlockOtp(current.join("").replace(/\s/g, ""));
      unlockOtpInputRefs.current[prev]?.focus();
    }
  };

  const handleUnlockOtpPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (!pasted) return;
    setUnlockOtp(pasted);
    const focusIndex = Math.min(pasted.length, 6) - 1;
    if (focusIndex >= 0) {
      unlockOtpInputRefs.current[focusIndex]?.focus();
    }
  };

  if (token) {
    return (
      <div className="flex items-center justify-center min-h-screen px-4 bg-gradient-to-br from-indigo-50 via-white to-blue-50">
        <div className="px-6 py-4 text-sm font-medium bg-white shadow-sm rounded-2xl text-slate-600 animate-pulse">
          Đang chuyển hướng...
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex flex-col items-center justify-center min-h-screen px-4 py-8 overflow-hidden bg-gradient-to-br from-indigo-50 via-slate-50 to-blue-50">
      {/* ── Animated blobs ── */}
      <div
        className="absolute rounded-full pointer-events-none -top-32 -right-32 h-96 w-96 bg-blue-200/40 blur-3xl"
        style={{ animation: "blobMove1 8s ease-in-out infinite" }}
      />
      <div
        className="absolute rounded-full pointer-events-none -bottom-32 -left-32 h-80 w-80 bg-violet-200/35 blur-3xl"
        style={{ animation: "blobMove2 10s ease-in-out infinite" }}
      />
      <div
        className="absolute w-48 h-48 rounded-full pointer-events-none top-1/2 left-1/3 bg-emerald-200/20 blur-3xl"
        style={{ animation: "blobMove1 12s ease-in-out infinite 2s" }}
      />

      {/* ── Floating particles ── */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {PARTICLES.map((particle) => (
          <span
            key={particle.id}
            className="absolute rounded-full"
            style={{
              width: `${particle.width}px`,
              height: `${particle.height}px`,
              left: `${particle.left}%`,
              bottom: "-20px",
              background: particle.color,
              animation: `floatUp ${particle.duration}s ${particle.delay}s linear infinite`,
            }}
          />
        ))}
      </div>

      {!showLoginForm && rememberedAccounts.length > 0 ? (
        <div
          className="relative z-10 flex flex-col items-center w-full max-w-sm gap-7"
          style={{ animation: "fadeInDown 0.6s ease both" }}
        >
          {/* Logo */}
          <div className="flex flex-col items-center gap-3">
            <Link href="/">
              <div className="group relative flex h-[72px] w-[72px] cursor-pointer items-center justify-center rounded-[22px] bg-gradient-to-br from-indigo-600 to-blue-600 shadow-lg shadow-indigo-300/40 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-indigo-400/50">
                {/* pulse ring */}
                <span
                  className="absolute inset-[-6px] rounded-[28px] border-2 border-indigo-400/30"
                  style={{ animation: "pulseRing 2.4s ease-out infinite" }}
                />
                <svg
                  className="text-white h-9 w-9"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                  />
                </svg>
              </div>
            </Link>

            <h1 className="text-3xl font-bold tracking-tight text-transparent bg-gradient-to-br from-indigo-900 via-indigo-700 to-blue-700 bg-clip-text">
              Chat Me Now
            </h1>

            <span className="rounded-full border border-white/80 bg-white/70 px-4 py-1.5 text-sm font-medium text-slate-500 backdrop-blur-sm">
              Chọn tài khoản để tiếp tục
            </span>
          </div>

          {/* Account cards */}
          <div className="flex flex-col w-full gap-3">
            {rememberedAccounts.map((account, index) => (
              <div
                key={account.rememberToken}
                className="relative group"
                style={{
                  animation: `cardIn 0.5s ${0.1 + index * 0.1}s ease both`,
                }}
              >
                <button
                  onClick={() =>
                    rememberedLogin({
                      rememberToken: account.rememberToken,
                      deviceId: account.rememberProfile.deviceId,
                    })
                  }
                  disabled={isRememberedLoginPending}
                  className="relative flex w-full items-center gap-4 overflow-hidden rounded-2xl border border-white/90 bg-white/90 p-3.5 shadow-sm backdrop-blur-md transition-all duration-300 hover:-translate-y-1 hover:border-indigo-200 hover:shadow-lg hover:shadow-indigo-100 active:scale-[0.98] disabled:opacity-50"
                >
                  {/* shimmer overlay */}
                  <span className="absolute inset-0 transition-transform duration-700 -translate-x-full bg-gradient-to-r from-transparent via-indigo-50/60 to-transparent group-hover:translate-x-full" />

                  {/* Avatar */}
                  <div className="relative flex-shrink-0 transition-transform duration-300 group-hover:scale-105 group-hover:-rotate-2">
                    <PresignedAvatar
                      avatarKey={account.rememberProfile.avatar}
                      displayName={account.rememberProfile.displayName}
                      className="w-12 h-12 rounded-2xl ring-2 ring-indigo-100"
                      fallbackClassName="text-base font-semibold"
                    />
                    {index === 0 && (
                      <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white bg-emerald-400" />
                    )}
                  </div>

                  {/* Info */}
                  <div className="relative z-10 flex-1 min-w-0 text-left">
                    <p className="text-sm font-semibold truncate text-slate-900">
                      {account.rememberProfile.displayName}
                    </p>
                    <p className="mt-0.5 truncate text-xs text-slate-400">
                      {account.rememberProfile.email}
                    </p>
                    {index === 0 && (
                      <span className="mt-1 inline-block rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-medium text-indigo-600">
                        Đăng nhập gần đây
                      </span>
                    )}
                  </div>

                  {/* Arrow */}
                  <ChevronRight className="relative z-10 flex-shrink-0 w-4 h-4 transition-all duration-200 text-slate-300 group-hover:translate-x-1 group-hover:text-indigo-500" />
                </button>

                {/* Delete button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    revokeAccount({
                      rememberToken: account.rememberToken,
                      deviceId: account.rememberProfile.deviceId,
                    });
                  }}
                  disabled={isRevokePending}
                  className="absolute right-2.5 top-2.5 flex h-6 w-6 items-center justify-center rounded-full bg-black/5 text-slate-400 opacity-0 transition-all duration-200 hover:bg-red-50 hover:text-red-500 group-hover:opacity-100 sm:opacity-0"
                  title="Xóa tài khoản này"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>

          {/* Divider */}
          <div className="flex items-center w-full gap-3">
            <div className="flex-1 h-px bg-black/8" />
            <span className="text-sm text-slate-400">hoặc</span>
            <div className="flex-1 h-px bg-black/8" />
          </div>

          {/* Action buttons */}
          <div className="flex w-full gap-3">
            <button
              type="button"
              onClick={() => setShowLoginForm(true)}
              className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-indigo-600 to-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-md shadow-indigo-200 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-indigo-300 active:scale-95"
            >
              <Plus className="w-4 h-4" />
              Tài khoản khác
            </button>

            <Link
              href="/signup"
              className="flex flex-1 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white/80 px-4 py-3 text-sm font-semibold text-slate-700 backdrop-blur-sm transition-all duration-200 hover:-translate-y-0.5 hover:bg-white hover:shadow-md active:scale-95"
            >
              <UserPlus className="w-4 h-4" />
              Đăng ký mới
            </Link>
          </div>

          <p className="text-xs text-slate-400">
            © 2026 Chat Me Now. All rights reserved.
          </p>
        </div>
      ) : (
        /* ────────────────────────────────────────────
            LOGIN FORM
        ──────────────────────────────────────────── */
        <div
          className="relative z-10 w-full max-w-md"
          style={{ animation: "fadeInUp 0.5s ease both" }}
        >
          <div className="transition-shadow duration-300 border shadow-xl rounded-3xl border-white/80 bg-white/90 p-7 backdrop-blur-md hover:shadow-2xl">
            {showUnlockScreen ? (
              <>
                <div className="flex flex-col items-center gap-3 mb-6 text-center">
                  <h1 className="text-2xl font-bold text-slate-900">Mở khóa tài khoản</h1>
                  <p className="text-sm text-slate-500">
                    Tài khoản của bạn đang tạm khóa. Nhập email và OTP để mở khóa.
                  </p>
                </div>

                <div className="space-y-4">
                  <Input
                    type="email"
                    placeholder="Email tài khoản"
                    value={unlockEmail}
                    onChange={(e) => setUnlockEmail(e.target.value)}
                    className="h-11"
                  />

                  {unlockOtpSent && (
                    <div className="grid grid-cols-6 gap-2">
                      {Array.from({ length: 6 }).map((_, index) => (
                        <Input
                          key={`unlock-otp-${index}`}
                          ref={(el) => {
                            unlockOtpInputRefs.current[index] = el;
                          }}
                          inputMode="numeric"
                          autoComplete="one-time-code"
                          maxLength={1}
                          value={unlockOtp[index] || ""}
                          onChange={(e) =>
                            handleUnlockOtpDigitChange(index, e.target.value)
                          }
                          onKeyDown={(e) => handleUnlockOtpKeyDown(index, e)}
                          onPaste={handleUnlockOtpPaste}
                          className="h-11 text-center text-base font-semibold tracking-wide"
                        />
                      ))}
                    </div>
                  )}

                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleSendUnlockOtp}
                      disabled={isSendingUnlockOtp}
                      className="flex-1"
                    >
                      {isSendingUnlockOtp
                        ? "Đang gửi..."
                        : unlockOtpSent
                          ? "Gửi lại OTP"
                          : "Gửi OTP"}
                    </Button>
                    <Button
                      type="button"
                      onClick={handleConfirmUnlock}
                      disabled={!unlockOtpSent || isConfirmingUnlock}
                      className="flex-1 bg-rose-600 hover:bg-rose-700"
                    >
                      {isConfirmingUnlock ? "Đang xác thực..." : "Mở khóa"}
                    </Button>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setShowUnlockScreen(false);
                      setUnlockOtp("");
                      setUnlockOtpSent(false);
                    }}
                    className="w-full text-sm text-center text-slate-500 hover:text-slate-700"
                  >
                    ← Quay lại đăng nhập
                  </button>
                </div>
              </>
            ) : (
              <>
            {/* Logo + Title */}
            <div className="flex flex-col items-center gap-3 mb-6">
              <Link href="/">
                <div className="group relative flex h-16 w-16 cursor-pointer items-center justify-center rounded-[20px] bg-gradient-to-br from-indigo-600 to-blue-600 shadow-md shadow-indigo-200 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-indigo-300">
                  <span
                    className="absolute inset-[-5px] rounded-[25px] border-2 border-indigo-400/25"
                    style={{ animation: "pulseRing 2.4s ease-out infinite" }}
                  />
                  <svg
                    className="w-8 h-8 text-white"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2}
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                    />
                  </svg>
                </div>
              </Link>
              <h1 className="text-2xl font-bold text-slate-900">Đăng nhập</h1>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              {/* Email */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700">
                  Email
                </label>
                <div className="relative">
                  <Mail className="absolute w-4 h-4 -translate-y-1/2 left-3 top-1/2 text-slate-400" />
                  <Input
                    type="email"
                    placeholder="example@email.com"
                    className="pl-10 pr-4 transition-all duration-200 h-11 border-slate-200 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/30 focus:shadow-sm"
                    {...register("email")}
                  />
                </div>
                {errors.email && (
                  <p className="flex items-center gap-1.5 text-xs text-red-500">
                    <span className="flex-shrink-0 w-1 h-1 bg-red-500 rounded-full" />
                    {errors.email.message}
                  </p>
                )}
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700">
                  Mật khẩu
                </label>
                <div className="relative">
                  <Lock className="absolute w-4 h-4 -translate-y-1/2 left-3 top-1/2 text-slate-400" />
                  <Input
                    type={showPassword ? "text" : "password"}
                    placeholder="Nhập mật khẩu của bạn"
                    className="pl-10 pr-12 transition-all duration-200 h-11 border-slate-200 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/30 focus:shadow-sm"
                    {...register("password")}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute transition-colors -translate-y-1/2 right-3 top-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
                {errors.password && (
                  <p className="flex items-center gap-1.5 text-xs text-red-500">
                    <span className="flex-shrink-0 w-1 h-1 bg-red-500 rounded-full" />
                    {errors.password.message}
                  </p>
                )}
              </div>

              {/* Remember + Forgot */}
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={rememberAccount}
                    onChange={(e) => setRememberAccount(e.target.checked)}
                    className="w-4 h-4 text-indigo-600 rounded cursor-pointer border-slate-300 focus:ring-indigo-500"
                  />
                  <span className="text-sm text-slate-600">
                    Ghi nhớ tài khoản
                  </span>
                </label>
                <Link
                  href="/forgot-password"
                  className="text-sm font-medium text-indigo-600 transition-colors hover:text-indigo-800 hover:underline"
                >
                  Quên mật khẩu?
                </Link>
              </div>
              {/* Turnstile */}
              <div className="flex flex-col items-center">
                {turnstileSiteKey ? (
                  <TurnstileWidget
                    siteKey={turnstileSiteKey}
                    resetSignal={turnstileResetSignal}
                    onVerify={(token) => {
                      setTurnstileToken(token);
                      setTurnstileError("");
                    }}
                    onExpire={() => {
                      setTurnstileToken("");
                      setTurnstileError(
                        "Phiên xác thực Turnstile đã hết hạn. Vui lòng xác thực lại.",
                      );
                    }}
                    onError={(message) => {
                      setTurnstileToken("");
                      setTurnstileError(message);
                    }}
                  />
                ) : (
                  <p className="text-xs text-red-500">
                    Thiếu site key Turnstile. Hãy thêm biến môi trường
                    NEXT_PUBLIC_CLOUDFLARE_TURNSTILE_SITE_KEY.
                  </p>
                )}
              </div>

              {/* Error */}
              {formErrorMessage && (
                <div
                  className="px-4 py-3 text-sm text-red-600 border border-red-100 rounded-xl bg-red-50"
                  role="alert"
                >
                  {formErrorMessage}
                </div>
              )}

              {/* Submit */}
              <Button
                type="submit"
                disabled={isPending || !turnstileSiteKey}
                className="h-11 w-full rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 font-semibold text-white shadow-md shadow-indigo-200/60 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-indigo-300/60 active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isPending ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg
                      className="w-4 h-4 animate-spin"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                    Đang xử lý...
                  </span>
                ) : (
                  "Đăng nhập"
                )}
              </Button>
            </form>

            {/* Divider */}
            <div className="relative my-5">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-100" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="px-4 bg-white text-slate-400">hoặcc</span>
              </div>
            </div>

            {/* Sign up */}
            <p className="text-sm text-center text-slate-500">
              Chưa có tài khoản?{" "}
              <Link
                href="/signup"
                className="font-semibold text-indigo-600 transition-colors hover:text-indigo-800 hover:underline"
              >
                Đăng ký ngay
              </Link>
            </p>

            {/* Back to accounts */}
            {rememberedAccounts.length > 0 && (
              <div className="pt-4 mt-5 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowLoginForm(false)}
                  className="w-full text-sm text-center transition-colors text-slate-400 hover:text-slate-700"
                >
                  ← Quay lại chọn tài khoản
                </button>
              </div>
            )}
              </>
            )}
          </div>

          <p className="mt-4 text-xs text-center text-slate-400">
            © 2026 Chat Me Now. All rights reserved.
          </p>
        </div>
      )}

      {/* ── Global keyframes ── */}
      <style>{`
        @keyframes floatUp {
          0%   { transform: translateY(0) scale(0); opacity: 0; }
          10%  { opacity: 0.6; }
          90%  { opacity: 0.3; }
          100% { transform: translateY(-110vh) scale(1); opacity: 0; }
        }
        @keyframes blobMove1 {
          0%, 100% { transform: translate(0,0) scale(1); }
          33%       { transform: translate(30px,-40px) scale(1.1); }
          66%       { transform: translate(-20px,20px) scale(0.95); }
        }
        @keyframes blobMove2 {
          0%, 100% { transform: translate(0,0) scale(1); }
          33%       { transform: translate(-40px,20px) scale(1.05); }
          66%       { transform: translate(20px,-30px) scale(0.9); }
        }
        @keyframes fadeInDown {
          from { opacity: 0; transform: translateY(-20px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes cardIn {
          from { opacity: 0; transform: translateY(24px) scale(0.96); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes pulseRing {
          0%   { transform: scale(1); opacity: 0.6; }
          100% { transform: scale(1.5); opacity: 0; }
        }
      `}</style>
    </div>
  );
}
