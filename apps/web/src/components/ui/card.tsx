import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-[22px] border border-[#dfe5df]/90 bg-white/95 text-[#1d2c26] shadow-[0_16px_48px_rgba(23,60,52,0.07)] ring-1 ring-[#173c34]/[0.02] backdrop-blur-xl transition-[border-color,box-shadow,transform] duration-300 sm:rounded-[26px]",
        className,
      )}
      {...props}
    />
  );
}
