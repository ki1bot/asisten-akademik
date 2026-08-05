"use client";

import { LoaderCircle } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { api, getRequestError } from "@/lib/api";

interface ResetPasswordResponse {
  message: string;
}

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [token, setToken] = useState(() => searchParams.get("token") ?? "");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const normalizedToken = token.trim();

    if (!normalizedToken) {
      toast.error("Token reset password wajib diisi");
      return;
    }

    if (password.length < 8) {
      toast.error("Password minimal 8 karakter");
      return;
    }

    if (!/[A-Z]/.test(password)) {
      toast.error("Password harus memiliki huruf besar");
      return;
    }

    if (!/[a-z]/.test(password)) {
      toast.error("Password harus memiliki huruf kecil");
      return;
    }

    if (!/[0-9]/.test(password)) {
      toast.error("Password harus memiliki angka");
      return;
    }

    if (password !== confirmation) {
      toast.error("Konfirmasi password tidak sama");
      return;
    }

    setSubmitting(true);

    try {
      const response = await api.post<ResetPasswordResponse>(
        "/auth/reset-password",
        {
          token: normalizedToken,
          password,
        },
      );

      toast.success(response.data.message);
      router.replace("/login");
    } catch (error) {
      toast.error(getRequestError(error));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#4f7c6c]">
        Password baru
      </p>

      <h1 className="mt-3 text-4xl font-extrabold tracking-[-0.05em] text-[#1d2d26]">
        Pulihkan akses akun
      </h1>

      <p className="mt-3 text-sm leading-7 text-[#707b75]">
        Masukkan token pemulihan dan password baru untuk akun Anda.
      </p>

      <form className="mt-8 grid gap-5" onSubmit={handleSubmit}>
        <Field htmlFor="reset-token" label="Token reset">
          <Input
            id="reset-token"
            required
            autoComplete="off"
            value={token}
            placeholder="Tempel token reset password"
            onChange={(event) => setToken(event.target.value)}
          />
        </Field>

        <Field
          htmlFor="reset-password"
          label="Password baru"
          hint="Minimal 8 karakter"
        >
          <PasswordInput
            id="reset-password"
            required
            autoComplete="new-password"
            value={password}
            placeholder="Huruf besar, kecil, dan angka"
            onChange={(event) => setPassword(event.target.value)}
          />
        </Field>

        <Field htmlFor="reset-confirmation" label="Konfirmasi password">
          <PasswordInput
            id="reset-confirmation"
            required
            autoComplete="new-password"
            value={confirmation}
            placeholder="Ulangi password baru"
            onChange={(event) => setConfirmation(event.target.value)}
          />
        </Field>

        <Button
          type="submit"
          size="lg"
          className="w-full"
          disabled={submitting}
        >
          {submitting ? <LoaderCircle className="animate-spin" /> : null}
          Perbarui password
        </Button>
      </form>
    </div>
  );
}

function ResetPasswordFallback() {
  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#4f7c6c]">
        Password baru
      </p>

      <h1 className="mt-3 text-4xl font-extrabold tracking-[-0.05em] text-[#1d2d26]">
        Pulihkan akses akun
      </h1>

      <div className="mt-8 flex items-center justify-center py-12">
        <LoaderCircle className="size-6 animate-spin text-[#286553]" />
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<ResetPasswordFallback />}>
      <ResetPasswordForm />
    </Suspense>
  );
}
