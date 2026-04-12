"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import {
  authService,
  LoginPayload,
  RegisterPayload,
  SendOtpPayload,
  VerifyOtpPayload,
  OtpResponse,
  AuthResponse,
} from "@/api/auth";
import {
  RememberedLoginPayload,
  RevokeRememberedAccountPayload,
} from "@/types/auth";
import { useAuthStore } from "@/store/use-auth-store";
import { useEffect } from "react";
import { getDefaultRouteForClient } from "@/lib/default-route";
import { userService } from "@/api/user";

const getErrorMessage = (error: unknown) => {
  if (isAxiosError(error)) {
    const status = error.response?.status;
    const data =
      (error.response?.data as
        | { message?: string; code?: string; errorCode?: string }
        | undefined) ?? {};
    const code = data.code || data.errorCode;
    const rawMessage = data.message || "";
    const normalizedMessage = rawMessage.toLowerCase();

    const isAccountLocked =
      code === "ACCOUNT_LOCKED" ||
      /(locked|bị khóa|khoa tai khoan)/i.test(normalizedMessage);
    const isAccountSuspended =
      code === "ACCOUNT_SUSPENDED" ||
      /(suspended|đình chỉ|dinh chi)/i.test(normalizedMessage);
    const isAccountInactive =
      code === "ACCOUNT_INACTIVE" ||
      /(inactive|vô hiệu|vo hieu)/i.test(normalizedMessage);

    if ((status === 401 || status === 403) && isAccountLocked) {
      return "Tài khoản của bạn đã bị khóa. Vui lòng liên hệ quản trị viên.";
    }

    if ((status === 401 || status === 403) && isAccountSuspended) {
      return "Tài khoản của bạn đang bị đình chỉ tạm thời.";
    }

    if ((status === 401 || status === 403) && isAccountInactive) {
      return "Tài khoản của bạn hiện không thể đăng nhập.";
    }

    return data.message || error.message || "Đã xảy ra lỗi. Vui lòng thử lại.";
  }
  if (error instanceof Error) return error.message;
  return "Đã xảy ra lỗi. Vui lòng thử lại.";
};

const isDirectAvatarUrl = (avatar?: string | null) => {
  if (!avatar) return false;
  return (
    avatar.startsWith("http://") ||
    avatar.startsWith("https://") ||
    avatar.startsWith("data:") ||
    avatar.startsWith("blob:") ||
    avatar.startsWith("/")
  );
};

export const useLogin = () => {
  const setAuth = useAuthStore((state) => state.setAuth);
  const addRememberedAccount = useAuthStore(
    (state) => state.addRememberedAccount,
  );
  const router = useRouter();

  return useMutation<AuthResponse, unknown, LoginPayload>({
    mutationFn: authService.login,
    onSuccess: async (data, variables) => {
      if (data.role === "admin") {
        toast.error("Tài khoản admin không thể đăng nhập tại trang người dùng");
        return;
      }

      // Save token first so follow-up APIs (presigned URL) can use Authorization header.
      setAuth(data.user, data.token, data.role, data.rememberToken);

      // Handle remember account
      if (data.rememberToken && data.user && variables.rememberAccount) {
        let resolvedAvatar = data.user.avatar;

        // Convert S3 key to view URL so login page can render avatar without auth token.
        if (resolvedAvatar && !isDirectAvatarUrl(resolvedAvatar)) {
          try {
            const presigned = await userService.getPresignedUrl(resolvedAvatar);
            resolvedAvatar = presigned.viewUrl;
          } catch {
            // Keep original value and let UI fallback if URL cannot be resolved.
          }
        }

        const rememberedAccount = {
          rememberToken: data.rememberToken,
          rememberProfile: {
            id: data.user.id,
            email: data.user.email || "",
            displayName: data.user.displayName,
            avatar: resolvedAvatar,
            deviceId: variables.deviceId || "unknown",
            deviceName: variables.deviceName || "Unknown Device",
            savedAt: Date.now(),
          },
        };
        addRememberedAccount(rememberedAccount);
      }

      toast.success(data.message ?? "Đăng nhập thành công");
      router.push(getDefaultRouteForClient());
    },
    onError: (error) => {
      toast.error(getErrorMessage(error));
    },
  });
};

export const useAdminLogin = () => {
  const setAuth = useAuthStore((state) => state.setAuth);
  const router = useRouter();

  return useMutation<AuthResponse, unknown, LoginPayload>({
    mutationFn: authService.login,
    onSuccess: (data) => {
      if (data.role !== "admin") {
        toast.error(
          "Tài khoản người dùng không thể đăng nhập tại trang quản trị",
        );
        return;
      }
      setAuth(data.user, data.token, data.role);
      toast.success(data.message ?? "Đăng nhập thành công");
      router.push("/admin/users");
    },
    onError: (error) => {
      toast.error(getErrorMessage(error));
    },
  });
};

export const useSendOtp = () => {
  return useMutation<OtpResponse, unknown, SendOtpPayload>({
    mutationFn: authService.sendOtp,
    onSuccess: (data) => {
      toast.success(data.message ?? "Mã OTP đã được gửi!");
    },
    onError: (error) => {
      toast.error(getErrorMessage(error));
    },
  });
};

export const useVerifyOtp = () => {
  return useMutation<OtpResponse, unknown, VerifyOtpPayload>({
    mutationFn: authService.verifyOtp,
    onSuccess: (data) => {
      toast.success(data.message ?? "Xác thực OTP thành công!");
    },
    onError: (error) => {
      toast.error(getErrorMessage(error));
    },
  });
};

export const useRegister = () => {
  const router = useRouter();

  return useMutation<AuthResponse, unknown, RegisterPayload>({
    mutationFn: authService.register,
    onSuccess: (data) => {
      toast.success(data.message ?? "Đăng ký thành công! Vui lòng đăng nhập.");
      router.push("/login");
    },
    onError: (error) => {
      toast.error(getErrorMessage(error));
    },
  });
};

export const useMe = () => {
  const token = useAuthStore((state) => state.token);
  const role = useAuthStore((state) => state.role);
  const setAuth = useAuthStore((state) => state.setAuth);

  const query = useQuery({
    queryKey: ["me"],
    queryFn: authService.getMe,
    enabled: Boolean(token),
  });

  useEffect(() => {
    if (query.isSuccess && query.data) {
      setAuth(query.data, token!, role ?? undefined);
    }
  }, [query.isSuccess, query.data]);

  useEffect(() => {
    if (query.isError) {
      toast.error(getErrorMessage(query.error));
    }
  }, [query.isError, query.error]);

  return query;
};

export const useRememberedLogin = () => {
  const setAuth = useAuthStore((state) => state.setAuth);
  const removeRememberedAccount = useAuthStore(
    (state) => state.removeRememberedAccount,
  );
  const router = useRouter();

  return useMutation<AuthResponse, unknown, RememberedLoginPayload>({
    mutationFn: authService.rememberedLogin,
    onSuccess: (data) => {
      if (data.role === "admin") {
        toast.error("Tài khoản admin không thể đăng nhập tại trang người dùng");
        return;
      }
      setAuth(data.user, data.token, data.role, data.rememberToken);
      router.push(getDefaultRouteForClient());
    },
    onError: (error, variables) => {
      removeRememberedAccount(variables.rememberToken);
      toast.error(getErrorMessage(error));
    },
  });
};

export const useRevokeRememberedAccount = () => {
  const removeRememberedAccount = useAuthStore(
    (state) => state.removeRememberedAccount,
  );

  return useMutation<unknown, unknown, RevokeRememberedAccountPayload>({
    mutationFn: authService.revokeRememberedAccount,
    onSuccess: (_, variables) => {
      removeRememberedAccount(variables.rememberToken);
      toast.success("Đã xóa tài khoản đã lưu");
    },
    onError: (error) => {
      toast.error(getErrorMessage(error));
    },
  });
};
