import { useAuthStore } from "@/store/use-auth-store";
import { BASE_API_URL } from "@/types/utils";
import axios from "axios";

const api = axios.create({
  baseURL: BASE_API_URL,
  headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;
