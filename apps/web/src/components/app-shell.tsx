"use client";

import { useQuery } from "@tanstack/react-query";
import {
  Bell,
  BookOpen,
  CalendarDays,
  CalendarRange,
  ChartNoAxesColumnIncreasing,
  ClipboardCheck,
  GraduationCap,
  LayoutDashboard,
  ListTodo,
  LogOut,
  Menu,
  PanelLeftClose,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/stores/auth-store";

const navigation = [
  {
    href: "/dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
  },
  {
    href: "/semesters",
    label: "Semester",
    icon: CalendarRange,
  },
  {
    href: "/courses",
    label: "Mata kuliah",
    icon: BookOpen,
  },
  {
    href: "/schedules",
    label: "Jadwal",
    icon: CalendarDays,
  },
  {
    href: "/assignments",
    label: "Tugas",
    icon: ListTodo,
  },
  {
    href: "/exams",
    label: "Ujian",
    icon: GraduationCap,
  },
  {
    href: "/attendances",
    label: "Presensi",
    icon: ClipboardCheck,
  },
  {
    href: "/grades",
    label: "Nilai dan IPK",
    icon: ChartNoAxesColumnIncreasing,
  },
  {
    href: "/notifications",
    label: "Notifikasi",
    icon: Bell,
  },
];

function isRouteActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const user = useAuthStore((state) => state.user);
  const clearSession = useAuthStore((state) => state.clearSession);

  const unreadQuery = useQuery({
    queryKey: ["notifications", "unread-count"],
    queryFn: async () => {
      const response = await api.get<{ count: number }>(
        "/notifications/unread-count",
      );

      return response.data;
    },
  });

  const unreadCount = unreadQuery.data?.count ?? 0;

  const currentPage =
    navigation.find((item) => isRouteActive(pathname, item.href))?.label ??
    "KampusHub";

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!mobileOpen) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [mobileOpen]);

  const handleLogout = async () => {
    try {
      await api.post("/auth/logout");
    } catch {
      toast.error("Sesi lokal ditutup, tetapi server tidak dapat dihubungi");
    } finally {
      clearSession();
      router.replace("/login");
    }
  };

  const renderSidebar = (mobile = false) => {
    const compact = mobile ? false : collapsed;

    return (
      <aside
        className={cn(
          "flex h-full flex-col overflow-hidden border-r border-[#dfe4dc] bg-[#fbfcf9] transition-[width] duration-300",
          mobile ? "w-full" : compact ? "w-[88px]" : "w-[276px]",
        )}
      >
        <div
          className={cn(
            "flex h-20 shrink-0 items-center border-b border-[#e2e6df] px-4",
            compact ? "justify-center" : "justify-between",
          )}
        >
          <Link
            href="/dashboard"
            className={cn(
              "flex min-w-0 items-center gap-3 rounded-xl focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#3f7b67]/20",
              compact && "justify-center",
            )}
          >
            <span className="grid size-10 shrink-0 place-items-center rounded-2xl bg-[#173c34] text-sm font-black text-white shadow-[0_8px_22px_rgba(23,60,52,0.2)]">
              K
            </span>

            {!compact ? (
              <span className="min-w-0">
                <span className="block truncate text-base font-extrabold tracking-[-0.035em] text-[#203029]">
                  KampusHub
                </span>
                <span className="block truncate text-[10px] font-bold uppercase tracking-[0.17em] text-[#7a857f]">
                  Asisten akademik
                </span>
              </span>
            ) : null}
          </Link>

          {mobile ? (
            <Button
              variant="ghost"
              size="icon"
              aria-label="Tutup navigasi"
              onClick={() => setMobileOpen(false)}
            >
              <X />
            </Button>
          ) : !compact ? (
            <Button
              variant="ghost"
              size="icon"
              aria-label="Perkecil sidebar"
              onClick={() => setCollapsed(true)}
            >
              <PanelLeftClose />
            </Button>
          ) : null}
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-5">
          {navigation.map((item) => {
            const active = isRouteActive(pathname, item.href);
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                title={compact ? item.label : undefined}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-semibold transition-colors duration-200 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#3f7b67]/15",
                  active
                    ? "bg-[#dfeae2] text-[#174c3e]"
                    : "text-[#647069] hover:bg-[#ecefe9] hover:text-[#24342d]",
                  compact && "justify-center px-0",
                )}
              >
                <Icon className="size-[18px] shrink-0" />

                {!compact ? (
                  <span className="truncate">{item.label}</span>
                ) : null}

                {item.href === "/notifications" && unreadCount > 0 ? (
                  <span
                    className={cn(
                      "ml-auto min-w-5 rounded-full bg-[#bd5147] px-1.5 py-0.5 text-center text-[10px] font-bold text-white",
                      compact &&
                        "absolute right-1.5 top-1.5 size-2 min-w-0 p-0 text-transparent",
                    )}
                  >
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </span>
                ) : null}
              </Link>
            );
          })}
        </nav>

        <div className="shrink-0 border-t border-[#e2e6df] p-3">
          <div
            className={cn(
              "mb-2 flex items-center gap-3 rounded-2xl bg-[#f1f3ee] px-3 py-3",
              compact && "justify-center bg-transparent px-0",
            )}
          >
            <div className="grid size-10 shrink-0 place-items-center rounded-2xl bg-[#e5c996] text-sm font-extrabold text-[#493819]">
              {(user?.profile?.name ?? user?.email ?? "K")
                .charAt(0)
                .toUpperCase()}
            </div>

            {!compact ? (
              <div className="min-w-0">
                <p className="truncate text-sm font-bold text-[#26352e]">
                  {user?.profile?.name ?? "Mahasiswa"}
                </p>
                <p className="mt-0.5 truncate text-xs text-[#7c8781]">
                  {user?.email}
                </p>
              </div>
            ) : null}
          </div>

          <Button
            variant="ghost"
            className={cn(
              "w-full justify-start text-[#7a4843] hover:bg-[#f7e7e5] hover:text-[#963d35]",
              compact && "justify-center px-0",
            )}
            onClick={handleLogout}
          >
            <LogOut />
            {!compact ? "Keluar" : null}
          </Button>
        </div>
      </aside>
    );
  };

  return (
    <div className="min-h-dvh bg-[#f3f5f0]">
      <div className="fixed inset-y-0 left-0 z-40 hidden lg:block">
        {renderSidebar()}
      </div>

      {collapsed ? (
        <button
          type="button"
          className="fixed left-[88px] top-24 z-30 hidden rounded-r-xl border border-l-0 border-[#dfe4dc] bg-white p-2.5 text-[#53615a] shadow-md transition hover:bg-[#f5f7f3] lg:block"
          onClick={() => setCollapsed(false)}
          aria-label="Perbesar sidebar"
        >
          <Menu className="size-4" />
        </button>
      ) : null}

      {mobileOpen ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Navigasi utama"
          className="fixed inset-0 z-50 lg:hidden"
        >
          <button
            type="button"
            aria-label="Tutup navigasi"
            className="absolute inset-0 bg-[#14221d]/50 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />

          <div className="relative h-full w-[min(88vw,320px)] shadow-[20px_0_70px_rgba(14,35,28,0.25)]">
            {renderSidebar(true)}
          </div>
        </div>
      ) : null}

      <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-[#e0e5dd] bg-[#f8f9f5]/90 px-4 backdrop-blur-xl lg:hidden">
        <button
          type="button"
          className="grid size-10 place-items-center rounded-xl border border-[#dfe4dc] bg-white text-[#26352e] shadow-sm transition active:scale-95"
          onClick={() => setMobileOpen(true)}
          aria-label="Buka navigasi"
        >
          <Menu className="size-5" />
        </button>

        <div className="min-w-0 px-3 text-center">
          <p className="truncate text-sm font-extrabold tracking-[-0.025em] text-[#203029]">
            {currentPage}
          </p>
          <p className="text-[9px] font-bold uppercase tracking-[0.15em] text-[#849089]">
            KampusHub
          </p>
        </div>

        <Link
          href="/notifications"
          aria-label="Buka notifikasi"
          className="relative grid size-10 place-items-center rounded-xl border border-[#dfe4dc] bg-white text-[#26352e] shadow-sm transition active:scale-95"
        >
          <Bell className="size-5" />

          {unreadCount > 0 ? (
            <span className="absolute right-1.5 top-1.5 size-2 rounded-full bg-[#bd5147] ring-2 ring-white" />
          ) : null}
        </Link>
      </header>

      <main
        className={cn(
          "min-h-dvh transition-[padding] duration-300",
          collapsed ? "lg:pl-[88px]" : "lg:pl-[276px]",
        )}
      >
        <div className="mx-auto w-full max-w-[1580px] px-4 py-6 sm:px-7 sm:py-9 lg:px-10 lg:py-10 xl:px-12">
          {children}
        </div>
      </main>
    </div>
  );
}
