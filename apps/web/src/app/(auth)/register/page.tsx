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
        className="mb-10 inline-flex items-center gap-2 text-sm font-semibold text-[#64716a] hover:text-[#173c34] lg:hidden"
      >
        <ArrowLeft className="size-4" />
        Kembali
      </Link>

      <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#4f7c6c]">
        Akun mahasiswa baru
      </p>

      <h1 className="mt-3 text-4xl font-extrabold tracking-[-0.05em] text-[#1d2d26]">
        Bangun ruang akademik Anda
      </h1>

      <p className="mt-3 text-sm leading-7 text-[#707b75]">
        Setelah mendaftar, buat semester aktif sebelum menambahkan mata kuliah.
      </p>

      <form className="mt-8 grid gap-5" onSubmit={onSubmit}>
        <Field label="Nama lengkap" error={form.formState.errors.name?.message}>
          <Input
            autoComplete="name"
            placeholder="Nama mahasiswa"
            {...form.register("name")}
          />
        </Field>

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
            autoComplete="new-password"
            placeholder="Huruf besar, kecil, dan angka"
            {...form.register("password")}
          />
        </Field>

        <Button
          type="submit"
          size="lg"
          className="mt-2 w-full"
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
