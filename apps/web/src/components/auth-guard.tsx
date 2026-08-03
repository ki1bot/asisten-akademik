"use client";

import { LoaderCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { useAuthStore } from "@/stores/auth-store";

export function AuthGuard({ children }: { children: ReactNode }) {
  const router = useRouter();
  const hydrated = useAuthStore((state) => state.hydrated);
  const accessToken = useAuthStore((state) => state.accessToken);

  useEffect(() => {
    if (hydrated && !accessToken) {
      router.replace("/login");
    }
  }, [accessToken, hydrated, router]);

  if (!hydrated || !accessToken) {
    return (
      <div className="grid min-h-screen place-items-center bg-[#f4f5f0]">
        <div className="flex items-center gap-3 text-sm font-semibold text-[#53615a]">
          <LoaderCircle className="animate-spin" />
          Menyiapkan ruang akademik
        </div>
      </div>
    );
  }

  return children;
}
