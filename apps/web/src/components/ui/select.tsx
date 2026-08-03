import type { SelectHTMLAttributes } from "react";
import { forwardRef } from "react";
import { cn } from "@/lib/utils";

export const Select = forwardRef<
  HTMLSelectElement,
  SelectHTMLAttributes<HTMLSelectElement>
>(function Select({ className, children, ...props }, ref) {
  return (
    <select
      ref={ref}
      className={cn(
        "h-11 w-full rounded-xl border border-[#d9ded5] bg-white px-3.5 text-sm text-[#25302b] outline-none transition focus:border-[#4d806f] focus:ring-4 focus:ring-[#4d806f]/10",
        className,
      )}
      {...props}
    >
      {children}
    </select>
  );
});
