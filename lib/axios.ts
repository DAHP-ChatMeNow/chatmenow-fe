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
  const apiKey = process.env.NEXT_PUBLIC_API_KEY;
  if (apiKey) {
    config.headers["x-api-key"] = apiKey;
  }
  return config;
});

export default api;
