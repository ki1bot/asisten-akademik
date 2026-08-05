"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import type { AuthResponse } from "@kampushub/contracts";
import { registerSchema, type RegisterInput } from "@kampushub/validation";
import { ArrowLeft, LoaderCircle } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { api, getRequestError } from "@/lib/api";
import { getDeviceName } from "@/lib/device";
import { useAuthStore } from "@/stores/auth-store";

export default function RegisterPage() {
  const router = useRouter();
  const setSession = useAuthStore((state) => state.setSession);

  const form = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
    },
  });

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      const response = await api.post<AuthResponse>("/auth/register", {
        ...values,
        deviceName: getDeviceName(),
      });

      setSession(
        response.data.user,
        response.data.accessToken,
        response.data.refreshToken,
      );

      toast.success("Akun berhasil dibuat");
      router.replace("/dashboard");
    } catch (error) {
      toast.error(getRequestError(error));
    }
  });

  return (
    <div>
      <Link
        href="/"
        className="mb-8 inline-flex items-center gap-2 text-sm font-semibold text-[#64716a] transition hover:text-[#173c34] lg:hidden"
      >
        <ArrowLeft className="size-4" />
        Kembali
      </Link>

      <p className="text-[11px] font-extrabold uppercase tracking-[0.2em] text-[#4f7c6c] sm:text-xs">
        Akun mahasiswa baru
      </p>

      <h1 className="mt-3 text-3xl font-extrabold leading-tight tracking-[-0.05em] text-[#1d2d26] sm:text-4xl">
        Bangun ruang akademik Anda
      </h1>

      <p className="mt-3 text-sm leading-7 text-[#707b75]">
        Setelah mendaftar, buat semester aktif sebelum menambahkan mata kuliah.
      </p>

      <form className="mt-8 grid gap-5" onSubmit={onSubmit}>
        <Field
          htmlFor="register-name"
          label="Nama lengkap"
          error={form.formState.errors.name?.message}
        >
          <Input
            id="register-name"
            autoComplete="name"
            placeholder="Nama mahasiswa"
            aria-invalid={Boolean(form.formState.errors.name)}
            {...form.register("name")}
          />
        </Field>

        <Field
          htmlFor="register-email"
          label="Email"
          error={form.formState.errors.email?.message}
        >
          <Input
            id="register-email"
            type="email"
            autoComplete="email"
            inputMode="email"
            placeholder="nama@email.com"
            aria-invalid={Boolean(form.formState.errors.email)}
            {...form.register("email")}
          />
        </Field>

        <Field
          htmlFor="register-password"
          label="Password"
          hint="Minimal 8 karakter"
          error={form.formState.errors.password?.message}
        >
          <PasswordInput
            id="register-password"
            autoComplete="new-password"
            placeholder="Huruf besar, kecil, dan angka"
            aria-invalid={Boolean(form.formState.errors.password)}
            {...form.register("password")}
          />
        </Field>

        <Button
          type="submit"
          size="lg"
          className="mt-1 w-full"
          disabled={form.formState.isSubmitting}
        >
          {form.formState.isSubmitting ? (
            <LoaderCircle className="animate-spin" />
          ) : null}
          Buat akun
        </Button>
      </form>

      <p className="mt-7 text-center text-sm text-[#707b75]">
        Sudah memiliki akun?{" "}
        <Link
          href="/login"
          className="font-bold text-[#286553] hover:underline"
        >
          Masuk
        </Link>
      </p>
    </div>
  );
}
