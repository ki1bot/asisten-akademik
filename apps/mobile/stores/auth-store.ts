import type { AuthResponse, User } from "@kampushub/contracts";
import { create } from "zustand";
import {
  getStoredValue,
  removeStoredValue,
  setStoredValue,
} from "@/lib/storage";

const accessTokenKey = "kampushub-access-token";
const refreshTokenKey = "kampushub-refresh-token";
const userKey = "kampushub-user";

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  hydrated: boolean;
  hydrate: () => Promise<void>;
  setSession: (session: AuthResponse) => Promise<void>;
  setTokens: (accessToken: string, refreshToken: string) => Promise<void>;
  setUser: (user: User) => Promise<void>;
  clearSession: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  accessToken: null,
  refreshToken: null,
  hydrated: false,

  hydrate: async () => {
    if (get().hydrated) {
      return;
    }

    try {
      const [accessToken, refreshToken, storedUser] = await Promise.all([
        getStoredValue(accessTokenKey),
        getStoredValue(refreshTokenKey),
        getStoredValue(userKey),
      ]);

      let user: User | null = null;

      if (storedUser) {
        try {
          user = JSON.parse(storedUser) as User;
        } catch {
          await removeStoredValue(userKey);
        }
      }

      set({
        user,
        accessToken,
        refreshToken,
        hydrated: true,
      });
    } catch {
      set({
        user: null,
        accessToken: null,
        refreshToken: null,
        hydrated: true,
      });
    }
  },

  setSession: async (session) => {
    await Promise.all([
      setStoredValue(accessTokenKey, session.accessToken),
      setStoredValue(refreshTokenKey, session.refreshToken),
      setStoredValue(userKey, JSON.stringify(session.user)),
    ]);

    set({
      user: session.user,
      accessToken: session.accessToken,
      refreshToken: session.refreshToken,
    });
  },

  setTokens: async (accessToken, refreshToken) => {
    await Promise.all([
      setStoredValue(accessTokenKey, accessToken),
      setStoredValue(refreshTokenKey, refreshToken),
    ]);

    set({
      accessToken,
      refreshToken,
    });
  },

  setUser: async (user) => {
    await setStoredValue(userKey, JSON.stringify(user));

    set({
      user,
    });
  },

  clearSession: async () => {
    await Promise.all([
      removeStoredValue(accessTokenKey),
      removeStoredValue(refreshTokenKey),
      removeStoredValue(userKey),
    ]);

    set({
      user: null,
      accessToken: null,
      refreshToken: null,
    });
  },
}));
