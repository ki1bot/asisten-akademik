import {
  ArrowRight,
  BookOpen,
  CalendarCheck,
  ChartNoAxesColumnIncreasing,
  CheckCircle2,
} from "lucide-react";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const highlights = [
  {
    icon: CalendarCheck,
    title: "Agenda akademik terhubung",
    description:
      "Jadwal, tugas, dan ujian dikelola berdasarkan semester serta mata kuliah.",
  },
  {
    icon: ChartNoAxesColumnIncreasing,
    title: "Kemajuan yang terukur",
    description:
      "Pantau kehadiran, nilai akhir, IP semester, dan IPK dari satu dashboard.",
  },
  {
    icon: BookOpen,
    title: "Dibuat untuk mahasiswa",
    description:
      "Antarmuka fokus pada keputusan harian, bukan sekadar daftar pekerjaan.",
  },
];

export default function HomePage() {
  return (
    <main className="min-h-screen overflow-hidden bg-[#f6f5ef]">
      <nav className="mx-auto flex h-20 max-w-7xl items-center justify-between px-5 sm:px-8">
        <Link
          href="/"
          className="flex items-center gap-3 text-lg font-extrabold tracking-[-0.04em] text-[#203129]"
        >
          <span className="grid size-10 place-items-center rounded-2xl bg-[#173c34] text-sm text-white">
            K
          </span>
          KampusHub
        </Link>
        <div className="flex items-center gap-2">
          <Link
            href="/login"
            className={buttonVariants({
              variant: "ghost",
              size: "sm",
            })}
          >
            Masuk
          </Link>
          <Link
            href="/register"
            className={buttonVariants({
              size: "sm",
            })}
          >
            Buat akun
          </Link>
        </div>
      </nav>

      <section className="relative mx-auto grid max-w-7xl gap-12 px-5 pb-20 pt-12 sm:px-8 lg:grid-cols-[1.03fr_0.97fr] lg:items-center lg:pb-28 lg:pt-20">
        <div className="relative z-10">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#d7ded5] bg-white/70 px-3 py-2 text-xs font-bold uppercase tracking-[0.17em] text-[#477361] backdrop-blur">
            <CheckCircle2 className="size-4" />
            Academic productivity workspace
          </div>
          <h1 className="max-w-3xl text-5xl font-extrabold leading-[0.98] tracking-[-0.065em] text-[#1b2c25] sm:text-6xl lg:text-7xl">
            Akademik lebih rapi,
            <span className="serif ml-3 font-normal italic text-[#b66a4d]">
              kepala lebih tenang.
            </span>
          </h1>
          <p className="mt-7 max-w-xl text-base leading-8 text-[#65716b] sm:text-lg">
            KampusHub menyatukan jadwal kuliah, deadline, ujian, presensi, dan
            nilai dalam sistem yang benar-benar mengikuti alur akademik
            mahasiswa.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/register"
              className={cn(
                buttonVariants({
                  size: "lg",
                }),
                "group",
              )}
            >
              Mulai mengatur semester
              <ArrowRight className="transition group-hover:translate-x-1" />
            </Link>
            <Link
              href="/login"
              className={buttonVariants({
                variant: "outline",
                size: "lg",
              })}
            >
              Saya sudah punya akun
            </Link>
          </div>
        </div>

        <div className="relative">
          <div className="absolute -left-20 -top-20 size-72 rounded-full bg-[#d7e5d8] blur-3xl" />
          <div className="absolute -bottom-24 -right-16 size-64 rounded-full bg-[#f2d8c6] blur-3xl" />
          <div className="relative rotate-1 rounded-[32px] border border-[#d6ddd4] bg-[#173c34] p-3 shadow-[0_35px_80px_rgba(42,60,51,0.24)]">
            <div className="rounded-[24px] bg-[#f8f9f5] p-5 sm:p-7">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.17em] text-[#809087]">
                    Semester aktif
                  </p>
                  <h2 className="mt-1 text-xl font-extrabold text-[#1e3028]">
                    Semester 5
                  </h2>
                </div>
                <div className="rounded-xl bg-[#e3eee6] px-3 py-2 text-xs font-bold text-[#26604f]">
                  IP 3.71
                </div>
              </div>

              <div className="mt-7 grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl bg-[#efe6d5] p-4">
                  <p className="text-xs font-bold text-[#7e6841]">
                    Jadwal berikutnya
                  </p>
                  <p className="mt-3 text-lg font-extrabold text-[#3b3222]">
                    Basis Data
                  </p>
                  <p className="mt-1 text-sm text-[#796d57]">
                    10.30 · Ruang E231
                  </p>
                </div>
                <div className="rounded-2xl bg-[#deebe5] p-4">
                  <p className="text-xs font-bold text-[#4f7566]">
                    Kehadiran semester
                  </p>
                  <p className="mt-3 text-3xl font-extrabold text-[#214f40]">
                    92%
                  </p>
                </div>
              </div>

              <div className="mt-4 rounded-2xl border border-[#e0e5dd] bg-white p-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-extrabold text-[#28372f]">
                    Deadline terdekat
                  </p>
                  <span className="text-xs font-bold text-[#a64f43]">
                    3 hari lagi
                  </span>
                </div>
                <div className="mt-4 h-2 overflow-hidden rounded-full bg-[#edf0eb]">
                  <div className="h-full w-[68%] rounded-full bg-[#b96a4f]" />
                </div>
                <p className="mt-3 text-sm text-[#69756e]">
                  Analisis proses bisnis · Sistem Informasi
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="border-y border-[#dde2da] bg-white/60">
        <div className="mx-auto grid max-w-7xl gap-px px-5 py-12 sm:px-8 md:grid-cols-3">
          {highlights.map((item) => {
            const Icon = item.icon;

            return (
              <article
                key={item.title}
                className="px-1 py-5 md:px-7 md:first:pl-0 md:last:pr-0"
              >
                <Icon className="size-6 text-[#3f7562]" />
                <h2 className="mt-5 text-lg font-extrabold text-[#22322b]">
                  {item.title}
                </h2>
                <p className="mt-2 text-sm leading-7 text-[#6e7973]">
                  {item.description}
                </p>
              </article>
            );
          })}
        </div>
      </section>
    </main>
  );
}
