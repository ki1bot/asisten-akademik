import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

const variants = {
  neutral: "bg-[#edf0ec] text-[#536059]",
  success: "bg-[#dff1e8] text-[#17604f]",
  warning: "bg-[#fff0cf] text-[#805b12]",
  danger: "bg-[#f9dfdc] text-[#913a33]",
  info: "bg-[#dfeaf4] text-[#315d79]",
};

export function Badge({
  children,
  variant = "neutral",
  className,
}: {
  children: ReactNode;
  variant?: keyof typeof variants;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-bold",
        variants[variant],
        className,
      )}
    >
      {children}
    </span>
  );
}
