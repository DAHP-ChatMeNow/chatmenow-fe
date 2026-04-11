"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TurnstileWidget } from "@/components/auth/turnstile-widget";
import { useAdminLogin } from "@/hooks/use-auth";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useMemo, useState } from "react";
import { Eye, EyeOff, Mail, Lock, ShieldCheck } from "lucide-react";
import { getDeviceId, getDeviceName } from "@/lib/device-utils";

const loginSchema = z.object({
  email: z.string().email("Email không hợp lệ"),
  password: z.string().min(6, "Mật khẩu phải có ít nhất 6 ký tự"),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function AdminLoginPage() {
  const { mutate: login, isPending } = useAdminLogin();
  const [showPassword, setShowPassword] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState("");
  const [turnstileError, setTurnstileError] = useState("");
  const [loginError, setLoginError] = useState("");
  const [turnstileResetSignal, setTurnstileResetSignal] = useState(0);

  const turnstileSiteKey =
    process.env.NEXT_PUBLIC_CLOUDFLARE_TURNSTILE_SITE_KEY ?? "";

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
  });

  const formErrorMessage = useMemo(() => {
    if (loginError) return loginError;
    if (turnstileError) return turnstileError;
    return "";
  }, [loginError, turnstileError]);

  const onSubmit = (data: LoginFormValues) => {
    setLoginError("");
    setTurnstileError("");

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

    login(
      {
        ...data,
        turnstileToken,
        deviceId: getDeviceId(),
        deviceName: getDeviceName(),
      },
      {
        onError: (error) => {
          const message =
            error instanceof Error
              ? error.message
              : "Đăng nhập thất bại. Vui lòng thử lại.";

          setLoginError(message);
          setTurnstileToken("");
          setTurnstileResetSignal((prev) => prev + 1);
        },
      },
    );
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-6 bg-gradient-to-br from-slate-50 via-white to-blue-50">
      <div className="w-full max-w-md">
        <div className="p-8 space-y-6 bg-white shadow-xl rounded-3xl">
          {/* Logo and Title */}
          <div className="space-y-2 text-center">
            <div className="inline-block p-3 bg-blue-600 rounded-2xl">
              <ShieldCheck className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900">
              Đăng nhập Quản trị
            </h2>
            <p className="text-sm text-slate-500">
              Vui lòng đăng nhập bằng tài khoản quản trị viên
            </p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            {/* Email Field */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute w-5 h-5 -translate-y-1/2 left-3 top-1/2 text-slate-400" />
                <Input
                  type="email"
                  placeholder="admin@email.com"
                  className="h-12 pl-10 pr-4 border-slate-200 focus:border-blue-500 focus:ring-blue-500"
                  {...register("email")}
                />
              </div>
              {errors.email && (
                <p className="flex items-center gap-1 text-xs text-red-600">
                  <span className="inline-block w-1 h-1 bg-red-600 rounded-full"></span>
                  {errors.email.message}
                </p>
              )}
            </div>

            {/* Password Field */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">
                Mật khẩu
              </label>
              <div className="relative">
                <Lock className="absolute w-5 h-5 -translate-y-1/2 left-3 top-1/2 text-slate-400" />
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder="Nhập mật khẩu của bạn"
                  className="h-12 pl-10 pr-12 border-slate-200 focus:border-blue-500 focus:ring-blue-500"
                  {...register("password")}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute transition-colors -translate-y-1/2 right-3 top-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>
              {errors.password && (
                <p className="flex items-center gap-1 text-xs text-red-600">
                  <span className="inline-block w-1 h-1 bg-red-600 rounded-full"></span>
                  {errors.password.message}
                </p>
              )}
            </div>

            <div className="flex flex-col items-center space-y-2">
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
                <p className="text-xs text-red-600">
                  Thiếu site key Turnstile. Hãy thêm biến môi trường
                  NEXT_PUBLIC_CLOUDFLARE_TURNSTILE_SITE_KEY.
                </p>
              )}
            </div>

            {formErrorMessage && (
              <p className="text-sm text-red-600" role="alert">
                {formErrorMessage}
              </p>
            )}

            {/* Submit Button */}
            <Button
              type="submit"
              disabled={isPending || !turnstileSiteKey}
              className="w-full h-12 font-semibold text-white transition-all shadow-lg bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 rounded-xl shadow-blue-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isPending ? (
                <span className="flex items-center justify-center gap-2">
                  <svg
                    className="w-5 h-5 animate-spin"
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
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  Đang xử lý...
                </span>
              ) : (
                "Đăng nhập"
              )}
            </Button>
          </form>
        </div>

        {/* Footer */}
        <div className="mt-8 text-xs text-center text-slate-500">
          <p>© 2026 Chat Me Now - Admin Panel</p>
        </div>
      </div>
    </div>
  );
}
