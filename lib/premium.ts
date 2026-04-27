import axios from "axios";
import { PremiumErrorCode } from "@/types/premium";

export type PremiumErrorInfo = {
  status?: number;
  code?: string;
  message?: string;
};

export const PREMIUM_ERROR_CODE = {
  AI_REQUIRED: "PREMIUM_AI_REQUIRED",
  POST_DISABLED: "PREMIUM_POST_DISABLED",
  REEL_DISABLED: "PREMIUM_REEL_DISABLED",
  STORY_DISABLED: "PREMIUM_STORY_DISABLED",
  INTERACTION_DISABLED: "PREMIUM_INTERACTION_DISABLED",
  LIMIT_EXCEEDED: "PREMIUM_LIMIT_EXCEEDED",
  VIDEO_DURATION_EXCEEDED: "PREMIUM_VIDEO_DURATION_EXCEEDED",
} as const;

const DURATION_ERROR_PATTERNS = [
  /video\s*duration/i,
  /duration\s*exceeded/i,
  /vuot\s*gioi\s*han\s*thoi\s*gian/i,
  /vượt\s*giới\s*hạn\s*thời\s*gian/i,
];

export const extractPremiumErrorInfo = (error: unknown): PremiumErrorInfo => {
  if (!axios.isAxiosError(error)) return {};

  const status = error.response?.status;
  const data =
    (error.response?.data as
      | { code?: string; errorCode?: string; message?: string }
      | undefined) ?? {};

  const code = data.code || data.errorCode;
  const message = data.message || error.message || "";

  return { status, code, message };
};

export const resolvePremiumErrorCode = (
  error: unknown,
): PremiumErrorCode | undefined => {
  const info = extractPremiumErrorInfo(error);
  const status = Number(info.status || 0);
  const hasPremiumLikeCode = String(info.code || "")
    .toUpperCase()
    .startsWith("PREMIUM_");
  const allowedStatus = status === 0 || status === 400 || status === 403;
  if (!allowedStatus && !hasPremiumLikeCode) return undefined;

  if (info.code === PREMIUM_ERROR_CODE.AI_REQUIRED) {
    return PREMIUM_ERROR_CODE.AI_REQUIRED;
  }

  if (info.code === PREMIUM_ERROR_CODE.POST_DISABLED) {
    return PREMIUM_ERROR_CODE.POST_DISABLED;
  }

  if (info.code === PREMIUM_ERROR_CODE.REEL_DISABLED) {
    return PREMIUM_ERROR_CODE.REEL_DISABLED;
  }

  if (info.code === PREMIUM_ERROR_CODE.STORY_DISABLED) {
    return PREMIUM_ERROR_CODE.STORY_DISABLED;
  }

  if (info.code === PREMIUM_ERROR_CODE.INTERACTION_DISABLED) {
    return PREMIUM_ERROR_CODE.INTERACTION_DISABLED;
  }

  if (info.code === PREMIUM_ERROR_CODE.LIMIT_EXCEEDED) {
    return PREMIUM_ERROR_CODE.LIMIT_EXCEEDED;
  }

  if (info.code === PREMIUM_ERROR_CODE.VIDEO_DURATION_EXCEEDED) {
    return PREMIUM_ERROR_CODE.VIDEO_DURATION_EXCEEDED;
  }

  const text = String(info.message || "").toLowerCase();
  if (DURATION_ERROR_PATTERNS.some((pattern) => pattern.test(text))) {
    return PREMIUM_ERROR_CODE.VIDEO_DURATION_EXCEEDED;
  }

  return undefined;
};

export const isPremium403Error = (error: unknown): boolean => {
  return !!resolvePremiumErrorCode(error);
};

export const getPremiumPopupMessage = (code?: PremiumErrorCode): string => {
  if (code === PREMIUM_ERROR_CODE.AI_REQUIRED) {
    return "Nâng cấp Premium để dùng AI";
  }

  if (code === PREMIUM_ERROR_CODE.POST_DISABLED) {
    return "Gói hiện tại không cho phép đăng bài";
  }

  if (code === PREMIUM_ERROR_CODE.REEL_DISABLED) {
    return "Gói hiện tại không cho phép đăng reel";
  }

  if (code === PREMIUM_ERROR_CODE.STORY_DISABLED) {
    return "Gói hiện tại không cho phép đăng story";
  }

  if (code === PREMIUM_ERROR_CODE.INTERACTION_DISABLED) {
    return "Gói hiện tại không cho phép tương tác";
  }

  if (code === PREMIUM_ERROR_CODE.LIMIT_EXCEEDED) {
    return "Bạn đã hết lượt trong ngày";
  }

  if (code === PREMIUM_ERROR_CODE.VIDEO_DURATION_EXCEEDED) {
    return "Video vượt giới hạn gói hiện tại";
  }

  return "Tính năng này yêu cầu gói Premium";
};
