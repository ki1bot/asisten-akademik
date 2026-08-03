import axios, {
  AxiosError,
  AxiosInstance,
  InternalAxiosRequestConfig,
} from "axios";

export interface ApiClientOptions {
  baseURL: string;
  getAccessToken: () => string | null | Promise<string | null>;
  refreshAccessToken?: () => Promise<string | null>;
  onUnauthorized?: () => void | Promise<void>;
}

interface RetryableRequest extends InternalAxiosRequestConfig {
  _retry?: boolean;
}

export function createApiClient(options: ApiClientOptions): AxiosInstance {
  const client = axios.create({
    baseURL: options.baseURL.replace(/\/$/, ""),
    timeout: 15000,
    headers: {
      "Content-Type": "application/json",
    },
  });

  client.interceptors.request.use(async (config) => {
    const token = await options.getAccessToken();

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  });

  client.interceptors.response.use(
    (response) => response,
    async (error: AxiosError) => {
      const request = error.config as RetryableRequest | undefined;

      if (error.response?.status !== 401 || !request || request._retry) {
        return Promise.reject(error);
      }

      request._retry = true;

      const token = options.refreshAccessToken
        ? await options.refreshAccessToken()
        : null;

      if (!token) {
        await options.onUnauthorized?.();
        return Promise.reject(error);
      }

      request.headers.Authorization = `Bearer ${token}`;

      return client(request);
    },
  );

  return client;
}

export function getApiErrorMessage(error: unknown): string {
  if (!axios.isAxiosError(error)) {
    return error instanceof Error
      ? error.message
      : "Terjadi kesalahan yang tidak diketahui";
  }

  const data = error.response?.data as
    | {
        message?: string | string[];
      }
    | undefined;

  if (Array.isArray(data?.message)) {
    return data.message.join(", ");
  }

  return data?.message ?? "Gagal terhubung ke server";
}
