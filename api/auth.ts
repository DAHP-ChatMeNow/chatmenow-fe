import api from "@/lib/axios";
import { User } from "@/types/user";

export type LoginPayload = {
  email: string;
  password: string;
};

export type RegisterPayload = {
  displayName: string;
  email: string;
  password: string;
};

export type AuthResponse = {
  user: User;
  token: string;
  message?: string;
};

export type GetMeResponse = {
  success: boolean;
  user: User;
};

const login = async (payload: LoginPayload) => {
  const { data } = await api.post<AuthResponse>("/auth/login", payload);
  return data;
};

const register = async (payload: RegisterPayload) => {
  const { data } = await api.post<AuthResponse>("/auth/register", payload);
  return data;
};

const getMe = async () => {
  const { data } = await api.get<GetMeResponse>("/auth/getMe");
  return data.user; // Extract user from response
};

export const authService = { login, register, getMe };
