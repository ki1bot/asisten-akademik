import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-[24px] border border-white/90 bg-white/95 shadow-[0_18px_55px_rgba(31,51,41,0.065)] ring-1 ring-[#203029]/[0.025] backdrop-blur-sm transition-shadow duration-300",
        className,
      )}
      {...props}
    />
  );
}
