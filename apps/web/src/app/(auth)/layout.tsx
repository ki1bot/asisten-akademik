import Link from "next/link";
import type { ReactNode } from "react";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <main className="min-h-dvh bg-[#f3f5f0] lg:grid lg:grid-cols-[minmax(390px,0.9fr)_minmax(520px,1.1fr)]">
      <aside className="relative hidden h-dvh overflow-hidden border-r border-[#294c43] bg-[#173c34] p-9 text-white lg:sticky lg:top-0 lg:flex lg:flex-col lg:justify-between xl:p-12">
        <div className="absolute -left-32 -top-32 size-80 rounded-full bg-[#37665a]/45 blur-3xl" />
        <div className="absolute -bottom-36 -right-28 size-96 rounded-full bg-[#8c604c]/20 blur-3xl" />

        <Link
          href="/"
          className="relative z-10 flex w-fit items-center gap-3 rounded-xl text-lg font-extrabold tracking-[-0.04em] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-white/20"
        >
          <span className="grid size-11 place-items-center rounded-2xl bg-white text-sm text-[#173c34] shadow-xl shadow-black/10">
            K
          </span>
          KampusHub
        </Link>

        <div className="relative z-10 max-w-xl py-10">
          <p className="text-xs font-bold uppercase tracking-[0.23em] text-[#a8c4ba]">
            Ruang kerja akademik
          </p>

          <blockquote className="serif mt-5 text-4xl leading-[1.08] xl:text-5xl 2xl:text-[3.4rem]">
            “Yang membuat kuliah terasa berat sering kali bukan tugasnya, tetapi
            semua hal yang tidak tertata.”
          </blockquote>

          <p className="mt-7 max-w-md text-sm leading-7 text-[#b9cdc6]">
            Mulai dari semester aktif. Mata kuliah, jadwal, tugas, ujian,
            presensi, dan nilai akan mengikuti struktur yang sama.
          </p>
        </div>

        <p className="relative z-10 text-xs font-semibold text-[#89a99d]">
          Integrated academic productivity platform
        </p>
      </aside>

      <section className="relative min-h-dvh overflow-y-auto px-4 py-5 sm:px-8 sm:py-8 lg:px-12 lg:py-10">
        <div className="absolute right-0 top-0 size-64 rounded-full bg-[#e2ebe3] blur-3xl lg:hidden" />

        <Link
          href="/"
          className="relative z-10 flex w-fit items-center gap-2.5 rounded-xl text-base font-extrabold tracking-[-0.035em] text-[#203029] lg:hidden"
        >
          <span className="grid size-9 place-items-center rounded-xl bg-[#173c34] text-xs text-white shadow-lg shadow-[#173c34]/15">
            K
          </span>
          KampusHub
        </Link>

        <div className="relative z-10 mx-auto flex min-h-[calc(100dvh-5.5rem)] w-full max-w-[520px] items-center py-6 lg:min-h-[calc(100dvh-5rem)]">
          <div className="w-full rounded-[28px] border border-white/90 bg-white/90 p-5 shadow-[0_24px_70px_rgba(31,51,41,0.09)] backdrop-blur-xl sm:p-8 lg:border-0 lg:bg-transparent lg:p-0 lg:shadow-none">
            {children}
          </div>
        </div>
      </section>
    </main>
  );
}
