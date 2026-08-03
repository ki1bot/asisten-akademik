"use client";

import { LoaderCircle } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { api, getRequestError } from "@/lib/api";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitting(true);

    try {
      await api.post("/auth/forgot-password", {
        email,
      });

      toast.success(
        "Jika email terdaftar, instruksi reset password telah dibuat",
      );
    } catch (error) {
      toast.error(getRequestError(error));
    } finally {
      setSubmitting(false);
    }
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
        Masukkan email akun untuk mendapatkan instruksi penggantian password.
      </p>

      <form className="mt-8 grid gap-5" onSubmit={handleSubmit}>
        <Field label="Email">
          <Input
            type="email"
            required
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

      <Link
        href="/login"
        className="mt-7 block text-center text-sm font-bold text-[#286553] hover:underline"
      >
        Kembali ke halaman masuk
      </Link>
    </div>
  );
}
