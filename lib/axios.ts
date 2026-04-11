import { useAuthStore } from "@/store/use-auth-store";
import { BASE_API_URL } from "@/types/utils";
import axios from "axios";
import { toast } from "sonner";

const api = axios.create({
  baseURL: BASE_API_URL,
  headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  const apiKey = process.env.NEXT_PUBLIC_API_KEY;
  if (apiKey) {
    config.headers["x-api-key"] = apiKey;
  }
  return config;
});

const ACCOUNT_STATUS_ERROR_CODE = new Set([
  "ACCOUNT_LOCKED",
  "ACCOUNT_SUSPENDED",
  "ACCOUNT_INACTIVE",
]);

const isAccountStatusRejection = (error: unknown) => {
  if (!axios.isAxiosError(error)) return false;

  const status = error.response?.status;
  if (status !== 401 && status !== 403) return false;

  const data =
    (error.response?.data as
      | { code?: string; errorCode?: string; message?: string }
      | undefined) ?? {};

  const code = data.code || data.errorCode;
  if (code && ACCOUNT_STATUS_ERROR_CODE.has(code)) {
    return true;
  }

  const message = (data.message || "").toLowerCase();
  return /(account status|suspended|locked|inactive|đình chỉ|bị khóa|khóa tài khoản)/i.test(
    message,
  );
};

const isSessionInvalidationRejection = (error: unknown) => {
  if (!axios.isAxiosError(error)) return false;

  const status = error.response?.status;
  if (status !== 401 && status !== 403) return false;

  const data =
    (error.response?.data as
      | { code?: string; errorCode?: string; message?: string }
      | undefined) ?? {};

  const code = data.code || data.errorCode;
  if (code === "SESSION_INVALID" || code === "SESSION_EXPIRED") {
    return true;
  }

  const message = (data.message || "").toLowerCase();
  return /(đăng nhập trên thiết bị khác|dang nhap tren thiet bi khac|logged in on another device|session.*(invalid|expired))/i.test(
    message,
  );
};

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const hasToken = Boolean(useAuthStore.getState().token);
    const requestUrl = String(error?.config?.url || "");
    const isAuthEndpoint = /\/auth\/(login|register|remembered-login)/i.test(
      requestUrl,
    );

    if (
      hasToken &&
      !isAuthEndpoint &&
      (isAccountStatusRejection(error) || isSessionInvalidationRejection(error))
    ) {
      const responseMessage =
        (error?.response?.data as { message?: string } | undefined)?.message ||
        "";
      const fallbackMessage = isSessionInvalidationRejection(error)
        ? "Tài khoản đã đăng nhập trên thiết bị khác. Vui lòng đăng nhập lại."
        : "Phiên đăng nhập đã hết hiệu lực. Vui lòng đăng nhập lại.";

      useAuthStore.getState().logout();

      if (typeof window !== "undefined") {
        toast.error(responseMessage || fallbackMessage);
        const isAdminPath = window.location.pathname.startsWith("/admin");
        window.location.replace(isAdminPath ? "/admin/login" : "/login");
      }
    }

    return Promise.reject(error);
  },
);

export default api;
