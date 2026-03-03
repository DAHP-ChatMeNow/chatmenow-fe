"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useLogin } from "@/hooks/use-auth";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useState } from "react";
import { Eye, EyeOff, Mail, Lock } from "lucide-react";

const loginSchema = z.object({
  email: z.string().email("Email không hợp lệ"),
  password: z.string().min(6, "Mật khẩu phải có ít nhất 6 ký tự"),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const { mutate: login, isPending } = useLogin();
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = (data: LoginFormValues) => {
    login(data);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-6 bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="w-full max-w-md">
        {/* Form Card */}
        <div className="p-8 space-y-6 bg-white shadow-xl rounded-3xl">
          {/* Logo and Title */}
          <div className="space-y-2 text-center">
            <Link href="/">
              <div className="inline-block p-3 bg-blue-600 rounded-2xl cursor-pointer hover:bg-blue-700 transition-colors">
                <svg
                  className="w-8 h-8 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                  />
                </svg>
              </div>
            </Link>
            <h2 className="text-2xl font-bold text-slate-900">Đăng nhập</h2>
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
                  placeholder="example@email.com"
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

            {/* Forgot Password */}
            <div className="flex justify-end">
              <Link
                href="/forgot-password"
                className="text-sm font-medium text-blue-600 hover:text-blue-700 hover:underline"
              >
                Quên mật khẩu?
              </Link>
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              disabled={isPending}
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

          {/* Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-white text-slate-500">hoặc</span>
            </div>
          </div>

          {/* Sign Up Link */}
          <div className="text-center">
            <p className="text-sm text-slate-600">
              Chưa có tài khoản?{" "}
              <Link
                href="/signup"
                className="font-semibold text-blue-600 hover:text-blue-700 hover:underline"
              >
                Đăng ký ngay
              </Link>
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 text-xs text-center text-slate-500">
          <p>© 2026 Chat Me Now. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
}
