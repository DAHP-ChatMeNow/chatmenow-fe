"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useRegister, useSendOtp, useVerifyOtp } from "@/hooks/use-auth";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useState, useEffect, useRef, useCallback } from "react";
import { Eye, EyeOff, Mail, Lock, User, ShieldCheck, ArrowLeft, ArrowRight } from "lucide-react";

// Schema cho bước 1: nhập email
const emailSchema = z.object({
  email: z.string().email("Email không hợp lệ"),
});

// Schema cho bước 3: nhập thông tin đăng ký  
const registerSchema = z
  .object({
    displayName: z.string().min(2, "Tên phải có ít nhất 2 ký tự"),
    password: z.string().min(6, "Mật khẩu phải có ít nhất 6 ký tự"),
    confirmPassword: z.string().min(6, "Vui lòng nhập lại mật khẩu"),
    acceptTerms: z.boolean().refine((value) => value, {
      message: "Bạn cần đồng ý với điều khoản để tiếp tục",
    }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Mật khẩu không khớp",
    path: ["confirmPassword"],
  });

type EmailFormValues = z.infer<typeof emailSchema>;
type RegisterFormValues = z.infer<typeof registerSchema>;

const OTP_LENGTH = 6;
const RESEND_COOLDOWN = 60;

export default function SignupPage() {
  const { mutate: register, isPending: isRegistering } = useRegister();
  const { mutate: sendOtp, isPending: isSendingOtp } = useSendOtp();
  const { mutate: verifyOtp, isPending: isVerifyingOtp } = useVerifyOtp();

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [email, setEmail] = useState("");
  const [otpValues, setOtpValues] = useState<string[]>(Array(OTP_LENGTH).fill(""));
  const [otpVerified, setOtpVerified] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [countdown, setCountdown] = useState(0);

  const otpInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Form cho bước 1
  const {
    register: registerEmailField,
    handleSubmit: handleEmailSubmit,
    formState: { errors: emailErrors },
  } = useForm<EmailFormValues>({
    resolver: zodResolver(emailSchema),
  });

  // Form cho bước 3
  const {
    register: registerField,
    handleSubmit: handleRegisterSubmit,
    formState: { errors: registerErrors },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
  });

  // Countdown timer cho nút gửi lại OTP
  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setInterval(() => {
      setCountdown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [countdown]);

  // Bước 1: Gửi OTP
  const onEmailSubmit = useCallback(
    (data: EmailFormValues) => {
      setEmail(data.email);
      sendOtp(
        { email: data.email },
        {
          onSuccess: () => {
            setStep(2);
            setCountdown(RESEND_COOLDOWN);
          },
        },
      );
    },
    [sendOtp],
  );

  // Gửi lại OTP
  const handleResendOtp = useCallback(() => {
    if (countdown > 0 || !email) return;
    sendOtp(
      { email },
      {
        onSuccess: () => {
          setOtpValues(Array(OTP_LENGTH).fill(""));
          setCountdown(RESEND_COOLDOWN);
          otpInputRefs.current[0]?.focus();
        },
      },
    );
  }, [countdown, email, sendOtp]);

  // Xử lý nhập OTP
  const handleOtpChange = useCallback(
    (index: number, value: string) => {
      if (!/^\d*$/.test(value)) return;

      const newValues = [...otpValues];
      newValues[index] = value.slice(-1);
      setOtpValues(newValues);

      // Tự động chuyển sang ô tiếp theo
      if (value && index < OTP_LENGTH - 1) {
        otpInputRefs.current[index + 1]?.focus();
      }

      // Tự động xác thực khi nhập đủ
      const fullOtp = newValues.join("");
      if (fullOtp.length === OTP_LENGTH) {
        verifyOtp(
          { email, otp: fullOtp },
          {
            onSuccess: () => {
              setOtpVerified(true);
              setStep(3);
            },
          },
        );
      }
    },
    [otpValues, email, verifyOtp],
  );

  const handleOtpKeyDown = useCallback(
    (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Backspace" && !otpValues[index] && index > 0) {
        otpInputRefs.current[index - 1]?.focus();
      }
    },
    [otpValues],
  );

  const handleOtpPaste = useCallback(
    (e: React.ClipboardEvent) => {
      e.preventDefault();
      const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, OTP_LENGTH);
      if (!pasted) return;

      const newValues = [...otpValues];
      for (let i = 0; i < pasted.length; i++) {
        newValues[i] = pasted[i];
      }
      setOtpValues(newValues);

      const focusIndex = Math.min(pasted.length, OTP_LENGTH - 1);
      otpInputRefs.current[focusIndex]?.focus();

      if (pasted.length === OTP_LENGTH) {
        verifyOtp(
          { email, otp: pasted },
          {
            onSuccess: () => {
              setOtpVerified(true);
              setStep(3);
            },
          },
        );
      }
    },
    [otpValues, email, verifyOtp],
  );

  // Bước 3: Đăng ký
  const onRegisterSubmit = useCallback(
    (data: RegisterFormValues) => {
      if (!otpVerified) return;
      register({
        displayName: data.displayName,
        email,
        password: data.password,
      });
    },
    [otpVerified, email, register],
  );

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
            <h2 className="text-2xl font-bold text-slate-900">
              Đăng ký tài khoản
            </h2>
          </div>

          {/* Step Indicator */}
          <div className="flex items-center justify-center gap-2">
            {[1, 2, 3].map((s) => (
              <div key={s} className="flex items-center gap-2">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-all duration-300 ${
                    step >= s
                      ? "bg-blue-600 text-white shadow-md shadow-blue-200"
                      : "bg-slate-100 text-slate-400"
                  }`}
                >
                  {s}
                </div>
                {s < 3 && (
                  <div
                    className={`w-8 h-0.5 transition-all duration-300 ${
                      step > s ? "bg-blue-600" : "bg-slate-200"
                    }`}
                  />
                )}
              </div>
            ))}
          </div>

          {/* Step 1: Email Input */}
          {step === 1 && (
            <form onSubmit={handleEmailSubmit(onEmailSubmit)} className="space-y-5">
              <p className="text-sm text-slate-500 text-center">
                Nhập email của bạn để nhận mã xác thực
              </p>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">
                  Email
                </label>
                <div className="relative">
                  <Mail className="absolute w-5 h-5 -translate-y-1/2 left-3 top-1/2 text-slate-400" />
                  <Input
                    type="email"
                    placeholder="example@gmail.com"
                    className="h-12 pl-10 pr-4 border-slate-200 focus:border-blue-500 focus:ring-blue-500"
                    {...registerEmailField("email")}
                  />
                </div>
                {emailErrors.email && (
                  <p className="flex items-center gap-1 text-xs text-red-600">
                    <span className="inline-block w-1 h-1 bg-red-600 rounded-full"></span>
                    {emailErrors.email.message}
                  </p>
                )}
              </div>

              <Button
                type="submit"
                disabled={isSendingOtp}
                className="w-full h-12 font-semibold text-white transition-all shadow-lg bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 rounded-xl shadow-blue-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSendingOtp ? (
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
                    Đang gửi mã...
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    Gửi mã xác thực
                    <ArrowRight className="w-4 h-4" />
                  </span>
                )}
              </Button>
            </form>
          )}

          {/* Step 2: OTP Verification */}
          {step === 2 && (
            <div className="space-y-5">
              <div className="text-center space-y-1">
                <div className="inline-flex p-3 bg-blue-50 rounded-2xl mb-2">
                  <ShieldCheck className="w-8 h-8 text-blue-600" />
                </div>
                <p className="text-sm text-slate-500">
                  Mã xác thực đã được gửi đến
                </p>
                <p className="text-sm font-semibold text-blue-600">{email}</p>
              </div>

              {/* OTP Input Fields */}
              <div className="flex justify-center gap-2" onPaste={handleOtpPaste}>
                {otpValues.map((value, index) => (
                  <input
                    key={index}
                    ref={(el) => { otpInputRefs.current[index] = el; }}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={value}
                    onChange={(e) => handleOtpChange(index, e.target.value)}
                    onKeyDown={(e) => handleOtpKeyDown(index, e)}
                    className={`w-12 h-14 text-center text-xl font-bold border-2 rounded-xl transition-all outline-none ${
                      value
                        ? "border-blue-500 bg-blue-50 text-blue-700"
                        : "border-slate-200 bg-white text-slate-900"
                    } focus:border-blue-500 focus:ring-2 focus:ring-blue-200`}
                    disabled={isVerifyingOtp}
                  />
                ))}
              </div>

              {isVerifyingOtp && (
                <div className="flex items-center justify-center gap-2 text-sm text-blue-600">
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
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  Đang xác thực...
                </div>
              )}

              {/* Resend OTP */}
              <div className="text-center">
                {countdown > 0 ? (
                  <p className="text-sm text-slate-500">
                    Gửi lại mã sau{" "}
                    <span className="font-semibold text-blue-600">
                      {countdown}s
                    </span>
                  </p>
                ) : (
                  <button
                    type="button"
                    onClick={handleResendOtp}
                    disabled={isSendingOtp}
                    className="text-sm font-semibold text-blue-600 hover:text-blue-700 hover:underline disabled:opacity-50"
                  >
                    {isSendingOtp ? "Đang gửi..." : "Gửi lại mã xác thực"}
                  </button>
                )}
              </div>

              {/* Back button */}
              <button
                type="button"
                onClick={() => {
                  setStep(1);
                  setOtpValues(Array(OTP_LENGTH).fill(""));
                }}
                className="flex items-center justify-center gap-1 w-full text-sm text-slate-500 hover:text-slate-700 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Quay lại
              </button>
            </div>
          )}

          {/* Step 3: Registration Form */}
          {step === 3 && (
            <form onSubmit={handleRegisterSubmit(onRegisterSubmit)} className="space-y-5">
              {/* Verified Email Badge */}
              <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-xl">
                <ShieldCheck className="w-5 h-5 text-green-600 flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs text-green-600 font-medium">Email đã xác thực</p>
                  <p className="text-sm text-green-700 font-semibold truncate">{email}</p>
                </div>
              </div>

              {/* Display Name Field */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">
                  Họ và tên
                </label>
                <div className="relative">
                  <User className="absolute w-5 h-5 -translate-y-1/2 left-3 top-1/2 text-slate-400" />
                  <Input
                    type="text"
                    placeholder="Nguyễn Văn A"
                    className="h-12 pl-10 pr-4 border-slate-200 focus:border-blue-500 focus:ring-blue-500"
                    {...registerField("displayName")}
                  />
                </div>
                {registerErrors.displayName && (
                  <p className="flex items-center gap-1 text-xs text-red-600">
                    <span className="inline-block w-1 h-1 bg-red-600 rounded-full"></span>
                    {registerErrors.displayName.message}
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
                    {...registerField("password")}
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
                {registerErrors.password && (
                  <p className="flex items-center gap-1 text-xs text-red-600">
                    <span className="inline-block w-1 h-1 bg-red-600 rounded-full"></span>
                    {registerErrors.password.message}
                  </p>
                )}
              </div>

              {/* Confirm Password Field */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">
                  Nhập lại mật khẩu
                </label>
                <div className="relative">
                  <Lock className="absolute w-5 h-5 -translate-y-1/2 left-3 top-1/2 text-slate-400" />
                  <Input
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="Nhập lại mật khẩu của bạn"
                    className="h-12 pl-10 pr-12 border-slate-200 focus:border-blue-500 focus:ring-blue-500"
                    {...registerField("confirmPassword")}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute transition-colors -translate-y-1/2 right-3 top-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="w-5 h-5" />
                    ) : (
                      <Eye className="w-5 h-5" />
                    )}
                  </button>
                </div>
                {registerErrors.confirmPassword && (
                  <p className="flex items-center gap-1 text-xs text-red-600">
                    <span className="inline-block w-1 h-1 bg-red-600 rounded-full"></span>
                    {registerErrors.confirmPassword.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <label className="flex items-start gap-3 text-sm text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    className="w-4 h-4 mt-0.5 accent-blue-600"
                    {...registerField("acceptTerms")}
                  />
                  <span>
                    Tôi đã đọc và đồng ý với{" "}
                    <Link
                      href="/policy#terms"
                      className="font-semibold text-blue-600 hover:text-blue-700 hover:underline"
                    >
                      Điều khoản sử dụng
                    </Link>{" "}
                    và{" "}
                    <Link
                      href="/policy#privacy"
                      className="font-semibold text-blue-600 hover:text-blue-700 hover:underline"
                    >
                      Chính sách bảo mật
                    </Link>
                    .
                  </span>
                </label>
                {registerErrors.acceptTerms && (
                  <p className="flex items-center gap-1 text-xs text-red-600">
                    <span className="inline-block w-1 h-1 bg-red-600 rounded-full"></span>
                    {registerErrors.acceptTerms.message}
                  </p>
                )}
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                disabled={isRegistering}
                className="w-full h-12 font-semibold text-white transition-all shadow-lg bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 rounded-xl shadow-blue-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isRegistering ? (
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
                  "Đăng ký"
                )}
              </Button>

              {/* Back button */}
              <button
                type="button"
                onClick={() => setStep(1)}
                className="flex items-center justify-center gap-1 w-full text-sm text-slate-500 hover:text-slate-700 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Đăng ký với email khác
              </button>
            </form>
          )}

          {/* Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-white text-slate-500">hoặc</span>
            </div>
          </div>

          {/* Login Link */}
          <div className="text-center">
            <p className="text-sm text-slate-600">
              Đã có tài khoản?{" "}
              <Link
                href="/login"
                className="font-semibold text-blue-600 hover:text-blue-700 hover:underline"
              >
                Đăng nhập ngay
              </Link>
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-4 text-xs text-center text-slate-500">
          <p>© 2026 Chat Me Now. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
}
