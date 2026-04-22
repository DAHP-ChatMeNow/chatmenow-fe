"use client";

import { User } from "@/types/user";
import { RememberedAccount } from "@/types/auth";
import { BASE_API_URL } from "@/types/utils";
import { create } from "zustand";
import { persist } from "zustand/middleware";

interface AuthState {
  user: User | null;
  token: string | null;
  role: string | null;
  rememberToken: string | null;
  rememberedAccounts: RememberedAccount[];
  setAuth: (
    user: User,
    token: string,
    role?: string,
    rememberToken?: string,
  ) => void;
  addRememberedAccount: (account: RememberedAccount) => void;
  removeRememberedAccount: (rememberToken: string) => void;
  logout: () => void;
}

const AUTH_COOKIE_MAX_AGE = 60 * 60 * 24 * 7;
const AUTH_VALIDATE_TTL_MS = 2 * 60 * 1000;

let validatingTokenPromise: Promise<void> | null = null;
let lastValidatedToken: string | null = null;
let lastValidatedAt = 0;

const getCookieValue = (name: string) => {
  if (typeof document === "undefined") return null;

  const encodedName = `${encodeURIComponent(name)}=`;
  const cookieParts = document.cookie.split(";");

  for (const rawPart of cookieParts) {
    const part = rawPart.trim();
    if (part.startsWith(encodedName)) {
      return decodeURIComponent(part.slice(encodedName.length));
    }
  }

  return null;
};

const normalizeAuthUser = (user: User): User => {
  const accountRef =
    user?.accountId && typeof user.accountId === "object" ? user.accountId : undefined;

  const derivedPremium =
    typeof user?.isPremium === "boolean"
      ? user.isPremium
      : typeof accountRef?.isPremium === "boolean"
        ? accountRef.isPremium
        : undefined;

  const derivedExpiry =
    user?.premiumExpiryDate ??
    (accountRef?.premiumExpiryDate == null
      ? undefined
      : accountRef.premiumExpiryDate);

  return {
    ...user,
    id: user.id || user._id || "",
    isPremium: derivedPremium,
    premiumExpiryDate: derivedExpiry,
  };
};

// Helper to set auth cookie
const setAuthCookie = (token: string) => {
  document.cookie = `auth-token=${encodeURIComponent(token)}; path=/; max-age=${AUTH_COOKIE_MAX_AGE}; SameSite=Lax`;
};

// Helper to remove auth cookie
const removeAuthCookie = () => {
  document.cookie = "auth-token=; path=/; max-age=0";
  document.cookie = "user-role=; path=/; max-age=0";
};

// Helper to set role cookie
const setRoleCookie = (role: string) => {
  document.cookie = `user-role=${encodeURIComponent(role)}; path=/; max-age=${AUTH_COOKIE_MAX_AGE}; SameSite=Lax`;
};

const clearAuthState = () => {
  useAuthStore.setState({
    user: null,
    token: null,
    role: null,
    rememberToken: null,
  });
  removeAuthCookie();
  lastValidatedToken = null;
  lastValidatedAt = 0;
};

const markTokenValidated = (token: string) => {
  lastValidatedToken = token;
  lastValidatedAt = Date.now();
};

const getMeEndpoint = () => {
  if (!BASE_API_URL) return null;
  return `${BASE_API_URL}/auth/me`;
};

const validateAuthTokenWithServer = async (force = false) => {
  if (typeof window === "undefined") return;

  const { token } = useAuthStore.getState();
  if (!token) return;

  if (
    !force &&
    lastValidatedToken === token &&
    Date.now() - lastValidatedAt < AUTH_VALIDATE_TTL_MS
  ) {
    return;
  }

  if (validatingTokenPromise) {
    return validatingTokenPromise;
  }

  const endpoint = getMeEndpoint();
  if (!endpoint) return;

  const currentToken = token;
  validatingTokenPromise = (async () => {
    try {
      const headers: Record<string, string> = {
        Authorization: `Bearer ${currentToken}`,
        "Content-Type": "application/json",
      };
      const apiKey = process.env.NEXT_PUBLIC_API_KEY;
      if (apiKey) {
        headers["x-api-key"] = apiKey;
      }

      const response = await fetch(endpoint, {
        method: "GET",
        headers,
      });

      if (response.status === 401 || response.status === 403) {
        const latestToken = useAuthStore.getState().token;
        if (latestToken === currentToken) {
          clearAuthState();
        }
        return;
      }

      if (response.ok) {
        const latestToken = useAuthStore.getState().token;
        if (latestToken === currentToken) {
          markTokenValidated(currentToken);
        }
      }
    } catch {
      // Skip logout on temporary network issues.
    } finally {
      validatingTokenPromise = null;
    }
  })();

  return validatingTokenPromise;
};

const syncAuthStateWithCookies = () => {
  if (typeof window === "undefined") return;

  const cookieToken = getCookieValue("auth-token");
  const cookieRole = getCookieValue("user-role");
  const { token, role } = useAuthStore.getState();

  // If persisted token exists but auth cookie is gone, force logout to avoid redirect loop.
  if (token && !cookieToken) {
    clearAuthState();
    return;
  }

  // Keep role cookie consistent to prevent admin/user redirect mismatches.
  if (token && role && !cookieRole) {
    setRoleCookie(role);
  }

  if (token && cookieToken) {
    void validateAuthTokenWithServer();
  }
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      role: null,
      rememberToken: null,
      rememberedAccounts: [],
      setAuth: (user, token, role, rememberToken) => {
        const normalizedUser = normalizeAuthUser(user);
        set({
          user: normalizedUser,
          token,
          role: role ?? null,
          rememberToken: rememberToken ?? null,
        });
        setAuthCookie(token);
        if (role) setRoleCookie(role);
        markTokenValidated(token);
        // Trigger storage event để sync với tabs khác
        if (typeof window !== "undefined") {
          window.dispatchEvent(new Event("auth-updated"));
        }
      },
      addRememberedAccount: (account) => {
        set((state) => {
          // Remove existing account with same token to avoid duplicates
          const filtered = state.rememberedAccounts.filter(
            (a) => a.rememberToken !== account.rememberToken,
          );
          // Keep only latest 3 accounts
          const updated = [account, ...filtered].slice(0, 3);
          return {
            rememberedAccounts: updated,
          };
        });
      },
      removeRememberedAccount: (rememberToken) => {
        set((state) => ({
          rememberedAccounts: state.rememberedAccounts.filter(
            (a) => a.rememberToken !== rememberToken,
          ),
        }));
      },
      logout: () => {
        clearAuthState();
        // Keep rememberedAccounts
      },
    }),
    {
      name: "auth-storage",
      onRehydrateStorage: () => {
        return () => {
          syncAuthStateWithCookies();
        };
      },
    },
  ),
);

// Sync auth state giữa các tabs
if (typeof window !== "undefined") {
  syncAuthStateWithCookies();

  window.addEventListener("storage", (e) => {
    if (e.key === "auth-storage" && e.newValue) {
      try {
        const data = JSON.parse(e.newValue);
        useAuthStore.setState(data.state);
        syncAuthStateWithCookies();
      } catch (error) {
        console.error("Failed to sync auth state:", error);
      }
    }
  });

  window.addEventListener("focus", syncAuthStateWithCookies);
  window.addEventListener("pageshow", syncAuthStateWithCookies);
  window.addEventListener("auth-updated", syncAuthStateWithCookies);
}
