"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { premiumService } from "@/services/premium";
import { VnpayCheckoutPayload } from "@/types/premium";

const PREMIUM_ALREADY_ACTIVE_MESSAGE =
  "Bạn đang có gói Premium còn hiệu lực. Vui lòng hủy gia hạn trước khi đăng ký gói mới.";

const getErrorMessage = (error: unknown, fallback: string) => {
  if (!error || typeof error !== "object") return fallback;
  const err = error as { response?: { data?: { message?: string } } };
  return err.response?.data?.message || fallback;
};

const isPremiumAlreadyActiveError = (error: unknown) => {
  if (!error || typeof error !== "object") return false;
  const err = error as {
    response?: { status?: number; data?: { code?: string; errorCode?: string } };
  };
  const status = err.response?.status;
  const code = err.response?.data?.code || err.response?.data?.errorCode;
  return status === 409 && code === "PREMIUM_ALREADY_ACTIVE";
};

export const usePremiumOverview = () => {
  return useQuery({
    queryKey: ["premium", "overview"],
    queryFn: premiumService.getPremiumOverview,
  });
};

export const usePremiumPlans = () => {
  return useQuery({
    queryKey: ["premium", "plans"],
    queryFn: premiumService.getPremiumPlans,
  });
};

export const usePremiumPaymentTemplate = (planCode?: string) => {
  return useQuery({
    queryKey: ["premium", "payment-template", planCode],
    queryFn: () => premiumService.getPaymentTemplate(planCode!),
    enabled: !!planCode,
  });
};

export const useCreateMockCheckout = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (planCode: string) => premiumService.createMockCheckout(planCode),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["premium", "history"] });
      toast.success(data.message || "Đã tạo đơn thanh toán mẫu");
    },
    onError: (error: unknown) => {
      if (isPremiumAlreadyActiveError(error)) {
        toast.error(PREMIUM_ALREADY_ACTIVE_MESSAGE);
        return;
      }
      toast.error(getErrorMessage(error, "Không thể tạo đơn"));
    },
  });
};

export const useConfirmMockCheckout = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (transactionId: string) =>
      premiumService.confirmMockCheckout(transactionId),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["premium", "overview"] });
      queryClient.invalidateQueries({ queryKey: ["premium", "history"] });
      queryClient.invalidateQueries({ queryKey: ["me"] });
      queryClient.invalidateQueries({ queryKey: ["user-profile"] });
      toast.success(data.message || "Đã xác nhận thanh toán mẫu");
    },
    onError: (error: unknown) => {
      toast.error(getErrorMessage(error, "Không thể xác nhận thanh toán"));
    },
  });
};

export const usePremiumHistory = ({
  page = 1,
  limit = 10,
}: {
  page?: number;
  limit?: number;
}) => {
  return useQuery({
    queryKey: ["premium", "history", page, limit],
    queryFn: () => premiumService.getPremiumHistory({ page, limit }),
  });
};

export const useCreateVnpayCheckout = () => {
  return useMutation({
    mutationFn: (payload: VnpayCheckoutPayload) =>
      premiumService.createVnpayCheckout(payload),
    onError: (error: unknown) => {
      if (isPremiumAlreadyActiveError(error)) {
        toast.error(PREMIUM_ALREADY_ACTIVE_MESSAGE);
        return;
      }
      toast.error(getErrorMessage(error, "Không thể tạo link thanh toán VNPay"));
    },
  });
};
