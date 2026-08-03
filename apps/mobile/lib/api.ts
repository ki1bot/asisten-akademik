import { createApiClient, getApiErrorMessage } from "@kampushub/api-client";
import axios from "axios";
import { useAuthStore } from "@/stores/auth-store";

export const apiBaseUrl =
  process.env.EXPO_PUBLIC_API_URL?.replace(/\/$/, "") ??
  "http://10.0.2.2:3001/api";

export const api = createApiClient({
  baseURL: apiBaseUrl,

  getAccessToken: () => {
    return useAuthStore.getState().accessToken;
  },

  refreshAccessToken: async () => {
    const refreshToken = useAuthStore.getState().refreshToken;

    if (!refreshToken) {
      return null;
    }

    try {
      const response = await axios.post<{
        accessToken: string;
        refreshToken: string;
      }>(`${apiBaseUrl}/auth/refresh`, {
        refreshToken,
      });

      await useAuthStore
        .getState()
        .setTokens(response.data.accessToken, response.data.refreshToken);

      return response.data.accessToken;
    } catch {
      await useAuthStore.getState().clearSession();
      return null;
    }
  },

  onUnauthorized: async () => {
    await useAuthStore.getState().clearSession();
  },
});

export function getRequestError(error: unknown): string {
  return getApiErrorMessage(error);
}
