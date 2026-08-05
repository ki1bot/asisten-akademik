"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import type { AuthResponse } from "@kampushub/contracts";
import { loginSchema, type LoginInput } from "@kampushub/validation";
import { ArrowLeft, LoaderCircle } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { api, getRequestError } from "@/lib/api";
import { getDeviceName } from "@/lib/device";
import { useAuthStore } from "@/stores/auth-store";

export default function LoginPage() {
  const router = useRouter();
  const setSession = useAuthStore((state) => state.setSession);

  const form = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      const response = await api.post<AuthResponse>("/auth/login", {
        ...values,
        deviceName: getDeviceName(),
      });

      setSession(
        response.data.user,
        response.data.accessToken,
        response.data.refreshToken,
      );

      toast.success("Berhasil masuk");
      router.replace("/dashboard");
    } catch (error) {
      toast.error(getRequestError(error));
    }
  });

  return (
    <div>
      <Link
        href="/"
        className="mb-10 inline-flex items-center gap-2 text-sm font-semibold text-[#64716a] hover:text-[#173c34] lg:hidden"
      >
        <ArrowLeft className="size-4" />
        Kembali
      </Link>

      <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#4f7c6c]">
        Selamat datang kembali
      </p>

      <h1 className="mt-3 text-4xl font-extrabold tracking-[-0.05em] text-[#1d2d26]">
        Masuk ke KampusHub
      </h1>

      <p className="mt-3 text-sm leading-7 text-[#707b75]">
        Lanjutkan pengelolaan kegiatan akademik Anda dari perangkat ini.
      </p>

      <form className="mt-8 grid gap-5" onSubmit={onSubmit}>
        <Field label="Email" error={form.formState.errors.email?.message}>
          <Input
            type="email"
            autoComplete="email"
            placeholder="nama@email.com"
            {...form.register("email")}
          />
        </Field>

        <Field label="Password" error={form.formState.errors.password?.message}>
          <Input
            type="password"
            autoComplete="current-password"
            placeholder="Minimal 8 karakter"
            {...form.register("password")}
          />
        </Field>

        <div className="flex justify-end">
          <Link
            href="/forgot-password"
            className="text-sm font-semibold text-[#34705d] hover:underline"
          >
            Lupa password?
          </Link>
        </div>

        <Button
          type="submit"
          size="lg"
          className="w-full"
          disabled={form.formState.isSubmitting}
        >
          {form.formState.isSubmitting ? (
            <LoaderCircle className="animate-spin" />
          ) : null}
          Masuk
        </Button>
      </form>

      <p className="mt-7 text-center text-sm text-[#707b75]">
        Belum memiliki akun?{" "}
        <Link
          href="/register"
          className="font-bold text-[#286553] hover:underline"
        >
          Daftar sekarang
        </Link>
      </p>
    </div>
  );
}
