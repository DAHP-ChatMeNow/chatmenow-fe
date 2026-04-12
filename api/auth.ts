import api from "@/lib/axios";
import { User } from "@/types/user";
import {
  RememberedAccountInfoQuery,
  RememberedAccountInfoResponse,
  RememberedLoginPayload,
  RevokeRememberedAccountPayload,
} from "@/types/auth";

export type LoginPayload = {
  email: string;
  password: string;
  rememberAccount?: boolean;
  deviceId: string;
  deviceName?: string;
  turnstileToken?: string;
};

export type RegisterPayload = {
  displayName: string;
  email: string;
  password: string;
};

export type SendOtpPayload = {
  email: string;
};

export type VerifyOtpPayload = {
  email: string;
  otp: string;
};

export type OtpResponse = {
  success: boolean;
  message: string;
  expiresIn?: number;
  verified?: boolean;
};

export type AuthResponse = {
  user: User;
  token: string;
  rememberToken?: string;
  role?: string;
  message?: string;
};

export type GetMeResponse = {
  success: boolean;
  user: User;
};

export type RememberedLoginResponse = AuthResponse;

export type RevokeResponse = {
  success: boolean;
  message: string;
};

const login = async (payload: LoginPayload) => {
  const { data } = await api.post<AuthResponse>("/auth/login", payload);
  return data;
};

const rememberedLogin = async (payload: RememberedLoginPayload) => {
  const { data } = await api.post<RememberedLoginResponse>(
    "/auth/remembered-login",
    payload,
  );
  return data;
};

const getRememberedAccountInfo = async (query: RememberedAccountInfoQuery) => {
  const { data } = await api.get<RememberedAccountInfoResponse>(
    "/auth/remembered-account",
    {
      params: query,
    },
  );
  return data;
};

const revokeRememberedAccount = async (
  payload: RevokeRememberedAccountPayload,
) => {
  const { data } = await api.post<RevokeResponse>(
    "/auth/remembered-account/revoke",
    payload,
  );
  return data;
};

const sendOtp = async (payload: SendOtpPayload) => {
  const { data } = await api.post<OtpResponse>("/auth/send-otp", payload);
  return data;
};

const verifyOtp = async (payload: VerifyOtpPayload) => {
  const { data } = await api.post<OtpResponse>("/auth/verify-otp", payload);
  return data;
};

const register = async (payload: RegisterPayload) => {
  const { data } = await api.post<AuthResponse>("/auth/register", payload);
  return data;
};

const getMe = async () => {
  const { data } = await api.get<GetMeResponse>("/auth/me");
  return data.user;
};

export const authService = {
  login,
  sendOtp,
  verifyOtp,
  register,
  getMe,
  rememberedLogin,
  getRememberedAccountInfo,
  revokeRememberedAccount,
};
