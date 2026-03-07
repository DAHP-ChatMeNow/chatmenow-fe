"use client";

import { User } from "@/types/user";
import { create } from "zustand";
import { persist } from "zustand/middleware";

interface AuthState {
  user: User | null;
  token: string | null;
  role: string | null;
  setAuth: (user: User, token: string, role?: string) => void;
  logout: () => void;
}

// Helper to set auth cookie
const setAuthCookie = (token: string) => {
  document.cookie = `auth-token=${token}; path=/; max-age=${60 * 60 * 24 * 7}; SameSite=Lax`;
};

// Helper to remove auth cookie
const removeAuthCookie = () => {
  document.cookie = "auth-token=; path=/; max-age=0";
  document.cookie = "user-role=; path=/; max-age=0";
};

// Helper to set role cookie
const setRoleCookie = (role: string) => {
  document.cookie = `user-role=${role}; path=/; max-age=${60 * 60 * 24 * 7}; SameSite=Lax`;
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      role: null,
      setAuth: (user, token, role) => {
        set({ user, token, role: role ?? null });
        setAuthCookie(token);
        if (role) setRoleCookie(role);
        // Trigger storage event để sync với tabs khác
        if (typeof window !== "undefined") {
          window.dispatchEvent(new Event("auth-updated"));
        }
      },
      logout: () => {
        set({ user: null, token: null, role: null });
        localStorage.removeItem("auth-storage");
        removeAuthCookie();
      },
    }),
    { name: "auth-storage" },
  ),
);

// Sync auth state giữa các tabs
if (typeof window !== "undefined") {
  window.addEventListener("storage", (e) => {
    if (e.key === "auth-storage" && e.newValue) {
      try {
        const data = JSON.parse(e.newValue);
        useAuthStore.setState(data.state);
      } catch (error) {
        console.error("Failed to sync auth state:", error);
      }
    }
  });
}
