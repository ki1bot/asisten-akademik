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
import { useState, type ReactNode } from "react";
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

  const sidebar = (
    <aside
      className={cn(
        "flex h-full flex-col border-r border-[#dfe4dc] bg-[#f8f9f5] transition-[width] duration-300",
        collapsed ? "w-[88px]" : "w-[270px]",
      )}
    >
      <div className="flex h-20 items-center justify-between border-b border-[#e2e6df] px-5">
        <Link
          href="/dashboard"
          className={cn(
            "flex min-w-0 items-center gap-3",
            collapsed && "justify-center",
          )}
        >
          <span className="grid size-10 shrink-0 place-items-center rounded-2xl bg-[#173c34] text-sm font-black text-white shadow-lg shadow-[#173c34]/15">
            K
          </span>
          {!collapsed ? (
            <span className="min-w-0">
              <span className="block truncate text-base font-extrabold tracking-[-0.03em] text-[#203029]">
                KampusHub
              </span>
              <span className="block truncate text-[11px] font-semibold uppercase tracking-[0.16em] text-[#7a857f]">
                Asisten akademik
              </span>
            </span>
          ) : null}
        </Link>
        {!collapsed ? (
          <Button
            variant="ghost"
            size="icon"
            className="hidden lg:inline-flex"
            onClick={() => setCollapsed(true)}
          >
            <PanelLeftClose />
          </Button>
        ) : null}
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-5">
        {navigation.map((item) => {
          const active =
            pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              title={collapsed ? item.label : undefined}
              onClick={() => setMobileOpen(false)}
              className={cn(
                "relative flex h-11 items-center gap-3 rounded-xl px-3 text-sm font-semibold transition",
                active
                  ? "bg-[#dfeae2] text-[#174c3e]"
                  : "text-[#647069] hover:bg-[#ecefe9] hover:text-[#24342d]",
                collapsed && "justify-center px-0",
              )}
            >
              <Icon className="size-[18px] shrink-0" />
              {!collapsed ? <span>{item.label}</span> : null}
              {item.href === "/notifications" &&
              (unreadQuery.data?.count ?? 0) > 0 ? (
                <span
                  className={cn(
                    "ml-auto min-w-5 rounded-full bg-[#bd5147] px-1.5 py-0.5 text-center text-[10px] font-bold text-white",
                    collapsed &&
                      "absolute right-1.5 top-1.5 size-2 min-w-0 p-0 text-transparent",
                  )}
                >
                  {unreadQuery.data?.count}
                </span>
              ) : null}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-[#e2e6df] p-3">
        <div
          className={cn(
            "mb-2 flex items-center gap-3 rounded-xl px-3 py-3",
            collapsed && "justify-center px-0",
          )}
        >
          <div className="grid size-9 shrink-0 place-items-center rounded-full bg-[#e5c996] text-sm font-extrabold text-[#493819]">
            {(user?.profile?.name ?? user?.email ?? "K")
              .charAt(0)
              .toUpperCase()}
          </div>
          {!collapsed ? (
            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-[#26352e]">
                {user?.profile?.name ?? "Mahasiswa"}
              </p>
              <p className="truncate text-xs text-[#7c8781]">{user?.email}</p>
            </div>
          ) : null}
        </div>
        <Button
          variant="ghost"
          className={cn(
            "w-full justify-start text-[#7a4843] hover:bg-[#f7e7e5] hover:text-[#963d35]",
            collapsed && "justify-center px-0",
          )}
          onClick={handleLogout}
        >
          <LogOut />
          {!collapsed ? "Keluar" : null}
        </Button>
      </div>
    </aside>
  );

  return (
    <div className="min-h-screen bg-[#f3f5f0]">
      <div className="fixed inset-y-0 left-0 z-40 hidden lg:block">
        {sidebar}
      </div>

      {collapsed ? (
        <button
          type="button"
          className="fixed left-[88px] top-24 z-30 hidden rounded-r-xl border border-l-0 border-[#dfe4dc] bg-white p-2 text-[#53615a] shadow-sm lg:block"
          onClick={() => setCollapsed(false)}
          aria-label="Perbesar sidebar"
        >
          <Menu className="size-4" />
        </button>
      ) : null}

      {mobileOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label="Tutup navigasi"
            className="absolute inset-0 bg-[#14221d]/45 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
          <div className="relative h-full w-[285px] shadow-2xl">
            {sidebar}
            <Button
              variant="outline"
              size="icon"
              className="absolute right-3 top-3"
              onClick={() => setMobileOpen(false)}
            >
              <X />
            </Button>
          </div>
        </div>
      ) : null}

      <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-[#e0e5dd] bg-[#f7f8f4]/90 px-4 backdrop-blur lg:hidden">
        <button
          type="button"
          className="grid size-10 place-items-center rounded-xl border border-[#dfe4dc] bg-white"
          onClick={() => setMobileOpen(true)}
          aria-label="Buka navigasi"
        >
          <Menu className="size-5" />
        </button>
        <Link
          href="/dashboard"
          className="text-base font-extrabold tracking-[-0.03em] text-[#203029]"
        >
          KampusHub
        </Link>
        <Link
          href="/notifications"
          className="relative grid size-10 place-items-center rounded-xl border border-[#dfe4dc] bg-white"
        >
          <Bell className="size-5" />
          {(unreadQuery.data?.count ?? 0) > 0 ? (
            <span className="absolute right-1.5 top-1.5 size-2 rounded-full bg-[#bd5147]" />
          ) : null}
        </Link>
      </header>

      <main
        className={cn(
          "min-h-screen transition-[padding] duration-300",
          collapsed ? "lg:pl-[88px]" : "lg:pl-[270px]",
        )}
      >
        <div className="mx-auto w-full max-w-[1540px] px-4 py-7 sm:px-7 sm:py-10 lg:px-10">
          {children}
        </div>
      </main>
    </div>
  );
}
