import type { ReactNode } from "react";
import Link from "next/link";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <main className="grid min-h-screen bg-[#f3f5f0] lg:grid-cols-[0.9fr_1.1fr]">
      <section className="hidden border-r border-[#dce2da] bg-[#173c34] p-10 text-white lg:flex lg:flex-col lg:justify-between">
        <Link
          href="/"
          className="flex items-center gap-3 text-lg font-extrabold tracking-[-0.04em]"
        >
          <span className="grid size-10 place-items-center rounded-2xl bg-white text-sm text-[#173c34]">
            K
          </span>
          KampusHub
        </Link>

        <div className="max-w-lg">
          <p className="text-xs font-bold uppercase tracking-[0.23em] text-[#a8c4ba]">
            Ruang kerja akademik
          </p>
          <blockquote className="serif mt-5 text-5xl leading-[1.08]">
            “Yang membuat kuliah terasa berat sering kali bukan tugasnya, tetapi
            semua hal yang tidak tertata.”
          </blockquote>
          <p className="mt-7 max-w-md text-sm leading-7 text-[#b9cdc6]">
            Mulai dari semester aktif. Mata kuliah, jadwal, tugas, ujian,
            presensi, dan nilai akan mengikuti struktur yang sama.
          </p>
        </div>

        <p className="text-xs font-semibold text-[#89a99d]">
          Integrated academic productivity platform
        </p>
      </section>
      <section className="flex min-h-screen items-center justify-center px-5 py-10 sm:px-8">
        <div className="w-full max-w-md">{children}</div>
      </section>
    </main>
  );
}
