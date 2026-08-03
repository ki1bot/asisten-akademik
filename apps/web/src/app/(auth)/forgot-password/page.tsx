"use client";

import { KeyRound, LoaderCircle } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { api, getRequestError } from "@/lib/api";

interface ForgotPasswordResponse {
  message: string;
  resetToken?: string;
}

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [resetToken, setResetToken] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setResetToken(null);

    try {
      const response = await api.post<ForgotPasswordResponse>(
        "/auth/forgot-password",
        {
          email,
        },
      );

      setResetToken(response.data.resetToken ?? null);
      toast.success(response.data.message);
    } catch (error) {
      toast.error(getRequestError(error));
    } finally {
      setSubmitting(false);
    }
  };

  const continueReset = () => {
    if (!resetToken) {
      return;
    }

    router.push(`/reset-password?token=${encodeURIComponent(resetToken)}`);
  };

  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#4f7c6c]">
        Pemulihan akun
      </p>

      <h1 className="mt-3 text-4xl font-extrabold tracking-[-0.05em] text-[#1d2d26]">
        Lupa password
      </h1>

      <p className="mt-3 text-sm leading-7 text-[#707b75]">
        Masukkan email akun untuk membuat permintaan penggantian password.
      </p>

      <form className="mt-8 grid gap-5" onSubmit={handleSubmit}>
        <Field label="Email">
          <Input
            type="email"
            required
            autoComplete="email"
            value={email}
            placeholder="nama@email.com"
            onChange={(event) => setEmail(event.target.value)}
          />
        </Field>

        <Button
          type="submit"
          size="lg"
          className="w-full"
          disabled={submitting}
        >
          {submitting ? <LoaderCircle className="animate-spin" /> : null}
          Kirim instruksi
        </Button>
      </form>

      {resetToken ? (
        <div className="mt-6 rounded-2xl border border-[#c9dbd1] bg-[#eef7f1] p-4">
          <div className="flex items-center gap-2 text-sm font-extrabold text-[#285d4c]">
            <KeyRound className="size-4" />
            Token pengembangan
          </div>

          <p className="mt-2 text-xs leading-5 text-[#64756c]">
            Token ini hanya dikembalikan ketika backend tidak berjalan dalam
            mode production.
          </p>

          <code className="mt-3 block break-all rounded-xl bg-white p-3 text-xs text-[#34443c]">
            {resetToken}
          </code>

          <Button
            className="mt-4 w-full"
            variant="secondary"
            onClick={continueReset}
          >
            Ubah password
          </Button>
        </div>
      ) : null}

      <Link
        href="/login"
        className="mt-7 block text-center text-sm font-bold text-[#286553] hover:underline"
      >
        Kembali ke halaman masuk
      </Link>
    </div>
  );
}
