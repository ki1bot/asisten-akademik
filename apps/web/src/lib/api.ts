"use client";

import { createApiClient } from "@kampushub/api-client";
import axios from "axios";
import { useAuthStore } from "@/stores/auth-store";

const baseURL =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ??
  "http://localhost:3001/api";

export const api = createApiClient({
  baseURL,
  getAccessToken: () => useAuthStore.getState().accessToken,
  refreshAccessToken: async () => {
    const refreshToken = useAuthStore.getState().refreshToken;

    if (!refreshToken) {
      return null;
    }

    try {
      const response = await axios.post<{
        accessToken: string;
        refreshToken: string;
      }>(`${baseURL}/auth/refresh`, {
        refreshToken,
      });

      useAuthStore
        .getState()
        .setTokens(response.data.accessToken, response.data.refreshToken);

      return response.data.accessToken;
    } catch {
      useAuthStore.getState().clearSession();
      return null;
    }
  },
  onUnauthorized: () => {
    useAuthStore.getState().clearSession();

    if (typeof window !== "undefined") {
      window.location.href = "/login";
    }
  },
});

export function getRequestError(error: unknown): string {
  if (!axios.isAxiosError(error)) {
    return error instanceof Error
      ? error.message
      : "Terjadi kesalahan yang tidak diketahui";
  }

  const payload = error.response?.data as
    | {
        message?: string | string[];
      }
    | undefined;

  if (Array.isArray(payload?.message)) {
    return payload.message.join(", ");
  }

  return payload?.message ?? "Permintaan gagal diproses";
}
