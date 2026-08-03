import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-[22px] border border-[#e1e5de] bg-white shadow-[0_16px_45px_rgba(41,61,51,0.06)]",
        className,
      )}
      {...props}
    />
  );
}
