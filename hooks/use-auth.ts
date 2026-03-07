"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import {
  authService,
  LoginPayload,
  RegisterPayload,
  AuthResponse,
} from "@/api/auth";
import { useAuthStore } from "@/store/use-auth-store";
import { useEffect } from "react";

const getErrorMessage = (error: unknown) => {
  if (isAxiosError(error)) {
    return (
      (error.response?.data as { message?: string })?.message ||
      error.message ||
      "Đã xảy ra lỗi. Vui lòng thử lại."
    );
  }
  if (error instanceof Error) return error.message;
  return "Đã xảy ra lỗi. Vui lòng thử lại.";
};

export const useLogin = () => {
  const setAuth = useAuthStore((state) => state.setAuth);
  const router = useRouter();

  return useMutation<AuthResponse, unknown, LoginPayload>({
    mutationFn: authService.login,
    onSuccess: (data) => {
      setAuth(data.user, data.token, data.role);
      toast.success(data.message ?? "Đăng nhập thành công");
      if (data.role === "admin") {
        router.push("/admin");
      } else {
        router.push("/messages");
      }
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
